
import { useAppearance } from './appearance';

export function useColorScheme() {
  return useAppearance().scheme;
}
