import fs from 'fs';
const file = 'frontend/js/diary.js';
let content = fs.readFileSync(file, 'utf8');

// The new logic to inject right after the getSession check
const newAuthLogic = `
  let diaryToken = sessionStorage.getItem('diaryToken') || null;

  async function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${(await supabase.auth.getSession()).data.session?.access_token}\`,
      'X-Diary-Token': diaryToken
    };
  }

  const diaryLayout = document.querySelector('.diary-layout');

  async function checkLock() {
    if (!diaryToken) {
      window.location.href = '/diary-login.html';
      return;
    }

    try {
      const res = await fetch('/api/diary/auth/status', { headers: await getHeaders() });
      if (!res.ok) {
        window.location.href = '/diary-login.html';
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
      initDiary();
      
    } catch (err) {
      console.error(err);
      window.location.href = '/diary-login.html';
    }
  }

  function lockDiary() {
    sessionStorage.removeItem('diaryToken');
    diaryToken = null;
    
    // Clear the DOM immediately so back-button doesn't show it
    const dl = document.querySelector('.diary-layout');
    if(dl) dl.innerHTML = '';
    
    // Attempt backend logout (optional, since it's stateless)
    fetch('/api/diary/auth/logout', { method: 'POST', headers: { 'Authorization': \`Bearer \${session?.access_token}\` } }).catch(e=>e);
    
    window.location.href = '/diary-login.html';
  }

  // --- Auto Lock Features ---
  let inactivityTimer;
  function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (!diaryToken) return;
    inactivityTimer = setTimeout(() => {
      lockDiary();
    }, 15 * 60 * 1000);
  }

  ['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && diaryToken) {
      lockDiary();
    }
  });

  document.getElementById('btn-lock-diary')?.addEventListener('click', (e) => {
    e.preventDefault();
    lockDiary();
  });
`;

// Find `let diaryToken = null;` up to `return headers;\n  };`
const oldTokenStart = content.indexOf('let diaryToken = null;');
const oldTokenEnd = content.indexOf('// --- Elements ---');
if (oldTokenStart !== -1 && oldTokenEnd !== -1) {
  content = content.substring(0, oldTokenStart) + newAuthLogic + '\n\n  ' + content.substring(oldTokenEnd);
}

// Now we need to remove the old lock screen logic at the bottom
// `// --- Initializing ---`
// But wait, my script from earlier put `if(diaryLayout) {`
const oldInitStart = content.indexOf('        // --- Initializing ---');
const oldInitEnd = content.indexOf('    await startDiarySecurely();');
if (oldInitStart !== -1 && oldInitEnd !== -1) {
    const replacement = `
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
    `;
    content = content.substring(0, oldInitStart) + replacement + content.substring(oldInitEnd);
}

fs.writeFileSync(file, content);
console.log("Successfully patched frontend/js/diary.js");
