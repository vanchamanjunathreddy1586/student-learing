const fs = require('fs');
const path = require('path');
const dir = 'frontend';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  let changed = false;
  
  if (!content.includes('themes.css')) {
    content = content.replace('</head>', '<link rel="stylesheet" href="/css/themes.css"></head>');
    changed = true;
  }
  
  if (!content.includes('theme-manager.js')) {
    // Inject at the very top of <head> to prevent FOUC
    content = content.replace('<head>', '<head><script src="/js/theme-manager.js"></script>');
    changed = true;
  }
  
  // Remove the hardcoded data-theme attributes so they don't override the JS logic on first render
  if (content.match(/data-theme="[a-zA-Z0-9-]+"/)) {
    content = content.replace(/ data-theme="[a-zA-Z0-9-]+"/g, '');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(path.join(dir, file), content);
    console.log('Fixed ' + file);
  }
});
