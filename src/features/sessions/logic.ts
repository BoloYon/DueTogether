import { formatClock, formatDayLabel, formatDuration, dayKeyOf, plural } from '@/components/campus/format';
import { sessionState } from '@/shared/selectors';
import type { CampusState, Id, StudySession, User } from '@/shared/types';

export type SessionPhase = 'live' | 'upcoming' | 'ended';

export interface SessionView {
  phase: SessionPhase;
  phaseLabel: string;
  joined: boolean;
  hosting: boolean;
  full: boolean;
  saved: boolean;
  /** Primary attendance action; `null` when hosting/ended/full-and-not-joined. */
  attendance: { action: 'session/join' | 'session/leave'; label: string } | null;
  /** Why there is no attendance action, for readable status text. */
  attendanceNote?: string;
  whenText: string;
  timingText: string;
  placeText: string;
  capacityText: string;
  subject: string;
  host: User | undefined;
  attendees: User[];
}

export function personById(state: CampusState, id: Id): User | undefined {
  return id === state.currentUser.id ? state.currentUser : state.people.find(person => person.id === id);
}

export function sessionPhase(session: StudySession, now: number): SessionPhase {
  if (session.endsAt <= now) return 'ended';
  return session.startsAt <= now ? 'live' : 'upcoming';
}

export function describeSession(session: StudySession, state: CampusState, now: number): SessionView {
  const rules = sessionState(session, state.currentUser.id, now);
  const phase = sessionPhase(session, now);
  const saved = state.savedSessionIds.includes(session.id);
  let attendance: SessionView['attendance'] = null;
  let attendanceNote: string | undefined;
  if (rules.hosting) attendanceNote = 'You are hosting this session.';
  else if (rules.ended) attendanceNote = rules.joined ? 'You attended this session. It has ended.' : 'This session has ended.';
  else if (rules.joined) attendance = { action: 'session/leave', label: 'Leave session' };
  else if (rules.full) attendanceNote = 'This session is full.';
  else attendance = { action: 'session/join', label: phase === 'live' ? 'Join now' : 'Join session' };

  const day = formatDayLabel(dayKeyOf(session.startsAt), now);
  const whenText = `${day} · ${formatClock(session.startsAt)} – ${formatClock(session.endsAt)}`;
  const timingText = phase === 'live'
    ? `${formatDuration(session.endsAt - now)} left`
    : phase === 'upcoming' ? `Starts in ${formatDuration(session.startsAt - now)}` : 'Ended';
  const placeText = session.location
    ? session.format === 'online' ? `${session.location} · Online` : session.location
    : session.format === 'online' ? 'Online' : 'Location to be announced';
  const count = session.attendeeIds.length;
  const capacityText = session.capacity !== undefined
    ? `${count} of ${session.capacity} spots taken${rules.full ? ' · Full' : ''}`
    : `${plural(count, 'person', 'people')} going`;

  const labels: Record<SessionPhase, string> = { live: 'Live', upcoming: 'Upcoming', ended: 'Ended' };
  return {
    phase, phaseLabel: labels[phase], joined: rules.joined, hosting: rules.hosting, full: rules.full, saved,
    attendance, attendanceNote, whenText, timingText, placeText, capacityText,
    subject: session.course ?? session.topic ?? 'General study',
    host: personById(state, session.hostId),
    attendees: session.attendeeIds.map(id => personById(state, id)).filter((person): person is User => !!person),
  };
}
