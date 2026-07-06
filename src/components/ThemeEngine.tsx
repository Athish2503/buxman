import { useEffect } from 'react';
import { settingsService } from '@/lib/settings';
import { hexToHsl } from '@/lib/utils';

export function ThemeEngine() {
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const settings = settingsService.get();
      
      // Apply Accent Color
      if (settings.accentColor) {
        const { h, s, l } = hexToHsl(settings.accentColor);
        root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
        root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
        root.style.setProperty('--primary-hover', `${h} ${s}% ${Math.max(0, l - 8)}%`);
        root.style.setProperty('--primary-light', `${h} ${s}% ${Math.min(100, l + 35)}%`);
      } else {
        root.style.removeProperty('--primary');
        root.style.removeProperty('--ring');
        root.style.removeProperty('--primary-hover');
        root.style.removeProperty('--primary-light');
      }
      
      // Clean up dynamic glass values
      root.style.removeProperty('--glass-bg');
    };

    applyTheme();

    // Watch for settings changes
    const observer = new MutationObserver((mutations) => {
      // This is a bit hacky, better would be a shared state/event
      // But for local-first we can listen to localStorage or custom events
    });
    
    // Use a custom event instead
    window.addEventListener('settings-updated', applyTheme);
    
    // Also re-apply when theme (dark/light) changes
    const themeObserver = new MutationObserver(() => applyTheme());
    themeObserver.observe(root, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('settings-updated', applyTheme);
      themeObserver.disconnect();
    };
  }, []);

  return null; // Side-effect only component
}
