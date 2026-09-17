import { Router } from 'express';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';

export const resourcesRouter = Router();

const OPENLIBRARY_BASE = process.env.OPENLIBRARY_BASE_URL || 'https://openlibrary.org';
const GUTENDEX_BASE = process.env.GUTENDEX_BASE_URL || 'https://gutendex.com';

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

export default resourcesRouter;
