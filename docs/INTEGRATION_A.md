# Lane A integration plan (A1 + A2)

Prepared 2026-11-21 against `main` at `4729820` (B-lane merge, PR #1). Remote: `https://github.com/BoloYon/DueTogether.git`. This is a plan only. Nothing here has been merged, rebased, cherry-picked or pushed. A human runs every step.

| Lane | Branch / worktree | State at planning time |
| --- | --- | --- |
| A1 (frontend) | `lane-a1` · `worktrees/lane-a1` | HEAD `581a4e9` (scaffold). **No commits.** 33 untracked files under `src/features/{feed,graph,calendar,onboarding}/`. No `HANDOFF.md`, no `AI_USAGE.d/A1.md`. Agent stopped. |
| A2 (Canvas data) | `lane-a2` · `worktrees/lane-a2` | 3 commits on `581a4e9`: `8b6bb1b`, `d7cba85`, `7dfdc52`. Clean tree. Has `src/services/calendar/HANDOFF.md` and `AI_USAGE.d/A2.md`. |

Both lanes branched from scaffold `581a4e9`, not from `4729820`. Since then, `main` has changed only `src/app/**` (B-lane route wiring) and B-lane-owned paths, so neither lane touches a file that changed on `main`.

**Dry run.** A2 merges cleanly into `main` (`git merge-tree --write-tree main lane-a2` → tree `7409c32`). That tree, plus A1's untracked files, plus the route and provider edits in §1–§2, was exported to a scratch copy and checked there:

- `npx tsc --noEmit` → exit 0
- `npx expo lint` → exit 0, no warnings
- `npm test` → 5/5 (baseline glob only, see §5)
- Every test file → 64/64 pass

No git state was changed by the dry run, and neither lane worktree was touched.

## 1. Route map

Each route stays a one-line re-export, in the same pattern as the B-lane wiring in `eb980ee`.

| Path | File to change | Current (sample) | Target |
| --- | --- | --- | --- |
| `/` | `src/app/(tabs)/index.tsx` | `export { FeedScreen as default } from '@/shared/baselineScreens';` | `export { FeedScreen as default } from '@/features/feed';` |
| `/calendar` | `src/app/(tabs)/calendar.tsx` | `export { CalendarScreen as default } from '@/shared/baselineScreens';` | `export { CalendarScreen as default } from '@/features/calendar';` |
| `/calendar/settings` | `src/app/calendar/settings.tsx` | `export { CalendarSettingsScreen as default } from '@/shared/baselineScreens';` | `export { CalendarSettingsScreen as default } from '@/features/calendar';` |

A1 exports: `src/features/feed/index.ts` exports `FeedScreen`. `src/features/calendar/index.ts` exports `CalendarScreen` and `CalendarSettingsScreen`. Graph (`GraphSection`, `buildGraph`, `createGraphMemory`) and onboarding (`CanvasConnectForm`, `validateCanvasBaseUrl`) stay internal to A1 and have no route.

Each of the three screens takes an optional `{ clock?: Clock }` prop and no required props. Expo Router passes no props, so the screens fall back to `Date.now`. This fits the "no required props" rule.

`src/shared/baselineScreens.tsx` keeps its sample exports. After this step no route imports `FeedScreen`, `CalendarScreen` or `CalendarSettingsScreen` from it. Deleting the file is a coordinator choice for later and is not part of this merge.

## 2. Provider swap

Target `src/app/_layout.tsx`. It differs from `main` in exactly two lines, an import and the wrapper:

```diff
 import { CampusProvider } from '@/services/db';
-import { MockCalendarProvider } from '@/shared/adapters';
+import { CalendarProvider } from '@/services/calendar';
 ...
         <CampusProvider>
-          <MockCalendarProvider>
+          <CalendarProvider>
             <Stack>
               <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
             </Stack>
-          </MockCalendarProvider>
+          </CalendarProvider>
         </CampusProvider>
```

- **Order.** Keep `GestureHandlerRootView` › `ThemeProvider` › `CampusProvider` › `CalendarProvider` › `Stack`, as in `eb980ee`. `CalendarProvider` does not call `useCampus()` and `CampusProvider` does not call `useCalendar()`, so neither depends on the other. Keeping calendar inside campus means `/`, which uses both, is wrapped by both, and it matches the B-lane layout. Mount exactly one calendar provider.
- **Default transport.** `CalendarProvider({ transport?, clock? })` uses `createCanvasTransport()` when `transport` is omitted. That uses `canvasFetch`: `expo/fetch` with `credentials: 'omit'` and `redirect: 'manual'` on native (`fetch.native.ts`), and `globalThis.fetch` on web (`fetch.ts`), with a 30 s timeout. Pass no `transport` in the root layout. Tests and harnesses inject one.
- **Clock.** Defaults to `Date.now`. Leave it unset in the layout, as `CampusProvider` is. The transport and clock are read once at mount, through `useState(() => createCalendarController(...))`, so changing either prop later has no effect.
- **Storage.** It is built at module level from AsyncStorage (cache) and SecureStore (credential, gated by `SecureStore.isAvailableAsync`). On web or with no SecureStore, `connect` returns `unavailable` and the app stays in labeled sample mode.
- **Lifecycle.** On mount it calls `controller.start()`, which restores the account-scoped snapshot and then syncs. When `AppState` becomes `active`, it calls `controller.foreground()`, which syncs only if the data is older than `CALENDAR_REFRESH_MS` (5 min). Unmount stops pending work.
- Consumers keep calling `useCalendar()` from `@/shared/adapters`. A1 never imports `@/services/calendar`.

## 3. Contract check (`src/shared/types.ts`, `src/shared/adapters.tsx`)

| Item | A1 | A2 | Result |
| --- | --- | --- | --- |
| Route exports `FeedScreen`, `CalendarScreen`, `CalendarSettingsScreen` | Named exports via `index.ts` | — | Match |
| Screen props | Optional `clock` only | — | Match (no required props) |
| Adapter access | `useCalendar()`, `useCampus()` from `@/shared/adapters` | Provides through `CalendarAdapterProvider value=…` | Match |
| `CalendarAdapter` fields `status`, `mode`, `account`, `items`, `lastSyncedAt`, `error` | Reads all six | `View = Pick<CalendarAdapter, …>` with all six | Match |
| `connect(credential)` → `CanvasResult<CanvasAccount>` | Sends `{ baseUrl: url.origin, token }` and reads `value.name` | Returns the account | Match |
| `sync()`, `disconnect()`, `enterSampleMode()` | Called with these signatures | Implemented | Match. See note on `enterSampleMode` |
| `status` values | Handles all five | Emits `disconnected`, `connecting`, `ready`, `syncing`, `error` | Match |
| `CanvasErrorCode` (11 codes) | `errorCopy` switch covers all 11 | Emits `invalid-url`, `auth`, `rate-limit`, `network`, `timeout`, `cancelled`, `unsafe-url`, `server`, `invalid-response`, `storage`, `unavailable`. Nothing outside the union | Type-level match. Meaning of `unavailable` differs, see M1 |
| `CanvasItem` / `CanvasSnapshot` | Consumes | Produces and validates on restore | Match |
| Base URL validation | `validateCanvasBaseUrl`: accepts a bare host or path and reduces it to the origin | `canvasOrigin`: accepts only an exact HTTPS origin | Compatible, because A1 always passes the normalized origin |
| `CANVAS_BASE_URL` default | Pre-fills the form from `@/shared/config` | Not read | Match |

**Mismatches**

- **M1: meaning of `unavailable` (decided, D1).** The baseline fallback uses `unavailable` for "live Canvas is not in this build", and A1's copy follows that: *"Live Canvas isn't available in this build"*, action `none`. A2 also returns `unavailable` in three other cases. From `sync()` with no session it means "Connect Canvas before syncing coursework". From `connect`/`sync` during a connect it means "busy". From `connect` without SecureStore it means "native device required". In the first two cases A1 shows the wrong message with no action. Decision: *the contract and A1 win, see §7 D1.*
- **M2: `enterSampleMode()` clears the connection (note, not a conflict).** In A2, `enterSampleMode` calls `disconnect()`, which clears the SecureStore credential and cached coursework. A2's handoff documents this. A1 shows its two "sample calendar" buttons only when `mode !== 'live'`, so no live connection is cleared by accident. Keep that rule if more buttons are added.
- **M3: stale baseline SHA in handoffs (doc only).** A2's handoff gives baseline `581a4e9`, and `PLAN.md` still says the approved baseline SHA is pending. The merge itself is unaffected.

## 4. Dependencies

Everything both lanes import is already in `package.json` on `main` and installed in `node_modules`. No `npm install` is needed for this merge.

| Package | Used by | `package.json` on main |
| --- | --- | --- |
| `expo-secure-store` | A2 `CalendarProvider` | `~58.0.3` |
| `@react-native-async-storage/async-storage` | A2 cache, A1 calendar view choice (`CalendarScreen`, view mode only, no coursework) | `2.2.0` |
| `react-native-svg` | A1 graph | `15.16.0` |
| `react-native-gesture-handler` | A1 graph, root layout | `~3.3.0` |
| `expo-web-browser` | A1 "Open in Canvas" | `~58.1.0` |
| `expo/fetch` | A2 native transport | Part of `expo` |

`app.json` needs no SecureStore config plugin for this use, because no biometric options are used.

## 5. Proposed shared changes (coordinator-owned)

Neither lane edited a shared or coordinator path. Both diffs stay inside their owned paths. Proposed follow-ups, none required for the merge:

1. **`package.json` `test` script.** `tsx --test src/**/*.test.ts src/**/*.test.tsx` runs without globstar, so it only matches `src/<dir>/*.test.ts` and runs 5 tests. Every test file passes when run directly (64 tests). Suggested: `"test": "tsx --test \"src/**/*.test.ts\" \"src/**/*.test.tsx\""`. Quoting hands the glob to Node's test runner (Node v25.8.2 here). On the dry-run tree this runs all 11 files, 64/64 pass. A2's handoff reported this too.
2. **M1 resolution (decided: the contract and A1 win).** `unavailable` keeps meaning "live Canvas is not possible here". That covers the baseline fallback and A2's no-SecureStore case. Proposed: add `'not-connected'` and `'busy'` to `CanvasErrorCode` in `src/shared/types.ts`. A2 then returns them for sync-without-session and for calls during a connect, and A1 adds copy for both (not-connected → Settings, busy → no action). Until then, step 9 of the phone QA shows the "not in this build" message. This is a known cosmetic gap, not a merge blocker.
3. **`PLAN.md` baseline SHA.** Record `4729820` (or the post-A merge SHA) as the approved baseline.

## 6. Merge order, conflicts and checks

Run from a human-controlled integration branch, for example `integration/a-lanes` off `main` `4729820`, in its own worktree. After each step run:

```sh
npm run typecheck && npm run lint && npm test && \
npx tsx --test $(find src -name '*.test.ts' -o -name '*.test.tsx')
```

| Step | Action | Likely conflicts | Expected after step |
| --- | --- | --- | --- |
| 0 | **A1 commits its work** in `lane-a1`: the 33 files under `src/features/{feed,graph,calendar,onboarding}/`, `src/features/feed/HANDOFF.md` and `AI_USAGE.d/A1.md`. Done by the A1 lane or a human, not by the integrator. | — | `git -C worktrees/lane-a1 status --short` is empty |
| 1 | Merge `lane-a2` (data first, no UI change yet) | None. Dry run is clean (tree `7409c32`) | Checks pass. App unchanged, still on `MockCalendarProvider` |
| 2 | Merge `lane-a1` | None expected: all files are new and A1-owned. A1's tests import only `@/shared/*` and A1's own modules, so they pass before §1 | Checks pass. Routes still sample |
| 3 | Coordinator commit: the three route files (§1) and `_layout.tsx` (§2) | `src/app/_layout.tsx` and `src/app/(tabs)/index.tsx` if another branch wires them first. `AI_USAGE.d/` and `docs/` only if two lanes write the same filename | typecheck 0, lint 0, 64/64 tests (matches the dry run) |
| 4 | Optional shared follow-ups (§5) | `package.json` | `npm test` lists all 11 test files |

Files to watch on other open Panes: `lane-b-polish`, `lane-docs`, `lane-canvas-live-check` and `authentication-with-a-sample-api-token` had no commits ahead of `main` at planning time. Before step 3, check again that none touches `src/app/_layout.tsx` or `src/app/(tabs)/*`.

### Phone QA (Expo Go, after step 3)

Use fictional data, or the account holder's own account only. Keep tokens, school host and real coursework out of screenshots, logs and Git.

1. Cold launch, disconnected. Feed (`/`) shows "sample coursework" labels. Calendar shows the sample banner, List view, Upcoming/Past and date groups.
2. Calendar: switch to Month. Check weekday headers, previous/next, Today, selected-day rows, and item markers. Turn on the Exams & quizzes filter in both views. Relaunch and confirm the view choice is remembered.
3. On a sample exam row, tap "Study for this". It should open `/create` with `kind: 'session'`, title and course pre-filled.
4. `/calendar/settings`: try `http://…`, `https://user@host` and a URL with `?q`. Each should be rejected with a clear message. With a valid host, the "token will be sent only to" origin is shown.
5. Live (owner's account and token only): connect, then check account name, school and "Last synced". Due time, all-day date and "Open in Canvas" should go to the exact item.
6. Pull to refresh and Sync now. Turn on airplane mode, then Sync. You should see the offline banner with Retry, and last good data stays visible.
7. Background for more than 5 minutes, then foreground. A sync runs. Relaunch: the account is restored from cache and then syncs.
8. Disconnect, then relaunch. Back in sample mode, with no prior coursework visible.
9. During a connect attempt, tap Sync. This exercises M1, so check the message shown.

## 7. Blockers and open decisions

- **B1: A1 is uncommitted.** Its 33 files are untracked in `worktrees/lane-a1`, with no `src/features/feed/HANDOFF.md` and no `AI_USAGE.d/A1.md`, which PLAN.md requires. Steps 2–3 cannot start until step 0 is done. *Decision (human, 2026-11-21): plan against A1's current untracked files.* This document reflects those files as read at planning time. If A1 changes before step 0, re-run the §6 checks.
- **D1: meaning of `unavailable` (M1).** *Decision (human, 2026-11-21): the contract and A1 win.* A2 changes the codes it returns, after the shared type change proposed in §5.2. That follow-up comes after this merge and does not block steps 1–3.
- A2 lists live Canvas and native device QA as pending. They are covered by the phone QA above.
