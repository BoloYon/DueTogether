import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CanvasRead } from '../../shared/types';
import { createCanvasTransport } from './index';
import { translateCanvas } from './translate';

const credential = { baseUrl: 'https://canvas.example.test', token: 'mock-credential' };
const range = { start: '2026-01-01T00:00:00Z', end: '2026-02-01T00:00:00Z' };
const account = { id: 10, name: 'Example Student' };
const assignment = {
  plannable_type: 'assignment', plannable_id: 4, course_id: 3,
  plannable: { title: 'Exam review quiz', quiz_id: 9, due_at: '2026-01-10T19:23:45-05:00' },
  html_url: '/courses/3/assignments/4',
};
const courses = [{ id: 3, name: 'Sample Science', nickname: 'Science Lab', course_code: 'SCI 101' }];

test('Canvas read verifies identity before paginating courses and querying the planner', async () => {
  const seen: string[] = [];
  const transport = createCanvasTransport({ fetch: async (href, init) => {
    const url = new URL(href);
    seen.push(url.pathname + (url.searchParams.get('page') ?? ''));
    assert.equal(url.origin, credential.baseUrl);
    assert.equal(init.method, 'GET');
    assert.equal(init.redirect, 'manual');
    assert.equal(new Headers(init.headers).get('authorization'), 'Bearer ' + credential.token);
    if (url.pathname.endsWith('/self')) return Response.json(account);
    if (url.pathname.endsWith('/courses')) {
      if (url.searchParams.has('page')) return Response.json(courses);
      assert.equal(url.searchParams.get('enrollment_state'), 'active');
      return Response.json([], { headers: { Link: '<?page=2>; rel="next", </api/v1/courses>; rel="last"' } });
    }
    assert.equal(url.searchParams.get('start_date'), range.start);
    assert.equal(url.searchParams.get('end_date'), range.end);
    return Response.json([assignment]);
  } });
  assert.deepEqual(await transport.read(credential, range), {
    ok: true, value: { account, courses, plannerItems: [assignment] },
  });
  assert.deepEqual(seen, ['/api/v1/users/self', '/api/v1/courses', '/api/v1/courses2', '/api/v1/planner/items']);
});

test('Canvas transport rejects credentialed origins, foreign next links, and redirects', async () => {
  for (const response of [
    Response.json([], { headers: { Link: '<https://other.example.test/items>; rel="next"' } }),
    Response.json([], { headers: { Link: '<blob:https://canvas.example.test/fixture>; rel="next"' } }),
    Response.json([], { headers: { Link: '<?Access_Token=mock-credential>; rel="next"' } }),
    Response.redirect('https://other.example.test/items'),
  ]) {
    let requests = 0;
    const transport = createCanvasTransport({ fetch: async () => { requests++; return response; } });
    const invalid = await transport.getSelf({ ...credential, baseUrl: 'https://user@canvas.example.test' });
    assert.equal(!invalid.ok && invalid.error.code, 'invalid-url');
    const unsafe = await transport.listPlannerItems(credential, range);
    assert.equal(!unsafe.ok && unsafe.error.code, 'unsafe-url');
    assert.equal(requests, 1);
  }
});

test('Canvas errors distinguish auth, rate limit, invalid responses, and network failures without raw details', async () => {
  const auth = createCanvasTransport({ fetch: async () => new Response('private diagnostic', { status: 401 }) });
  const denied = await auth.read(credential, range);
  assert.equal(!denied.ok && denied.error.code, 'auth');
  assert.doesNotMatch(JSON.stringify(denied), /diagnostic|example\.test|mock-credential/);
  const rate = createCanvasTransport({ fetch: async () => new Response('', { status: 429, headers: { 'Retry-After': '4' } }) });
  const limited = await rate.getSelf(credential);
  assert.equal(!limited.ok && limited.error.retryAfterMs, 4000);
  const invalid = createCanvasTransport({ fetch: async () => Response.json({}) });
  const malformed = await invalid.getSelf(credential);
  assert.equal(!malformed.ok && malformed.error.code, 'invalid-response');
  const offline = createCanvasTransport({ fetch: async () => { throw new Error('private diagnostic'); } });
  const network = await offline.getSelf(credential);
  assert.equal(!network.ok && network.error.code, 'network');
});

test('abort ends pagination and timeout bounds an unresponsive fetch', async () => {
  const controller = new AbortController();
  let requests = 0;
  const transport = createCanvasTransport({ fetch: async () => {
    requests++;
    controller.abort();
    return Response.json([], { headers: { Link: '<?page=2>; rel=next' } });
  } });
  const cancelled = await transport.listCourses(credential, { signal: controller.signal });
  assert.equal(!cancelled.ok && cancelled.error.code, 'cancelled');
  assert.equal(requests, 1);
  const hanging = createCanvasTransport({ timeoutMs: 5, fetch: () => new Promise(() => {}) });
  const timeout = await hanging.getSelf(credential);
  assert.equal(!timeout.ok && timeout.error.code, 'timeout');
});

test('translation keeps exact times, all-day dates and stable IDs while preferring student dates', () => {
  const due = '2026-01-11T21:12:43-05:00';
  const data: CanvasRead = { account, courses, plannerItems: [
    { ...assignment, plannable_date: due },
    assignment,
    { plannable_id: 4, plannable_type: 'calendar_event', plannable: {
      title: 'Sample Lab Day', all_day: true, all_day_date: '2026-01-09',
      start_at: '2026-01-09T00:00:00-05:00', end_at: '2026-01-09T23:59:00-05:00',
      html_url: 'https://unrelated.example.test/event',
    } },
    { ...assignment, plannable_id: 7, plannable: { title: 'Sample quiz' } },
    { ...assignment, plannable_id: 8, plannable: {
      title: 'Practice Quiz - Requires Respondus LockDown Browser', due_at: due,
    } },
  ] };
  const { items } = translateCanvas(data, credential.baseUrl);
  assert.equal(items.length, 3);
  const [quiz, event, lockdown] = items;
  assert.equal(quiz.dueDate, due);
  assert.equal(quiz.kind, 'quiz');
  assert.equal(quiz.courseName, 'Science Lab');
  assert.equal(quiz.htmlUrl, credential.baseUrl + assignment.html_url);
  assert.equal(event.allDayDate, '2026-01-09');
  assert.equal(event.endsAt, '2026-01-09T23:59:00-05:00');
  assert.equal(event.htmlUrl, undefined);
  assert.notEqual(event.id, quiz.id);
  assert.equal(lockdown.title, 'Practice Quiz');
  assert.equal(lockdown.lockdown, true);
  const rescheduled = translateCanvas({ account, courses, plannerItems: [assignment] }, credential.baseUrl).items[0];
  assert.equal(rescheduled.id, quiz.id);
  assert.equal(rescheduled.dueDate, assignment.plannable.due_at);
});
