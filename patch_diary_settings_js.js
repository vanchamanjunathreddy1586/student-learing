import fs from 'fs';
const file = 'frontend/js/diary.js';
let content = fs.readFileSync(file, 'utf8');

const target = `document.getElementById('btn-lock-diary')?.addEventListener('click', (e) => {
    e.preventDefault();
    lockDiary();
  });`;

const settingsLogic = `
  const settingsModal = document.getElementById('diary-settings-modal');
  document.getElementById('btn-diary-settings')?.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });
  
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  document.getElementById('btn-change-password')?.addEventListener('click', async () => {
    const newPass = document.getElementById('settings-new-password').value;
    if(newPass.length < 6) return showToast('Password must be 6+ chars', 'error');
    try {
      const res = await fetch('/api/diary/auth/change-password', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ newPassword: newPass })
      });
      if(!res.ok) throw new Error('Failed to change password');
      showToast('Password updated securely', 'success');
      document.getElementById('settings-new-password').value = '';
    } catch(err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('btn-change-pin')?.addEventListener('click', async () => {
    const newPin = document.getElementById('settings-new-pin').value;
    if(newPin.length < 4 || newPin.length > 6 || !/^\\d+$/.test(newPin)) return showToast('PIN must be 4-6 digits', 'error');
    try {
      const res = await fetch('/api/diary/auth/change-pin', {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({ newPin })
      });
      if(!res.ok) throw new Error('Failed to change PIN');
      showToast('PIN updated securely', 'success');
      document.getElementById('settings-new-pin').value = '';
    } catch(err) {
      showToast(err.message, 'error');
    }
  });
`;

if (content.includes(target) && !content.includes('btn-diary-settings')) {
  content = content.replace(target, target + '\n' + settingsLogic);
  fs.writeFileSync(file, content);
  console.log("Patched diary.js for settings");
} else {
  console.log("Could not find target or already patched");
}
