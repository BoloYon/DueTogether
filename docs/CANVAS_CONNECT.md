# Connecting Canvas

DueTogether can show the connected student's own Canvas coursework in Calendar and in the Feed's Due Soon section. This connection is optional. Sample mode works without an account or network access. See [Sample mode](#sample-mode-no-account).

> **Status:** Lane A2 builds the live Canvas connection and lane A1 builds the Calendar Settings form. Until both merge, Calendar Settings shows only sample mode. Steps below that need the live connection are marked _(pending A1/A2)_.

All examples use the fictional school address `https://canvas.example.edu` and a placeholder token `<your-token>`. They are not real values.

## Who can connect

Connect only your own Canvas account. A personal access token belongs to its account holder. It gives read access to that person's courses and coursework.

- Create a token only for your own account, on your own phone.
- **Never ask other students for their tokens, and never accept one.** Each person who wants to see their coursework connects on their own device.
- Never paste a token into chat, email, an issue, a commit, a screenshot, a log or a file such as `.env`. If a token was exposed, [revoke it](#revoke-a-leaked-token).

The demo uses a personal access token for the account holder only. DueTogether has no OAuth sign-in and no public token onboarding.

## Create a personal access token

Your school may turn off personal access tokens. If you don't see the button below, use sample mode.

1. Sign in to your school's Canvas site in a browser.
2. Open **Account > Settings**.
3. Scroll to **Approved Integrations** and select **+ New Access Token**.
4. For **Purpose**, enter something you'll recognize later, such as `DueTogether demo`. Set an **Expires** date soon after the demo.
5. Select **Generate Token** and copy the token. Canvas shows the full token only once.

Keep the token in your clipboard or password manager only until you paste it into the app.

## Connect in the app _(pending A1/A2)_

1. Open the **Calendar** tab, then open **Calendar settings**.
2. Enter your school's Canvas address, for example `https://canvas.example.edu`. If the build has a default address (see below), it is already filled in.
   - The address must start with `https://`. The app rejects other schemes and any address that contains a user name or password.
3. **Check the address the app shows.** The token is sent only to that address. Don't continue if it isn't your school's Canvas site.
4. Paste the token into the masked token field and select **Connect**.
5. The app confirms your Canvas account and loads your first snapshot of courses and coursework. Only then does it replace any connection you had before.

What the app does with the connection:

- It sends read-only `GET` requests directly from the phone to your Canvas address over HTTPS. It never changes anything in Canvas. Grades and submissions are out of scope.
- It reads your account, your active courses and planner items from 120 days back to 180 days ahead.
- It syncs when the app opens and when you return to it after 5 minutes or more. You can also pull to refresh or select **Sync now**. Calendar Settings shows **Last synced**.
- If a sync fails, you keep the last good data and see the reason (sign-in failed, rate limited, offline or timed out) and a **Retry** button.

### Default school address

A build can include a default Canvas address through `EXPO_PUBLIC_CANVAS_BASE_URL` in a local `.env` file (copy `.env.example`). This value is public and is bundled into the app. It must be empty or a verified school HTTPS origin. **Never put a token in `.env`, `.env.example` or any `EXPO_PUBLIC_` variable.**

## Where the token is stored

- The token is stored only in the phone's secure storage (Expo SecureStore: iOS Keychain, Android Keystore).
- AsyncStorage holds only non-secret settings and your cached coursework. The token is never written to AsyncStorage, logs, URLs, error messages, fixtures or Git.
- The token never leaves the phone except in the `Authorization` header of requests to the Canvas address you confirmed. The app follows Canvas's next-page links only on that same address and rejects redirects to other sites.

## Replace a token _(pending A1/A2)_

Do this when a token expires or when you switch to a different Canvas account.

1. Create a new token (see above).
2. In **Calendar settings**, enter the address and the new token, then select **Connect**.
3. The old connection stays active until the new one is verified and its first snapshot loads. If the new token fails, your old connection and data are kept.
4. If the new token belongs to a different account, data cached for the old account is not shown for the new one.
5. Delete the old token in Canvas if you no longer need it (see the next section).

## Disconnect _(pending A1/A2)_

1. Open **Calendar settings** and select **Disconnect**.
2. The app deletes the token from secure storage and clears your cached coursework. If a request is still running, its late result is discarded.
3. Calendar offers the labeled **sample calendar** instead.

Disconnecting deletes the token only on the phone. The token still works in Canvas until it expires or you delete it there.

## Revoke a leaked token

If a token was shared, pasted somewhere, committed, logged or captured in a screenshot, revoke it right away:

1. In Canvas, open **Account > Settings > Approved Integrations**.
2. Find the token by its purpose (for example `DueTogether demo`) and select **Delete** (the trash icon). Confirm.
3. In the app, select **Disconnect**, then connect again with a new token if you still need live mode.
4. Remove the token from the place it leaked, such as the chat message, file or screenshot. If it was committed to Git, deleting the file isn't enough because the token stays in history. Treat the token as compromised either way and tell the repository owner.

## Sample mode (no account)

When no account is connected, Calendar offers a sample calendar. It holds fictional coursework, such as a "Matrix check-in" quiz for MAT 240 (Matrix Methods) and a "Wave review quiz" for PHY 220 (Wave Mechanics). These rows are always labeled as sample data and never appear as the connected student's calendar. Sample mode works offline and is the default for a no-network demo.
