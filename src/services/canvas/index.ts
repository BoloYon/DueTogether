import type {
  CanvasCredential, CanvasError, CanvasRequestOptions, CanvasResult, CanvasTransport,
  DateRange, RawCanvasCourse, RawCanvasPlannerItem, RawCanvasUser,
} from '../../shared/types';
import { canvasFetch } from './fetch';
import { canvasOrigin, sameOriginUrl } from './urls';

type Fetch = (url: string, init: RequestInit) => Promise<Pick<Response, 'status' | 'ok' | 'headers' | 'json' | 'redirected' | 'type' | 'url'>>;
type Guard<T> = (value: unknown) => value is T;

const invalidResponse: CanvasError = { code: 'invalid-response', message: 'Canvas returned an unreadable response.' };
const unsafeUrl: CanvasError = { code: 'unsafe-url', message: 'Canvas returned an unsafe redirect or pagination link.' };

function failure(error: CanvasError): CanvasResult<never> {
  return { ok: false, error };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isCanvasId(value: unknown): value is string | number {
  return (typeof value === 'string' && value.trim().length > 0) ||
    (typeof value === 'number' && Number.isSafeInteger(value));
}

const isUser: Guard<RawCanvasUser> = (value): value is RawCanvasUser =>
  isRecord(value) && isCanvasId(value.id) && typeof value.name === 'string';
const isCourse: Guard<RawCanvasCourse> = (value): value is RawCanvasCourse => isUser(value);
const isPlanner: Guard<RawCanvasPlannerItem> = (value): value is RawCanvasPlannerItem =>
  isRecord(value) && isCanvasId(value.plannable_id) &&
  typeof value.plannable_type === 'string' && isRecord(value.plannable);

function statusError(response: Awaited<ReturnType<Fetch>>): CanvasError {
  if (response.status === 401 || response.status === 403) {
    return { code: 'auth', message: 'Canvas refused access. Check the token and its permissions.' };
  }
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const retryAfterMs = retryAfter && /^\d+$/.test(retryAfter)
      ? Number(retryAfter) * 1000
      : retryAfter ? Math.max(0, Date.parse(retryAfter) - Date.now()) : undefined;
    return {
      code: 'rate-limit', message: 'Canvas is limiting requests. Try again shortly.',
      ...(Number.isFinite(retryAfterMs) ? { retryAfterMs } : {}),
    };
  }
  return { code: 'server', message: 'Canvas could not complete the request.' };
}

function nextLink(header: string): string | undefined {
  // Match whole links so commas in URL query values do not split them.
  for (const match of header.matchAll(/<([^>]*)>((?:[^,<"]|"[^"]*")*)/g)) {
    const rel = /(?:^|;)\s*rel\s*=\s*(?:"([^"]*)"|([^;\s]+))/i.exec(match[2]);
    if ((rel?.[1] ?? rel?.[2])?.toLowerCase().split(/\s+/).includes('next')) return match[1];
  }
}

export function createCanvasTransport({ fetch: request = canvasFetch, timeoutMs = 30_000 }: {
  fetch?: Fetch; timeoutMs?: number;
} = {}): CanvasTransport {
  async function run<T>(
    credential: CanvasCredential,
    options: CanvasRequestOptions | undefined,
    work: (read: {
      one: <V>(path: string, guard: Guard<V>) => Promise<V>;
      pages: <V>(path: string, guard: Guard<V>) => Promise<V[]>;
    }) => Promise<T>,
  ): Promise<CanvasResult<T>> {
    const validatedOrigin = canvasOrigin(credential.baseUrl);
    if (!validatedOrigin) return failure({ code: 'invalid-url', message: 'Enter the HTTPS origin of your school’s Canvas site.' });
    const origin = validatedOrigin;
    const token = credential.token.trim();
    if (!token || /\s/.test(token)) return failure({ code: 'auth', message: 'Enter a valid Canvas access token.' });

    const caller = options?.signal;
    const cancelled: CanvasError = { code: 'cancelled', message: 'Canvas request cancelled.' };
    if (caller?.aborted) return failure(cancelled);
    const controller = new AbortController();
    const timeout: CanvasError = { code: 'timeout', message: 'Canvas took too long to respond.' };
    let stopped: CanvasError | undefined;
    let stopWork: (error: CanvasError) => void = () => {};
    const interruption = new Promise<CanvasResult<T>>(resolve => { stopWork = error => resolve(failure(error)); });
    const stop = (error: CanvasError) => {
      stopped = error;
      stopWork(error);
      controller.abort();
    };
    const abort = () => stop(cancelled);
    caller?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => stop(timeout), timeoutMs);

    async function get(path: string) {
      if (stopped) throw stopped;
      const url = sameOriginUrl(path, origin, origin);
      if (!url || url.hash || url.searchParams.has('access_token')) throw unsafeUrl;
      const response = await request(url.href, {
        method: 'GET', redirect: 'manual', credentials: 'omit',
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        signal: controller.signal,
      });
      if (stopped) throw stopped;
      if (response.redirected || response.type === 'opaqueredirect' ||
          (response.status >= 300 && response.status < 400) ||
          (response.url && !sameOriginUrl(response.url, url.href, origin))) throw unsafeUrl;
      if (!response.ok) throw new HttpFailure(statusError(response));
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw invalidResponse;
      }
      if (stopped) throw stopped;
      return { body, next: nextLink(response.headers.get('link') ?? ''), url };
    }

    const operation = work({
      async one(path, guard) {
        const { body } = await get(path);
        if (!guard(body)) throw invalidResponse;
        return body;
      },
      async pages<V>(path: string, guard: Guard<V>) {
        const items: V[] = [];
        const seen = new Set<string>();
        let url: URL | undefined = new URL(path, origin);
        while (url) {
          if (seen.has(url.href) || seen.size >= 100) throw invalidResponse;
          seen.add(url.href);
          const page = await get(url.href);
          if (!Array.isArray(page.body) || !page.body.every(guard)) throw invalidResponse;
          items.push(...page.body);
          if (page.next === undefined) break;
          url = sameOriginUrl(page.next, page.url.href, origin);
          if (!url || !page.next) throw unsafeUrl;
        }
        return items;
      },
    }).then<CanvasResult<T>, CanvasResult<T>>(
      value => ({ ok: true, value }),
      error => failure(stopped ?? (error === invalidResponse || error === unsafeUrl
        ? error
        : error instanceof HttpFailure ? error.details
          : { code: 'network', message: 'Could not reach Canvas. Check your connection and try again.' })),
    );
    try {
      return await Promise.race([operation, interruption]);
    } finally {
      clearTimeout(timer);
      caller?.removeEventListener('abort', abort);
    }
  }

  const selfPath = '/api/v1/users/self';
  const coursesPath = '/api/v1/courses?enrollment_state=active&per_page=100';
  const plannerPath = (range: DateRange) => '/api/v1/planner/items?' + new URLSearchParams({
    start_date: range.start, end_date: range.end, per_page: '100',
  }).toString();

  return {
    getSelf: (credential, options) => run(credential, options, api => api.one(selfPath, isUser)),
    listCourses: (credential, options) => run(credential, options, api => api.pages(coursesPath, isCourse)),
    listPlannerItems: (credential, range, options) => run(credential, options, api => api.pages(plannerPath(range), isPlanner)),
    read: (credential, range, options) => run(credential, options, async api => ({
      account: await api.one(selfPath, isUser),
      courses: await api.pages(coursesPath, isCourse),
      plannerItems: await api.pages(plannerPath(range), isPlanner),
    })),
  };
}

class HttpFailure {
  constructor(readonly details: CanvasError) {}
}
