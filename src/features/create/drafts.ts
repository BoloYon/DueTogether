import { atMinute, dayKeyOf, parseTimeOfDay } from '@/components/campus/format';
import type { CreateParams } from '@/shared/navigation';
import { normalizeCourse } from '@/shared/selectors';
import type { PostDraft, ProjectDraft, SessionDraft } from '@/shared/types';

export type CreateKind = NonNullable<CreateParams['kind']>;
export type SubjectMode = 'course' | 'topic';
export type Errors<F> = Partial<Record<keyof F | 'form', string>>;
export type Built<T, F> = { ok: true; draft: T } | { ok: false; errors: Errors<F> };

export const DURATION_OPTIONS = [30, 60, 90, 120] as const;
export const TITLE_MAX = 80;
export const TEXT_MAX = 500;

/** Route params may arrive as string | string[] from the router; take the first. */
function first(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function resolveKind(params: CreateParams): CreateKind {
  const kind = first(params.kind);
  return kind === 'partner' || kind === 'project' || kind === 'session' ? kind : 'session';
}

/* ---------------- Session ---------------- */

export interface SessionForm {
  title: string;
  subjectMode: SubjectMode;
  course: string;
  topic: string;
  day: string;
  startTime: string;
  durationMinutes: number;
  format: 'in-person' | 'online';
  location: string;
  capacity: string;
  description: string;
}

/** Next whole hour at least 15 minutes away, as a local day key + "HH:MM". */
export function defaultStart(now: number) {
  const date = new Date(now + 15 * 60_000);
  if (date.getMinutes() || date.getSeconds() || date.getMilliseconds()) date.setHours(date.getHours() + 1, 0, 0, 0);
  return { day: dayKeyOf(date.getTime()), startTime: `${String(date.getHours()).padStart(2, '0')}:00` };
}

export function initialSessionForm(params: CreateParams, now: number): SessionForm {
  const course = first(params.course);
  const { day, startTime } = defaultStart(now);
  return {
    title: (first(params.title) ?? '').slice(0, TITLE_MAX),
    subjectMode: 'course',
    course: course ? normalizeCourse(course) : '',
    topic: '',
    day,
    startTime,
    durationMinutes: 60,
    format: 'in-person',
    location: '',
    capacity: '',
    description: '',
  };
}

export function buildSessionDraft(form: SessionForm, now: number): Built<SessionDraft, SessionForm> {
  const errors: Errors<SessionForm> = {};
  const title = form.title.trim();
  if (!title) errors.title = 'Add a title.';
  const course = form.subjectMode === 'course' ? normalizeCourse(form.course) : undefined;
  const topic = form.subjectMode === 'topic' ? form.topic.trim() : undefined;
  if (form.subjectMode === 'course' && !course) errors.course = 'Enter a course code, or switch to a personal topic.';
  if (form.subjectMode === 'topic' && !topic) errors.topic = 'Enter a topic.';
  const minute = parseTimeOfDay(form.startTime);
  const startsAt = minute === null ? NaN : atMinute(form.day, minute);
  if (minute === null || minute >= 1440) errors.startTime = 'Use a time like 14:30 or 2:30 pm.';
  else if (!Number.isFinite(startsAt)) errors.day = 'Choose a day.';
  else if (startsAt < now) errors.startTime = 'Choose a start time in the future.';
  if (!Number.isInteger(form.durationMinutes) || form.durationMinutes <= 0) errors.durationMinutes = 'Choose a duration.';
  let capacity: number | undefined;
  if (form.capacity.trim()) {
    capacity = Number(form.capacity.trim());
    if (!Number.isInteger(capacity) || capacity < 2 || capacity > 100) errors.capacity = 'Enter a whole number from 2 to 100, or leave blank for no limit.';
  }
  const location = form.location.trim();
  if (form.format === 'in-person' && !location) errors.location = 'Add where you will meet.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    draft: {
      title,
      ...(course ? { course } : {}),
      ...(topic ? { topic } : {}),
      startsAt,
      durationMinutes: form.durationMinutes,
      format: form.format,
      ...(location ? { location } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
    },
  };
}

/* ---------------- Partner post ---------------- */

export interface PostForm { title: string; subjectMode: SubjectMode; course: string; topic: string; description: string }

export function initialPostForm(params: CreateParams): PostForm {
  const course = first(params.course);
  return {
    title: (first(params.title) ?? '').slice(0, TITLE_MAX),
    subjectMode: 'course', course: course ? normalizeCourse(course) : '', topic: '', description: '',
  };
}

export function buildPostDraft(form: PostForm): Built<PostDraft, PostForm> {
  const errors: Errors<PostForm> = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const course = form.subjectMode === 'course' ? normalizeCourse(form.course) : undefined;
  const topic = form.subjectMode === 'topic' ? form.topic.trim() : undefined;
  if (!title) errors.title = 'Add a title.';
  if (form.subjectMode === 'course' && !course) errors.course = 'Enter a course code, or switch to a personal topic.';
  if (form.subjectMode === 'topic' && !topic) errors.topic = 'Enter a topic.';
  if (!description) errors.description = 'Describe your goals so classmates know what to expect.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, draft: { title, description, ...(course ? { course } : {}), ...(topic ? { topic } : {}) } };
}

/* ---------------- Project ---------------- */

export interface ProjectForm {
  title: string; pitch: string; roles: string; capacity: string;
  categoryMode: 'course' | 'personal'; course: string; category: string;
}

export function initialProjectForm(params: CreateParams): ProjectForm {
  const course = first(params.course);
  return {
    title: (first(params.title) ?? '').slice(0, TITLE_MAX), pitch: '', roles: '', capacity: '4',
    categoryMode: course ? 'course' : 'personal', course: course ? normalizeCourse(course) : '', category: 'Personal',
  };
}

export function parseRoles(input: string) {
  return [...new Set(input.split(/[,\n]/).map(role => role.trim()).filter(Boolean))];
}

export function buildProjectDraft(form: ProjectForm): Built<ProjectDraft, ProjectForm> {
  const errors: Errors<ProjectForm> = {};
  const title = form.title.trim();
  const pitch = form.pitch.trim();
  const openRoles = parseRoles(form.roles);
  const capacity = Number(form.capacity.trim());
  const course = form.categoryMode === 'course' ? normalizeCourse(form.course) : undefined;
  const category = form.categoryMode === 'personal' ? form.category.trim() : undefined;
  if (!title) errors.title = 'Add a project title.';
  if (!pitch) errors.pitch = 'Add a short pitch.';
  if (!openRoles.length) errors.roles = 'List at least one open role, separated by commas.';
  if (!form.capacity.trim() || !Number.isInteger(capacity) || capacity < 2 || capacity > 20) errors.capacity = 'Team size must be a whole number from 2 to 20, including you.';
  else if (openRoles.length > capacity - 1) errors.roles = `A team of ${capacity} has room for ${capacity - 1} more ${capacity - 1 === 1 ? 'person' : 'people'}. Remove a role or raise the size.`;
  if (form.categoryMode === 'course' && !course) errors.course = 'Enter a course code, or choose Personal.';
  if (form.categoryMode === 'personal' && !category) errors.category = 'Enter a category, such as Personal or Club.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, draft: { title, pitch, openRoles, capacity, ...(course ? { course } : {}), ...(category ? { category } : {}) } };
}
