import { Stack, useIsFocused, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar, Badge, Body, Button, EmptyState, MIN_TOUCH, Notice, Row, Screen, formatClock, formatDayLabel, dayKeyOf, useNow, usePalette,
} from '@/components/campus';
import { ScreenSky } from '@/components/campus/ScreenSky';
import { FilterChip } from '@/features/feed/ui';
import { normalizeCourse } from '@/shared/selectors';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCampus } from '@/shared/adapters';
import { routes, type ChatParams } from '@/shared/navigation';
import type { Message } from '@/shared/types';
import { ConversationMenu, ConversationOptionsButton } from './ConversationMenu';
import { MESSAGE_MAX, composerCourses, matchesChatCourse, threadContexts, unreadCount, validateMessage } from './logic';

export function ChatScreen({ id, course: initialCourse }: ChatParams) {
  const { state, dispatch } = useCampus();
  const router = useRouter();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const now = useNow(30_000);
  const scroll = useRef<ScrollViewInstance>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const thread = state.threads.find(item => item.id === id);
  const courses = thread ? composerCourses(state, thread) : [];
  const [course, setCourse] = useState<string | undefined>(() => initialCourse ? normalizeCourse(initialCourse) : undefined);
  const unread = thread ? unreadCount(thread) : 0;

  // Mark read while the conversation is on screen, including replies that land while open.
  const focused = useIsFocused();
  useEffect(() => {
    if (focused && unread > 0) dispatch({ type: 'chat/read', threadId: id });
  }, [dispatch, focused, id, unread]);

  if (!thread) {
    return (
      <Screen title="Conversation">
        <EmptyState title="Conversation unavailable" body="Start a chat by connecting on a partner post."
          action={<Button label="Browse partners" variant="secondary" onPress={() => router.navigate(routes.partners)} />} />
      </Screen>
    );
  }

  const person = state.people.find(item => item.id === thread.personId);
  const name = person?.name ?? 'Classmate';
  const contexts = threadContexts(state, thread);
  const activeCourse = course && courses.includes(course) ? course : undefined;
  const messages = thread.messages.filter(message => matchesChatCourse(message.course, activeCourse));

  const send = () => {
    const problem = validateMessage(text);
    if (problem) { setError(problem); return; }
    const result = dispatch({ type: 'chat/send', threadId: thread.id, text, course: activeCourse });
    if (!result.ok) { setError(result.message); return; }
    setText('');
    setError(null);
  };

  const remaining = MESSAGE_MAX - text.trim().length;

  return (
    <KeyboardAvoidingView style={[styles.page, { backgroundColor: palette.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScreenSky />
      <Stack.Screen options={{ title: name, headerRight: () => <ConversationOptionsButton name={name} expanded={menuOpen} onPress={() => setMenuOpen(true)} /> }} />
      {menuOpen && <ConversationMenu thread={thread} name={name} onClose={() => setMenuOpen(false)} onDelete={() => router.dismissTo(routes.messages)} />}
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <View style={styles.inner}>
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${name}'s profile`}
            onPress={() => router.push(routes.person(thread.personId))} style={styles.header}>
            <Avatar name={name} initials={person?.initials} />
            <View style={{ flex: 1 }}>
              <Body bold>{name}</Body>
              <Body small secondary>View profile</Body>
            </View>
          </Pressable>
          {contexts.length > 0 && (
            <View style={{ gap: Spacing.one }}>
              <Body small secondary>Connected through</Body>
              <Row wrap>
                {contexts.map(context => <Badge key={context.postId} tone="accent" label={`${context.label} · ${context.title}`} />)}
              </Row>
            </View>
          )}
          <Notice tone="neutral">Campus demo · Simulated replies</Notice>

          {messages.map((message, index) => {
            const day = dayKeyOf(message.sentAt);
            const previous = messages[index - 1];
            const divider = !previous || dayKeyOf(previous.sentAt) !== day ? formatDayLabel(day, now) : null;
            return (
              <View key={message.id} style={{ gap: Spacing.two }}>
                {divider && <Text style={[styles.divider, { color: palette.textSecondary }]}>{divider}</Text>}
                <Bubble message={message} mine={message.authorId === state.currentUser.id} authorName={name} />
              </View>
            );
          })}
          {thread.pendingReply && matchesChatCourse(thread.pendingReply.course, activeCourse) && (
            <View accessibilityLiveRegion="polite" style={[styles.bubble, styles.left, { backgroundColor: palette.bubbleIn }]}>
              <Text style={{ color: palette.textSecondary, fontStyle: 'italic' }}>{name} is typing…</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.composerWrap, { borderTopColor: palette.border, backgroundColor: palette.background, paddingBottom: Math.max(insets.bottom, Spacing.two) }]}>
        <View style={[styles.inner, { gap: Spacing.two }]}>
          {error && <Text accessibilityLiveRegion="polite" style={{ color: palette.danger }}>{error}</Text>}
          {courses.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false}
            accessibilityLabel="Course context" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: Spacing.two }}>
            {courses.map(item => <FilterChip key={item} label={item} selected={activeCourse === item}
              onPress={() => setCourse(current => current === item ? undefined : item)} />)}
          </ScrollView>}
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel={`Message ${name}`}
              accessibilityHint={activeCourse ? `Tagged with ${activeCourse}` : undefined}
              value={text}
              onChangeText={value => { setText(value); if (error) setError(null); }}
              placeholder={activeCourse ? `Message about ${activeCourse}` : 'Message'}
              placeholderTextColor={palette.textSecondary}
              multiline
              maxLength={MESSAGE_MAX + 20}
              style={[styles.input, { color: palette.text, backgroundColor: palette.backgroundElement, borderColor: error ? palette.danger : palette.border }]}
            />
            <Button label="Send" onPress={send} disabled={!text.trim() || remaining < 0} compact />
          </View>
          {remaining < 50 && <Text style={{ color: remaining < 0 ? palette.danger : palette.textSecondary, fontSize: 13 }}>{remaining} characters left</Text>}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, mine, authorName }: { message: Message; mine: boolean; authorName: string }) {
  const palette = usePalette();
  const color = mine ? palette.onBubbleOut : palette.text;
  return (
    <View accessible accessibilityLabel={`${mine ? 'You' : authorName}, ${formatClock(message.sentAt)}${message.course ? `, ${message.course}` : ''}: ${mine ? message.text : message.text.replace(/ \(Simulated reply\)$/, '')}`}
      style={[styles.bubble, mine ? styles.right : styles.left, { backgroundColor: mine ? palette.bubbleOut : palette.bubbleIn }]}>
      {message.course && <Text style={[styles.meta, { color, fontWeight: '700' }]}>{message.course}</Text>}
      <Text style={{ color, fontSize: 16, lineHeight: 22 }}>{mine ? message.text : message.text.replace(/ \(Simulated reply\)$/, '')}</Text>
      <Text style={[styles.meta, { color, textAlign: 'right' }]}>{formatClock(message.sentAt)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: Spacing.three, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH },
  divider: { textAlign: 'center', fontSize: 13, fontWeight: '600' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, gap: 2 },
  left: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  right: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  meta: { fontSize: 12, lineHeight: 16 },
  composerWrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, alignItems: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  input: { flex: 1, minHeight: MIN_TOUCH, maxHeight: 140, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontSize: 16 },
});
