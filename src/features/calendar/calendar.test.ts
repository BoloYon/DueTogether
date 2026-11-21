import assert from 'node:assert/strict';
import test from 'node:test';
import { makeCanvasFixtures } from '@/shared/mockData';
import type { CanvasItem } from '@/shared/types';
import {
  displayTitle, groupCalendar, isPast, itemDayKey, itemsByDay, monthGrid, relativeDayLabel, safeCanvasUrl, shiftMonth, studyDraftParams, timeLabel,
} from './model';

const now = new Date(2026, 10, 21, 12).getTime();
const items = makeCanvasFixtures(() => now);
const base = { canvasId: 'x', courseName: 'Matrix Methods', courseCode: 'MAT 240' };

test('list splits Upcoming and Past by deadline or event end and groups by local day', () => {
  const { upcoming, past } = groupCalendar(items, now);
  assert.deepEqual(past.flatMap(group => group.items.map(item => item.id)), ['sample-homework-old']);
  assert.deepEqual(upcoming.map(group => group.key), ['2026-11-21', '2026-11-22', '2026-11-24', '2026-11-26', '2026-11-27']);
  assert.deepEqual(upcoming[0].items.map(item => item.id), ['sample-quiz']);
  const event: CanvasItem = { ...base, id: 'e', kind: 'event', title: 'Lab', startsAt: new Date(now - 3_600_000).toISOString(), endsAt: new Date(now + 3_600_000).toISOString() };
  assert.equal(isPast(event, now), false, 'an event in progress is not past');
  assert.equal(isPast(event, now + 2 * 3_600_000), true);
});

test('exams & quizzes filter applies to list and month markers', () => {
  const { upcoming } = groupCalendar(items, now, true);
  assert.ok(upcoming.every(group => group.items.every(item => item.kind === 'quiz' || item.kind === 'exam')));
  const markers = itemsByDay(items, true);
  assert.ok(!markers.has('2026-11-22'), 'homework day has no marker when filtered');
  assert.ok(markers.has('2026-11-24'));
});

test('all-day dates are kept as local day keys, never shifted', () => {
  const allDay: CanvasItem = { ...base, id: 'a', kind: 'event', title: 'Holiday', allDayDate: '2026-11-26' };
  assert.equal(itemDayKey(allDay), '2026-11-26');
  assert.equal(timeLabel(allDay), 'All day');
  assert.equal(isPast(allDay, new Date(2026, 10, 26, 23, 59).getTime()), false);
  assert.equal(isPast(allDay, new Date(2026, 10, 27, 0, 0).getTime()), true);
});

test('month grid has weekday-aligned whole weeks and month navigation wraps years', () => {
  const grid = monthGrid(2026, 10);
  assert.equal(grid[0][0].key, '2026-11-01', 'November 2026 starts on a Sunday');
  assert.ok(grid.every(week => week.length === 7));
  assert.ok(grid.flat().some(cell => cell.key === '2026-11-30' && cell.inMonth));
  assert.equal(monthGrid(2026, 7)[0][0].key, '2026-07-26');
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
});

test('relative day labels use local midnight boundaries', () => {
  assert.equal(relativeDayLabel('2026-11-21', now), 'Today');
  assert.equal(relativeDayLabel('2026-11-22', new Date(2026, 10, 21, 23, 59).getTime()), 'Tomorrow');
  assert.equal(relativeDayLabel('2026-11-24', now), 'Tuesday');
  assert.equal(relativeDayLabel('2026-12-07', now), 'Mon, Dec 7');
});

test('Respondus note becomes a LockDown tag and is removed from the display title', () => {
  const noted: CanvasItem = { ...base, id: 'q', kind: 'quiz', title: 'Quiz 4 (Requires Respondus LockDown Browser)' };
  assert.deepEqual(displayTitle(noted), { title: 'Quiz 4', lockdown: true });
  assert.deepEqual(displayTitle({ ...noted, title: 'Midterm - Respondus LockDown Browser Required' }), { title: 'Midterm', lockdown: true });
  assert.deepEqual(displayTitle({ ...noted, title: 'Plain quiz' }), { title: 'Plain quiz', lockdown: false });
  assert.deepEqual(displayTitle({ ...noted, title: 'Exam', lockdown: true }), { title: 'Exam', lockdown: true });
});

test('Study for this yields the agreed draft params', () => {
  const quiz = items.find(item => item.id === 'sample-quiz')!;
  assert.deepEqual(studyDraftParams(quiz), { kind: 'session', title: 'Study for Matrix check-in', course: 'MAT 240' });
  assert.deepEqual(studyDraftParams({ ...quiz, courseCode: undefined, title: 'Quiz (Respondus LockDown Browser)' }), { kind: 'session', title: 'Study for Quiz', course: 'Matrix Methods' });
});

test('Open in Canvas only uses https item URLs', () => {
  const item = items[0];
  assert.equal(safeCanvasUrl({ ...item, htmlUrl: 'https://school.example.edu/courses/1/assignments/2' }), 'https://school.example.edu/courses/1/assignments/2');
  assert.equal(safeCanvasUrl({ ...item, htmlUrl: 'http://school.example.edu/x' }), null);
  assert.equal(safeCanvasUrl({ ...item, htmlUrl: 'javascript:alert(1)' }), null);
  assert.equal(safeCanvasUrl(item), null);
});
