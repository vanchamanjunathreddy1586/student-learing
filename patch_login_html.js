import fs from 'fs';
const file = 'frontend/diary-login.html';
let content = fs.readFileSync(file, 'utf8');

const target = `
        <div class="form-actions">
          <a href="#" id="link-forgot-password" class="text-link">Forgot password?</a>
        </div>`;

const pinInput = `
        <div class="form-group">
          <label>6-Digit Security PIN</label>
          <div class="input-container">
            <i class="fas fa-key icon"></i>
            <input type="password" id="login-pin" inputmode="numeric" required placeholder="Enter 6-digit PIN" minlength="4" maxlength="6" pattern="[0-9]*">
          </div>
        </div>
`;

if (content.includes(target) && !content.includes('id="login-pin"')) {
  content = content.replace(target, pinInput + target);
  fs.writeFileSync(file, content);
  console.log("Added login PIN input to HTML");
} else {
  console.log("Could not find target or already exists.");
}
