import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const root = process.cwd();
const app = express();
const port = Number(process.env.PORT || 5000);
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const usage = {};
const providers = [
  { name: 'Smart Learning demo', model: 'guided-tutor', available: true, capabilities: ['chat', 'explain', 'quiz', 'planner'], speed: 'instant', context_window: '32k' },
];

app.use(cors({ origin: (process.env.CORS_ORIGINS || `http://localhost:${port}`).split(',').map((value) => value.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(`${root}/frontend`));

const demoResponse = ({ task = 'chat', context = {} }) => {
  const topic = context.topic || 'your topic';
  const label = task.replaceAll('_', ' ');
  const text = `Let's work on **${topic}**. I tailored this ${label} response to your current learning path.\n\nStart with the core idea, then test yourself with one small example. When you are ready, ask me to explain it more deeply or turn it into flashcards.`;
  return { text, provider: providers[0].name, model: providers[0].model, tokens: text.split(/\s+/).length, fallback: true };
};

const authenticate = async (request, response, next) => {
  if (!supabase) {
    request.user = null;
    return next();
  }
  const token = request.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (!token) return response.status(401).json({ error: 'Authentication required.' });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return response.status(401).json({ error: 'Authentication required.' });
  request.user = data.user;
  next();
};

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', mode: supabase ? 'supabase' : 'local-demo' });
});

app.get('/api/config', (_request, response) => {
  response.json({ supabaseUrl, supabaseAnonKey: supabaseKey });
});

app.get('/api/auth/me', authenticate, (request, response) => {
  const user = request.user;
  response.json({ user: user ? { id: user.id, email: user.email } : null });
});

app.get('/api/ai/providers', (_request, response) => {
  response.json({ providers, active: providers[0].name });
});

app.get('/api/analytics/summary', (_request, response) => {
  response.json({ weekly_minutes: [35, 48, 42, 61, 55, 72, 48], mastery: 68, streak: 7, sessions: 12, usage });
});

app.post('/api/ai/chat', (request, response) => {
  const prompt = String(request.body?.prompt || '').trim();
  if (!prompt || prompt.length > 6000) return response.status(400).json({ error: 'A prompt between 1 and 6000 characters is required.' });
  const result = demoResponse({ task: String(request.body?.task || 'chat'), context: request.body?.context || {} });
  usage[result.provider] = (usage[result.provider] || 0) + result.tokens;
  response.json(result);
});

app.post('/api/ai/chat/stream', (request, response) => {
  const prompt = String(request.body?.prompt || '').trim();
  if (!prompt || prompt.length > 6000) return response.status(400).json({ error: 'A prompt between 1 and 6000 characters is required.' });
  const result = demoResponse({ task: String(request.body?.task || 'chat'), context: request.body?.context || {} });
  response.set({ 'Cache-Control': 'no-cache', 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
  result.text.split(/\s+/).forEach((word) => response.write(`data: ${JSON.stringify({ text: `${word} ` })}\n\n`));
  response.write('data: [DONE]\n\n');
  response.end();
});

app.post('/api/ai/quiz', (request, response) => {
  const topic = String(request.body?.topic || 'General review').slice(0, 120);
  response.json({ topic, questions: [{ question: `What is the central idea of ${topic}?`, options: ['A core principle', 'A date', 'A tool', 'A formula'], answer: 0 }], generated_by: providers[0].name });
});

app.use((_request, response) => response.sendFile(`${root}/frontend/index.html`));

app.listen(port, '127.0.0.1', () => console.log(`Smart Learning server running at http://localhost:${port}`));
