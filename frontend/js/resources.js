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
        // Fetch from Open Library and Gutendex
        const [booksRes, ebooksRes] = await Promise.all([
          fetch(`/api/resources/books/search?q=${encodeURIComponent(query)}&limit=8`, { headers: getHeaders() }),
          fetch(`/api/resources/ebooks/search?q=${encodeURIComponent(query)}`, { headers: getHeaders() })
        ]);

        loading.style.display = 'none';

        const booksData = await booksRes.json();
        const ebooksData = await ebooksRes.json();

        let combined = [];
        if (booksData.success && Array.isArray(booksData.data)) {
          combined = combined.concat(booksData.data);
        }
        
        // Take a few from ebooks if available
        if (ebooksData.success && Array.isArray(ebooksData.data)) {
          combined = combined.concat(ebooksData.data.slice(0, 8));
        }

        if (combined.length === 0) {
          results.innerHTML = '<p class="muted">No results found.</p>';
          return;
        }

        // Shuffle or sort if desired, for now just render
        combined.forEach(book => {
          const el = document.createElement('article');
          el.className = 'resource-card';
          
          const coverUrl = book.cover_url || '/images/book-placeholder.png'; // Make sure there's a fallback
          
          el.innerHTML = `
            ${book.cover_url ? `<img src="${book.cover_url}" alt="${book.title}" loading="lazy">` : `<div style="height:250px;width:100%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;border-radius:8px;margin-bottom:15px;color:var(--dash-muted);">No Cover</div>`}
            <h3>${book.title || 'Untitled'}</h3>
            <div class="resource-meta">${book.author || 'Unknown Author'} • ${book.publication_year || 'Unknown Year'}</div>
            <div class="resource-actions">
              ${book.resource_url ? `<a href="${book.resource_url}" target="_blank" class="primary-btn" style="text-decoration:none;">View Resource</a>` : ''}
            </div>
          `;
          results.appendChild(el);
        });

      } catch (err) {
        console.error('Resources fetch error:', err);
        loading.style.display = 'none';
        showToast('Failed to fetch resources.', 'error');
      }
    });
  }
});
