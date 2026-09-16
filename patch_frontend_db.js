import fs from 'fs';
const file = 'frontend/js/ai-teacher.js';
let content = fs.readFileSync(file, 'utf8');

// Handle Supabase errors
content = content.replace(
  /\}\]\)\.then\(\);/g,
  "}])\n      .then(({ error }) => { if (error) console.error('Database error:', error); });"
);

// If response fails but has JSON (like our 503 error), parse it first
content = content.replace(
  "if (!res.ok) throw new Error('AI failed');\n    const data = await res.json();",
  `const data = await res.json();\n    if (!res.ok) throw new Error(data.message || 'AI failed');`
);

fs.writeFileSync(file, content);
console.log("Patched ai-teacher.js DB errors and error parsing");
