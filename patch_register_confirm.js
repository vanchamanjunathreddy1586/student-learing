import fs from 'fs';
const htmlFile = 'frontend/diary-login.html';
const jsFile = 'frontend/js/diary-login.js';

let html = fs.readFileSync(htmlFile, 'utf8');

const confirmPassHtml = `
        <div class="form-group">
          <label>Confirm Password</label>
          <div class="input-container">
            <i class="fas fa-lock icon"></i>
            <input type="password" id="reg-password-confirm" required placeholder="Confirm your password" minlength="6">
            <button type="button" class="btn-toggle-password"><i class="fas fa-eye"></i></button>
          </div>
        </div>
`;

const confirmPinHtml = `
        <div class="form-group">
          <label>Confirm 6-Digit PIN</label>
          <div class="input-container">
            <i class="fas fa-key icon"></i>
            <input type="password" id="reg-pin-confirm" inputmode="numeric" required placeholder="Confirm 6-digit PIN" minlength="4" maxlength="6" pattern="[0-9]*">
          </div>
        </div>
`;

if (html.includes('id="reg-password"')) {
  // Insert confirm password after the password block
  const passBlockEnd = html.indexOf('</div>', html.indexOf('id="reg-password"')) + 13; 
  html = html.substring(0, passBlockEnd) + confirmPassHtml + html.substring(passBlockEnd);
}

if (html.includes('id="reg-pin"')) {
  // Insert confirm pin after the pin block
  const pinBlockEnd = html.indexOf('</small>', html.indexOf('id="reg-pin"')) + 14;
  html = html.substring(0, pinBlockEnd) + confirmPinHtml + html.substring(pinBlockEnd);
}

fs.writeFileSync(htmlFile, html);
console.log("Patched HTML");

let js = fs.readFileSync(jsFile, 'utf8');
const jsTarget = `const pin = document.getElementById('reg-pin').value;`;
const jsAdd = `
      const confirmPass = document.getElementById('reg-password-confirm').value;
      const confirmPin = document.getElementById('reg-pin-confirm').value;
      if (password !== confirmPass) throw new Error('Passwords do not match');
      if (pin !== confirmPin) throw new Error('PINs do not match');
`;

if (js.includes(jsTarget)) {
  js = js.replace(jsTarget, jsTarget + jsAdd);
  fs.writeFileSync(jsFile, js);
  console.log("Patched JS");
}
