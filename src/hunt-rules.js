// Rules of the crow hunt, free of Three.js so the tests can run them in Node.
// Distances are metres, angles radians, times seconds.

// A pump shotgun with a suppressor: birdshot pellets in a cone. Aiming down
// the bead (BIDIK) tightens the cone. Past `killRange` one pellet no longer
// brings a crow down; past `range` the shot has no effect.
export const SHOTGUN = {
  pellets: 9, hipSpread: .05, aimSpread: .026, killRange: 34, range: 50,
  magazine: 8, reserve: 96, pumpTime: .55, shellTime: .42,
  // A suppressed shot is heard by crows this close to the shooter.
  noiseRadius: 14
};

// Barrett M82: semi-automatic .50 rifle with a scope. One bullet, no spread
// through the scope, and it carries on through up to `pierce` crows in a
// line. It has no suppressor: every crow within `noiseRadius` hears it.
export const SNIPER = {
  magazine: 10, reserve: 30, fireDelay: .45, reloadTime: 2.4,
  hipSpread: .06, aimSpread: 0, range: 300, pierce: 3, zoomFov: 10,
  noiseRadius: 45
};

// Crow hit sphere: generous for a body plus spread wings.
export const CROW_RADIUS = .6;

// Even spread over a disc: `rand` returns [0,1). Each pellet is [yaw, pitch]
// offset from the aim direction.
export function pelletOffsets(rand, count = SHOTGUN.pellets, spread = SHOTGUN.hipSpread) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = spread * Math.sqrt(rand()), a = rand() * Math.PI * 2;
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

// Distance along a normalised ray to a sphere, or Infinity on a miss.
export function raySphere(origin, dir, center, radius) {
  const ox = center.x - origin.x, oy = center.y - origin.y, oz = center.z - origin.z;
  const along = ox * dir.x + oy * dir.y + oz * dir.z;
  if (along < 0) return Infinity;
  const miss = ox * ox + oy * oy + oz * oz - along * along;
  if (miss > radius * radius) return Infinity;
  return along - Math.sqrt(radius * radius - miss);
}

// Does a crow fall, given how far away it is and how many pellets struck?
export function pelletsKill(distance, hits) {
  if (hits < 1 || distance > SHOTGUN.range) return false;
  return distance <= SHOTGUN.killRange || hits >= 2;
}

// How fast a perched crow grows suspicious of the player (per second).
// Standing in the open is seen from far; crouching behind cover only up close.
export function noticeRate({ distance, crouched = false, covered = false, moving = false, running = false }) {
  let radius = crouched ? (moving ? 11 : 7) : running ? 34 : (moving ? 26 : 18);
  if (covered) radius *= crouched ? .45 : .7;
  if (distance >= radius) return -.35;
  return .15 + (1 - distance / radius) * 1.6;
}

// Hidden means crouched next to something solid: a wall, car, tree or stall.
export function coverNear(x, z, colliders, reach = 1.6) {
  return colliders.some(c => c.r !== undefined
    ? Math.hypot(x - c.x, z - c.z) < c.r + reach
    : Math.hypot(Math.max(0, Math.abs(x - c.x) - c.w / 2), Math.max(0, Math.abs(z - c.z) - c.d / 2)) < reach);
}

// One word for the HUD's stealth pill.
export function stealthLabel(crouched, covered) {
  return crouched && covered ? 'TERSOROK' : crouched || covered ? 'SEPARA' : 'KELIHATAN';
}

// Game version, shown on the title screen (kept equal to package.json).
export const VERSION = '0.9.1';

// Difficulty: how many crows there are to find (more is easier) and how
// long the mission lasts. `start` crows sit in town when it begins; then
// `base` (plus one per 6 kills, up to `max`) are kept in town, arriving in
// groups of `group`, each staying `stay` seconds before it flies off.
// ('biasa' is the stored id of SEDERHANA, kept for saved settings.)
export const DIFFICULTY = {
  mudah: { label: 'MUDAH', note: 'Banyak gagak (24–36) · 5 minit', seconds: 300, start: 28, base: 24, max: 36, group: [3, 6], stay: [35, 55] },
  biasa: { label: 'SEDERHANA', note: 'Gagak sederhana (14–24) · 3 minit', seconds: 180, start: 16, base: 14, max: 24, group: [2, 4], stay: [25, 45] },
  sukar: { label: 'SUKAR', note: 'Gagak sedikit (8–14), cepat terbang · 2 minit', seconds: 120, start: 10, base: 8, max: 14, group: [1, 3], stay: [16, 30] }
};
export const crowsWanted = (level, kills) => Math.min(level.max, level.base + Math.floor(kills / 6));

// Mission: shoot `target` crows before the clock runs out (the difficulty
// sets the clock; `seconds` is the default).
export const MISSION = { id: 'MISI 01', title: 'Kawal kawasan pasar', target: 20, seconds: 180 };

// Moving: walk, and break into a run after holding a direction for
// `runAfter` seconds (the map is big). Crouching and aiming slow you down.
export const MOVE = { walk: 4.6, run: 8.2, crouch: 2.1, runAfter: 2 };
export function moveSpeed({ crouched = false, aim = 0, held = 0 }) {
  if (crouched) return MOVE.crouch * (1 - aim * .4);
  return (held >= MOVE.runAfter && aim < .3 ? MOVE.run : MOVE.walk) * (1 - aim * .4);
}

// Where a crow is from the player's point of view: `angle` is radians off
// straight ahead (+ to the right), `side` one of the four callout sectors.
export function bearing(player, crow) {
  const dx = crow.x - player.x, dz = crow.z - player.z;
  const right = dx * Math.cos(player.yaw) - dz * Math.sin(player.yaw), ahead = -dx * Math.sin(player.yaw) - dz * Math.cos(player.yaw);
  const angle = Math.atan2(right, ahead), a = Math.abs(angle);
  return { angle, distance: Math.hypot(dx, dz), side: a < .6 ? 'depan' : a > 2.4 ? 'belakang' : angle > 0 ? 'kanan' : 'kiri' };
}
const WHERE = { depan: 'DI HADAPAN', kiri: 'DI KIRI ANDA', kanan: 'DI KANAN ANDA', belakang: 'DI BELAKANG ANDA' };
const round5 = d => Math.max(5, Math.round(d / 5) * 5);
// The callout for the crows within `range`: the busiest direction, ties to
// the nearest. One crow gets its distance; crows behind get a nudge to turn.
export function crowCallout(player, crows, range = 70) {
  const groups = {};
  for (const c of crows) {
    const b = bearing(player, c);
    if (b.distance > range) continue;
    const g = groups[b.side] ||= { side: b.side, count: 0, nearest: Infinity, angle: 0 };
    g.count++; if (b.distance < g.nearest) { g.nearest = b.distance; g.angle = b.angle; }
  }
  const pick = Object.values(groups).sort((a, b) => b.count - a.count || a.nearest - b.nearest)[0];
  if (!pick) return null;
  const text = pick.count === 1 ? `1 GAGAK ${round5(pick.nearest)}M ${WHERE[pick.side]}` : `${pick.count} GAGAK ${WHERE[pick.side]}`;
  return { ...pick, text: pick.side === 'belakang' ? text + ' — PUSING!' : text };
}
// The crows a sniper bullet brings down: every crow along the ray, nearest
// first, up to the first wall and at most `pierce` of them. `hits` are
// [distance, crow] pairs; `wall` is the distance to the first wall.
export function bulletPath(hits, wall = Infinity, pierce = SNIPER.pierce, range = SNIPER.range) {
  return hits.filter(([d]) => d < wall && d <= range).sort((a, b) => a[0] - b[0]).slice(0, pierce).map(([, crow]) => crow);
}

// Score: 100 a crow, plus (when the mission is won) 10 a second left on
// the clock, plus up to 500 for accuracy; then times the difficulty. The
// server (submit_crow_score) checks the same ceiling.
export const SCORE_MULTIPLIER = { mudah: 1, biasa: 1.5, sukar: 2 };
export function missionScore({ kills, shots, timeLeft, won, difficulty }) {
  const accuracy = shots ? Math.min(1, kills / shots) : 0;
  const base = kills * 100 + (won ? Math.round(Math.max(0, timeLeft)) * 10 : 0) + Math.round(accuracy * 500);
  return { score: Math.round(base * (SCORE_MULTIPLIER[difficulty] ?? 1)), accuracy: Math.round(accuracy * 100) };
}
// Does `score` earn a place in a top-10 `board` (sorted, highest first)?
export const makesTopTen = (score, board) => score > 0 && (board.length < 10 || score > board[9].score);

export function missionState({ kills, timeLeft, shells }) {
  if (kills >= MISSION.target) return 'won';
  if (timeLeft <= 0) return 'time';
  if (shells <= 0) return 'ammo';
  return 'playing';
}

export const clock = seconds => {
  const s = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
};
