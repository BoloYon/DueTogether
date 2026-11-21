
# DueTogether HackJam baseline

Approved baseline Git SHA: `4729820` (B-lane merge, PR #1). Lanes A1 and A2 started from scaffold `581a4e9`; both were merged on top of `4729820`. Verify with `git rev-parse HEAD` and use this ID when recording lane handoffs.

The specified checkout and remote were empty. Mattias approved generating a fresh Expo SDK 58 default template directly in the existing repository. npm owns the single lockfile. Expo Router owns the entry point and the coordinator owns `src/app/`. The setup contains an in-memory campus provider and a sample-only calendar provider. Replace those during integration. See BUILD_BRIEF.txt for the complete acceptance specification and lane launch prompts.

## Ownership and dependencies

| Lane | Machine and tool | Owned paths | Dependencies |
| --- | --- | --- | --- |
| A1 | Matheus · Claude Code · Frontend | `src/features/feed/`, `src/features/graph/`, `src/features/calendar/`, `src/features/onboarding/`, `AI_USAGE.d/A1.md` | Shared adapters, selectors and navigation, React Native SVG and Gesture Handler |
| A2 | Matheus · Codex · Backend / Canvas data | `src/services/canvas/`, `src/services/calendar/`, `AI_USAGE.d/A2.md` | Shared Canvas contract, Expo SecureStore and AsyncStorage |
| B1 | Mattias · Claude Code · Frontend | `src/features/sessions/`, `src/features/partners/`, `src/features/chat/`, `src/features/projects/`, `src/features/profile/`, `src/features/notifications/`, `src/features/create/`, `src/components/`, `AI_USAGE.d/B1.md` | Shared adapters, selectors, navigation and scaffold primitives |
| B2 | Mattias · Codex · Backend / Campus data | `src/services/db/`, `AI_USAGE.d/B2.md` | Shared campus contract, clock, fixtures, selectors and AsyncStorage |

Owned paths include colocated tests. Put HANDOFF.md in A1 feed, A2 calendar, B1 sessions and B2 db. Coordinator ownership covers `src/shared/**`, `src/app/**`, root entry/navigation, global styling/theme, package/config and lockfile, `.gitignore`, `.gitattributes`, `.env.example`, AGENTS.md, CLAUDE.md, PLAN.md, BUILD_BRIEF.txt, README.md and AI_USAGE.md. Lanes compile against baseline contracts without importing an unmerged sibling implementation. Report proposed shared changes in your handoff.

## Route and feature exports

Each entry below is a named React component export, with no required props unless specified. Each tab uses its own root route. The coordinator switches each thin route from the sample component to the indicated feature component during integration.

| Path | Module under src/features | Export |
| --- | --- | --- |
| / | feed | FeedScreen |
| /partners | partners | PartnersScreen |
| /projects | projects | ProjectsScreen |
| /calendar | calendar | CalendarScreen |
| /profile | profile | ProfileScreen |
| /create | create | CreateScreen(props: CreateParams) |
| /session/[id] | sessions | SessionScreen(props: DetailParams) |
| /person/[id] | partners | PersonScreen(props: DetailParams) |
| /chat/[id] | chat | ChatScreen(props: DetailParams) |
| /project/[id] | projects | ProjectScreen(props: DetailParams) |
| /calendar/settings | calendar | CalendarSettingsScreen |
| /partners/find | partners | PartnerFindScreen |
| /partners/availability | partners | AvailabilityScreen |
| /partners/invite | partners | InviteScreen |
| /notifications | notifications | NotificationsScreen |
| /profile/settings | profile | ProfileSettingsScreen |

Export feature entries through `index.ts` or `index.tsx` in the indicated directory. `DetailParams = { id: string }`. `CreateParams = { course?: string; title?: string; kind?: 'session' | 'partner' | 'project' }`. Canvas Study for this passes `kind: 'session'` with title and course. Graph and onboarding are A1-internal modules called through Feed or Calendar. `src/shared/navigation.ts` owns paths and route builders.

## Shared interfaces

- `useCampus(): CampusAdapter` exposes `state` and synchronous `dispatch(action: CampusAction): CampusResult`. Successful connect and create actions return the route/entity ID. Failed actions return a domain code and readable message. Availability is keyed by person ID and normalized course. Thread presence is the connection source. Standard commands live in `src/shared/types.ts`.
- `useCalendar(): CalendarAdapter` supplies sample/live mode, status, account, items, sync time, error and async connect/sync/disconnect results. `enterSampleMode(): void`. Only the transient connect argument receives credentials. The fallback returns `unavailable` for live actions.
- Tests and harnesses can mount `CampusAdapterProvider` and `CalendarAdapterProvider` with typed `value` props. Both mock providers accept an optional `clock: () => number`. Use `makeCampusFixtures(clock)`, `makeCanvasFixtures(clock)`, `transitionCampus(state, action, now, id)` and `advanceCampus(state, now)` for pure fixture checks.
- `selectFeedSections(state, items, now)`, `sessionState(session, userId, now)`, `selectDueItems(items, now, range)`, `findThreadByPerson(state, personId)` and `findAvailabilityOverlaps(state, course, now)` are pure selectors. Today and Tomorrow use local midnight boundaries. Feed Due Soon uses a rolling seven-day window. Dates for availability are local day keys, campus instants are epoch milliseconds, and Canvas timestamps are ISO strings.
- `src/services/canvas/index.ts` exports `createCanvasTransport(): CanvasTransport`. Tests may supply additional optional factory arguments. `CanvasTransport` exposes `getSelf`, `listCourses`, `listPlannerItems` and composed `read`. Each accepts `CanvasCredential` and optional `{ signal?: AbortSignal }`. Planner and composed reads take `DateRange` before options. Return `CanvasResult<T>` with the codes in `types.ts`. Caller abort yields `cancelled` and ends pagination. Internal expiry yields `timeout`. Never return tokens, raw authenticated URLs or request headers in errors. A2 implements the transport and injects it into the calendar provider. The brief's one line assigning the transport to A1 conflicts with its ownership table and both lane prompts. A1 consumes only the calendar adapter.
- `src/services/calendar/index.ts` exports `CalendarProvider({ children, transport?, clock? })`, using a default Canvas transport when omitted and wrapping the shared `CalendarAdapterProvider`. `src/services/db/index.ts` exports `CampusProvider({ children, clock? })`, wrapping the shared `CampusAdapterProvider`. Both accept React children and the shared clock signature.
- Reuse scaffold typography and global theme under `src/constants/theme.ts`. Keep system text, safe areas, contrast, reduced motion and 44-point controls in mind. Do not modify shared configuration or add dependencies independently.

## Lane acceptance

- **A1** · List and Graph derive from shared sections in the documented order. Verify graph silhouette, stage, gesture and accessibility requirements, both Calendar views, settings states, and Canvas-to-session draft params. Give phone QA steps if device verification is pending.
- **A2** · Use mock transport fixtures to cover pagination, foreign-origin next link, auth failure, all-day and exact due times, stable-ID reschedule, token replacement and late response after disconnect. Failed refresh preserves last good data. Export the compatible calendar provider.
- **B1** · Exercise joining/saving, partner connect and reused chat, invite, project request and cancel, draft prefill, profile reset, and notifications. Record temporary mock behavior and wiring steps.
- **B2** · Cover rehydration and seed, idempotent capacity-aware joins, two posts by one author, off-screen reply delivery, same-date availability overlap, one session per accepted invite, and project request/cancel. Export the compatible campus provider.

## Checkpoints and integration

1. Each lane verifies worktree, branch, approved SHA, owned paths, fixture assumptions and first complete flow.
2. Finish one usable slice. Run targeted checks, update the lane AI log, inspect the staged diff and commit only lane files.
3. Run typecheck, lint and relevant tests. Record baseline and lane commit SHAs, test results, known issues and exact integration steps in the handoff. Report ready and keep the Pane available.
4. Humans arrange transfer using approved push/PR or an agreed method. Integrate A2 and B2 on a human-controlled staging branch and wire providers. Integrate A1 and B1 and wire routes. Run typecheck, lint, tests and phone QA, then complete the integration checklist in BUILD_BRIEF.txt before a human merges.

## RunPane launch instructions for the humans

Wait for explicit approval and publication of the same baseline commit to both machines. Verify `git remote -v`, `git status --short --branch` and `git rev-parse HEAD` in each real clone. Run `runpane doctor --json` and `runpane agent-context --json`, register the actual absolute clone path if needed with `runpane repos add --path <absolute-clone-path>`, and verify both agent launchers with `runpane agents doctor --agent claude --repo <repo-id> --json` and its Codex counterpart. Get the saved ID with `runpane repos list --json`. Start or select a DueTogether Session on each computer using local CLI help or the Pane app. Run Pane creation from that Session. Verify each new Pane association, worktree path, branch, and baseline before any lane starts editing.

| Computer | Pane | Branch | Agent | Prompt variable |
| --- | --- | --- | --- | --- |
| Matheus | DueTogether A1 | hackjam/a1 | claude | $a1Prompt |
| Matheus | DueTogether A2 | hackjam/a2 | codex | $a2Prompt |
| Mattias | DueTogether B1 | hackjam/b1 | claude | $b1Prompt |
| Mattias | DueTogether B2 | hackjam/b2 | codex | $b2Prompt |

Set each prompt variable to that lane's exact text from BUILD_BRIEF.txt. Set $repoId to the saved local repository ID and $baselineSha to the approved SHA. Run only the two commands for your machine from the intended Session context. Match the installed CLI help before launching.

```powershell
# Matheus
runpane panes create --repo $repoId --name "DueTogether A1" --branch hackjam/a1 --base $baselineSha --agent claude --prompt $a1Prompt --source user --no-focus --wait-ready --yes --json
runpane panes create --repo $repoId --name "DueTogether A2" --branch hackjam/a2 --base $baselineSha --agent codex --prompt $a2Prompt --source user --no-focus --wait-ready --yes --json

# Mattias
runpane panes create --repo $repoId --name "DueTogether B1" --branch hackjam/b1 --base $baselineSha --agent claude --prompt $b1Prompt --source user --no-focus --wait-ready --yes --json
runpane panes create --repo $repoId --name "DueTogether B2" --branch hackjam/b2 --base $baselineSha --agent codex --prompt $b2Prompt --source user --no-focus --wait-ready --yes --json
```

Each creation gets one worktree. Confirm its branch and HEAD and check the Session association with `runpane sessions overview --session <session-id> --json`. If association is missing, use `runpane sessions associate --session <session-id> --pane <pane-id> --json` and confirm again. Lanes stop after local commits and handoff. Humans direct transfer, integration and final submission.
