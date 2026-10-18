import * as T from 'three';
import { outline } from './illustration.js?v=0.1.0';
import { CROW_RADIUS, noticeRate } from './hunt-rules.js?v=0.2.0';

// House crows: they fly in from the city, circle, land on roofs, lamps and
// open ground, and grow suspicious of a player they can see. A suspicious
// crow caws, warns its neighbours and flies off. Shot crows tumble down.

// Perches, found once per map: ray-cast down onto every building, lamp and
// pole the player collides with, every overhead wire, and open ground for
// pecking. A perch may carry `yaw`, the way a crow there faces.
export function findPerches({ colliders, solids, bounds, groundHeight, canStand, rand, wires = [], hotspots = [] }) {
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), perches = [];
  const probe = (x, z, kind, yaw) => {
    ray.set(new T.Vector3(x, 90, z), down); ray.far = 100;
    const hit = ray.intersectObjects(solids, false)[0];
    if (!hit || hit.point.y < 2.2) return;
    const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : down.clone().negate();
    if (normal.y < .45) return;
    perches.push({ x, y: hit.point.y, z, kind, yaw, taken: false });
  };
  for (const c of colliders) {
    if (c.r !== undefined) { if (['lamp', 'pole'].includes(c.kind)) probe(c.x + (rand() - .5) * .3, c.z + (rand() - .5) * .3, 'lamp'); continue; }
    if (c.w * c.d < 12) continue;
    // Along the roof edge, where a crow can be seen (and shot) from the street.
    // Rows along each edge, facing out over the street.
    for (let side = 0; side < 4; side++) {
      const along = side < 2 ? c.w : c.d, n = Math.min(10, Math.max(1, Math.round(along / 3.2))), inset = .7;
      for (let i = 0; i < n; i++) {
        const t = (i + .5) / n - .5 + (rand() - .5) * .06;
        const x = side < 2 ? c.x + t * (c.w - 2 * inset) : c.x + (side === 2 ? -1 : 1) * (c.w / 2 - inset);
        const z = side < 2 ? c.z + (side === 0 ? -1 : 1) * (c.d / 2 - inset) : c.z + t * (c.d - 2 * inset);
        probe(x, z, 'roof', [0, Math.PI, Math.PI / 2, -Math.PI / 2][side] + (rand() - .5) * .8);
      }
    }
  }
  // Overhead lines sag between poles; crows sit along them a metre apart.
  for (const { a, b, sag } of wires) for (let k = 0; k < a.length; k++) {
    const p = a[k], q = b[k], length = Math.hypot(q[0] - p[0], q[2] - p[2]), across = Math.atan2(q[0] - p[0], q[2] - p[2]) + Math.PI / 2;
    for (let t = .12; t < .88; t += 1.1 / length) {
      if (rand() < .35) continue;
      perches.push({ x: p[0] + (q[0] - p[0]) * t, y: p[1] + (q[1] - p[1]) * t - sag * 4 * t * (1 - t), z: p[2] + (q[2] - p[2]) * t, kind: 'wire', yaw: across + (rand() < .5 ? 0 : Math.PI), taken: false });
    }
  }
  // Rubbish areas: bin rims, bag piles and the ground in front of them.
  for (const h of hotspots) perches.push({ x: h.x, y: h.y, z: h.z, kind: 'dump', yaw: rand() * Math.PI * 2, taken: false });
  const area = (bounds.maxX - bounds.minX) * (bounds.maxZ - bounds.minZ);
  for (let i = 0, made = 0; i < area / 60 && made < 40; i++) {
    const x = bounds.minX + rand() * (bounds.maxX - bounds.minX), z = bounds.minZ + rand() * (bounds.maxZ - bounds.minZ);
    if (canStand(x, z, bounds, colliders)) { perches.push({ x, y: groundHeight(x, z), z, kind: 'ground', taken: false }); made++; }
  }
  return perches;
}

const BODY = 0x1d2027, SHEEN = 0x3a4150, BEAK = 0x2c2a2a;
function crowModel(toon) {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  const mat = toon(BODY), sheen = toon(SHEEN), beakMat = toon(BEAK), grey = toon(0x8a8f8f), eyeMat = new T.MeshBasicMaterial({ color: 0xf2e8c9 });
  const part = (geometry, material, x, y, z, parent = body) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
  const torso = part(new T.SphereGeometry(.16, 10, 8), mat, 0, 0, 0); torso.scale.set(.95, .9, 1.75);
  const head = new T.Group(); head.position.set(0, .12, -.25); body.add(head);
  const skull = part(new T.SphereGeometry(.105, 10, 8), mat, 0, 0, 0, head);
  // House crows wear a grey shawl over the neck.
  const shawl = part(new T.SphereGeometry(.13, 10, 8), grey, 0, -.02, .08, head); shawl.scale.set(1, .9, 1.1);
  const beak = part(new T.ConeGeometry(.04, .17, 6), beakMat, 0, -.01, -.15, head); beak.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) part(new T.SphereGeometry(.018, 6, 4), eyeMat, side * .07, .03, -.06, head);
  const tail = part(new T.BoxGeometry(.16, .025, .3), sheen, 0, .02, .33); tail.rotation.x = -.15;
  const wings = [-1, 1].map(side => {
    const pivot = new T.Group(); pivot.position.set(side * .12, .05, -.02); body.add(pivot);
    const g = new T.BufferGeometry(), s = side;
    // Fingered wing: broad at the shoulder, ragged tips.
    g.setAttribute('position', new T.Float32BufferAttribute([0, 0, -.12, s * .55, 0, -.05, s * .5, 0, .12, 0, 0, .14, s * .62, 0, .02], 3));
    g.setIndex(s > 0 ? [0, 3, 1, 1, 3, 2, 1, 2, 4] : [0, 1, 3, 1, 2, 3, 1, 4, 2]); g.computeVertexNormals();
    const wing = new T.Mesh(g, toon(BODY, { side: T.DoubleSide })); wing.castShadow = true; pivot.add(wing);
    return pivot;
  });
  const legs = [-1, 1].map(side => part(new T.CylinderGeometry(.012, .012, .14, 4), beakMat, side * .05, -.17, .02));
  for (const m of [torso, skull, beak, tail]) outline(m, 1.3);
  // Drawn a little larger than life so a crow on a roof reads at range.
  body.scale.setScalar(1.6);
  // Fine detail (outline hulls, eyes) is only drawn near the player.
  const detail = []; root.traverse(o => { if (o.userData.ink || o.material?.isMeshBasicMaterial) detail.push(o); });
  root.userData = { body, head, wings, legs, detail };
  return root;
}

const rnd = (a, b) => a + Math.random() * (b - a);
export function createFlock({ scene, toon, perches, bounds, solids, groundHeight }) {
  // `settings.stay`: how long a perched crow stays, set by the difficulty.
  const crows = [], ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), settings = { stay: [25, 45] };
  const centre = new T.Vector3((bounds.minX + bounds.maxX) / 2, 0, (bounds.minZ + bounds.maxZ) / 2);
  const reach = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ) / 2 + 40;
  const edgePoint = (y = rnd(22, 34)) => { const a = Math.random() * Math.PI * 2; return new T.Vector3(centre.x + Math.cos(a) * reach, y, centre.z + Math.sin(a) * reach); };
  const freePerch = from => {
    const free = perches.filter(p => !p.taken && !p.cooldown);
    if (!free.length) return null;
    // Rubbish areas draw crows most; then roofs, wires and lamps; open ground
    // only now and then.
    const dump = free.filter(p => p.kind === 'dump');
    if (dump.length && Math.random() < .5) return dump[Math.floor(Math.random() * dump.length)];
    const pool = free.filter(p => p.kind !== 'ground' || Math.random() < .3);
    const list = pool.length ? pool : free;
    return list[Math.floor(Math.random() * list.length)];
  };
  // A crow either flies in from the edge of the city to `perch`, or (at the
  // start of a mission) is already sitting there.
  function spawn({ perch = freePerch(), perched = false, from = edgePoint() } = {}) {
    if (!perch) return null;
    perch.taken = true;
    const model = crowModel(toon), pos = perched ? new T.Vector3(perch.x, perch.y + .38, perch.z) : from.clone().add(new T.Vector3(rnd(-4, 4), rnd(-2, 2), rnd(-4, 4)));
    model.position.copy(pos); scene.add(model);
    const crow = { model, pos, vel: new T.Vector3(), perch, state: perched ? 'perch' : 'arrive', aware: 0, flap: Math.random() * 6, timer: rnd(1.5, 4), circle: rnd(2, 6), circleAngle: Math.random() * Math.PI * 2, idle: rnd(0, 2), peck: 0, yaw: perch.yaw ?? Math.random() * Math.PI * 2, alive: true, fall: 0, stay: rnd(...settings.stay), warned: false };
    crows.push(crow); return crow;
  }
  // Crows gather: a group takes neighbouring perches on one roof or wire.
  function spawnGroup(count, perched = false) {
    const first = freePerch();
    if (!first) return [];
    const near = perches.filter(p => p !== first && !p.taken && !p.cooldown && Math.hypot(p.x - first.x, p.z - first.z) < 9 && Math.abs(p.y - first.y) < 3)
      .sort((a, b) => Math.hypot(a.x - first.x, a.z - first.z) - Math.hypot(b.x - first.x, b.z - first.z));
    const from = edgePoint();
    return [first, ...near.slice(0, count - 1)].map(perch => spawn({ perch, perched, from }));
  }
  function release(crow) { if (crow.perch) { crow.perch.taken = false; crow.perch.cooldown = 6; crow.perch = null; } }
  function flee(crow, from) {
    if (!crow.alive || crow.state === 'flee') return false;
    release(crow); crow.state = 'flee';
    const away = crow.pos.clone().sub(from).setY(0);
    if (away.lengthSq() < .01) away.set(1, 0, 0);
    crow.goal = crow.pos.clone().add(away.normalize().multiplyScalar(reach * 1.6)).setY(rnd(30, 45));
    crow.vel.set(0, 6, 0);
    return true;
  }
  function kill(crow, push) {
    if (!crow.alive) return;
    crow.alive = false; release(crow); crow.state = 'dead'; crow.vel.copy(push).multiplyScalar(3).add(new T.Vector3(0, 2, 0));
    crow.spin = new T.Vector3(rnd(-8, 8), rnd(-6, 6), rnd(-8, 8));
    ray.set(crow.pos.clone().add(new T.Vector3(0, -.3, 0)), down); ray.far = 120;
    const hit = ray.intersectObjects(solids, false)[0];
    crow.floor = hit ? hit.point.y + .08 : groundHeight(crow.pos.x, crow.pos.z) + .08;
  }
  function remove(crow) { crow.model.traverse(o => o.geometry?.dispose()); crow.model.removeFromParent(); crows.splice(crows.indexOf(crow), 1); }
  const steer = (crow, target, speed, dt, turn = 2.2) => {
    const want = target.clone().sub(crow.pos), dist = want.length();
    want.normalize().multiplyScalar(Math.min(speed, dist * 1.4 + 1));
    crow.vel.lerp(want, 1 - Math.exp(-turn * dt)); crow.pos.addScaledVector(crow.vel, dt);
    return dist;
  };

  // `player`: { position, crouched, covered, moving }. Returns events for the
  // game: crows that spotted the player, and crows that left.
  function update(dt, time, player) {
    const events = [];
    for (const p of perches) if (p.cooldown) p.cooldown = Math.max(0, p.cooldown - dt);
    for (const crow of [...crows]) {
      const { body, head, wings, legs, detail } = crow.model.userData;
      const playerDist = Math.hypot(crow.pos.x - player.position.x, crow.pos.z - player.position.z, (crow.pos.y - player.position.y) * .5);
      const near = playerDist < 35 || player.scoped;
      if (crow.near !== near) { crow.near = near; for (const o of detail) o.visible = near; }
      let flapping = true;
      if (crow.state === 'arrive') {
        // Circle the target area a few times before dropping in.
        crow.circle -= dt; crow.circleAngle += dt * .7;
        const p = crow.perch, target = crow.circle > 0
          ? new T.Vector3(p.x + Math.cos(crow.circleAngle) * 12, p.y + 14, p.z + Math.sin(crow.circleAngle) * 12)
          : new T.Vector3(p.x, p.y + 3, p.z);
        const dist = steer(crow, target, 8, dt);
        if (crow.circle <= 0 && dist < 1.2) crow.state = 'land';
        // A crow that sees a standing player on the way in sheers off.
        if (playerDist < 9 && !player.crouched) { events.push({ type: 'spotted', crow }); flee(crow, player.position); }
      } else if (crow.state === 'land') {
        const p = crow.perch, dist = steer(crow, new T.Vector3(p.x, p.y + .38, p.z), 3, dt, 4);
        if (dist < .15) { events.push({ type: 'landed', crow }); crow.state = 'perch'; crow.pos.set(p.x, p.y + .38, p.z); crow.vel.set(0, 0, 0); crow.idle = rnd(.5, 2); crow.yaw = p.yaw ?? Math.random() * Math.PI * 2; }
      } else if (crow.state === 'perch') {
        flapping = false;
        crow.aware = Math.max(0, Math.min(1.2, crow.aware + noticeRate({ distance: playerDist, ...player }) * dt));
        crow.idle -= dt;
        if (crow.aware > .45) {
          // Alert: stand tall and stare at the player.
          crow.yaw += (Math.atan2(-(player.position.x - crow.pos.x), -(player.position.z - crow.pos.z)) - crow.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        } else if (crow.idle <= 0) {
          crow.idle = rnd(1, 3.5);
          if (Math.random() < .4) crow.yaw = (crow.perch?.yaw ?? crow.yaw) + rnd(-.9, .9);
          if (Math.random() < .35) crow.peck = .5;
          if (Math.random() < .12) events.push({ type: 'caw', crow, quiet: true });
        }
        if (crow.aware >= 1) { events.push({ type: 'spotted', crow }); flee(crow, player.position); }
        // A crow only stays a while: it gets restless, then flies off for good.
        crow.stay -= dt;
        if (crow.state === 'perch' && crow.stay < 6 && !crow.warned) { crow.warned = true; events.push({ type: 'restless', crow }); }
        if (crow.state === 'perch' && crow.stay <= 0) {
          const away = new T.Vector3(crow.pos.x + rnd(-1, 1), crow.pos.y, crow.pos.z + rnd(-1, 1));
          if (flee(crow, away)) events.push({ type: 'leave', crow });
        }
      } else if (crow.state === 'flee') {
        steer(crow, crow.goal, 13, dt, 3);
        if (crow.pos.distanceTo(centre) > reach * 1.3 || crow.pos.y > 44) { events.push({ type: 'gone', crow }); remove(crow); continue; }
      } else if (crow.state === 'dead') {
        flapping = false;
        if (crow.pos.y > crow.floor) {
          crow.vel.y -= 14 * dt; crow.pos.addScaledVector(crow.vel, dt);
          crow.model.rotation.x += crow.spin.x * dt; crow.model.rotation.z += crow.spin.z * dt;
          if (crow.pos.y <= crow.floor) { crow.pos.y = crow.floor; crow.model.rotation.set(0, crow.model.rotation.y, Math.PI / 2); }
        }
        crow.fall += dt;
        if (crow.fall > 8) { remove(crow); continue; }
      }
      crow.model.position.copy(crow.pos);
      if (crow.state !== 'dead') {
        if (flapping && crow.vel.lengthSq() > .05) crow.yaw = Math.atan2(-crow.vel.x, -crow.vel.z);
        crow.model.rotation.set(0, crow.yaw, 0);
        body.rotation.x = flapping ? T.MathUtils.clamp(-crow.vel.y * .06, -.5, .5) : 0;
      }
      // Wings beat in flight and fold on a perch; the head bobs and pecks.
      crow.flap += dt * (crow.state === 'flee' ? 22 : 15);
      const beat = flapping ? Math.sin(crow.flap) * .9 + .1 : crow.state === 'dead' ? .9 : -1.25;
      wings[0].rotation.z = -beat; wings[1].rotation.z = beat;
      for (const leg of legs) leg.visible = near && !flapping && crow.state !== 'dead';
      crow.peck = Math.max(0, crow.peck - dt);
      head.rotation.x = crow.peck > 0 ? Math.sin((.5 - crow.peck) * Math.PI * 4) * .5 + .4 : crow.state === 'perch' && crow.aware > .45 ? -.25 : Math.sin(time * 2 + crow.flap) * .05;
    }
    return events;
  }
  return { crows, settings, spawn, spawnGroup, update, flee, kill, hitRadius: CROW_RADIUS };
}
