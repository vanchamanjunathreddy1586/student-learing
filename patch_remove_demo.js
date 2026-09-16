import fs from 'fs';

const file = 'server/services/ai-service.js';
let content = fs.readFileSync(file, 'utf8');

// Completely remove the fallback block.
const oldFallbackRegex = /\/\/ Fallback demo \/ rule-based AI[\s\S]*return \{ text: responseText, provider: 'demo', model: 'rule-based' \};/m;

const newErrorThrow = `
  // If no configured provider was matched, or we hit a default fallback, throw an error as requested by the user.
  throw new Error("AI service unavailable. Please configure an API key (e.g. GEMINI_API_KEY).");
`;

if (content.match(oldFallbackRegex)) {
  content = content.replace(oldFallbackRegex, newErrorThrow);
}

// Ensure the default provider isn't strictly Ollama if not configured, or let Ollama throw its own connection error.
// The code already throws an error if fetch fails for any provider.

fs.writeFileSync(file, content);
console.log("Removed demo fallback from ai-service.js");
