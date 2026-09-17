import { Router } from 'express';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';

export const researchRouter = Router();

const OPENALEX_BASE = process.env.OPENALEX_BASE_URL || 'https://api.openalex.org';
const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO || '';
const ARXIV_BASE = process.env.ARXIV_BASE_URL || 'https://export.arxiv.org/api/query';

// OpenAlex Search
researchRouter.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const limit = req.query.limit || 20;
    
    if (!query) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Query parameter "q" is required.' } });
    }

    const cacheKey = `openalex:search:${query}:${limit}`;
    const cached = await getCachedResponse('openalex', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, meta: { cached: true } });
    }

    let url = `${OPENALEX_BASE}/works?search=${encodeURIComponent(query)}&per-page=${limit}`;
    if (OPENALEX_MAILTO) url += `&mailto=${encodeURIComponent(OPENALEX_MAILTO)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Normalize response
    const normalized = data.results.map(work => ({
      provider: 'openalex',
      external_id: work.id.replace('https://openalex.org/', ''),
      title: work.title,
      publication_year: work.publication_year,
      authors: work.authorships.map(a => a.author.display_name).join(', '),
      doi: work.doi,
      open_access_url: work.open_access?.oa_url,
      landing_url: work.id
    }));

    await setCachedResponse('openalex', cacheKey, normalized, 86400);

    res.json({ success: true, data: normalized, meta: { total: data.meta.count, cached: false } });
  } catch (error) {
    console.error('OpenAlex Search Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The research service is temporarily unavailable.' } });
  }
});

// arXiv Search
researchRouter.get('/arxiv', async (req, res) => {
  try {
    const query = req.query.q;
    const max_results = req.query.max_results || 10;
    
    if (!query) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Query parameter "q" is required.' } });
    }

    const cacheKey = `arxiv:search:${query}:${max_results}`;
    const cached = await getCachedResponse('arxiv', cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, meta: { cached: true } });
    }

    const url = `${ARXIV_BASE}?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${max_results}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.statusText}`);
    }

    const xmlData = await response.text();
    // Extract entries using Regex for a robust lightweight solution without extra npm packages
    const entries = [];
    const entryMatches = xmlData.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    for (const entry of entryMatches) {
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const yearMatch = entry.match(/<published>(\d{4}).*?<\/published>/);
      const pdfMatch = entry.match(/<link title="pdf" href="(.*?)"/);
      
      const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || [];
      const authors = authorMatches.map(a => {
        const m = a.match(/<name>(.*?)<\/name>/);
        return m ? m[1] : '';
      }).join(', ');
      
      if (idMatch && titleMatch) {
        entries.push({
          provider: 'arxiv',
          external_id: idMatch[1].split('/abs/')[1] || idMatch[1],
          title: titleMatch[1].replace(/\s+/g, ' ').trim(),
          abstract: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '',
          publication_year: yearMatch ? parseInt(yearMatch[1]) : null,
          authors,
          landing_url: idMatch[1],
          open_access_url: pdfMatch ? pdfMatch[1] : null
        });
      }
    }

    await setCachedResponse('arxiv', cacheKey, entries, 86400);

    res.json({ success: true, data: entries, meta: { count: entries.length, cached: false } });
  } catch (error) {
    console.error('arXiv Search Error:', error);
    res.status(503).json({ success: false, error: { code: 'RESOURCE_PROVIDER_UNAVAILABLE', message: 'The research service is temporarily unavailable.' } });
  }
});

export default researchRouter;
