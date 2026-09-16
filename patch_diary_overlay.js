import fs from 'fs';
const file = 'frontend/diary.html';
let content = fs.readFileSync(file, 'utf8');

const modalTarget = `<!-- Diary Settings Modal -->`;
const pinOverlay = `
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
        <a href="#" id="link-switch-user" style="color:var(--text-secondary); text-decoration:none;">Not you? Switch Account</a>
      </div>
    </div>
  </div>
`;

if (content.includes(modalTarget) && !content.includes('diary-lock-overlay')) {
  content = content.replace(modalTarget, pinOverlay + '\n  ' + modalTarget);
  fs.writeFileSync(file, content);
  console.log("Patched diary.html for lock overlay");
}
