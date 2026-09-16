import fs from 'fs';
import path from 'path';

const htmlPath = path.join(process.cwd(), 'frontend', 'diary.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const newVaultUI = `
          <!-- Secure Private Vault Overlay -->
          <div class="diary-lock-overlay" id="diary-lock-overlay" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999; background: radial-gradient(circle at center, rgba(10,12,24,0.95) 0%, rgba(0,0,0,0.98) 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(30px);">
            
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 48px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1); width: 90%; max-width: 420px; position: relative; overflow: hidden;">
              
              <!-- Subtle glow effect -->
              <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(98, 230, 226, 0.08) 0%, transparent 60%); pointer-events: none; animation: spinGlow 15s linear infinite;"></div>
              
              <style>
                @keyframes spinGlow { 100% { transform: rotate(360deg); } }
                @keyframes pulseLock { 0% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(98,230,226,0.3)); } 50% { transform: scale(1.05); filter: drop-shadow(0 0 25px rgba(98,230,226,0.6)); } 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(98,230,226,0.3)); } }
                .vault-title { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; letter-spacing: 0.5px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); z-index: 1; }
                .vault-subtitle { color: #8892b0; font-size: 15px; margin-bottom: 32px; text-align: center; z-index: 1; line-height: 1.4; }
                .vault-pin-group { display: flex; gap: 8px; margin-bottom: 24px; z-index: 1; justify-content: center; }
                .vault-pin-digit { width: 45px; height: 55px; font-size: 28px; text-align: center; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.4); color: #62e6e2; outline: none; transition: all 0.2s ease; box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); }
                .vault-pin-digit:focus { border-color: #62e6e2; box-shadow: 0 0 15px rgba(98,230,226,0.3), inset 0 2px 5px rgba(0,0,0,0.5); transform: translateY(-2px); }
                .vault-btn { background: linear-gradient(135deg, #62e6e2 0%, #3bbdb8 100%); color: #000; font-weight: 600; padding: 14px 0; width: 100%; border: none; border-radius: 12px; font-size: 16px; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 15px rgba(98,230,226,0.3); z-index: 1; margin-bottom: 12px; }
                .vault-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(98,230,226,0.4); }
                .vault-btn-cancel { background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); box-shadow: none; }
                .vault-btn-cancel:hover { background: rgba(255,255,255,0.1); box-shadow: none; }
                .vault-link { font-size: 14px; color: #8892b0; cursor: pointer; text-decoration: none; transition: color 0.2s; z-index: 1; background: none; border: none; }
                .vault-link:hover { color: #62e6e2; }
                
                /* Mobile Numeric Keypad */
                .vault-keypad { display: none; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; width: 100%; z-index: 1; margin-bottom: 16px; }
                .vault-key { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05); color: #fff; font-size: 24px; font-weight: 500; height: 56px; border-radius: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none; transition: all 0.1s; }
                .vault-key:active { background: rgba(255,255,255,0.15); transform: scale(0.95); }
                .vault-key.action { font-size: 20px; color: #8892b0; }
                @media (max-width: 480px) {
                  .vault-keypad { display: grid; }
                  .vault-pin-digit { width: 40px; height: 50px; pointer-events: none; }
                }
              </style>

              <div class="lock-icon" style="font-size: 56px; margin-bottom: 16px; animation: pulseLock 2.5s infinite; z-index: 1;">🔐</div>
              <h2 id="lock-title" class="vault-title">Personal Diary</h2>
              <p id="lock-subtitle" class="vault-subtitle">Your private space. Enter your Diary PIN to continue.</p>
              
              <div class="vault-pin-group" id="pin-inputs-container">
                <input type="password" class="vault-pin-digit pin-digit" maxlength="1" inputmode="numeric">
                <input type="password" class="vault-pin-digit pin-digit" maxlength="1" inputmode="numeric">
                <input type="password" class="vault-pin-digit pin-digit" maxlength="1" inputmode="numeric">
                <input type="password" class="vault-pin-digit pin-digit" maxlength="1" inputmode="numeric">
                <input type="password" class="vault-pin-digit pin-digit" maxlength="1" inputmode="numeric">
                <input type="password" class="vault-pin-digit pin-digit" maxlength="1" inputmode="numeric">
              </div>

              <div id="pin-error-msg" style="color: #ff4d4f; height: 20px; margin-bottom: 16px; font-size: 14px; z-index: 1; text-align: center;"></div>
  
              <button class="vault-btn" id="unlock-btn">Unlock Diary</button>
              <button class="vault-btn vault-btn-cancel" id="cancel-pin-btn" style="display:none;">Cancel</button>

              <div class="vault-keypad">
                <div class="vault-key" data-val="1">1</div>
                <div class="vault-key" data-val="2">2</div>
                <div class="vault-key" data-val="3">3</div>
                <div class="vault-key" data-val="4">4</div>
                <div class="vault-key" data-val="5">5</div>
                <div class="vault-key" data-val="6">6</div>
                <div class="vault-key" data-val="7">7</div>
                <div class="vault-key" data-val="8">8</div>
                <div class="vault-key" data-val="9">9</div>
                <div class="vault-key action" data-val="clear">C</div>
                <div class="vault-key" data-val="0">0</div>
                <div class="vault-key action" data-val="back">⌫</div>
              </div>
              
              <button class="vault-link" id="forgot-pin-btn">Forgot PIN?</button>
            </div>
          </div>
`;

const startIndex = html.indexOf('<!-- Secure Diary Lock Overlay -->');
const endIndex = html.indexOf('<div class="diary-layout">');

if (startIndex !== -1 && endIndex !== -1) {
  html = html.substring(0, startIndex) + newVaultUI + '\n          ' + html.substring(endIndex);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('HTML patched successfully');
} else {
  console.log('Could not find boundaries');
}
