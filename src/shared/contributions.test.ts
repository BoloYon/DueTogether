import assert from 'node:assert/strict';
import test from 'node:test';

import { contributionLevel, contributionTotal, hasContributionCredit, recordContributionCredits } from './contributions';
import { transitionCampus } from './mockCampus';
import { makeCampusFixtures } from './mockData';
import { BIO_LIMIT, FILE_LIMIT, countGraphemes, validFileSize } from './profile-media';
import type { CampusAction, CampusState } from './types';

const now = 1_800_000_000_000;
const fixtures = () => makeCampusFixtures(() => now);

function apply(state: CampusState, action: CampusAction, id = 'new') {
  const [next, result] = transitionCampus(state, action, now, id);
  assert.equal(result.ok, true);
  return next;
}

test('awards activity credit only once and keeps earned credit when someone leaves', () => {
  const initial = fixtures();
  const mira = initial.people[0];
  let state = apply(initial, { type: 'session/create', draft: {
    title: 'Brush up on matrices', course: 'MAT 240', startsAt: now + 60_000, durationMinutes: 30,
  } }, 'hosted');
  state = apply(state, { type: 'post/create', draft: {
    title: 'Find a study partner', course: 'MAT 240', description: 'Practice questions',
  } }, 'authored');
  state = apply(state, { type: 'project/create', draft: {
    title: 'Prototype', pitch: 'Try an idea', capacity: 3, category: 'Personal', openRoles: ['Engineer'],
  } }, 'owned');

  assert.equal(contributionTotal(state, 'you'), 0);
  const viewer = { ...state, currentUser: mira, people: [state.currentUser, ...state.people.slice(1)] };
  const pending = apply(viewer, { type: 'project/request', id: 'owned' });
  assert.equal(hasContributionCredit(pending, 'project', 'owned'), false);
  const joined = apply(pending, { type: 'session/join', id: 'hosted' });
  const left = apply(joined, { type: 'session/leave', id: 'hosted' });
  assert.equal(hasContributionCredit(left, 'session', 'hosted'), true);
  state = { ...left, currentUser: initial.currentUser, people: initial.people };

  state = apply(state, { type: 'demo/contribute', kind: 'project', id: 'owned' });
  state = apply(state, { type: 'demo/contribute', kind: 'project', id: 'owned' });
  assert.deepEqual(state.projects.find(item => item.id === 'owned')?.teamIds, ['you', mira.id]);
  assert.deepEqual(state.memberships.filter(item => item.projectId === 'owned'),
    [{ projectId: 'owned', userId: mira.id, status: 'member' }]);
  state = apply(state, { type: 'demo/contribute', kind: 'post', id: 'authored' }, 'incoming');
  state = apply(state, { type: 'demo/contribute', kind: 'post', id: 'authored' }, 'again');
  assert.equal(state.threads.find(item => item.personId === mira.id)?.messages.filter(item => item.id === 'incoming-intro').length, 1);
  assert.equal(contributionTotal(state, 'you'), 3);
  assert.equal(recordContributionCredits(state), state);
});

test('viewer stars are idempotent, reversible and cannot be cast on their own guide', () => {
  const initial = fixtures();
  const [collection] = initial.collections;
  const [guide] = collection.guides;
  const star = { type: 'guide/star', collectionId: collection.id, guideId: guide.id, starred: true } as const;
  const before = contributionTotal(initial, collection.ownerId);
  const starred = apply(apply(initial, star), star);
  assert.deepEqual(starred.collections[0].guides[0].starredBy, [initial.currentUser.id]);
  assert.equal(contributionTotal(starred, collection.ownerId), before + 1);
  const other = { ...starred, currentUser: initial.people[1] };
  const twice = apply(other, star);
  assert.equal(contributionTotal(twice, collection.ownerId), before + 2);
  const unstarred = apply(twice, { ...star, starred: false });
  assert.equal(contributionTotal(unstarred, collection.ownerId), before + 1);
  const owner = { ...unstarred, currentUser: initial.people[0] };
  const [same, result] = transitionCampus(owner, star, now, 'unused');
  assert.equal(result.ok, false);
  assert.equal(same, owner);
});

test('contribution thresholds and bio limits use the exact approved boundaries', () => {
  assert.deepEqual([0, 1, 9, 10, 24, 25, 49, 50, 125].map(contributionLevel), [
    '🌑 New Moon', '☄️ Comet', '☄️ Comet', '⭐ Rising Star', '⭐ Rising Star',
    '🌌 Nebula', '🌌 Nebula', '🌀 Galactic Core', '🌀 Galactic Core',
  ]);
  const bio = '👨🏽‍🚀🇧🇷é'.repeat(50);
  assert.equal(countGraphemes(bio), BIO_LIMIT);
  const initial = fixtures();
  const profile = { name: 'Avery', bio };
  const edited = apply(initial, { type: 'profile/update', profile });
  assert.equal(edited.currentUser.bio, bio);
  assert.equal(transitionCampus(edited, { type: 'profile/update', profile: { ...profile, bio: bio + '🌟' } }, now, 'unused')[1].ok, false);
  assert.equal(validFileSize(FILE_LIMIT), true);
  for (const bytes of [0, NaN, 1.2, FILE_LIMIT + 1]) assert.equal(validFileSize(bytes), false);
});
