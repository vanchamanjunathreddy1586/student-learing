import fs from 'fs';
import path from 'path';

const htmlPath = path.join(process.cwd(), 'frontend', 'diary.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Remove old lock overlay
html = html.replace(/<!-- Lock Overlay -->[\s\S]*?<\/div>\s*<div class="editor-topbar">/g, '<div class="editor-topbar">');

// 2. Add new lock overlay right after <section class="diary-container reveal">
const newOverlay = `
          <!-- Secure Diary Lock Overlay -->
          <div class="diary-lock-overlay" id="diary-lock-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1000; background:var(--bg-primary); display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(20px);">
            <div class="lock-icon" style="font-size: 64px; margin-bottom: 16px; animation: float 3s ease-in-out infinite;">🔐</div>
            <h2 id="lock-title" style="margin-bottom: 8px;">Personal Diary Locked</h2>
            <p class="muted" id="lock-subtitle" style="margin-bottom: 24px;">Enter your PIN to access your private journal</p>
            
            <div class="pin-input-group" style="display: flex; gap: 8px; margin-bottom: 24px;" id="pin-inputs-container">
              <input type="password" class="pin-digit" maxlength="1" inputmode="numeric" style="width: 48px; height: 56px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);">
              <input type="password" class="pin-digit" maxlength="1" inputmode="numeric" style="width: 48px; height: 56px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);">
              <input type="password" class="pin-digit" maxlength="1" inputmode="numeric" style="width: 48px; height: 56px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);">
              <input type="password" class="pin-digit" maxlength="1" inputmode="numeric" style="width: 48px; height: 56px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);">
              <input type="password" class="pin-digit" maxlength="1" inputmode="numeric" style="width: 48px; height: 56px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);">
              <input type="password" class="pin-digit" maxlength="1" inputmode="numeric" style="width: 48px; height: 56px; font-size: 24px; text-align: center; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary);">
            </div>

            <div id="pin-error-msg" style="color: #ff4d4f; height: 20px; margin-bottom: 16px; font-size: 14px;"></div>

            <div style="display:flex; gap: 12px;">
              <button class="primary-btn" id="unlock-btn" style="padding: 12px 32px; font-size: 16px;">Unlock</button>
              <button class="secondary-btn" id="cancel-pin-btn" style="display:none; padding: 12px 32px; font-size: 16px;">Cancel</button>
            </div>
            
            <button class="ghost-btn" id="forgot-pin-btn" style="margin-top: 24px; font-size: 13px; color: var(--text-secondary); background: transparent; border: none; cursor: pointer;">Forgot PIN?</button>
          </div>
`;

html = html.replace('<section class="diary-container reveal">', '<section class="diary-container reveal" style="position:relative;">\n' + newOverlay);

// 3. Add Lock Button to top bar
html = html.replace('<div class="top-actions">', '<div class="top-actions">\n            <button class="secondary-btn" id="lock-diary-btn" style="display:none; padding: 6px 12px; margin-right: 12px; font-size: 13px;">🔒 Lock Diary</button>');

// 4. Add Change PIN to top bar near export/delete
html = html.replace('<button class="icon-btn-diary" id="delete-btn" title="Delete">🗑️</button>', '<button class="icon-btn-diary" id="delete-btn" title="Delete">🗑️</button>\n                  <button class="icon-btn-diary" id="change-pin-btn" title="Change PIN" style="margin-left: 8px;">🔑</button>');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('diary.html patched successfully.');
