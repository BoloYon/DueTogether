# Phone QA checklist

Run this on a phone in Expo Go (SDK 58) against the integrated build. Routes come from the route table in [PLAN.md](../PLAN.md#route-and-feature-exports). Mark each box for each platform you test, and write the device, OS version and build SHA at the top of your notes.

**Status keys**

- **Ready:** the feature is merged (B1 screens and B2 campus data are in `main` as of `4729820`).
- **Pending A1** or **Pending A2:** the feature is in a lane that hasn't merged yet. The baseline screen shows only a sample placeholder. Run these checks after that lane merges.

All campus content is fictional sample data. Chat replies and invite acceptance are simulated. Use the sample calendar unless you are the account holder testing your own Canvas account. **Never capture a screenshot that shows a real token, a real school address or real coursework.**

## Before you start

- [ ] `npm ci`, then `npm start`. Open the QR code in Expo Go SDK 58 on a phone on the same network.
- [ ] Start from fresh sample data: **Profile > Edit profile > Reset demo data** and confirm.
- [ ] Note your device, OS version, text size setting and light/dark mode.

## Routes

| Route | Screen | Status | Checks | iOS | Android |
| --- | --- | --- | --- | --- | --- |
| `/` | Feed | Pending A1 | Social / Work switch defaults to Work. Social is labeled as a preview. List / Graph toggle defaults to List. The five sections appear in this order: Happening Now, Due Soon, Coming Up, Partners Wanted, New Projects. Section headers collapse and expand independently, and empty headers stay visible. Due Soon's **See all** opens Calendar and doesn't toggle the section. Graph view: one graph at a time, underline tabs, tap selects, drag, pan, pinch, **Fit View**. Details and actions appear below the graph. Graph gestures don't block vertical scrolling. Sessions move from Coming Up to Happening Now and drop off when they end, while the Feed stays open. | [ ] | [ ] |
| `/partners` | Partners | Ready | Search by course or person. The Messages section lists threads with unread badges. **Connect** on Dev's post opens a new chat. Mira's second post reuses her chat and adds context. | [ ] | [ ] |
| `/projects` | Projects | Ready | List shows pitch, roles, team and occupancy. The "Yours & requested" filter works. | [ ] | [ ] |
| `/calendar` | Calendar | Pending A1 | Opens in List view and remembers the last view. List splits Upcoming and Past and groups by date. Month view shows weekday headers, previous and next buttons, **Today**, a selected day and item markers, with that day's rows below. The **Exams & quizzes** filter applies to both views. Changing month or view doesn't start a sync. Rows show title, class, date/time, type and a LockDown tag where present. **Open in Canvas** opens the item's own page. **Study for this** on a quiz or exam opens `/create` with kind, title and course filled in. | [ ] | [ ] |
| `/profile` | Profile | Ready | Name and major. Going, Hosting, Saved, Your posts, Project requests and Your teams sections. Notification count. | [ ] | [ ] |
| `/create` | Create | Ready | With no parameters, the form is blank and offers session, partner post or project. With `kind=session&title=…&course=mat 240`, the title is filled in and the course becomes `MAT 240`. Every form shows validation errors before it creates anything. | [ ] | [ ] |
| `/session/[id]` | Session detail | Ready | Matrix problem lab: **Join now** changes 2 attendees to 3 and the change shows on the Feed and Profile. **Save** works on its own. Leaving keeps the save. Proofs roundtable shows Full. Vector review shows Ended. Hosted sessions show Hosting. The footer clears the home indicator. | [ ] | [ ] |
| `/person/[id]` | Person | Ready | Opens by person ID. A new-to-you person has a dashed outline and a label. | [ ] | [ ] |
| `/chat/[id]` | Chat | Ready | Incoming and outgoing bubbles, timestamps, course tag. Empty or very long messages are rejected. "typing… (simulated)" appears, then a reply. Leave before the reply arrives and the thread shows unread. The keyboard doesn't cover the composer. Android Back returns to the previous screen. | [ ] | [ ] |
| `/project/[id]` | Project detail | Ready | Pocket greenhouse: **Ask to join** changes to Requested, then **Cancel request**. The roster and your chats don't change. Wave atlas (you're a member) shows no request button. | [ ] | [ ] |
| `/calendar/settings` | Calendar settings | Pending A1 + A2 | See [Calendar settings states](#calendar-settings-states). | [ ] | [ ] |
| `/partners/find` | Find partners | Ready | Course and person search with clear empty results. | [ ] | [ ] |
| `/partners/availability` | Availability | Ready | Add a window on a day chip with times like `14:30` or `2:30 pm`. Edit and remove it. A reversed or past window is rejected. Matches are sorted by the earliest shared time. | [ ] | [ ] |
| `/partners/invite` | Study invites | Ready | **Send study invite** shows Pending, then Accepted (simulated) after about 2 s. **View session** opens one session with both attendees, and one notification appears. The same match can't be invited twice. | [ ] | [ ] |
| `/notifications` | Notifications | Ready | Unread dot and count. Tapping marks it read and opens the linked route. **Mark all read** works. | [ ] | [ ] |
| `/profile/settings` | Profile settings | Ready | Edit name and major. **Reset demo data** asks for confirmation, resets campus data only and leaves the calendar connection as it was. | [ ] | [ ] |
| Tab bar | All five tabs | Ready | Feed, Partners, Projects, Calendar, Profile in that order. All are reachable, and tab icons have names. | [ ] | [ ] |

## Persistence (B2)

| Check | iOS | Android |
| --- | --- | --- |
| Join and save a session, close Expo Go fully, reopen. The join and save are kept. | [ ] | [ ] |
| Send a chat message, leave, close the app before the reply, reopen. The reply arrives once. | [ ] | [ ] |
| Send an invite, put the app in the background, reopen. There is one accepted session and one notification. | [ ] | [ ] |
| Request a project spot and mark notifications read. Both are kept after relaunch. | [ ] | [ ] |

## Calendar settings states

_Pending A1 (form and UI) and A2 (live connection). Until both merge, only the sample-mode placeholder appears._ Use the fictional `https://canvas.example.edu` for validation checks. Use a real address and token only if you're the account holder testing your own account, and don't capture it.

| State | Expected | iOS | Android |
| --- | --- | --- | --- |
| Disconnected | Address and masked token fields. **Use sample calendar** is offered. The default address fills in only if `EXPO_PUBLIC_CANVAS_BASE_URL` is set. | [ ] | [ ] |
| Sample mode | Calendar and Due Soon are labeled as sample, fictional coursework. | [ ] | [ ] |
| Invalid address | `http://…`, a non-URL, or `https://user:pass@…` is rejected with a readable message. No request is sent. | [ ] | [ ] |
| Destination shown | The exact origin the token will go to is visible before you select Connect. | [ ] | [ ] |
| Connecting | Progress is shown and buttons are disabled. The token field stays masked. | [ ] | [ ] |
| Connected / ready | Account name, **Last synced** time, **Sync now** and **Disconnect**. | [ ] | [ ] |
| Syncing | Pull-to-refresh and **Sync now** show progress. Repeated taps don't start more syncs. | [ ] | [ ] |
| Auth failure | A wrong or revoked token shows "sign-in failed" with steps to replace the token. Existing data stays. | [ ] | [ ] |
| Rate limited / timeout / server error | Each error has its own message and a **Retry** button. The last good data stays. | [ ] | [ ] |
| Replace token | A new token for the same account keeps the data. A different account doesn't show the old account's items. | [ ] | [ ] |
| Disconnect | Token and cached coursework are removed. Sample calendar is offered. A sync that finishes late doesn't bring the data back. | [ ] | [ ] |

## Offline

| Check | iOS | Android |
| --- | --- | --- |
| Airplane mode: every campus feature works, because campus data is stored on the device. | [ ] | [ ] |
| Airplane mode, sample calendar: Calendar and Due Soon work and are labeled as sample. | [ ] | [ ] |
| Airplane mode, connected _(pending A2)_: **Sync now** shows an offline message with **Retry**. Cached items stay visible. | [ ] | [ ] |
| Turn the network back on and select **Retry**. Sync succeeds and **Last synced** updates. _(pending A2)_ | [ ] | [ ] |

## Accessibility

| Check | iOS | Android |
| --- | --- | --- |
| **Reduced motion** (iOS: Settings > Accessibility > Motion > Reduce Motion. Android: Settings > Accessibility > Remove animations). Transitions are minimal or off. The graph settles immediately _(pending A1)_. | [ ] | [ ] |
| **Large text** (largest standard size, then the largest accessibility size). Labels wrap instead of being cut off. Chip rows, the Segmented control, chat bubbles and the Calendar month grid _(pending A1)_ stay usable. | [ ] | [ ] |
| **VoiceOver** (iOS) / **TalkBack** (Android). Every icon-only button has a name. Choice chips read as selected or not, tabs read as selected, section headers read as expanded or collapsed _(pending A1)_, and disabled buttons read as disabled. The graph has an accessible node list _(pending A1)_. | [ ] | [ ] |
| Primary controls are at least 44 pt and easy to tap. | [ ] | [ ] |
| Light and dark mode both have readable contrast, including badges and the live indicator. | [ ] | [ ] |
| Small phone: no clipped content. Footers and the tab bar respect safe areas. | [ ] | [ ] |

## After QA

- [ ] No real token, school address or real coursework appears in screenshots, logs or notes.
- [ ] Write results, device details and the build SHA in the integration notes, and file any issue for the lane that owns it (see [PLAN.md](../PLAN.md#ownership-and-dependencies)).
