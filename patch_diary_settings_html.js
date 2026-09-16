import fs from 'fs';
const file = 'frontend/diary.html';
let content = fs.readFileSync(file, 'utf8');

const toolbarTarget = `<button class="diary-btn" id="new-entry-btn"><i class="fas fa-plus"></i> New</button>`;
const newButtons = `<button class="diary-btn" id="btn-lock-diary"><i class="fas fa-lock"></i> Lock</button>
          <button class="diary-btn" id="btn-diary-settings"><i class="fas fa-cog"></i> Settings</button>
          ` + toolbarTarget;

if (content.includes(toolbarTarget) && !content.includes('id="btn-diary-settings"')) {
  content = content.replace(toolbarTarget, newButtons);
}

const modalTarget = `<!-- AI Panel -->`;
const settingsModal = `
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
`;

if (content.includes(modalTarget) && !content.includes('diary-settings-modal')) {
  content = content.replace(modalTarget, settingsModal + '\n  ' + modalTarget);
}

fs.writeFileSync(file, content);
console.log("Patched diary.html for settings");
