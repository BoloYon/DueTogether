
import { localDayKey } from './mockData';
import type { AvailabilityMatch, CampusState, CanvasItem, Id, StudySession } from './types';

export function normalizeCourse(course: string) {
  return course.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function sessionState(session: StudySession, userId: Id, now: number) {
  const joined = session.attendeeIds.includes(userId);
  const hosting = session.hostId === userId;
  const ended = session.endsAt <= now;
  const full = session.capacity !== undefined && session.attendeeIds.length >= session.capacity;
  return { joined, hosting, ended, full, canJoin: !joined && !hosting && !ended && !full };
}

export function findThreadByPerson(state: CampusState, personId: Id) {
  return state.threads.find(thread => thread.personId === personId);
}

export type DueRange = 'today' | 'tomorrow' | 'next-seven-days';

function deadline(item: CanvasItem): number {
  return item.dueDate ? Date.parse(item.dueDate) : NaN;
}

export function selectDueItems(items: CanvasItem[], now: number, range: DueRange) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'tomorrow') start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + (range === 'next-seven-days' ? 7 : 1));
  const lowerBound = range === 'next-seven-days' ? now : start.getTime();
  return items.filter(item => item.kind !== 'event' && deadline(item) >= lowerBound && deadline(item) < end.getTime())
    .sort((left, right) => deadline(left) - deadline(right));
}

export function selectFeedSections(state: CampusState, items: CanvasItem[], now: number) {
  const newest = <T extends { createdAt: number }>(left: T, right: T) => right.createdAt - left.createdAt;
  const dueSoon = items.filter(item => item.kind !== 'event' && deadline(item) > now && deadline(item) <= now + 7 * 86_400_000)
    .sort((left, right) => deadline(left) - deadline(right)).slice(0, 3);
  return {
    happeningNow: state.sessions.filter(session => session.startsAt <= now && now < session.endsAt)
      .sort((left, right) => right.attendeeIds.length - left.attendeeIds.length || left.startsAt - right.startsAt),
    dueSoon,
    comingUp: state.sessions.filter(session => session.startsAt > now && session.endsAt > session.startsAt)
      .sort((left, right) => left.startsAt - right.startsAt),
    partnersWanted: state.posts.filter(post => post.authorId !== state.currentUser.id).sort(newest),
    newProjects: [...state.projects].sort(newest),
  };
}

export function findAvailabilityOverlaps(state: CampusState, courseInput: string, now: number): AvailabilityMatch[] {
  const course = normalizeCourse(courseInput);
  const myWindows = state.availability[state.currentUser.id]?.[course] ?? [];
  const today = localDayKey(new Date(now));
  const date = new Date(now);
  const minute = date.getHours() * 60 + date.getMinutes() + Number(date.getSeconds() > 0 || date.getMilliseconds() > 0);
  const matches: AvailabilityMatch[] = [];
  for (const person of state.people) {
    for (const mine of myWindows) {
      for (const theirs of state.availability[person.id]?.[course] ?? []) {
        if (mine.date !== theirs.date || mine.date < today) continue;
        const startMinute = Math.max(mine.startMinute, theirs.startMinute, mine.date === today ? minute : 0);
        const endMinute = Math.min(mine.endMinute, theirs.endMinute);
        if (endMinute > startMinute) matches.push({ personId: person.id, course, date: mine.date, startMinute, endMinute });
      }
    }
  }
  return matches.sort((left, right) => left.date.localeCompare(right.date) || left.startMinute - right.startMinute);
}
