import { Router } from 'express';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';
import { createClient } from '@supabase/supabase-js';

export const resourcesRouter = Router();

const OPENLIBRARY_BASE = process.env.OPENLIBRARY_BASE_URL || 'https://openlibrary.org';
const GUTENDEX_BASE = process.env.GUTENDEX_BASE_URL || 'https://gutendex.com';

const getSupabaseClient = (req) => {
  return createClient(
    process.env.SUPABASE_URL || '', 
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '', 
    {
      global: {
        headers: {
          Authorization: req.headers.authorization || ''
        }
      }
    }
  );
};

// 1. Open Library Book Search
resourcesRouter.get('/books/search', async (req, res) => {
  try {
    const query = req.query.q;
    const limit = req.query.limit || 20;
    
    if (!query) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Query parameter "q" is required.' } });
    }

    const cacheKey = `search:${query}:${limit}`;
    const cached = await getCachedResponse('openlibrary', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, meta: { cached: true } });
    }

    const url = `${OPENLIBRARY_BASE}/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenLibrary API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Normalize response
    const normalized = data.docs.map(doc => ({
      provider: 'openlibrary',
      external_id: doc.key.replace('/works/', ''),
      title: doc.title,
      author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
      cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      publication_year: doc.first_publish_year,
      resource_url: `${OPENLIBRARY_BASE}${doc.key}`
    }));

    await setCachedResponse('openlibrary', cacheKey, normalized, 86400); // 24 hours

    res.json({ success: true, data: normalized, meta: { total: data.numFound, cached: false } });
  } catch (error) {
    console.error('OpenLibrary Search Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The resource service is temporarily unavailable.' } });
  }
});

// 2. Open Library Book Details
resourcesRouter.get('/books/:id', async (req, res) => {
  try {
    const workId = req.params.id;
    
    const cacheKey = `work:${workId}`;
    const cached = await getCachedResponse('openlibrary', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, meta: { cached: true } });
    }

    const url = `${OPENLIBRARY_BASE}/works/${workId}.json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Book not found.' } });
      }
      throw new Error(`OpenLibrary API error: ${response.statusText}`);
    }

    const data = await response.json();
    await setCachedResponse('openlibrary', cacheKey, data, 86400);

    res.json({ success: true, data, meta: { cached: false } });
  } catch (error) {
    console.error('OpenLibrary Work Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The resource service is temporarily unavailable.' } });
  }
});

// 3. Gutendex Ebook Search
resourcesRouter.get('/ebooks/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Query parameter "q" is required.' } });
    }

    const cacheKey = `search:${query}`;
    const cached = await getCachedResponse('gutendex', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, meta: { cached: true } });
    }

    const url = `${GUTENDEX_BASE}/books?search=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Gutendex API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Normalize response
    const normalized = data.results.map(book => ({
      provider: 'gutendex',
      external_id: book.id.toString(),
      title: book.title,
      author: book.authors.map(a => a.name).join(', '),
      cover_url: book.formats['image/jpeg'] || null,
      resource_url: book.formats['text/html'] || book.formats['application/epub+zip'] || `${GUTENDEX_BASE}/books/${book.id}`
    }));

    await setCachedResponse('gutendex', cacheKey, normalized, 86400);

    res.json({ success: true, data: normalized, meta: { total: data.count, cached: false } });
  } catch (error) {
    console.error('Gutendex Search Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The resource service is temporarily unavailable.' } });
  }
});

// 4. Save Resource
resourcesRouter.post('/save', async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const { provider, external_id, resource_type, title, description, author, cover_url, resource_url, metadata } = req.body;
    if (!provider || !external_id || !resource_type) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields (provider, external_id, resource_type)' } });
    }

    const supabase = getSupabaseClient(req);
    const { data, error } = await supabase.from('learning_resources').insert({
      user_id, // always enforce backend auth ID
      provider,
      external_id,
      resource_type,
      title,
      description,
      author,
      cover_url,
      resource_url,
      metadata: metadata || {}
    }).select().single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ success: false, error: { code: 'CONFLICT', message: 'Resource already saved.' } });
      }
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Save Resource Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to save resource' } });
  }
});

// 5. Get Saved Resources
resourcesRouter.get('/saved', async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const supabase = getSupabaseClient(req);
    const { data, error } = await supabase.from('learning_resources')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Supabase select error: ${error.message}`);

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get Saved Resources Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve saved resources' } });
  }
});

// 6. Delete Saved Resource
resourcesRouter.delete('/saved/:id', async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const resourceId = req.params.id;
    const supabase = getSupabaseClient(req);
    
    // RLS will also protect this, but we explicitly enforce eq('user_id')
    const { error } = await supabase.from('learning_resources')
      .delete()
      .eq('id', resourceId)
      .eq('user_id', user_id);

    if (error) throw new Error(`Supabase delete error: ${error.message}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete Saved Resource Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete resource' } });
  }
});

export default resourcesRouter;
