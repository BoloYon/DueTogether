import { notificationForUser } from '@/shared/selectors';
import type { CampusState, Notification } from '@/shared/types';

export function sortedNotifications(state: CampusState): Notification[] {
  return state.notifications.filter(item => notificationForUser(item, state.currentUser.id)).sort((left, right) => right.createdAt - left.createdAt);
}

export function unreadNotificationCount(state: CampusState) {
  return state.notifications.filter(item => !item.read && notificationForUser(item, state.currentUser.id)).length;
}

/** Only follow app-internal paths; ignore anything that looks like an external URL. */
export function safeHref(href: string | undefined): string | null {
  if (!href || !href.startsWith('/') || href.startsWith('//')) return null;
  return href;
}
