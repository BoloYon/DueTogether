import assert from 'node:assert/strict';
import test from 'node:test';
import { transitionCampus } from '@/shared/mockCampus';
import { makeCampusFixtures, makeCanvasFixtures } from '@/shared/mockData';
import {
  feedSections, initialGraphSection, isKnownContact, postStatus, projectStatus, SECTION_ORDER, SECTION_TITLES, timeLeftLabel,
} from './model';

const now = new Date(2026, 10, 21, 12).getTime();
const seed = () => makeCampusFixtures(() => now);

test('sections follow the documented order', () => {
  assert.deepEqual(SECTION_ORDER.map(key => SECTION_TITLES[key]), ['Happening Now', 'Due Soon', 'Coming Up', 'Partners Wanted', 'New Projects']);
});

test('live and upcoming never overlap; ended sessions leave both; grouping refreshes with time', () => {
  const state = seed();
  const items = makeCanvasFixtures(() => now);
  const at = (time: number) => feedSections(state, items, time);
  const ids = (time: number) => ({ live: at(time).happeningNow.map(s => s.id), next: at(time).comingUp.map(s => s.id) });
  assert.deepEqual(ids(now), { live: ['live'], next: ['upcoming', 'full'] });
  const later = now + 2 * 3_600_000 + 1;
  assert.deepEqual(ids(later), { live: ['upcoming'], next: ['full'] }, 'live session ended, upcoming started');
  for (const time of [now, later, now + 10 * 3_600_000]) {
    const { live, next } = ids(time);
    assert.ok(!live.some(id => next.includes(id)));
    assert.ok(!live.includes('ended') && !next.includes('ended'));
  }
});

test('featured live session is the one with the largest attendance', () => {
  const state = seed();
  const bigger = { ...state.sessions[1], id: 'big', startsAt: now - 60_000, endsAt: now + 60 * 60_000, attendeeIds: ['noa', 'mira', 'dev'] };
  const sections = feedSections({ ...state, sessions: [...state.sessions, bigger] }, [], now);
  assert.equal(sections.happeningNow[0].id, 'big');
});

test('initial graph section is Happening Now or the first populated one', () => {
  const state = seed();
  assert.equal(initialGraphSection(feedSections(state, [], now)), 'happeningNow');
  const noLive = { ...state, sessions: state.sessions.filter(s => s.id !== 'live') };
  assert.equal(initialGraphSection(feedSections(noLive, [], now)), 'comingUp');
  assert.equal(initialGraphSection(feedSections(noLive, makeCanvasFixtures(() => now), now)), 'dueSoon');
});

test('partner post status reflects real threads; second post by the same author reuses the thread', () => {
  const state = seed();
  const post = (id: string) => state.posts.find(item => item.id === id)!;
  assert.deepEqual(postStatus(state, post('mira-1')), { kind: 'linked', threadId: 'thread-mira' });
  assert.deepEqual(postStatus(state, post('mira-2')), { kind: 'known', threadId: 'thread-mira' });
  assert.deepEqual(postStatus(state, post('dev-1')), { kind: 'new' });
  const [next, result] = transitionCampus(state, { type: 'post/connect', postId: 'mira-2' }, now, 'c');
  assert.deepEqual(result, { ok: true, id: 'thread-mira' });
  assert.deepEqual(postStatus(next, post('mira-2')), { kind: 'linked', threadId: 'thread-mira' });
});

test('project status uses shared memberships; a request is not a connection', () => {
  const state = seed();
  const garden = state.projects.find(p => p.id === 'garden')!;
  const wave = state.projects.find(p => p.id === 'wave')!;
  assert.equal(projectStatus(state, garden), 'open');
  assert.equal(projectStatus(state, wave), 'member');
  const [requested] = transitionCampus(state, { type: 'project/request', id: 'garden' }, now, 'r');
  assert.equal(projectStatus(requested, garden), 'requested');
  assert.equal(isKnownContact(requested, 'dev'), false);
  const [cancelled] = transitionCampus(requested, { type: 'project/cancel', id: 'garden' }, now, 'c');
  assert.equal(projectStatus(cancelled, garden), 'open');
  assert.equal(projectStatus(state, { ...garden, teamIds: ['dev', 'mira', 'noa', 'x'] }), 'full');
});

test('time left label', () => {
  const live = seed().sessions[0];
  assert.equal(timeLeftLabel(live, now), '1h left');
  assert.equal(timeLeftLabel(live, now + 35 * 60_000), '25m left');
});
