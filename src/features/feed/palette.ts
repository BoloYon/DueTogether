import { usePalette as useCampusPalette } from '@/components/campus/palette';

export function usePalette() {
  const palette = useCampusPalette();
  return {
    ...palette,
    accentText: palette.onAccent,
    liveSoft: palette.dangerSoft,
  };
}

export type Palette = ReturnType<typeof usePalette>;

export { clusterHues, hueFor } from './hues';
