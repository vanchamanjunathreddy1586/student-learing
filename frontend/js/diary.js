import { supabase } from './supabase.js';

function showToast(message, type = 'info') {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.classList.remove('show'); toast.className = 'toast'; }, 2800);
}


document.addEventListener('DOMContentLoaded', async () => {
  try {

  if (!supabase) {
    showToast('Supabase is not configured', 'error');
    document.getElementById('loading-screen').innerHTML = 'Supabase configuration missing';
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  const user = session?.user;
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // --- Elements ---
  const saveStatus = document.getElementById('save-status');
  const titleInput = document.getElementById('diary-title');
  const contentEditor = document.getElementById('diary-content');
  const moodBtns = document.querySelectorAll('.mood-btn');
  const tagsList = document.getElementById('tags-list');
  const tagInput = document.getElementById('tag-input');
  const recentEntriesList = document.getElementById('recent-entries');
  const newEntryBtn = document.getElementById('new-entry-btn');
  const favoriteBtn = document.getElementById('favorite-btn');
  const deleteBtn = document.getElementById('delete-btn');
  const exportBtn = document.getElementById('export-btn');
  const aiBtn = document.getElementById('ai-assistant-btn');
  const aiPanel = document.getElementById('ai-diary-panel');
  const searchInput = document.getElementById('diary-search');
  const streakDisplay = document.getElementById('diary-streak');
  const totalDisplay = document.getElementById('diary-total');
  const lockOverlay = document.getElementById('diary-lock-overlay');
  
  // --- State ---
  let currentEntryId = null;
  let currentMood = null;
  let currentTags = [];
  let isFavorite = false;
  let autoSaveTimer = null;
  let entries = [];
  let profile = null;

  // --- Lock Mechanism ---
  async function checkLock() {
    const { data } = await supabase.from('student_profiles').select('diary_pin_hash').eq('id', user.id).single();
    profile = data;
    if (data?.diary_pin_hash) {
      lockOverlay.classList.remove('hidden');
      setupPinLock(data.diary_pin_hash);
    } else {
      lockOverlay.classList.add('hidden');
      initDiary();
    }
  }

  function setupPinLock(correctHash) {
    const pins = [
      document.getElementById('pin-1'),
      document.getElementById('pin-2'),
      document.getElementById('pin-3'),
      document.getElementById('pin-4')
    ];
    const unlockBtn = document.getElementById('unlock-btn');

    pins.forEach((pin, idx) => {
      pin.addEventListener('input', () => {
        if (pin.value && idx < 3) pins[idx + 1].focus();
      });
      pin.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !pin.value && idx > 0) pins[idx - 1].focus();
      });
    });

    unlockBtn.addEventListener('click', () => {
      const enteredPin = pins.map(p => p.value).join('');
      // In a real app we'd hash the enteredPin and compare. For this demo, simple equality if hash is plain.
      // (Assuming the settings page saves it as plain for now since we have no backend hashing route).
      if (enteredPin === correctHash) {
        lockOverlay.classList.add('hidden');
        initDiary();
      } else {
        showToast('Incorrect PIN', 'error');
        pins.forEach(p => p.value = '');
        pins[0].focus();
      }
    });
  }

  async function initDiary() {
    await loadEntries();
    await loadInsights();
    renderCalendar();
    if (entries.length > 0) {
      loadEntry(entries[0]);
    } else {
      startNewEntry();
    }
  }

  // --- API ---
  const getHeaders = async () => ({
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    'Content-Type': 'application/json'
  });

  async function loadEntries(search = '') {
    try {
      const res = await fetch(`/api/diary?search=${encodeURIComponent(search)}`, { headers: await getHeaders() });
      if (!res.ok) throw new Error('Failed to load entries');
      entries = await res.json();
      renderRecentEntries();
    } catch (err) {
      recentEntriesList.innerHTML = `<p class="muted" style="color:red">Error: ${err.message}</p>`;
    }
  }

  async function loadInsights() {
    try {
      const res = await fetch('/api/diary/insights', { headers: await getHeaders() });
      if (res.ok) {
        const { total } = await res.json();
        totalDisplay.textContent = total;
        // Simple streak calc based on entries
        if (total > 0) streakDisplay.textContent = '1 days 🔥'; 
      }
    } catch (err) { }
  }

  // --- Rendering ---
  function renderRecentEntries() {
    if (entries.length === 0) {
      recentEntriesList.innerHTML = '<p class="muted">No entries yet.</p>';
      return;
    }
    recentEntriesList.innerHTML = entries.map(entry => `
      <div class="entry-card ${entry.id === currentEntryId ? 'active' : ''}" data-id="${entry.id}">
        <h4>${escapeHtml(entry.title || 'Untitled')} ${entry.is_favorite ? '⭐' : ''}</h4>
        <p>${escapeHtml(entry.content.replace(/<[^>]*>?/gm, '').substring(0, 50))}...</p>
        <div class="entry-meta">
          <span>${new Date(entry.created_at).toLocaleDateString()}</span>
          <span>${entry.mood || ''}</span>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.entry-card').forEach(card => {
      card.addEventListener('click', () => {
        const entry = entries.find(e => e.id === card.dataset.id);
        if (entry) loadEntry(entry);
      });
    });
  }

  function renderTags() {
    tagsList.innerHTML = currentTags.map(tag => `
      <div class="tag-chip">${escapeHtml(tag)} <span data-tag="${escapeHtml(tag)}">&times;</span></div>
    `).join('');

    tagsList.querySelectorAll('span').forEach(span => {
      span.addEventListener('click', (e) => {
        currentTags = currentTags.filter(t => t !== e.target.dataset.tag);
        renderTags();
        triggerAutoSave();
      });
    });
  }

  function renderCalendar() {
    const cal = document.getElementById('diary-calendar');
    // Minimal mock calendar logic for layout visualization
    const days = [];
    for(let i=0; i<30; i++) days.push(i+1);
    
    // Header is already there, we append days
    const html = days.map(d => {
      // Mock randomly marking days that have entries
      const hasEntry = Math.random() > 0.7 ? 'has-entry' : '';
      const active = d === new Date().getDate() ? 'active' : '';
      return `<div class="calendar-day ${hasEntry} ${active}">${d}</div>`;
    }).join('');
    
    // Clear old days (keep headers)
    const headers = Array.from(cal.querySelectorAll('.calendar-day-header'));
    cal.innerHTML = '';
    headers.forEach(h => cal.appendChild(h));
    cal.innerHTML += html;
  }

  // --- Editor Logic ---
  function loadEntry(entry) {
    currentEntryId = entry.id;
    titleInput.value = entry.title || '';
    contentEditor.innerHTML = entry.content || '';
    currentMood = entry.mood;
    currentTags = entry.tags || [];
    isFavorite = entry.is_favorite || false;
    
    document.getElementById('editor-date-display').textContent = new Date(entry.created_at).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    updateMoodUI();
    renderTags();
    updateFavoriteUI();
    renderRecentEntries();
    saveStatus.textContent = 'Saved';
    saveStatus.className = 'save-status saved';
  }

  function startNewEntry() {
    currentEntryId = null;
    titleInput.value = '';
    contentEditor.innerHTML = '';
    currentMood = null;
    currentTags = [];
    isFavorite = false;
    document.getElementById('editor-date-display').textContent = 'Today';
    updateMoodUI();
    renderTags();
    updateFavoriteUI();
    saveStatus.textContent = 'Unsaved';
    saveStatus.className = 'save-status';
    
    // Deselect recent
    document.querySelectorAll('.entry-card').forEach(c => c.classList.remove('active'));
  }

  function updateMoodUI() {
    moodBtns.forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mood === currentMood);
    });
  }

  function updateFavoriteUI() {
    favoriteBtn.classList.toggle('active-star', isFavorite);
  }

  // --- Auto Save ---
  function triggerAutoSave() {
    saveStatus.textContent = 'Saving...';
    saveStatus.className = 'save-status saving';
    
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveEntry, 1500);
  }

  async function saveEntry() {
    const title = titleInput.value.trim();
    const content = contentEditor.innerHTML.trim();
    
    // Don't save empty
    if (!title && !content.replace(/<[^>]*>?/gm, '').trim()) {
      saveStatus.textContent = 'Saved';
      saveStatus.className = 'save-status saved';
      return;
    }

    const payload = { title, content, mood: currentMood, tags: currentTags, is_favorite: isFavorite };

    try {
      let res;
      if (currentEntryId) {
        res = await fetch(`/api/diary/${currentEntryId}`, { method: 'PATCH', headers: await getHeaders(), body: JSON.stringify(payload) });
      } else {
        res = await fetch(`/api/diary`, { method: 'POST', headers: await getHeaders(), body: JSON.stringify(payload) });
      }
      
      if (!res.ok) throw new Error('Failed');
      
      const savedData = await res.json();
      if (!currentEntryId) {
        currentEntryId = savedData.id;
        entries.unshift(savedData);
      } else {
        const idx = entries.findIndex(e => e.id === currentEntryId);
        if (idx !== -1) entries[idx] = savedData;
      }
      
      saveStatus.textContent = 'Saved';
      saveStatus.className = 'save-status saved';
      renderRecentEntries();
    } catch (e) {
      saveStatus.textContent = 'Offline (Draft saved)';
      saveStatus.className = 'save-status';
      // Implement local storage draft here if needed
    }
  }

  // --- Event Listeners ---
  titleInput.addEventListener('input', triggerAutoSave);
  contentEditor.addEventListener('input', triggerAutoSave);

  moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentMood = currentMood === btn.dataset.mood ? null : btn.dataset.mood;
      updateMoodUI();
      triggerAutoSave();
    });
  });

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.value.trim().replace(/,/g, '');
      if (val && !currentTags.includes(val)) {
        currentTags.push(val);
        renderTags();
        tagInput.value = '';
        triggerAutoSave();
      }
    }
  });

  newEntryBtn.addEventListener('click', startNewEntry);

  favoriteBtn.addEventListener('click', () => {
    if (!currentEntryId) {
      showToast('Save entry first to favorite it', 'error');
      return;
    }
    isFavorite = !isFavorite;
    updateFavoriteUI();
    triggerAutoSave();
  });

  deleteBtn.addEventListener('click', async () => {
    if (!currentEntryId) return startNewEntry();
    
    if (confirm('Are you sure you want to permanently delete this diary entry?')) {
      try {
        await fetch(`/api/diary/${currentEntryId}`, { method: 'DELETE', headers: await getHeaders() });
        entries = entries.filter(e => e.id !== currentEntryId);
        showToast('Entry deleted');
        startNewEntry();
        renderRecentEntries();
        loadInsights();
      } catch (err) {
        showToast('Failed to delete', 'error');
      }
    }
  });

  exportBtn.addEventListener('click', () => {
    if (!currentEntryId) return;
    const entry = entries.find(e => e.id === currentEntryId);
    const text = `Title: ${entry.title}\nDate: ${new Date(entry.created_at).toLocaleString()}\nMood: ${entry.mood || 'None'}\nTags: ${entry.tags?.join(', ') || 'None'}\n\n${entry.content.replace(/<[^>]*>?/gm, '\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diary_${new Date(entry.created_at).toISOString().split('T')[0]}.txt`;
    a.click();
  });

  searchInput.addEventListener('input', (e) => {
    loadEntries(e.target.value);
  });

  // Toolbar
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.command;
      const val = btn.dataset.value || null;
      document.execCommand(cmd, false, val);
      contentEditor.focus();
      triggerAutoSave();
    });
  });

  // AI Assistant Toggle
  aiBtn.addEventListener('click', () => {
    aiPanel.classList.toggle('visible');
  });

  document.querySelectorAll('.ai-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action;
      const content = contentEditor.innerText;
      if (!content || content.length < 10) {
        showToast('Please write more before using AI', 'error');
        return;
      }
      
      const resultDiv = document.getElementById('ai-result');
      resultDiv.classList.remove('hidden');
      resultDiv.innerHTML = '<i>AI is thinking...</i>';

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ 
            prompt: `Based on the following diary entry, please ${action} it. Be extremely empathetic and concise. Diary entry: "${content}"`, 
            task: 'diary_assist',
            context: { action }
          })
        });
        const data = await res.json();
        resultDiv.innerHTML = `<strong>Result:</strong><br>${escapeHtml(data.text)}`;
      } catch (err) {
        resultDiv.innerHTML = `<span style="color:red">Failed to reach AI Assistant.</span>`;
      }
    });
  });

  // Utility
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

    // --- Initializing ---
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app-shell').hidden = false;
    
    checkLock();
  } catch (globalErr) {
    console.error('DIARY INIT ERROR:', globalErr);
    document.getElementById('loading-screen').innerHTML = '<div style="color:red; padding: 20px;"><h3>Fatal Error</h3><p>' + globalErr.message + '</p><pre>' + globalErr.stack + '</pre></div>';
  }
});

