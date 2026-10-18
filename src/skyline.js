import * as T from 'three';

// City surroundings for Crow-Zero: a painted skyline panorama on the horizon
// cylinder, and a ring of cel-shaded towers between the playable streets and
// that horizon, so every map reads as a district inside a larger city.
const mulberry = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// Painted on a canvas: sky, comic clouds and two hazy skyline layers. The
// tile wraps horizontally; the horizon sits at `ground` of the height, which
// matches eye level on the horizon cylinder.
export function paintSkyline({ width = 2048, height = 683, ground = .2, seed = 7 } = {}) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const g = c.getContext('2d'), rand = mulberry(seed), base = height * (1 - ground);
  const sky = g.createLinearGradient(0, 0, 0, base);
  sky.addColorStop(0, '#4f95cb'); sky.addColorStop(.6, '#8dbfdc'); sky.addColorStop(1, '#d6e6e2');
  g.fillStyle = sky; g.fillRect(0, 0, width, height);
  // Draw at x and its wrapped copy so the seam never cuts a shape.
  const wrap = (x, w, draw) => { for (const ox of [0, -width, width]) if (x + ox + w > 0 && x + ox < width) draw(x + ox); };
  for (let i = 0; i < 9; i++) {
    const cx = rand() * width, cy = height * (.12 + rand() * .32), size = 40 + rand() * 70, puffs = 5 + Math.floor(rand() * 6), parts = [];
    for (let k = 0; k < puffs; k++) parts.push([(k - puffs / 2) * size * .42 + rand() * 20, -rand() * size * .45, size * (.35 + rand() * .35)]);
    wrap(cx - size * 3, size * 6, x0 => {
      const x = x0 + size * 3;
      g.fillStyle = '#c9d6dc'; for (const [dx, dy, r] of parts) { g.beginPath(); g.arc(x + dx + 6, cy + dy + 8, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fbf2da'; for (const [dx, dy, r] of parts) { g.beginPath(); g.arc(x + dx, cy + dy, r, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#c9d6dc'; g.fillRect(x - puffs * size * .25, cy + size * .12, puffs * size * .5, size * .25);
    });
  }
  // Far layer: pale towers in aerial haze. Near layer: darker blocks with
  // windows, rooftop tanks, antennas and the odd construction crane.
  const layer = (count, minH, maxH, colors, windows) => {
    for (let i = 0; i < count; i++) {
      const w = 26 + rand() * 60, h = minH + Math.pow(rand(), 1.6) * (maxH - minH), x = rand() * width, color = colors[Math.floor(rand() * colors.length)], top = base - h;
      const spire = rand() < .08, stepped = rand() < .25, tank = rand() < .4, crane = windows && rand() < .05;
      wrap(x, w + 40, px => {
        g.fillStyle = color; g.fillRect(px, top, w, h + 2);
        if (stepped) g.fillRect(px + w * .2, top - h * .12, w * .6, h * .12 + 1);
        if (spire) { g.fillRect(px + w / 2 - 2, top - h * .35, 4, h * .35); g.beginPath(); g.moveTo(px + w * .3, top); g.lineTo(px + w / 2, top - h * .18); g.lineTo(px + w * .7, top); g.fill(); }
        if (tank) { g.fillRect(px + w * .15, top - 9, 12, 9); g.fillRect(px + w * .7, top - 16, 2, 16); }
        if (crane) { g.fillRect(px + w + 8, top - 70, 4, h + 70); g.fillRect(px + w - 40, top - 70, 110, 4); }
        if (windows) {
          g.fillStyle = 'rgba(255,255,240,.28)';
          for (let y = top + 7; y < base - 6; y += 9) for (let wx = px + 5; wx < px + w - 6; wx += 8) if (rand() > .25) g.fillRect(wx, y, 4, 5);
          g.fillStyle = 'rgba(30,45,60,.18)'; g.fillRect(px + w * .72, top, w * .28, h);
        }
      });
    }
  };
  layer(70, 40, 190, ['#a9c2cf', '#b4cad4', '#9fb8c7', '#bccfd6'], false);
  layer(55, 25, 140, ['#7f9cae', '#8aa4b0', '#94a9a8', '#7d95a3', '#a3a491'], true);
  const haze = g.createLinearGradient(0, base - 60, 0, base);
  haze.addColorStop(0, 'rgba(214,230,226,0)'); haze.addColorStop(1, 'rgba(214,230,226,.85)');
  g.fillStyle = haze; g.fillRect(0, base - 60, width, 60);
  g.fillStyle = '#9aa9a4'; g.fillRect(0, base, width, height - base);
  return c;
}

// Window bays for tower walls: one 4 m × 3.5 m bay per texture tile.
function windowTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#5f7f88';
  if (kind === 'band') { g.fillRect(0, 18, 64, 26); g.fillStyle = '#86a7ad'; g.fillRect(4, 22, 20, 6); }
  else { g.fillRect(10, 14, 18, 32); g.fillRect(36, 14, 18, 32); g.fillStyle = '#86a7ad'; g.fillRect(12, 16, 6, 10); g.fillRect(38, 16, 6, 10); }
  g.fillStyle = '#d9d2c2'; g.fillRect(0, 58, 64, 6);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.magFilter = T.NearestFilter;
  return t;
}

// A box whose side UVs count window bays, so one texture fits any size.
// Roof and underside sample the plain spandrel strip.
function towerGeometry(w, h, d) {
  const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const faces = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = f * 4; i < f * 4 + 4; i++) {
    if (!faces[f]) { uv.setXY(i, .5, .04); continue; }
    uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(faces[f][0] / 4)), uv.getY(i) * Math.max(1, Math.round(faces[f][1] / 3.5)));
  }
  return g;
}

// Towers fill the ring between the town's ground and the horizon, leaving
// the avenues that run off the map edge open as streets into the city.
export function createCityRing({ scene, toon, register, ground, roads, bounds, outer, seed = 11 }) {
  const rand = mulberry(seed);
  const walls = [0xe8dbb8, 0x9fc8ba, 0x89b0ca, 0xe5a88c, 0xf0d18d, 0xcbbd99, 0xb3bca6].flatMap(color => ['band', 'grid'].map(kind => ({ color, kind })));
  const textures = { band: windowTexture('band'), grid: windowTexture('grid') };
  const materials = walls.map(({ color, kind }, i) => register('city-tower-' + i, toon(color, { map: textures[kind] })));
  const roofMat = register('city-roof', toon(0x677b69)), tankMat = register('city-tank', toon(0x8a946f)), pave = register('city-pave', toon(0xb9b6a6));
  const avenues = roads.filter(r => r.kind === 'asphalt').flatMap(r => {
    const alongX = r.w >= r.d, out = [];
    if (alongX && r.x - r.w / 2 <= bounds.minX + 1) out.push({ axis: 'x', at: r.z, half: r.d / 2 });
    if (alongX && r.x + r.w / 2 >= bounds.maxX - 1) out.push({ axis: 'x', at: r.z, half: r.d / 2 });
    if (!alongX && r.z - r.d / 2 <= bounds.minZ + 1) out.push({ axis: 'z', at: r.x, half: r.w / 2 });
    if (!alongX && r.z + r.d / 2 >= bounds.maxZ - 1) out.push({ axis: 'z', at: r.x, half: r.w / 2 });
    return out;
  });
  // Pavement beyond the lawn, under the towers and out to the horizon.
  const floor = new T.Mesh(new T.PlaneGeometry(outer * 2.2, outer * 2.2), pave);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.09; floor.receiveShadow = true; floor.userData.landscape = true; scene.add(floor);
  const placed = [], margin = 9;
  const blocked = (x, z, w, d) => {
    if (x + w / 2 > ground.minX - margin && x - w / 2 < ground.maxX + margin && z + d / 2 > ground.minZ - margin && z - d / 2 < ground.maxZ + margin) return true;
    if (Math.hypot(x, z) + Math.hypot(w, d) / 2 > outer - 6) return true;
    if (avenues.some(a => a.axis === 'x' ? Math.abs(z - a.at) < d / 2 + a.half + 4 : Math.abs(x - a.at) < w / 2 + a.half + 4)) return true;
    return placed.some(p => Math.abs(x - p.x) < (w + p.w) / 2 + 5 && Math.abs(z - p.z) < (d + p.d) / 2 + 5);
  };
  for (let tries = 0; tries < 1400 && placed.length < 90; tries++) {
    const angle = rand() * Math.PI * 2, r = Math.hypot(ground.maxX - ground.minX, ground.maxZ - ground.minZ) * .3 + rand() * outer, x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const w = 12 + Math.round(rand() * 5) * 4, d = 12 + Math.round(rand() * 4) * 4;
    // Taller towers stand further out, so the skyline steps up behind the town.
    const far = Math.min(1, Math.max(0, (Math.hypot(x, z) - 90) / (outer - 90)));
    const h = Math.round((10 + rand() * 14 + far * rand() * 60) / 3.5) * 3.5;
    if (blocked(x, z, w, d)) continue;
    placed.push({ x, z, w, d });
    const tower = new T.Mesh(towerGeometry(w, h, d), materials[Math.floor(rand() * materials.length)]);
    tower.position.set(x, h / 2 - .09, z); tower.castShadow = tower.receiveShadow = true; tower.userData.landscape = true; scene.add(tower);
    const cap = new T.Mesh(new T.BoxGeometry(w + .6, .6, d + .6), roofMat); cap.position.set(x, h + .2, z); cap.userData.landscape = true; scene.add(cap);
    if (rand() < .5) { const tank = new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 2.6, 8), tankMat); tank.position.set(x + w * .25, h + 1.8, z - d * .2); tank.userData.landscape = true; scene.add(tank); }
    if (h > 40 && rand() < .5) { const mast = new T.Mesh(new T.CylinderGeometry(.15, .25, 9, 5), roofMat); mast.position.set(x - w * .2, h + 5, z); mast.userData.landscape = true; scene.add(mast); }
  }
  return placed;
}
