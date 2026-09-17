import { callAI } from './ai-service.js';

export const routeIntent = async (prompt, provider) => {
  const routerPrompt = `Analyze the following student question and determine the single most helpful external tool to use.
  
Options:
- DICTIONARY: The user is asking for the definition, meaning, or explanation of a specific word or term.
- MATH: The user is asking to solve a math equation, simplify an expression, or perform calculus/algebra (e.g., "Solve 2x+5=15").
- RESEARCH: The user is asking for academic research papers, scientific articles, or scholarly publications.
- GENERAL: None of the above. The question is a general programming, conversational, or conceptual question.

Question: "${prompt}"

Reply with EXACTLY ONE WORD from the options above. Do not include any other text.`;

  try {
    const result = await callAI(routerPrompt, 'router', {}, provider, false);
    const intent = result.text.trim().toUpperCase();
    
    if (intent.includes('DICTIONARY')) return 'DICTIONARY';
    if (intent.includes('MATH')) return 'MATH';
    if (intent.includes('RESEARCH')) return 'RESEARCH';
    return 'GENERAL';
  } catch (error) {
    console.error('Intent routing failed, falling back to GENERAL', error);
    return 'GENERAL';
  }
};

export const fetchToolData = async (intent, prompt) => {
  if (intent === 'GENERAL') return null;

  try {
    // Basic extraction heuristics from the prompt for the tools
    if (intent === 'DICTIONARY') {
      const match = prompt.match(/(?:what is|define|meaning of)[\s:]*([a-zA-Z]+)/i);
      const word = match ? match[1] : prompt.split(' ').pop().replace(/[^a-zA-Z]/g, '');
      if (!word) return null;
      
      const res = await fetch(`${process.env.DICTIONARY_BASE_URL || 'https://api.dictionaryapi.dev'}/api/v2/entries/en/${word}`);
      if (res.ok) {
        const data = await res.json();
        // Return a condensed version of the dictionary meaning to feed to the AI
        return JSON.stringify(data[0].meanings);
      }
    }

    if (intent === 'MATH') {
      // Extract the equation
      const equation = prompt.replace(/[a-zA-Z\s\?]+/, '').trim();
      if (!equation) return null;
      const res = await fetch(`${process.env.NEWTON_BASE_URL || 'https://newton.vercel.app/api/v2'}/simplify/${encodeURIComponent(equation)}`);
      if (res.ok) {
        const data = await res.json();
        return `Math Tool Result: ${data.result}`;
      }
    }

    if (intent === 'RESEARCH') {
      // Extract keywords
      const query = prompt.replace(/(?:find|give me|search for|research papers about|articles on)/i, '').trim();
      const res = await fetch(`${process.env.OPENALEX_BASE_URL || 'https://api.openalex.org'}/works?search=${encodeURIComponent(query)}&per-page=3`);
      if (res.ok) {
        const data = await res.json();
        const papers = data.results.map(w => `- ${w.title} (${w.publication_year})`).join('\n');
        return `Research Tool found these papers:\n${papers}`;
      }
    }
  } catch (error) {
    console.error(`Tool fetch failed for intent ${intent}:`, error);
  }
  return null;
};
