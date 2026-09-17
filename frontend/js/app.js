

import { supabase, getAccessToken } from './supabase.js';

const publicPages = ['/', '/index.html', '/login.html', '/register.html', '/forgot-password.html', '/verify-email.html', '/reset-password.html'];

document.addEventListener('DOMContentLoaded', async () => {
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    const currentPath = window.location.pathname;
    
    // If we are on a protected page and there is no session
    if (!session && !publicPages.includes(currentPath) && currentPath !== '') {
      window.location.href = `/login.html?next=${encodeURIComponent(currentPath)}`;
      return;
    }
    
    // Auto-redirect logged-in users away from auth pages
    if (session && (currentPath === '/login.html' || currentPath === '/register.html')) {
      const next = new URLSearchParams(window.location.search).get('next') || '/';
      window.location.href = next;
      return;
    }
  }
});

const toast = document.querySelector('#toast');
const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
const getHeaders = () => {
  const token = getAccessToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const ask = async (prompt, task = 'chat') => {
  const answer = document.querySelector('#answer'); answer.hidden = false; answer.textContent = 'Thinking...';
  try {
    const response = await fetch('/api/ai/chat', { method: 'POST', headers: getHeaders(), body: JSON.stringify({prompt, task, context:{topic:'Linear Algebra'}}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed');
    answer.textContent = data.text; showToast(`Answered by ${data.provider}`);
  } catch (error) { answer.textContent = error.message; showToast('The AI gateway needs attention.'); }
};

if (document.querySelector('#ask-form')) {
  document.querySelector('#ask-form').addEventListener('submit', (event) => { event.preventDefault(); const prompt = document.querySelector('#prompt').value.trim(); if (prompt) ask(prompt); });
  document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => ask(button.dataset.prompt)));
  document.querySelector('#focus-btn').addEventListener('click', async () => {
    const topic = window.prompt("What topic are you studying?", "Linear Algebra");
    if (!topic) return;
    localStorage.setItem('last_study_topic', topic);
    showToast(`Focus session started: ${topic}`);
    const res = await fetch('/api/study/session', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ duration: 25, topic }) });
    if (res.ok) {
      setTimeout(() => {
        showToast('Session logged! Refreshing dashboard...');
        window.location.reload();
      }, 1500);
    }
  });
  
  document.querySelector('#scan-btn').addEventListener('click', () => { window.location.href = '/scan-learn.html'; });
  document.querySelector('#planner-btn').addEventListener('click', () => ask('Build me a focused study plan for this week', 'planner'));
  document.querySelector('#quiz-btn').addEventListener('click', async () => { 
    showToast('Generating quiz...');
    const response = await fetch('/api/ai/quiz', {method:'POST',headers: getHeaders(),body:JSON.stringify({topic:'data structures'})}); 
    const data = await response.json(); 
    showToast(`${data.questions.length} question quiz generated`); 
  });
}


fetch('/api/ai/providers', { headers: getHeaders() }).then((response) => response.json()).then((data) => { 
  const status = document.querySelector('#provider-status');
  if (status) status.textContent = `AI GATEWAY A ${data.active.toUpperCase()} ACTIVE`; 
}).catch(() => { 
  const status = document.querySelector('#provider-status');
  if (status) status.textContent = 'AI GATEWAY A OFFLINE'; 
});

// Chatbot Logic
const fab = document.getElementById('chatbot-fab');
const windowEl = document.getElementById('chatbot-window');
const closeBtn = document.getElementById('chatbot-actual-close');
const form = document.getElementById('chatbot-form');
const input = document.getElementById('chatbot-input-field');
const messages = document.getElementById('chatbot-messages');

if (fab && windowEl) {
  fab.addEventListener('click', () => {
    const isHidden = windowEl.hasAttribute('hidden');
    if (isHidden) {
      windowEl.removeAttribute('hidden');
      input.focus();
    } else {
      windowEl.setAttribute('hidden', '');
    }
  });
  
  closeBtn.addEventListener('click', () => {
    windowEl.setAttribute('hidden', '');
  });

  const appendMsg = (text, type) => {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + type;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    
    appendMsg(text, 'user');
    input.value = '';
    
    // Create typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg ai';
    typingDiv.textContent = 'Thinking...';
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await fetch('/api/ai/chat', { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({prompt: text, task: 'chat', context: {topic: 'Doubt clearing'}}) 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get answer');
      typingDiv.textContent = data.text;
    } catch (error) {
      typingDiv.textContent = 'Sorry, the AI teacher is offline right now.';
      console.error(error);
    }
  });
}

// Handle mobile menu and overlay
const mobileMenuBtn = document.querySelector('.mobile-menu');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      // If we are on mobile (window width <= 900)
      if (window.innerWidth <= 900) {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('open');
      } else {
        // We are on desktop, toggle collapsed state
        document.body.classList.toggle('sidebar-collapsed');
        // Save state
        localStorage.setItem('sidebar-collapsed', document.body.classList.contains('sidebar-collapsed'));
      }
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }
  
  // Restore collapsed state on desktop
  if (window.innerWidth > 900 && localStorage.getItem('sidebar-collapsed') === 'true') {
    document.body.classList.add('sidebar-collapsed');
  }
  // Real Lesson System: Dashboard Resume Logic
const continueCardWrapper = document.getElementById('continue-card-wrapper');
if (continueCardWrapper) {
  const loadRecentLesson = async () => {
    try {
      const response = await fetch('/api/lessons/recent', { headers: getHeaders() });
      const { success, data } = await response.json();
      
      if (success && data) {
        const pct = Math.round(data.progress.progress_percentage || 0);
        continueCardWrapper.innerHTML = `
          <div class="course-art"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><span>📚</span></div>
          <div class="course-info">
            <span class="tag">DOCUMENT</span>
            <h3>${data.title}</h3>
            <p>Page ${data.progress.current_page}</p>
            <div class="course-progress">
              <div><span id="course-pct">${pct}% complete</span></div>
              <div class="progress"><i id="course-bar" style="width:${pct}%"></i></div>
            </div>
            <button class="primary-btn" id="resume-btn" style="width: 100%; margin-top: 16px;" onclick="window.location.href='/reader.html?id=${data.id}'">Continue Learning <span>✨</span></button>
          </div>
        `;
      } else {
        continueCardWrapper.innerHTML = `
          <div class="course-art" style="background: var(--bg-card);"><i class="fas fa-book-open" style="font-size: 32px; color: var(--accent);"></i></div>
          <div class="course-info">
            <h3>Start Your First Lesson</h3>
            <p>Upload a document to begin.</p>
            <button class="primary-btn" id="resume-btn" style="width: 100%; margin-top: 16px;" onclick="window.location.href='/lessons.html'">Browse My Lessons <span>✨</span></button>
          </div>
        `;
      }
    } catch (err) {
      console.error('Failed to load recent lesson:', err);
    }
  };
  loadRecentLesson();
}
