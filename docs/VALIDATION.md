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
