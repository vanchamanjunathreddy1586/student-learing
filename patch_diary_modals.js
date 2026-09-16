import fs from 'fs';
const file = 'frontend/diary.html';
let content = fs.readFileSync(file, 'utf8');

const modals = `
  <!-- Diary Settings Modal -->
  <div id="diary-settings-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.8); z-index:10000; align-items:center; justify-content:center; backdrop-filter:blur(10px);">
    <div style="background:var(--card-bg); border:1px solid var(--card-border); border-radius:16px; padding:32px; max-width:400px; width:90%; color:var(--text-primary); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <h2 style="margin-top:0;"><i class="fas fa-user-shield" style="color:var(--primary)"></i> Diary Security Settings</h2>
      
      <p style="font-size:14px; color:var(--text-secondary); margin-bottom:24px;">Status: <strong style="color:#10b981;">Secure</strong> (Active Session)</p>

      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">New Password</label>
        <input type="password" id="settings-new-password" placeholder="Enter new password" style="width:100%; padding:12px; background:var(--input-bg); border:1px solid var(--input-border); color:var(--text-primary); border-radius:8px; box-sizing:border-box;">
        <button id="btn-change-password" style="margin-top:8px; width:100%; padding:10px; background:var(--primary); color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Change Password</button>
      </div>
      
      <div style="margin-bottom:24px;">
        <label style="display:block; font-size:13px; font-weight:600; color:var(--text-secondary); margin-bottom:8px;">New 6-Digit PIN</label>
        <input type="password" id="settings-new-pin" placeholder="Enter new PIN" maxlength="6" inputmode="numeric" style="width:100%; padding:12px; background:var(--input-bg); border:1px solid var(--input-border); color:var(--text-primary); border-radius:8px; box-sizing:border-box;">
        <button id="btn-change-pin" style="margin-top:8px; width:100%; padding:10px; background:var(--primary); color:#000; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Change PIN</button>
      </div>

      <button id="btn-close-settings" style="width:100%; padding:12px; background:rgba(255,255,255,0.1); color:var(--text-primary); border:1px solid var(--card-border); border-radius:8px; cursor:pointer;">Close</button>
    </div>
  </div>

  <!-- PIN Lock Overlay -->
  <div id="diary-lock-overlay" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:9999; align-items:center; justify-content:center; backdrop-filter:blur(15px); flex-direction:column;">
    <div style="background:var(--card-bg); border:1px solid var(--card-border); border-radius:16px; padding:40px; max-width:400px; width:90%; color:var(--text-primary); text-align:center; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <div style="font-size:48px; color:var(--primary); margin-bottom:16px;">
        <i class="fas fa-lock"></i>
      </div>
      <h2 style="margin:0 0 8px 0; font-family:'Outfit', sans-serif;">Personal Diary Locked</h2>
      <p style="color:var(--text-secondary); margin:0 0 24px 0; font-size:15px;">Enter your 6-digit Diary PIN to unlock.</p>
      
      <div style="position:relative; margin-bottom:24px;">
        <i class="fas fa-key" style="position:absolute; left:16px; top:50%; transform:translateY(-50%); color:var(--text-secondary);"></i>
        <input type="password" id="unlock-pin-input" inputmode="numeric" maxlength="6" pattern="[0-9]*" placeholder="• • • • • •" style="width:100%; padding:14px 16px 14px 44px; background:var(--input-bg); border:1px solid var(--input-border); color:var(--text-primary); border-radius:12px; font-size:24px; letter-spacing:8px; text-align:center; box-sizing:border-box;">
      </div>
      
      <button id="btn-unlock-diary" style="width:100%; padding:14px; background:var(--primary); color:#000; border:none; border-radius:12px; cursor:pointer; font-weight:600; font-size:16px; display:flex; justify-content:center; align-items:center; gap:8px;">
        <i class="fas fa-unlock"></i> Unlock
      </button>
      
      <div style="margin-top:24px; font-size:13px;">
        <a href="/diary-login.html" id="link-switch-user" style="color:var(--text-secondary); text-decoration:none;">Not you? Switch Account / Logout</a>
      </div>
    </div>
  </div>
`;

if (!content.includes('diary-lock-overlay')) {
  content = content.replace('<div class="dashboard-loading" id="loading-screen">', modals + '\n    <div class="dashboard-loading" id="loading-screen">');
  fs.writeFileSync(file, content);
  console.log("Patched diary.html with modals");
} else {
  console.log("Already has overlay");
}
