
import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceCampus, transitionCampus } from './mockCampus';
import { makeCampusFixtures, makeCanvasFixtures } from './mockData';
import { findAvailabilityOverlaps, selectFeedSections } from './selectors';

const now = new Date(2026, 10, 21, 12).getTime();
const seed = () => makeCampusFixtures(() => now);

test('Feed groups sessions and limits upcoming deadlines', () => {
  const sections = selectFeedSections(seed(), makeCanvasFixtures(() => now), now);
  assert.deepEqual(sections.happeningNow.map(item => item.id), ['live']);
  assert.deepEqual(sections.comingUp.map(item => item.id), ['upcoming', 'full']);
  assert.equal(sections.dueSoon.length, 3);
});

test('session joins are idempotent and respect capacity', () => {
  const start = seed();
  const [joined] = transitionCampus(start, { type: 'session/join', id: 'live' }, now, 'join');
  const [repeated] = transitionCampus(joined, { type: 'session/join', id: 'live' }, now, 'repeat');
  assert.deepEqual(repeated.sessions, joined.sessions);
  assert.equal(joined.sessions[0].attendeeIds.filter(id => id === 'you').length, 1);
  assert.deepEqual(transitionCampus(joined, { type: 'session/join', id: 'full' }, now, 'full')[1], {
    ok: false, error: 'full', message: 'This session is full.',
  });
});

test('second partner post reuses the thread and simulated reply delivers once', () => {
  const [linked, result] = transitionCampus(seed(), { type: 'post/connect', postId: 'mira-2' }, now, 'unused');
  assert.deepEqual(result, { ok: true, id: 'thread-mira' });
  assert.deepEqual(linked.threads[0].postIds, ['mira-1', 'mira-2']);
  const [pending] = transitionCampus(linked, { type: 'chat/send', threadId: 'thread-mira', text: 'Hello' }, now, 'message');
  const sent = advanceCampus(pending, now + 2_000);
  assert.equal(sent.threads[0].messages.at(-1)?.id, 'message-reply');
  assert.equal(advanceCampus(sent, now + 3_000), sent);
});

test('availability matches in order and accepting an invite creates one session', () => {
  const state = seed();
  assert.deepEqual(findAvailabilityOverlaps(state, ' mat  240 ', now).map(match => match.personId), ['mira', 'dev']);
  const [pending] = transitionCampus(state, { type: 'invite/send', draft: {
    personId: 'mira', course: 'MAT 240', startsAt: now + 3_600_000, endsAt: now + 7_200_000,
  } }, now, 'invite');
  const accepted = advanceCampus(pending, now + 3_000);
  assert.equal(accepted.invites[0].sessionId, 'invite-session');
  assert.equal(accepted.sessions.length, state.sessions.length + 1);
  assert.equal(advanceCampus(accepted, now + 4_000), accepted);
});

test('project requests leave the roster and connections alone', () => {
  const state = seed();
  const [requested] = transitionCampus(state, { type: 'project/request', id: 'garden' }, now, 'request');
  assert.deepEqual(requested.memberships.at(-1), { userId: 'you', projectId: 'garden', status: 'requested' });
  assert.equal(requested.projects, state.projects);
  assert.equal(requested.threads, state.threads);
  const [cancelled] = transitionCampus(requested, { type: 'project/cancel', id: 'garden' }, now, 'cancel');
  assert.deepEqual(cancelled.memberships, state.memberships);
});
