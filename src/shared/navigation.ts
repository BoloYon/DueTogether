
import type { AvailabilityWindow, Id } from './types';

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
  addAvailability: (course: string) => ({ pathname: '/partners/availability', params: { course } } as const),
  studyMatches: (courses: string[]) => ({ pathname: '/partners/matches', params: { courses: courses.join(',') } } as const),
  editAvailability: (course: string, window: AvailabilityWindow) => ({ pathname: '/partners/availability',
    params: { course, date: window.date, start: String(window.startMinute), end: String(window.endMinute) } } as const),
  partnerInvite: '/partners/invite',
  notifications: '/notifications',
  collection: (collectionId: Id) => ({ pathname: '/collection/[collectionId]', params: { collectionId } } as const),
  guide: (collectionId: Id, guideId: Id) => ({ pathname: '/collection/[collectionId]/[guideId]', params: { collectionId, guideId } } as const),
  profileSettings: '/profile/settings',
  create: (params: CreateParams = {}) => ({ pathname: '/create', params } as const),
  session: (id: Id) => ({ pathname: '/session/[id]', params: { id } } as const),
  person: (id: Id) => ({ pathname: '/person/[id]', params: { id } } as const),
  chat: (id: Id) => ({ pathname: '/chat/[id]', params: { id } } as const),
  project: (id: Id) => ({ pathname: '/project/[id]', params: { id } } as const),
} as const;
