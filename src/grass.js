import * as T from 'three';

// Lawn patches and living grass. The ground shows grass in patches, with
// bare kampung earth between them. One instanced field of small clumps travels with the player:
// each clump wraps to the tile cell nearest the view, so phones only ever
// draw the grass close by, in a single draw call. A ground mask painted from
// the town plan keeps blades off roads, floors and the river, mows the yards
// short and lets the field edges and river banks grow long. Blades sway with
// the breeze and lean away from the player's feet.

const PX = 2; // mask pixels per metre
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function noise(x, z) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return (h(i, j) * (1 - u) + h(i + 1, j) * u) * (1 - v) + (h(i, j + 1) * (1 - u) + h(i + 1, j + 1) * u) * v;
}

// The mask as RGBA bytes over the ground: R where grass grows (0–255),
// G its length, B how sun-dried it is. Grass covers about half the open
// ground in soft-edged patches, and all of the wild edges. Pure, so tests can read it.
export function grassMask({ units, roads, bridges, props = [] }, bounds, ground, river) {
  const width = Math.ceil((ground.maxX - ground.minX) * PX), height = Math.ceil((ground.maxZ - ground.minZ) * PX);
  const data = new Uint8Array(width * height * 4), B = bounds;
  const at = (x, z) => [Math.floor((x - ground.minX) * PX), Math.floor((z - ground.minZ) * PX)];
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const x = ground.minX + (i + .5) / PX, z = ground.minZ + (j + .5) / PX, k = (j * width + i) * 4;
    // Long grass past the town edge and on the river banks; mown in between.
    const edge = Math.min(x - B.minX, B.maxX - x, z - B.minZ, B.maxZ - z), bank = Math.abs(x - river.x) - river.w / 2;
    const wild = Math.max(1 - smooth(-2, 7, edge), 1 - smooth(0, 5, bank));
    const n = noise(x * .13, z * .13), dry = noise(x * .07 + 40, z * .07 - 15);
    const patch = noise(x * .085 + 7, z * .085 - 3) * .65 + noise(x * .23 - 11, z * .23 + 5) * .35;
    data[k] = Math.round(255 * Math.max(smooth(.33, .45, patch), wild));
    data[k + 1] = Math.round(255 * Math.min(1, .25 + .35 * n + .6 * wild));
    data[k + 2] = Math.round(255 * smooth(.55, .85, dry) * (1 - .6 * wild));
    data[k + 3] = 255;
  }
  // Clear, then soften, everything that is not lawn.
  const clear = (x, z, w, d, pad, keep = 0, length) => {
    const [i0, j0] = at(x - w / 2 - pad, z - d / 2 - pad), [i1, j1] = at(x + w / 2 + pad, z + d / 2 + pad);
    for (let j = Math.max(0, j0); j <= Math.min(height - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(width - 1, i1); i++) {
      const k = (j * width + i) * 4; data[k] = Math.min(data[k], keep);
      if (length !== undefined) data[k + 1] = Math.min(data[k + 1], length);
    }
  };
  for (const u of units) {
    // Yards around a building are kept short.
    if (!u.def.vehicle) { const [ax, az, aw, ad] = u.area; clear(ax, az, aw, ad, 3, 255, 70); }
    for (const [x, z, w, d] of u.solids) if (!u.def.vehicle) clear(x, z, w, d, .15);
    for (const [x, z, w, d] of u.floors) clear(x, z, w, d, .1);
  }
  // Grass creeps a little over the edges of dirt lanes, never onto asphalt
  // and its kerbs and drains.
  for (const r of roads) r.kind === 'asphalt' ? clear(r.x, r.z, r.w, r.d, .8) : clear(r.x, r.z, r.w, r.d, -.25, 40, 60);
  for (const b of bridges) clear(b.x, b.z, b.w, b.d, .5);
  for (const p of props) clear(p.x, p.z, .9, .9, 0, 90);
  clear(river.x, (ground.minZ + ground.maxZ) / 2, river.w + .6, ground.maxZ - ground.minZ + 4, 0);
  return { data, width, height, minX: ground.minX, minZ: ground.minZ, sizeX: width / PX, sizeZ: height / PX };
}

// A clump is three bent blades, each two segments (three triangles).
function clumpGeometry() {
  const pos = [], uv = [], index = [];
  for (let b = 0; b < 3; b++) {
    const a = b * 2.094 + .4, lean = .12 + b * .05, ox = Math.cos(a + 1.2) * .06, oz = Math.sin(a + 1.2) * .06, base = pos.length / 3;
    const cx = Math.cos(a), cz = Math.sin(a), lx = Math.cos(a + 1.571), lz = Math.sin(a + 1.571);
    for (const [s, half, y] of [[0, .032, 0], [0, -.032, 0], [.55, .022, .55], [.55, -.022, .55], [1, 0, 1]]) {
      pos.push(ox + cx * half + lx * lean * s * s, y, oz + cz * half + lz * lean * s * s); uv.push(half > 0 ? 1 : 0, y);
    }
    index.push(base, base + 1, base + 2, base + 1, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new T.Float32BufferAttribute(pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3));
  g.setIndex(index);
  return g;
}

export function maskTexture(mask) {
  const texture = new T.DataTexture(mask.data, mask.width, mask.height, T.RGBAFormat);
  texture.magFilter = texture.minFilter = T.LinearFilter; texture.needsUpdate = true;
  return texture;
}

// The ground: the lawn texture where the mask grows grass, earth elsewhere,
// with a ragged edge between them. Both maps repeat in world metres.
export function groundMaterial({ toon, mask, texture, lawn, earth }) {
  const material = toon(0xffffff), halftone = material.onBeforeCompile;
  const uniforms = { grassMask: { value: texture }, grassArea: { value: new T.Vector4(mask.minX, mask.minZ, 1 / mask.sizeX, 1 / mask.sizeZ) }, lawnMap: { value: lawn }, earthMap: { value: earth } };
  material.onBeforeCompile = shader => {
    halftone(shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = 'varying vec2 vGroundSpot;\n' + shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vGroundSpot = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    shader.fragmentShader = `uniform sampler2D grassMask, lawnMap, earthMap; uniform vec4 grassArea; varying vec2 vGroundSpot;\n` + shader.fragmentShader.replace('#include <map_fragment>', `
      vec4 ground = texture2D(grassMask, clamp((vGroundSpot - grassArea.xy) * grassArea.zw, .001, .999));
      vec3 lawn = texture2D(lawnMap, vGroundSpot / 4.5).rgb, earth = texture2D(earthMap, vGroundSpot / 6.0).rgb;
      // Soften the photo lawn toward the painted palette; dry patches yellow.
      lawn = mix(lawn, vec3(dot(lawn, vec3(.3, .55, .15))) * vec3(.82, 1.0, .62), .3) * 1.12;
      lawn = mix(lawn, lawn * vec3(1.35, 1.1, .7), ground.b * .6);
      earth *= vec3(.93, .86, .74);
      float tuft = dot(texture2D(lawnMap, vGroundSpot / 1.7).rgb, vec3(.33));
      float cover = smoothstep(.38, .62, ground.r + (tuft - .3) * .45);
      diffuseColor.rgb *= mix(earth, lawn, cover);`);
  };
  material.customProgramCacheKey = () => 'illustrated-halftone-v1-ground';
  return material;
}

export function createGrass({ scene, toon, mask, texture = maskTexture(mask), radius = 22, count = 8000, groundY = -.05 }) {
  const tile = radius * 2;
  const uniforms = {
    grassMask: { value: texture }, grassArea: { value: new T.Vector4(mask.minX, mask.minZ, 1 / mask.sizeX, 1 / mask.sizeZ) },
    grassCentre: { value: new T.Vector2() }, grassPush: { value: new T.Vector3(0, 0, .9) }, grassTime: { value: 0 },
    grassTile: { value: tile }, grassRadius: { value: radius }, grassY: { value: groundY }
  };
  const material = toon(0xffffff, { side: T.DoubleSide }), halftone = material.onBeforeCompile;
  material.onBeforeCompile = shader => {
    halftone(shader);
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `attribute vec3 aClump;
      uniform sampler2D grassMask; uniform vec4 grassArea; uniform vec2 grassCentre; uniform vec3 grassPush;
      uniform float grassTime, grassTile, grassRadius, grassY;
      varying float vGrassTip; varying float vGrassDry;\n` + shader.vertexShader.replace('#include <begin_vertex>', `
      // Wrap this clump to the tile cell nearest the view centre.
      vec2 spot = aClump.xy + grassTile * floor((grassCentre - aClump.xy) / grassTile + .5);
      vec4 ground = texture2D(grassMask, (spot - grassArea.xy) * grassArea.zw);
      float keep = step(fract(aClump.z * 7.13) * .6 + .4, ground.r);
      float fade = 1.0 - smoothstep(grassRadius * .6, grassRadius, length(spot - grassCentre));
      float tall = (.12 + .58 * ground.g) * (.7 + .6 * fract(aClump.z * 3.7)) * keep * fade;
      float turn = aClump.z * 6.2832;
      vec3 transformed = vec3(position.x, position.y * tall, position.z) * (.75 + .5 * ground.g);
      transformed.xz = mat2(cos(turn), sin(turn), -sin(turn), cos(turn)) * transformed.xz;
      // Breeze, strongest at the tips, and a lean away from the player's feet.
      float tip = position.y * position.y, phase = grassTime * 1.8 + spot.x * .21 + spot.y * .17;
      transformed.xz += vec2(sin(phase), cos(phase * .8) * .7) * .07 * tip * tall;
      vec2 away = spot - grassPush.xy; float near = 1.0 - smoothstep(.15, grassPush.z, length(away));
      transformed.xz += normalize(away + 1e-4) * near * .32 * tip * tall;
      transformed.y *= 1.0 - .45 * near;
      transformed += vec3(spot.x, grassY, spot.y);
      vGrassTip = position.y; vGrassDry = ground.b;`);
    // Both faces of a blade take the sky's light, like the lawn under it.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n      normal = normalize(vNormal);');
    shader.fragmentShader = 'varying float vGrassTip; varying float vGrassDry;\n' + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec3 grassFresh = mix(vec3(.4, .54, .25), vec3(.66, .77, .39), vGrassTip), grassDry = mix(vec3(.56, .55, .3), vec3(.8, .74, .45), vGrassTip);
      diffuseColor.rgb *= mix(grassFresh, grassDry, vGrassDry);`);
  };
  material.customProgramCacheKey = () => 'illustrated-halftone-v1-grass';
  material.userData.noInk = true;
  // Jittered grid over one tile, so the field never shows rows.
  const geometry = new T.InstancedBufferGeometry().copy(clumpGeometry()), side = Math.ceil(Math.sqrt(count)), clumps = new Float32Array(side * side * 3);
  let seed = 2001; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < side * side; i++) clumps.set([((i % side) + rand()) / side * tile, (Math.floor(i / side) + rand()) / side * tile, rand()], i * 3);
  geometry.setAttribute('aClump', new T.InstancedBufferAttribute(clumps, 3));
  geometry.instanceCount = side * side;
  const field = new T.Mesh(geometry, material);
  field.frustumCulled = false; field.receiveShadow = true; field.userData.dynamic = true;
  scene.add(field);
  return {
    field,
    // Centre the field a little ahead of the player, where the camera looks.
    update(time, player, camera) {
      const dx = player.x - camera.x, dz = player.z - camera.z, len = Math.hypot(dx, dz) || 1;
      uniforms.grassTime.value = time;
      uniforms.grassCentre.value.set(player.x + dx / len * radius * .35, player.z + dz / len * radius * .35);
      uniforms.grassPush.value.set(player.x, player.z, .9);
    }
  };
}
