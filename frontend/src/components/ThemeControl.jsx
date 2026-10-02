import { useEffect, useState } from 'react';

export default function ThemeControl() {
  const [theme, setTheme] = useState(() => {
    try { const saved = localStorage.getItem('pve-theme'); return ['light', 'dark', 'system'].includes(saved) ? saved : 'system'; } catch { return 'system'; }
  });
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      document.documentElement.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
    };
    apply();
    try { localStorage.setItem('pve-theme', theme); } catch { /* Storage can be unavailable. */ }
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  return <label className="theme-control">
    <span>Thème</span>
    <select aria-label="Thème" value={theme} onChange={e => setTheme(e.target.value)}>
      <option value="system">Système</option>
      <option value="light">Clair</option>
      <option value="dark">Sombre</option>
    </select>
  </label>;
}
