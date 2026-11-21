import type { DueRange } from '@/shared/selectors';
import type { SectionKey } from '../feed/model';
import type { Positions, Viewport } from './layout';

/** Per-section graph state that survives tab switches and List ↔ Graph toggles while the Feed is mounted. */
export interface SectionMemory { selected: string | null; viewport: Viewport | null; userViewport: boolean; positions: Positions }

export interface GraphMemory {
  active(): SectionKey | null;
  setActive(section: SectionKey): void;
  dueRange(): DueRange;
  setDueRange(range: DueRange): void;
  get(section: SectionKey): SectionMemory;
  save(section: SectionKey, patch: Partial<SectionMemory>): void;
}

export function createGraphMemory(): GraphMemory {
  const sections: Partial<Record<SectionKey, SectionMemory>> = {};
  let active: SectionKey | null = null;
  let dueRange: DueRange = 'next-seven-days';
  const get = (section: SectionKey) => (sections[section] ??= { selected: null, viewport: null, userViewport: false, positions: {} });
  return {
    active: () => active,
    setActive: section => { active = section; },
    dueRange: () => dueRange,
    setDueRange: range => { dueRange = range; },
    get,
    save: (section, patch) => { Object.assign(get(section), patch); },
  };
}
