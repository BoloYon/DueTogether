import assert from 'node:assert/strict';
import test from 'node:test';

import { composerCourses, threadContexts, threadSummaries, totalUnread, unreadCount, validateMessage } from '@/features/chat/logic';
import { advanceCampus, transitionCampus } from '@/shared/mockCampus';
import { makeCampusFixtures } from '@/shared/mockData';
import { findAvailabilityOverlaps } from '@/shared/selectors';
import type { CampusAction, CampusState } from '@/shared/types';
import { availabilityError, buildWindow, connectState, inviteDraftFromMatch, inviteForMatch, isContact, minuteToInput, myWindows, searchPartners, windowPassed } from './logic';
import { atMinute, dayKeyOf, parseTimeOfDay } from '@/components/campus/format';

const now = new Date(2026, 10, 21, 12).getTime();
const seed = () => makeCampusFixtures(() => now);
let seq = 0;
const run = (state: CampusState, action: CampusAction, at = now) => transitionCampus(advanceCampus(state, at), action, at, 'b1p-' + ++seq);

test('first contact creates one thread with intro; second post reuses it; same post is a no-op', () => {
  let state = seed();
  const dev = state.posts.find(post => post.id === 'dev-1')!;
  assert.equal(isContact(state, 'dev'), false);
  assert.deepEqual(connectState(state, dev), { label: 'Connect', disabled: false });

  let result;
  [state, result] = run(state, { type: 'post/connect', postId: 'dev-1' });
  assert.ok(result.ok && result.id);
  const devThreadId = result.id!;
  assert.equal(state.threads.filter(thread => thread.personId === 'dev').length, 1);
  assert.equal(isContact(state, 'dev'), true);
  assert.equal(connectState(state, state.posts.find(post => post.id === 'dev-1')!).threadId, devThreadId, 'button becomes Message');

  // Mira already has a thread from mira-1; connecting on mira-2 reuses it and adds context.
  const mira2 = state.posts.find(post => post.id === 'mira-2')!;
  assert.equal(connectState(state, mira2).label, 'Connect');
  [state, result] = run(state, { type: 'post/connect', postId: 'mira-2' });
  assert.deepEqual(result, { ok: true, id: 'thread-mira' });
  const mira = state.threads.find(thread => thread.id === 'thread-mira')!;
  assert.deepEqual(threadContexts(state, mira).map(context => context.postId), ['mira-1', 'mira-2']);
  assert.deepEqual(composerCourses(state, mira), ['MAT 240']);

  const before = state;
  [state, result] = run(state, { type: 'post/connect', postId: 'mira-2' });
  assert.deepEqual(result, { ok: true, id: 'thread-mira' });
  assert.deepEqual(state.threads, before.threads, 'same post twice is a no-op');
});

test('chat: validation, unread from thread state, simulated reply delivered once after leaving the screen', () => {
  let state = seed();
  assert.equal(validateMessage('   '), 'Type a message first.');
  assert.equal(validateMessage('x'.repeat(501)), 'Keep messages under 500 characters.');
  const mira = () => state.threads.find(thread => thread.id === 'thread-mira')!;
  assert.equal(unreadCount(mira()), 1, 'seed message from Mira is unread');
  assert.equal(totalUnread(state), 1);

  [state] = run(state, { type: 'chat/read', threadId: 'thread-mira' });
  assert.equal(unreadCount(mira()), 0);
  [state] = run(state, { type: 'chat/send', threadId: 'thread-mira', text: '  Library at 3? ', course: 'MAT 240' });
  assert.equal(mira().messages.at(-1)?.text, 'Library at 3?');
  assert.ok(mira().pendingReply, 'typing indicator source');
  assert.equal(threadSummaries(state)[0].thread.id, 'thread-mira');

  // The user has navigated away: the provider advances time without the chat screen.
  state = advanceCampus(state, now + 5_000);
  assert.equal(mira().pendingReply, undefined);
  assert.equal(unreadCount(mira()), 1, 'reply shows as unread');
  const delivered = mira().messages.length;
  state = advanceCampus(state, now + 10_000);
  assert.equal(mira().messages.length, delivered, 'delivered once');
});

test('search finds posts and people by course, topic and name', () => {
  const state = seed();
  assert.deepEqual(searchPartners(state, 'mat 240').posts.map(post => post.id), ['mira-1', 'mira-2']);
  assert.deepEqual(searchPartners(state, 'dev').posts.map(post => post.id), ['dev-1']);
  assert.deepEqual(searchPartners(state, 'noa').people.map(person => person.id), ['noa']);
  assert.deepEqual(searchPartners(state, '', 'phy 220').people.map(person => person.id), ['dev', 'noa']);
  assert.equal(searchPartners(state, 'zzz').posts.length, 0);
});

test('availability: validate, add, edit, remove, then match and invite once into one session', () => {
  let state = seed();
  assert.equal(parseTimeOfDay('2:30 pm'), 870);
  assert.equal(parseTimeOfDay('25:00'), null);
  const tomorrow = myWindows(state, 'MAT 240')[0].date;
  assert.equal(buildWindow(tomorrow, '12:00', '11:00', now).ok, false);
  const expired = buildWindow(dayKeyOf(now), '08:00', '09:00', now);
  assert.ok(!expired.ok && expired.field === 'end');

  const added = buildWindow(tomorrow, '14:00', '15:30', now);
  assert.ok(added.ok);
  [state] = run(state, { type: 'availability/upsert', course: 'mat 240', window: added.window });
  assert.equal(myWindows(state, 'MAT 240').length, 2);
  const original = myWindows(state, 'MAT 240')[0];
  assert.equal(minuteToInput(original.startMinute), '10:00');
  const edited = buildWindow(tomorrow, '10:30', '12:00', now);
  assert.ok(edited.ok);
  [state] = run(state, { type: 'availability/upsert', course: 'MAT 240', window: edited.window, previous: original });
  assert.deepEqual(myWindows(state, 'MAT 240').map(window => window.startMinute), [630, 840]);
  [state] = run(state, { type: 'availability/remove', course: 'MAT 240', window: added.window });
  assert.equal(myWindows(state, 'MAT 240').length, 1);
  assert.equal(windowPassed(myWindows(state, 'MAT 240')[0], now), false);

  const matches = findAvailabilityOverlaps(state, 'MAT 240', now);
  assert.deepEqual(matches.map(match => [match.personId, match.startMinute, match.endMinute]), [['mira', 660, 720], ['dev', 690, 720]]);
  const match = matches[0];
  assert.equal(inviteForMatch(state, match), undefined);
  let result;
  [state, result] = run(state, { type: 'invite/send', draft: inviteDraftFromMatch(match, ' Library ') });
  assert.ok(result.ok);
  assert.equal(inviteForMatch(state, match)?.status, 'pending');
  assert.equal(inviteForMatch(state, match)?.location, 'Library');

  const sessionsBefore = state.sessions.length;
  state = advanceCampus(state, now + 5_000);
  state = advanceCampus(state, now + 9_000);
  const invite = inviteForMatch(state, match)!;
  assert.equal(invite.status, 'accepted');
  assert.equal(state.sessions.length, sessionsBefore + 1, 'exactly one session');
  const session = state.sessions.find(item => item.id === invite.sessionId)!;
  assert.deepEqual([...session.attendeeIds].sort(), ['mira', 'you']);
  assert.ok(state.notifications.some(item => item.href === '/session/' + session.id && !item.read));
});

test('polish: a sent invite stays matched while the same-day overlap is trimmed minute by minute', () => {
  let state = seed();
  const day = myWindows(state, 'MAT 240')[0].date;
  const inOverlap = atMinute(day, 11 * 60 + 35) + 20_000;
  const first = findAvailabilityOverlaps(state, 'MAT 240', inOverlap).find(match => match.personId === 'mira')!;
  let result;
  [state, result] = run(state, { type: 'invite/send', draft: inviteDraftFromMatch(first, undefined, inOverlap) }, inOverlap);
  assert.ok(result.ok);
  const later = inOverlap + 90_000;
  const trimmed = findAvailabilityOverlaps(state, 'MAT 240', later).find(match => match.personId === 'mira')!;
  assert.notEqual(trimmed.startMinute, first.startMinute, 'fixture precondition: the start was trimmed');
  assert.equal(inviteForMatch(state, trimmed)?.id, result.ok ? result.id : undefined, 'the existing invite is still found, so Send stays hidden');
  state = advanceCampus(state, later + 5_000);
  assert.equal(state.sessions.filter(session => session.attendeeIds.includes('mira') && session.id.endsWith('-session')).length, 1);
});

test('polish: sending a match computed from a stale clock still starts in the future', () => {
  const state = seed();
  const day = myWindows(state, 'MAT 240')[0].date;
  const rendered = atMinute(day, 11 * 60 + 35) + 20_000;
  const match = findAvailabilityOverlaps(state, 'MAT 240', rendered).find(item => item.personId === 'mira')!;
  const pressed = rendered + 50_000;
  const draft = inviteDraftFromMatch(match, undefined, pressed);
  assert.ok(draft.startsAt > pressed && draft.endsAt === atMinute(day, match.endMinute));
  const [, result] = run(state, { type: 'invite/send', draft }, pressed);
  assert.ok(result.ok, 'stale render time no longer makes the invite invalid');
});

test('calendar editor rejects already-started windows and preserves valid future ranges', () => {
  const date = dayKeyOf(new Date(2026, 10, 21).getTime());
  const noon = new Date(2026, 10, 21, 12).getTime();
  assert.match(availabilityError({ date, startMinute: 700, endMinute: 800 }, noon) ?? '', /start time has passed/);
  assert.match(availabilityError({ date, startMinute: 960, endMinute: 960 }, noon) ?? '', /end time must be after/);
  assert.equal(availabilityError({ date, startMinute: 960, endMinute: 1080 }, noon), null);
  assert.equal(availabilityError({ date, startMinute: 1380, endMinute: 1440 }, noon), null);
});
