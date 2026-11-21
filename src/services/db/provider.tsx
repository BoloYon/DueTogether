import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { CampusAdapterProvider } from '../../shared/adapters';
import type { Clock } from '../../shared/types';
import { removeMedia } from '@/services/profile-media/storage';

import { watchCampusDelivery } from './delivery';
import { openCampusStore, type CampusStore } from './store';

function ReadyCampusProvider({ children, store, clock }: PropsWithChildren<{ store: CampusStore; clock: Clock }>) {
  const state = useSyncExternalStore(store.subscribe, store.getState);

  useEffect(() => {
    store.advance();
    const stopDelivery = watchCampusDelivery(store, clock);
    const foreground = AppState.addEventListener('change', status => {
      if (status === 'active') store.advance();
    });
    return () => {
      foreground.remove();
      stopDelivery();
    };
  }, [store, clock]);

  return <CampusAdapterProvider value={{ state, dispatch: store.dispatch }}>{children}</CampusAdapterProvider>;
}

export function CampusProvider({ children, clock = Date.now }: PropsWithChildren<{ clock?: Clock }>) {
  const [store, setStore] = useState<CampusStore>();
  const opening = useRef<Promise<CampusStore> | null>(null);
  const clockRef = useRef(clock);
  const scheme = useColorScheme();

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  useEffect(() => {
    let mounted = true;
    opening.current ??= openCampusStore(AsyncStorage, () => clockRef.current(), removeMedia);
    void opening.current.then(loaded => {
      if (mounted) setStore(loaded);
    });
    return () => { mounted = false; };
  }, []);

  if (!store) {
    const dark = scheme === 'dark';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#000' : '#fff' }}>
        <Text accessibilityRole="progressbar" style={{ color: dark ? '#f4f4f5' : '#18181b' }}>Loading campus data…</Text>
      </View>
    );
  }

  return <ReadyCampusProvider store={store} clock={clock}>{children}</ReadyCampusProvider>;
}
