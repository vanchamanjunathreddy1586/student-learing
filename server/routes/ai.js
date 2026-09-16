import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { callAI } from '../services/ai-service.js';
import { getAvailableProviders, getProviderMetadata } from '../provider-registry.js';

const router = express.Router();

function getActiveProviderId() {
  if (process.env.AI_PROVIDER) return process.env.AI_PROVIDER;
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  
  // Do NOT default to ollama in production (Netlify)
  if (process.env.NETLIFY === 'true' || process.env.NODE_ENV === 'production') {
    return null;
  }
  return 'ollama';
}

router.get('/providers', (req, res) => {
  const providers = getAvailableProviders();
  const activeId = getActiveProviderId();
  const activeMeta = activeId ? getProviderMetadata(activeId) : null;
  
  res.json({ 
    providers, 
    active: activeMeta ? activeMeta.name : 'None',
    providerId: activeId
  });
});

router.post('/chat', async (req, res) => {
  try {
    const defaultProvider = getActiveProviderId();
    if (!defaultProvider) {
      console.error("No valid AI provider configured for production.");
      return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'AI Teacher is temporarily unavailable.' });
    }
    
    const { prompt, task, context, provider = defaultProvider } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) return res.status(400).json({ error: 'Invalid prompt' });
    if (provider && typeof provider !== 'string') return res.status(400).json({ error: 'Invalid provider' });
    if (task && typeof task !== 'string') return res.status(400).json({ error: 'Invalid task' });
    
    const result = await callAI(prompt, task, context, provider, false);
    res.json(result);
  } catch (error) {
    console.error("AI Provider Error:", error);
    res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'AI Teacher is temporarily unavailable.' });
  }
});

router.post('/chat/stream', async (req, res) => {
  try {
    const defaultProvider = getActiveProviderId();
    if (!defaultProvider) {
      console.error("No valid AI provider configured for production.");
      res.write(`data: ${JSON.stringify({ error: 'AI_UNAVAILABLE', message: 'AI Teacher is temporarily unavailable.' })}\n\n`);
      return res.end();
    }
    
    const { prompt, task, context, provider = defaultProvider } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 20000) return res.status(400).json({ error: 'Invalid prompt' });
    if (provider && typeof provider !== 'string') return res.status(400).json({ error: 'Invalid provider' });
    if (task && typeof task !== 'string') return res.status(400).json({ error: 'Invalid task' });
    
    res.set({ 'Cache-Control': 'no-cache', 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    const result = await callAI(prompt, task, context, provider, false);
    
    const words = result.text.split(' ');
    for (const word of words) {
      res.write(`data: ${JSON.stringify({ text: word + ' ' })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error("AI Provider Stream Error:", error);
    res.write(`data: ${JSON.stringify({ error: 'AI_UNAVAILABLE', message: 'AI Teacher is temporarily unavailable.' })}\n\n`);
    res.end();
  }
});

router.post('/quiz', async (req, res) => {
  try {
    const defaultProvider = getActiveProviderId();
    if (!defaultProvider) {
      console.error("No valid AI provider configured for production.");
      return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'Quiz generation is temporarily unavailable.' });
    }
    
    const { topic, provider = defaultProvider } = req.body;
    if (!topic || typeof topic !== 'string' || topic.length > 1000) return res.status(400).json({ error: 'Invalid topic' });
    if (provider && typeof provider !== 'string') return res.status(400).json({ error: 'Invalid provider' });

    // Basic sanitization
    const safeTopic = topic.replace(/[^\w\s-]/gi, '').substring(0, 100);

    const prompt = `Generate a 5 question quiz about ${safeTopic}. Output as JSON. { "topic": "${safeTopic}", "questions": [ { "question": "", "options": [], "answer": 0 } ] }`;
    
    const result = await callAI(prompt, 'quiz', {}, provider, false);
    
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      const quizData = JSON.parse(jsonMatch ? jsonMatch[0] : result.text);
      res.json({ ...quizData, generated_by: result.provider });
    } catch(e) {
      console.error("Failed to parse AI quiz response:", e);
      res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'Quiz generation is temporarily unavailable.' });
    }
  } catch(error) {
    console.error("AI Provider Quiz Error:", error);
    res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'Quiz generation is temporarily unavailable.' });
  }
});

export default router;
