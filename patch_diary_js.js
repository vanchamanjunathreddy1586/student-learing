import fs from 'fs';
import path from 'path';

const jsPath = path.join(process.cwd(), 'frontend', 'js', 'diary.js');
let js = fs.readFileSync(jsPath, 'utf8');

// The replacement lock logic for diary.js
const newLockLogic = `
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
  
  let pinMode = 'verify'; // 'verify', 'setup', 'change_old', 'change_new', 'change_confirm'
  let tempNewPin = '';
  let autoLockTimer = null;
  const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

  function resetInactivityTimer() {
    clearTimeout(autoLockTimer);
    autoLockTimer = setTimeout(() => {
      if (lockOverlay.style.display === 'none') {
        showToast('Diary auto-locked due to inactivity', 'info');
        lockDiary();
      }
    }, INACTIVITY_LIMIT);
  }

  // Bind activity events
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
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
    // Auto-advance
    pin.addEventListener('input', () => {
      if (pin.value && idx < pinInputs.length - 1) {
        pinInputs[idx + 1].focus();
      }
    });
    // Backspace logic
    pin.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !pin.value && idx > 0) {
        pinInputs[idx - 1].focus();
      }
      if (e.key === 'Enter') {
        unlockBtn.click();
      }
    });
    // Paste logic
    pin.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\\D/g, '').slice(0, 6);
      [...pasted].forEach((char, i) => {
        if (pinInputs[i]) pinInputs[i].value = char;
      });
      if (pasted.length > 0) {
        pinInputs[Math.min(pasted.length, 5)].focus();
      }
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
    diaryLayout.style.opacity = '0';
    diaryLayout.style.pointerEvents = 'none';
    lockDiaryBtn.style.display = 'none';
  }

  function showLockScreen(title, subtitle, canCancel = false) {
    lockOverlay.style.display = 'flex';
    lockTitle.textContent = title;
    lockSubtitle.textContent = subtitle;
    cancelPinBtn.style.display = canCancel ? 'block' : 'none';
    forgotPinBtn.style.display = pinMode === 'verify' ? 'block' : 'none';
    unlockBtn.textContent = pinMode === 'verify' ? 'Unlock' : (pinMode === 'setup' ? 'Create PIN' : 'Continue');
    pinErrorMsg.textContent = '';
    clearPins();
    resetInactivityTimer();
  }

  cancelPinBtn.addEventListener('click', () => {
    if (pinMode === 'change_old' || pinMode === 'change_new' || pinMode === 'change_confirm') {
      lockOverlay.style.display = 'none';
      diaryLayout.style.opacity = '1';
      diaryLayout.style.pointerEvents = 'auto';
    }
  });

  forgotPinBtn.addEventListener('click', () => {
    alert('Account recovery is required to reset your PIN. Please contact support or go to Account Settings.');
  });

  if (lockDiaryBtn) {
    lockDiaryBtn.addEventListener('click', () => {
      lockDiary();
    });
  }

  if (changePinBtn) {
    changePinBtn.addEventListener('click', () => {
      pinMode = 'change_old';
      showLockScreen('🔑 Change PIN', 'Enter your CURRENT PIN', true);
    });
  }

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
        // Move to new pin
        tempNewPin = currentEntryId; // Just abusing a variable to store state
        tempNewPin = '';
        pinMode = 'change_new';
        showLockScreen('🔑 New PIN', 'Enter your NEW 4-6 digit PIN', true);
      }
      else if (pinMode === 'change_new') {
        const invalidPins = ['0000', '000000', '1111', '111111', '1234', '123456'];
        if (invalidPins.includes(pin)) {
          throw new Error('Please choose a stronger PIN.');
        }
        tempNewPin = pin;
        pinMode = 'change_confirm';
        showLockScreen('🔑 Confirm PIN', 'Re-enter your NEW PIN', true);
      }
      else if (pinMode === 'change_confirm') {
        if (pin !== tempNewPin) {
          throw new Error('PINs do not match. Try again.');
        }
        const res = await fetch('/api/diary/pin/change', {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ currentPin: tempNewPin, newPin: pin }) // Wait, currentPin is not tempNewPin. We need currentPin from step 1!
          // This requires us to store the old pin. Instead, the backend /change endpoint expects both.
          // Since we already verified it, the backend should just accept a reset token, or we store the current pin temporarily in memory.
        });
        // Wait, the API requires currentPin.
      }
    } catch (err) {
      pinErrorMsg.textContent = err.message;
      clearPins();
    } finally {
      unlockBtn.disabled = false;
      unlockBtn.textContent = pinMode === 'verify' ? 'Unlock' : (pinMode === 'setup' ? 'Create PIN' : 'Continue');
    }
  });

  function unlockDiary() {
    lockOverlay.style.display = 'none';
    diaryLayout.style.opacity = '1';
    diaryLayout.style.pointerEvents = 'auto';
    lockDiaryBtn.style.display = 'inline-block';
    resetInactivityTimer();
  }
  // --- End Secure PIN Lock Mechanism ---
`;

// Regex replacement for old checkLock and setupPinLock
// It ranges from `async function checkLock()` to `// --- Initializing ---`
const regex = /\/\/ --- Lock Mechanism ---[\s\S]*?(?=\/\/ --- Initializing ---)/;

if (regex.test(js)) {
  js = js.replace(regex, newLockLogic + '\n  ');
} else {
  console.log("Could not find the old lock logic block!");
}

// Since we have a complex PIN change flow, let's fix the API call logic.
js = js.replace('// Wait, the API requires currentPin.', `
        // Temporary fix: we need currentPin. Let's modify the change flow to avoid storing plain text.
        // Or store it in tempOldPin. Let's fix the whole change pin block safely.
`);

// Re-write the change flow inside unlockBtn.addEventListener cleanly:
js = js.replace(/else if \(pinMode === 'change_old'\) \{[\s\S]*?catch \(err\)/, `
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
        window._tempOldPin = pin; // temporary memory
        pinMode = 'change_new';
        showLockScreen('🔑 New PIN', 'Enter your NEW 4-6 digit PIN', true);
      }
      else if (pinMode === 'change_new') {
        const invalidPins = ['0000', '000000', '1111', '111111', '1234', '123456'];
        if (invalidPins.includes(pin)) {
          throw new Error('Please choose a stronger PIN.');
        }
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
    } catch (err)`);

fs.writeFileSync(jsPath, js, 'utf8');
console.log('diary.js patched successfully.');
