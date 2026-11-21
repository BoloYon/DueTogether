# Expo web hydration handoff

- Branch `fix/web-hydration` in `worktrees/duetogether-web-hydration-fix`
- Baseline `a64c18d`
- Implementation `db38f70`

On the baseline, React reported different inline styles on the campus loading view in dark-mode Chrome. The server rendered a white background and text at RGB (24, 24, 27). The first browser render expected a black background and text at RGB (244, 244, 245). The light-mode load produced no hydration warning.

The appearance provider now uses a light server and hydration snapshot. After hydration, React reads and subscribes to the device scheme through Appearance. The existing storage effect restores the user's explicit choice, and the campus loading view uses the same resolved scheme as the app. Native keeps its immediate device snapshot and existing Appearance overrides.

Typecheck, lint, and all 72 tests passed. Headless Chrome verified clean hydration in light and dark, a live system preference change, and both saved overrides against the opposite system preference after reload. The temporary Expo preview was stopped. Native device QA remains unrun.

For integration, take the implementation commit with this handoff and its AI usage entry. The existing root provider wiring is sufficient. For browser QA, start Expo web on an available port, emulate each color scheme, and reload the Feed while watching the console for hydration warnings. In Profile settings, select an explicit appearance and reload with the opposite emulated scheme to confirm persistence.
