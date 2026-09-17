import { supabase, getHeaders } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const materialId = urlParams.get('id');
  
  if (!materialId) {
    window.location.href = '/lessons.html';
    return;
  }

  const canvas = document.getElementById('pdf-canvas');
  const ctx = canvas.getContext('2d');
  const pageNumDisplay = document.getElementById('page-num');
  const pageCountDisplay = document.getElementById('page-count');
  const progressFill = document.getElementById('progress-fill');
  const syncStatus = document.getElementById('sync-status');
  
  let pdfDoc = null;
  let pageNum = 1;
  let pageIsRendering = false;
  let pageNumIsPending = null;
  let scale = 1.5;
  let material = null;
  let syncTimeout = null;
  let currentTextContent = "";

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return window.location.assign('/login.html');

      // Fetch lesson details
      const response = await fetch(`/api/lessons/${materialId}`, { headers: getHeaders() });
      const { success, data } = await response.json();
      
      if (!success) throw new Error('Failed to load lesson metadata');
      material = data;

      document.getElementById('doc-title').textContent = material.title;
      pageNum = material.learning_progress?.current_page || 1;

      // Load PDF
      const loadingTask = pdfjsLib.getDocument(material.file_url);
      pdfDoc = await loadingTask.promise;
      
      pageCountDisplay.textContent = pdfDoc.numPages;
      
      renderPage(pageNum);

    } catch (err) {
      console.error(err);
      alert('Error loading document.');
    }
  };

  const renderPage = (num) => {
    pageIsRendering = true;

    pdfDoc.getPage(num).then((page) => {
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderCtx = {
        canvasContext: ctx,
        viewport: viewport
      };

      page.render(renderCtx).promise.then(() => {
        pageIsRendering = false;
        
        // Extract text for AI Context
        page.getTextContent().then(textContent => {
          currentTextContent = textContent.items.map(item => item.str).join(' ');
        });

        if (pageNumIsPending !== null) {
          renderPage(pageNumIsPending);
          pageNumIsPending = null;
        }
      });

      pageNumDisplay.textContent = num;
      const pct = (num / pdfDoc.numPages) * 100;
      progressFill.style.width = `${pct}%`;
      
      document.getElementById('prev-page').disabled = num <= 1;
      document.getElementById('next-page').disabled = num >= pdfDoc.numPages;

      triggerSync();
    });
  };

  const queueRenderPage = (num) => {
    if (pageIsRendering) {
      pageNumIsPending = num;
    } else {
      renderPage(num);
    }
  };

  const onPrevPage = () => {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
  };

  const onNextPage = () => {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
  };

  document.getElementById('prev-page').addEventListener('click', onPrevPage);
  document.getElementById('next-page').addEventListener('click', onNextPage);

  document.getElementById('zoom-in').addEventListener('click', () => {
    scale += 0.25;
    queueRenderPage(pageNum);
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    if (scale <= 0.5) return;
    scale -= 0.25;
    queueRenderPage(pageNum);
  });

  // Sync Logic
  const triggerSync = () => {
    syncStatus.innerHTML = '<i class="fas fa-sync fa-spin"></i> Saving...';
    clearTimeout(syncTimeout);
    
    syncTimeout = setTimeout(async () => {
      try {
        const pct = (pageNum / pdfDoc.numPages) * 100;
        await fetch(`/api/lessons/${materialId}/progress`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            current_page: pageNum,
            progress_percentage: pct,
            completed: pageNum === pdfDoc.numPages
          })
        });
        syncStatus.innerHTML = '<i class="fas fa-cloud"></i> Saved';
      } catch (err) {
        syncStatus.innerHTML = '<i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> Sync failed';
      }
    }, 1500); // debounce 1.5s
  };

  // AI Panel
  const aiPanel = document.getElementById('ai-panel');
  document.getElementById('toggle-ai').addEventListener('click', () => aiPanel.classList.add('open'));
  document.getElementById('close-ai').addEventListener('click', () => aiPanel.classList.remove('open'));
  
  const aiMessages = document.getElementById('ai-messages');
  const aiInput = document.getElementById('ai-prompt');
  const aiSend = document.getElementById('ai-send');

  const sendToAI = async () => {
    const query = aiInput.value.trim();
    if (!query) return;
    
    aiInput.value = '';
    aiMessages.innerHTML += `<div style="background: var(--bg-primary); padding: 12px; border-radius: 8px; margin-bottom: 12px; margin-left: 24px; font-size: 14px;">${query}</div>`;
    aiMessages.scrollTop = aiMessages.scrollHeight;

    const loadingId = 'ai-load-' + Date.now();
    aiMessages.innerHTML += `<div id="${loadingId}" style="color: var(--text-secondary); font-size: 14px; margin-bottom: 12px;"><i class="fas fa-spinner fa-spin"></i> Thinking...</div>`;
    aiMessages.scrollTop = aiMessages.scrollHeight;

    try {
      const fullPrompt = `Context from Page ${pageNum} of "${material.title}":\n\n${currentTextContent.substring(0, 2000)}\n\nStudent asks: ${query}`;
      
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message: fullPrompt })
      });
      const { success, data, error } = await res.json();

      document.getElementById(loadingId).remove();
      
      if (success && data.reply) {
        aiMessages.innerHTML += `<div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; margin-bottom: 12px; margin-right: 24px; font-size: 14px;">${data.reply.replace(/\n/g, '<br>')}</div>`;
      } else {
        throw new Error(error || 'AI Failed');
      }
    } catch (err) {
      document.getElementById(loadingId)?.remove();
      aiMessages.innerHTML += `<div style="color: var(--danger); font-size: 14px; margin-bottom: 12px;">Failed to connect to AI Teacher.</div>`;
    }
    aiMessages.scrollTop = aiMessages.scrollHeight;
  };

  aiSend.addEventListener('click', sendToAI);
  aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendToAI();
  });

  init();
});
