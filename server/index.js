import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import aiRouter from './routes/ai.js';
import classroomRouter from './routes/classroom.js';
import studyRouter from './routes/study.js';
import groupsRouter from './routes/groups.js';
import adminRouter from './routes/admin.js';
import ownerRouter from './routes/owner.js';
import diaryRouter from './routes/diary.js';

const root = process.cwd();
const app = express();
const port = Number(process.env.PORT || 5000);
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

app.use(cors({ origin: (process.env.CORS_ORIGINS || `http://localhost:${port}`).split(',').map((value) => value.trim()) }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(`${root}/frontend`));

export const authenticate = async (request, response, next) => {
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

app.use('/api/ai', authenticate, aiRouter);
app.use('/api/classroom', authenticate, classroomRouter);
app.use('/api/study', authenticate, studyRouter);
app.use('/api/analytics', authenticate, studyRouter); // Map analytics to study router for summary
app.use('/api/groups', authenticate, groupsRouter);
app.use('/api/admin', authenticate, adminRouter);
app.use('/api/owner', authenticate, ownerRouter);
app.use('/api/diary', authenticate, diaryRouter);

// Removed the sendFile fallback because Vercel vercel.json handles frontend routing natively
// and Lambda file systems do not always include static files.

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, '127.0.0.1', () => console.log(`Smart Learning server running at http://localhost:${port}`));
}

export default app;
