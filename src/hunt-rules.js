// Rules of the crow hunt, free of Three.js so the tests can run them in Node.
// Distances are metres, angles radians, times seconds.

// A pump shotgun with a suppressor: birdshot pellets in a cone. Aiming down
// the bead (BIDIK) tightens the cone. Past `killRange` one pellet no longer
// brings a crow down; past `range` the shot has no effect.
export const SHOTGUN = {
  pellets: 9, hipSpread: .05, aimSpread: .026, killRange: 34, range: 50,
  magazine: 6, reserve: 36, pumpTime: .55, shellTime: .42,
  // A suppressed shot is heard by crows this close to the shooter.
  noiseRadius: 14
};

// Crow hit sphere: generous for a body plus spread wings.
export const CROW_RADIUS = .5;

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
export function noticeRate({ distance, crouched = false, covered = false, moving = false }) {
  let radius = crouched ? (moving ? 11 : 7) : (moving ? 26 : 18);
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

// Mission: shoot `target` crows before the clock runs out.
export const MISSION = { id: 'MISI 01', title: 'Bersihkan pusat bandar', target: 20, seconds: 300 };
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
