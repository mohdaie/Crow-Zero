# Scenery origin

Copied from [mohdaie/Malaysian-retro-game](https://github.com/mohdaie/Malaysian-retro-game), commit `30da6fff6eac21238c6b249225d64b552428b430` with the repository owner’s instruction on 18 October 2026.

The building factories, roads, trees, props, vehicles, textures, illustrated shading and editor are reused here. `world.js` is reduced to static scenery; `town-layout.js` and the editor are adapted to independent blank city maps. Story and quests are not part of this app.

# Game art provenance

- `items/*.svg`: 51 original, code-authored illustrations of the economy's goods, snacks, collectibles and delivery cargo. Thick ink outlines, muted cel colours and period objects match the game's authored canvas/geometry art. They are vector illustrations, not photographs or generated raster images. Every item has a distinct drawing, including the borrowed comic, forgotten book, home-made kuih and returned food-container variants. Packaging uses fictional/general labels; no external artwork or brand logos is embedded. Rebuild with `npm run art` from `scripts/item-art.mjs`; titles and Malay memory notes live in `src/item-art.js`.

- `textures/kampung-grass.webp`: generated specifically for this game with the built-in image-generation tool, October 2026. Prompt requested seamless tropical lawn albedo without scene objects, text or perspective.
- `textures/kampung-timber.webp`: generated specifically for this game with the built-in image-generation tool, October 2026. Prompt requested seamless horizontal aged kampung timber boards without scene objects or text.
- Both are WebP encodings of the original generated outputs, with no compositing or external photographic source.
- Roof, plaster, earth, road, sign, flag, sky and contact-shadow textures are original canvas art in `src/world.js` and `src/characters.js`.
- Building, vegetation, prop, bicycle and procedural fallback vehicle meshes are original code-authored geometry. Sound synthesis and the townsfolk's animation are implemented in the repository.
- `models/kids-mocap.glb` (v2.0): the skeleton and 14 motion-captured clips (Idle, Walk, Jog, Sprint, Idle Talking, Interact, Pick Up, Sitting Idle; from v2.1 also Jump Start, Jump Loop, Jump Land, Crouch Idle, Crouch Forward and Driving, the seated base for the bicycle) from the **Universal Animation Library** by Quaternius, CC0 1.0 public domain (https://quaternius.com/packs/universalanimationlibrary.html, OpenGameArt mirror). Pruned from the Godot GLB with glTF-Transform. The library's mannequin mesh is not rendered; Amir's and Nur's bodies are generated in `src/actor.js`.
- `vendor/addons/`: three.js GLTFLoader, SkeletonUtils and BufferGeometryUtils (MIT, same license as three.js).
- Three.js is the only external runtime dependency; its MIT license is in `vendor/THREE-LICENSE.txt`.

- `textures/illustrated-horizon.webp`: generated with the built-in imagegen tool, October 2026, and encoded as WebP for the actual game's surrounding scenery. Prompt: "Painted panoramic distant scenery for a playable Malaysian kampung game circa 2001; warm ink outlines, cel colour blocks, subtle paper grain and comic halftone; mostly warm blue sky/cream clouds above layered blue-green hills, palms, trees and small terracotta-roof houses; compatible wrap edges; no foreground ground, people, UI, lettering or watermark." This is a horizon texture, not a gameplay screenshot.
- v0.4.0 face, shirt, flower, ground and roof markings are original canvas drawings. Amir/Nur geometry and outfits interpret the user-supplied character reference with low-poly meshes. The reference image itself is not redistributed in the repository.

- `textures/illustrated-grass-patch.webp`: generated using built-in imagegen, October 2026, with genuine transparency preserved in WebP. Prompt: "Transparent ground-cover decal for a Malaysian kampung game: an irregular organic island of short tropical lawn grass viewed perfectly top-down, hand-painted comic illustration with layered leaf strokes, clover, dry straw, olive/fresh green tones and tiny cream wildflowers; ragged transparent edge, no perspective, shadow, soil slab, tall plants, people, buildings, lettering or watermark." Integrated as rotated instanced overlays on the actual lawn.
- `docs/walking-preview-v050.mp4` is a recording of the actual Three.js character module animating, encoded to MP4. It is not an imagegen animation or concept mockup.

- `models/town-sedan.glb` (v2.2): user-supplied `sample (1).glb`, used with its embedded texture for the two parked town cars. 8,451 vertices / 10,639 triangles, one 1024×1024 texture, 1,421,876 bytes. Source file preserved byte-for-byte; normals, fit, silhouette and the white body-paint variant are applied at runtime. No new generation job was run.

- `models/amir.glb` (v2.3): Amir's 3D model. It was generated from the user-supplied Amir and Nur character art with **TRELLIS.2** (microsoft/TRELLIS.2-4B, MIT licence) and supplied by the user as `sample_3.glb`. `scripts/bake-model.mjs` scaled it to 1.5 m, smoothed its normals, re-encoded its 1024² texture as JPEG and weighted it to the motion-capture skeleton. The joint positions it was fitted to are in `models/amir.joints.json`.
- `models/nur.glb` (v2.4): Nur's 3D model, made the same way as Amir's from the user's TRELLIS.2 export `sample_4.glb` (microsoft/TRELLIS.2-4B, MIT licence). It is 1.48 m tall, with a JPEG texture, weighted to the motion-capture skeleton. Its joints are in `models/nur.joints.json`.

- `models/petrol-pump.glb` (v2.10): one pump (plinth, pedestal, head, mechanical counter, two hoses and nozzles) cut from the user-supplied `Vintage-Petronas-Station.glb` (Blender glTF export). Its 16 parts are merged into 6 meshes, one per material, about 6,700 triangles and 189 KB. The game recolours it with the town's cel materials and bakes it with the static scenery. The PETRONAS lettering on the canopy and pump toppers is canvas text drawn in `src/world.js`, not a logo file.

- `assets/fonts/nunito-latin.woff2` (v0.3.0): the Nunito variable font (Latin subset) from Google Fonts, by Vernon Adams, Cyreal and Jacques Le Bailly, under the SIL Open Font License 1.1. Used for the game HUD.
