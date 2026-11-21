
export type Id = string;
export type DayKey = string;
export type ISODateTime = string;
export type EpochMillis = number;
export type Clock = () => EpochMillis;

export interface User { id: Id; name: string; major?: string; year?: string; initials?: string; courses: string[] }
export interface Course { id: Id; name: string; code?: string }
export interface DateRange { start: ISODateTime; end: ISODateTime }
export interface CanvasItem {
  id: Id;
  canvasId: Id;
  courseId?: Id;
  courseName: string;
  courseCode?: string;
  title: string;
  kind: 'homework' | 'quiz' | 'exam' | 'event';
  dueDate?: ISODateTime;
  startsAt?: ISODateTime;
  endsAt?: ISODateTime;
  allDayDate?: DayKey;
  htmlUrl?: string;
  lockdown?: boolean;
}
export interface CanvasSnapshot { accountKey: string; range: DateRange; items: CanvasItem[]; fetchedAt: EpochMillis }
export interface StudySession {
  id: Id;
  title: string;
  course?: string;
  topic?: string;
  hostId: Id;
  attendeeIds: Id[];
  startsAt: EpochMillis;
  endsAt: EpochMillis;
  createdAt: EpochMillis;
  capacity?: number;
  location?: string;
  format?: 'in-person' | 'online';
  description?: string;
}
export interface PartnerPost { id: Id; authorId: Id; course?: string; topic?: string; title: string; description: string; createdAt: EpochMillis }
export interface Project { id: Id; title: string; pitch: string; ownerId: Id; teamIds: Id[]; openRoles: string[]; capacity: number; course?: string; category?: string; createdAt: EpochMillis }
export interface Membership { userId: Id; projectId: Id; status: 'requested' | 'member' }
export interface Message { id: Id; authorId: Id; text: string; sentAt: EpochMillis; course?: string }
export interface Thread { id: Id; personId: Id; postIds: Id[]; messages: Message[]; readAt?: EpochMillis; pendingReply?: { id: Id; text: string; dueAt: EpochMillis; course?: string } }
export interface AvailabilityWindow { date: DayKey; startMinute: number; endMinute: number }
export interface AvailabilityMatch extends AvailabilityWindow { personId: Id; course: string }
export interface StudyInvite { id: Id; personId: Id; course: string; startsAt: EpochMillis; endsAt: EpochMillis; location?: string; status: 'pending' | 'accepted'; acceptAt?: EpochMillis; sessionId?: Id }
export interface Notification { id: Id; title: string; body: string; createdAt: EpochMillis; read: boolean; href?: string }
export interface CampusState {
  currentUser: User;
  people: User[];
  sessions: StudySession[];
  savedSessionIds: Id[];
  posts: PartnerPost[];
  postToThread: Partial<Record<Id, Id>>;
  threads: Thread[];
  projects: Project[];
  memberships: Membership[];
  availability: Partial<Record<Id, Partial<Record<string, AvailabilityWindow[]>>>>;
  invites: StudyInvite[];
  notifications: Notification[];
}

export type SessionDraft = Pick<StudySession, 'title' | 'course' | 'topic' | 'startsAt' | 'location' | 'format' | 'description' | 'capacity'> & { durationMinutes: number };
export type PostDraft = Pick<PartnerPost, 'course' | 'topic' | 'title' | 'description'>;
export type ProjectDraft = Pick<Project, 'title' | 'pitch' | 'openRoles' | 'capacity' | 'course' | 'category'>;
export type InviteDraft = Pick<StudyInvite, 'personId' | 'course' | 'startsAt' | 'endsAt' | 'location'>;
export type CampusAction =
  | { type: 'session/create'; draft: SessionDraft }
  | { type: 'session/join' | 'session/leave' | 'session/save' | 'session/unsave'; id: Id }
  | { type: 'post/create'; draft: PostDraft }
  | { type: 'post/connect'; postId: Id }
  | { type: 'chat/send'; threadId: Id; text: string; course?: string }
  | { type: 'chat/read'; threadId: Id }
  | { type: 'availability/upsert'; course: string; window: AvailabilityWindow; previous?: AvailabilityWindow }
  | { type: 'availability/remove'; course: string; window: AvailabilityWindow }
  | { type: 'invite/send'; draft: InviteDraft }
  | { type: 'project/create'; draft: ProjectDraft }
  | { type: 'project/request' | 'project/cancel'; id: Id }
  | { type: 'profile/update'; profile: Pick<User, 'name' | 'major'> }
  | { type: 'notification/read'; id: Id }
  | { type: 'notification/readAll' }
  | { type: 'demo/reset' };
export type CampusResult = { ok: true; id?: Id } | { ok: false; error: 'invalid' | 'missing' | 'full' | 'ended' | 'forbidden'; message: string };
export interface CampusAdapter { state: CampusState; dispatch(action: CampusAction): CampusResult }

export interface CanvasCredential { baseUrl: string; token: string }
export interface CanvasAccount { id: Id; name: string; origin: string; accountKey: string }
export type CanvasErrorCode = 'invalid-url' | 'auth' | 'rate-limit' | 'network' | 'timeout' | 'cancelled' | 'unsafe-url' | 'server' | 'invalid-response' | 'storage' | 'unavailable' | 'not-connected' | 'busy';
export interface CanvasError { code: CanvasErrorCode; message: string; retryAfterMs?: number }
export type CanvasResult<T> = { ok: true; value: T } | { ok: false; error: CanvasError };
export interface CanvasRequestOptions { signal?: AbortSignal }

export interface RawCanvasUser { id: number | string; name: string }
export interface RawCanvasCourse { id: number | string; name: string; course_code?: string; nickname?: string }
export interface RawCanvasPlannable {
  id?: number | string;
  title?: string;
  name?: string;
  course_id?: number | string;
  due_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  all_day?: boolean;
  all_day_date?: string | null;
  html_url?: string;
  quiz_id?: number | string | null;
  description?: string | null;
  [key: string]: unknown;
}
export interface RawCanvasPlannerItem {
  course_id?: number | string | null;
  plannable_id: number | string;
  plannable_type: string;
  plannable_date?: string | null;
  html_url?: string | null;
  plannable: RawCanvasPlannable;
  [key: string]: unknown;
}
export interface CanvasRead { account: RawCanvasUser; courses: RawCanvasCourse[]; plannerItems: RawCanvasPlannerItem[] }
export interface CanvasTransport {
  getSelf(credential: CanvasCredential, options?: CanvasRequestOptions): Promise<CanvasResult<RawCanvasUser>>;
  listCourses(credential: CanvasCredential, options?: CanvasRequestOptions): Promise<CanvasResult<RawCanvasCourse[]>>;
  listPlannerItems(credential: CanvasCredential, range: DateRange, options?: CanvasRequestOptions): Promise<CanvasResult<RawCanvasPlannerItem[]>>;
  read(credential: CanvasCredential, range: DateRange, options?: CanvasRequestOptions): Promise<CanvasResult<CanvasRead>>;
}
export interface CalendarAdapter {
  status: 'disconnected' | 'connecting' | 'ready' | 'syncing' | 'error';
  mode: 'sample' | 'live';
  account: CanvasAccount | null;
  items: CanvasItem[];
  lastSyncedAt: EpochMillis | null;
  error: CanvasError | null;
  connect(credential: CanvasCredential): Promise<CanvasResult<CanvasAccount>>;
  sync(): Promise<CanvasResult<CanvasSnapshot>>;
  disconnect(): Promise<CanvasResult<void>>;
  enterSampleMode(): void;
}
