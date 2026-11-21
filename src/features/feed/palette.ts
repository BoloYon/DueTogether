import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Lane-local extension of the shared scaffold colors. The base five tokens
 * come from src/constants/theme.ts. The extra accent/status tokens below are
 * proposed for the shared theme in feed/HANDOFF.md. Every text/background pair
 * keeps WCAG AA contrast in both schemes.
 */
const extra = {
  light: {
    accent: '#1f5fd6',
    accentText: '#ffffff',
    accentSoft: '#e3ecfc',
    live: '#c8261e',
    liveSoft: '#fde6e4',
    border: '#d5d7de',
    warning: '#8a5300',
    warningSoft: '#fdf0da',
    success: '#1d7a3a',
    successSoft: '#dff3e6',
    card: '#ffffff',
    page: '#f4f5f8',
    graphBg: '#f8f9fc',
    graphLink: '#9aa0ad',
  },
  dark: {
    accent: '#6ea2ff',
    accentText: '#081a3a',
    accentSoft: '#1b2a45',
    live: '#ff6b61',
    liveSoft: '#3d1614',
    border: '#3a3d44',
    warning: '#ffbf5e',
    warningSoft: '#3a2a10',
    success: '#5fd68a',
    successSoft: '#123222',
    card: '#17181b',
    page: '#0b0b0d',
    graphBg: '#111216',
    graphLink: '#6b7180',
  },
} as const;

export type Palette = (typeof Colors)['light'] & (typeof extra)['light'];

export function usePalette(): Palette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...Colors[scheme], ...extra[scheme] } as Palette;
}

export { clusterHues, hueFor } from './hues';
