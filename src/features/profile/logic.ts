import type { CampusState, Project, StudySession } from '@/shared/types';

export const NAME_MAX = 50;
export const MAJOR_MAX = 60;

export interface ProfileSections {
  going: StudySession[];
  hosting: StudySession[];
  saved: StudySession[];
  posts: CampusState['posts'];
  requested: Project[];
  teams: Project[];
}

const byStart = (left: StudySession, right: StudySession) => left.startsAt - right.startsAt;

export function profileSections(state: CampusState, now: number): ProfileSections {
  const me = state.currentUser.id;
  const active = state.sessions.filter(session => session.endsAt > now);
  const requestedIds = new Set(state.memberships.filter(item => item.userId === me && item.status === 'requested').map(item => item.projectId));
  const memberIds = new Set(state.memberships.filter(item => item.userId === me && item.status === 'member').map(item => item.projectId));
  return {
    going: active.filter(session => session.attendeeIds.includes(me) && session.hostId !== me).sort(byStart),
    hosting: active.filter(session => session.hostId === me).sort(byStart),
    saved: state.savedSessionIds
      .map(id => state.sessions.find(session => session.id === id))
      .filter((session): session is StudySession => !!session)
      .sort((left, right) => Number(left.endsAt <= now) - Number(right.endsAt <= now) || byStart(left, right)),
    posts: state.posts.filter(post => post.authorId === me).sort((left, right) => right.createdAt - left.createdAt),
    requested: state.projects.filter(project => requestedIds.has(project.id)),
    teams: state.projects.filter(project => project.ownerId === me || project.teamIds.includes(me) || memberIds.has(project.id)),
  };
}

export type ProfileResult = { ok: true; profile: { name: string; major?: string } } | { ok: false; field: 'name' | 'major'; error: string };

export function validateProfile(name: string, major: string): ProfileResult {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) return { ok: false, field: 'name', error: 'Enter a display name.' };
  if (trimmed.length > NAME_MAX) return { ok: false, field: 'name', error: `Keep your name under ${NAME_MAX} characters.` };
  if (major.trim().length > MAJOR_MAX) return { ok: false, field: 'major', error: `Keep your major under ${MAJOR_MAX} characters.` };
  return { ok: true, profile: { name: trimmed, major: major.trim() || undefined } };
}
