# DueTogether UI identity experiment

The local branch is `experiment/ui-identity`, based on `da6b71875078b7b997fc190993bfe5ec4be9ec7b`. Start the web preview with `npm run web`, or connect the existing iOS development build to `npx expo start --dev-client`. Use **Profile → Settings → Appearance** to compare Light and Dark. The app opens on Work List. Switch to Graph View and Social to compare the Feed header in each view.

The experiment uses midnight indigo for the dark shell, plum surfaces for cards and controls, lavender for the dark primary action, amber for deadlines and sample-state chips, and mint for success. Light appearance uses lavender-tinted paper and deep plum action text or fills. Red remains the live and error color, with a separate foreground for filled red badges. Shared tokens and the serif heading row carry the identity across Feed, Partners, Projects, Calendar, and Profile. A centered content column caps wide screens at 800 px. The narrow web tab strip keeps all five labels visible at 320 px. The Course Galaxy retains its violet and amber artwork, graph logic, and gestures.

The bundled Bull U is the original 165 × 218 PNG with a white background. It has the accessible name “University of South Florida” and sits at the right edge of the Feed heading row. [USF Licensing](https://www.usf.edu/marketplace/licensing/index.aspx) · [Original PNG](https://www.usf.edu/marketplace/images/logo-4.png)

## Other palette concepts

| Concept | Dark shell and surface | Light shell and surface | Actions and highlights |
| --- | --- | --- | --- |
| **Pine / Gold** | Pine `#0F241F`, spruce `#1D342B`, pale sage text `#EAF5ED` | Parchment `#F6F4E9`, pale sage `#E5ECE0`, pine text `#20372D` | Gold `#E8C674` for dark primary controls with pine text. In light mode use evergreen `#245B45` with white for primary controls and ochre `#775210` for deadlines. This direction suits campus-led identity and study sessions. |
| **Blue / Coral** | Ink blue `#111F38`, slate blue `#203451`, pale blue text `#EAF2FF` | Frost `#F1F6FD`, pale slate `#DFE9F7`, ink blue text `#1D304B` | Sky `#ADC8FF` with ink text for dark primary controls. In light mode use cobalt `#264A9B` with white. Coral `#FFAE98` in dark mode or terracotta `#923F30` in light mode can mark social highlights and invitations. Keep errors red. |

## Verification

- `npm run lint`, `npm run typecheck`, and `npm test` passed with 72 tests.
- Checked 22 text and fill pairings per appearance against a 4.5:1 threshold. The lowest ratios were 5.06:1 in light and 6.29:1 in dark.
- Chromium rendered Feed at 320, 360, and 1280 CSS px in light and dark. Checked the logo label, intrinsic PNG size, aspect ratio, right and vertical alignment, and page overflow. Opened Graph View and Social and visited the other four tabs in both modes.
- Local verification used fictional campus and sample coursework data. UI captures and QA tooling live in this worktree’s Pane scratch.
- The isolated iOS development build bundled and rendered the light Feed and logo behind a system confirmation dialog. Unobstructed iOS captures, native dark appearance, and native gesture checks are pending. Android was outside this QA pass.

## Starfield follow-up

The follow-up builds on `312ca3c`, the experiment commit included in main at `a392384`. The viewport backdrop uses a 48-point grid and a fixed tile of square, four-point, and stepped stars. Dark appearance uses the reference base `#0B0911` and a deep purple grid. Light appearance pairs the existing pale shell with a subdued grid and muted stars. The same decoration covers tab, detail, and settings screens. Navigation chrome, cards, and controls retain their surface colors where they need a solid fill. The graph files and their artwork are identical to the prior commit.

The SVG layer sits behind scrollable content and stays out of hit testing and the accessibility tree. It uses the existing appearance context and React-generated IDs for deterministic server and client markup. The narrow Chromium checks cover all 19 tab and detail/settings routes, the appearance control, and entry to Graph View. Native rendering was outside the follow-up QA pass. The follow-up used a separate Expo preview on port 8138.
