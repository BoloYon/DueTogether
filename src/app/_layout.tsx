
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CampusProvider } from '@/services/db';
import { CalendarProvider } from '@/services/calendar';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <CampusProvider>
          <CalendarProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </CalendarProvider>
        </CampusProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
