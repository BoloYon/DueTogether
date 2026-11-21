
import { makeCampusFixtures } from './mockData';
import { findThreadByPerson, normalizeCourse, sessionState } from './selectors';
import type { AvailabilityWindow, CampusAction, CampusResult, CampusState, Id, Thread } from './types';

export function transitionCampus(state: CampusState, action: CampusAction, now: number, id: Id): [CampusState, CampusResult] {
  const user = state.currentUser;
  const done = (patch: Partial<CampusState> = {}, resultId?: Id): [CampusState, CampusResult] =>
    [{ ...state, ...patch }, resultId ? { ok: true, id: resultId } : { ok: true }];
  const fail = (error: Extract<CampusResult, { ok: false }>['error'], message: string): [CampusState, CampusResult] =>
    [state, { ok: false, error, message }];
  const updateThread = (thread: Thread) => state.threads.map(existing => existing.id === thread.id ? thread : existing);

  switch (action.type) {
    case 'session/create': {
      const { durationMinutes, ...draft } = action.draft;
      const title = draft.title.trim();
      if (!title || !(draft.course?.trim() || draft.topic?.trim()) || !Number.isFinite(draft.startsAt)
        || draft.startsAt < now || !Number.isFinite(durationMinutes) || durationMinutes <= 0
        || (draft.capacity !== undefined && (!Number.isInteger(draft.capacity) || draft.capacity < 1))) {
        return fail('invalid', 'Enter a title, course or topic, future start, duration, and valid capacity.');
      }
      const session = { ...draft, id, title, hostId: user.id, attendeeIds: [user.id], createdAt: now, endsAt: draft.startsAt + durationMinutes * 60_000 };
      return done({ sessions: [...state.sessions, session] }, id);
    }
    case 'session/join':
    case 'session/leave':
    case 'session/save':
    case 'session/unsave': {
      const session = state.sessions.find(item => item.id === action.id);
      if (!session) return fail('missing', 'Session unavailable.');
      if (action.type === 'session/save') return done({ savedSessionIds: [...new Set([...state.savedSessionIds, session.id])] });
      if (action.type === 'session/unsave') return done({ savedSessionIds: state.savedSessionIds.filter(saved => saved !== session.id) });
      const rules = sessionState(session, user.id, now);
      if (action.type === 'session/join') {
        if (rules.joined || rules.hosting) return done();
        if (rules.ended) return fail('ended', 'This session has ended.');
        if (rules.full) return fail('full', 'This session is full.');
      }
      if (action.type === 'session/leave' && rules.hosting) return fail('forbidden', 'Hosts must stay in their own sessions.');
      const attendeeIds = action.type === 'session/join'
        ? [...session.attendeeIds, user.id]
        : session.attendeeIds.filter(attendee => attendee !== user.id);
      return done({ sessions: state.sessions.map(item => item.id === session.id ? { ...item, attendeeIds } : item) });
    }
    case 'post/create': {
      const { title, description, course, topic } = action.draft;
      if (!title.trim() || !description.trim() || !(course?.trim() || topic?.trim())) return fail('invalid', 'Enter a title, course or topic, and description.');
      return done({ posts: [...state.posts, { ...action.draft, id, authorId: user.id, createdAt: now }] }, id);
    }
    case 'post/connect': {
      const post = state.posts.find(item => item.id === action.postId);
      if (!post) return fail('missing', 'Partner post unavailable.');
      if (post.authorId === user.id) return fail('forbidden', 'Choose a post from another student.');
      const existing = findThreadByPerson(state, post.authorId);
      if (existing?.postIds.includes(post.id)) return done({}, existing.id);
      const thread: Thread = existing ? { ...existing, postIds: [...existing.postIds, post.id] } : {
        id, personId: post.authorId, postIds: [post.id],
        messages: [{ id: id + '-intro', authorId: user.id, text: 'Hi! I saw your partner post.', sentAt: now, course: post.course }],
        pendingReply: { id: id + '-reply', text: 'Thanks for reaching out! (Simulated reply)', dueAt: now + 1_200, course: post.course },
      };
      return done({ threads: existing ? updateThread(thread) : [...state.threads, thread], postToThread: { ...state.postToThread, [post.id]: thread.id } }, thread.id);
    }
    case 'chat/send':
    case 'chat/read': {
      const thread = state.threads.find(item => item.id === action.threadId);
      if (!thread) return fail('missing', 'Conversation unavailable.');
      if (action.type === 'chat/read') return done({ threads: updateThread({ ...thread, readAt: now }) });
      const text = action.text.trim();
      if (!text) return fail('invalid', 'Enter a message.');
      const { course } = action;
      return done({ threads: updateThread({
        ...thread, messages: [...thread.messages, { id, authorId: user.id, text, sentAt: now, course }],
        pendingReply: thread.pendingReply ?? { id: id + '-reply', text: 'Sounds good. (Simulated reply)', dueAt: now + 1_200, course },
      }) }, id);
    }
    case 'availability/upsert':
    case 'availability/remove': {
      const course = normalizeCourse(action.course);
      const mine = state.availability[user.id] ?? {};
      const { window } = action;
      if (!course || (action.type === 'availability/upsert' && !validWindow(window, now))) return fail('invalid', 'Enter a valid course and a date with time remaining.');
      const remove = action.type === 'availability/remove' ? window : action.previous;
      const remaining = (mine[course] ?? []).filter(item => (!remove || !sameWindow(item, remove)) && (action.type === 'availability/remove' || !sameWindow(item, window)));
      const windows = action.type === 'availability/upsert' ? [...remaining, window] : remaining;
      return done({ availability: { ...state.availability, [user.id]: { ...mine, [course]: windows } } });
    }
    case 'invite/send': {
      const draft = action.draft;
      const course = normalizeCourse(draft.course);
      if (!state.people.some(person => person.id === draft.personId) || !course
        || !Number.isFinite(draft.startsAt) || !Number.isFinite(draft.endsAt) || draft.startsAt <= now || draft.endsAt <= draft.startsAt) {
        return fail('invalid', 'Choose a student, course, and future time.');
      }
      return done({ invites: [...state.invites, { ...draft, id, course, status: 'pending', acceptAt: now + 2_000 }] }, id);
    }
    case 'project/create': {
      const { draft } = action;
      const openRoles = draft.openRoles.map(role => role.trim()).filter(Boolean);
      if (!draft.title.trim() || !draft.pitch.trim() || !openRoles.length || !Number.isInteger(draft.capacity)
        || draft.capacity < 2 || !(draft.course?.trim() || draft.category?.trim())) return fail('invalid', 'Enter a title, pitch, category or course, role, and team size.');
      return done({ projects: [...state.projects, { ...draft, openRoles, id, ownerId: user.id, teamIds: [user.id], createdAt: now }] }, id);
    }
    case 'project/request':
    case 'project/cancel': {
      const project = state.projects.find(item => item.id === action.id);
      if (!project) return fail('missing', 'Project unavailable.');
      const matching = (item: CampusState['memberships'][number]) => item.userId === user.id && item.projectId === project.id;
      const membership = state.memberships.find(matching);
      if (action.type === 'project/cancel') return done({ memberships: state.memberships.filter(item => !matching(item) || item.status !== 'requested') });
      if (membership || project.ownerId === user.id || project.teamIds.includes(user.id)) return done();
      if (project.teamIds.length >= project.capacity) return fail('full', 'This team is full.');
      return done({ memberships: [...state.memberships, { userId: user.id, projectId: project.id, status: 'requested' }] });
    }
    case 'profile/update': {
      const name = action.profile.name.trim();
      if (!name) return fail('invalid', 'Enter a display name.');
      return done({ currentUser: { ...user, name, major: action.profile.major?.trim(), initials: undefined } });
    }
    case 'notification/read':
    case 'notification/readAll':
      return done({ notifications: state.notifications.map(item => action.type === 'notification/readAll' || item.id === action.id ? { ...item, read: true } : item) });
    case 'demo/reset':
      return [makeCampusFixtures(() => now), { ok: true }];
  }
}

function sameWindow(left: AvailabilityWindow, right: AvailabilityWindow) {
  return left.date === right.date && left.startMinute === right.startMinute && left.endMinute === right.endMinute;
}

function validWindow(window: AvailabilityWindow, now: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(window.date) || !Number.isInteger(window.startMinute) || !Number.isInteger(window.endMinute)
    || window.startMinute < 0 || window.endMinute > 1440 || window.endMinute <= window.startMinute) return false;
  const date = new Date(window.date + 'T00:00:00');
  const [year, month, day] = window.date.split('-').map(Number);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) return false;
  date.setMinutes(window.endMinute);
  return date.getTime() > now;
}

export function advanceCampus(state: CampusState, now: number): CampusState {
  const threads = state.threads.map(thread => {
    const reply = thread.pendingReply;
    if (!reply || reply.dueAt > now) return thread;
    return { ...thread, pendingReply: undefined, messages: [...thread.messages, { id: reply.id, authorId: thread.personId, text: reply.text, course: reply.course, sentAt: reply.dueAt }] };
  });
  const sessions = [...state.sessions];
  const notifications = [...state.notifications];
  const invites = state.invites.map(invite => {
    if (invite.status !== 'pending' || invite.acceptAt === undefined || invite.acceptAt > now) return invite;
    const sessionId = invite.id + '-session';
    sessions.push({
      id: sessionId, title: invite.course + ' study session', course: invite.course, hostId: state.currentUser.id,
      attendeeIds: [state.currentUser.id, invite.personId], startsAt: invite.startsAt, endsAt: invite.endsAt, createdAt: invite.acceptAt, location: invite.location,
    });
    notifications.push({ id: invite.id + '-notice', title: 'Invite accepted', body: 'A fictional classmate accepted your invite. This is a simulation.', createdAt: invite.acceptAt, read: false, href: '/session/' + sessionId });
    return { ...invite, status: 'accepted' as const, sessionId };
  });
  return sessions.length !== state.sessions.length || threads.some((thread, index) => thread !== state.threads[index])
    ? { ...state, threads, invites, sessions, notifications }
    : state;
}
