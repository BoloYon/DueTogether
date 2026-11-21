import assert from 'node:assert/strict';
import test from 'node:test';

import { composerCourses } from '../../features/chat/logic';
import { sortedNotifications, unreadNotificationCount } from '../../features/notifications/logic';
import { profileSections } from '../../features/profile/logic';
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
  assert.match(thread()?.messages.at(-1)?.text ?? '', /^Thanks for reaching out!$/);
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
  assert.deepEqual(final.getState().contributionCredits.filter(item => item.itemId === sessionId),
    [{ kind: 'session', itemId: sessionId, authorId: 'you' }]);
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

test('legacy threads retain pins through relaunch, unpin, and campus reset', async () => {
  const clock = () => start;
  const storage = memoryStorage();
  const legacy = makeCampusFixtures(clock);
  storage.data.set(CAMPUS_STORAGE_KEY, JSON.stringify({ version: 1, sequence: 0, state: legacy }));
  const store = await openCampusStore(storage, clock);
  const threadId = 'thread-mira';
  assert.equal(store.getState().threads[0].pinned, undefined);
  assert.equal(store.dispatch({ type: 'chat/pin', threadId, pinned: true }).ok, true);
  assert.deepEqual(store.dispatch({ type: 'post/connect', postId: 'mira-2' }), { ok: true, id: threadId });
  assert.equal(store.getState().threads.length, 1);
  await store.flush();

  const reopened = await openCampusStore(storage, clock);
  assert.equal(reopened.getState().threads[0].pinned, true);
  reopened.dispatch({ type: 'chat/pin', threadId, pinned: false });
  assert.equal(reopened.getState().threads[0].pinned, false);
  assert.equal(reopened.getState().threads[0].readAt, legacy.threads[0].readAt);
  reopened.dispatch({ type: 'chat/pin', threadId, pinned: true });
  reopened.dispatch({ type: 'demo/reset' });
  assert.equal(reopened.getState().threads[0].pinned, undefined);
});

test('deleting a pinned chat removes its queued reply and all links, and allows a fresh connection after relaunch', async () => {
  const storage = memoryStorage();
  let now = start;
  const store = await openCampusStore(storage, () => now);
  const threadId = 'thread-mira';
  store.dispatch({ type: 'post/connect', postId: 'mira-2' });
  store.dispatch({ type: 'chat/pin', threadId, pinned: true });
  store.dispatch({ type: 'chat/send', threadId, text: 'Queued reply' });
  assert.ok(store.getState().threads[0].pendingReply);
  store.dispatch({ type: 'chat/delete', threadId });
  await store.flush();
  now += 10_000;
  const reopened = await openCampusStore(storage, () => now);
  reopened.advance();
  assert.equal(reopened.getState().threads.length, 0);
  assert.deepEqual(reopened.getState().postToThread, {});
  assert.ok(reopened.getState().posts.some(post => post.id === 'mira-1'));
  const connected = reopened.dispatch({ type: 'post/connect', postId: 'mira-1' });
  assert.ok(connected.ok && connected.id && connected.id !== threadId);
  assert.deepEqual(reopened.dispatch({ type: 'post/connect', postId: 'mira-2' }), connected);
  assert.equal(reopened.getState().threads.length, 1);
  assert.equal(reopened.getState().threads[0].pinned, undefined);
});

test('older demo snapshots get missing study requests without replacing existing posts or links', async () => {
  const storage = memoryStorage();
  const state = makeCampusFixtures(() => start);
  state.posts = state.posts.filter(post => post.id !== 'demo-phy220-standing-waves');
  const existing = state.posts.find(post => post.id === 'demo-mat240-eigenvectors')!;
  existing.title = 'Keep my saved copy';
  storage.data.set(CAMPUS_STORAGE_KEY, JSON.stringify({ version: 1, sequence: 42, state }));
  const store = await openCampusStore(storage, () => start);
  assert.deepEqual(store.getState().postToThread, state.postToThread);
  assert.deepEqual(store.getState().threads, state.threads);
  assert.equal(store.getState().posts.find(post => post.id === existing.id)?.title, existing.title);
  assert.equal(store.getState().posts.filter(post => post.id === 'demo-phy220-standing-waves').length, 1);
  await store.flush();
  const reopened = await openCampusStore(storage, () => start + 10_000);
  assert.deepEqual(reopened.getState().posts, store.getState().posts);
});

test('the Work Feed visibility preference survives reopening and preserves campus posts', async () => {
  const storage = memoryStorage();
  const store = await openCampusStore(storage, () => start);
  assert.notEqual(store.getState().hideMyPosts, true);
  const posts = store.getState().posts;
  store.dispatch({ type: 'feed/hideMyPosts', hidden: true });
  await store.flush();
  const reopened = await openCampusStore(storage, () => start);
  assert.equal(reopened.getState().hideMyPosts, true);
  assert.deepEqual(reopened.getState().posts, posts);
  reopened.dispatch({ type: 'feed/hideMyPosts', hidden: false });
  await reopened.flush();
  const restored = await openCampusStore(storage, () => start);
  assert.equal(restored.getState().hideMyPosts, false);
  assert.deepEqual(restored.getState().posts, posts);
});

test('only the host can cancel and a cancelled session retains its notice across reopen', async () => {
  const storage = memoryStorage();
  const fixture = makeCampusFixtures(() => start);
  const session = fixture.sessions[0];
  session.hostId = fixture.currentUser.id;
  session.attendeeIds = [fixture.currentUser.id, 'mira', 'dev', 'dev'];
  fixture.savedSessionIds.push(session.id);
  storage.data.set(CAMPUS_STORAGE_KEY, JSON.stringify({ version: 1, sequence: 0, state: fixture }));
  const store = await openCampusStore(storage, () => start);
  assert.equal(store.dispatch({ type: 'session/cancel', id: 'upcoming' }).ok, false);
  assert.equal(store.dispatch({ type: 'session/leave', id: session.id }).ok, false);
  assert.equal(store.dispatch({ type: 'session/cancel', id: session.id }).ok, true);
  assert.equal(store.dispatch({ type: 'session/cancel', id: session.id }).ok, false);
  assert.equal(store.dispatch({ type: 'session/join', id: session.id }).ok, false);
  await store.flush();

  const reopened = await openCampusStore(storage, () => start + 1000);
  const state = reopened.getState();
  assert.equal(state.cancelledSessions?.[session.id]?.title, session.title);
  assert.ok(!state.sessions.some(item => item.id === session.id));
  assert.ok(!state.savedSessionIds.includes(session.id));
  const attendee = { ...state, currentUser: state.people.find(person => person.id === 'dev')! };
  assert.ok(!profileSections(attendee, start).going.some(item => item.id === session.id));
  const notices = state.notifications.filter(item => item.title === 'Session cancelled · ' + session.title);
  assert.deepEqual(notices.map(item => item.recipientId).sort(), ['dev', 'mira', 'you']);
  const demo = sortedNotifications(state).filter(item => item.title === 'Session cancelled · ' + session.title);
  assert.equal(demo.length, 1);
  assert.equal(demo[0].body, '2 attendees would be notified.');
  assert.equal(demo[0].href, '/session/' + session.id);
  assert.equal(unreadNotificationCount(state), 2);
  reopened.dispatch({ type: 'notification/readAll' });
  assert.equal(unreadNotificationCount(reopened.getState()), 0);
  assert.ok(reopened.getState().notifications.some(item => item.recipientId === 'dev' && !item.read));
});

test('deleting an authored request preserves chat context, notifies each linked person once, and survives reopen', async () => {
  const storage = memoryStorage();
  const fixture = makeCampusFixtures(() => start);
  const request = { id: 'owned-request', title: 'Vector practice', authorId: fixture.currentUser.id,
    course: 'MAT 240', description: 'Compare notes', createdAt: start - 1 };
  fixture.posts.push(request, { ...request, id: 'own-unlinked', title: 'Solo post', topic: 'Portfolio', course: undefined });
  fixture.threads = [
    { id: 'mira', personId: 'mira', postIds: [request.id], messages: [{ id: 'original', authorId: 'mira', text: 'Yes', sentAt: start }] },
    { id: 'dev', personId: 'dev', postIds: [request.id], messages: [], pinned: true },
    { id: 'dev-legacy', personId: 'dev', postIds: [request.id], messages: [] },
    { id: 'noa', personId: 'noa', postIds: [], messages: [] },
  ];
  fixture.postToThread[request.id] = 'mira';
  storage.data.set(CAMPUS_STORAGE_KEY, JSON.stringify({ version: 1, sequence: 0, state: fixture }));
  const store = await openCampusStore(storage, () => start);
  assert.equal(store.dispatch({ type: 'post/delete', id: 'mira-1' }).ok, false);
  assert.equal(store.dispatch({ type: 'post/delete', id: request.id }).ok, true);
  assert.equal(store.dispatch({ type: 'post/delete', id: request.id }).ok, false);
  assert.equal(store.dispatch({ type: 'post/delete', id: 'own-unlinked' }).ok, true);
  await store.flush();

  const state = (await openCampusStore(storage, () => start + 1000)).getState();
  assert.ok(!state.posts.some(post => post.id === request.id));
  assert.equal(state.postToThread[request.id], undefined);
  assert.deepEqual(composerCourses(state, state.threads[0]), ['MAT 240']);
  assert.deepEqual(state.threads[0].messages, fixture.threads[0].messages);
  assert.equal(state.threads[1].pinned, true);
  assert.deepEqual(state.notifications.filter(item => item.title === 'Post deleted · Vector practice')
    .map(item => item.recipientId).sort(), ['dev', 'mira', 'you']);
  assert.equal(sortedNotifications(state).find(item => item.title === 'Post deleted · Vector practice')?.href, '/chat/mira');
  assert.equal(sortedNotifications(state).find(item => item.title === 'Post deleted · Solo post')?.body, 'Confirmed on this device.');
});

test('upgrades v1 in place and preserves campus records, references and guide stars across launches', async () => {
  const storage = memoryStorage();
  const clock = () => start;
  const { collections: samples, contributionCredits: originalCredits, ...legacy } = makeCampusFixtures(clock);
  legacy.currentUser.name = 'Existing local name';
  legacy.savedSessionIds = ['live', 'upcoming'];
  await storage.setItem(CAMPUS_STORAGE_KEY, JSON.stringify({ version: 1, sequence: 42, state: legacy }));

  const store = await openCampusStore(storage, clock);
  const { collections, contributionCredits, ...restored } = store.getState();
  assert.deepEqual(restored, legacy);
  assert.deepEqual(collections, samples);
  assert.deepEqual(contributionCredits, originalCredits);

  const cover = 'd173d9e4-c3a5-46cc-a18d-3470f3954141.png';
  const fileKey = 'd173d9e4-c3a5-46cc-a18d-3470f3954142.pdf';
  const banner = 'd173d9e4-c3a5-46cc-a18d-3470f3954143.jpg';
  const collection = store.dispatch({ type: 'collection/create', name: 'Exam Notes' });
  assert.ok(collection.ok && collection.id === 'campus-43');
  const { id } = collection;
  assert.equal(store.dispatch({ type: 'collection/cover', id, key: cover }).ok, true);
  assert.equal(store.dispatch({ type: 'profile/picture', field: 'banner', key: banner }).ok, true);
  assert.equal(store.dispatch({ type: 'profile/update', profile: { name: legacy.currentUser.name, bio: '📚' } }).ok, true);
  const guide = store.dispatch({ type: 'guide/add', collectionId: id, guide: {
    title: 'Practice.pdf', kind: 'pdf', source: { type: 'file', key: fileKey, bytes: 923 },
  } });
  assert.ok(guide.ok && guide.id === 'campus-44');
  const sample = samples[0];
  store.dispatch({ type: 'guide/star', collectionId: sample.id, guideId: sample.guides[0].id, starred: true });
  await store.flush();
  const reopened = await openCampusStore(storage, clock);
  assert.deepEqual(reopened.getState(), JSON.parse(JSON.stringify(store.getState())));
  assert.equal(JSON.parse((await storage.getItem(CAMPUS_STORAGE_KEY))!).version, 2);
});

test('only removes replaced and reset media after the new snapshot is committed', async () => {
  const storage = memoryStorage();
  let fail = false;
  const removed: string[] = [];
  const store = await openCampusStore({
    ...storage,
    async setItem(key, value) {
      if (fail) throw new Error('Write failed');
      await storage.setItem(key, value);
    },
  }, () => start, async key => { removed.push(key); });
  const first = 'd173d9e4-c3a5-46cc-a18d-3470f3954141.png';
  const second = 'd173d9e4-c3a5-46cc-a18d-3470f3954142.png';
  store.dispatch({ type: 'profile/picture', field: 'avatar', key: first });
  await store.flush();
  fail = true;
  store.dispatch({ type: 'profile/picture', field: 'avatar', key: second });
  await store.flush();
  assert.deepEqual(removed, []);
  assert.equal((await openCampusStore(storage, () => start)).getState().currentUser.avatar, first);
  fail = false;
  store.advance();
  await store.flush();
  assert.deepEqual(removed, [first]);
  assert.equal((await openCampusStore(storage, () => start)).getState().currentUser.avatar, second);
  store.dispatch({ type: 'demo/reset' });
  await store.flush();
  assert.deepEqual(removed, [first, second]);
  assert.equal((await openCampusStore(storage, () => start)).getState().currentUser.avatar, undefined);
});

test('combined snapshots preserve collection edits, conversation context and earned credit after a post is removed', async () => {
  const storage = memoryStorage();
  const store = await openCampusStore(storage, () => start);
  assert.ok(store.dispatch({ type: 'profile/update', profile: { name: 'Avery', bio: 'Study notes', courses: [' phy 220 '] } }).ok);
  const collection = store.dispatch({ type: 'collection/create', name: 'Physics notes' });
  const post = store.dispatch({ type: 'post/create', draft: { title: 'Wave notes', course: 'PHY 220', description: 'Compare wave notes' } });
  assert.ok(collection.ok && collection.id && post.ok && post.id);
  assert.ok(store.dispatch({ type: 'demo/contribute', kind: 'post', id: post.id }).ok);
  const thread = store.getState().threads.find(item => item.postIds.includes(post.id!))!;
  assert.ok(store.dispatch({ type: 'chat/pin', threadId: thread.id, pinned: true }).ok);
  assert.ok(store.dispatch({ type: 'post/delete', id: post.id }).ok);
  await store.flush();

  const state = (await openCampusStore(storage, () => start + 1)).getState();
  assert.equal(state.currentUser.bio, 'Study notes');
  assert.deepEqual(state.currentUser.courses, ['PHY 220']);
  assert.ok(state.collections.some(item => item.id === collection.id));
  const reopened = state.threads.find(item => item.id === thread.id)!;
  assert.equal(reopened.pinned, true);
  assert.ok(composerCourses(state, reopened).includes('PHY 220'));
  assert.ok(state.contributionCredits.some(credit => credit.kind === 'post' && credit.itemId === post.id));
  assert.equal(sortedNotifications(state).find(item => item.title === 'Post deleted · Wave notes')?.body, '1 connection would be notified.');
});
