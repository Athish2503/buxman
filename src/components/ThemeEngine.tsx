import { useEffect } from 'react';
import { settingsService } from '@/lib/settings';
import { hexToHsl } from '@/lib/utils';

export function ThemeEngine() {
  useEffect(() => {
    const applyTheme = () => {
      const settings = settingsService.get();
      const root = document.documentElement;
      
      // Apply Accent Color
      if (settings.accentColor) {
        const { h, s, l } = hexToHsl(settings.accentColor);
        root.style.setProperty('--primary', `${h} ${s}% ${l}%`);
        root.style.setProperty('--ring', `${h} ${s}% ${l}%`);
        
        // Dark/Light specific adjustments could go here if needed
        // For now, we just override the HSL values
      }
      
      // Apply Glass Intensity
      if (settings.glassIntensity !== undefined) {
        const isDark = root.classList.contains('dark');
        const color = isDark ? '222 20% 13%' : '0 0% 100%';
        root.style.setProperty('--glass-bg', `hsl(${color} / ${settings.glassIntensity})`);
      }
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
