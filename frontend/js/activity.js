import { supabase } from './supabase.js';

export const ACTIVITY_FIELDS = Object.freeze([
  'study_minutes',
  'lessons_completed',
  'quizzes_completed',
  'questions_solved',
  'notes_created',
  'assignments_completed',
  'ai_questions',
  'xp_earned',
]);

const emptyActivity = (activityDate) => ACTIVITY_FIELDS.reduce((activity, field) => {
  activity[field] = 0;
  return activity;
}, { activity_date: activityDate });

export const getLocalDate = (timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  return `${parts.find((part) => part.type === 'year').value}-${parts.find((part) => part.type === 'month').value}-${parts.find((part) => part.type === 'day').value}`;
};

export const ensureToday = async (activityDate, timezone) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: settings } = await supabase.from('user_settings').select('timezone').maybeSingle();
  const date = activityDate || getLocalDate(settings?.timezone || timezone);
  const { data, error } = await supabase.rpc('ensure_daily_activity', { target_date: date });
  if (error) throw error;
  const { data: activity, error: activityError } = await supabase.from('student_daily_activity').select('*').eq('activity_date', date).single();
  if (activityError) throw activityError;
  return activity || data || emptyActivity(date);
};

export const loadActivity = async ({ from, to } = {}) => {
  if (!supabase) throw new Error('Supabase is not configured.');
  let query = supabase.from('student_daily_activity').select('*').order('activity_date', { ascending: false });
  if (from) query = query.gte('activity_date', from);
  if (to) query = query.lte('activity_date', to);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const incrementActivity = async (activityDate, deltas = {}) => {
  const { data, error } = await supabase.rpc('increment_daily_activity', {
    target_date: activityDate,
    study_minutes_delta: deltas.study_minutes || 0,
    lessons_delta: deltas.lessons_completed || 0,
    quizzes_delta: deltas.quizzes_completed || 0,
    questions_delta: deltas.questions_solved || 0,
    notes_delta: deltas.notes_created || 0,
    assignments_delta: deltas.assignments_completed || 0,
    ai_questions_delta: deltas.ai_questions || 0,
    xp_delta: deltas.xp_earned || 0,
  });
  if (error) throw error;
  return data;
};

export const startStudySession = (activityDate) => supabase.rpc('start_student_study_session', { target_date: activityDate });
export const stopStudySession = () => supabase.rpc('stop_student_study_session');

export const sumActivity = (rows) => ACTIVITY_FIELDS.reduce((totals, field) => {
  totals[field] = rows.reduce((sum, row) => sum + Number(row[field] || 0), 0);
  return totals;
}, {});

export const calculateStreak = (rows) => {
  const activeDates = new Set(rows.filter((row) => ACTIVITY_FIELDS.some((field) => field !== 'xp_earned' && Number(row[field] || 0) > 0)).map((row) => row.activity_date));
  let streak = 0;
  const date = new Date(`${getLocalDate()}T00:00:00`);
  while (activeDates.has(date.toISOString().slice(0, 10))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
};