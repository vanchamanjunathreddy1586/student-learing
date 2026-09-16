import { getProviderMetadata } from '../provider-registry.js';

export const callAI = async (prompt, task = 'chat', context = {}, providerId = 'ollama', stream = false) => {
  const provider = getProviderMetadata(providerId);
  const sysPrompt = `You are a personalized AI teacher for a student. Task: ${task}. Context: ${JSON.stringify(context)}.`;

  if (providerId === 'ollama') {
    const url = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'llama3.2';
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: prompt }
        ],
        stream
      })
    });
    if (!res.ok) throw new Error(`Ollama error: ${await res.text()}`);
    
    if (stream) {
      return res.body; // Return readable stream
    } else {
      const data = await res.json();
      return { text: data.message?.content || '', provider: 'Ollama', model };
    }
  }

  if (providerId === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: sysPrompt },
          { role: 'user', content: prompt }
        ],
        stream
      })
    });
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
    
    if (stream) return res.body;
    const data = await res.json();
    return { text: data.choices[0]?.message?.content || '', provider: 'OpenAI', model: process.env.OPENAI_MODEL };
  }
  
  if (providerId === 'gemini') {
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    // Using the REST API for simplicity
    const streamRoute = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${streamRoute}&key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${sysPrompt}\n\nUser: ${prompt}` }] }
        ]
      })
    });
    if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
    
    if (stream) return res.body;
    const data = await res.json();
    return { text: data.candidates[0]?.content?.parts[0]?.text || '', provider: 'Gemini', model };
  }

  // Fallback demo / rule-based AI
  const lowercasePrompt = prompt.toLowerCase();
  let responseText = "I'm a demo AI teacher! You can ask me to explain concepts, give you a quiz, or help you build a study plan.";
  
  if (lowercasePrompt.includes("what is this app") || lowercasePrompt.includes("about this app") || lowercasePrompt.includes("instructions")) {
    responseText = "This is Smart Learning! It's a personalized AI classroom where you can track your study sessions, test your knowledge with quizzes, and chat with me (your AI teacher) to clear your doubts. Try clicking '+ Start a focus session' on your dashboard!";
  } else if (lowercasePrompt.includes("hello") || lowercasePrompt.includes("hi") || lowercasePrompt.includes("hey")) {
    responseText = "Hello there! I'm your AI teacher. What concept can I help you understand today?";
  } else if (lowercasePrompt.includes("quiz")) {
    responseText = "I can generate quizzes for you! Just click the 'Generate a quiz' button on the dashboard, or type a specific topic here and I'll test you.";
  } else if (lowercasePrompt.includes("explain") || lowercasePrompt.includes("what is")) {
    responseText = "That's a great question! In a live environment with an OpenAI or Gemini API key, I would generate a detailed, easy-to-understand explanation for you. For now, imagine a perfectly clear explanation here!";
  } else if (lowercasePrompt.includes("thank")) {
    responseText = "You're very welcome! Keep up the great studying!";
  }

  return { text: responseText, provider: 'demo', model: 'rule-based' };
};
