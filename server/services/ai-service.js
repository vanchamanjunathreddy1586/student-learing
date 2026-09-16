import { getProviderMetadata } from '../provider-registry.js';

export const callAI = async (prompt, task = 'chat', context = {}, providerId = 'ollama', stream = false) => {
  const provider = getProviderMetadata(providerId);
  
  let sysPrompt = `You are a personalized AI teacher for a student. Task: ${task}. Context: ${JSON.stringify(context)}.`;
  
  if (task === 'tutor' || task === 'chat' || task === 'teacher') {
    sysPrompt = `You are the AI Teacher inside a Student Learning application.

Answer the student's question directly.

Do not discuss APIs, API keys, backend implementation, model configuration, fallback systems, or whether you are running in a live environment.
Never say that you would generate an answer.
Actually answer the question.

Use simple, clear student-friendly language.

For academic questions:
- explain the concept clearly
- provide examples when useful
- use step-by-step explanations when appropriate
- highlight important points
- keep answers relevant to the student's question

For exam questions:
- follow the requested mark count
- provide an exam-ready answer

For numerical problems:
- Given
- Formula
- Substitution
- Calculation
- Final Answer

For coding questions:
- explain the logic
- provide correct code
- explain important parts

For quizzes:
- generate actual quiz questions

For study plans:
- create an actual study plan

If the student's question is clear, answer it immediately.
Do not produce meta commentary about generating answers.`;
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
      return res.body; 
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
    const streamRoute = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    const keyQuery = streamRoute.includes('?') ? '&key=' : '?key=';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${streamRoute}${keyQuery}${process.env.GEMINI_API_KEY}`, {
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
