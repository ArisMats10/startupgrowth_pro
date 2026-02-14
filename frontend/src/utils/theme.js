export const THEME_STORAGE_KEY = 'sgp-theme';

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
}

export function getStoredTheme() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage?.getItem(THEME_STORAGE_KEY);
    if (value === 'dark' || value === 'light') return value;
    return null;
  } catch {
    return null;
  }
}

export function getInitialTheme() {
  return getStoredTheme() || getSystemTheme();
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const isDark = theme === 'dark';
  root.classList.toggle('dark', isDark);
}

export function setTheme(theme) {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }
  applyTheme(theme);
}

export function toggleTheme() {
  const next = (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) ? 'light' : 'dark';
  setTheme(next);
  return next;
}
