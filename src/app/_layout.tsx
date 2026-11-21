
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { usePalette } from '@/components/campus/palette';
import { AppearanceProvider } from '@/hooks/appearance';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CampusProvider } from '@/services/db';
import { CalendarProvider } from '@/services/calendar';

export default function RootLayout() {
  return <AppearanceProvider><ThemedRoot /></AppearanceProvider>;
}

function ThemedRoot() {
  const colorScheme = useColorScheme();
  const palette = usePalette();
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = { ...base, colors: { ...base.colors, background: palette.background, card: palette.backgroundElement, text: palette.text, border: palette.border, primary: palette.accent, notification: palette.danger } };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={theme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <CampusProvider>
          <CalendarProvider>
            <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerBackTitle: 'Back', headerTransparent: false, headerLargeTitleEnabled: false, headerUserInterfaceStyle: colorScheme }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </CalendarProvider>
        </CampusProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
