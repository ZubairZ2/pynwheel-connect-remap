# Tour App: drop the Play Route / Replay button row under the Guided Navigation map

**Branch:** `improvement/remove_the_replay_button` → `main`
**Open the PR:** https://github.com/ZubairZ2/pynwheel-connect-remap/compare/main...improvement/remove_the_replay_button?expand=1

## Why

On a phone the Guided Navigation screen is short on vertical space. The row under the map (the blue Play Route / Replay button, the previous / next / stop squares next to it, and the thin progress bar) duplicated what the replay icon on the map already does: that icon starts the walk from idle and restarts it from the beginning.

## What changed

- `tour-app/src/screens/GuidedScreen.tsx`: the `playerControls` row is gone from the self-guided screen. The Directions card now sits directly under the map.
- `tour-app/src/styles/screens.css`: the compact-row rule (`.pw-play--compact .pw-play__bar`) that only this row used is removed.

## What is unchanged

- The replay icon on the map (`pw-guided__replay`) and the simulation player behind it.
- The AR screen's small play button (not part of that row).
- The Find Shortest Path screen's player, which shares the `pw-play` styles and still renders them.

## Verification

- `npm run typecheck` clean; `vitest run` 25 files / 183 tests pass.
- Dummy-data preview at 375×812: Guided screen renders without the row, the Directions card follows the map, tapping the map's replay icon moves the walker along the route, no console errors.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
