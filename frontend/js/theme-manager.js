// Global Theme Manager (Lightweight)
// Runs synchronously in the <head> to prevent FOUC (Flash of Unstyled Content)

(function() {
  const STORAGE_KEY = 'smart-learning-theme';

  window.slGetTheme = () => {
    return localStorage.getItem(STORAGE_KEY) || 'system';
  };

  window.slInitTheme = () => {
    const savedTheme = window.slGetTheme();
    window.slSetTheme(savedTheme, true); // true = init phase, don't re-save if not needed
    
    // Setup listener for OS changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (window.slGetTheme() === 'system') {
        window.slSetTheme('system', true);
      }
    });
  };

  window.slSetTheme = (theme, isInit = false) => {
    // 1. Store locally if it's an explicit user action
    if (!isInit) {
      localStorage.setItem(STORAGE_KEY, theme);
    }

    // 2. Apply theme logic
    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    } else {
      document.documentElement.dataset.theme = theme;
    }
  };

  // Run initialization immediately!
  window.slInitTheme();
})();
