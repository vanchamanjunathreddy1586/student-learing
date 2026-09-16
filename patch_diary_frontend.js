import fs from 'fs';
const file = 'frontend/js/diary.js';
let content = fs.readFileSync(file, 'utf8');

const sessionRegex = /const \{ data, error \} = await supabase\.auth\.getSession\(\);[\s\S]*?if \(!session\) \{[\s\S]*?return;[\s\S]*?\}/;
const initDiaryStr = "function initDiary() {";

const match = content.match(sessionRegex);
const idx2 = content.indexOf(initDiaryStr);

if (match && idx2 !== -1) {
  const sessionBlockEnd = match.index + match[0].length;
  const before = content.substring(0, sessionBlockEnd);
  const after = content.substring(idx2);

  const newAuthLogic = `
  let diaryToken = sessionStorage.getItem('diaryToken') || null;

  async function getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': \`Bearer \${session.access_token}\`,
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
    fetch('/api/diary/auth/logout', { method: 'POST', headers: { 'Authorization': \`Bearer \${session.access_token}\` } }).catch(e=>e);
    
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

  const finalContent = before + '\n\n' + newAuthLogic + '\n\n  ' + after;
  fs.writeFileSync(file, finalContent);
  console.log("Successfully patched frontend/js/diary.js");
} else {
  console.log("Regex match failed:", !!match, idx2);
}
