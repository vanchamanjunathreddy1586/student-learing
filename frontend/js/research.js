import { getHeaders, showToast } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-query');
  const results = document.getElementById('results');
  const loading = document.getElementById('loading');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;

      results.innerHTML = '';
      loading.style.display = 'block';

      try {
        // Fetch from both OpenAlex and arXiv simultaneously
        const [openAlexRes, arxivRes] = await Promise.all([
          fetch(`/api/research/search?q=${encodeURIComponent(query)}&limit=10`, { headers: getHeaders() }),
          fetch(`/api/research/arxiv?q=${encodeURIComponent(query)}&max_results=10`, { headers: getHeaders() })
        ]);

        loading.style.display = 'none';

        const openAlexData = await openAlexRes.json();
        const arxivData = await arxivRes.json();

        let combined = [];
        if (openAlexData.success && Array.isArray(openAlexData.data)) {
          combined = combined.concat(openAlexData.data);
        }
        if (arxivData.success && Array.isArray(arxivData.data)) {
          combined = combined.concat(arxivData.data);
        }

        if (combined.length === 0) {
          results.innerHTML = '<p class="muted">No results found.</p>';
          return;
        }

        combined.forEach(paper => {
          const el = document.createElement('article');
          el.className = 'paper-card';
          el.innerHTML = `
            <h3>${paper.title || 'Untitled'}</h3>
            <div class="paper-meta">${paper.authors || 'Unknown Authors'} • ${paper.publication_year || 'Unknown Year'} • ${paper.provider === 'arxiv' ? 'arXiv' : 'OpenAlex'}</div>
            ${paper.abstract ? `<p>${paper.abstract}</p>` : ''}
            <div class="paper-actions">
              ${paper.open_access_url ? `<a href="${paper.open_access_url}" target="_blank" class="primary-btn" style="flex:1;text-align:center;text-decoration:none;">Read PDF</a>` : ''}
              ${paper.landing_url ? `<a href="${paper.landing_url}" target="_blank" class="secondary-btn" style="flex:1;text-align:center;text-decoration:none;">View Source</a>` : ''}
            </div>
          `;
          results.appendChild(el);
        });

      } catch (err) {
        console.error('Research fetch error:', err);
        loading.style.display = 'none';
        showToast('Failed to fetch research papers.', 'error');
      }
    });
  }
});
