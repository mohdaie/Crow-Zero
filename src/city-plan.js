// A small built-in city for the crow game, used until a map is saved in the
// editor: two avenues, shophouses, office blocks, a market and a mosque.
const office = (id, x, z, w, d, storeys, wall, rot = 0, name = '') => ({ id, kind: 'custom', x, z, rot, style: 'block', w, d, storeys, wall, roofColor: '#677b69', roof: 'flat', name, cat: 'kedai' });
const tree = (id, species, x, z, size = 1) => ({ id, kind: 'tree-' + species, x, z, rot: 0, size });
export const CITY_PLAN = {
  version: 1, name: 'Bandar Gagak', bounds: { minX: -70, maxX: 70, minZ: -70, maxZ: 70 },
  roads: [
    { id: 'jalan-utama', kind: 'asphalt', x: 0, z: 0, w: 140, d: 10 },
    { id: 'jalan-tengah', kind: 'asphalt', x: 0, z: 0, w: 10, d: 140 },
    { id: 'jalan-masjid', kind: 'asphalt', x: 0, z: -45, w: 140, d: 8 },
    { id: 'jalan-selatan', kind: 'asphalt', x: 0, z: 55, w: 140, d: 8 }
  ],
  units: [
    { id: 'spawn', kind: 'spawn', x: 8, z: 22, rot: 2 },
    { id: 'kedai', kind: 'shophouses', x: -37.5, z: -14.5, rot: 0 },
    office('pejabat-1', 20, -14, 16, 12, 4, '#e5a88c', 0, 'Majlis Bandaraya'),
    office('pejabat-2', 40, -14, 14, 12, 3, '#9fc8ba'),
    office('pejabat-3', 59, -14, 12, 12, 4, '#f0d18d', 0, 'Bank'),
    { id: 'masjid', kind: 'mosque', x: -30, z: -30, rot: 0 },
    { id: 'pasar-pagi', kind: 'market', x: -56, z: -30, rot: 0 },
    office('flat-1', 20, -31, 14, 12, 4, '#89b0ca', 2),
    office('flat-2', 40, -31, 14, 12, 3, '#d99cb6', 2),
    office('flat-3', 59, -31, 12, 12, 4, '#e8dbb8', 2),
    { id: 'pasar', kind: 'market', x: -50, z: 18, rot: 2 },
    { id: 'dataran', kind: 'square', x: -22, z: 16, rot: 0 },
    { id: 'hentian', kind: 'busstop', x: 20, z: 10, rot: 2 },
    { id: 'petrol', kind: 'petrol', x: 45, z: 14, rot: 2 },
    office('blok-a', 20, 36, 16, 12, 4, '#f0d18d', 2, 'Hotel'),
    office('blok-b', -22, 40, 18, 12, 3, '#9fc8ba', 2),
    office('blok-c', -52, 42, 16, 12, 4, '#e5a88c', 2),
    office('blok-d', 48, 40, 14, 12, 4, '#89b0ca', 2, 'Klinik'),
    { id: 'kereta-1', kind: 'sedan', x: -24, z: 2.5, rot: 1, color: '#d4322c' },
    { id: 'kereta-2', kind: 'sedan', x: 30, z: -2.5, rot: 3, color: '#f4f1e8' },
    { id: 'kereta-3', kind: 'sedan', x: 2.5, z: 32, rot: 0, color: '#3c6e9e' },
    { id: 'bas', kind: 'bus', x: 12, z: 2.6, rot: 1 },
    tree('t1', 'ketapang', -8, -24, 1), tree('t2', 'hujan', -9, 30, .9), tree('t3', 'ketapang', 9, -24, 1),
    tree('t4', 'ketapang', 30, 24, .9), tree('t5', 'hujan', 65, 26, .9), tree('t6', 'ketapang', -66, 30, .9),
    tree('t7', 'kelapa', -36, 30, 1), tree('t8', 'kelapa', 33, 47, 1), tree('t9', 'ketapang', -38, 64, .9),
    tree('t10', 'hujan', 10, 64, .9), tree('t11', 'ketapang', 50, 64, .9), tree('t12', 'kelapa', -60, -60, 1),
    tree('t13', 'ketapang', 30, -60, 1), tree('t14', 'hujan', -10, -60, .9), tree('t15', 'kemboja', -44, -24, .9)
  ]
};
