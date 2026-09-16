import { supabase } from './supabase.js';

export const defaultSettings = {
  theme: 'dark',
  accent_color: '#62e6e2',
  ui_density: 'comfortable',
  animations_enabled: true,
  effects_3d_enabled: true,
  reduced_motion: false,
  notifications: { push: true, email: true, assignments: true, quizzes: true, study: true, ai: true },
  learning_preferences: { study_goal: 45, reminder_time: '18:00', difficulty: 'balanced', default_mode: 'guided' },
  ai_preferences: {
    default_provider: 'demo',
    default_model: 'guided-tutor',
    temperature: 0.7,
    token_limit: 2048,
    response_style: 'concise',
    language: 'en',
    system_prompt: 'You are a patient, precise learning companion.',
  },
  enabled_tools: ['ai-teacher', 'supabase-storage'],
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings,
  notifications: { ...defaultSettings.notifications, ...(settings.notifications || {}) },
  learning_preferences: { ...defaultSettings.learning_preferences, ...(settings.learning_preferences || {}) },
  ai_preferences: { ...defaultSettings.ai_preferences, ...(settings.ai_preferences || {}) },
});

export const loadSettings = async (userId) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return mergeSettings(data || { user_id: userId });
};

export const saveSettings = async (userId, settings) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const payload = { ...mergeSettings(settings), user_id: userId, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('user_settings').upsert(payload, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
};

export const loadStudentProfile = async (userId) => {
  const { data, error } = await supabase.from('student_profiles').select('full_name,email,year,college,profile_completed').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
};

export const saveStudentProfile = async (userId, profile) => {
  const { data, error } = await supabase.from('student_profiles').upsert({ ...profile, user_id: userId, profile_completed: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }).select().single();
  if (error) throw error;
  return data;
};