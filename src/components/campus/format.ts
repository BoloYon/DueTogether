/** Pure display helpers for campus screens. No React or native imports. */

const MINUTE = 60_000;
const DAY = 86_400_000;

export function pad2(value: number) {
  return String(value).padStart(2, '0');
}

/** 630 -> "10:30 AM" */
export function formatMinuteOfDay(minute: number) {
  const hours = Math.floor(minute / 60) % 24;
  const mins = minute % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return minute === 1440 ? '12:00 AM (midnight)' : `${display}:${pad2(mins)} ${suffix}`;
}

/** Parse "14:30", "2:30 pm", "9am" into minutes after local midnight. */
export function parseTimeOfDay(input: string): number | null {
  const match = input.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const mins = match[2] === undefined ? 0 : Number(match[2]);
  const suffix = match[3];
  if (mins > 59) return null;
  if (suffix) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (suffix === 'pm' ? 12 : 0);
  } else if (hours > 24 || (hours === 24 && mins > 0)) {
    return null;
  }
  return hours * 60 + mins;
}

export function dayKeyOf(epoch: number) {
  const date = new Date(epoch);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local midnight for a YYYY-MM-DD key, or NaN when invalid. */
export function dayKeyStart(dayKey: string) {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return NaN;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.getMonth() === Number(match[2]) - 1 ? date.getTime() : NaN;
}

/** Epoch for local day + minute of day. Handles DST by using Date setters. */
export function atMinute(dayKey: string, minute: number) {
  const start = dayKeyStart(dayKey);
  if (Number.isNaN(start)) return NaN;
  const date = new Date(start);
  date.setMinutes(minute);
  return date.getTime();
}

/** The next `count` local day keys starting today. */
export function upcomingDayKeys(now: number, count = 7) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(date);
    next.setDate(date.getDate() + index);
    return dayKeyOf(next.getTime());
  });
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today", "Tomorrow", or "Tue, Nov 24". */
export function formatDayLabel(dayKey: string, now: number) {
  const today = upcomingDayKeys(now, 2);
  if (dayKey === today[0]) return 'Today';
  if (dayKey === today[1]) return 'Tomorrow';
  const start = dayKeyStart(dayKey);
  if (Number.isNaN(start)) return dayKey;
  const date = new Date(start);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

export function formatClock(epoch: number) {
  const date = new Date(epoch);
  return formatMinuteOfDay(date.getHours() * 60 + date.getMinutes());
}

/** "Today 3:00 PM", "Tomorrow 9:30 AM", "Tue, Nov 24 1:00 PM". */
export function formatWhen(epoch: number, now: number) {
  return `${formatDayLabel(dayKeyOf(epoch), now)} ${formatClock(epoch)}`;
}

export function formatDuration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function formatAgo(epoch: number, now: number) {
  const diff = now - epoch;
  if (diff < MINUTE) return 'just now';
  if (diff < 60 * MINUTE) return `${Math.floor(diff / MINUTE)} min ago`;
  if (diff < DAY) return `${Math.floor(diff / (60 * MINUTE))} h ago`;
  return `${Math.floor(diff / DAY)} d ago`;
}

export function initialsOf(name: string, fallback?: string) {
  if (fallback) return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function plural(count: number, one: string, many = one + 's') {
  return `${count} ${count === 1 ? one : many}`;
}
