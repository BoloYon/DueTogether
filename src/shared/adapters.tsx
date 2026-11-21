
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { makeCampusFixtures, makeCanvasFixtures } from './mockData';
import { advanceCampus, transitionCampus } from './mockCampus';
import type { CalendarAdapter, CampusAction, CampusAdapter, Clock } from './types';

const CampusContext = createContext<CampusAdapter | null>(null);
const CalendarContext = createContext<CalendarAdapter | null>(null);

export function useCampus(): CampusAdapter {
  const adapter = useContext(CampusContext);
  if (!adapter) throw new Error('Mount a CampusAdapterProvider before using useCampus.');
  return adapter;
}

export function useCalendar(): CalendarAdapter {
  const adapter = useContext(CalendarContext);
  if (!adapter) throw new Error('Mount a CalendarAdapterProvider before using useCalendar.');
  return adapter;
}

export function CampusAdapterProvider({ value, children }: PropsWithChildren<{ value: CampusAdapter }>) {
  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function CalendarAdapterProvider({ value, children }: PropsWithChildren<{ value: CalendarAdapter }>) {
  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function MockCampusProvider({ children, clock = Date.now }: PropsWithChildren<{ clock?: Clock }>) {
  const [state, setState] = useState(() => makeCampusFixtures(clock));
  const current = useRef(state);
  const sequence = useRef(0);
  const dispatch = (action: CampusAction) => {
    const now = clock();
    const [next, result] = transitionCampus(advanceCampus(current.current, now), action, now, 'mock-' + ++sequence.current);
    current.current = next;
    setState(next);
    return result;
  };

  useEffect(() => {
    const dueTimes = [
      ...state.threads.flatMap(thread => thread.pendingReply ? [thread.pendingReply.dueAt] : []),
      ...state.invites.flatMap(invite => invite.status === 'pending' && invite.acceptAt !== undefined ? [invite.acceptAt] : []),
    ];
    if (!dueTimes.length) return;
    const timer = setTimeout(() => {
      const next = advanceCampus(current.current, clock());
      current.current = next;
      setState(next);
    }, Math.max(0, Math.min(...dueTimes) - clock()));
    return () => clearTimeout(timer);
  }, [clock, state]);

  return <CampusAdapterProvider value={{ state, dispatch }}>{children}</CampusAdapterProvider>;
}

export function MockCalendarProvider({ children, clock = Date.now }: PropsWithChildren<{ clock?: Clock }>) {
  const [items, setItems] = useState(() => makeCanvasFixtures(clock));
  const [error, setError] = useState<CalendarAdapter['error']>(null);
  const enterSampleMode = () => {
    setError(null);
    setItems(makeCanvasFixtures(clock));
  };
  const unavailable = { code: 'unavailable', message: 'This baseline uses sample coursework. Live Canvas is added during integration.' } as const;
  const value: CalendarAdapter = {
    items, mode: 'sample', status: error ? 'error' : 'disconnected', account: null, lastSyncedAt: null, error,
    async connect() {
      setError(unavailable);
      return { ok: false, error: unavailable };
    },
    async sync() {
      setError(unavailable);
      return { ok: false, error: unavailable };
    },
    async disconnect() {
      enterSampleMode();
      return { ok: true, value: undefined };
    },
    enterSampleMode,
  };
  return <CalendarAdapterProvider value={value}>{children}</CalendarAdapterProvider>;
}
