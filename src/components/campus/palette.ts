import type { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const palette = {
  light: {
    text: '#251D35',
    background: '#F7F3FA',
    backgroundElement: '#EEE6F3',
    backgroundSelected: '#E2D3EE',
    textSecondary: '#5F526F',
    accent: '#623595',
    onAccent: '#FFFFFF',
    accentSoft: '#ECDCFA',
    danger: '#B3261E',
    onDanger: '#FFFFFF',
    dangerSoft: '#FCE8E6',
    success: '#176347',
    successSoft: '#DAF3E7',
    warning: '#805000',
    warningSoft: '#FFF0D5',
    live: '#B3261E',
    border: '#CFC0DB',
    card: '#FFFCFF',
  },
  dark: {
    text: '#F6EFFC',
    background: '#0B0911',
    backgroundElement: '#221A36',
    backgroundSelected: '#39294E',
    textSecondary: '#C8BAD8',
    accent: '#D6B5FF',
    onAccent: '#241239',
    accentSoft: '#38244E',
    danger: '#FF8A80',
    onDanger: '#36111C',
    dangerSoft: '#3A1D28',
    success: '#92E5C0',
    successSoft: '#17382F',
    warning: '#FFC46C',
    warningSoft: '#3F2D23',
    live: '#FF8279',
    border: '#4A3A5F',
    card: '#1B162F',
  },
} as const;

type ColorKey = keyof typeof Colors.light | keyof typeof palette.light;

export type CampusPalette = Record<ColorKey | 'bubbleIn' | 'bubbleOut' | 'onBubbleOut', string>;

export function usePalette(): CampusPalette {
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return {
    ...colors,
    bubbleIn: colors.backgroundSelected,
    bubbleOut: colors.accent,
    onBubbleOut: colors.onAccent,
  };
}
