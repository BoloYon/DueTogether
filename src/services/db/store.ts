import { advanceCampus, transitionCampus } from '../../shared/mockCampus';
import { makeCampusFixtures } from '../../shared/mockData';
import type { CampusAction, CampusAdapter, CampusState, Clock } from '../../shared/types';

export const CAMPUS_STORAGE_KEY = '@duetogether/campus/v1';

type CampusStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type Snapshot = { version: 1; sequence: number; state: CampusState };

function decode(raw: string | null): Snapshot | undefined {
  if (raw === null) return;
  try {
    const value = JSON.parse(raw) as Partial<Snapshot> | null;
    const state = value?.state;
    if (value?.version === 1 && typeof value.sequence === 'number'
      && Number.isSafeInteger(value.sequence) && value.sequence >= 0 && state
      && typeof state.currentUser?.id === 'string'
      && [state.people, state.sessions, state.savedSessionIds, state.posts, state.threads,
        state.projects, state.memberships, state.invites, state.notifications].every(Array.isArray)
      && state.availability && typeof state.availability === 'object'
      && state.postToThread && typeof state.postToThread === 'object') {
      return { version: 1, sequence: value.sequence, state };
    }
  } catch {
    // An unreadable snapshot can be replaced with fresh sample data.
  }
}

export async function openCampusStore(storage: CampusStorage, clock: Clock = Date.now) {
  let snapshot: Snapshot | undefined;
  let canWrite = true;
  try {
    snapshot = decode(await storage.getItem(CAMPUS_STORAGE_KEY));
  } catch {
    // A read failure could hide existing data. Preserve it for the next launch.
    canWrite = false;
  }

  let state = snapshot?.state ?? makeCampusFixtures(clock);
  let sequence = snapshot?.sequence ?? 0;
  let writes = Promise.resolve();
  let dirty = false;
  const listeners = new Set<() => void>();

  function persist() {
    if (!canWrite) return;
    const serialized = JSON.stringify({ version: 1, sequence, state } satisfies Snapshot);
    dirty = false;
    writes = writes.then(() => storage.setItem(CAMPUS_STORAGE_KEY, serialized)).catch(() => {
      dirty = true;
    });
  }

  function publish(next: CampusState) {
    if (next === state) {
      if (dirty) persist();
      return;
    }
    state = next;
    persist();
    listeners.forEach(listener => listener());
  }

  function advance() {
    publish(advanceCampus(state, clock()));
  }

  const dispatch: CampusAdapter['dispatch'] = (action: CampusAction) => {
    const now = clock();
    const id = 'campus-' + (sequence + 1);
    const [next, result] = transitionCampus(advanceCampus(state, now), action, now, id);
    if (result.ok && result.id === id) sequence += 1;
    publish(next);
    return result;
  };

  const restored = advanceCampus(state, clock());
  if (!snapshot || restored !== state) {
    state = restored;
    persist();
  }

  return {
    getState: () => state,
    dispatch,
    advance,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    flush: () => writes,
  };
}

export type CampusStore = Awaited<ReturnType<typeof openCampusStore>>;
