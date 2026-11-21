import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { CalendarAdapterProvider } from '../../shared/adapters';
import type { CanvasTransport, Clock } from '../../shared/types';
import { createCanvasTransport } from '../canvas';
import { createCalendarController } from './controller';
import { createCalendarStorage } from './storage';

const nativeStorage = createCalendarStorage(AsyncStorage, {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
}, SecureStore.isAvailableAsync);

export function CalendarProvider({ children, transport, clock = Date.now }: PropsWithChildren<{
  transport?: CanvasTransport;
  clock?: Clock;
}>) {
  const [controller] = useState(() => createCalendarController(transport ?? createCanvasTransport(), nativeStorage, clock));
  const view = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    void controller.start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') controller.foreground();
    });
    return () => {
      subscription.remove();
      controller.stop();
    };
  }, [controller]);

  return (
    <CalendarAdapterProvider value={{
      ...view,
      connect: controller.connect,
      sync: controller.sync,
      disconnect: controller.disconnect,
      enterSampleMode: controller.enterSampleMode,
    }}>
      {children}
    </CalendarAdapterProvider>
  );
}
