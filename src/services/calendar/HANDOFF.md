# A2 Canvas and calendar handoff

A2 is Matheus’s Codex backend lane. The assigned branch is `lane-a2` at `/Users/matheus/Desktop/DueTogether/worktrees/lane-a2`. The remote is `https://github.com/BoloYon/DueTogether.git`. This lane started from the clean, assigned scaffold checkout. The approved-SHA field in `PLAN.md` was still a placeholder.

| Work | Commit |
| --- | --- |
| Checked-out scaffold baseline | `581a4e9571f57391ab9541296f583631f247a800` |
| Canvas transport and planner translation | `8b6bb1b5fa7b543d0a613659579ff2f8b9b086fb` |
| Calendar provider, secure credentials and snapshots | `d7cba85ee1a5b3eaf4d3d3bbd3fc500a36639ce3` |

The first tested flow verifies the account, paginates active courses, and reads the dated planner window into typed calendar items. The provider rehydrates an account-scoped snapshot, refreshes on startup and on foreground after five minutes, and coalesces concurrent syncs. Tokens stay in SecureStore and in the controller’s private session while connected. AsyncStorage holds account metadata and translated coursework. Successful replacement requires a verified identity and a complete snapshot. Disconnect and the adapter’s `enterSampleMode()` command both clear the private connection and show the shared sample fixtures.

## Verification

- `npm run typecheck`, `npm run lint` and `npx eslint src/services` passed.
- `npm test` passed its five shared tests. Its baseline shell glob misses the deeper lane files.
- The following command passed all 18 tests, including 13 lane tests. It covers pagination, off-origin links, redirects, timeout and cancellation, date and ID translation, failed refreshes, cache history, credential replacement, identity mismatch, and disconnect during a late response or pending storage write.

```sh
npx tsx --test src/services/canvas/canvas.test.ts src/services/calendar/calendar.test.ts src/shared/mockCampus.test.ts
```

Tests used fictional coursework and in-memory stores. Native device QA and authorized live Canvas verification are pending. Live connection requires native SecureStore. Canvas exam classification uses explicit exam metadata when supplied and falls back to title clues when the planner payload has no specific type. The provider takes the injected transport and clock at mount.

## Human integration

1. Bring the lane commits into the human-controlled integration branch.
2. In `src/app/_layout.tsx`, import `CalendarProvider` from `@/services/calendar` and replace the `MockCalendarProvider` import and wrapper with it. Keep one calendar provider around all consumers. A1 continues using `useCalendar()` from the shared adapters.
3. Run the checks above on staging. In Expo Go, check the disconnected sample label and use a verified school HTTPS origin and the authorized participant’s own token to check live mode. Check the displayed due time, all-day date and exact Canvas link. Background and foreground after five minutes, simulate an offline sync failure, and verify the last good data remains visible. Relaunch to verify restore, rotate or switch accounts, and disconnect then relaunch to verify cache cleanup.
4. Keep real credentials and personal coursework out of captures and console output. The human integrator handles the route wiring and transfer.

The transport uses the baseline Expo SDK’s native fetch with manual redirects. Planner translation follows the public Canvas planner endpoint and its serializer. [Expo SDK reference](https://docs.expo.dev/versions/v58.0.0/sdk/expo/) · [Canvas Planner API](https://developerdocs.instructure.com/services/canvas/resources/planner) · [Canvas planner serializer](https://github.com/instructure/canvas-lms/blob/master/lib/api/v1/planner_item.rb)
