document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login.html';
      return;
    }

    const user = session.user;
    let notes = [];
    let currentNoteId = null;
    let autoSaveTimer = null;
    let isEditing = false;

    // DOM Elements
    const notesList = document.getElementById('kv-notes-list');
    const searchInput = document.getElementById('kv-search');
    const newNoteBtn = document.getElementById('new-note-btn');
    const titleInput = document.getElementById('note-title');
    const contentEditor = document.getElementById('note-content');
    const saveStatus = document.getElementById('note-save-status');
    const deleteBtn = document.getElementById('delete-note-btn');
    const backlinksList = document.getElementById('backlinks-list');
    const aiAssistantBtn = document.getElementById('ai-assistant-btn');
    const linkSuggestions = document.getElementById('link-suggestions');
    const generateFlashcardsBtn = document.getElementById('generate-flashcards-btn');
    const flashcardsPreview = document.getElementById('flashcards-preview');

    // Init
    await loadNotes();
    if (notes.length > 0) {
      loadNote(notes[0].id);
    } else {
      startNewNote();
    }

    // --- API ---
    const getHeaders = async () => ({
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      'Content-Type': 'application/json'
    });

    async function loadNotes(query = '') {
      try {
        const res = await fetch(`/api/knowledge?search=${encodeURIComponent(query)}`, { headers: await getHeaders() });
        if (!res.ok) throw new Error('Failed to load notes');
        notes = await res.json();
        renderNotesList();
      } catch (err) {
        notesList.innerHTML = `<li class="muted" style="color:red">Error: ${err.message}</li>`;
      }
    }

    async function fetchNoteDetails(id) {
      try {
        const res = await fetch(`/api/knowledge/${id}`, { headers: await getHeaders() });
        if (!res.ok) throw new Error('Failed to fetch note');
        return await res.json();
      } catch (e) {
        showToast('Error loading note details', 'error');
        return null;
      }
    }

    // --- Rendering ---
    function renderNotesList() {
      if (notes.length === 0) {
        notesList.innerHTML = '<li class="muted">No notes found.</li>';
        return;
      }
      notesList.innerHTML = notes.map(n => `
        <li class="${n.id === currentNoteId ? 'active' : ''}" data-id="${n.id}">
          <i class="bi bi-file-earmark-text"></i> ${escapeHtml(n.title || 'Untitled Note')}
        </li>
      `).join('');

      notesList.querySelectorAll('li[data-id]').forEach(li => {
        li.addEventListener('click', () => loadNote(li.dataset.id));
      });
    }

    function renderBacklinks(backlinks) {
      if (!backlinks || backlinks.length === 0) {
        backlinksList.innerHTML = '<li class="muted">No backlinks yet.</li>';
        return;
      }
      backlinksList.innerHTML = backlinks.map(b => `
        <li data-id="${b.id}">
          ${escapeHtml(b.title || 'Untitled')}
        </li>
      `).join('');
      backlinksList.querySelectorAll('li[data-id]').forEach(li => {
        li.addEventListener('click', () => loadNote(li.dataset.id));
      });
    }

    // --- Editor logic ---
    async function loadNote(id) {
      const note = await fetchNoteDetails(id);
      if (!note) return;

      currentNoteId = note.id;
      isEditing = false;
      titleInput.value = note.title || '';
      
      // Parse content to render interactive links
      contentEditor.innerHTML = parseLinksForRender(note.content || '');
      
      saveStatus.textContent = 'Saved';
      saveStatus.className = 'save-status saved';
      
      renderNotesList(); // update active state
      renderBacklinks(note.backlinks);
      bindContentLinks();
      
      setTimeout(() => isEditing = true, 500); // Allow input events after load
    }

    function startNewNote() {
      currentNoteId = null;
      titleInput.value = '';
      contentEditor.innerHTML = '';
      saveStatus.textContent = 'Unsaved';
      saveStatus.className = 'save-status';
      backlinksList.innerHTML = '<li class="muted">Save note to see links.</li>';
      renderNotesList();
      isEditing = true;
    }

    async function saveNote() {
      if (!isEditing) return;
      const title = titleInput.value.trim();
      const rawContent = contentEditor.innerHTML;
      
      // Extract target IDs from links to send to API
      const targetIds = extractLinkIds(rawContent);

      const payload = { title, content: rawContent };

      try {
        let res;
        if (currentNoteId) {
          res = await fetch(`/api/knowledge/${currentNoteId}`, { method: 'PATCH', headers: await getHeaders(), body: JSON.stringify(payload) });
        } else {
          res = await fetch(`/api/knowledge`, { method: 'POST', headers: await getHeaders(), body: JSON.stringify(payload) });
        }
        
        if (!res.ok) throw new Error('Failed to save');
        const savedData = await res.json();
        
        if (!currentNoteId) {
          currentNoteId = savedData.id;
          notes.unshift(savedData);
        } else {
          const idx = notes.findIndex(e => e.id === currentNoteId);
          if (idx !== -1) notes[idx] = savedData;
        }
        
        // Sync links
        await fetch(`/api/knowledge/${currentNoteId}/links`, {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ targetIds })
        });
        
        saveStatus.textContent = 'Saved';
        saveStatus.className = 'save-status saved';
        renderNotesList();
      } catch (e) {
        saveStatus.textContent = 'Offline (Draft saved)';
        saveStatus.className = 'save-status';
      }
    }

    function triggerAutoSave() {
      if (!isEditing) return;
      saveStatus.textContent = 'Saving...';
      saveStatus.className = 'save-status saving';
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(saveNote, 1000);
      handleLinkTyping();
    }

    titleInput.addEventListener('input', triggerAutoSave);
    contentEditor.addEventListener('input', triggerAutoSave);

    newNoteBtn.addEventListener('click', startNewNote);

    deleteBtn.addEventListener('click', async () => {
      if (!currentNoteId) return;
      if (!confirm('Are you sure you want to delete this note?')) return;
      
      try {
        const res = await fetch(`/api/knowledge/${currentNoteId}`, { method: 'DELETE', headers: await getHeaders() });
        if (res.ok) {
          showToast('Note deleted');
          notes = notes.filter(n => n.id !== currentNoteId);
          if (notes.length > 0) loadNote(notes[0].id);
          else startNewNote();
        }
      } catch (e) {
        showToast('Failed to delete note', 'error');
      }
    });

    searchInput.addEventListener('input', (e) => {
      loadNotes(e.target.value);
    });

    // --- Toolbar ---
    document.querySelectorAll('.tool-btn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;
        document.execCommand(cmd, false, val);
        contentEditor.focus();
        triggerAutoSave();
      });
    });

    // --- Linking Logic ---
    let searchRange = null;

    function handleLinkTyping() {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      const text = range.startContainer.textContent || '';
      const offset = range.startOffset;
      
      const beforeCursor = text.substring(0, offset);
      const match = beforeCursor.match(/\[\[([^\]]*)$/);
      
      if (match) {
        const query = match[1].toLowerCase();
        showLinkSuggestions(query, range);
      } else {
        linkSuggestions.classList.add('hidden');
      }
    }

    function showLinkSuggestions(query, range) {
      searchRange = range.cloneRange(); // Save where to insert
      searchRange.setStart(range.startContainer, range.startOffset - (query.length + 2)); // include [[
      
      const filtered = notes.filter(n => n.id !== currentNoteId && n.title?.toLowerCase().includes(query));
      if (filtered.length === 0) {
        linkSuggestions.innerHTML = '<div class="suggestion-item muted">No notes found</div>';
      } else {
        linkSuggestions.innerHTML = filtered.map(n => `
          <div class="suggestion-item" data-id="${n.id}" data-title="${escapeHtml(n.title)}">
            <i class="bi bi-file-earmark"></i> ${escapeHtml(n.title)}
          </div>
        `).join('');
        
        linkSuggestions.querySelectorAll('.suggestion-item[data-id]').forEach(item => {
          item.addEventListener('click', () => {
            insertLink(item.dataset.id, item.dataset.title);
          });
        });
      }
      
      // Position dropdown near cursor
      const rect = range.getBoundingClientRect();
      const editorRect = contentEditor.getBoundingClientRect();
      linkSuggestions.style.left = `${rect.left - editorRect.left}px`;
      linkSuggestions.style.top = `${rect.bottom - editorRect.top + 5}px`;
      linkSuggestions.classList.remove('hidden');
    }

    function insertLink(id, title) {
      if (!searchRange) return;
      
      const linkHTML = `<span class="note-link" contenteditable="false" data-id="${id}">[[${escapeHtml(title)}]]</span>&nbsp;`;
      
      searchRange.deleteContents();
      const el = document.createElement('span');
      el.innerHTML = linkHTML;
      
      const frag = document.createDocumentFragment();
      let node, lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      searchRange.insertNode(frag);
      
      linkSuggestions.classList.add('hidden');
      searchRange = null;
      bindContentLinks();
      triggerAutoSave();
    }

    function bindContentLinks() {
      contentEditor.querySelectorAll('.note-link').forEach(link => {
        link.onclick = (e) => {
          e.preventDefault();
          loadNote(link.dataset.id);
        };
      });
    }

    function parseLinksForRender(html) {
      // Just ensure they are clickable. The span data-id is saved in HTML.
      return html;
    }

    function extractLinkIds(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const links = doc.querySelectorAll('.note-link[data-id]');
      const ids = Array.from(links).map(l => l.dataset.id);
      return [...new Set(ids)]; // unique
    }

    // Insert Link Button
    document.getElementById('insert-link-btn').addEventListener('click', () => {
      document.execCommand('insertText', false, '[[');
      contentEditor.focus();
      handleLinkTyping();
    });

    // --- AI Assistant ---
    const aiModal = document.getElementById('ai-note-modal');
    const aiResponse = document.getElementById('ai-note-response');
    
    aiAssistantBtn.addEventListener('click', () => {
      aiModal.classList.remove('hidden');
      aiResponse.classList.add('hidden');
      aiResponse.innerHTML = '';
    });
    
    document.getElementById('close-ai-modal').addEventListener('click', () => {
      aiModal.classList.add('hidden');
    });

    document.querySelectorAll('.ai-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        const text = titleInput.value + '\n\n' + contentEditor.innerText;
        
        aiResponse.classList.remove('hidden');
        aiResponse.innerHTML = '<p class="muted"><i class="bi bi-magic"></i> Thinking...</p>';
        
        let prompt = '';
        if (action === 'summarize') prompt = `Summarize this note:\n\n${text}`;
        if (action === 'explain') prompt = `Explain the concepts in this note simply, as if to a beginner:\n\n${text}`;
        if (action === 'questions') prompt = `Generate 3 reflection or test questions based on this note:\n\n${text}`;
        if (action === 'mcqs') prompt = `Create 3 multiple choice questions from this note. Format clearly.\n\n${text}`;

        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: await getHeaders(),
            body: JSON.stringify({ message: prompt })
          });
          const data = await res.json();
          aiResponse.innerHTML = formatMarkdown(data.reply);
        } catch (e) {
          aiResponse.innerHTML = '<p style="color:red">Failed to reach AI.</p>';
        }
      });
    });

    // --- AI Flashcards ---
    generateFlashcardsBtn.addEventListener('click', async () => {
      if (!currentNoteId) return;
      generateFlashcardsBtn.disabled = true;
      generateFlashcardsBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
      
      const text = titleInput.value + '\n\n' + contentEditor.innerText;
      const prompt = `Create 3 flashcards from this text. Respond ONLY with a JSON array of objects, where each object has "question" and "answer" string properties.\n\nText: ${text}`;
      
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: await getHeaders(),
          body: JSON.stringify({ message: prompt })
        });
        const data = await res.json();
        
        // Very basic parsing attempt
        const jsonMatch = data.reply.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const cards = JSON.parse(jsonMatch[0]);
          flashcardsPreview.innerHTML = cards.map(c => `
            <div style="border:1px solid var(--t-border); padding:8px; margin-top:8px; border-radius:4px;">
              <strong>Q:</strong> ${escapeHtml(c.question)}<br>
              <strong style="color:var(--t-primary)">A:</strong> ${escapeHtml(c.answer)}
            </div>
          `).join('');
        } else {
          flashcardsPreview.innerHTML = '<p class="muted">Could not parse AI response into flashcards.</p>';
        }
      } catch (e) {
        flashcardsPreview.innerHTML = '<p style="color:red">Error generating flashcards.</p>';
      } finally {
        generateFlashcardsBtn.disabled = false;
        generateFlashcardsBtn.innerHTML = '<i class="bi bi-magic"></i> Generate Flashcards';
      }
    });

    function escapeHtml(unsafe) {
      if (!unsafe) return '';
      return (unsafe || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatMarkdown(text) {
      if (!text) return '';
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    }
    
    // Close link suggestions on click outside
    document.addEventListener('click', (e) => {
      if (!linkSuggestions.contains(e.target) && e.target !== contentEditor) {
        linkSuggestions.classList.add('hidden');
      }
    });

  } catch (err) {
    console.error('Fatal Knowledge Vault Error:', err);
    document.body.innerHTML = `<div style="padding: 40px; text-align: center; color: red;">
      <h2>Fatal Error</h2>
      <p>${err.message}</p>
    </div>`;
  }
});
