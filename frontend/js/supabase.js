import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const configResponse = await fetch('/api/config');
const config = await configResponse.json();
const SUPABASE_URL = config.supabaseUrl || '';
const SUPABASE_ANON_KEY = config.supabaseAnonKey || '';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
export const getAccessToken = () => sessionStorage.getItem('smart_learning_access_token');

if (supabase) {
	const { data: { session } } = await supabase.auth.getSession();
	if (session?.access_token) sessionStorage.setItem('smart_learning_access_token', session.access_token);
	supabase.auth.onAuthStateChange((_event, nextSession) => {
		if (nextSession?.access_token) sessionStorage.setItem('smart_learning_access_token', nextSession.access_token);
		else sessionStorage.removeItem('smart_learning_access_token');
	});
}
