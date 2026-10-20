import { useEffect, useState } from 'react';
import { useAppStore } from '../store/AppStore';

export interface ThemeColors {
  text: string;
  muted: string;
  border: string;
  surface: string;
  accent: string;
  accent2: string;
  chart: string[];
}

function read(): ThemeColors {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    text: v('--text'),
    muted: v('--muted'),
    border: v('--border'),
    surface: v('--surface'),
    accent: v('--accent'),
    accent2: v('--accent-2'),
    chart: Array.from({ length: 8 }, (_, i) => v(`--chart-${i + 1}`)),
  };
}

/** Resolved colours of the active theme, for SVG charts. */
export function useThemeColors(): ThemeColors {
  const { data } = useAppStore();
  const [colors, setColors] = useState(read);
  useEffect(() => {
    setColors(read());
  }, [data.settings.theme]);
  return colors;
}
