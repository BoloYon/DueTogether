import { findThreadByPerson, selectFeedSections, sessionState } from '@/shared/selectors';
import type { CampusState, CanvasItem, Id, PartnerPost, Project, StudySession, User } from '@/shared/types';
import { formatClock, relativeDayLabel, dayKey } from '../calendar/model';

/** Feed sections in the one documented order. List and Graph both iterate this array. */
export const SECTION_ORDER = ['happeningNow', 'dueSoon', 'comingUp', 'partnersWanted', 'newProjects'] as const;
export type SectionKey = (typeof SECTION_ORDER)[number];
export const SECTION_TITLES: Record<SectionKey, string> = {
  happeningNow: 'Happening Now',
  dueSoon: 'Due Soon',
  comingUp: 'Coming Up',
  partnersWanted: 'Partners Wanted',
  newProjects: 'New Projects',
};

export type FeedSections = ReturnType<typeof selectFeedSections>;

/** Wraps the shared selector so List and Graph read exactly the same arrays. */
export function feedSections(state: CampusState, items: CanvasItem[], now: number): FeedSections {
  return selectFeedSections(state, items, now);
}

export function sectionCount(sections: FeedSections, key: SectionKey) {
  return sections[key].length;
}

/** Graph tabs start on Happening Now, or the first populated section. */
export function initialGraphSection(sections: FeedSections): SectionKey {
  if (sections.happeningNow.length) return 'happeningNow';
  return SECTION_ORDER.find(key => sections[key].length > 0) ?? 'happeningNow';
}

export function personById(state: CampusState, id: Id): User | undefined {
  return id === state.currentUser.id ? state.currentUser : state.people.find(person => person.id === id);
}

export function personName(state: CampusState, id: Id) {
  if (id === state.currentUser.id) return 'You';
  return personById(state, id)?.name ?? 'Unknown student';
}

export function initials(user: Pick<User, 'name' | 'initials'>) {
  if (user.initials) return user.initials;
  return user.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]!.toUpperCase()).join('');
}

/** "Known" means a real conversation thread exists. Project requests never count as a connection. */
export function isKnownContact(state: CampusState, personId: Id) {
  return personId !== state.currentUser.id && !!findThreadByPerson(state, personId);
}

export type PostStatus = { kind: 'own' } | { kind: 'linked'; threadId: Id } | { kind: 'known'; threadId: Id } | { kind: 'new' };

/** linked: this post is already attached to a thread. known: a thread with the author exists (Connect reuses it). */
export function postStatus(state: CampusState, post: PartnerPost): PostStatus {
  if (post.authorId === state.currentUser.id) return { kind: 'own' };
  const linked = state.postToThread[post.id];
  if (linked) return { kind: 'linked', threadId: linked };
  const thread = findThreadByPerson(state, post.authorId);
  return thread ? { kind: 'known', threadId: thread.id } : { kind: 'new' };
}

export type ProjectStatus = 'owner' | 'member' | 'requested' | 'full' | 'open';

export function projectStatus(state: CampusState, project: Project): ProjectStatus {
  const me = state.currentUser.id;
  if (project.ownerId === me) return 'owner';
  const membership = state.memberships.find(item => item.projectId === project.id && item.userId === me);
  if (project.teamIds.includes(me) || membership?.status === 'member') return 'member';
  if (membership?.status === 'requested') return 'requested';
  return project.teamIds.length >= project.capacity ? 'full' : 'open';
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  owner: 'You own this', member: 'You’re on the team', requested: 'Requested', full: 'Team full', open: 'Open',
};

export function sessionStatus(state: CampusState, session: StudySession, now: number) {
  return { ...sessionState(session, state.currentUser.id, now), saved: state.savedSessionIds.includes(session.id) };
}

export function sessionPlace(session: StudySession) {
  if (session.format === 'online') return session.location ? `Online · ${session.location}` : 'Online';
  return session.location ?? 'Location to be announced';
}

export function attendanceLabel(session: StudySession) {
  const count = session.attendeeIds.length;
  return session.capacity ? `${count}/${session.capacity} going` : `${count} going`;
}

export function timeLeftLabel(session: StudySession, now: number) {
  const minutes = Math.max(0, Math.ceil((session.endsAt - now) / 60_000));
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min left` : `${hours} h left`;
}

export function startsLabel(session: StudySession, now: number) {
  return `${relativeDayLabel(dayKey(new Date(session.startsAt)), now)} · ${formatClock(session.startsAt)}`;
}

export function shortDateLabel(time: number, now: number) {
  const label = relativeDayLabel(dayKey(new Date(time)), now);
  return label.includes(',') ? label.split(', ')[1] : label === 'Today' || label === 'Tomorrow' ? label : label.slice(0, 3);
}

export function ageLabel(createdAt: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - createdAt) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function courseOrTopic(entity: { course?: string; topic?: string; category?: string }) {
  return entity.course ?? entity.topic ?? entity.category ?? 'General';
}
