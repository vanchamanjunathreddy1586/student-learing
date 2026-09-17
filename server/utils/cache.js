import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export const getCachedResponse = async (provider, cacheKey) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('api_cache')
      .select('response, expires_at')
      .eq('provider', provider)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Background delete expired
      supabase.from('api_cache').delete().eq('id', data.id).then(() => {});
      return null;
    }
    
    return data.response;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
};

export const setCachedResponse = async (provider, cacheKey, response, ttlSeconds = 3600) => {
  if (!supabase) return;
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    await supabase.from('api_cache').upsert({
      provider,
      cache_key: cacheKey,
      response,
      expires_at: expiresAt
    }, { onConflict: 'provider, cache_key' });
  } catch (e) {
    console.error('Cache write error:', e);
  }
};
