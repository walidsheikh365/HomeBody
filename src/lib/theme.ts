import type { ThemeId } from '../types';

export const THEMES: { id: ThemeId; name: string; tagline: string; bg: string; swatches: string[] }[] = [
  { id: 'soleil', name: 'Soleil', tagline: 'Golden-hour glass, sunlit apricot and coral', bg: '#FBE7CF', swatches: ['#FBE7CF', '#F4C266', '#EB9C54', '#DC7568'] },
  { id: 'luna', name: 'Luna', tagline: 'Moonlit glass under a starry indigo sky', bg: '#060A18', swatches: ['#060A18', '#F1F4FF', '#B7C6FF', '#C6AAF7'] },
  { id: 'aurora', name: 'Aurora', tagline: 'Liquid glass over northern lights', bg: '#050E12', swatches: ['#050E12', '#6CF0B0', '#3DD6CB', '#A88BF5'] },
];

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
  const bg = THEMES.find((t) => t.id === theme)?.bg ?? '#FBE7CF';
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', bg);
}

/** Chart palettes reference CSS variables so they always follow the active theme. */
export const CHART_VARS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5', '--chart-6', '--chart-7', '--chart-8'].map((v) => `var(${v})`);
