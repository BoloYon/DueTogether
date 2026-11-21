import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSessionDraft, initialSessionForm } from '@/features/create/drafts';
import { transitionCampus } from '@/shared/mockCampus';
import { makeCampusFixtures } from '@/shared/mockData';
import { selectFeedSections } from '@/shared/selectors';
import type { CampusAction, CampusState } from '@/shared/types';
import { describeSession } from './logic';

const now = new Date(2026, 10, 21, 12).getTime();
const seed = () => makeCampusFixtures(() => now);
let seq = 0;
const run = (state: CampusState, action: CampusAction, at = now) => transitionCampus(state, action, at, 'b1-' + ++seq);
const session = (state: CampusState, id: string) => state.sessions.find(item => item.id === id)!;

test('live session: join, leave and save are independent and reflected in the view and Feed', () => {
  let state = seed();
  let view = describeSession(session(state, 'live'), state, now);
  assert.equal(view.phase, 'live');
  assert.deepEqual(view.attendance, { action: 'session/join', label: 'Join now' });
  assert.equal(view.capacityText, '2 of 6 spots taken');

  [state] = run(state, { type: 'session/join', id: 'live' });
  view = describeSession(session(state, 'live'), state, now);
  assert.equal(view.joined, true);
  assert.equal(view.attendance?.action, 'session/leave');
  assert.equal(view.capacityText, '3 of 6 spots taken');
  assert.equal(view.saved, false, 'joining does not save');
  assert.equal(selectFeedSections(state, [], now).happeningNow[0].attendeeIds.length, 3, 'Feed sees the same attendee count');

  [state] = run(state, { type: 'session/save', id: 'live' });
  [state] = run(state, { type: 'session/leave', id: 'live' });
  view = describeSession(session(state, 'live'), state, now);
  assert.equal(view.joined, false);
  assert.equal(view.saved, true, 'leaving keeps the save');
});

test('full, ended and hosting sessions expose no attendance action', () => {
  const state = seed();
  assert.equal(describeSession(session(state, 'full'), state, now).attendance, null);
  assert.equal(describeSession(session(state, 'full'), state, now).attendanceNote, 'This session is full.');
  assert.equal(describeSession(session(state, 'ended'), state, now).phase, 'ended');
  assert.equal(describeSession(session(state, 'ended'), state, now).attendance, null);
  const upcoming = describeSession(session(state, 'upcoming'), state, now);
  assert.equal(upcoming.saved, true);
  assert.equal(upcoming.placeText, 'Online');
  assert.match(upcoming.timingText, /^Starts in 2 h$/);
});

test('Canvas "Study for this" params prefill a session draft that creates a hosted session', () => {
  const form = initialSessionForm({ kind: 'session', title: 'Study for Matrix methods exam', course: 'mat 240' }, now);
  assert.equal(form.title, 'Study for Matrix methods exam');
  assert.equal(form.course, 'MAT 240');
  assert.equal(form.subjectMode, 'course');

  const missingLocation = buildSessionDraft(form, now);
  assert.equal(missingLocation.ok, false);
  assert.ok(!missingLocation.ok && missingLocation.errors.location);

  const built = buildSessionDraft({ ...form, location: 'Juniper Study Loft', capacity: '5' }, now);
  assert.ok(built.ok);
  const [state, result] = run(seed(), { type: 'session/create', draft: built.draft });
  assert.ok(result.ok && result.id);
  const created = session(state, result.id!);
  assert.equal(created.course, 'MAT 240');
  assert.equal(created.endsAt - created.startsAt, 60 * 60_000);
  const view = describeSession(created, state, now);
  assert.equal(view.hosting, true);
  assert.equal(view.attendance, null);
  assert.equal(view.attendanceNote, 'You are hosting this session.');
});

test('normal creation without params starts blank and validates', () => {
  const form = initialSessionForm({}, now);
  assert.equal(form.title, '');
  const built = buildSessionDraft(form, now);
  assert.ok(!built.ok);
  assert.ok(built.errors.title && built.errors.course);
  const past = buildSessionDraft({ ...form, title: 'x', course: 'PHY 220', location: 'Lab', startTime: '09:00' }, now);
  assert.ok(!past.ok && past.errors.startTime === 'Choose a start time in the future.');
  const badCapacity = buildSessionDraft({ ...form, title: 'x', subjectMode: 'topic', topic: 'Resume review', format: 'online', capacity: '1' }, now);
  assert.ok(!badCapacity.ok && badCapacity.errors.capacity);
  const online = buildSessionDraft({ ...form, title: 'x', subjectMode: 'topic', topic: 'Resume review', format: 'online' }, now);
  assert.ok(online.ok && online.draft.topic === 'Resume review' && online.draft.course === undefined);
});
