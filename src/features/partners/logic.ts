import { atMinute, dayKeyStart, parseTimeOfDay } from '@/components/campus/format';
import { findThreadByPerson, normalizeCourse } from '@/shared/selectors';
import type { AvailabilityMatch, AvailabilityWindow, CampusState, Id, InviteDraft, PartnerPost, StudyInvite, User } from '@/shared/types';

/** A personal connection exists only when there is a thread with that person. */
export function isContact(state: CampusState, personId: Id) {
  return !!findThreadByPerson(state, personId);
}

export function postsByAuthor(state: CampusState, authorId: Id) {
  return state.posts.filter(post => post.authorId === authorId).sort((left, right) => right.createdAt - left.createdAt);
}

/** Connect button state for a partner post, derived from shared thread state. */
export function connectState(state: CampusState, post: PartnerPost): { label: string; disabled: boolean; threadId?: Id } {
  if (post.authorId === state.currentUser.id) return { label: 'Your post', disabled: true };
  const threadId = state.postToThread[post.id];
  if (threadId) return { label: 'Open chat', disabled: false, threadId };
  return { label: isContact(state, post.authorId) ? 'Connect (adds to chat)' : 'Connect', disabled: false };
}

function haystack(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export interface PartnerSearch { people: User[]; posts: PartnerPost[] }

/** Search other students and their partner posts by course/topic or person name. */
export function searchPartners(state: CampusState, query: string, course?: string): PartnerSearch {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  const courseKey = course ? normalizeCourse(course) : undefined;
  const nameOf = (id: Id) => state.people.find(person => person.id === id)?.name;
  const people = state.people.filter(person =>
    (!courseKey || person.courses.map(normalizeCourse).includes(courseKey))
    && (!q || haystack(person.name, person.major, ...person.courses).includes(q)));
  const posts = state.posts
    .filter(post => post.authorId !== state.currentUser.id)
    .filter(post => !courseKey || (post.course && normalizeCourse(post.course) === courseKey))
    .filter(post => !q || haystack(post.title, post.description, post.course, post.topic, nameOf(post.authorId)).includes(q))
    .sort((left, right) => right.createdAt - left.createdAt);
  return { people, posts };
}

/* ---------------- Availability ---------------- */

export function myWindows(state: CampusState, course: string): AvailabilityWindow[] {
  const windows = state.availability[state.currentUser.id]?.[normalizeCourse(course)] ?? [];
  return [...windows].sort((left, right) => left.date.localeCompare(right.date) || left.startMinute - right.startMinute);
}

export type WindowResult = { ok: true; window: AvailabilityWindow } | { ok: false; field: 'day' | 'start' | 'end'; error: string };

export function buildWindow(day: string, start: string, end: string, now: number): WindowResult {
  if (Number.isNaN(dayKeyStart(day))) return { ok: false, field: 'day', error: 'Choose a day.' };
  const startMinute = parseTimeOfDay(start);
  const endMinute = parseTimeOfDay(end);
  if (startMinute === null || startMinute >= 1440) return { ok: false, field: 'start', error: 'Use a start time like 10:00 or 10am.' };
  if (endMinute === null || endMinute === 0) return { ok: false, field: 'end', error: 'Use an end time like 12:00 or 12pm.' };
  if (endMinute <= startMinute) return { ok: false, field: 'end', error: 'End time must be after the start.' };
  if (atMinute(day, endMinute) <= now) return { ok: false, field: 'end', error: 'This window has already passed. Choose a later time.' };
  return { ok: true, window: { date: day, startMinute, endMinute } };
}

export function windowPassed(window: AvailabilityWindow, now: number) {
  return atMinute(window.date, window.endMinute) <= now;
}

/** "HH:MM" text for loading a saved window back into the form. */
export function minuteToInput(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

export function inviteDraftFromMatch(match: AvailabilityMatch, location?: string): InviteDraft {
  return {
    personId: match.personId,
    course: match.course,
    startsAt: atMinute(match.date, match.startMinute),
    endsAt: atMinute(match.date, match.endMinute),
    ...(location?.trim() ? { location: location.trim() } : {}),
  };
}

/** Existing invite covering the same person, course and start, so we do not double-send. */
export function inviteForMatch(state: CampusState, match: AvailabilityMatch): StudyInvite | undefined {
  const draft = inviteDraftFromMatch(match);
  return state.invites.find(invite => invite.personId === draft.personId && invite.course === draft.course && invite.startsAt === draft.startsAt);
}

export function sortedInvites(state: CampusState) {
  return [...state.invites].sort((left, right) => left.startsAt - right.startsAt);
}

export function coursesForAvailability(state: CampusState): string[] {
  const mine = Object.keys(state.availability[state.currentUser.id] ?? {});
  return [...new Set([...state.currentUser.courses.map(normalizeCourse), ...mine])];
}
