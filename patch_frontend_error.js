import fs from 'fs';
const file = 'frontend/js/ai-teacher.js';
let content = fs.readFileSync(file, 'utf8');

// Update sanitizeOptions to allow buttons
content = content.replace(
  "ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'blockquote', 'span', 'div']",
  "ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'blockquote', 'span', 'div', 'button']"
);
content = content.replace(
  "ALLOWED_ATTR: ['href', 'class', 'target']",
  "ALLOWED_ATTR: ['href', 'class', 'target', 'data-prompt']"
);

// Replace the error message
const oldStr = "appendMessage('Sorry, I am having trouble connecting to my brain right now. Please try again.', 'ai');";
const newStr = `
    const errBubble = appendMessage("Sorry, I couldn't connect to your AI Teacher right now.<br><br><button class='quick-action-chip' data-prompt='" + text.replace(/'/g, "&#39;") + "'>Retry</button>", 'ai', false, new Date(), true);
`;
content = content.replace(oldStr, newStr);

// We need to pass a flag to bypass markdown parsing for the error bubble so the button renders exactly as HTML.
// Let's modify appendMessage signature: appendMessage(text, role, animate = false, timestamp = null, isRawHtml = false)
content = content.replace(
  "const appendMessage = (text, role, animate = false, timestamp = null) => {",
  "const appendMessage = (text, role, animate = false, timestamp = null, isRawHtml = false) => {"
);

content = content.replace(
  "if (window.marked && window.DOMPurify) {",
  "if (isRawHtml) {\n    bubble.innerHTML = text;\n  } else if (window.marked && window.DOMPurify) {"
);

fs.writeFileSync(file, content);
console.log("Patched frontend error message");
