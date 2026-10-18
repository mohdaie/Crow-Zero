# Validation — v0.1.0

- `npm test`: 9 tests passed for empty maps, independent/repeatable scenery, all 18 tree species, FPS starts, layout errors, portable UTF-8 map data, large exports, invalid inputs and walking collision.
- `npm run build`: passed; generated self-contained editor and static preview.
- Automated Chromium/WebGL smoke checks passed: blank editor; duplicate buildings; undo/redo; tree resizing; road length and width; downloaded JSON; new-map cancel/clear/undo; imported JSON; saved map after reload; every original building factory; direct FPS preview of saved drafts; keyboard movement; all 18 tree factories; touch editor; mobile joystick. No page errors were recorded.
- Desktop and mobile editor screenshots inspected. Buildings retain the source repo's low-poly geometry and outline materials.
- This release supplies the city editor and walking preview. Shooting, crow AI, mission rules and production hosting are not part of this change.

## Continuation review — 18 October 2026

- Confirmed the remote `feat/city-map-editor` checkpoint at `671a869893baab86758e164cc351ed9c1e2ed026` and matched the local source to it before editing.
- Fixed the editor layout for short landscape phones and gave portrait tools more usable space. Completed the pending portrait smoke check: building selection and FPS rendering both passed without browser errors.
- Fixed silent autosave failures: blocked/full browser storage now keeps a visible unsaved warning through manual save, undo and redo. Failed writes do not advance the save timestamp; a successful save clears the warning. Export still recovers the in-memory map.
- `npm test`: all 9 existing tests passed. `npm run build` and `git diff --check` passed.
- Eight focused browser scenarios passed against `dist/`, with no page errors: editing at 390×844, 667×375, 740×360, 800×390 and 844×390; blocked autosave/save/undo/redo plus JSON recovery; storage recovery and reload persistence; saved-draft FPS rendering. Mobile checks verified usable map/panel dimensions, tree resizing, tab scroll reset and absence of horizontal page overflow.
- The original 15-scenario WebGL smoke run remains the foundation validation above; this review reran only affected workflows and the pending portrait check. These checks use emulated mobile viewports in Chromium, not physical Android devices.

## v0.2.0 — crow hunt and city background (18 October 2026)

- `npm test`: 16 tests pass. The 7 new tests cover the built-in city map's validity, pellet spread (hip vs aimed), ray–sphere hits, kill rules by range, crow notice rates (standing vs hidden), cover detection and stealth labels, mission end states and the clock.
- `npm run build` passes and now includes `game.html`.
- Chromium (SwiftShader WebGL) checks against the dev server, with no page errors:
  - the game loads the built-in city in about 1.6 s and finds about 130 crow perches
  - crows fly in, circle, land and perch (simulation fast-forwarded with a test hook)
  - an aimed shot at a perched crow 14 m away brought it down: kill counter 0→1, ammo 6→5
  - crouching updates the stealth pill
  - a standing player near a perched crow raises its suspicion
  - phone landscape layout (Pixel 7) shows joystick, BIDIK/SOROK/TEMBAK/ISI SEMULA, and TEMBAK fires
  - editor shows the new play link; the walking preview still loads with the new city background
- Fixed during testing: a negative first frame time after starting (rAF timestamp earlier than `performance.now()`) that threw the gun model off-screen; a large first mouse jump after pointer lock that pointed the view at the sky.
- Not verified: real phones, real GPUs (frame rate), and how the synthesised audio sounds. Crow and shotgun numbers are first-pass tuning.
