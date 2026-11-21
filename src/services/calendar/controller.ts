import { CALENDAR_REFRESH_MS } from '../../shared/config';
import { makeCanvasFixtures } from '../../shared/mockData';
import type {
  CalendarAdapter, CanvasAccount, CanvasCredential, CanvasError, CanvasResult,
  CanvasSnapshot, CanvasTransport, Clock,
} from '../../shared/types';
import { translateCanvas } from '../canvas/translate';
import { canvasOrigin } from '../canvas/urls';
import { calendarRange, mergeSnapshot } from './cache';
import type { CalendarSession, CalendarStorage } from './storage';

type View = Pick<CalendarAdapter, 'status' | 'mode' | 'account' | 'items' | 'lastSyncedAt' | 'error'>;

const cancelled: CanvasError = { code: 'cancelled', message: 'Calendar operation cancelled.' };
const unavailable: CanvasError = { code: 'not-connected', message: 'Connect Canvas before syncing coursework.' };
const busy: CanvasError = { code: 'busy', message: 'Wait for the current Canvas connection attempt to finish.' };
const storageError: CanvasError = { code: 'storage', message: 'Canvas data could not be saved or cleared on this device. Try again.' };
const networkError: CanvasError = { code: 'network', message: 'Could not reach Canvas. Check your connection and try again.' };

function failure(error: CanvasError): CanvasResult<never> {
  return { ok: false, error };
}

export function createCalendarController(transport: CanvasTransport, storage: CalendarStorage, clock: Clock) {
  let session: CalendarSession | null = null;
  let pending: AbortController | undefined;
  let refresh: Promise<CanvasResult<CanvasSnapshot>> | undefined;
  let storageQueue: Promise<unknown> = Promise.resolve();
  const subscribers = new Set<() => void>();

  function sample(): View {
    return { status: 'disconnected', mode: 'sample', account: null, items: makeCanvasFixtures(clock), lastSyncedAt: null, error: null };
  }
  let view = sample();
  function update(changes: Partial<View>) {
    view = { ...view, ...changes };
    for (const subscriber of subscribers) subscriber();
  }
  function showSession(active: CalendarSession) {
    update({
      status: 'ready', mode: 'live', account: active.account, items: active.snapshot.items,
      lastSyncedAt: active.snapshot.fetchedAt, error: null,
    });
  }
  function fail(error: CanvasError) {
    update({ status: 'error', error });
    return failure(error);
  }
  function queue<T>(work: () => Promise<T>): Promise<T> {
    const result = storageQueue.then(work);
    storageQueue = result.catch(() => {});
    return result;
  }
  function stopWork() {
    pending?.abort();
    pending = undefined;
    refresh = undefined;
  }
  function begin() {
    stopWork();
    pending = new AbortController();
    return pending.signal;
  }

  async function read(credential: CanvasCredential, signal: AbortSignal): Promise<CanvasResult<CalendarSession>> {
    const range = calendarRange(clock());
    try {
      const result = await transport.read(credential, range, { signal });
      if (signal.aborted) return failure(cancelled);
      if (!result.ok) return result;
      const { account, items } = translateCanvas(result.value, credential.baseUrl);
      const snapshot = { accountKey: account.accountKey, range, items, fetchedAt: clock() };
      return { ok: true, value: { account, snapshot, credential } };
    } catch {
      return failure(signal.aborted ? cancelled : networkError);
    }
  }

  async function connect(input: CanvasCredential): Promise<CanvasResult<CanvasAccount>> {
    if (view.status === 'connecting') return failure(busy);
    const origin = canvasOrigin(input.baseUrl);
    if (!origin) return fail({ code: 'invalid-url', message: 'Enter the HTTPS origin of your school’s Canvas site.' });
    const token = input.token.trim();
    if (!token || /\s/.test(token)) return fail({ code: 'auth', message: 'Enter a valid Canvas access token.' });
    const signal = begin();
    update({ status: 'connecting', error: null });
    try {
      const available = await storage.available();
      if (signal.aborted) return failure(cancelled);
      if (!available) return fail({ code: 'unavailable', message: 'Live Canvas requires secure storage on a native device.' });
      const result = await read({ baseUrl: origin, token }, signal);
      if (signal.aborted) return failure(cancelled);
      if (!result.ok) return fail(result.error);
      const next = result.value;
      next.snapshot = mergeSnapshot(session?.snapshot, next.snapshot);
      return await queue(async () => {
        if (signal.aborted) return failure(cancelled);
        await storage.replace(next);
        if (signal.aborted) return failure(cancelled);
        session = next;
        showSession(next);
        return { ok: true, value: next.account };
      });
    } catch {
      return signal.aborted ? failure(cancelled) : fail(storageError);
    }
  }

  function sync(): Promise<CanvasResult<CanvasSnapshot>> {
    if (refresh) return refresh;
    if (view.status === 'connecting') return Promise.resolve(failure(busy));
    const active = session;
    if (!active) return Promise.resolve(failure(unavailable));
    const signal = begin();
    update({ status: 'syncing', error: null });
    refresh = (async (): Promise<CanvasResult<CanvasSnapshot>> => {
      const result = await read(active.credential, signal);
      if (signal.aborted) return failure(cancelled);
      if (!result.ok) return fail(result.error);
      if (result.value.account.accountKey !== active.account.accountKey) {
        return fail({ code: 'auth', message: 'The token now identifies a different Canvas account. Reconnect to switch accounts.' });
      }
      const next = result.value;
      next.snapshot = mergeSnapshot(active.snapshot, next.snapshot);
      try {
        return await queue(async () => {
          if (signal.aborted) return failure(cancelled);
          await storage.save(next);
          if (signal.aborted) return failure(cancelled);
          session = next;
          showSession(next);
          return { ok: true, value: next.snapshot };
        });
      } catch {
        return signal.aborted ? failure(cancelled) : fail(storageError);
      }
    })().finally(() => {
      if (!signal.aborted) refresh = undefined;
    });
    return refresh;
  }

  async function disconnect(): Promise<CanvasResult<void>> {
    const signal = begin();
    session = null;
    update(sample());
    try {
      await queue(storage.clear);
      return { ok: true, value: undefined };
    } catch {
      return signal.aborted ? failure(cancelled) : fail(storageError);
    }
  }

  async function start() {
    if (session) {
      foreground();
      return;
    }
    const signal = begin();
    update({ status: 'connecting', error: null });
    try {
      const saved = await queue(storage.load);
      if (signal.aborted) return;
      if (saved) {
        session = saved;
        showSession(saved);
        void sync();
      } else {
        update(sample());
      }
    } catch {
      if (!signal.aborted) fail(storageError);
    }
  }

  function foreground() {
    if (session && clock() - session.snapshot.fetchedAt >= CALENDAR_REFRESH_MS) void sync();
  }

  return {
    getSnapshot: () => view,
    subscribe(listener: () => void) {
      subscribers.add(listener);
      return () => { subscribers.delete(listener); };
    },
    start, stop: stopWork, foreground, connect, sync, disconnect,
    enterSampleMode: () => { void disconnect(); },
  };
}
