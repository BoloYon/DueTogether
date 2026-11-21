# Canvas live check: lane A2 transport

- Date: 2026-11-21
- Code under test: `lane-a2` @ `7dfdc52` (`src/services/canvas`, `src/shared`), exported with `git archive` to scratch. Not modified.
- Target: the person's school Canvas (HTTPS origin, validated by `canvasOrigin`), the person's own account, a newly generated personal access token held as a Pane secret and passed only as an environment variable via `runpane secrets exec`.
- Method: a tsx script calling `createCanvasTransport()` with an observing `fetch` wrapper. The wrapper records only status, the presence and origin of the Link `next` header, and rate-limit headers. It records no URLs, headers or bodies. GET only.
- Redaction: this report has counts and shapes only. It has no course names, titles, IDs, host name or token. The account key is shown as a shape (`https://<host>/DDDDD`).
- Pagination was tested twice: as shipped (`per_page=100`), and with a test-only shim in the wrapper that lowered `per_page` on the *first* request, so every later page came only from Canvas's Link `rel="next"` header.

## Summary

| # | Check | Result |
|---|---|---|
| 1 | getSelf / account key | **PASS** |
| 2 | listCourses + Link pagination | **PASS** |
| 3 | listPlannerItems (3 weeks) | **PASS**, with gaps noted below |
| 4 | Composed `read()` end to end | **PASS** |
| 5 | Failure paths | **PASS** (one classification note) |
| 6 | Rate-limit headers | Present; recorded |

## 1. getSelf

- 1 request, 200, no redirect, response URL same origin.
- `id` is a number. `name` is present.
- `translateCanvas` account key = `origin + '/' + id`, shape `https://<host>/DDDDD`. Starts with the validated origin: yes.

## 2. listCourses (`enrollment_state=active&per_page=100`)

| Run | Requests | Pages with `next` | `next` same origin | Courses | Unique IDs |
|---|---|---|---|---|---|
| As shipped | 1 | 0 | n/a | 18 | 18 |
| Forced `per_page=2` | 9 | 8 | 8/8 | 18 | 18 |

- Canvas keeps `per_page` in each `next` link (it stayed at 2). None of the `next` links had a credential-like query parameter.
- 18/18 have `course_code`. 0/18 have `nickname` (this account sets none), so the nickname path was not exercised live.
- 18 "active" enrollments is many for one term. Canvas's `active` enrollment state can include courses from past terms that haven't been concluded. That's harmless for the planner query, but it widens the course map.

## 3. listPlannerItems, 3 weeks (now − 7 d … now + 14 d)

| Run | Requests | Pages with `next` | `next` same origin | Raw rows |
|---|---|---|---|---|
| As shipped | 1 | 0 | n/a | 23 |
| Forced `per_page=5` | 5 | 4 | 4/4 | 23 |

The results were identical across both runs, so pagination didn't drop or duplicate anything.

- Raw `plannable_type`: assignment 13, quiz 3, announcement 7.
- Supported rows: 16. Translated: 16. Skipped or merged: 0. Duplicate IDs across pages: 0.
- Kinds: homework 13, quiz 3, exam 0, event 0.
- **Exact due times:** 16/16 timestamps valid ISO. Every live timestamp is UTC `YYYY-MM-DDTHH:MM:SSZ`. `dueDate` equals `plannable_date` for 16/16.
- **All-day:** 0 raw rows with `all_day`/`all_day_date`. 0 calendar events came back, so the all-day path was **not exercised live** (see Gaps).
- **No usable date:** 0 supported rows lacked a date, so the skip path was not exercised live. The unit test still covers it.
- **Item URLs:** raw `html_url` was relative on 23/23 rows. Translated items with a URL: 16/16. All resolve to the configured origin, with no credential query parameters and no userinfo.
- **Stable IDs:** 16/16 match `<plannable_type>:<plannable_id>` and end with `canvasId`.
- LockDown tag recognised on 2 items.
- Student override fields (`user_due_date`/`cached_due_date`): present on 0 rows. Canvas already puts the student's effective date in `plannable_date`, which the translation prefers.

## 4. Composed `read()`

| Window | Request order | Courses | Raw planner rows | Planner pages | Translated |
|---|---|---|---|---|---|
| 3 weeks | self → courses → planner | 18 | 23 | 1 | 16 |
| Default 120 d back / 180 d ahead | self → courses → planner | 18 | 204 | **3 (natural Link pagination at 100/page)** | 102 |

- Default window raw types: announcement 93, assignment 73, quiz 16, discussion_topic 13, assessment_request 9.
- Translated kinds: homework 86, quiz 16. Exam 0, event 0.
- 102/102 have a `courseId` that matches a listed course, 102/102 have a `courseCode`, 0 use the fallback course name, and 0 are untitled.
- 102/102 have valid exact timestamps, 102/102 stable IDs and 102/102 safe item URLs. 8 have the LockDown tag.
- Account key from `read()` starts with the validated origin: yes.

## 5. Failure paths (approved by the person)

| Case | Code returned | Leak scan (token / URL / host / auth header) |
|---|---|---|
| Bad token against the real host | `auth` | clean |
| Nonexistent host (`.invalid`) | `network` | clean |
| Real token against another Canvas host (`canvas.instructure.com`) | `server` | clean |
| `http://` scheme | `invalid-url` (no request sent) | clean |
| Abort ~400 ms into `read()` (small pages) | `cancelled`; 2 requests had completed when it resolved and still 2 after 3 s, so pagination stopped | clean |
| Signal already aborted | `cancelled` (no request sent) | clean |
| `timeoutMs: 5` on the default-window `read()` | `timeout` after ~6 ms | clean |

Note: the foreign-Canvas-host case was classified as `server`, not `auth`. The script didn't record the HTTP status, and I didn't resend the token to find out. If that host answered a token it doesn't know with a non-401/403 status (for example 400), the user sees "Canvas could not complete the request" instead of "Check the token". Consider mapping 400 responses carrying an `invalid access token` error, or a `WWW-Authenticate` header, to `auth`.

## 6. Rate limits

- `X-Rate-Limit-Remaining` was on every response: min 700, max 700 (Canvas's bucket refills quickly at this volume).
- `X-Request-Cost` was on every response: max ≈ 1.05 (the 300-day planner page). Most requests cost ≈ 0.1–0.8.
- No `429` and no `Retry-After` header was seen, so the `rate-limit` path was not exercised live (the unit test covers it).

## Gaps and suggestions for A2

1. **No calendar events came back.** `/api/v1/planner/items` returned zero `calendar_event` rows in either window, which is why the all-day path was not exercised. Canvas may only include calendar events for the contexts named in `context_codes[]`. The account might also simply have none. Worth checking against one known course event before relying on "dated calendar events where supported".
2. **Exams.** 0 items were classified `exam`. Live plannables carry no `assignment_type`/`quiz_type`/`submission_types`/`quiz_id` (keys seen: `assignment_id, created_at, due_at, id, lock_at, points_possible, read_state, title, todo_date, unread_count, updated_at, workflow_state`). So exam detection depends entirely on `plannable_type` and title clues. New Quizzes (`plannable_type: assignment`) will show as homework unless the title says quiz/exam.
3. **Dropped types with dates:** `assessment_request` (peer reviews, 9 in the default window) and `announcement` (93) are dropped by design. Peer reviews have real due dates, so consider mapping them to `homework`.
4. **Discussions without a due date** use `todo_date`. 9 of the 13 discussion topics had one. They translate via `plannable_date`, which matched.
5. The foreign-host `server` classification (section 5).

## Differences from the mock fixtures (`canvas.test.ts`)

| Aspect | Mock | Live |
|---|---|---|
| Timestamp offset | `-05:00` offsets | Always UTC `Z` |
| `plannable_date` | Sometimes absent | Always present (204/204) |
| Quiz metadata | `quiz_id` on plannable | No `quiz_id`; quizzes come as `plannable_type: quiz` |
| Course `nickname` | Present | Absent (0/18) |
| All-day calendar event | Present | None returned |
| `html_url` | Relative on the row; absolute foreign URL on an event | Relative on every row |
| Row extras | n/a | `context_name`, `context_type`, `context_image`, `planner_override`, `submissions`, `new_activity` |
| Course pagination | Empty first page + `?page=2` | Canvas `next` links keep `per_page`; with 18 courses one page at 100 |
| Planner pagination | Single page | 3 pages at 100/page for the default window |
| Rate headers | Only in the 429 test | `X-Rate-Limit-Remaining` / `X-Request-Cost` on every response |

## Draft text for `src/services/calendar/HANDOFF.md` (for A2's owner to paste)

```markdown
### Live Canvas check (2026-11-21, transport @ 7dfdc52)

Ran `createCanvasTransport()` against a real school Canvas account (GET only, own account, new PAT via Pane secret; nothing recorded beyond counts).

- PASS getSelf: numeric id; account key `origin/<id>`.
- PASS listCourses: 18 active courses; Link `rel="next"` pagination followed same-origin (9 pages at per_page=2).
- PASS listPlannerItems: 3-week window 23 rows → 16 items; forced 5/page gave identical results; default 120/180 window paginated naturally (3 pages, 204 rows → 102 items).
- PASS translation: all exact timestamps valid (live is always UTC `Z`), stable IDs `<type>:<id>`, all item URLs same-origin, every item matched a course with a code, no duplicates.
- PASS failures: bad token → `auth`; nonexistent host → `network`; aborted → `cancelled` (pagination stopped); 5 ms → `timeout`; `http://` → `invalid-url`. No error contained the token, a URL or the host.
- Rate headers present (`X-Rate-Limit-Remaining` 700, max `X-Request-Cost` ≈ 1.05); no 429 seen.

Not exercised live: all-day calendar events (planner returned no `calendar_event` rows; check whether `context_codes[]` is needed), nickname, 429, missing-date skip.
Follow-ups: exams are only detectable by type or title (live plannables have no quiz/assignment metadata); consider mapping `assessment_request` (peer reviews) to homework; a real token sent to a different Canvas host came back as `server`, not `auth`.
```
