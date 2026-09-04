import { getAccessToken, supabase } from './supabase.js';

export const authHeaders = () => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const signOut = async () => {
  if (supabase) await supabase.auth.signOut();
  sessionStorage.removeItem('smart_learning_access_token');
  window.location.assign('/login.html');
};

export const signIn = (email, password) => {
  if (!supabase) throw new Error('Supabase is not configured. Add credentials to .env.');
  return supabase.auth.signInWithPassword({ email, password });
};

export const signUp = (email, password, displayName) => {
  if (!supabase) throw new Error('Supabase is not configured. Add credentials to .env.');
  return supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
};
