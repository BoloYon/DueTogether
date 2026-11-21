# Demo script

**Audience:** hackathon judges · **Length:** about 3 minutes · **Devices:** iPhone or Android phone in Expo Go (SDK 58)

To fit in 3 minutes, do the steps not marked optional and spend about 20 seconds on each. Skip every _optional_ step unless you have time left. Practise once with a timer.

This script follows the core demo in [BUILD_BRIEF.txt](../BUILD_BRIEF.txt) (Product specification): open the Work Feed, join a live study session, find a classmate with overlapping free time, open a conversation, ask to join a project, connect Canvas or use sample mode, show the calendar, and turn a quiz into a study-session draft.

> **All campus content is sample data.** The people (Avery Vale, Mira Quill, Dev Rowan, Noa Flint), courses (MAT 240 Matrix Methods, PHY 220 Wave Mechanics), places and projects are fictional. Chat replies and invite acceptance are **simulated** on the phone. There is no campus server, no campus sign-in and no messaging between devices. Campus data is stored only on this phone. Say this out loud at the start.

Steps marked _(pending A1)_ need lane A1's Feed and Calendar screens, and steps marked _(pending A2)_ need lane A2's live Canvas connection. Until those merge, the baseline shows a labeled sample placeholder there. Show the placeholder briefly or skip the step.

## Before the demo

1. Install and start the app as in the [README](../README.md#run-the-app). Open it in Expo Go SDK 58 on the demo phone.
2. **Profile > Edit profile > Reset demo data** and confirm. This reloads the sample workspace relative to the current time, so the live session is live and quiz due dates are near.
3. Pick your Canvas path:
   - **Sample mode (recommended, works offline):** keep Calendar disconnected so it shows the labeled sample calendar.
   - **Live mode** _(pending A1/A2)_: only the account holder, with their own token, on their own phone. Connect before the demo as in [CANVAS_CONNECT.md](CANVAS_CONNECT.md). Turn on screen-recording privacy, and don't show the token field or real coursework you don't want on screen.
4. Turn on Do Not Disturb. Set a comfortable text size and brightness.

## Script

### 1. Feed: what's happening now _(pending A1)_

1. Open the **Feed** tab. It opens on **Work**. Point out the **Social** switch: Social is a labeled preview, not a campus network.
2. In **List** view, walk through the five sections: **Happening Now, Due Soon, Coming Up, Partners Wanted, New Projects**.
3. Optional: switch to **Graph** view and show the Happening Now graph, with course planets, session diamonds and the red live indicator. Tap a node to see its details below the graph.

_Until A1 merges, the baseline Feed lists the same sample sessions. Open "Matrix problem lab" from there._

### 2. Join a live session

1. Under Happening Now, open **Matrix problem lab** (MAT 240, Juniper Study Loft, hosted by Mira, 2 of 6 attending).
2. Select **Join now**. The count changes to 3 and a **Going** badge appears. Select **Save**.
3. Go back. The Feed and **Profile > Going** show the same state.

### 3. Find a partner with overlapping free time

1. Open the **Partners** tab, then **Availability**.
2. The sample workspace already has your MAT 240 window tomorrow, 10:00–12:00. It overlaps Mira (11:00–13:00) and Dev (11:30–12:30), so matches appear sorted by the earliest shared time. Optional: add or edit a window to show validation.
3. On a match, select **Send study invite**. It shows **Pending**, then accepted (simulated) after about 2 seconds. Select **Invite accepted · View session** to show the new session with both attendees. A notification also appears.

### 4. Partners and chat

1. In **Partners**, find **Dev Rowan's** post "Simulate a wave" (PHY 220) and select **Connect**. A new chat opens with an intro message.
2. Send a short message. A **typing… (simulated)** indicator appears, then a simulated reply.
3. Back in Partners, find **Mira Quill's** second post, "Compare proof outlines", and select **Connect (adds to chat)**. Her existing chat opens with both posts listed as context. One person always has one thread.

### 5. Ask to join a project

1. Open the **Projects** tab and open **Pocket greenhouse** (owner Dev, team of 2 of 4, needs Interface design).
2. Select **Ask to join**. It shows **Requested**. The team roster doesn't change, because a request isn't membership.
3. Optional: select **Cancel request** to show it can be undone.

### 6. Create a project (optional, if time allows)

1. On the **Projects** tab, select **New project**. Enter a fictional title, pitch, one role and a team size.
2. Try to submit with an empty field to show validation, then complete it. The new project's page opens.

### 7. Canvas: connect or sample mode _(pending A1/A2)_

1. Open the **Calendar** tab, then **Calendar settings**.
2. **Sample mode:** point out the **Sample calendar** label. The coursework is fictional and works with no account or network.
3. **Live mode** (account holder only): show **Connected**, the account name and **Last synced**. Select **Sync now**. Explain that the token stays in the phone's secure storage, requests are read-only, and other students never share tokens.

_Until A1/A2 merge, Calendar Settings shows "Sample mode is active."_

### 8. Calendar views _(pending A1)_

1. Calendar opens in **List** view, with Upcoming and Past grouped by date.
2. Switch to the **Calendar** (month) view. Tap a day to see its rows, use previous and next, then **Today**.
3. Turn on **Exams & quizzes** to filter both views. Point out the **LockDown** tag on the sample "Matrix methods exam".

### 9. "Study for this" becomes a session draft _(pending A1)_

1. On the sample **Matrix check-in** quiz (MAT 240), select **Study for this**.
2. **Create** opens with **Session** selected, the title filled in and the course set to MAT 240.
3. Pick a start time and location and create it. The new session page opens and it appears under Coming Up on the Feed.

_Until A1 merges, show the same draft by opening `/create?kind=session&title=Study for Matrix check-in&course=MAT 240`. B1's Create screen fills it in the same way._

## Closing line

Say what is live and what is simulated: campus data lives only on this phone, chat replies and invite acceptance are simulated, and Canvas reads are real only in live mode with the account holder's own token.

## If something goes wrong

| Problem | What to do |
| --- | --- |
| No live session in Happening Now | **Profile > Edit profile > Reset demo data**. Sample times are relative to now. |
| Canvas sync fails | Switch to the sample calendar. The last good data stays, and **Retry** is available. |
| No network | Use sample mode. Every campus feature works offline. |
| Expo Go version mismatch | Use Expo Go for SDK 58. Check this before the demo. |
