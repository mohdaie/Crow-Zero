# Crow-Zero

v0.2.0 — city map editor, FPS walking preview and the first crow-hunting mission.

Scenery and the map editor were copied from **RetroMalaysia**, then adapted so you can build your own city from empty land. The RetroMalaysia repository is unchanged.

## Build your city

Open `/editor/` (`editor/index.html`). The home page is the game.

1. Start on a blank 200 × 200 m map. Use **+ Jalan asfalt** to add a road. Drag it, rotate it, set its length/width and choose asphalt or dirt.
2. Open **+ Aset**. Add houses, seven-shop terraces, school, mosque, petrol station, market, bus shelters, court, square, cars, bus and all other original building types. Buildings can be duplicated and deleted independently of RPG quests.
3. Add any of **18 trees/plants** from the original game. Position each yourself and adjust its size.
4. Add **Titik mula FPS**, then move/rotate it to set where you start walking. With no marker, the preview finds free space near the centre.
5. Use **Saiz peta** to grow/shrink the boundary, change grid spacing and snap distance. Use custom buildings to choose size, colours, storeys and roof; save them as templates.
6. **Preview FPS** opens your current map with the original cel shading and outlined scenery. Desktop: WASD/arrows, click to capture mouse, Esc to release. Mobile: left joystick and swipe the world to look.

**Simpan map** saves on the current browser/device. Changes also autosave. **Export JSON** downloads a portable map, including custom templates and the FPS start; **Import JSON** restores it on another device. **Map kosong** asks before clearing and can be undone while the page is open. Undo/redo and JSON import do not require any external service.

If browser storage is full or blocked, the editor shows **Map belum disimpan**. Use **Export JSON** to keep the current map; saving again clears the warning only after the browser accepts it. On small landscape phones the map and scrollable tools sit side by side; portrait phones show tools below the map.

The 3D preview checks the map first: fix red layout errors before opening it. It includes collision with buildings, props and trees.

## Play: Operasi Gagak (MISI 01)

**Title screen and options.** The game opens on a title screen (key art, mission brief, version) with **MULA**, **PILIHAN** and, where the device can install it, **PASANG APP**. Options hold the volume (with a test sound) and the difficulty, which sets how many crows there are: **MUDAH** 12–18 crows staying longer, **BIASA** 7–12, **SUKAR** 4–7 that leave quickly. Settings are saved on the device; difficulty can't change mid-mission.

**Installable app (PWA).** `manifest.webmanifest` (fullscreen, landscape, icons) and a service worker (`sw.js`) make it installable: Android/Chrome shows **PASANG APP**; on iPhone use Safari's Share → Add to Home Screen. After the first visit it plays offline. `npm run build` writes `dist/sw.js` with the list of game files and a version hashed from them, so each deploy gets a fresh cache; unbuilt, the worker passes requests through. On phones in the browser, MULA also asks for full screen and a landscape lock where allowed.

Open the home page (`/`, `index.html`), or **Main: Operasi Gagak ▶** in the editor (also **Main ▶** in the walking preview). Published at https://mohdaie.github.io/Crow-Zero/ with the editor at https://mohdaie.github.io/Crow-Zero/editor/. Old `game.html` and `tools/map-editor.html` links redirect there. The game plays your editor map; with no buildings saved it uses the built-in small city in `src/city-plan.js` (shophouses, office and flat blocks, a market, a mosque, a bus stop and a petrol station on two avenues).

Shoot **20 crows in 2 minutes**. Two weapons: a suppressed pump shotgun and a Barrett M82 sniper rifle (switch with **TUKAR**, `Q`, `1`/`2` or the mouse wheel). Crows are scarce: about 8 at the start, alone or in twos and threes on roof edges and power lines, with 7–12 in town at a time. Each perched crow stays only 25–45 seconds, then flies off for good (counted as escaped).
- **Spotter callouts.** Every few seconds a callout with a direction arrow and a radio ping says where the crows are, relative to where you face: `3 GAGAK DI KIRI ANDA`, `1 GAGAK 20M DI HADAPAN`, `2 GAGAK DI BELAKANG ANDA — PUSING!`. Landings (`GAGAK HINGGAP 35M DI KANAN`) and crows about to leave (`GAGAK 25M DI KIRI AKAN TERBANG!`) get their own callouts; urgent ones flash red. Arrows on the screen edge point to crows outside the view, with distance and count.

- **Hide.** Crouch (**SOROK** / `C`) next to a wall, car, tree or stall. The pill under the clock shows `KELIHATAN` (seen), `SEPARA` (half hidden) or `TERSOROK` (hidden). Perched crows slowly notice a standing player from about 18–26 m, a hidden one only within about 3 m. `GAGAK CURIGA` means a crow is staring at you.
- **Shoot silently.** The suppressor means only crows within 14 m of you hear the shot. Crows next to one that falls get suspicious. A crow that notices you caws, flies off and warns the crows around it.
- **Shotgun.** 9 pellets per shell. One pellet brings a crow down within 34 m, two are needed out to 50 m. **BIDIK** (right mouse) tightens the spread and zooms. Pump after every shot; hold **TEMBAK** (or the mouse button / Space) to keep firing as each pump finishes, and a tap during the pump fires as soon as it ends. 8 shells in the tube and 96 spare; reload one shell at a time (**ISI SEMULA** / `R`). Walls and roofs stop pellets.
- **Barrett M82.** Semi-automatic .50 rifle, 10-round magazine and 30 spare, reloaded a magazine at a time. **BIDIK** brings up a full-screen scope (about 7× zoom) with a mil-dot reticle. One bullet downs any crow it hits out to 300 m and carries on through up to 3 crows in a line, stopping at walls. It has no suppressor: every crow within 45 m hears the shot. Use the shotgun up close and quietly, the Barrett for far roofs and lines of crows on wires.
- **Crows** fly in from the city, circle, and land on roof edges (facing the street), power lines, lamp heads and open ground. They peck, look around and move to new perches. The minimap shows them in red (orange when suspicious).
- Desktop: click to capture the mouse, WASD to walk, left click to shoot, right click to aim, `R` reload, `C` crouch, `Esc` pause. Phone (landscape): joystick, swipe to look, buttons on the right, and a second **TEMBAK** beside the joystick for the left thumb (drag from either **TEMBAK** to adjust aim while firing). The HUD follows the mockup's layout at any screen size. Tapping the screen never captures the pointer, so taps always shoot.

The mission ends when you reach 20 crows, the time runs out, or you run out of shells. Rules and numbers live in `src/hunt-rules.js`; crow behaviour in `src/crows.js`; the gun in `src/shotgun.js`; sounds are synthesised in `src/sfx.js`.

## City background

Every map now sits inside a city instead of a kampung. A painted skyline (sky, clouds, two hazy tower layers) wraps the horizon, and a ring of cel-shaded towers with window bays fills the land between the map and the horizon. Avenues that run off the map edge stay open as streets into the city. See `src/skyline.js`. The kampung horizon painting and the green hills are no longer used.

## Local commands

```sh
npm run dev      # http://localhost:4173
npm test
npm run build    # dist/, ready for static hosting
npm run editor   # rebuild the generated editor after source edits
```

No dependency install or runtime CDN is required; Three.js and its loaders are vendored. Both editor and preview work under a repository subpath, including GitHub Pages. Hosting is not configured automatically.

## Source

`src/world.js` retains RetroMalaysia's building mesh factories, road details, props, vehicles and batching. `src/trees.js` and `src/illustration.js` supply the original vegetation and comic appearance. `src/town-layout.js` is the shared geometry/validation used by the editor and preview. The generated `editor/index.html` is rebuilt from `tools/map-editor.src.html`.

Asset provenance and source revision: [docs/ASSET-ORIGIN.md](docs/ASSET-ORIGIN.md). The original town positions are also preserved in `src/retro-plan.js` for reference; new maps start blank.
