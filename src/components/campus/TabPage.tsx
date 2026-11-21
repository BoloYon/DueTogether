
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts, MaxContentWidth } from '@/constants/theme';
import { unreadNotificationCount } from '@/features/notifications/logic';
import { IconButton } from '@/features/feed/ui';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { usePalette } from './palette';

type TabTitle = 'Feed' | 'Partners' | 'Projects' | 'Calendar' | 'Profile';
type Props = Omit<ComponentProps<typeof ScrollView>, 'onScroll'> & { title: TabTitle; titleTrailing?: ReactNode };

export function TabPage({ title, titleTrailing, children, contentContainerStyle, ...scrollProps }: Props) {
  const router = useRouter();
  const palette = usePalette();
  const { state } = useCampus();
  const unread = unreadNotificationCount(state);
  const threshold = useRef(48);
  const collapsed = useRef(false);
  const [compactTitle, setCompactTitle] = useState(false);
  const kind = title === 'Partners' ? 'partner' : title === 'Projects' ? 'project' : undefined;
  const settings = title === 'Calendar' ? routes.calendarSettings : title === 'Profile' ? routes.profileSettings : null;

  return <SafeAreaView edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    style={[styles.page, Platform.OS === 'web' && styles.webPage, { backgroundColor: palette.background }]}>
    <View style={[styles.header, { backgroundColor: compactTitle ? palette.backgroundElement : palette.background, borderBottomColor: compactTitle ? palette.border : 'transparent' }]}>
      <View pointerEvents="none" style={styles.center}>
        {compactTitle && <Text numberOfLines={1} style={[styles.compact, { color: palette.text }]}>{title}</Text>}
      </View>
      {settings && <View style={styles.settings}>
        <IconButton icon="gear" label={title === 'Calendar' ? 'Calendar settings' : 'Profile settings'} onPress={() => router.push(settings)} />
      </View>}
      <View style={styles.actions}>
        <IconButton icon="bell" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} dot={unread > 0}
          onPress={() => router.push(routes.notifications)} />
        <IconButton icon="plus" label={kind === 'partner' ? 'Create partner post' : kind === 'project' ? 'Create project' : 'Create'}
          onPress={() => router.push(routes.create(kind ? { kind } : {}))} />
      </View>
    </View>
    <ScrollView {...scrollProps} style={[styles.scroll, scrollProps.style]} contentContainerStyle={[styles.content, contentContainerStyle, styles.bottom]}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} scrollEventThrottle={16}
      onScroll={event => {
        const offset = event.nativeEvent.contentOffset.y;
        const next = offset >= threshold.current;
        if (collapsed.current !== next) {
          collapsed.current = next;
          setCompactTitle(next);
        }
      }}>
      <View style={styles.titleRow} onLayout={event => {
        const { y, height } = event.nativeEvent.layout;
        threshold.current = y + height;
      }}>
        <Text accessibilityRole="header" aria-level={1} style={[styles.title, { color: palette.text, fontFamily: Fonts?.serif }]}>{title}</Text>
        {titleTrailing}
      </View>
      {children}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  webPage: { paddingTop: 48 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  center: { position: 'absolute', left: 96, right: 96, alignItems: 'center' },
  compact: { fontSize: 16, fontWeight: '600' },
  settings: { position: 'absolute', left: 4 },
  actions: { flexDirection: 'row', paddingRight: 4 },
  titleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, fontSize: 42, fontWeight: '700' },
  bottom: { paddingBottom: 28 },
});
