import assert from 'node:assert/strict';
import test from 'node:test';

import { makeCampusFixtures } from '../../shared/mockData';
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
});
