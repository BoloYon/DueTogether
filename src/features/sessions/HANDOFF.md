# B1 handoff: campus screens

| | |
| --- | --- |
| Lane | B1 · Mattias · Claude Code (Claude Opus 5.5) · Frontend |
| Worktree | `C:/Users/boloy/Documents/GitHub/DueTogether/worktrees/lane-b1` |
| Branch | `lane-b1` (PLAN.md's table lists `hackjam/b1`; this Pane was created on `lane-b1`. Transfer whichever name the humans choose.) |
| Remote | `https://github.com/BoloYon/DueTogether.git` |
| Baseline | `581a4e9571f57391ab9541296f583631f247a800` ("scaffold + agent setup", same as `main`). PLAN.md's baseline field still says "pending". |
| Lane commits | `69e6920` primitives, session detail, create · `f97ea18` partners, chat, projects, profile, notifications · plus the handoff/log commit that adds this file |
| Status | Feature complete against the baseline mock adapter. Ready for human integration. Not pushed. |

## What works

Every flow below runs against the baseline `MockCampusProvider` / `transitionCampus` with no B2 code. I also clicked through each one in a browser (see "Verification").

| Acceptance item | Where | How to exercise |
| --- | --- | --- |
| Joining / saving | `sessions/SessionScreen.tsx` | Feed → Matrix problem lab → **Join now** (attendee count 2→3, Going badge) → **Save**. Leave keeps the save. Full, ended and hosted sessions show a status note and no join button. |
| Partner connect + reused chat | `partners/parts.tsx` `PostCard`, `chat/ChatScreen.tsx` | Partners → Dev's post → **Connect** creates one thread with an intro and opens chat. Mira's second post shows **Connect (adds to chat)**, reuses `thread-mira` and adds a "Connected through" context. A post that is already linked shows **Open chat** (no-op). |
| Chat | `chat/ChatScreen.tsx` | Incoming and outgoing bubbles, day dividers, timestamps, course tag per message, course picker when a thread has more than one course, empty and oversize validation, a "typing… (simulated)" indicator driven by `thread.pendingReply`. Marks read on focus and when a reply arrives while open. Unread badges in Partners → Messages come from `readAt`. |
| Availability | `partners/screens.tsx` `AvailabilityScreen` | Per-course list of your windows with Edit (`previous` passed to upsert) and Remove. Day chips for the next 7 days plus From/To text times (`14:30`, `2:30 pm`, `9am`). Rejects bad, reversed or already-passed windows. Matches use `findAvailabilityOverlaps`. |
| Invite | `partners/screens.tsx` `InviteScreen`, `parts.tsx` `MatchCard` | **Send study invite** on a match → Pending → after about 2 s, Accepted (simulated) → **View session** shows a session with both attendees, and a notification appears. The same match can't be sent twice. |
| Project request / cancel | `projects/screens.tsx` | Projects → Pocket greenhouse → **Ask to join** → "Requested", **Cancel request**. The team roster and threads stay unchanged. Owner, member and full states have no action, only a note. "Yours & requested" filter. |
| Draft prefill | `create/CreateScreen.tsx`, `create/drafts.ts` | `/create?kind=session&title=Study for X&course=mat 240` prefills the title and normalizes the course to `MAT 240`. Without params the form is blank. Session, partner post and project forms all validate before dispatching. On success: session → `/session/[id]`, project → `/project/[id]`, post → Partners. |
| Profile + reset | `profile/screens.tsx` | Name and major shown. Sections: Going, Hosting, Saved, Your posts, Project requests, Your teams. Settings edits name and major. **Reset demo data** asks for confirmation inline, dispatches `demo/reset` (campus only) and reloads the form. |
| Notifications | `notifications/NotificationsScreen.tsx` | Unread dot and count, tap to mark read and open `href` (internal paths only), **Mark all read**. Profile shows "Notifications (n)". |

Shared UI lives in `src/components/campus/`: Screen (safe area + footer), Section, Card, Button (44 pt minimum), TextField, Choices (radio chips), Segmented (tabs), Badge, Avatar (dashed outline = new to you), Notice, ListRow, EmptyState, `useNow` (focus-aware clock) and pure `format.ts`. Every screen has an empty or error state that tells the user what to do next, plus a "fictional / simulated / this device only" label.

## Exports (as PLAN.md specifies)

`src/features/sessions` → `SessionScreen` · `partners` → `PartnersScreen`, `PersonScreen`, `PartnerFindScreen`, `AvailabilityScreen`, `InviteScreen` · `chat` → `ChatScreen` · `projects` → `ProjectsScreen`, `ProjectScreen` · `profile` → `ProfileScreen`, `ProfileSettingsScreen` · `notifications` → `NotificationsScreen` · `create` → `CreateScreen`. The pure helpers are re-exported too.

## Coordinator wiring steps (after B2 provider is in)

These are route edits only. No feature code changes are needed.

```ts
// src/app/(tabs)/partners.tsx
export { PartnersScreen as default } from '@/features/partners';
// src/app/(tabs)/projects.tsx
export { ProjectsScreen as default } from '@/features/projects';
// src/app/(tabs)/profile.tsx
export { ProfileScreen as default } from '@/features/profile';
// src/app/notifications.tsx
export { NotificationsScreen as default } from '@/features/notifications';
// src/app/partners/find.tsx, availability.tsx, invite.tsx
export { PartnerFindScreen as default } from '@/features/partners';   // likewise AvailabilityScreen, InviteScreen
// src/app/profile/settings.tsx
export { ProfileSettingsScreen as default } from '@/features/profile';
```

In `session/[id].tsx`, `person/[id].tsx`, `chat/[id].tsx`, `project/[id].tsx` and `create.tsx`, change only the import, e.g. `import { SessionScreen } from '@/features/sessions';` (person → `@/features/partners`, chat → `@/features/chat`, project → `@/features/projects`, create → `@/features/create`). Their `useLocalSearchParams` bodies stay as they are. `create.tsx` already passes `course/title/kind`. `drafts.ts` also tolerates `string[]` and empty params.

## Verification

- `npm run typecheck`: clean. `npm run lint`: clean. `npm test`: **18/18 pass** (13 new B1 flow tests in `sessions/sessions.test.ts`, `partners/partners.test.ts`, `profile/profile.test.ts` + 5 baseline).
- Browser QA (Expo web, dark mode, phone width) in a throwaway copy under `.pane/scratch/qa` with the routes pointed at B1 screens. The copy was deleted afterwards and no shared file in this worktree was edited. Checked: Partners tab, connect → new chat, send → typing → reply, invite → simulated accept → session, Feed → live session join/save, Projects ask to join, Profile sections, settings save + confirmed reset, create prefill → hosted session. This QA turned up a web a11y gap (radio and tab state not exposed), which is fixed with `aria-checked` / `aria-selected` / `aria-disabled` and re-verified.
- **Pending: phone QA in Expo Go.** Check: keyboard avoidance on Create and Chat (iOS `keyboardVerticalOffset` is a fixed 90, so tune it if the header height differs), the safe-area footer on Session/Project detail, Android back from Chat, larger Dynamic Type on the chip rows, light mode contrast, VoiceOver/TalkBack on chips and the Segmented control.

## Temporary mock behavior to know about

- Simulated chat replies (about 1.2 s) and invite acceptance (about 2 s) come from the shared mock reducer. The screens only read `pendingReply` and `invite.status`, so B2's provider can change the timing.
- In the baseline mock, opening a URL directly (web reload) reseeds state. B2's AsyncStorage provider should fix this.
- Invite-created sessions come from the mock with the title "MAT 240 study session", no capacity and no format, so the detail screen shows "Location to be announced" unless a meeting place was entered.

## Proposed shared changes (coordinator decides)

1. **Theme tokens**: `src/components/campus/palette.ts` adds accent, danger, success, warning, live, border and bubble colors on top of `Colors`. I'd suggest promoting these to `src/constants/theme.ts` so A1 can share them.
2. **Typed notification href**: `Notification.href` is a plain string, so it's cast to `Href` after a `safeHref` internal-path check. A route-builder-typed href would remove the cast.
3. **Contract gaps** (UI shows explanatory notes for now): no action for an owner to accept or decline project requests, and no invite cancel.
4. **Tab bar icons**: on web the tabs render a placeholder `⏷` glyph. That's a `src/app/(tabs)/_layout.tsx` concern.
5. **A1 Feed**: Partners Wanted "Connect" should dispatch `post/connect` and push `routes.chat(result.id)`, the same as `PostCard`. After merge A1 may import `PostCard` from `@/features/partners/parts` if desired.
6. PLAN.md: fill the baseline SHA and reconcile the `hackjam/b1` vs `lane-b1` branch name.

## Open questions

None blocking.
