import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

try {
  const request = new XMLHttpRequest();
  request.open('GET', '/api/config', false); // false makes it synchronous
  request.send(null);

  if (request.status === 200) {
    const config = JSON.parse(request.responseText);
    SUPABASE_URL = config.supabaseUrl || '';
    SUPABASE_ANON_KEY = config.supabaseAnonKey || '';
  }
} catch (e) {
  console.error('Failed to load backend config:', e);
}

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export const getAccessToken = () => sessionStorage.getItem('smart_learning_access_token');

if (supabase) {
	supabase.auth.getSession().then(({ data: { session } }) => {
		if (session?.access_token) sessionStorage.setItem('smart_learning_access_token', session.access_token);
	});
	supabase.auth.onAuthStateChange((_event, nextSession) => {
		if (nextSession?.access_token) sessionStorage.setItem('smart_learning_access_token', nextSession.access_token);
		else sessionStorage.removeItem('smart_learning_access_token');
	});
}

const initSignOut = () => {
  document.querySelectorAll('#sign-out-button, .sign-out-button').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (supabase) await supabase.auth.signOut();
      window.location.assign('/login.html');
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSignOut);
} else {
  initSignOut();
}
