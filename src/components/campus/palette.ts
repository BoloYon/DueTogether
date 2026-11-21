import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * B1 campus palette. Extends the coordinator-owned scaffold tokens in
 * `src/constants/theme.ts` with the few accent/status colors the campus
 * screens need. Values are chosen for WCAG AA contrast on the matching
 * background. Proposed for promotion into the shared theme at integration.
 */
const accents = {
  light: {
    accent: '#1F5FD1',
    onAccent: '#FFFFFF',
    accentSoft: '#E3ECFC',
    danger: '#B3261E',
    dangerSoft: '#FCE8E6',
    success: '#1B6E3A',
    successSoft: '#E3F4E8',
    warning: '#8A5300',
    warningSoft: '#FFF1DB',
    live: '#C4271F',
    border: '#D5D7DD',
    bubbleIn: '#F0F0F3',
    bubbleOut: '#1F5FD1',
    onBubbleOut: '#FFFFFF',
  },
  dark: {
    accent: '#8AB4FF',
    onAccent: '#0B1A33',
    accentSoft: '#1B2A45',
    danger: '#FF8A80',
    dangerSoft: '#3A1D1B',
    success: '#7ED69A',
    successSoft: '#163222',
    warning: '#FFC266',
    warningSoft: '#3A2A10',
    live: '#FF6B61',
    border: '#3A3D42',
    bubbleIn: '#2E3135',
    bubbleOut: '#8AB4FF',
    onBubbleOut: '#0B1A33',
  },
} as const;

export type CampusPalette = (typeof Colors)['light'] & (typeof accents)['light'];

export function usePalette(): CampusPalette {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...Colors[scheme], ...accents[scheme] } as CampusPalette;
}
