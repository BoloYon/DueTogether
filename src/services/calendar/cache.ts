import { CALENDAR_FUTURE_DAYS, CALENDAR_PAST_DAYS } from '../../shared/config';
import type { CanvasItem, CanvasSnapshot, DateRange } from '../../shared/types';

export function calendarRange(now: number): DateRange {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - CALENDAR_PAST_DAYS);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  end.setDate(end.getDate() + CALENDAR_FUTURE_DAYS);
  return { start: start.toISOString(), end: end.toISOString() };
}

function overlapsWindow(item: CanvasItem, range: DateRange) {
  const start = Date.parse((item.allDayDate && item.allDayDate + 'T00:00:00') ??
    item.dueDate ?? item.startsAt ?? item.endsAt ?? '');
  const end = Date.parse((item.allDayDate && item.allDayDate + 'T23:59:59.999') ??
    item.dueDate ?? item.endsAt ?? item.startsAt ?? '');
  return start <= Date.parse(range.end) && end >= Date.parse(range.start);
}

export function mergeSnapshot(previous: CanvasSnapshot | undefined, next: CanvasSnapshot): CanvasSnapshot {
  if (previous?.accountKey !== next.accountKey) return next;

  const items = new Map(previous.items
    .filter(item => !overlapsWindow(item, next.range))
    .map(item => [item.id, item]));
  for (const item of next.items) items.set(item.id, item);
  return { ...next, items: Array.from(items.values()) };
}
