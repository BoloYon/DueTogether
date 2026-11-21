# Profile collections handoff

- Branch `feature/profile-collections` starts from the approved post-hackathon baseline `dc429a3add796983b436ab00bca123f8b7559d60`.
- The feature commit contains this handoff. The Pane ready report records the exact SHA for human integration.
- Use Node 24 and `npm ci`. Run `npm run ios` or `npm run android` to build the Expo SDK 58 development client. The PDF viewer needs the native build. Expo Go can use the profile, imports, and image previews and displays a development-build message for PDFs. Web uses the browser's embedded PDF viewer and IndexedDB for file bytes.

## Behavior

- Open Profile to create collections. Open a collection to rename it, change or remove its cover, and add a PDF or image from the system Files picker. Each file must be readable, nonempty, and at most 25,000,000 bytes. The native import measures the file on disk and checks the copied size before attaching its metadata.
- Edit your name, major, bio, avatar and banner from Profile settings. Picture changes apply when selected. Save profile applies the text edits. Bio length is measured in Unicode grapheme clusters.
- Open Mira Quill or Dev Rowan from Partners to find clearly labeled shared demo collections with two-page sample PDFs. A viewer can star and unstar each guide from another profile. Guide stars change the author's total immediately. Profiles show the total and contribution level.
- The Profile tab can simulate a classmate joining your study session or project, or connecting through your partner post. The interaction updates attendance, membership or a conversation in local campus state. A pending project request alone earns zero. An earned activity credit is kept if someone later leaves.
- Campus snapshots upgrade from version 1 under the same storage key. The migration preserves existing campus records and backfills credits from qualifying recorded interactions. Resetting the campus demo clears local profile media and metadata. Canvas continues to use its separate calendar provider and credential storage.

## Verification

- `npm run typecheck`, `npm run lint`, and `npm test` passed. The 72 tests include reward deduplication, pending versus joined project membership, reversible per-viewer stars, self-star rejection, grapheme and level boundaries, snapshot migration, restart persistence of metadata, and cleanup after a successful metadata write.
- The Android and web Metro exports passed. Both sample PDFs parse as two-page documents. The iOS development client compiled. Feature UI, picker, PDF scrolling, and device restart QA remain unverified. Simulator interaction stopped at the user's direction.
- For device QA, use fictional sample files. Create a collection, set its cover, import an image and a two-page PDF, scroll to the second page, and verify a file larger than 25 MB is rejected. Edit the avatar, banner and bio, force-quit, reopen, and check the saved files and edits. Star and unstar a shared demo guide and compare the author's total. Create one activity of each kind and use the corresponding simulation control to verify the first qualifying interaction awards one star.
