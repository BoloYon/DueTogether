# B2 campus data handoff

B2 · Mattias · Codex · branch `lane-b2` · worktree `C:/Users/boloy/Documents/GitHub/DueTogether/worktrees/lane-b2`. The clean checkout matched local `origin/main` when work began.

| Checkpoint | Commit |
| --- | --- |
| Baseline | `581a4e9571f57391ab9541296f583631f247a800` |
| Persistent store and session flow | `038d54d167f9eb0d12b9e0e04fa743da2d76ae65` |
| Provider, delivery, and flow checks | `feb4040a5a6a6ac3d6e9fa90672f7521119a9e02` |

## Coordinator wiring

1. Transfer the B2 commits using the human-approved procedure. In `src/app/_layout.tsx`, import `CampusProvider` from `@/services/db` and replace the `MockCampusProvider` wrapper with it in the same position. Mount one campus provider above the router screens. The calendar keeps its own provider.
2. Continue consuming `useCampus()` via `src/shared/adapters.tsx`. The synchronous result of `post/connect` carries the thread ID for navigation. Use the shared `sessionState`, `findThreadByPerson`, and `findAvailabilityOverlaps` selectors on adapter state. Use `pendingReply` for the chat typing indicator, incoming message timestamps and `readAt` for unread, and notification `href` for routing. Keep the sample campus and simulation labels visible.
3. Run `npm run typecheck`, `npm run lint`, and `npm test` on staging. In Expo Go, join and save a session, leave, then relaunch and verify the save persists. Connect through both Mira posts and verify one thread with both contexts. Send a message and leave Chat before the reply, then check its unread state. Send an invite from a matching window, background and reopen the app, and verify one accepted session and one linked notification. Mark notifications read, request and cancel a project, then verify those states after relaunch. Confirm campus reset from Profile and check that calendar state survives it.

## Behavior and verification

- The campus store uses the baseline fixtures, selectors, and reducer. It loads a versioned snapshot from `@duetogether/campus/v1` before mounting consumers and serializes background writes. Persisted IDs survive relaunch. Reset refreshes the sample campus data relative to the clock.
- Simulated replies and invite acceptances advance at provider scope while mounted, on foreground, and on hydration. The frozen thread contract has one pending reply slot, so sends within that reply interval share the queued simulated response. Invite start times must be strictly in the future per the shared reducer.
- On a storage read error, the launch uses an in-memory sample workspace and preserves the existing snapshot. A failed write is retried on the next mutation or foreground advance. Disk writes are asynchronous, so an immediate process kill can interrupt a pending save.
- Passed `npm.cmd run typecheck`, `npm.cmd run lint`, and `npm.cmd test` (7 B2 tests and 5 shared tests). B2 used memory-backed AsyncStorage-compatible tests and injectable clocks. Native AsyncStorage and AppState wiring remain for integrated device QA.
- Campus records are local sample data. Replies and invite acceptance are simulated. The provider has no Canvas credential or coursework storage.
