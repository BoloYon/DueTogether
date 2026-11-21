import type { CampusState, Message, PartnerPost, Thread, User } from '@/shared/types';

export const MESSAGE_MAX = 500;

/** Messages from the other person after the thread's read marker. */
export function unreadCount(thread: Thread): number {
  const readAt = thread.readAt ?? -Infinity;
  return thread.messages.filter(message => message.authorId === thread.personId && message.sentAt > readAt).length;
}

export function lastMessage(thread: Thread): Message | undefined {
  return thread.messages.reduce<Message | undefined>((latest, message) => !latest || message.sentAt >= latest.sentAt ? message : latest, undefined);
}

export interface ThreadContext { postId: string; title: string; label: string; course?: string }

/** Partner posts attached to this conversation, oldest connection first. */
export function threadContexts(state: CampusState, thread: Thread): ThreadContext[] {
  return thread.postIds
    .map(id => state.posts.find(post => post.id === id))
    .filter((post): post is PartnerPost => !!post)
    .map(post => ({ postId: post.id, title: post.title, course: post.course, label: post.course ?? post.topic ?? 'General' }));
}

/** Distinct courses the composer can tag a message with. */
export function composerCourses(state: CampusState, thread: Thread): string[] {
  return [...new Set(threadContexts(state, thread).flatMap(context => context.course ? [context.course] : []))];
}

export function validateMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Type a message first.';
  if (trimmed.length > MESSAGE_MAX) return `Keep messages under ${MESSAGE_MAX} characters.`;
  return null;
}

export interface ThreadSummary { thread: Thread; person: User | undefined; last: Message | undefined; unread: number; activity: number }

/** Messages list: most recent activity first, unread derived from thread state. */
export function threadSummaries(state: CampusState): ThreadSummary[] {
  return state.threads
    .map(thread => {
      const last = lastMessage(thread);
      return {
        thread, last, unread: unreadCount(thread), activity: last?.sentAt ?? 0,
        person: state.people.find(person => person.id === thread.personId),
      };
    })
    .sort((left, right) => right.activity - left.activity);
}

export function totalUnread(state: CampusState) {
  return state.threads.reduce((sum, thread) => sum + unreadCount(thread), 0);
}

/** True when the newest message is from the other person and newer than readAt. */
export function needsReadReceipt(thread: Thread) {
  return unreadCount(thread) > 0;
}
