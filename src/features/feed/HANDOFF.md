# A1 frontend handoff

A1 is Matheus's Claude Code frontend lane, on branch `lane-a1` at `worktrees/lane-a1`. It started from scaffold `581a4e9`. Its work was committed as `ae822f0` and merged into `main`.

## What A1 owns

- `src/features/feed/`: `FeedScreen` (route `/`), list rows, social preview, reveal motion and actions.
- `src/features/graph/`: `GraphSection`, `buildGraph`, `createGraphMemory`. These are internal to the feed and have no route.
- `src/features/calendar/`: `CalendarScreen` (`/calendar`, List and Month views) and `CalendarSettingsScreen` (`/calendar/settings`), plus error copy in `status.ts`.
- `src/features/onboarding/`: `CanvasConnectForm` and `validateCanvasBaseUrl`.

Each screen takes an optional `clock` prop and no required props. A1 reads data only through `useCalendar()` and `useCampus()` from `@/shared/adapters`.

## Integration (done)

- The three routes re-export A1's screens, and `_layout.tsx` mounts the A2 `CalendarProvider` inside `CampusProvider`.
- Decision D1: `unavailable` means "live Canvas isn't possible here". Sync with no session returns `not-connected` (action: Settings), and calls during a connect return `busy` (no action).

## Verification

`npm run typecheck`, `npm run lint` and `npm test` pass: 66 of 66 tests, including `feed`, `graph`, `calendar` and `canvasUrl` tests.

## Pending

Phone QA in Expo Go: follow `docs/PHONE_QA.md` and §6 of `docs/INTEGRATION_A.md`. Graph gestures, reduced motion and the live Canvas connection haven't been checked on a device.
