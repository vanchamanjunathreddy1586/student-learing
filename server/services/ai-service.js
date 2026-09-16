import { getProviderMetadata } from '../provider-registry.js';

export const callAI = async (prompt, task = 'chat', context = {}, providerId = 'ollama', stream = false) => {
  const provider = getProviderMetadata(providerId);
  
  let sysPrompt = `You are a personalized AI teacher for a student. Task: ${task}. Context: ${JSON.stringify(context)}.`;
  
  if (task === 'tutor' || task === 'chat') {
    sysPrompt = `You are an expert AI Teacher. You must respond like an actual, highly capable educator. Do not mention that you are a demo.

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

Always format your response beautifully using Markdown (bolding, bullet points, headers, and code blocks for programming).`;
  }


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

  
  // If no configured provider was matched, or we hit a default fallback, throw an error as requested by the user.
  throw new Error("AI service unavailable. Please configure an API key (e.g. GEMINI_API_KEY).");

};
