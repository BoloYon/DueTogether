import assert from 'node:assert/strict';
import test from 'node:test';

import { localDayKey, makeCampusFixtures } from '../../shared/mockData';
import { findAvailabilityOverlaps } from '../../shared/selectors';
import { watchCampusDelivery } from './delivery';
import { CAMPUS_STORAGE_KEY, openCampusStore } from './store';

const start = new Date(2026, 10, 21, 12).getTime();

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => { data.set(key, value); },
  };
}

test('seeds shared fixtures and restores membership and saves in write order', async () => {
  const storage = memoryStorage();
  const clock = () => start;
  const store = await openCampusStore(storage, clock);
  assert.deepEqual(store.getState(), makeCampusFixtures(clock));
  assert.equal(store.dispatch({ type: 'session/join', id: 'live' }).ok, true);
  assert.equal(store.dispatch({ type: 'session/join', id: 'live' }).ok, true);
  assert.equal(store.dispatch({ type: 'session/save', id: 'live' }).ok, true);
  assert.deepEqual(store.dispatch({ type: 'session/join', id: 'full' }), {
    ok: false, error: 'full', message: 'This session is full.',
  });
  assert.equal(store.getState().sessions[0].attendeeIds.filter(id => id === 'you').length, 1);
  await store.flush();
  assert.ok(storage.data.has(CAMPUS_STORAGE_KEY));
  const reopened = await openCampusStore(storage, () => start + 30_000);
  assert.deepEqual(reopened.getState(), store.getState());
  reopened.dispatch({ type: 'session/leave', id: 'live' });
  assert.equal(reopened.getState().sessions[0].attendeeIds.includes('you'), false);
  assert.ok(reopened.getState().savedSessionIds.includes('live'));
  reopened.dispatch({ type: 'session/unsave', id: 'live' });
  assert.equal(reopened.getState().savedSessionIds.includes('live'), false);
  const ended = reopened.dispatch({ type: 'session/join', id: 'ended' });
  assert.ok(!ended.ok && ended.error === 'ended');
  const hosted = reopened.dispatch({ type: 'session/create', draft: {
    title: 'Review', topic: 'Practice', startsAt: start + 60_000, durationMinutes: 30, format: 'online',
  } });
  assert.ok(hosted.ok && hosted.id);
  const leave = reopened.dispatch({ type: 'session/leave', id: hosted.id });
  assert.ok(!leave.ok && leave.error === 'forbidden');
});

test('keeps one thread per person and delivers the reply without a chat screen', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let now = start;
  const storage = memoryStorage();
  const store = await openCampusStore(storage, () => now);
  t.after(watchCampusDelivery(store, () => now));

  assert.deepEqual(store.dispatch({ type: 'post/connect', postId: 'mira-1' }), { ok: true, id: 'thread-mira' });
  assert.deepEqual(store.dispatch({ type: 'post/connect', postId: 'mira-2' }), { ok: true, id: 'thread-mira' });
  store.dispatch({ type: 'post/connect', postId: 'mira-2' });
  assert.deepEqual(store.getState().threads[0].postIds, ['mira-1', 'mira-2']);
  assert.equal(store.getState().postToThread['mira-2'], 'thread-mira');

  const connected = store.dispatch({ type: 'post/connect', postId: 'dev-1' });
  assert.ok(connected.ok && connected.id);
  const threadId = connected.id;
  assert.equal(store.dispatch({ type: 'chat/send', threadId, text: '  ' }).ok, false);
  const thread = () => store.getState().threads.find(item => item.id === threadId);
  assert.equal(thread()?.messages.length, 1);
  assert.ok(thread()?.pendingReply);
  store.dispatch({ type: 'chat/read', threadId });
  now += 1_199;
  t.mock.timers.tick(1_199);
  assert.ok(thread()?.pendingReply);
  now += 1;
  t.mock.timers.tick(1);
  assert.equal(thread()?.pendingReply, undefined);
  assert.match(thread()?.messages.at(-1)?.text ?? '', /Simulated reply/);
  assert.ok(thread()!.messages.at(-1)!.sentAt > thread()!.readAt!);
  await store.flush();
  const reopened = await openCampusStore(storage, () => now + 5_000);
  assert.equal(reopened.getState().threads.length, 2);
  assert.deepEqual(reopened.getState().threads.at(-1)?.messages, thread()?.messages);
  assert.equal(reopened.getState().threads.at(-1)?.pendingReply, undefined);
  reopened.dispatch({ type: 'chat/read', threadId });
  assert.equal(reopened.getState().threads.at(-1)?.readAt, now + 5_000);
});

test('restores a queued message and advances it once on a later launch', async () => {
  const storage = memoryStorage();
  const store = await openCampusStore(storage, () => start);
  const first = store.dispatch({ type: 'chat/send', threadId: 'thread-mira', text: 'Hello', course: 'MAT 240' });
  assert.ok(first.ok && first.id);
  await store.flush();

  const pending = await openCampusStore(storage, () => start + 100);
  assert.equal(pending.getState().threads[0].pendingReply?.id, first.id + '-reply');
  const delivered = await openCampusStore(storage, () => start + 1_500);
  await delivered.flush();
  const final = await openCampusStore(storage, () => start + 2_500);
  assert.equal(final.getState().threads[0].messages.filter(item => item.id === first.id + '-reply').length, 1);
  const second = final.dispatch({ type: 'chat/send', threadId: 'thread-mira', text: 'Thanks' });
  assert.ok(second.ok && second.id && second.id !== first.id);
});

test('normalizes and edits dated availability, then creates one session per simulated acceptance', async () => {
  const storage = memoryStorage();
  let now = start;
  const store = await openCampusStore(storage, () => now);
  const course = ' mat   240 ';
  const matches = () => findAvailabilityOverlaps(store.getState(), course, now);
  assert.deepEqual(matches().map(match => match.personId), ['mira', 'dev']);
  const shared = matches()[0];
  const today = { date: localDayKey(new Date(start)), startMinute: 660, endMinute: 720 };
  assert.equal(store.dispatch({ type: 'availability/upsert', course, window: today }).ok, false);
  const differentDate = new Date(start);
  differentDate.setDate(differentDate.getDate() + 2);
  const otherDay = { ...today, date: localDayKey(differentDate) };
  const original = store.getState().availability.you?.['MAT 240']?.[0];
  assert.ok(original);
  store.dispatch({ type: 'availability/upsert', course, window: otherDay, previous: original });
  assert.deepEqual(matches(), []);
  store.dispatch({ type: 'availability/remove', course, window: otherDay });
  assert.deepEqual(store.getState().availability.you?.['MAT 240'], []);
  store.dispatch({ type: 'availability/upsert', course, window: original });

  function atMinute(minute: number) {
    const time = new Date(shared.date + 'T00:00:00');
    time.setMinutes(minute);
    return time.getTime();
  }

  const result = store.dispatch({ type: 'invite/send', draft: {
    personId: shared.personId, course, startsAt: atMinute(shared.startMinute), endsAt: atMinute(shared.endMinute),
  } });
  assert.ok(result.ok && result.id);
  assert.equal(store.getState().invites[0].status, 'pending');
  await store.flush();

  now += 2_000;
  const reopened = await openCampusStore(storage, () => now);
  const { invites, sessions, notifications } = reopened.getState();
  assert.equal(invites[0].status, 'accepted');
  const sessionId = invites[0].sessionId;
  assert.deepEqual(sessions.find(item => item.id === sessionId)?.attendeeIds, ['you', 'mira']);
  const notice = notifications.find(item => item.href === '/session/' + sessionId);
  assert.ok(notice && !notice.read);
  assert.match(notice.body, /simulation/);
  reopened.dispatch({ type: 'notification/read', id: notice.id });
  assert.equal(reopened.getState().notifications.find(item => item.id === notice.id)?.read, true);
  assert.equal(reopened.getState().notifications.find(item => item.id === 'welcome')?.read, false);
  reopened.dispatch({ type: 'notification/readAll' });
  await reopened.flush();
  now += 5_000;
  const final = await openCampusStore(storage, () => now);
  final.advance();
  assert.equal(final.getState().sessions.filter(item => item.id === sessionId).length, 1);
  assert.equal(final.getState().notifications.filter(item => item.id === notice.id).length, 1);
  assert.ok(final.getState().notifications.every(item => item.read));
  now = atMinute(shared.startMinute + 1) + 1;
  assert.equal(findAvailabilityOverlaps(final.getState(), course, now)[0].startMinute, shared.startMinute + 2);
});

test('persists project requests, supports cancel, and resets campus data only', async () => {
  const storage = memoryStorage();
  await storage.setItem('unrelated-key', 'keep');
  const store = await openCampusStore(storage, () => start);
  const { memberships, projects, threads } = store.getState();
  store.dispatch({ type: 'project/request', id: 'garden' });
  store.dispatch({ type: 'project/request', id: 'garden' });
  store.dispatch({ type: 'project/request', id: 'wave' });
  await store.flush();

  const reopened = await openCampusStore(storage, () => start);
  assert.deepEqual(reopened.getState().memberships, [
    ...memberships, { userId: 'you', projectId: 'garden', status: 'requested' },
  ]);
  assert.deepEqual(reopened.getState().projects, projects);
  assert.deepEqual(reopened.getState().threads, threads);
  reopened.dispatch({ type: 'project/cancel', id: 'garden' });
  reopened.dispatch({ type: 'project/cancel', id: 'wave' });
  assert.deepEqual(reopened.getState().memberships, memberships);
  reopened.dispatch({ type: 'profile/update', profile: { name: 'Updated name' } });
  reopened.dispatch({ type: 'demo/reset' });
  await reopened.flush();
  assert.deepEqual((await openCampusStore(storage, () => start)).getState(), makeCampusFixtures(() => start));
  assert.equal(await storage.getItem('unrelated-key'), 'keep');
});

test('seeds after malformed JSON and preserves stored data when reads fail', async () => {
  const storage = memoryStorage();
  await storage.setItem(CAMPUS_STORAGE_KEY, '{broken');
  const store = await openCampusStore(storage, () => start);
  await store.flush();
  assert.deepEqual(store.getState(), makeCampusFixtures(() => start));
  const lastGood = await storage.getItem(CAMPUS_STORAGE_KEY);
  const fallback = await openCampusStore({
    ...storage,
    async getItem() { throw new Error('Storage unavailable'); },
  }, () => start);
  fallback.dispatch({ type: 'session/join', id: 'live' });
  await fallback.flush();
  assert.equal(await storage.getItem(CAMPUS_STORAGE_KEY), lastGood);
});

test('retries the current snapshot after a failed write', async () => {
  const storage = memoryStorage();
  let fail = false;
  const store = await openCampusStore({
    ...storage,
    async setItem(key, value) {
      if (fail) throw new Error('Storage unavailable');
      await storage.setItem(key, value);
    },
  }, () => start);
  await store.flush();
  fail = true;
  store.dispatch({ type: 'session/join', id: 'live' });
  await store.flush();
  fail = false;
  store.advance();
  await store.flush();
  const reopened = await openCampusStore(storage, () => start);
  assert.ok(reopened.getState().sessions[0].attendeeIds.includes('you'));
});
