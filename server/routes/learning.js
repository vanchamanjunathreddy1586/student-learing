import { Router } from 'express';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';

export const learningRouter = Router();

const DICTIONARY_BASE = process.env.DICTIONARY_BASE_URL || 'https://api.dictionaryapi.dev';

// Free Dictionary
learningRouter.get('/dictionary/:word', async (req, res) => {
  try {
    const word = req.params.word;
    
    const cacheKey = `word:${word}`;
    const cached = await getCachedResponse('dictionary', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, meta: { cached: true } });
    }

    const url = `${DICTIONARY_BASE}/api/v2/entries/en/${encodeURIComponent(word)}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Word not found in dictionary.' } });
      }
      throw new Error(`Dictionary API error: ${response.statusText}`);
    }

    const data = await response.json();
    await setCachedResponse('dictionary', cacheKey, data, 604800); // Cache for 7 days

    res.json({ success: true, data, meta: { cached: false } });
  } catch (error) {
    console.error('Dictionary API Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The dictionary service is temporarily unavailable.' } });
  }
});

export default learningRouter;
