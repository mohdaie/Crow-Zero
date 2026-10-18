# Validation — v0.1.0

- `npm test`: 9 tests passed for empty maps, independent/repeatable scenery, all 18 tree species, FPS starts, layout errors, portable UTF-8 map data, large exports, invalid inputs and walking collision.
- `npm run build`: passed; generated self-contained editor and static preview.
- Automated Chromium/WebGL smoke checks passed: blank editor; duplicate buildings; undo/redo; tree resizing; road length and width; downloaded JSON; new-map cancel/clear/undo; imported JSON; saved map after reload; every original building factory; direct FPS preview of saved drafts; keyboard movement; all 18 tree factories; touch editor; mobile joystick. No page errors were recorded.
- Desktop and mobile editor screenshots inspected. Buildings retain the source repo's low-poly geometry and outline materials.
- This release supplies the city editor and walking preview. Shooting, crow AI, mission rules and production hosting are not part of this change.
