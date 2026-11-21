import type { CanvasAccount, CanvasCredential, CanvasItem, CanvasSnapshot } from '../../shared/types';
import { isRecord } from '../canvas';
import { accountKey, dateOnly, itemUrl, timestamp } from '../canvas/translate';
import { canvasOrigin } from '../canvas/urls';

export interface StoredCalendar {
  account: CanvasAccount;
  snapshot: CanvasSnapshot;
}

export interface CalendarSession extends StoredCalendar {
  credential: CanvasCredential;
}

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const secretKey = 'duetogether.canvas.credential.v1';
const cacheKey = 'duetogether.canvas.cache.v1';

function parse(raw: string | null): unknown {
  try {
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function validItem(value: unknown, origin: string): value is CanvasItem {
  if (!isRecord(value)) return false;
  const { id, canvasId, title, courseName, courseId, courseCode, kind, dueDate, startsAt, endsAt, allDayDate, htmlUrl, lockdown } = value;
  return [id, canvasId, title, courseName].every(field => typeof field === 'string') &&
    [courseId, courseCode].every(field => field === undefined || typeof field === 'string') &&
    ['homework', 'quiz', 'exam', 'event'].some(type => type === kind) &&
    [dueDate, startsAt, endsAt].every(field => field === undefined || timestamp(field) !== undefined) &&
    (allDayDate === undefined || dateOnly(allDayDate) !== undefined) &&
    Boolean(dueDate || startsAt || endsAt || allDayDate) &&
    (htmlUrl === undefined || itemUrl(htmlUrl, origin) === htmlUrl) &&
    (lockdown === undefined || typeof lockdown === 'boolean');
}

function restore(cache: unknown, secret: unknown): CalendarSession | null {
  if (!isRecord(cache) || !isRecord(cache.account) || !isRecord(cache.snapshot) ||
      !isRecord(cache.snapshot.range) || !isRecord(secret)) return null;
  const { account, snapshot } = cache;
  const { id, origin, name } = account;
  const { token } = secret;
  if (typeof id !== 'string' || !id || typeof name !== 'string' ||
      typeof origin !== 'string' || canvasOrigin(origin) !== origin ||
      typeof token !== 'string' || !token || /\s/.test(token)) return null;
  const expected = accountKey(origin, id);
  const start = timestamp(cache.snapshot.range.start);
  const end = timestamp(cache.snapshot.range.end);
  if (account.accountKey !== expected || snapshot.accountKey !== expected ||
      secret.accountKey !== expected || secret.baseUrl !== origin ||
      !start || !end || Date.parse(start) > Date.parse(end) ||
      typeof snapshot.fetchedAt !== 'number' || !Number.isFinite(snapshot.fetchedAt) ||
      !Array.isArray(snapshot.items) || !snapshot.items.every(item => validItem(item, origin))) return null;
  return {
    account: { id, name, origin, accountKey: expected },
    snapshot: {
      accountKey: expected, fetchedAt: snapshot.fetchedAt, items: snapshot.items,
      range: { start, end },
    },
    credential: { token, baseUrl: origin },
  };
}

export function createCalendarStorage(cache: KeyValueStore, secrets: KeyValueStore, available: () => Promise<boolean>) {
  const writeCache = ({ account, snapshot }: StoredCalendar) => cache.setItem(cacheKey, JSON.stringify({ account, snapshot }));
  return {
    available,
    async load() {
      if (!await available()) return null;
      const [storedCache, storedSecret] = await Promise.all([cache.getItem(cacheKey), secrets.getItem(secretKey)]);
      return restore(parse(storedCache), parse(storedSecret));
    },
    async replace(session: CalendarSession) {
      const previous = await cache.getItem(cacheKey);
      await writeCache(session);
      try {
        await secrets.setItem(secretKey, JSON.stringify({ ...session.credential, accountKey: session.account.accountKey }));
      } catch (error) {
        // Restore the prior cache if the credential write failed. A mismatched
        // account key also prevents reuse after an interrupted replacement.
        if (previous === null) await cache.removeItem(cacheKey);
        else await cache.setItem(cacheKey, previous);
        throw error;
      }
    },
    save: writeCache,
    async clear() {
      const cleared = await Promise.allSettled([
        cache.removeItem(cacheKey),
        (async () => { if (await available()) await secrets.removeItem(secretKey); })(),
      ]);
      if (cleared.some(result => result.status === 'rejected')) throw new Error('Canvas storage could not be cleared.');
    },
  };
}

export type CalendarStorage = ReturnType<typeof createCalendarStorage>;
