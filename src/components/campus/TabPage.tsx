
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts, MaxContentWidth } from '@/constants/theme';
import { unreadNotificationCount } from '@/features/notifications/logic';
import { IconButton } from '@/features/feed/ui';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { Avatar } from './primitives';
import { usePalette } from './palette';
import { ScreenSky } from './ScreenSky';

type TabTitle = 'Feed' | 'Partners' | 'Projects' | 'Calendar' | 'Messages';
type Props = Omit<ComponentProps<typeof ScrollView>, 'onScroll'> & { title: TabTitle; footer?: ReactNode; titleTrailing?: ReactNode };

export function TabPage({ title, titleTrailing, children, footer, contentContainerStyle, ...scrollProps }: Props) {
  const router = useRouter();
  const palette = usePalette();
  const { state } = useCampus();
  const unread = unreadNotificationCount(state);
  const threshold = useRef(48);
  const collapsed = useRef(false);
  const [compactTitle, setCompactTitle] = useState(false);
  const kind = title === 'Partners' ? 'partner' : title === 'Projects' ? 'project' : undefined;
  const { width } = useWindowDimensions();
  const titleLeft = Math.max(48, Math.min(136, width - 236));

  return <SafeAreaView edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    style={[styles.page, Platform.OS === 'web' && styles.webPage, { backgroundColor: palette.background }]}>
    <ScreenSky />
    <View style={[styles.header, { backgroundColor: compactTitle ? palette.backgroundElement : 'transparent', borderBottomColor: compactTitle ? palette.border : 'transparent' }]}>
      <View pointerEvents="none" style={[styles.center, { left: titleLeft }]}>
        {compactTitle && <Text numberOfLines={1} style={[styles.compact, { color: palette.text }]}>{title}</Text>}
      </View>
      {title === 'Calendar' && <View style={styles.settings}>
        <IconButton icon="gear" label="Calendar settings" onPress={() => router.push(routes.calendarSettings)} />
      </View>}
      <View style={styles.actions}>
        <IconButton icon="bell" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} dot={unread > 0}
          onPress={() => router.push(routes.notifications)} />
        <IconButton icon="plus" label={kind === 'partner' ? 'Create partner post' : kind === 'project' ? 'Create project' : 'Create'}
          onPress={() => router.push(routes.create(kind ? { kind } : {}))} />
        <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={styles.avatar} onPress={() => router.push(routes.profile)}>
          <Avatar name={state.currentUser.name} initials={state.currentUser.initials} size={32} />
        </Pressable>
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
    {footer}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  webPage: { paddingTop: 48 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  header: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  center: { position: 'absolute', right: 136, alignItems: 'center' },
  compact: { fontSize: 16, fontWeight: '600' },
  settings: { position: 'absolute', left: 4 },
  avatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', paddingRight: 4 },
  titleRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, fontSize: 42, fontWeight: '700' },
  bottom: { paddingBottom: 28 },
});
