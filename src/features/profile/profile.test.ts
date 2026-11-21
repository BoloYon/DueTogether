import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPostDraft, buildProjectDraft, initialPostForm, initialProjectForm, parseRoles, resolveKind } from '@/features/create/drafts';
import { safeHref, sortedNotifications, unreadNotificationCount } from '@/features/notifications/logic';
import { describeProject, projectStatus, sortedProjects } from '@/features/projects/logic';
import { transitionCampus } from '@/shared/mockCampus';
import { makeCampusFixtures } from '@/shared/mockData';
import type { CampusAction, CampusState } from '@/shared/types';
import { profileSections, validateProfile } from './logic';

const now = new Date(2026, 10, 21, 12).getTime();
const seed = () => makeCampusFixtures(() => now);
let seq = 0;
const run = (state: CampusState, action: CampusAction) => transitionCampus(state, action, now, 'b1q-' + ++seq);
const project = (state: CampusState, id: string) => state.projects.find(item => item.id === id)!;

test('project request and cancel use shared membership state and never touch the roster', () => {
  let state = seed();
  assert.equal(projectStatus(state, project(state, 'wave')), 'member');
  assert.equal(describeProject(state, project(state, 'wave')).action, null);
  assert.deepEqual(describeProject(state, project(state, 'garden')).action, { type: 'project/request', label: 'Ask to join' });

  const rosterBefore = project(state, 'garden').teamIds;
  const threadsBefore = state.threads;
  [state] = run(state, { type: 'project/request', id: 'garden' });
  const view = describeProject(state, project(state, 'garden'));
  assert.equal(view.status, 'requested');
  assert.deepEqual(view.action, { type: 'project/cancel', label: 'Cancel request' });
  assert.deepEqual(project(state, 'garden').teamIds, rosterBefore);
  assert.equal(state.threads, threadsBefore, 'no personal connection');
  assert.deepEqual(sortedProjects(state, 'mine').map(item => item.id).sort(), ['garden', 'wave']);
  assert.deepEqual(profileSections(state, now).requested.map(item => item.id), ['garden']);

  [state] = run(state, { type: 'project/cancel', id: 'garden' });
  assert.equal(projectStatus(state, project(state, 'garden')), 'open');
  assert.equal(profileSections(state, now).requested.length, 0);
});

test('project creation validates and the owner gets owner status', () => {
  assert.equal(resolveKind({ kind: 'project' }), 'project');
  assert.equal(resolveKind({ kind: 'bogus' as never }), 'session');
  assert.deepEqual(parseRoles('Design, firmware,\nDesign, '), ['Design', 'firmware']);
  const blank = buildProjectDraft(initialProjectForm({}));
  assert.ok(!blank.ok && blank.errors.title && blank.errors.pitch && blank.errors.roles);
  const tooMany = buildProjectDraft({ ...initialProjectForm({}), title: 'T', pitch: 'P', roles: 'a, b, c', capacity: '3' });
  assert.ok(!tooMany.ok && tooMany.errors.roles);
  const built = buildProjectDraft({ ...initialProjectForm({ course: 'phy 220' }), title: 'Lab rig', pitch: 'Build a rig.', roles: 'CAD, Code', capacity: '3' });
  assert.ok(built.ok && built.draft.course === 'PHY 220');
  const [state, result] = run(seed(), { type: 'project/create', draft: built.draft });
  assert.ok(result.ok && result.id);
  assert.equal(projectStatus(state, project(state, result.id!)), 'owner');
  assert.ok(profileSections(state, now).teams.some(item => item.id === result.id));
});

test('partner post creation shows under Your posts but not in Partners Wanted for yourself', () => {
  const built = buildPostDraft({ ...initialPostForm({ course: 'mat 240' }), title: 'Eigen drills', description: 'Practice set 4.' });
  assert.ok(built.ok);
  const [state, result] = run(seed(), { type: 'post/create', draft: built.draft });
  assert.ok(result.ok);
  assert.deepEqual(profileSections(state, now).posts.map(post => post.title), ['Eigen drills']);
  const invalid = buildPostDraft({ ...initialPostForm({}), subjectMode: 'topic' });
  assert.ok(!invalid.ok && invalid.errors.topic && invalid.errors.description);
});

test('profile edit validates, and reset demo data restores campus fixtures', () => {
  assert.deepEqual(validateProfile('   ', ''), { ok: false, field: 'name', error: 'Enter a display name.' });
  const checked = validateProfile('  Sam   Lee ', ' Robotics ');
  assert.deepEqual(checked, { ok: true, profile: { name: 'Sam Lee', major: 'Robotics' } });
  let state = seed();
  [state] = run(state, { type: 'profile/update', profile: checked.ok ? checked.profile : { name: '' } });
  assert.equal(state.currentUser.name, 'Sam Lee');
  [state] = run(state, { type: 'session/join', id: 'live' });
  assert.deepEqual(profileSections(state, now).going.map(item => item.id), ['live']);
  assert.deepEqual(profileSections(state, now).saved.map(item => item.id), ['upcoming']);

  [state] = run(state, { type: 'demo/reset' });
  assert.equal(state.currentUser.name, seed().currentUser.name);
  assert.equal(profileSections(state, now).going.length, 0);
});

test('notifications: unread count, mark read, mark all read, internal hrefs only', () => {
  let state = seed();
  assert.equal(unreadNotificationCount(state), 1);
  [state] = run(state, { type: 'notification/read', id: 'welcome' });
  assert.equal(unreadNotificationCount(state), 0);
  state = { ...state, notifications: [...state.notifications, { id: 'n2', title: 'A', body: 'B', createdAt: now, read: false }, { id: 'n3', title: 'C', body: 'D', createdAt: now + 1, read: false }] };
  assert.deepEqual(sortedNotifications(state).map(item => item.id), ['n3', 'n2', 'welcome']);
  [state] = run(state, { type: 'notification/readAll' });
  assert.equal(unreadNotificationCount(state), 0);
  assert.equal(safeHref('/session/x'), '/session/x');
  assert.equal(safeHref('https://example.com'), null);
  assert.equal(safeHref('//evil.example'), null);
});
