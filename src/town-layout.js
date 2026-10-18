import { TOWN_PLAN } from './town-plan.js?v=0.1.0';

// Town plan geometry shared by the game, the tests and the map editor. The
// editable positions live in town-plan.js; everything here is derived from
// them. Rects are [x, z, w, d] in metres, centred, in a unit's own frame.
// The town edge comes from the plan's optional `bounds`, which the map editor
// grows or shrinks a side at a time; GROUND is the land around it.
export const DEFAULT_BOUNDS = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };
export const BOUNDS_LIMIT = 200;
export function boundsOf(plan) {
  const b = { ...DEFAULT_BOUNDS, ...(plan?.bounds || {}) }, L = BOUNDS_LIMIT;
  return { minX: Math.max(-L, Math.min(-20, +b.minX)), maxX: Math.min(L, Math.max(20, +b.maxX)), minZ: Math.max(-L, Math.min(-20, +b.minZ)), maxZ: Math.min(L, Math.max(20, +b.maxZ)) };
}
export const groundOf = B => ({ minX: B.minX - 11, maxX: B.maxX + 13, minZ: B.minZ - 13, maxZ: B.maxZ + 13 });
// The river is fixed terrain. Every road that crosses it gets a bridge as
// wide as the road; the old footbridge stays where no road crosses nearby.
// No fixed river in a blank city. Keep the shared terrain interface for roads/grass.
export const RIVER = { x: 10000, w: 0 };
const BANKS = [RIVER.x - 5, RIVER.x + 5];
function bridgesFor() { return []; }
export const DISTRICT_INFO = [
  { id: 'kampung', name: 'Kampung Melati', short: 'KAMPUNG', color: '#c87537' },
  { id: 'terrace', name: 'Taman Kenangan', short: 'TERES', color: '#9271b4' },
  { id: 'pekan', name: 'Pekan lama', short: 'PEKAN', color: '#b95670' },
  { id: 'community', name: 'Sekolah & komuniti', short: 'KOMUNITI', color: '#4a9270' },
  { id: 'transport', name: 'Pasar & stesen bas', short: 'PASAR / BAS', color: '#4b8db4' }
];
// The 38 numbered places: [name, district, kind].
export const PLACES = {
  1: ['Rumah Amir', 'kampung', 'home'], 2: ['Rumah Tok', 'kampung', 'house'], 3: ['Rumah Pak Mail', 'kampung', 'house'],
  4: ['Rumah Mak Cik Salmah', 'kampung', 'house'], 5: ['Rumah Jiran A', 'kampung', 'house'], 6: ['Rumah Jiran B', 'kampung', 'house'],
  7: ['Rumah Jiran C', 'kampung', 'house'], 8: ['Rumah Atuk', 'kampung', 'house'], 9: ['Wakaf Kebun', 'kampung', 'pavilion'],
  10: ['Pondok Tepi Sungai', 'kampung', 'pavilion'], 11: ['Rumah Nur', 'terrace', 'terrace'], 12: ['Rumah Kak Lina', 'terrace', 'terrace'],
  13: ['Rumah Pak Abu', 'terrace', 'terrace'], 14: ['Rumah Mei Ling', 'terrace', 'terrace'], 15: ['Rumah Faiz', 'terrace', 'terrace'],
  16: ['Rumah Jiran F', 'terrace', 'terrace'], 17: ['Rumah Jiran G', 'terrace', 'terrace'], 18: ['Rumah Jiran H', 'terrace', 'terrace'],
  19: ['Kedai Sudut Mini', 'terrace', 'mini-shop'], 20: ['Tadika Kenangan', 'terrace', 'nursery'], 21: ['Warung Kak Ita', 'pekan', 'warung'],
  22: ['Kedai Runcit 99', 'pekan', 'shop'], 23: ['Kedai Gunting', 'pekan', 'shop'], 24: ['Kedai Basikal', 'pekan', 'shop'],
  25: ['Alat Tulis & Game', 'pekan', 'shop'], 26: ['Kedai Jahit', 'pekan', 'shop'], 27: ['Klinik & Farmasi', 'pekan', 'shop'],
  28: ['Kedai Roti & Kuih', 'pekan', 'shop'], 29: ['SK Seri Kenangan', 'community', 'school'], 30: ['Kantin Sekolah', 'community', 'canteen'],
  31: ['Masjid Seri Kenangan', 'community', 'mosque'], 32: ['Balai Raya', 'community', 'hall'], 33: ['Perpustakaan Mini', 'community', 'library'],
  34: ['Gelanggang Serbaguna', 'community', 'court'], 35: ['Perhentian Bas', 'transport', 'station'], 36: ['Bengkel & Tayar', 'transport', 'workshop'],
  37: ['Kiosk Petrol Retro', 'transport', 'petrol'], 38: ['Tapak Pasar Malam', 'transport', 'market']
};

// Stilt houses: the verandah and four stair treads are raised floors.
function stiltHouse(w, d, extra = {}) {
  const stairs = [0, 1, 2, 3].map(i => [0, d / 2 + 3.1 - i * .6, 2, .65, .25 + i * .28]);
  // Every kampung house has a TV aerial on a tall pole and a tempayan of water by the stairs.
  const props = [['antenna', w / 2 + .45, -1.5], ['tempayan', -1.9, d / 2 + 2.7], ...(extra.props || [])];
  return { label: 'Kampung house', places: [[0, 0, w, d]], doors: [[0, d / 2 + 4.4]], solids: [[0, 1.725, w + 1, d + 3.45]], floors: [[0, d / 2 + 1.125, w + 1, 2.25, 1.525], ...stairs], ...extra, props };
}
const pavilion = (label, w, d) => ({ label, places: [[0, 0, w, d]], doors: [[0, d / 2 + 1.6]], solids: [[0, .25, w + 1, d + 1.5]], floors: [[0, 0, w, d, .17]] });
const civic = (label, w, d, extra = {}) => ({ label, places: [[0, 0, w, d]], doors: [[0, d / 2 + 1.4]], floors: [], ...extra, solids: [[0, 0, w + 1, d + 1], ...(extra.solids || [])] });

// Street props from around 2001 (see props.js). `r` is the footprint kept clear
// of doors, people and trees, `hit` the round collider at its centre. `wall`
// props hang on their own building; `road` props may stand on a road
// (`dirt`: on a dirt lane only).
export const PROPS = {
  motor: { r: .9, hit: .55, road: true }, chairs: { r: 1.1, hit: .9, road: 'dirt' }, kopitiam: { r: .8, hit: .65 }, gas: { r: .25, hit: .2 },
  freezer: { r: .75, hit: .6 }, crates: { r: .55, hit: .5 }, postbox: { r: .35, hit: .26 }, phone: { r: .6, hit: .45 },
  bin: { r: .35, hit: .3 }, tempayan: { r: .4, hit: .36 }, drum: { r: .35, hit: .32 }, cart: { r: 1, hit: .75 },
  rack: { r: .8, hit: .6 }, board: { r: .45, hit: .3 }, ampaian: { r: 1.6, hit: 0 }, banner: { r: .5, hit: 0, road: 'dirt' },
  roadsign: { r: .3, hit: .06, road: true }, antenna: { r: .1, hit: .07, wall: true }, dish: { wall: true }, aircon: { wall: true }, poster: { wall: true }
};

// Each kind lists, in its own frame: `places` (one rect per numbered place),
// `solids` (what may not overlap another unit), `floors` ([x,z,w,d,height]
// raised walkable ground), `spots` ([x,z,heading] for people) and `decor`
// ([species, x, z, size] trees, planted only where they fit, see planting.js;
// `decorVariants` offers several yards to pick from), and `props`
// ([name, x, z, quarter turns, height, print]). `doors` gives one
// interaction point per place, where the player talks to its contact.
// `open` kinds may sit on roads. `cat` files each kind under a CATEGORIES
// heading in the editor's library; `unique` kinds appear once (their builders
// hang on a numbered place); the others can be added again as extra,
// unnumbered buildings.
export const CATEGORIES = [
  { id: 'rumah', name: 'Rumah' }, { id: 'kedai', name: 'Kedai & pekan' }, { id: 'komuniti', name: 'Sekolah & komuniti' },
  { id: 'rehat', name: 'Taman & rehat' }, { id: 'jalan', name: 'Pengangkutan' }, { id: 'kenderaan', name: 'Kenderaan & orang' }
];
export const KINDS = {
  home: stiltHouse(10, 8, {
    label: 'Rumah Amir and yard',
    solids: [[0, 1.725, 11, 11.45], [0, -7, 20, .12], [-10, 3.5, .12, 21], [-6.5, 14, 7, .12], [7.5, 14, 5, .12], [-7.5, -9, 7.5, .4], [9, 6, 2.4, .55]],
    spots: { spawn: [0, 11, 0] },
    props: [['motor', 6.8, 9.8, 1], ['gas', 4.6, -4.6], ['drum', -4.8, -4.8]],
    decor: [['kelapa', -14, 4, 1.1], ['kelapa', 11.5, -4.5, .95], ['rambutan', -7.2, 10.5, .8], ['pisang', 7.8, -4.6, .95], ['pisang', -14, 11.5, .9], ['mangga', -13.5, 19, .9], ['serai', -8.6, -5.2], ['pandan', -6.6, -5.6], ['cili', -8.7, -2.6]],
    patches: [[-6, 8, 6], [-5, 12, 5], [6, 3, 4], [8, 13, 5], [-7, -4, 5]]
  }),
  // Every kampung house gets one of three yards, picked by its id.
  house: stiltHouse(9, 7, { props: [['motor', 5.6, 6.2, 1]], decorVariants: [
    [['kelapa', -6.8, -1.5, 1], ['pisang', 6.4, -3.2, .9], ['rambutan', 0, -7.8, .8], ['serai', -3.6, 8.2]],
    [['kelapa', 6.8, .5, 1.05], ['kelapa', -7, -4, .9], ['pisang', -6.6, 4.6, .9], ['mangga', .5, -8.4, .85]],
    [['nangka', -7, -1, .9], ['pisang', 6.4, -3, .95], ['pinang', 6.8, 3.6, 1], ['jambu', 0, -7.8, .8], ['pandan', -3.8, 8.4]]
  ] }),
  wakaf: { ...pavilion('Wakaf (garden shelter)', 7, 6), props: [['tempayan', 4.3, 3.2], ['drum', -4.3, 3.4]], decor: [['rambutan', -6.8, -1, .9], ['mangga', 6.8, 1.5, .85], ['pisang', -5.6, 4.8, .85]] },
  pondok: { ...pavilion('Riverside hut', 4, 5), decor: [['kelapa', 0, -5.6, 1], ['buluh', 0, 6.4, .9], ['pisang', -4, 0, .85]] },
  canteen: { ...pavilion('School canteen', 10, 6), props: [['crates', -5.8, -1.6], ['gas', 5.7, -2.2]], decor: [['ketapang', 8, 1, .8]] },
  terrace: { label: 'Terrace house', places: [[0, 0, 6.8, 7]], doors: [[.9, -5]], solids: [[0, 0, 6.8, 7], [-1.6, -6.5, 3.6, .12], [2.5, -6.5, 1.8, .12]], floors: [[0, -5.2, 6.8, 3.5, .16]],
    props: [['dish', -2.9, -3.62, 2, 3], ['aircon', 2.6, -3.68, 2, 2.6], ['motor', -1.9, -5.1, 1]], decor: [['bungaraya', -2.8, -5.6, .8], ['bungaraya', 2.8, -5.6, .8]] },
  minishop: civic('Corner shop', 9, 8, { props: [['freezer', 2.9, 4.75], ['phone', -3.6, 5]], decor: [['kelapa', -6.4, -2.5, .9], ['bungaraya', 6, 3.5, .8]] }),
  nursery: civic('Nursery', 9, 10, { doors: [[1.6, 6.2]], solids: [[-.9, 7, 3, .6]], decor: [['jambu', 6.6, -3, .8], ['bungaraya', 3.8, 7, .8], ['bungaraya', -4.4, 7, .8]] }),
  hall: civic('Village hall', 13, 8, { props: [['banner', 0, 8.6, 0, 0, 'gotong']], decor: [['kelapa', -8.2, -2, .95]] }),
  library: civic('Library', 12, 8, { props: [['bin', 4.6, 5.2]], decor: [['ketapang', 8, -2, .8]] }),
  petrol: civic('Petrol kiosk and pumps', 9, 8, { props: [['gas', 4.5, 4.8], ['gas', 4.95, 4.55], ['drum', -4.6, 4.7]], solids: [[0, -10, 10, 7]], decor: [['kelapa', 6.6, 2.5, .95], ['kelapa', -6.4, 2, .9], ['pisang', 6.4, -4.5, .85]] }),
  warung: { label: 'Warung Kak Ita', places: [[0, 0, 11, 6.5]], doors: [[0, 6]], solids: [[0, 0, 12.5, 8.4], [-6, 3.5, .62, .62], [6, 3.5, .62, .62]], floors: [[0, 0, 11, 6.5, .275]], spots: { stall: [0, 6, .2] },
    props: [['chairs', -4.2, 6.9], ['chairs', 4.2, 6.9, 0, 0, 1], ['gas', -4.6, -2.75], ['crates', 4.8, -2.6], ['poster', -4.2, -2.98, 0, 1.7, 'menu']], decor: [['kelapa', -7.8, -3, 1.05], ['pisang', 7.8, -3.2, .95], ['pisang', -8.2, 1.8, .85], ['serai', 7.6, 1.6]] },
  shophouses: {
    label: 'Shophouse terrace (7 shops)',
    places: [0, 1, 2, 3, 4, 5, 6].map(i => [-27 + i * 9, 0, 8.8, 10]),
    doors: [0, 1, 2, 3, 4, 5, 6].map(i => [-27 + i * 9, 6.6]),
    solids: [[0, 1.48, 63, 12.95], [-7, 9, 2.4, .55]], floors: [[0, 6.475, 63, 2.95, .26]],
    // On the five-foot way: Pak Rahman's ice-cream freezer and prepaid-card board,
    // the photostat board at the stationers', bread crates and a kopitiam table.
    props: [['freezer', -23.8, 5.45], ['board', -30.2, 5.6, 0, 0, 'prabayar'], ['board', 3.2, 5.6, 0, 0, 'photostat'], ['crates', 24, 5.4], ['kopitiam', 30.1, 6.4],
      ['motor', -21.5, 9.5, 1], ['motor', 12.6, 9.5, 1, 0, 1], ['motor', 14, 9.5, 1, 0, 2]]
  },
  school: {
    label: 'School compound', yard: true,
    places: [[-5.5, -4, 38, 10]], doors: [[-5.5, 5.4]],
    solids: [[-5.5, -4, 38, 10], [19.5, -3, 9, 20], [0, -15, 51, .12], [-25.5, 0, .12, 30], [25.5, 0, .12, 30], [-17.5, 15, 16, .12], [12, 15, 27, .12], [-21.5, 14.3, .3, .3], [10.5, 14.3, .3, .3]],
    floors: [[-5.5, 2.5, 40, 3.5, .23], [-5.5, 10, 31, 9, .13]],
    props: [['roadsign', -11, 15.5, 0, 0, 'sekolah'], ['roadsign', 0, 15.5, 0, 0, 'sekolah']],
    // A rain tree shades the assembly ground; bunga raya lines the front fence.
    decor: [['hujan', -22.6, 10.5, .75], ['ketapang', 13, 11, .8], ...[-24, -19, -16, -13, 1, 4, 7, 13, 16, 19, 22].map(x => ['bungaraya', x, 13.9, .8])]
  },
  court: { label: 'Sports court', open: true, places: [[0, 0, 14, 8]], doors: [[0, 5]], solids: [[0, 0, 14, 8]], floors: [[0, 0, 14, 8, .18]] },
  mosque: {
    label: 'Mosque and plaza', places: [[0, 0, 12, 11]], doors: [[0, 8.9]], props: [['rack', 4.8, 9]], solids: [[0, .2, 16.7, 15.1]], floors: [[0, 0, 19, 19, .21]],
    decor: [['kelapa', -15, -5, 1], ['kelapa', 18, -4, 1], ['kemboja', -12, 7.5, .9], ['kemboja', 12, 7.5, .9], ['hujan', 20, 10, .8]]
  },
  busstop: { label: 'Bus shelter', open: true, places: [[0, 0, 13, 9]], doors: [[0, 3.2]], props: [['phone', 7.4, 0, 3], ['bin', -7.2, 1.5]], solids: [[0, 0, 13, 9]], floors: [[0, 0, 13, 9, .18]], decor: [['hujan', -1, -9, .9]] },
  workshop: { label: 'Tyre workshop', places: [[0, 0, 10, 10]], doors: [[0, -6.3]], props: [['drum', 4.2, -5.9], ['motor', -3.2, -6.6, 1, 0, 1]], solids: [[0, 0, 11, 11]], floors: [[0, 0, 10, 10, .19]], decor: [['kelapa', 6, 8, .9], ['pisang', 7.6, 2.5, .9]] },
  market: { label: 'Night market', open: true, places: [[0, 0, 24, 20]], doors: [[0, -9.8]], props: [['cart', 11.5, 2, 1], ['gas', -11.8, 1.5]], solids: [[0, 0, 22, 17]], floors: [], decor: [['kelapa', -12.5, -11, .9], ['hujan', 14, 11.5, .85], ['kelapa', 14.5, -10, .9]] },
  // Rubbish area: skip bins and bag piles behind a low brick wall, open at
  // the front (+z). Crows gather here more than anywhere else in town.
  dump: { label: 'Kawasan sampah', places: [], solids: [[0, 0, 16, 9]], floors: [] },
  square: {
    label: 'Town square', open: true, places: [],
    solids: [[0, 0, 22, 17]], floors: [[0, 0, 22, 17, .09]],
    props: [['postbox', 2.6, 2.6], ['phone', -2.8, -2.8, 2], ['banner', 0, 7.2, 0, 0, 'merdeka']],
    decor: [['ketapang', -12, -6, .8], ['ketapang', 12, -6, .8], ['ketapang', -12, 7, .8], ['ketapang', 12, 7, .8]]
  },
  bus: { label: 'Town bus', vehicle: true, places: [], solids: [[0, 0, 4.3, 10.3]], floors: [] },
  sedan: { label: 'Family car', vehicle: true, places: [], solids: [[0, 0, 1.9, 4.5]], floors: [] },
  passerby: { label: 'Passer-by', vehicle: true, places: [], solids: [[0, 0, .6, .6]], floors: [] }
};
for (const [kind, cat, unique] of [['home', 'rumah', 1], ['house', 'rumah'], ['terrace', 'rumah'], ['minishop', 'kedai'], ['warung', 'kedai', 1], ['shophouses', 'kedai', 1],
  ['market', 'kedai'], ['dump', 'kedai'], ['school', 'komuniti', 1], ['canteen', 'komuniti', 1], ['nursery', 'komuniti'], ['mosque', 'komuniti', 1], ['hall', 'komuniti'], ['library', 'komuniti'],
  ['court', 'komuniti'], ['wakaf', 'rehat'], ['pondok', 'rehat'], ['square', 'rehat'], ['busstop', 'jalan'], ['workshop', 'jalan'], ['petrol', 'jalan', 1],
  ['bus', 'kenderaan', 1], ['sedan', 'kenderaan'], ['passerby', 'kenderaan']]) Object.assign(KINDS[kind], { cat, unique: !!unique });

// City maps are independent of the RPG story. Every building can be copied.
for (const def of Object.values(KINDS)) def.unique = false;
export const TREE_SPECIES = {
  kelapa: 'Pokok kelapa', pinang: 'Pokok pinang', pisang: 'Pokok pisang', buluh: 'Buluh',
  rambutan: 'Pokok rambutan', mangga: 'Pokok mangga', jambu: 'Pokok jambu', nangka: 'Pokok nangka',
  durian: 'Pokok durian', getah: 'Pokok getah', hujan: 'Pokok hujan', ketapang: 'Pokok ketapang',
  kemboja: 'Pokok kemboja', beringin: 'Pokok beringin', bungaraya: 'Bunga raya', serai: 'Serai', pandan: 'Pandan', cili: 'Cili'
};
CATEGORIES.push({id:'pokok',name:'Pokok & tumbuhan'}, {id:'misi',name:'Titik mula'});
for (const [species,label] of Object.entries(TREE_SPECIES)) KINDS['tree-'+species] = {
  label, cat:'pokok', species, places:[], solids:[[0,0,1.5,1.5]], floors:[]
};
KINDS.spawn = {label:'Titik mula FPS',cat:'misi',unique:true,open:true,places:[],solids:[[0,0,1,1]],floors:[]};

// Custom buildings (kind 'custom') carry their own size and look in the plan:
// { style, w, d, storeys, wall, roofColor, roof: 'pitched'|'flat', name, cat }.
// Each style reuses a built-in shape, so a new building needs no new code.
export const CUSTOM_STYLES = {
  block: { label: 'Bangunan batu (kedai, pejabat)', def: (w, d) => civic('Custom building', w, d) },
  kampung: { label: 'Rumah kampung bertiang', def: (w, d) => stiltHouse(w, d, { label: 'Custom kampung house' }) },
  wakaf: { label: 'Wakaf / pondok terbuka', def: (w, d) => pavilion('Custom shelter', w, d) },
  plaza: { label: 'Dataran / padang (boleh di atas jalan)', def: (w, d) => ({ label: 'Custom plaza', open: true, places: [[0, 0, w, d]], solids: [[0, 0, w, d]], floors: [[0, 0, w, d, .09]] }) }
};
export const CUSTOM_DEFAULTS = { style: 'block', w: 9, d: 8, storeys: 1, wall: '#e8dbb8', roofColor: '#ab6046', roof: 'pitched', name: '', cat: 'kedai' };
const clamp = (v, lo, hi, fallback) => Number.isFinite(+v) ? Math.min(hi, Math.max(lo, +v)) : fallback;
export function customLook(u) {
  const c = { ...CUSTOM_DEFAULTS, ...u };
  const colour = (v, fallback) => /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
  return { ...c, style: CUSTOM_STYLES[c.style] ? c.style : 'block', w: clamp(c.w, 2, 80, 9), d: clamp(c.d, 2, 80, 8), storeys: Math.round(clamp(c.storeys, 1, 4, 1)),
    wall: colour(c.wall, CUSTOM_DEFAULTS.wall), roofColor: colour(c.roofColor, CUSTOM_DEFAULTS.roofColor), roof: c.roof === 'flat' ? 'flat' : 'pitched', name: String(c.name || '').slice(0, 40) };
}
export const kindDef = u => {
  if (KINDS[u.kind]?.species) { const size = Math.max(.4, Math.min(2, Number(u.size) || 1)); return {...KINDS[u.kind],solids:[[0,0,1.5*size,1.5*size]]}; }
  if (u.kind !== 'custom') return KINDS[u.kind];
  const c = customLook(u);
  return { ...CUSTOM_STYLES[c.style].def(c.w, c.d), label: c.name || 'Custom building', cat: c.cat, custom: true };
};

// Quarter-turn transforms match Three.js rotation.y = rot·π/2:
// world = (x + lx·cos + lz·sin, z − lx·sin + lz·cos).
const COS = [1, 0, -1, 0], SIN = [0, 1, 0, -1];
const turn = rot => ((Math.round(rot || 0) % 4) + 4) % 4;
export function toWorld(unit, lx, lz) {
  const r = turn(unit.rot);
  return [unit.x + lx * COS[r] + lz * SIN[r], unit.z - lx * SIN[r] + lz * COS[r]];
}
export function rectToWorld(unit, [x, z, w, d]) {
  const [wx, wz] = toWorld(unit, x, z);
  return turn(unit.rot) % 2 ? [wx, wz, d, w] : [wx, wz, w, d];
}
export const headingToWorld = (unit, heading) => heading + turn(unit.rot) * Math.PI / 2;
function bounds(rects) {
  if (!rects.length) return null;
  let a = Infinity, b = -Infinity, c = Infinity, e = -Infinity;
  for (const [x, z, w, d] of rects) { a = Math.min(a, x - w / 2); b = Math.max(b, x + w / 2); c = Math.min(c, z - d / 2); e = Math.max(e, z + d / 2); }
  return [(a + b) / 2, (c + e) / 2, b - a, e - c];
}
const overlap = (p, q, gap = 0) => Math.abs(p[0] - q[0]) < (p[2] + q[2]) / 2 + gap && Math.abs(p[1] - q[1]) < (p[3] + q[3]) / 2 + gap;
const EPS = -.02;

// Everything the game needs, derived from one plan.
export function derive(plan) {
  const units = plan.units.map(u => {
    const def = kindDef(u);
    if (!def) throw new Error(`Unknown kind ${u.kind} for ${u.id}`);
    const solids = def.solids.map(r => rectToWorld(u, r));
    const floors = (def.floors || []).map(f => [...rectToWorld(u, f), f[4]]);
    const places = (u.places || []).map((id, i) => ({ id, rect: rectToWorld(u, def.places[i]) }));
    return { ...u, rot: turn(u.rot), def, solids, floors, places, area: bounds([...solids, ...floors.map(f => f.slice(0, 4)), ...places.map(p => p.rect)]) };
  });
  const buildings = units.flatMap(u => u.places.map(({ id, rect: [x, z, w, d] }, i) => {
    const [name, zone, kind] = PLACES[id], [dx, dz] = toWorld(u, ...(u.def.doors?.[i] || [u.def.places[i][0], u.def.places[i][1] + u.def.places[i][3] / 2 + 1.5]));
    return { id, name, zone, kind, x, z, w, d, unit: u.id, door: { x: dx, z: dz } };
  })).sort((a, b) => a.id - b.id);
  const districts = DISTRICT_INFO.map(info => {
    const box = bounds(buildings.filter(b => b.zone === info.id).map(b => [b.x, b.z, b.w, b.d])) || [0, 0, 0, 0];
    return { ...info, x: box[0], z: box[1], w: box[2] + 8, d: box[3] + 8 };
  });
  const spot = (kind, name) => {
    const u = units.find(unit => unit.kind === kind), s = u && u.def.spots?.[name];
    if (!s) return null;
    const [x, z] = toWorld(u, s[0], s[1]); return { x, z, heading: headingToWorld(u, s[2]) };
  };
  // Nur starts just outside her terrace gate, facing the street.
  const nurHome = units.find(u => (u.places || []).some(p => p.id === 11));
  const spawnNur = nurHome && (() => { const i = nurHome.places.findIndex(p => p.id === 11), [lx, , , ] = nurHome.def.places[i], [x, z] = toWorld(nurHome, lx + .9, -8.2); return { x, z, heading: headingToWorld(nurHome, Math.PI) }; })();
  return {
    units, buildings, districts, roads: plan.roads.map(r => ({ ...r })), bridges: bridgesFor(plan.roads),
    floors: units.flatMap(u => u.floors),
    spots: { spawn: (() => { const u=units.find(u=>u.kind==='spawn'); return u ? {x:u.x,z:u.z,heading:headingToWorld(u,0)} : {x:0,z:0,heading:0}; })(), spawnNur, stall: spot('warung', 'stall') },
    props: units.flatMap(u => (u.def.props || []).map(([name, lx, lz, t = 0, y = 0, print = 0]) => {
      const [x, z] = toWorld(u, lx, lz); return { name, x, z, heading: headingToWorld(u, t * Math.PI / 2), y, print, unit: u.id };
    })),
    passersby: units.filter(u => u.kind === 'passerby').map(u => ({ x: u.x, z: u.z, heading: headingToWorld(u, 0), who: u.who || 'nur' }))
  };
}

export function validatePlan(plan) {
  if (!plan || typeof plan!=='object' || !Array.isArray(plan.units) || !Array.isArray(plan.roads)) return ['Map must contain units and roads arrays.'];
  const errors=[];
  if(plan.version!==1)errors.push('Unsupported map version.');
  if(plan.units.length>2000 || plan.roads.length>1000)errors.push('Map exceeds 2000 objects or 1000 roads.');
  if(plan.bounds && (!Object.values(plan.bounds).every(Number.isFinite) || !['minX','maxX','minZ','maxZ'].every(k=>Number.isFinite(plan.bounds[k]))))errors.push('Invalid map bounds.');
  for(const u of plan.units){
    if(!u || typeof u.id!=='string' || !Object.hasOwn(KINDS,u.kind) && u.kind!=='custom' || ![u.x,u.z].every(Number.isFinite) || u.rot!==undefined && (!Number.isInteger(u.rot) || u.rot<0 || u.rot>3)) { errors.push('Invalid object or position.'); continue; }
    if(u.size!==undefined && (!Number.isFinite(u.size)||u.size<.4||u.size>2))errors.push('Tree size must be between 0.4 and 2.');
    if(u.places!==undefined && (!Array.isArray(u.places)||u.places.length>(kindDef(u).places?.length||0)||u.places.some(id=>!PLACES[id])))errors.push('Invalid original place references.');
    for(const k of ['w','d','storeys'])if(u[k]!==undefined&&!Number.isFinite(u[k]))errors.push('Invalid building dimensions.');
    if(u.name!==undefined&&typeof u.name!=='string')errors.push('Invalid building name.');
  }
  if(new Set(plan.roads.map(r=>r?.id)).size!==plan.roads.length)errors.push('Two roads share one id.');
  for(const r of plan.roads)if(!r || typeof r.id!=='string' || !['asphalt','dirt'].includes(r.kind) || ![r.x,r.z,r.w,r.d].every(Number.isFinite) || r.w<=0 || r.d<=0 || r.w>400 || r.d>400)errors.push('Invalid road geometry.');
  if(plan.templates!==undefined && (!Array.isArray(plan.templates)||plan.templates.some(t=>!t||typeof t.id!=='string'||typeof t.name!=='string')))errors.push('Invalid building templates.');
  return errors;
}
export function encodePlan(plan) { return btoa(Array.from(new TextEncoder().encode(JSON.stringify(plan)),c=>String.fromCharCode(c)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
export function decodePlan(text) { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))); }

// Layout checks shared by the tests and the editor. Errors make a plan
// unusable; warnings are worth a look but still play.
export function planProblems(plan) {
  const invalid = validatePlan(plan);
  if (invalid.length) return invalid.map(text=>({level:'error',units:[],text}));
  const problems = [], town = derive(plan), B = boundsOf(plan);
  const river = [RIVER.x, 0, RIVER.w, 2 * BOUNDS_LIMIT + 40];
  const label = u => `${u.def.label}${u.places.length ? ' (' + u.places.map(p => p.id).join(', ') + ')' : ''}`;
  for (const u of town.units) {
    const edges = u.def.vehicle ? u.solids : u.places.map(p => p.rect);
    for (const [x, z, w, d] of edges.length ? edges : u.solids)
      if (x - w / 2 < B.minX - .01 || x + w / 2 > B.maxX + .01 || z - d / 2 < B.minZ - .01 || z + d / 2 > B.maxZ + .01) { problems.push({ level: 'error', units: [u.id], text: `${label(u)} is outside the town edge.` }); break; }
    if (u.solids.some(r => overlap(r, river, EPS))) problems.push({ level: 'error', units: [u.id], text: `${label(u)} is in the river.` });
  }
  if (new Set(plan.units.map(u => u.id)).size !== plan.units.length) problems.push({ level: 'error', units: [], text: 'Two buildings share one id.' });
  for (const kind of Object.keys(KINDS).filter(k => KINDS[k].unique)) {
    const same = town.units.filter(u => u.kind === kind);
    if (same.length > 1) problems.push({ level: 'error', units: same.slice(1).map(u => u.id), text: `There can be only one ${KINDS[kind].label.toLowerCase()}.` });
  }
  for (let i = 0; i < town.units.length; i++) for (let j = i + 1; j < town.units.length; j++) {
    const a = town.units[i], b = town.units[j];
    if (!overlap(a.area, b.area, 0)) continue;
    if (a.solids.some(p => b.solids.some(q => overlap(p, q, EPS)))) problems.push({ level: 'error', units: [a.id, b.id], text: `${label(a)} overlaps ${label(b)}.` });
  }
  for (const u of town.units) {
    if (u.def.vehicle || u.def.open) continue;
    for (const r of town.roads) if (r.kind === 'asphalt' && (u.places.length ? u.places.map(p => p.rect) : u.solids).some(rect => overlap(rect, [r.x, r.z, r.w, r.d], EPS))) problems.push({ level: 'warning', units: [u.id], roads: [r.id], text: `${label(u)} sits on the ${r.id.replace(/-/g, ' ')}.` });
  }
  for (const r of town.roads) {
    const inRiver = r.x - r.w / 2 < BANKS[1] && r.x + r.w / 2 > BANKS[0];
    if (inRiver && !town.bridges.some(b => b.road === r.id)) problems.push({ level: 'warning', units: [], roads: [r.id], text: `The ${r.id.replace(/-/g, ' ')} runs into the river. Roads get a bridge only when they cross it from bank to bank, east–west.` });
  }
  for (const r of town.roads) if (r.x-r.w/2<B.minX || r.x+r.w/2>B.maxX || r.z-r.d/2<B.minZ || r.z+r.d/2>B.maxZ)
    problems.push({level:'error',units:[],roads:[r.id],text:`Road ${r.id} is outside the town edge.`});
  return problems;
}

// The editor's "Preview in game" link carries a plan in the URL hash
// (#plan=<base64url JSON>). It applies to that visit only, and only when the
// plan has no layout errors; otherwise the saved town plan is used.
export function planFromHash(hash) {
  try {
    const match = (hash || '').match(/[#&]plan=([A-Za-z0-9_-]+)/);
    if (!match) return null;
    const plan = decodePlan(match[1]);
    return planProblems(plan).some(p => p.level === 'error') ? null : plan;
  } catch { return null; }
}
export const PLAN = planFromHash(globalThis.location?.hash) || TOWN_PLAN;
export const PREVIEW = PLAN !== TOWN_PLAN;
export const TOWN_BOUNDS = boundsOf(PLAN);
export const GROUND = groundOf(TOWN_BOUNDS);
const TOWN = derive(PLAN);
export const UNITS = TOWN.units;
export const BUILDINGS = TOWN.buildings;
export const DISTRICTS = TOWN.districts;
export const ROADS = TOWN.roads;
export const BRIDGES = TOWN.bridges;
export const FLOORS = TOWN.floors;
export const SPOTS = TOWN.spots;
export const PASSERSBY = TOWN.passersby;
export const STREET_PROPS = TOWN.props;
// Name the district of the nearest numbered place, so labels follow edits.
export function districtAt(x, z) {
  let best = BUILDINGS[0], distance = Infinity;
  for (const b of BUILDINGS) {
    const dx = Math.max(0, Math.abs(x - b.x) - b.w / 2), dz = Math.max(0, Math.abs(z - b.z) - b.d / 2), dist = dx * dx + dz * dz;
    if (dist < distance) { distance = dist; best = b; }
  }
  return DISTRICTS.find(d => d.id === best?.zone) || DISTRICTS[2];
}
