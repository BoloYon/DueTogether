import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Body, Button, EmptyState, MIN_TOUCH, Notice, Screen, formatAgo, useNow, usePalette } from '@/components/campus';
import { Spacing } from '@/constants/theme';
import { useCampus } from '@/shared/adapters';
import type { Notification } from '@/shared/types';
import { safeHref, sortedNotifications, unreadNotificationCount } from './logic';

export function NotificationsScreen() {
  const { state, dispatch } = useCampus();
  const notifications = sortedNotifications(state);
  const unread = unreadNotificationCount(state);
  return (
    <Screen title="Notifications">
      <View style={styles.header}>
        <Body secondary>{unread ? `${unread} unread` : 'All caught up'}</Body>
        <Button compact variant="secondary" label="Mark all read" disabled={!unread} onPress={() => dispatch({ type: 'notification/readAll' })} />
      </View>
      {notifications.length
        ? notifications.map(item => <NotificationRow key={item.id} item={item} />)
        : <EmptyState title="No notifications" body="Invite replies and other updates will appear here." />}
      <Notice tone="neutral">Local notifications from the demo simulation. There is no push service.</Notice>
    </Screen>
  );
}

function NotificationRow({ item }: { item: Notification }) {
  const { dispatch } = useCampus();
  const router = useRouter();
  const palette = usePalette();
  const now = useNow(60_000);
  const href = safeHref(item.href);
  const open = () => {
    if (!item.read) dispatch({ type: 'notification/read', id: item.id });
    if (href) router.push(href as Href);
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}. ${item.body}. ${formatAgo(item.createdAt, now)}`}
      accessibilityHint={href ? 'Marks as read and opens the related screen' : 'Marks as read'}
      onPress={open}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? palette.backgroundSelected : palette.backgroundElement }]}>
      <View style={[styles.dot, { backgroundColor: item.read ? 'transparent' : palette.accent }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Body bold={!item.read}>{item.title}</Body>
        <Body small secondary>{item.body}</Body>
        <Body small secondary>{formatAgo(item.createdAt, now)}</Body>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, minHeight: MIN_TOUCH },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderRadius: 14, padding: Spacing.three, minHeight: MIN_TOUCH },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
});
