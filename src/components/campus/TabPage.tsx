
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentProps } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Fonts } from '@/constants/theme';
import { unreadNotificationCount } from '@/features/notifications/logic';
import { IconButton } from '@/features/feed/ui';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { usePalette } from './palette';

type TabTitle = 'Feed' | 'Partners' | 'Projects' | 'Calendar' | 'Profile';
type Props = Omit<ComponentProps<typeof ScrollView>, 'onScroll'> & { title: TabTitle };

export function TabPage({ title, children, contentContainerStyle, ...scrollProps }: Props) {
  const router = useRouter();
  const palette = usePalette();
  const { state } = useCampus();
  const unread = unreadNotificationCount(state);
  const threshold = useRef(40);
  const collapsed = useRef(false);
  const [compactTitle, setCompactTitle] = useState(false);
  const kind = title === 'Partners' ? 'partner' : title === 'Projects' ? 'project' : undefined;
  const settings = title === 'Calendar' ? routes.calendarSettings : title === 'Profile' ? routes.profileSettings : null;

  return <SafeAreaView edges={Platform.OS === 'ios' ? ['top', 'left', 'right', 'bottom'] : ['top', 'left', 'right']}
    style={[styles.page, { backgroundColor: palette.background }]}>
    <View style={[styles.header, { borderBottomColor: compactTitle ? palette.border : 'transparent' }]}>
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
    <ScrollView {...scrollProps} style={[styles.scroll, scrollProps.style]} contentContainerStyle={[contentContainerStyle, styles.bottom]}
      contentInsetAdjustmentBehavior="never" automaticallyAdjustContentInsets={false} scrollEventThrottle={16}
      onScroll={event => {
        const offset = event.nativeEvent.contentOffset.y;
        const next = offset >= threshold.current;
        if (collapsed.current !== next) {
          collapsed.current = next;
          setCompactTitle(next);
        }
      }}>
      <Text accessibilityRole="header" onLayout={event => {
        const { y, height } = event.nativeEvent.layout;
        threshold.current = y + height;
      }} style={[styles.title, { color: palette.text, fontFamily: Fonts?.serif }]}>{title}</Text>
      {children}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flex: 1 },
  header: { minHeight: 48, justifyContent: 'center', alignItems: 'flex-end', borderBottomWidth: StyleSheet.hairlineWidth },
  center: { position: 'absolute', left: 96, right: 96, alignItems: 'center' },
  compact: { fontSize: 16, fontWeight: '600' },
  settings: { position: 'absolute', left: 4 },
  actions: { flexDirection: 'row', paddingRight: 4 },
  title: { fontSize: 36, fontWeight: '700' },
  bottom: { paddingBottom: 28 },
});
