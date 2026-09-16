import { getAccessToken } from './supabase.js';

const headers = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const autoSpeakToggle = document.getElementById('auto-speak-toggle');
const providerLabel = document.getElementById('provider-label');

let synth = window.speechSynthesis;
let recognition = null;
let isRecording = false;

// Initialize Speech Recognition if supported
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  
  recognition.onstart = () => {
    isRecording = true;
    voiceBtn.classList.add('recording');
    chatInput.placeholder = 'Listening...';
  };
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    
    if (finalTranscript) {
      chatInput.value += finalTranscript + ' ';
    } else {
      chatInput.value = interimTranscript;
    }
    adjustTextareaHeight();
  };
  
  recognition.onerror = (e) => {
    console.error('Speech recognition error', e);
    stopRecording();
  };
  
  recognition.onend = () => {
    stopRecording();
    if (chatInput.value.trim() !== '') {
      sendMessage();
    }
  };
} else {
  voiceBtn.style.display = 'none';
}

const stopRecording = () => {
  isRecording = false;
  voiceBtn.classList.remove('recording');
  chatInput.placeholder = 'Type or say something...';
  if (recognition) recognition.stop();
};

voiceBtn.onmousedown = () => { if(recognition) recognition.start(); };
voiceBtn.onmouseup = () => stopRecording();
voiceBtn.ontouchstart = (e) => { e.preventDefault(); if(recognition) recognition.start(); };
voiceBtn.ontouchend = (e) => { e.preventDefault(); stopRecording(); };

const adjustTextareaHeight = () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = (chatInput.scrollHeight) + 'px';
};

chatInput.addEventListener('input', adjustTextareaHeight);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

const appendMessage = (text, role, animate = false) => {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerHTML = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  if (role === 'ai') {
    const ttsBtn = document.createElement('button');
    ttsBtn.className = 'tts-btn';
    ttsBtn.innerHTML = '🔊';
    ttsBtn.onclick = () => speakText(text, ttsBtn);
    bubble.appendChild(ttsBtn);
    
    if (autoSpeakToggle.checked) {
      speakText(text, ttsBtn);
    }
  }
  
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return bubble;
};

const speakText = (text, btnElement) => {
  if (synth.speaking) {
    synth.cancel();
    document.querySelectorAll('.tts-btn').forEach(b => b.classList.remove('playing'));
    return;
  }
  
  const plainText = text.replace(/[*#]/g, '');
  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.onstart = () => btnElement && btnElement.classList.add('playing');
  utterance.onend = () => btnElement && btnElement.classList.remove('playing');
  utterance.onerror = () => btnElement && btnElement.classList.remove('playing');
  
  synth.speak(utterance);
};

const sendMessage = async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;
  
  appendMessage(text, 'user');
  
  const typingBubble = document.createElement('div');
  typingBubble.className = 'chat-bubble ai';
  typingBubble.textContent = '...';
  chatMessages.appendChild(typingBubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ prompt: text, task: 'tutor' })
    });
    
    if (!res.ok) throw new Error('AI failed');
    const data = await res.json();
    
    typingBubble.remove();
    appendMessage(data.text, 'ai');
    providerLabel.textContent = data.provider;
  } catch (error) {
    console.error(error);
    typingBubble.textContent = 'Sorry, I am having trouble connecting to the AI gateway.';
    typingBubble.classList.add('system');
    typingBubble.classList.remove('ai');
  } finally {
    sendBtn.disabled = false;
    chatInput.focus();
  }
};

sendBtn.onclick = sendMessage;

// Fetch active provider
fetch('/api/ai/providers', { headers: headers() })
  .then(res => res.json())
  .then(data => { if(data.active) providerLabel.textContent = data.active; })
  .catch(e => console.error(e));
