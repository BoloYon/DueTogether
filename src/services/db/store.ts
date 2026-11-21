import { advanceCampus, transitionCampus } from '../../shared/mockCampus';
import { recordContributionCredits } from '../../shared/contributions';
import { campusMediaKeys } from '../../shared/profile-media';
import { addDemoStudyRequests, makeCampusFixtures, makeSampleCollections } from '../../shared/mockData';
import type { CampusAdapter, CampusState, Clock } from '../../shared/types';

export const CAMPUS_STORAGE_KEY = '@duetogether/campus/v1';

type CampusStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type Snapshot = { version: 2; sequence: number; state: CampusState };

function decode(raw: string | null): (Snapshot & { migrated: boolean }) | undefined {
  if (raw === null) return;
  try {
    const value = JSON.parse(raw) as (Partial<Omit<Snapshot, 'version'>> & { version?: number }) | null;
    const state = value?.state;
    if ((value?.version === 1 || value?.version === 2) && typeof value.sequence === 'number'
      && Number.isSafeInteger(value.sequence) && value.sequence >= 0 && state
      && typeof state.currentUser?.id === 'string'
      && [state.people, state.sessions, state.savedSessionIds, state.posts, state.threads,
        state.projects, state.memberships, state.invites, state.notifications].every(Array.isArray)
      && state.availability && typeof state.availability === 'object'
      && state.postToThread && typeof state.postToThread === 'object') {
      const migrated = value.version === 1;
      const upgraded = {
        ...state,
        collections: Array.isArray(state.collections) ? state.collections : makeSampleCollections(),
        contributionCredits: Array.isArray(state.contributionCredits) ? state.contributionCredits : [],
      };
      return { version: 2, sequence: value.sequence, state: recordContributionCredits(upgraded), migrated };
    }
  } catch {
    // An unreadable snapshot can be replaced with fresh sample data.
  }
}

export async function openCampusStore(storage: CampusStorage, clock: Clock = Date.now, removeMedia?: (key: string) => Promise<void>) {
  let snapshot: ReturnType<typeof decode>;
  let canWrite = true;
  try {
    snapshot = decode(await storage.getItem(CAMPUS_STORAGE_KEY));
  } catch {
    // A read failure could hide existing data. Preserve it for the next launch.
    canWrite = false;
  }

  let state = snapshot?.state ?? makeCampusFixtures(clock);
  let currentMedia = campusMediaKeys(state);
  const retiredMedia = new Set<string>();
  let sequence = snapshot?.sequence ?? 0;
  let writes = Promise.resolve();
  let dirty = false;
  const listeners = new Set<() => void>();

  function persist() {
    if (!canWrite) return;
    const serialized = JSON.stringify({ version: 2, sequence, state } satisfies Snapshot);
    const savedMedia = currentMedia;
    dirty = false;
    writes = writes.then(async () => {
      await storage.setItem(CAMPUS_STORAGE_KEY, serialized);
      dirty = false;
      if (removeMedia && retiredMedia.size) {
        for (const key of retiredMedia) {
          if (savedMedia.has(key) || currentMedia.has(key)) continue;
          try {
            await removeMedia(key);
            retiredMedia.delete(key);
          } catch {
            // Retry cleanup after the next successful snapshot.
          }
        }
      }
    }).catch(() => {
      dirty = true;
    });
  }

  function publish(next: CampusState) {
    if (next === state) {
      if (dirty) persist();
      return;
    }
    const nextMedia = campusMediaKeys(next);
    for (const key of currentMedia) if (!nextMedia.has(key)) retiredMedia.add(key);
    currentMedia = nextMedia;
    state = next;
    persist();
    listeners.forEach(listener => listener());
  }

  function advance() {
    publish(advanceCampus(state, clock()));
  }

  const dispatch: CampusAdapter['dispatch'] = (action) => {
    const now = clock();
    const id = 'campus-' + (sequence + 1);
    const [next, result] = transitionCampus(advanceCampus(state, now), action, now, id);
    if (result.ok && result.id === id) sequence += 1;
    publish(next);
    return result;
  };

  const now = clock();
  const restored = advanceCampus(addDemoStudyRequests(state, now), now);
  if (!snapshot || snapshot.migrated || restored !== state) {
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
