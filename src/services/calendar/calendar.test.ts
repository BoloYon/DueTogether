import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CALENDAR_REFRESH_MS } from '../../shared/config';
import type { CanvasCredential, CanvasRead, CanvasResult, CanvasTransport } from '../../shared/types';
import { calendarRange } from './cache';
import { createCalendarController } from './controller';
import { createCalendarStorage } from './storage';

const initialTime = Date.parse('2026-05-15T12:00:00Z');
const first = { baseUrl: 'https://school.example.test', token: 'mock-first' };
const second = { ...first, token: 'mock-second' };
const firstDue = '2026-05-23T10:30:00Z';
const nextDue = '2026-05-24T16:20:00Z';

function success(id: number, title: string, due = firstDue): CanvasResult<CanvasRead> {
  return {
    ok: true,
    value: {
      account: { id, name: 'Sample Student ' + id },
      courses: [],
      plannerItems: [{
        plannable_id: 11, plannable_type: 'assignment', plannable: { title, due_at: due },
      }],
    },
  };
}

function fixture() {
  const cache = memoryStore();
  const secrets = memoryStore();
  const storage = createCalendarStorage(cache, secrets, async () => true);
  let now = initialTime;
  let read = (credential: CanvasCredential): Promise<CanvasResult<CanvasRead>> =>
    Promise.resolve(credential.token === second.token ? success(2, 'Sample Physics') : success(1, 'Sample Biology'));
  let reads = 0;
  const transport: CanvasTransport = {
    async read(credential) { reads++; return read(credential); },
    async getSelf() { throw new Error('Use the composed read.'); },
    async listCourses() { throw new Error('Use the composed read.'); },
    async listPlannerItems() { throw new Error('Use the composed read.'); },
  };
  const create = () => createCalendarController(transport, storage, () => now);
  return {
    create, cache, secrets, storage,
    setRead(next: typeof read) { read = next; },
    reads: () => reads,
    advance(ms: number) { now += ms; },
  };
}

function memoryStore() {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key: string) { return values.get(key) ?? null; },
    async setItem(key: string, value: string) { values.set(key, value); },
    async removeItem(key: string) { values.delete(key); },
  };
}

function deferredRead() {
  let resolve!: (result: CanvasResult<CanvasRead>) => void;
  const promise = new Promise<CanvasResult<CanvasRead>>(done => { resolve = done; });
  return { promise, resolve };
}

test('sample startup, secure persistence, validated rehydration and initial sync', async () => {
  const f = fixture();
  const controller = f.create();
  await controller.start();
  assert.equal(controller.getSnapshot().mode, 'sample');
  assert.ok(controller.getSnapshot().items.length > 0);
  assert.equal(f.reads(), 0);
  assert.equal((await controller.connect(first)).ok, true);
  const connected = controller.getSnapshot();
  assert.equal(connected.mode, 'live');
  assert.equal(connected.lastSyncedAt, initialTime);
  assert.equal(connected.items[0].title, 'Sample Biology');
  assert.doesNotMatch(JSON.stringify(connected), /mock-first/);
  assert.doesNotMatch([...f.cache.values.values()].join(), /mock-first|"token"/);
  assert.match([...f.secrets.values.values()].join(), /mock-first/);

  const reopened = f.create();
  const initialRefresh = deferredRead();
  f.setRead(() => initialRefresh.promise);
  await reopened.start();
  assert.equal(reopened.getSnapshot().status, 'syncing');
  assert.equal(JSON.stringify(reopened.getSnapshot().items), JSON.stringify(connected.items));
  assert.equal(f.reads(), 2);
  initialRefresh.resolve(success(1, 'Sample Biology Updated'));
  assert.equal((await reopened.sync()).ok, true);
  assert.equal(reopened.getSnapshot().items[0].title, 'Sample Biology Updated');
});

test('storage rejects stale identity and rolls back cache if secure replacement fails', async () => {
  const f = fixture();
  const controller = f.create();
  await controller.connect(first);
  const firstCache = [...f.cache.values.entries()][0];
  const firstSecret = [...f.secrets.values.entries()][0];
  f.secrets.setItem = async () => { throw new Error('Synthetic storage failure'); };
  const failed = await controller.connect(second);
  assert.equal(!failed.ok && failed.error.code, 'storage');
  assert.equal(controller.getSnapshot().account?.id, '1');
  assert.equal(f.cache.values.get(firstCache[0]), firstCache[1]);
  const stale = JSON.parse(firstSecret[1]);
  stale.accountKey = stale.accountKey.replace(/1$/, '2');
  f.secrets.values.set(firstSecret[0], JSON.stringify(stale));
  assert.equal(await f.storage.load(), null);
});

test('bad replacement keeps the old connection; valid replacement drops old items and persists the new credential', async () => {
  const f = fixture();
  const controller = f.create();
  await controller.connect(first);
  const denied = { ok: false, error: { code: 'auth', message: 'Synthetic denial.' } } as const;
  f.setRead(async () => denied);
  assert.deepEqual(await controller.connect(second), denied);
  assert.equal(controller.getSnapshot().account?.id, '1');
  assert.equal(controller.getSnapshot().items[0].title, 'Sample Biology');
  assert.equal((await f.storage.load())?.credential.token, first.token);

  f.setRead(async () => success(2, 'Sample Physics'));
  assert.equal((await controller.connect(second)).ok, true);
  assert.equal(controller.getSnapshot().account?.id, '2');
  assert.deepEqual(controller.getSnapshot().items.map(item => item.title), ['Sample Physics']);
  assert.equal((await f.storage.load())?.credential.token, second.token);
});

test('refresh coalesces and preserves last good data on failure, then reschedules by stable ID', async () => {
  const f = fixture();
  const controller = f.create();
  await controller.connect(first);
  const before = controller.getSnapshot();
  const pending = deferredRead();
  f.setRead(() => pending.promise);
  f.advance(CALENDAR_REFRESH_MS - 1);
  controller.foreground();
  assert.equal(f.reads(), 1);
  f.advance(1);
  controller.foreground();
  const refresh = controller.sync();
  assert.equal(refresh, controller.sync());
  assert.equal(f.reads(), 2);
  pending.resolve({ ok: false, error: { code: 'network', message: 'Synthetic offline state.' } });
  assert.equal((await refresh).ok, false);
  assert.equal(controller.getSnapshot().status, 'error');
  assert.equal(controller.getSnapshot().lastSyncedAt, before.lastSyncedAt);
  assert.deepEqual(controller.getSnapshot().items, before.items);

  f.setRead(async () => success(1, 'Sample Biology', nextDue));
  assert.equal((await controller.sync()).ok, true);
  const updated = controller.getSnapshot();
  assert.equal(updated.items.length, 1);
  assert.equal(updated.items[0].id, before.items[0].id);
  assert.equal(updated.items[0].dueDate, nextDue);
});

test('a successful refresh removes vanished in-window rows and retains out-of-window history', async () => {
  const f = fixture();
  const controller = f.create();
  f.setRead(async () => {
    const result = success(1, 'Sample Assignment', '2026-01-20T10:00:00Z');
    if (result.ok) {
      result.value.plannerItems.push({
        plannable_id: 12, plannable_type: 'assignment', plannable: { title: 'Sample Later Assignment', due_at: firstDue },
      });
    }
    return result;
  });
  await controller.connect(first);
  f.advance(45 * 24 * 60 * 60_000);
  assert.ok(Date.parse(calendarRange(initialTime + 45 * 24 * 60 * 60_000).start) > Date.parse('2026-01-20'));
  f.setRead(async () => ({ ok: true, value: { account: { id: 1, name: 'Sample Student' }, courses: [], plannerItems: [] } }));
  await controller.sync();
  assert.deepEqual(controller.getSnapshot().items.map(item => item.canvasId), ['11']);
});

test('disconnect clears both stores and late responses cannot restore data or displace a new connection', async () => {
  const f = fixture();
  const controller = f.create();
  await controller.connect(first);
  const delayed = deferredRead();
  f.setRead(() => delayed.promise);
  const refresh = controller.sync();
  assert.equal((await controller.disconnect()).ok, true);
  assert.equal(controller.getSnapshot().account, null);
  assert.equal(controller.getSnapshot().mode, 'sample');
  assert.equal(f.cache.values.size, 0);
  assert.equal(f.secrets.values.size, 0);

  f.setRead(async () => success(2, 'Sample Physics'));
  await controller.connect(second);
  delayed.resolve(success(1, 'Late Sample Biology'));
  const result = await refresh;
  assert.equal(!result.ok && result.error.code, 'cancelled');
  assert.equal(controller.getSnapshot().account?.id, '2');
  assert.deepEqual(controller.getSnapshot().items.map(item => item.title), ['Sample Physics']);
  assert.equal((await f.storage.load())?.account.id, '2');
});

test('disconnect queues cleanup behind a pending credential write', async () => {
  const f = fixture();
  const startWrite = Promise.withResolvers<void>();
  const completeWrite = Promise.withResolvers<void>();
  const setSecret = f.secrets.setItem;
  f.secrets.setItem = async (key, value) => {
    startWrite.resolve();
    await completeWrite.promise;
    await setSecret(key, value);
  };
  const controller = f.create();
  const connect = controller.connect(first);
  await startWrite.promise;
  const disconnect = controller.disconnect();
  completeWrite.resolve();
  const result = await connect;
  assert.equal(!result.ok && result.error.code, 'cancelled');
  assert.equal((await disconnect).ok, true);
  assert.equal(await f.storage.load(), null);
  assert.equal(f.cache.values.size + f.secrets.values.size, 0);
});

test('same-account credential rotation is persisted, and a different identity cannot refresh its snapshot', async () => {
  const f = fixture();
  const controller = f.create();
  await controller.connect(first);
  f.setRead(async () => success(1, 'Sample Biology', nextDue));
  assert.equal((await controller.connect(second)).ok, true);
  assert.equal((await f.storage.load())?.credential.token, second.token);
  assert.equal(controller.getSnapshot().items[0].dueDate, nextDue);

  f.setRead(async () => success(2, 'Sample Physics'));
  const result = await controller.sync();
  assert.equal(!result.ok && result.error.code, 'auth');
  assert.equal(controller.getSnapshot().items[0].title, 'Sample Biology');
  assert.equal((await f.storage.load())?.account.id, '1');
});
