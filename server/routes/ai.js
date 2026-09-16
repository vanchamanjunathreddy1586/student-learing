import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { callAI } from '../services/ai-service.js';
import { getAvailableProviders } from '../provider-registry.js';

const router = express.Router();

router.get('/providers', (req, res) => {
  const providers = getAvailableProviders();
  res.json({ providers, active: providers[0]?.name || 'Unknown' });
});

router.post('/chat', async (req, res) => {
  try {
    const { prompt, task, context, provider = process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama') } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) return res.status(400).json({ error: 'Invalid prompt' });
    if (provider && typeof provider !== 'string') return res.status(400).json({ error: 'Invalid provider' });
    if (task && typeof task !== 'string') return res.status(400).json({ error: 'Invalid task' });
    
    const result = await callAI(prompt, task, context, provider, false);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/chat/stream', async (req, res) => {
  try {
    const { prompt, task, context, provider = process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama') } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) return res.status(400).json({ error: 'Invalid prompt' });
    if (provider && typeof provider !== 'string') return res.status(400).json({ error: 'Invalid provider' });
    if (task && typeof task !== 'string') return res.status(400).json({ error: 'Invalid task' });
    
    // For simplicity, we just send a non-streamed response chunked if stream fails
    // In production, we parse SSE and pipe it. For Ollama NDJSON we read line by line.
    res.set({ 'Cache-Control': 'no-cache', 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    const result = await callAI(prompt, task, context, provider, false);
    
    const words = result.text.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error(error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

router.post('/quiz', async (req, res) => {
  try {
    const { topic, provider = process.env.GEMINI_API_KEY ? 'gemini' : (process.env.OPENAI_API_KEY ? 'openai' : 'ollama') } = req.body;
    if (!topic || typeof topic !== 'string' || topic.length > 1000) return res.status(400).json({ error: 'Invalid topic' });
    if (provider && typeof provider !== 'string') return res.status(400).json({ error: 'Invalid provider' });

    // Basic sanitization
    const safeTopic = topic.replace(/[^\w\s-]/gi, '').substring(0, 100);

    const prompt = `Generate a 5 question quiz about ${safeTopic}. Output as JSON. { "topic": "${safeTopic}", "questions": [ { "question": "", "options": [], "answer": 0 } ] }`;
    let result;
    try {
      result = await callAI(prompt, 'quiz', {}, provider, false);
    } catch (e) {
      console.warn('AI call failed, falling back to demo', e.message);
      result = { text: '{"topic":"' + safeTopic + '","questions":[{"question":"What is a key concept of ' + safeTopic + '?","options":["Concept A","Concept B","Concept C","Concept D"],"answer":0}]}', provider: 'fallback' };
    }
    
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      const quizData = JSON.parse(jsonMatch ? jsonMatch[0] : result.text);
      res.json({ ...quizData, generated_by: result.provider });
    } catch(e) {
      res.json({ topic: safeTopic, questions: [{ question: `Sample question for ${safeTopic}?`, options: ['A', 'B', 'C', 'D'], answer: 0 }], generated_by: 'fallback' });
    }
  } catch(error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
