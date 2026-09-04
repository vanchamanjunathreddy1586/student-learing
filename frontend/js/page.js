const action = document.querySelector('[data-action]');
if (action) action.addEventListener('click', () => { action.textContent = 'Saved'; action.disabled = true; });
