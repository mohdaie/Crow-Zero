# Crow-Zero

v0.1.0 — city map editor and FPS walking preview.

Scenery and the map editor were copied from **RetroMalaysia**, then adapted so you can build your own city from empty land. The RetroMalaysia repository is unchanged.

## Build your city

Open `tools/map-editor.html` (the home page opens it automatically).

1. Start on a blank 200 × 200 m map. Use **+ Jalan asfalt** to add a road. Drag it, rotate it, set its length/width and choose asphalt or dirt.
2. Open **+ Aset**. Add houses, seven-shop terraces, school, mosque, petrol station, market, bus shelters, court, square, cars, bus and all other original building types. Buildings can be duplicated and deleted independently of RPG quests.
3. Add any of **18 trees/plants** from the original game. Position each yourself and adjust its size.
4. Add **Titik mula FPS**, then move/rotate it to set where you start walking. With no marker, the preview finds free space near the centre.
5. Use **Saiz peta** to grow/shrink the boundary, change grid spacing and snap distance. Use custom buildings to choose size, colours, storeys and roof; save them as templates.
6. **Preview FPS** opens your current map with the original cel shading and outlined scenery. Desktop: WASD/arrows, click to capture mouse, Esc to release. Mobile: left joystick and swipe the world to look.

**Simpan map** saves on the current browser/device. Changes also autosave. **Export JSON** downloads a portable map, including custom templates and the FPS start; **Import JSON** restores it on another device. **Map kosong** asks before clearing and can be undone while the page is open. Undo/redo and JSON import do not require any external service.

The 3D preview checks the map first: fix red layout errors before opening it. It includes collision with buildings, props and trees. This release is the map authoring foundation; crow AI, shooting, weapon HUD and missions are future gameplay work.

## Local commands

```sh
npm run dev      # http://localhost:4173
npm test
npm run build    # dist/, ready for static hosting
npm run editor   # rebuild the generated editor after source edits
```

No dependency install or runtime CDN is required; Three.js and its loaders are vendored. Both editor and preview work under a repository subpath, including GitHub Pages. Hosting is not configured automatically.

## Source

`src/world.js` retains RetroMalaysia's building mesh factories, road details, props, vehicles and batching. `src/trees.js` and `src/illustration.js` supply the original vegetation and comic appearance. `src/town-layout.js` is the shared geometry/validation used by the editor and preview. The generated `tools/map-editor.html` is rebuilt from `tools/map-editor.src.html`.

Asset provenance and source revision: [docs/ASSET-ORIGIN.md](docs/ASSET-ORIGIN.md). The original town positions are also preserved in `src/retro-plan.js` for reference; new maps start blank.
