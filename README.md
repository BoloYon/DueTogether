# DueTogether

_Get it done. Go have fun._

DueTogether is a Florida Polytechnic University student app for finding study sessions, classmates and project teammates, with a private view of your own Canvas coursework. The app has two areas: **Work** (the focus of the demo) and **Social** (a labeled preview, not a campus network).

- **Campus features:** a Feed of live and upcoming study sessions, partner posts and chat, availability matching with study invites, projects you can ask to join, a profile and notifications.
- **Calendar:** your Canvas assignments, quizzes, exams and events in a list or month grid. **Study for this** turns a quiz or exam into a prefilled study-session draft.

**What's real and what's simulated.** All campus content (people, courses, places, sessions, posts and projects) is fictional sample data stored only on the phone. There is no campus server, campus sign-in, push notification service or messaging between devices. Chat replies and invite acceptance are simulated. Post deletions and session cancellations generate local notifications for each affected demo profile and a summary in the current inbox. The summary shows who would be notified without sending anything to another device. Canvas reads are real only in live mode, with the account holder's own token. Otherwise Calendar shows a labeled sample calendar.

## Run the app

You need a Node.js version that Expo SDK 58 supports, npm, and **Expo Go for SDK 58** on an iPhone or Android phone on the same network as your computer.

```sh
npm ci          # install from the lockfile (npm install also works)
npm start       # start Metro and show the QR code
```

- **iOS:** scan the QR code with the Camera app. It opens in Expo Go.
- **Android:** scan the QR code from Expo Go.
- Or press `i` (iOS Simulator, macOS with Xcode) or `a` (Android emulator) in the Metro terminal, or run `npm run ios` / `npm run android`.

The app is built on Expo SDK 58 with Expo Router (routes in `src/app/`). npm owns the single lockfile, `package-lock.json`, so don't add another package manager's lockfile.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Starts the Expo dev server. |
| `npm run ios` / `npm run android` / `npm run web` | Starts and opens on that platform. |
| `npm run typecheck` | Type-checks with `tsc --noEmit`. |
| `npm run lint` | Runs `expo lint` (ESLint with `eslint-config-expo`). |
| `npm test` | Runs tests with Node's test runner through `tsx`. **Known issue:** npm runs scripts with `sh`, which expands the unquoted `src/**/*.test.ts` glob only one folder deep, so this currently runs only `src/shared/mockCampus.test.ts`. To run every test: `npx tsx --test $(find src -name '*.test.ts*')`. |

Run typecheck, lint and tests before you commit.

## Sample mode and live Canvas mode

| | Sample mode | Live Canvas mode |
| --- | --- | --- |
| Account | None | The account holder's own Canvas personal access token |
| Network | Not needed | HTTPS, read-only requests from the phone directly to your school's Canvas |
| Calendar data | Fictional coursework, labeled as sample | Your own courses and coursework |
| Status | Available now | Pending lanes A1 (settings UI) and A2 (Canvas connection) |

Campus features always use local sample data, in either mode.

To connect, open **Calendar > Calendar settings**, enter your school's Canvas HTTPS address, check the destination it shows, and paste a token you created under **Account > Settings > Approved Integrations > New Access Token** (where your school allows it). The token is stored only in the phone's SecureStore. Never share it, and never ask another student for theirs. [docs/CANVAS_CONNECT.md](docs/CANVAS_CONNECT.md) covers creating, replacing, disconnecting and revoking tokens.

**Optional default address.** Copy `.env.example` to `.env` and set `EXPO_PUBLIC_CANVAS_BASE_URL` to a verified school HTTPS origin, for example `https://canvas.example.edu`. It's empty by default. This value is public and is bundled into the app. **Never put a token or password in `.env` or in any `EXPO_PUBLIC_` variable.** `.env` is ignored by Git, and only `.env.example` is committed.

## Docs

- [docs/DEMO.md](docs/DEMO.md): step-by-step demo script.
- [docs/CANVAS_CONNECT.md](docs/CANVAS_CONNECT.md): Canvas tokens and connection.
- [docs/PHONE_QA.md](docs/PHONE_QA.md): per-route phone QA checklist.
- [PLAN.md](PLAN.md): lane ownership, routes, shared interfaces and integration order.
- [BUILD_BRIEF.txt](BUILD_BRIEF.txt): full product and acceptance specification.
- [AI_USAGE.md](AI_USAGE.md): AI usage and provenance disclosures.

## Lanes and ownership

The app was built in four parallel lanes on separate branches and worktrees, plus a coordinator who owns the shared files. [PLAN.md](PLAN.md#ownership-and-dependencies) has the exact paths.

| Lane | Area | Owns | Status in `main` |
| --- | --- | --- | --- |
| A1 | Frontend: Feed, Course Galaxy graph, Calendar, Canvas settings UI | `src/features/feed`, `graph`, `calendar`, `onboarding` | Pending |
| A2 | Canvas data: transport, SecureStore, calendar cache and provider | `src/services/canvas`, `src/services/calendar` | Pending |
| B1 | Frontend: sessions, partners, chat, projects, profile, notifications, create | `src/features/sessions`, `partners`, `chat`, `projects`, `profile`, `notifications`, `create`, `src/components` | Merged |
| B2 | Campus data: local store, AsyncStorage persistence, simulations | `src/services/db` | Merged |
| Coordinator | Shared contracts, routes, config, these docs | `src/shared`, `src/app`, package and config files, README.md, PLAN.md, AGENTS.md | — |

Until A1 and A2 merge, the Feed, Calendar and Calendar settings routes show labeled sample placeholders from `src/shared/baselineScreens.tsx`. The other routes use the B1 screens on B2's persistent campus store.

## Baseline commands and provenance

Mattias approved initializing a fresh scaffold because the designated checkout and configured remote were empty. Setup used:

```sh
npx --yes create-expo-app@latest . --template default@latest --no-install --no-agents-md
npm install
npx expo install expo-secure-store react-native-svg @react-native-async-storage/async-storage
npm install --save-dev eslint@^9 eslint-config-expo tsx @types/node@^24
npx expo install --check
```

The template provides Expo Router, Gesture Handler, TypeScript and starter assets. See [AI_USAGE.md](AI_USAGE.md) for provenance and AI disclosures.
