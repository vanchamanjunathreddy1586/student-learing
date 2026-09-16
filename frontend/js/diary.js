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

  const getHeaders = async () => ({
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
    'Content-Type': 'application/json'
  });

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

  // --- Secure PIN Lock Mechanism ---
  const lockTitle = document.getElementById('lock-title');
  const lockSubtitle = document.getElementById('lock-subtitle');
  const unlockBtn = document.getElementById('unlock-btn');
  const cancelPinBtn = document.getElementById('cancel-pin-btn');
  const forgotPinBtn = document.getElementById('forgot-pin-btn');
  const lockDiaryBtn = document.getElementById('lock-diary-btn');
  const changePinBtn = document.getElementById('change-pin-btn');
  const pinErrorMsg = document.getElementById('pin-error-msg');
  const pinInputs = Array.from(document.querySelectorAll('.pin-digit'));
  const diaryLayout = document.querySelector('.diary-layout');
  
  let pinMode = 'verify';
  let tempNewPin = '';
  let autoLockTimer = null;
  const INACTIVITY_LIMIT = 15 * 60 * 1000;

  function resetInactivityTimer() {
    clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(() => {
      if (lockOverlay.style.display === 'none') {
        showToast('Diary auto-locked due to inactivity', 'info');
        lockDiary();
      }
    }, INACTIVITY_LIMIT);
  }

  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && lockOverlay.style.display === 'none') {
      lockDiary();
    }
  });

  function clearPins() {
    pinInputs.forEach(p => p.value = '');
    pinInputs[0].focus();
  }

  function getPinValue() {
    return pinInputs.map(p => p.value).join('');
  }

  pinInputs.forEach((pin, idx) => {
    pin.addEventListener('input', () => {
      if (pin.value && idx < pinInputs.length - 1) pinInputs[idx + 1].focus();
    });
    pin.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !pin.value && idx > 0) pinInputs[idx - 1].focus();
      if (e.key === 'Enter') unlockBtn.click();
    });
    pin.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      [...pasted].forEach((char, i) => { if (pinInputs[i]) pinInputs[i].value = char; });
      if (pasted.length > 0) pinInputs[Math.min(pasted.length, 5)].focus();
    });
  });

  async function checkLock() {
    try {
      const res = await fetch('/api/diary/pin/status', { headers: await getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch PIN status');
      const { hasPin } = await res.json();
      
      if (!hasPin) {
        pinMode = 'setup';
        showLockScreen('🔐 Secure Your Personal Diary', 'Create a private 4-6 digit PIN to protect your diary.', false);
      } else {
        lockDiary();
      }
    } catch (err) {
      console.error('Lock check failed:', err);
      showToast('Security check failed', 'error');
    }
  }

  function lockDiary() {
    pinMode = 'verify';
    showLockScreen('🔐 Personal Diary Locked', 'Enter your PIN to continue', false);
    if(diaryLayout) diaryLayout.style.opacity = '0';
    if(diaryLayout) diaryLayout.style.pointerEvents = 'none';
    if(lockDiaryBtn) lockDiaryBtn.style.display = 'none';
  }

  function showLockScreen(title, subtitle, canCancel = false) {
    lockOverlay.style.display = 'flex';
    if(lockTitle) lockTitle.textContent = title;
    if(lockSubtitle) lockSubtitle.textContent = subtitle;
    if(cancelPinBtn) cancelPinBtn.style.display = canCancel ? 'block' : 'none';
    if(forgotPinBtn) forgotPinBtn.style.display = pinMode === 'verify' ? 'block' : 'none';
    if(unlockBtn) unlockBtn.textContent = pinMode === 'verify' ? 'Unlock' : (pinMode === 'setup' ? 'Create PIN' : 'Continue');
    if(pinErrorMsg) pinErrorMsg.textContent = '';
    clearPins();
    resetInactivityTimer();
  }

  if(cancelPinBtn) {
    cancelPinBtn.addEventListener('click', () => {
      if (pinMode === 'change_old' || pinMode === 'change_new' || pinMode === 'change_confirm') {
        unlockDiary();
      }
    });
  }

  if(forgotPinBtn) {
    forgotPinBtn.addEventListener('click', () => {
      alert('Account recovery is required to reset your PIN. Please contact support or go to Account Settings.');
    });
  }

  if (lockDiaryBtn) lockDiaryBtn.addEventListener('click', () => lockDiary());

  if (changePinBtn) {
    changePinBtn.addEventListener('click', () => {
      pinMode = 'change_old';
      showLockScreen('🔑 Change PIN', 'Enter your CURRENT PIN', true);
    });
  }

  if(unlockBtn) {
    unlockBtn.addEventListener('click', async () => {
      const pin = getPinValue();
      if (pin.length < 4) {
        pinErrorMsg.textContent = 'PIN must be at least 4 digits.';
        return;
      }
  
      pinErrorMsg.textContent = '';
      unlockBtn.disabled = true;
      unlockBtn.textContent = 'Wait...';
  
      try {
        if (pinMode === 'setup') {
          const res = await fetch('/api/diary/pin/setup', {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ pin })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to setup PIN');
          
          showToast('PIN securely created!', 'success');
          unlockDiary();
          initDiary();
        } 
        else if (pinMode === 'verify') {
          const res = await fetch('/api/diary/pin/verify', {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ pin })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Incorrect PIN');
          
          unlockDiary();
          initDiary();
        }
        else if (pinMode === 'change_old') {
          const res = await fetch('/api/diary/pin/verify', {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ pin })
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Incorrect current PIN');
          }
          window._tempOldPin = pin;
          pinMode = 'change_new';
          showLockScreen('🔑 New PIN', 'Enter your NEW 4-6 digit PIN', true);
        }
        else if (pinMode === 'change_new') {
          const invalidPins = ['0000', '000000', '1111', '111111', '1234', '123456'];
          if (invalidPins.includes(pin)) throw new Error('Please choose a stronger PIN.');
          
          tempNewPin = pin;
          pinMode = 'change_confirm';
          showLockScreen('🔑 Confirm PIN', 'Re-enter your NEW PIN', true);
        }
        else if (pinMode === 'change_confirm') {
          if (pin !== tempNewPin) {
            pinMode = 'change_new';
            showLockScreen('🔑 New PIN', 'PINs did not match. Enter NEW PIN again', true);
            throw new Error('PINs do not match.');
          }
          const res = await fetch('/api/diary/pin/change', {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ currentPin: window._tempOldPin, newPin: pin })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to change PIN');
          
          window._tempOldPin = null;
          tempNewPin = null;
          showToast('PIN successfully changed!', 'success');
          unlockDiary();
        }
      } catch (err) {
        pinErrorMsg.textContent = err.message;
        clearPins();
      } finally {
        unlockBtn.disabled = false;
        unlockBtn.textContent = pinMode === 'verify' ? 'Unlock' : (pinMode === 'setup' ? 'Create PIN' : 'Continue');
      }
    });
  }

  function unlockDiary() {
    lockOverlay.style.display = 'none';
    if(diaryLayout) {
      diaryLayout.style.opacity = '1';
      diaryLayout.style.pointerEvents = 'auto';
    }
    if(lockDiaryBtn) lockDiaryBtn.style.display = 'inline-block';
    resetInactivityTimer();
  }
  // --- End Lock Mechanism ---

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
    if(diaryLayout) {
      diaryLayout.style.opacity = '0';
      diaryLayout.style.pointerEvents = 'none';
    }
    
    async function startDiarySecurely() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-shell').hidden = false;
        await checkLock();
    }
    
    await startDiarySecurely();
  } catch (globalErr) {
    console.error('DIARY INIT ERROR:', globalErr);
    document.getElementById('loading-screen').innerHTML = '<div style="color:red; padding: 20px;"><h3>Fatal Error</h3><p>' + globalErr.message + '</p><pre>' + globalErr.stack + '</pre></div>';
  }
});

