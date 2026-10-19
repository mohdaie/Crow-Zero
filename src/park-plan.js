// Map 02 · Taman Rimba: a jungle park the size of map 01. A big open padang
// in the middle (crows land on the grass in plain view), dirt paths round
// it, shelters, a toilet block and a rubbish area by the entrance, a road
// with lamps and power lines along the south, and thick jungle all round.
// Buildings and paths are placed by hand; the trees are scattered from a
// fixed seed, kept clear of everything else, so the map is the same each time.
const SPECIES = ['getah', 'getah', 'durian', 'hujan', 'beringin', 'buluh', 'nangka', 'kelapa', 'pinang', 'pisang', 'ketapang', 'rambutan', 'mangga', 'durian'];
const office = (id, x, z, w, d, wall, name, rot = 0) => ({ id, kind: 'custom', x, z, rot, style: 'block', w, d, storeys: 1, wall, roofColor: '#ab6046', roof: 'pitched', name, cat: 'komuniti' });

const roads = [
  { id: 'jalan-taman', kind: 'asphalt', x: 0, z: 62, w: 140, d: 8 },
  { id: 'denai-utara', kind: 'dirt', x: 0, z: -27, w: 72, d: 4 },
  { id: 'denai-selatan', kind: 'dirt', x: 0, z: 17, w: 72, d: 4 },
  { id: 'denai-barat', kind: 'dirt', x: -34, z: -5, w: 4, d: 48 },
  { id: 'denai-timur', kind: 'dirt', x: 34, z: -5, w: 4, d: 48 },
  { id: 'denai-masuk', kind: 'dirt', x: 0, z: 38, w: 4, d: 38 },
  { id: 'denai-rimba', kind: 'dirt', x: -50, z: -27, w: 28, d: 3 }
];
const buildings = [
  { id: 'padang', kind: 'padang', x: 0, z: -5, rot: 0 },
  { id: 'wakaf-barat', kind: 'wakaf', x: -46, z: -40, rot: 0 },
  { id: 'wakaf-timur', kind: 'wakaf', x: 46, z: -40, rot: 0 },
  { id: 'pondok-1', kind: 'pondok', x: -48, z: 8, rot: 1 },
  { id: 'pondok-2', kind: 'pondok', x: 48, z: 8, rot: 3 },
  { id: 'gelanggang', kind: 'court', x: 48, z: 32, rot: 0 },
  { id: 'sampah-taman', kind: 'dump', x: -20, z: 40, rot: 2 },
  office('tandas', 18, 42, 10, 7, '#9fc8ba', 'Tandas Awam', 2),
  office('pejabat-taman', -46, 38, 12, 8, '#f0d18d', 'Pejabat Taman', 2),
  { id: 'hentian-taman', kind: 'busstop', x: 20, z: 54, rot: 2 },
  { id: 'kereta-1', kind: 'sedan', x: -30, z: 60, rot: 1, color: '#3c6e9e' },
  { id: 'kereta-2', kind: 'sedan', x: 40, z: 64, rot: 3, color: '#f4f1e8' }
];

// Footprints the trees keep clear of (centre x, z, half-width, half-depth).
const FOOTPRINT = { padang: [28, 18], wakaf: [5, 5], pondok: [4, 4], court: [8, 5], dump: [9, 5.5], busstop: [7.5, 5.5], sedan: [3, 3] };
const clear = [
  ...roads.map(r => [r.x, r.z, r.w / 2 + 2, r.d / 2 + 2]),
  ...buildings.map(b => b.kind === 'custom' ? [b.x, b.z, b.w / 2 + 4, b.d / 2 + 4] : [b.x, b.z, ...(FOOTPRINT[b.kind] || [6, 6]).map(v => v + 2)])
];

function jungle() {
  let seed = 20261019;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const trees = [];
  for (let tries = 0; tries < 6000 && trees.length < 150; tries++) {
    const x = -67 + rand() * 134, z = -67 + rand() * 124, size = +(0.8 + rand() * 0.6).toFixed(2);
    // Thick near the edges, thinner towards the open middle.
    const edge = Math.min(70 - Math.abs(x), 70 - Math.abs(z));
    if (rand() > (edge < 18 ? 1 : .35)) continue;
    if (clear.some(([cx, cz, hw, hd]) => Math.abs(x - cx) < hw + size && Math.abs(z - cz) < hd + size)) continue;
    if (trees.some(t => Math.hypot(t.x - x, t.z - z) < 2.4 * Math.max(t.size, size) + 1.2)) continue;
    trees.push({ id: 'pokok-' + trees.length, kind: 'tree-' + SPECIES[Math.floor(rand() * SPECIES.length)], x: +x.toFixed(1), z: +z.toFixed(1), rot: 0, size });
  }
  return trees;
}

export const PARK_PLAN = {
  version: 1, name: 'Taman Rimba', theme: 'jungle', bounds: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 },
  roads, units: [{ id: 'spawn', kind: 'spawn', x: 0, z: 30, rot: 0 }, ...buildings, ...jungle()]
};
