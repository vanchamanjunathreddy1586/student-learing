import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabaseCacheClient = null;

if (supabaseUrl && serviceRoleKey) {
  // Only initialize the cache client if the service role key is available
  // It should NOT fall back to ANON or PUBLISHABLE keys to ensure security.
  supabaseCacheClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is missing. API caching is disabled.");
}

export const getCachedResponse = async (provider, cacheKey) => {
  if (!supabaseCacheClient) return null;
  try {
    const { data, error } = await supabaseCacheClient
      .from('api_cache')
      .select('id, response, expires_at') // Added 'id' here
      .eq('provider', provider)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;
    
    // Check if expired
    if (new Date(data.expires_at) < new Date()) {
      // Delete expired entry using the id we selected
      supabaseCacheClient.from('api_cache').delete().eq('id', data.id).then(() => {}).catch(console.error);
      return null;
    }
    
    return data.response;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
};

export const setCachedResponse = async (provider, cacheKey, response, ttlSeconds = 3600) => {
  if (!supabaseCacheClient) return;
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    
    const { error } = await supabaseCacheClient.from('api_cache').upsert({
      provider,
      cache_key: cacheKey,
      response,
      expires_at: expiresAt
    }, { onConflict: 'provider,cache_key' }); // Removed space after comma

    if (error) {
      console.error('Supabase Cache Write Error:', error);
    }
  } catch (e) {
    console.error('Cache write exception:', e);
  }
};
