
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar, Badge, Body, Button, EmptyState, Row, Section, formatAgo, useNow } from '@/components/campus';
import { usePalette } from '@/components/campus/palette';
import { TabPage } from '@/components/campus/TabPage';
import { useCampus } from '@/shared/adapters';
import { routes } from '@/shared/navigation';
import { Icon } from '@/features/feed/ui';
import { ConversationMenu, ConversationOptionsButton } from './ConversationMenu';
import { messageGroups, threadSummaries, type ThreadSummary } from './logic';

export function MessagesScreen() {
  const { state } = useCampus();
  const router = useRouter();
  const palette = usePalette();
  const now = useNow();
  const [menuId, setMenuId] = useState<string | null>(null);
  const { pinned, regular } = messageGroups(threadSummaries(state));
  const menu = state.threads.find(thread => thread.id === menuId);
  const menuName = state.people.find(person => person.id === menu?.personId)?.name ?? 'Classmate';
  const open = (id: string) => { setMenuId(null); router.push(routes.chat(id)); };
  const menuButton = ({ thread, person }: ThreadSummary) =>
    <ConversationOptionsButton name={person?.name ?? 'Classmate'} expanded={menuId === thread.id} onPress={() => setMenuId(thread.id)} />;

  return <TabPage title="Messages" contentContainerStyle={styles.content}>
    {menu && <ConversationMenu key={menu.id} thread={menu} name={menuName} onClose={() => setMenuId(null)} />}
    {pinned.length > 0 && <Section title="Pinned">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pins}>
        {pinned.map(item => {
          const { thread, person, unread } = item;
          const name = person?.name ?? 'Classmate';
          return <View key={thread.id} style={styles.pin}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Chat with ${name}${unread ? `, ${unread} unread` : ''}`}
              style={styles.pinLink} onPress={() => open(thread.id)} onLongPress={() => setMenuId(thread.id)}>
              <View>
                <Avatar name={name} initials={person?.initials} size={52} />
                {unread > 0 && <View style={[styles.dot, { backgroundColor: palette.accent, borderColor: palette.background }]} />}
              </View>
              <Text numberOfLines={1} style={{ color: palette.text }}>{name}</Text>
            </Pressable>
            {menuButton(item)}
          </View>;
        })}
      </ScrollView>
    </Section>}
    {pinned.length === 0 && <Row style={styles.pinHint}>
      <View style={[styles.placeholder, { borderColor: palette.textSecondary }]}>
        <Icon name="pushpin" color={palette.textSecondary} />
      </View>
      <Body small secondary>Hold a chat to pin it.</Body>
    </Row>}
    {regular.length > 0 && <View style={[styles.list, { backgroundColor: palette.backgroundElement, borderColor: palette.border }]}>
      {regular.map((item, index) => {
        const { thread, person, last, unread } = item;
        const name = person?.name ?? 'Classmate';
        const preview = thread.pendingReply ? 'Typing…' : last
          ? (last.authorId === state.currentUser.id ? 'You: ' + last.text : last.text.replace(/ \(Simulated reply\)$/, ''))
          : 'No messages yet';
        return <View key={thread.id} style={[styles.row, { borderColor: palette.border }, index > 0 && styles.separator]}>
          <Pressable style={styles.rowLink} onPress={() => open(thread.id)} onLongPress={() => setMenuId(thread.id)}
            accessibilityRole="button" accessibilityLabel={`Chat with ${name}${unread ? `, ${unread} unread` : ''}`}>
            <Avatar name={name} initials={person?.initials} size={38} />
            <View style={styles.summary}>
              <Text numberOfLines={1} style={{ color: palette.text, fontWeight: unread ? '800' : '600' }}>{name}</Text>
              <Text numberOfLines={1} style={{ color: palette.textSecondary }}>{preview}</Text>
            </View>
            <View style={styles.meta}>
              {last && <Body small secondary>{formatAgo(last.sentAt, now)}</Body>}
              {unread > 0 && <Badge tone="accent" label={String(unread)} accessibilityLabel={`${unread} unread`} />}
            </View>
          </Pressable>
          {menuButton(item)}
        </View>;
      })}
    </View>}
    {pinned.length === 0 && regular.length === 0 &&
      <EmptyState title="No conversations yet" body="Connect on a partner post to start a conversation."
        action={<Button label="Find partners" onPress={() => router.navigate(routes.partners)} />} />}
  </TabPage>;
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  pinHint: { minHeight: 40 },
  placeholder: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderStyle: 'dotted', alignItems: 'center', justifyContent: 'center' },
  pins: { gap: 8 },
  pin: { width: 86, alignItems: 'center' },
  pinLink: { width: '100%', alignItems: 'center', gap: 4, padding: 4 },
  dot: { position: 'absolute', top: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  separator: { borderTopWidth: StyleSheet.hairlineWidth },
  rowLink: { minHeight: 62, flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, gap: 8 },
  summary: { flex: 1, minWidth: 0, gap: 3 },
  meta: { alignItems: 'flex-end', gap: 3 },
});
