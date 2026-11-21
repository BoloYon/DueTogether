
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Appearance, Platform } from 'react-native';

export const appearanceOptions = ['system', 'light', 'dark'] as const;
export type AppearanceChoice = typeof appearanceOptions[number];
const storageKey = '@duetogether/appearance/v1';
const AppearanceContext = createContext({
  choice: 'system' as AppearanceChoice,
  scheme: 'light' as 'light' | 'dark',
  select: (_choice: AppearanceChoice) => { void _choice; },
});

function subscribeToDeviceScheme(onChange: () => void) {
  const subscription = Appearance.addChangeListener(onChange);
  return () => subscription.remove();
}

// Keep SSR and hydration on the same scheme before reading the device.
const getServerScheme = () => 'light' as const;

export function AppearanceProvider({ children }: PropsWithChildren) {
  const device = useSyncExternalStore(subscribeToDeviceScheme, Appearance.getColorScheme, getServerScheme);
  const [choice, setChoice] = useState<AppearanceChoice>('system');
  const chosen = useRef(false);
  const writes = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then(saved => {
      if (active && !chosen.current && (saved === 'light' || saved === 'dark')) setChoice(saved);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice);
  }, [choice]);

  const select = (next: AppearanceChoice) => {
    chosen.current = true;
    setChoice(next);
    writes.current = writes.current.then(() => AsyncStorage.setItem(storageKey, next)).catch(() => {});
  };

  const scheme = choice === 'system' ? (device === 'dark' ? 'dark' : 'light') : choice;
  return <AppearanceContext.Provider value={{ choice, scheme, select }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
