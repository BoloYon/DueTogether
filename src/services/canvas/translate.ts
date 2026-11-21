import type { CanvasAccount, CanvasItem, CanvasRead, RawCanvasPlannerItem } from '../../shared/types';
import { isCanvasId, isRecord } from './index';
import { hasCredentialQuery, sameOriginUrl } from './urls';

export function accountKey(origin: string, id: string) {
  return origin + '/' + encodeURIComponent(id);
}

export function dateOnly(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const time = Date.parse(value);
  if (Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value) return value;
}

export function timestamp(value: unknown): string | undefined {
  if (typeof value !== 'string' || !dateOnly(value.slice(0, 10))) return;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) &&
      Number.isFinite(Date.parse(value))) return value;
}

export function itemUrl(value: unknown, origin: string): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return;
  const url = sameOriginUrl(value, origin, origin);
  if (url && !/(?:[?&#])(?:access_token|token|authorization)=/i.test(url.href) &&
      !hasCredentialQuery(url)) return url.href;
}

const lockdownNote = /\b(?:Respondus(?:\s+Lock\s*Down\s+Browser)?|Lock\s*Down\s+Browser)\b/i;
const titleNote = /\s*(?:[-–—:]\s*)?(?:requires?\s+)?(?:Respondus\s+)?Lock\s*Down\s+Browser(?:\s*\+\s*Webcam)?\s*$/i;

function classify(type: string, raw: RawCanvasPlannerItem['plannable'], title: string): CanvasItem['kind'] {
  if (type === 'calendar_event') return 'event';
  const metadata = [raw.assignment_type, raw.quiz_type].filter((value): value is string => typeof value === 'string');
  if (type === 'exam' || metadata.some(value => /^(exam|test)$/i.test(value))) return 'exam';
  if (type === 'quiz' || isCanvasId(raw.quiz_id) || metadata.some(value => /quiz/i.test(value)) ||
      (Array.isArray(raw.submission_types) && raw.submission_types.includes('online_quiz'))) return 'quiz';
  if (/\b(?:exam|midterm|final exam|test)\b/i.test(title)) return 'exam';
  if (/\bquiz\b/i.test(title)) return 'quiz';
  return 'homework';
}

export function translateCanvas(read: CanvasRead, origin: string): { account: CanvasAccount; items: CanvasItem[] } {
  const userId = String(read.account.id);
  const account = { id: userId, name: read.account.name, origin, accountKey: accountKey(origin, userId) };
  const courses = new Map(read.courses.map(course => [String(course.id), course]));
  const items = new Map<string, { item: CanvasItem; datePriority: number }>();

  for (const row of read.plannerItems) {
    const type = row.plannable_type.toLowerCase();
    if (!['calendar_event', 'assignment', 'sub_assignment', 'quiz', 'exam', 'discussion_topic'].includes(type)) continue;
    const raw = row.plannable;
    const event = type === 'calendar_event';
    const canvasId = String(row.plannable_id);
    // Use the Canvas record kind. Title edits and reclassification must keep the same ID.
    const id = type + ':' + canvasId;
    const courseValue = row.course_id ?? raw.course_id;
    const courseId = isCanvasId(courseValue) ? String(courseValue) : undefined;
    const course = courseId ? courses.get(courseId) : undefined;
    const rawTitle = typeof raw.title === 'string' ? raw.title : typeof raw.name === 'string' ? raw.name : '';
    const title = rawTitle.replace(titleNote, '').trim() || rawTitle.trim() || 'Untitled Canvas item';

    const plannerDate = timestamp(row.plannable_date);
    const studentDue = timestamp(raw.user_due_date) ?? timestamp(raw.cached_due_date);
    const dueDate = event ? undefined : studentDue ?? plannerDate ?? timestamp(raw.due_at);
    const startsAt = event ? timestamp(raw.start_at) ?? (raw.start_at === undefined ? plannerDate : undefined) : undefined;
    const endsAt = event ? timestamp(raw.end_at) : undefined;
    const allDayDate = dateOnly(raw.all_day_date) ?? (raw.all_day === true
      ? dateOnly(row.plannable_date) ?? dateOnly(startsAt?.slice(0, 10))
      : undefined);
    if (!dueDate && !startsAt && !endsAt && !allDayDate) continue;

    const datePriority = studentDue ? 2 : plannerDate && plannerDate !== timestamp(raw.due_at) ? 1 : 0;
    const previous = items.get(id);
    if (previous && previous.datePriority > datePriority) continue;
    const contextName = isRecord(row.context) && typeof row.context.name === 'string' ? row.context.name : undefined;
    items.set(id, {
      datePriority,
      item: {
        id, canvasId, courseId, courseName: [course?.nickname, course?.name, row.context_name, contextName]
          .find((value): value is string => typeof value === 'string' && !!value.trim()) ?? (courseId ? 'Canvas course' : 'Canvas'),
        courseCode: typeof course?.course_code === 'string' ? course.course_code : undefined,
        title, kind: classify(type, raw, title), dueDate, startsAt, endsAt, allDayDate,
        htmlUrl: itemUrl(row.html_url, origin) ?? itemUrl(raw.html_url, origin),
        lockdown: lockdownNote.test(rawTitle) || (typeof raw.description === 'string' && lockdownNote.test(raw.description)) || undefined,
      },
    });
  }
  return { account, items: Array.from(items.values(), entry => entry.item) };
}
