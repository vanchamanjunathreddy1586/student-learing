(function () {
  'use strict';

  const STORAGE_KEY = 'smart-learning-theme';
  const VALID_THEMES = ['dark', 'light', 'system'];

  function getStoredTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return VALID_THEMES.includes(value) ? value : 'dark';
    } catch (error) {
      return 'dark';
    }
  }

  function resolveTheme(theme) {
    if (theme === 'system') {
      return window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }

    return theme === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme, persist = true) {
    const selected =
      VALID_THEMES.includes(theme) ? theme : 'dark';

    const resolved = resolveTheme(selected);

    document.documentElement.setAttribute(
      'data-theme',
      resolved
    );

    document.documentElement.setAttribute(
      'data-theme-preference',
      selected
    );

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, selected);
      } catch (error) {
        console.warn('Theme storage unavailable');
      }
    }

    return resolved;
  }

  window.slSetTheme = function (theme) {
    return applyTheme(theme, true);
  };

  window.slGetTheme = function () {
    return (
      document.documentElement.getAttribute(
        'data-theme-preference'
      ) || getStoredTheme()
    );
  };

  window.slInitTheme = function () {
    return applyTheme(getStoredTheme(), false);
  };

  // Apply saved theme immediately
  applyTheme(getStoredTheme(), false);

  // Handle system theme changes
  if (window.matchMedia) {
    const media = window.matchMedia(
      '(prefers-color-scheme: light)'
    );

    const handleChange = function () {
      if (window.slGetTheme() === 'system') {
        applyTheme('system', false);
      }
    };

    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
    } else if (media.addListener) {
      media.addListener(handleChange);
    }
  }

})();
