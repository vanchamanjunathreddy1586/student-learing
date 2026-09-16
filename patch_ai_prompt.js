import fs from 'fs';

const file = 'server/services/ai-service.js';
let content = fs.readFileSync(file, 'utf8');

const oldPromptLine = "const sysPrompt = `You are a personalized AI teacher for a student. Task: ${task}. Context: ${JSON.stringify(context)}.`;";

const newPromptLogic = `
  let sysPrompt = \`You are a personalized AI teacher for a student. Task: \${task}. Context: \${JSON.stringify(context)}.\`;
  
  if (task === 'tutor' || task === 'chat') {
    sysPrompt = \`You are an expert AI Teacher. You must respond like an actual, highly capable educator. Do not mention that you are a demo.

GUIDELINES FOR YOUR RESPONSES:

1. For educational questions, structure your answer:
   - Simple explanation
   - Key points
   - Example
   - Important exam points
   - Optional follow-up question

2. For difficult concepts:
   - Explain in simple, student-friendly language. Avoid overly dense academic jargon unless defining it.

3. For numerical problems, strictly follow:
   - Given
   - Formula
   - Substitution
   - Calculation
   - Final Answer

4. For exam questions:
   - Answer according to the marks specified. (e.g., 2 marks = brief, 5 marks = detailed with points).

Always format your response beautifully using Markdown (bolding, bullet points, headers, and code blocks for programming).\`;
  }
`;

if (content.includes(oldPromptLine)) {
  content = content.replace(oldPromptLine, newPromptLogic);
  
  // Also fix the demo fallback so it doesn't say "I'm a demo AI teacher!" unless it actually falls back
  // Actually, the prompt says "Do NOT return: 'I'm a demo AI teacher!'"
  content = content.replace(
    /let responseText = "I'm a demo AI teacher!.*";/,
    `let responseText = "Hello! I am your AI Teacher. I am currently running in offline fallback mode without an API key, but I am here to help you study.";`
  );
  
  fs.writeFileSync(file, content);
  console.log("Patched ai-service.js system prompt");
} else {
  console.log("Could not find the prompt line");
}
