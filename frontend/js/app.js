const toast = document.querySelector('#toast');
const showToast = (message) => { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2800); };
const ask = async (prompt, task = 'chat') => {
  const answer = document.querySelector('#answer'); answer.hidden = false; answer.textContent = 'Thinking...';
  try {
    const response = await fetch('/api/ai/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({prompt, task, context:{topic:'Linear Algebra'}}) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed');
    answer.textContent = data.text; showToast(`Answered by ${data.provider}`);
  } catch (error) { answer.textContent = error.message; showToast('The AI gateway needs attention.'); }
};
document.querySelector('#ask-form').addEventListener('submit', (event) => { event.preventDefault(); const prompt = document.querySelector('#prompt').value.trim(); if (prompt) ask(prompt); });
document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => ask(button.dataset.prompt)));
document.querySelector('#focus-btn').addEventListener('click', () => showToast('Focus session started · 25 minutes on the clock'));
document.querySelector('#resume-btn').addEventListener('click', () => showToast('Opening Eigenvalues & vectors'));
document.querySelector('#scan-btn').addEventListener('click', () => showToast('Scan & Learn is ready for your next document'));
document.querySelector('#planner-btn').addEventListener('click', () => ask('Build me a focused study plan for this week', 'planner'));
document.querySelector('#quiz-btn').addEventListener('click', async () => { const response = await fetch('/api/ai/quiz', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:'data structures'})}); const data = await response.json(); showToast(`${data.questions.length} question quiz generated`); });
document.querySelector('.mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
fetch('/api/ai/providers').then((response) => response.json()).then((data) => { document.querySelector('#provider-status').textContent = `AI GATEWAY · ${data.active.toUpperCase()} ACTIVE`; }).catch(() => { document.querySelector('#provider-status').textContent = 'AI GATEWAY · OFFLINE'; });
