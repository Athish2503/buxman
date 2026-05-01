import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('reimburse_theme') as Theme;
    return stored || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
    localStorage.setItem('reimburse_theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggle };
}
