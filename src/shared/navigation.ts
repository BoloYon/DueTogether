
import type { Id } from './types';

export type DetailParams = { id: Id };
export type CreateParams = { course?: string; title?: string; kind?: 'session' | 'partner' | 'project' };
export const routes = {
  feed: '/',
  partners: '/partners',
  projects: '/projects',
  calendar: '/calendar',
  profile: '/profile',
  calendarSettings: '/calendar/settings',
  partnerFind: '/partners/find',
  partnerAvailability: '/partners/availability',
  partnerInvite: '/partners/invite',
  notifications: '/notifications',
  profileSettings: '/profile/settings',
  create: (params: CreateParams = {}) => ({ pathname: '/create', params } as const),
  session: (id: Id) => ({ pathname: '/session/[id]', params: { id } } as const),
  person: (id: Id) => ({ pathname: '/person/[id]', params: { id } } as const),
  chat: (id: Id) => ({ pathname: '/chat/[id]', params: { id } } as const),
  project: (id: Id) => ({ pathname: '/project/[id]', params: { id } } as const),
} as const;
