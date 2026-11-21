import type { CreateParams } from '@/shared/navigation';
import type { CanvasItem, DayKey } from '@/shared/types';

/** Pure calendar helpers. No network, storage or clock reads: `now` is always passed in. */

const DAY = 86_400_000;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;

export function dayKey(date: Date): DayKey {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDayKey(key: DayKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

/** The instant the item sorts by: due date, else event start, else the local start of its all-day date. */
export function itemStart(item: CanvasItem): number {
  if (item.dueDate) return Date.parse(item.dueDate);
  if (item.startsAt) return Date.parse(item.startsAt);
  if (item.allDayDate) return parseDayKey(item.allDayDate).getTime();
  return NaN;
}

/** When an item becomes Past: its deadline, else the event end, else the end of its all-day date. Completion is never considered. */
export function itemEnd(item: CanvasItem): number {
  if (item.dueDate) return Date.parse(item.dueDate);
  if (item.endsAt) return Date.parse(item.endsAt);
  if (item.allDayDate) return parseDayKey(addDays(item.allDayDate, 1)).getTime();
  if (item.startsAt) return Date.parse(item.startsAt);
  return NaN;
}

/** Local calendar day the item belongs to. All-day date strings are kept as-is (never shifted through UTC). */
export function itemDayKey(item: CanvasItem): DayKey | null {
  if (item.allDayDate && !item.dueDate) return item.allDayDate;
  const start = itemStart(item);
  return Number.isFinite(start) ? dayKey(new Date(start)) : null;
}

export function isAllDay(item: CanvasItem) {
  return !!item.allDayDate && !item.dueDate && !item.startsAt;
}

export function isPast(item: CanvasItem, now: number) {
  return itemEnd(item) <= now;
}

export const isExamOrQuiz = (item: CanvasItem) => item.kind === 'exam' || item.kind === 'quiz';

const LOCKDOWN_NOTE = /\s*[-–—:|]?\s*[([]?\s*(?:requires\s+)?respondus(?:\s+lockdown(?:\s+browser)?)?(?:\s+required)?\s*[)\]]?\s*/i;

/** Display title with a recognized Respondus LockDown note removed, plus whether the LockDown tag applies. */
export function displayTitle(item: CanvasItem): { title: string; lockdown: boolean } {
  const noted = LOCKDOWN_NOTE.test(item.title);
  const stripped = noted ? item.title.replace(LOCKDOWN_NOTE, ' ').replace(/\s{2,}/g, ' ').trim() : item.title;
  return { title: stripped || item.title, lockdown: !!item.lockdown || noted };
}

export function kindLabel(kind: CanvasItem['kind']) {
  return kind === 'homework' ? 'Assignment' : kind === 'quiz' ? 'Quiz' : kind === 'exam' ? 'Exam' : 'Event';
}

export function courseLabel(item: CanvasItem) {
  return item.courseCode ? `${item.courseCode} · ${item.courseName}` : item.courseName;
}

export function formatClock(time: number) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** "Today", "Tomorrow", weekday within the coming week, else "Mon, Dec 7". Uses local midnight boundaries. */
export function relativeDayLabel(key: DayKey, now: number) {
  const today = dayKey(new Date(now));
  if (key === today) return 'Today';
  if (key === addDays(today, 1)) return 'Tomorrow';
  if (key === addDays(today, -1)) return 'Yesterday';
  const date = parseDayKey(key);
  const diff = Math.round((date.getTime() - parseDayKey(today).getTime()) / DAY);
  if (diff > 1 && diff < 7) return WEEKDAYS[date.getDay()];
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`;
}

/** Short urgency label for graph nodes and rows: Today / Tomorrow / weekday. */
export function urgencyLabel(item: CanvasItem, now: number) {
  const key = itemDayKey(item);
  if (!key) return '';
  const label = relativeDayLabel(key, now);
  return label.includes(',') ? label.split(',')[1].trim() : label === 'Today' || label === 'Tomorrow' || label === 'Yesterday' ? label : label.slice(0, 3);
}

/** Time line for a row, e.g. "Due 11:59 PM", "2:00 PM – 3:30 PM", "All day". */
export function timeLabel(item: CanvasItem) {
  if (item.dueDate) return `Due ${formatClock(Date.parse(item.dueDate))}`;
  if (isAllDay(item)) return 'All day';
  if (item.startsAt && item.endsAt) return `${formatClock(Date.parse(item.startsAt))} – ${formatClock(Date.parse(item.endsAt))}`;
  if (item.startsAt) return formatClock(Date.parse(item.startsAt));
  return 'All day';
}

export interface DayGroup { key: DayKey; items: CanvasItem[] }

/** Split into Upcoming (soonest first) and Past (most recent first), each grouped by local day. Undated items are skipped. */
export function groupCalendar(items: CanvasItem[], now: number, examsOnly = false) {
  const dated = items.filter(item => Number.isFinite(itemStart(item)) && itemDayKey(item) && (!examsOnly || isExamOrQuiz(item)));
  const upcoming = dated.filter(item => !isPast(item, now)).sort((a, b) => itemStart(a) - itemStart(b) || a.id.localeCompare(b.id));
  const past = dated.filter(item => isPast(item, now)).sort((a, b) => itemStart(b) - itemStart(a) || a.id.localeCompare(b.id));
  return { upcoming: groupByDay(upcoming), past: groupByDay(past) };
}

export function groupByDay(sorted: CanvasItem[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of sorted) {
    const key = itemDayKey(item)!;
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return groups;
}

export function itemsByDay(items: CanvasItem[], examsOnly = false) {
  const map = new Map<DayKey, CanvasItem[]>();
  for (const item of items) {
    if (examsOnly && !isExamOrQuiz(item)) continue;
    const key = itemDayKey(item);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  for (const list of map.values()) list.sort((a, b) => itemStart(a) - itemStart(b));
  return map;
}

export interface MonthCell { key: DayKey; day: number; inMonth: boolean }

/** A Sunday-first month grid with whole weeks (5 or 6 rows). */
export function monthGrid(year: number, month: number): MonthCell[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: MonthCell[][] = [];
  const cursor = new Date(start);
  while (weeks.length < 6) {
    const week: MonthCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      week.push({ key: dayKey(cursor), day: cursor.getDate(), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor.getMonth() !== month && weeks.length >= 4) break;
  }
  return weeks;
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

/** The agreed Canvas → session draft params: kind 'session', title and course. */
export function studyDraftParams(item: CanvasItem): CreateParams {
  return { kind: 'session', title: `Study for ${displayTitle(item).title}`, course: item.courseCode ?? item.courseName };
}

export function canStudy(item: CanvasItem) {
  return isExamOrQuiz(item);
}

/** Only https Canvas URLs are opened. */
export function safeCanvasUrl(item: CanvasItem): string | null {
  return item.htmlUrl && /^https:\/\/[^/\s@]+(\/|$)/i.test(item.htmlUrl) ? item.htmlUrl : null;
}

export function lastSyncedLabel(lastSyncedAt: number | null, now: number) {
  if (lastSyncedAt === null) return 'Not synced yet';
  const minutes = Math.floor((now - lastSyncedAt) / 60_000);
  if (minutes < 1) return 'Last synced just now';
  if (minutes < 60) return `Last synced ${minutes} min ago`;
  const key = dayKey(new Date(lastSyncedAt));
  return `Last synced ${relativeDayLabel(key, now)} at ${formatClock(lastSyncedAt)}`;
}
