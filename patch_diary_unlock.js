import fs from 'fs';
const file = 'frontend/js/diary.js';
let content = fs.readFileSync(file, 'utf8');

// We need to completely replace checkLock() and lockDiary()
const checkLockTargetStart = `async function checkLock() {`;
const checkLockTargetEnd = `  function lockDiary() {`;
// actually I'll just use a regex replace for checkLock and lockDiary up to // --- Auto Lock Features ---

const replacement = `
  const diaryLockOverlay = document.getElementById('diary-lock-overlay');
  
  async function checkLock() {
    if (!diaryToken) {
      // Check if they even have an account
      try {
        const res = await fetch('/api/diary/auth/status', { 
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${(await supabase.auth.getSession()).data.session?.access_token}\`
          } 
        });
        const data = await res.json();
        
        if (data.hasAccount) {
          // They have an account but no active session token. Show PIN unlock.
          if(diaryLockOverlay) diaryLockOverlay.style.display = 'flex';
          return;
        } else {
          // No account.
          window.location.href = '/diary-login.html';
          return;
        }
      } catch (err) {
        window.location.href = '/diary-login.html';
        return;
      }
    }

    try {
      const res = await fetch('/api/diary/auth/status', { headers: await getHeaders() });
      if (!res.ok) {
        if(diaryLockOverlay) diaryLockOverlay.style.display = 'flex';
        return;
      }
      
      const data = await res.json();
      if (!data.hasAccount) {
        window.location.href = '/diary-login.html';
        return;
      }

      // Token valid, show layout
      if (diaryLayout) {
        diaryLayout.style.opacity = '1';
        diaryLayout.style.pointerEvents = 'auto';
      }
      if(diaryLockOverlay) diaryLockOverlay.style.display = 'none';
      initDiary();
      
    } catch (err) {
      console.error(err);
      if(diaryLockOverlay) diaryLockOverlay.style.display = 'flex';
    }
  }

  function lockDiary() {
    sessionStorage.removeItem('diaryToken');
    diaryToken = null;
    
    // Clear the DOM immediately
    if(diaryLayout) {
      diaryLayout.style.opacity = '0';
      diaryLayout.style.pointerEvents = 'none';
    }
    if(diaryLockOverlay) {
      diaryLockOverlay.style.display = 'flex';
      document.getElementById('unlock-pin-input').value = '';
    }
    
    fetch('/api/diary/auth/logout', { method: 'POST', headers: { 'Authorization': \`Bearer \${session?.access_token}\` } }).catch(e=>e);
  }

  // --- PIN Unlock Logic ---
  document.getElementById('btn-unlock-diary')?.addEventListener('click', async () => {
    const pin = document.getElementById('unlock-pin-input').value;
    if(!pin || pin.length < 4) {
      showToast('Enter valid PIN', 'error');
      return;
    }
    
    const btn = document.getElementById('btn-unlock-diary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unlocking...';
    
    try {
      const res = await fetch('/api/diary/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${(await supabase.auth.getSession()).data.session?.access_token}\`
        },
        body: JSON.stringify({ pin })
      });
      
      const data = await res.json();
      btn.innerHTML = originalText;
      
      if(res.ok && data.success) {
        diaryToken = data.diaryToken;
        sessionStorage.setItem('diaryToken', data.diaryToken);
        diaryLockOverlay.style.display = 'none';
        
        if (diaryLayout) {
          diaryLayout.style.opacity = '1';
          diaryLayout.style.pointerEvents = 'auto';
        }
        initDiary();
      } else {
        showToast(data.error || 'Incorrect PIN', 'error');
        document.getElementById('unlock-pin-input').value = '';
      }
    } catch(err) {
      btn.innerHTML = originalText;
      showToast(err.message, 'error');
    }
  });

  document.getElementById('unlock-pin-input')?.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') {
      document.getElementById('btn-unlock-diary').click();
    }
  });

`;

const start = content.indexOf('async function checkLock() {');
const end = content.indexOf('// --- Auto Lock Features ---');

if (start !== -1 && end !== -1) {
  content = content.substring(0, start) + replacement + content.substring(end);
  fs.writeFileSync(file, content);
  console.log("Patched JS for PIN unlock");
}
