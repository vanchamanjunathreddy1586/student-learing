import { supabase, getAccessToken } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
let currentConversationId = null;

// Initialize marked options for safe code rendering
if (window.marked) {
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false
  });
}

// Ensure DOMPurify doesn't strip out classes needed for code blocks
const sanitizeOptions = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'blockquote', 'span', 'div'],
  ALLOWED_ATTR: ['href', 'class', 'target']
};

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

const adjustTextareaHeight = () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = (Math.min(chatInput.scrollHeight, 120)) + 'px';
  sendBtn.disabled = chatInput.value.trim().length === 0;
};

chatInput.addEventListener('input', adjustTextareaHeight);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function formatTime(dateString) {
  const d = dateString ? new Date(dateString) : new Date();
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const appendMessage = (text, role, animate = false, timestamp = null) => {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-bubble-wrapper ${role}`;
  
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  
  // Render Markdown if available
  if (window.marked && window.DOMPurify) {
    bubble.innerHTML = DOMPurify.sanitize(marked.parse(text), sanitizeOptions);
  } else {
    // Fallback if libs fail to load
    bubble.innerHTML = text.replace(/\\n/g, '<br>');
  }
  
  wrapper.appendChild(bubble);

  const time = document.createElement('div');
  time.className = 'chat-timestamp';
  time.innerHTML = `${role === 'user' ? 'You' : 'AI Teacher'} &bull; ${formatTime(timestamp)}`;
  wrapper.appendChild(time);
  
  chatMessages.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
};

async function loadConversation() {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) return;

  // Try to find recent conversation
  const { data: convs, error: convErr } = await supabase
    .from('ai_conversations')
    .select('id, title')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (convs && convs.length > 0) {
    currentConversationId = convs[0].id;
    // Load messages
    const { data: messages } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', currentConversationId)
      .order('created_at', { ascending: true });
      
    if (messages && messages.length > 0) {
      // Clear the initial welcome message only if they have real history
      chatMessages.innerHTML = ''; 
      messages.forEach(msg => {
        appendMessage(msg.content, msg.role, false, msg.created_at);
      });
    }
  } else {
    // Create new conversation
    const { data: newConv } = await supabase
      .from('ai_conversations')
      .insert([{ user_id: user.user.id, title: 'Study Session' }])
      .select('id').single();
      
    if (newConv) currentConversationId = newConv.id;
  }
  scrollToBottom();
}

const sendMessage = async (presetText = null) => {
  const text = presetText || chatInput.value.trim();
  if (!text) return;
  
  chatInput.value = '';
  adjustTextareaHeight();
  sendBtn.disabled = true;
  
  // Remove welcome quick actions if present
  const quickActions = document.querySelector('.quick-actions-container');
  if (quickActions) quickActions.remove();
  
  appendMessage(text, 'user');
  
  // Save user message to DB
  if (currentConversationId) {
    supabase.from('ai_messages').insert([{
      conversation_id: currentConversationId,
      role: 'user',
      content: text
    }]).then();
  }
  
  // Typing indicator
  const typingWrapper = document.createElement('div');
  typingWrapper.className = 'chat-bubble-wrapper ai';
  typingWrapper.id = 'typing-indicator';
  typingWrapper.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatMessages.appendChild(typingWrapper);
  scrollToBottom();
  
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ prompt: text, task: 'tutor' })
    });
    
    if (!res.ok) throw new Error('AI failed');
    const data = await res.json();
    
    document.getElementById('typing-indicator')?.remove();
    appendMessage(data.text, 'ai');
    
    // Save AI message to DB
    if (currentConversationId) {
      supabase.from('ai_messages').insert([{
        conversation_id: currentConversationId,
        role: 'assistant',
        content: data.text
      }]).then();
    }
    
  } catch (error) {
    console.error(error);
    document.getElementById('typing-indicator')?.remove();
    appendMessage('Sorry, I am having trouble connecting to my brain right now. Please try again.', 'ai');
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
};

sendBtn.onclick = () => sendMessage();

// Handle quick actions
document.addEventListener('click', (e) => {
  const chip = e.target.closest('.quick-action-chip');
  if (chip) {
    const prompt = chip.getAttribute('data-prompt');
    if (prompt) sendMessage(prompt);
  }
});

// Init
window.addEventListener('DOMContentLoaded', () => {
  loadConversation();
});
