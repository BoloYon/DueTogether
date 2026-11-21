
# DueTogether

DueTogether is a Florida Polytechnic student app concept for finding study sessions, classmates and project teammates, with a private Canvas coursework view. This shared baseline uses fictional campus and sample calendar data. Chat replies and invite acceptance are simulated. Campus edits in the baseline last for the current app session. Persistent device storage and live Canvas reads are lane deliverables.

## Start locally

Use a Node version supported by Expo SDK 58, npm, and Expo Go for SDK 58 on the demo device.

```sh
npm ci
npm start
npx tsc --noEmit
npm run lint
npm test
```

Scan the Metro QR code from a phone on the same network. Device QA is pending. On a phone, open all five tabs, open a live session and join/save, return to Feed, open a partner conversation, request and cancel a project spot, and use the sample quiz to open a prefilled study-session draft. Verify the phone has the matching Expo Go version and review platform-specific issues before the demo.

## Canvas demo modes

Sample mode works without an account or Canvas network access. The baseline Calendar Settings displays sample mode. Once the live provider is integrated, the account holder enters a verified school HTTPS origin in Calendar Settings and creates their own demo token in Canvas under Account → Settings → Approved Integrations → New Access Token, where available. Confirm the displayed origin before connecting. Live mode uses read-only requests and stores tokens in native SecureStore. Disconnect removes credentials and private cached coursework. Keep the token out of files and disclosures.

The optional public default uses `EXPO_PUBLIC_CANVAS_BASE_URL` in a local `.env` copied from `.env.example`. The default is empty. Use only a verified school origin. Put no credentials in any `EXPO_PUBLIC_` variable.

## Baseline commands and provenance

Mattias approved initializing a fresh scaffold because the designated checkout and configured remote were empty. Setup used:

```sh
npx --yes create-expo-app@latest . --template default@latest --no-install --no-agents-md
npm install
npx expo install expo-secure-store react-native-svg @react-native-async-storage/async-storage
npm install --save-dev eslint@^9 eslint-config-expo tsx @types/node@^24
npx expo install --check
```

The template provides Expo Router, Gesture Handler, TypeScript and starter assets. npm owns the single lockfile. See PLAN.md for frozen interfaces and Pane setup, BUILD_BRIEF.txt for the specification, and AI_USAGE.md for provenance and AI disclosures.
