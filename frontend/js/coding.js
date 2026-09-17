import { getHeaders, showToast } from './app.js';

document.addEventListener('DOMContentLoaded', async () => {
  const languageSelect = document.getElementById('language-select');
  const codeEditor = document.getElementById('code-editor');
  const stdinInput = document.getElementById('stdin-input');
  const runBtn = document.getElementById('run-btn');
  const outputContainer = document.getElementById('output-container');
  const statusText = document.getElementById('status-text');

  // We could fetch dynamic languages here, but hardcoded options work for speed right now.
  // Uncomment below to fetch dynamic languages from Judge0
  /*
  try {
    const langRes = await fetch('/api/code/languages', { headers: getHeaders() });
    const langData = await langRes.json();
    if (langData.success) {
      languageSelect.innerHTML = '';
      langData.data.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        languageSelect.appendChild(opt);
      });
      languageSelect.value = '71'; // Python default
    }
  } catch(e) {
    console.error('Failed to load languages', e);
  }
  */

  runBtn.addEventListener('click', async () => {
    const language_id = parseInt(languageSelect.value);
    const source_code = codeEditor.value;
    const stdin = stdinInput.value;

    if (!source_code.trim()) return showToast('Please enter some code.', 'warning');

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    outputContainer.style.display = 'block';
    outputContainer.innerHTML = 'Compiling and executing...';
    outputContainer.className = 'output-container';
    statusText.textContent = '';

    try {
      const res = await fetch('/api/code/submit', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ language_id, source_code, stdin })
      });

      const data = await res.json();
      
      if (!data.success) throw new Error(data.error?.message || 'Failed to submit code');

      const token = data.data.token;
      
      // Poll for result
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 15) {
          clearInterval(poll);
          outputContainer.innerHTML = 'Execution timed out.';
          outputContainer.className = 'output-container error-output';
          runBtn.disabled = false;
          runBtn.textContent = '▶ Run Code';
          return;
        }

        const statusRes = await fetch(`/api/code/submissions/${token}`, { headers: getHeaders() });
        const statusData = await statusRes.json();
        
        if (statusData.success) {
          const s = statusData.data;
          
          // 1: In Queue, 2: Processing
          if (s.status.id <= 2) {
            statusText.textContent = `Status: ${s.status.description}...`;
            return; // keep polling
          }

          // Finished
          clearInterval(poll);
          
          let outputHtml = '';
          if (s.compile_output) {
            outputHtml += `<div class="error-output">Compile Error:\n${s.compile_output}</div>`;
          }
          if (s.stdout) {
            outputHtml += `<div>${s.stdout}</div>`;
          }
          if (s.stderr) {
            outputHtml += `<div class="error-output">${s.stderr}</div>`;
          }
          
          if (!s.stdout && !s.stderr && !s.compile_output) {
            outputHtml = `<div style="color:var(--dash-muted)">Program finished with exit code ${s.exit_code || 0} (No output)</div>`;
          }

          outputContainer.innerHTML = outputHtml;
          statusText.textContent = `Finished: ${s.status.description} | Time: ${s.time || 0}s | Memory: ${s.memory || 0}KB`;
          
          if (s.status.id !== 3) {
             outputContainer.className = 'output-container error-output';
          }

          runBtn.disabled = false;
          runBtn.textContent = '▶ Run Code';
        }
      }, 1000);

    } catch (err) {
      console.error('Execution error:', err);
      outputContainer.innerHTML = err.message || 'An error occurred.';
      outputContainer.className = 'output-container error-output';
      runBtn.disabled = false;
      runBtn.textContent = '▶ Run Code';
    }
  });
});
