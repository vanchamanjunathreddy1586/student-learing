import { supabase } from './supabase.js';
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!supabase) throw new Error('Supabase not initialized');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      window.location.href = '/login.html';
      return;
    }

    const container = document.getElementById('mynetwork');
    const loading = document.getElementById('graph-loading');
    const previewModal = document.getElementById('note-preview-modal');
    const closePreviewBtn = document.getElementById('close-preview-modal');
    const openNoteBtn = document.getElementById('open-note-btn');
    
    let currentPreviewId = null;

    // Fetch Graph Data
    const token = session.access_token;
    const res = await fetch('/api/knowledge/graph/data', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!res.ok) throw new Error('Failed to fetch graph data');
    const { notes, links } = await res.json();
    
    // Transform data for Vis.js
    const nodes = new vis.DataSet(
      notes.map(n => ({
        id: n.id,
        label: n.title || 'Untitled',
        title: n.title, // tooltip
        shape: 'dot',
        size: 15,
        color: {
          background: '#8b5cf6', // var(--t-primary)
          border: '#6d28d9',
          highlight: { background: '#a78bfa', border: '#7c3aed' }
        },
        font: { color: document.body.classList.contains('dark-theme') ? '#e2e8f0' : '#1e293b' }
      }))
    );
    
    const edges = new vis.DataSet(
      links.map(l => ({
        from: l.source_note_id,
        to: l.target_note_id,
        arrows: 'to',
        color: { color: 'rgba(139, 92, 246, 0.4)' },
        smooth: { type: 'continuous' }
      }))
    );
    
    const data = { nodes, edges };
    const options = {
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -50,
          centralGravity: 0.01,
          springLength: 100,
          springConstant: 0.08
        },
        maxVelocity: 50,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true
      }
    };
    
    // Render Graph
    const network = new vis.Network(container, data, options);
    
    network.once('stabilizationIterationsDone', function() {
      loading.style.display = 'none';
      network.fit();
    });
    
    // Interaction
    network.on('click', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const note = notes.find(n => n.id === nodeId);
        if (note) {
          showPreview(note, links);
        }
      } else {
        previewModal.classList.add('hidden');
      }
    });

    function showPreview(note, allLinks) {
      currentPreviewId = note.id;
      document.getElementById('preview-title').textContent = note.title || 'Untitled';
      
      const outgoing = allLinks.filter(l => l.source_note_id === note.id).length;
      const incoming = allLinks.filter(l => l.target_note_id === note.id).length;
      
      document.getElementById('preview-links').textContent = outgoing;
      document.getElementById('preview-backlinks').textContent = incoming;
      
      previewModal.classList.remove('hidden');
    }
    
    closePreviewBtn.addEventListener('click', () => {
      previewModal.classList.add('hidden');
    });
    
    openNoteBtn.addEventListener('click', () => {
      if (currentPreviewId) {
        // We will pass the ID via local storage or query param to open it in vault
        // Since the vault auto-loads the first note, we could extend loadNotes to accept an ID.
        // For now, redirect to knowledge.html and they can select it.
        // Better: store in sessionStorage.
        sessionStorage.setItem('kv_open_note', currentPreviewId);
        window.location.href = '/knowledge.html';
      }
    });
    
    // Wait fallback for stabilization
    setTimeout(() => {
      loading.style.display = 'none';
    }, 4000);

  } catch (err) {
    console.error('Fatal Knowledge Graph Error:', err);
    document.getElementById('graph-loading').innerHTML = `
      <div style="color:red; text-align:center; padding: 20px;">
        <h3>Error loading graph</h3>
        <p>${err.message}</p>
      </div>
    `;
  }
});
