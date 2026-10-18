import * as T from 'three';
import { safeSpawn, movePlayer, canStand } from './walk.js?v=0.1.0';
import { CITY_PLAN } from './city-plan.js?v=0.2.0';
import { SHOTGUN, SNIPER, bulletPath, MISSION, pelletOffsets, raySphere, pelletsKill, coverNear, stealthLabel, missionState, clock } from './hunt-rules.js?v=0.4.0';
import { startAudio, sfx } from './sfx.js?v=0.4.0';
const $ = id => document.getElementById(id), canvas = $('world');
const encode = plan => btoa(Array.from(new TextEncoder().encode(JSON.stringify(plan)), c => String.fromCharCode(c)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

try {
  // Map: the editor's link, else the saved draft, else the built-in city.
  // town-layout.js reads the hash when it loads, so it is imported after.
  // A map with no buildings yet (a blank editor) plays in the built-in city.
  const decode = text => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))); } catch { return null; } };
  const built = plan => plan?.units?.some(u => u.kind !== 'spawn');
  const linked = location.hash.match(/[#&]plan=([A-Za-z0-9_-]+)/);
  if (!linked || !built(decode(linked[1]))) {
    let saved; try { saved = JSON.parse(localStorage.getItem('crow-zero-draft-v1') || 'null')?.plan; } catch { }
    history.replaceState(null, '', '#plan=' + encode(!linked && built(saved) ? saved : CITY_PLAN));
  }
  const { planFromHash, ROADS } = await import('./town-layout.js?v=0.1.0');
  if (!planFromHash(location.hash)) throw Error('Peta tidak sah. Betulkan masalah layout di editor.');
  const { makeWorld } = await import('./world.js?v=0.3.0');
  const { toon } = await import('./illustration.js?v=0.1.0');
  const { findPerches, createFlock } = await import('./crows.js?v=0.4.0');
  const { createShotgun } = await import('./shotgun.js?v=0.4.0');
  const { createSniper } = await import('./sniper.js?v=0.4.0');
  const world = await makeWorld(canvas), { camera, renderer, scene, bounds, colliders } = world;
  camera.rotation.order = 'YXZ'; camera.fov = 70; camera.near = .05; camera.updateProjectionMatrix();
  renderer.autoClear = false;

  // Everything a pellet or a falling crow can strike: the batched town.
  const solids = [];
  scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.castShadow && o.material?.type !== 'ShaderMaterial') solids.push(o); });
  const perches = findPerches({ colliders, solids, bounds, groundHeight: world.groundHeight, canStand, rand: Math.random, wires: world.wires });
  const flock = createFlock({ scene, toon, perches, bounds, solids, groundHeight: world.groundHeight });
  // Two weapons, each with its own model, rules and ammunition. `cycle` is
  // the pump (shotgun) or the recoil recovery (Barrett) between shots.
  const weapons = [
    { id: 'shotgun', name: 'SENAPANG PATAH', rules: SHOTGUN, model: createShotgun(toon), mag: SHOTGUN.magazine, reserve: SHOTGUN.reserve, cycleTime: SHOTGUN.pumpTime },
    { id: 'sniper', name: 'BARRETT M82', rules: SNIPER, model: createSniper(toon), mag: SNIPER.magazine, reserve: SNIPER.reserve, cycleTime: SNIPER.fireDelay }
  ];
  let w = weapons[0], nextWeapon = null, lowered = 0;

  // ------------------------------------------------------------ player state
  const position = safeSpawn(world.spawn, bounds, colliders);
  let yaw = world.spawn.heading + Math.PI, pitch = 0, eye = 1.65, crouched = false, aimHeld = false, aimToggle = false, aim = 0;
  let pump = -1, reloading = false, shellTimer = 0;
  let kills = 0, shots = 0, fled = 0, timeLeft = MISSION.seconds, state = 'loading', spawnTimer = 4, kick = 0;
  // Trigger input: held (button, mouse or Space) keeps firing as each pump
  // finishes; a tap during the pump is kept briefly and fires when ready.
  let triggerHeld = false, queuedShot = 0;
  const keys = new Set(), stick = { x: 0, z: 0 }, lookDelta = { x: 0, y: 0 };
  const ray = new T.Raycaster();

  // ---------------------------------------------------------------- HUD
  $('mission-id').textContent = MISSION.id; $('mission-title').textContent = MISSION.title; $('brief-target').textContent = MISSION.target; $('brief-time').textContent = MISSION.seconds % 60 ? clock(MISSION.seconds) : MISSION.seconds / 60 + ' minit'; $('start-title').textContent = MISSION.id + ' · ' + MISSION.title;
  function hudAmmo() {
    $('mag').textContent = String(w.mag).padStart(2, '0'); $('reserve').textContent = '/ ' + w.reserve; $('ammo').classList.toggle('empty', w.mag === 0);
    $('ammo').dataset.weapon = w.id; $('weapon-name').textContent = w.name;
  }
  function hudCount() { $('count').textContent = `${kills} / ${MISSION.target}`; $('progress').style.width = Math.min(100, kills / MISSION.target * 100) + '%'; }
  let toastTimer = 0;
  function toast(text, seconds = 1.6) { $('toast').textContent = text; $('toast').classList.add('show'); toastTimer = seconds; }
  let hitTimer = 0;
  hudAmmo(); hudCount();

  // Minimap: a pre-drawn town at 3.75 px/m, scrolled under the player.
  const PX = 3.75, mini = $('minimap'), mctx = mini.getContext('2d');
  const G = { minX: bounds.minX - 15, minZ: bounds.minZ - 15, maxX: bounds.maxX + 15, maxZ: bounds.maxZ + 15 };
  const base = document.createElement('canvas'); base.width = (G.maxX - G.minX) * PX; base.height = (G.maxZ - G.minZ) * PX;
  { const b = base.getContext('2d'); b.fillStyle = '#cfd2c2'; b.fillRect(0, 0, base.width, base.height);
    b.fillStyle = '#dcdccd'; b.fillRect((bounds.minX - G.minX) * PX, (bounds.minZ - G.minZ) * PX, (bounds.maxX - bounds.minX) * PX, (bounds.maxZ - bounds.minZ) * PX);
    b.fillStyle = '#aeb3a8'; for (const r of ROADS) b.fillRect((r.x - r.w / 2 - G.minX) * PX, (r.z - r.d / 2 - G.minZ) * PX, r.w * PX, r.d * PX);
    b.fillStyle = '#8f9488'; for (const c of colliders) if (c.r === undefined && c.w * c.d > 4) b.fillRect((c.x - c.w / 2 - G.minX) * PX, (c.z - c.d / 2 - G.minZ) * PX, c.w * PX, c.d * PX);
    b.fillStyle = '#7f9a6c'; for (const c of colliders) if (c.kind === 'trunk') { b.beginPath(); b.arc((c.x - G.minX) * PX, (c.z - G.minZ) * PX, 5, 0, Math.PI * 2); b.fill(); } }
  function drawMap() {
    const W = mini.width; mctx.fillStyle = '#cfd2c2'; mctx.fillRect(0, 0, W, W);
    mctx.drawImage(base, -(position.x - G.minX) * PX + W / 2, -(position.z - G.minZ) * PX + W / 2);
    for (const crow of flock.crows) {
      if (!crow.alive) continue;
      const x = (crow.pos.x - position.x) * PX + W / 2, y = (crow.pos.z - position.z) * PX + W / 2;
      mctx.fillStyle = crow.state === 'perch' ? (crow.aware > .45 ? '#f0a020' : '#e0302a') : '#e0302a99';
      mctx.beginPath(); mctx.arc(x, y, crow.state === 'perch' ? 8 : 6, 0, Math.PI * 2); mctx.fill();
    }
    mctx.save(); mctx.translate(W / 2, W / 2); mctx.rotate(-yaw);
    mctx.fillStyle = '#ffd23f'; mctx.strokeStyle = '#141414'; mctx.lineWidth = 4; mctx.lineJoin = 'round';
    mctx.beginPath(); mctx.moveTo(0, -26); mctx.lineTo(18, 18); mctx.lineTo(0, 8); mctx.lineTo(-18, 18); mctx.closePath(); mctx.fill(); mctx.stroke(); mctx.restore();
  }

  // ------------------------------------------------------------ shooting
  function spread() { return T.MathUtils.lerp(w.rules.hipSpread, w.rules.aimSpread, aim) * (stick.x || stick.z || keys.size ? 1.25 : 1); }
  // A tap that can't fire yet (mid-pump) is kept until the pump finishes.
  function pullTrigger() { if (state === 'playing' && !fire()) queuedShot = (pump >= 0 ? (1 - pump) * w.cycleTime : 0) + .25; }
  function fire() {
    if (state !== 'playing' || pump >= 0 || lowered > 0 || nextWeapon) return false;
    if (w.mag <= 0) { if (!reloading) { sfx.empty(); if (w.reserve > 0) startReload(); else toast('Peluru habis! Tukar senjata'); } return false; }
    if (reloading && w.id === 'sniper') return false;
    reloading = false; w.model.setReloading(false);
    w.mag--; shots++; hudAmmo(); w.model.fire(); camera.updateMatrixWorld();
    if (w.id === 'sniper') fireSniper(); else fireShotgun();
    pump = 0;
    return true;
  }
  // A crow falls: the score, the hit marker, and its neighbours take fright.
  function downCrow(crow, dir) {
    flock.kill(crow, dir); kills++;
    for (const other of flock.crows) if (other.alive && other.pos.distanceTo(crow.pos) < 7) other.aware += .55;
  }
  function hearShot(radius, alarm) {
    for (const crow of flock.crows) if (crow.alive && Math.hypot(crow.pos.x - position.x, crow.pos.z - position.z) < radius) {
      if (crow.state === 'perch') crow.aware += alarm; else if (crow.state === 'arrive' && flock.flee(crow, camera.position)) fled++;
    }
  }
  function announce(downed) { if (downed) { sfx.hit(); hitTimer = .35; hudCount(); toast(downed > 1 ? `+${downed} gagak!` : '+1 gagak', 1); } }
  // The Barrett: one bullet straight down the scope, through up to three
  // crows in a line until it meets a wall. Loud: crows far around hear it.
  function fireSniper() {
    sfx.sniper(); kick = .09;
    const [ox, oy] = pelletOffsets(Math.random, 1, spread())[0];
    const origin = camera.position.clone(), dir = new T.Vector3(Math.tan(ox), Math.tan(oy), -1).normalize().applyQuaternion(camera.quaternion);
    ray.set(origin, dir); ray.far = SNIPER.range;
    const wall = ray.intersectObjects(solids, false)[0]?.distance ?? Infinity;
    const hits = flock.crows.filter(c => c.alive).map(c => [raySphere(origin, dir, c.pos, flock.hitRadius), c]).filter(([d]) => d < Infinity);
    const downed = bulletPath(hits, wall);
    for (const crow of downed) downCrow(crow, dir);
    hearShot(SNIPER.noiseRadius, .9);
    announce(downed.length);
    if (downed.length > 1) toast(`Satu peluru, ${downed.length} gagak!`, 1.4);
  }
  function fireShotgun() {
    sfx.shot(); kick = .035;
    const origin = camera.position.clone(), struck = new Map();
    for (const [ox, oy] of pelletOffsets(Math.random, SHOTGUN.pellets, spread())) {
      const dir = new T.Vector3(Math.tan(ox), Math.tan(oy), -1).normalize().applyQuaternion(camera.quaternion);
      let best = null, bestDist = SHOTGUN.range;
      for (const crow of flock.crows) {
        if (!crow.alive) continue;
        const d = raySphere(origin, dir, crow.pos, flock.hitRadius);
        if (d < bestDist) { best = crow; bestDist = d; }
      }
      ray.set(origin, dir); ray.far = bestDist;
      if (ray.intersectObjects(solids, false).length) continue;
      if (best) { const s = struck.get(best) || { hits: 0, dist: bestDist, dir }; s.hits++; struck.set(best, s); }
    }
    let downed = 0;
    for (const [crow, { hits, dist, dir }] of struck) {
      if (pelletsKill(dist, hits)) { downCrow(crow, dir); downed++; }
      else if (flock.flee(crow, camera.position)) { fled++; toast('Kena sipi — gagak terlepas!'); }
    }
    // The suppressor keeps the shot quiet: only crows close by hear it.
    hearShot(SHOTGUN.noiseRadius, .8);
    announce(downed);
    setTimeout(() => sfx.pump(), 120);
  }
  // Shotgun: one shell at a time. Barrett: a whole magazine in one go.
  function startReload() {
    if (state !== 'playing' || reloading || nextWeapon || w.mag >= w.rules.magazine || w.reserve <= 0) return;
    reloading = true; shellTimer = w.id === 'sniper' ? SNIPER.reloadTime : SHOTGUN.shellTime; w.model.setReloading(true);
    if (w.id === 'sniper') sfx.magOut();
  }
  function switchWeapon(to = weapons[(weapons.indexOf(w) + 1) % weapons.length]) {
    if (state !== 'playing' || to === w || nextWeapon) return;
    reloading = false; w.model.setReloading(false); queuedShot = 0; nextWeapon = to; sfx.shell();
  }
  function toggleCrouch() { crouched = !crouched; $('crouch').classList.toggle('on', crouched); }
  function toggleAim() { aimToggle = !aimToggle; $('aim').classList.toggle('on', aimToggle); }

  // ------------------------------------------------------------- controls
  const resize = () => { world.resize(); for (const x of weapons) x.model.resize(canvas.clientWidth / canvas.clientHeight); };
  window.addEventListener('resize', resize); resize();
  const MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', e => {
    if (MOVE.includes(e.code)) { e.preventDefault(); keys.add(e.code); }
    if (e.repeat) return;
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyC' || e.code === 'ControlLeft') toggleCrouch();
    if (e.code === 'Space') { e.preventDefault(); triggerHeld = true; pullTrigger(); }
    if (e.code === 'KeyP') setPaused(state === 'playing');
    if (e.code === 'KeyQ') switchWeapon();
    if (e.code === 'Digit1') switchWeapon(weapons[0]);
    if (e.code === 'Digit2') switchWeapon(weapons[1]);
  });
  window.addEventListener('keyup', e => { keys.delete(e.code); if (e.code === 'Space') triggerHeld = false; });
  window.addEventListener('blur', () => { keys.clear(); stick.x = stick.z = 0; aimHeld = false; triggerHeld = false; });
  const fine = matchMedia('(pointer:fine)').matches;
  // Only a real mouse captures the pointer. Phones also send emulated mouse
  // events for taps; using those would ask to hide a cursor and eat the shot.
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || state !== 'playing') return;
    if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.()?.catch?.(() => { }); return; }
    if (e.button === 0) { triggerHeld = true; pullTrigger(); } if (e.button === 2) aimHeld = true;
  });
  window.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') return; if (e.button === 0) triggerHeld = false; if (e.button === 2) aimHeld = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('wheel', e => { if (document.pointerLockElement === canvas) switchWeapon(); }, { passive: true });
  // Turning slows with the zoom, so the scope stays steady.
  const look = (dx, dy, k) => { const s = k * Math.max(.12, camera.fov / 70); yaw -= dx * s; pitch = Math.max(-1.45, Math.min(1.45, pitch - dy * s)); lookDelta.x += dx; lookDelta.y += dy; };
  // Some browsers report one huge jump right after the pointer locks; skip it.
  document.addEventListener('mousemove', e => { if (document.pointerLockElement === canvas && state === 'playing' && Math.abs(e.movementX) + Math.abs(e.movementY) < 300) look(e.movementX, e.movementY, .0022); });
  document.addEventListener('pointerlockchange', () => { triggerHeld = false; if (fine && document.pointerLockElement !== canvas && state === 'playing') setPaused(true); });
  let swipe = null;
  canvas.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); } });
  canvas.addEventListener('pointermove', e => { if (swipe?.id !== e.pointerId || state !== 'playing') return; look(e.clientX - swipe.x, e.clientY - swipe.y, .0055); swipe.x = e.clientX; swipe.y = e.clientY; });
  const endSwipe = () => { swipe = null; }; canvas.addEventListener('pointerup', endSwipe); canvas.addEventListener('pointercancel', endSwipe);
  const joy = $('joystick'), knob = $('knob'); let joyId = null;
  function updateStick(e) { const r = joy.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dz = e.clientY - r.top - r.height / 2, len = Math.max(44, Math.hypot(dx, dz)); stick.x = dx / len; stick.z = dz / len; knob.style.transform = `translate(${stick.x * 36}px,${stick.z * 36}px)`; }
  joy.onpointerdown = e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); updateStick(e); };
  joy.onpointermove = e => { if (e.pointerId === joyId) updateStick(e); };
  const stopStick = () => { joyId = null; stick.x = stick.z = 0; knob.style.transform = ''; }; joy.onpointerup = stopStick; joy.onpointercancel = stopStick;
  // The fire button also looks: drag from it to adjust aim while shooting.
  let fireDrag = null;
  $('fire').addEventListener('pointerdown', e => { e.preventDefault(); $('fire').setPointerCapture(e.pointerId); fireDrag = { id: e.pointerId, x: e.clientX, y: e.clientY }; $('fire').classList.add('down'); triggerHeld = true; pullTrigger(); });
  $('fire').addEventListener('pointermove', e => { if (fireDrag?.id !== e.pointerId || state !== 'playing') return; look(e.clientX - fireDrag.x, e.clientY - fireDrag.y, .0045); fireDrag.x = e.clientX; fireDrag.y = e.clientY; });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) $('fire').addEventListener(ev, () => { fireDrag = null; triggerHeld = false; $('fire').classList.remove('down'); });
  $('aim').addEventListener('pointerdown', e => { e.preventDefault(); toggleAim(); });
  $('reload').addEventListener('pointerdown', e => { e.preventDefault(); startReload(); });
  $('crouch').addEventListener('pointerdown', e => { e.preventDefault(); toggleCrouch(); });
  $('swap').addEventListener('pointerdown', e => { e.preventDefault(); switchWeapon(); });

  function setPaused(on) {
    if (on && state === 'playing') { state = 'paused'; $('paused').hidden = false; keys.clear(); triggerHeld = false; if (document.pointerLockElement) document.exitPointerLock(); }
    else if (!on && state === 'paused') { state = 'playing'; $('paused').hidden = true; last = performance.now(); if (fine) canvas.requestPointerLock?.()?.catch?.(() => { }); }
  }
  $('pause').onclick = () => setPaused(state === 'playing');
  $('resume').onclick = () => setPaused(false);
  $('restart').onclick = $('again').onclick = () => location.reload();
  // The town already has crows when the mission starts: groups on roofs and wires.
  for (let i = 0; i < 40 && flock.crows.length < 16; i++) flock.spawnGroup(2 + Math.floor(Math.random() * 4), true);
  $('go').onclick = () => { startAudio(); $('start').hidden = true; state = 'playing'; last = performance.now(); if (fine) canvas.requestPointerLock?.()?.catch?.(() => { }); toast('Cari gagak · sorok dan tembak', 2.5); };
  $('swap').dataset.next = 'sniper';
  $('loading').hidden = true; $('brief').hidden = false;

  function finish(result) {
    state = 'over'; if (document.pointerLockElement) document.exitPointerLock();
    const titles = { won: 'MISI BERJAYA', time: 'MASA TAMAT', ammo: 'PELURU HABIS' };
    const texts = { won: 'Pusat bandar bersih daripada gagak. Syabas!', time: 'Gagak masih banyak. Cuba sorok lebih rapat dan bidik dahulu.', ammo: 'Semua peluru telah digunakan. Bidik sebelum menembak.' };
    $('end-title').textContent = titles[result]; $('end-text').textContent = texts[result]; $('end-kicker').textContent = MISSION.id + ' · ' + MISSION.title;
    $('s-kills').textContent = kills; $('s-acc').textContent = shots ? Math.round(kills / shots * 100) + '%' : '–'; $('s-fled').textContent = fled; $('s-time').textContent = clock(MISSION.seconds - timeLeft);
    $('end').hidden = false; result === 'won' ? sfx.win() : sfx.lose();
  }

  // Test hooks for automated browser checks: read state and aim at a crow.
  globalThis.crowGame = {
    ready: true, get state() { return state; }, get kills() { return kills; }, get ammo() { return [w.mag, w.reserve]; }, get weapon() { return w.id; }, swap: () => switchWeapon(), get perches() { return perches.length; },
    get crows() { return flock.crows.map(c => ({ state: c.state, aware: c.aware, x: c.pos.x, y: c.pos.y, z: c.pos.z })); },
    aimAt(i) { const c = flock.crows[i]; const d = c.pos.clone().sub(camera.position); yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); },
    moveTo(x, z) { position.x = x; position.z = z; },
    // Fast-forward the flock (crouched, hidden player) without rendering.
    step(seconds) { for (let t = 0; t < seconds; t += .05) { if (flock.crows.filter(c => c.alive).length < 18) flock.spawnGroup(3); flock.update(.05, t, { position: { x: position.x, y: 1, z: position.z }, crouched: true, covered: true, moving: false }); } },
    fire: () => fire(), setCrouch(on) { if (crouched !== on) toggleCrouch(); }, setAim(on) { if (aimToggle !== on) toggleAim(); }
  };

  // ---------------------------------------------------------------- frame
  let last = performance.now();
  const chGap = { l: $('ch-l'), r: $('ch-r'), t: $('ch-t'), b: $('ch-b') };
  function frame(at) {
    const dt = Math.max(0, Math.min(.05, (at - last) / 1000)); last = at;
    const playing = state === 'playing';
    let dx = stick.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let dz = stick.z + Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const length = Math.max(1, Math.hypot(dx, dz)); dx /= length; dz /= length;
    const moving = playing && Math.hypot(dx, dz) > .1;
    aim = T.MathUtils.damp(aim, playing && (aimHeld || aimToggle) && !reloading && !nextWeapon ? 1 : 0, w.id === 'sniper' ? 9 : 12, dt);
    // Switching: lower the gun in hand, swap, raise the other one.
    if (nextWeapon) { lowered = Math.min(1, lowered + dt / .22); if (lowered >= 1) { w = nextWeapon; nextWeapon = null; pump = -1; hudAmmo(); $('swap').dataset.next = weapons[(weapons.indexOf(w) + 1) % weapons.length].id; } }
    else lowered = Math.max(0, lowered - dt / .3);
    if (playing) {
      const speed = (crouched ? 1.9 : 4.2) * (1 - aim * .4);
      movePlayer(position, (dx * Math.cos(yaw) + dz * Math.sin(yaw)) * dt * speed, (-dx * Math.sin(yaw) + dz * Math.cos(yaw)) * dt * speed, bounds, colliders);
      timeLeft -= dt;
      // Pump or recoil, then reload: shells one by one, or a whole magazine.
      if (pump >= 0) { pump += dt / w.cycleTime; if (pump >= 1) pump = -1; }
      if (reloading && pump < 0) {
        shellTimer -= dt;
        if (shellTimer <= 0 && w.id === 'sniper') {
          const take = Math.min(SNIPER.magazine - w.mag, w.reserve); w.mag += take; w.reserve -= take; hudAmmo(); sfx.magIn();
          reloading = false; w.model.setReloading(false);
        } else if (shellTimer <= 0) {
          if (w.mag < SHOTGUN.magazine && w.reserve > 0) { w.mag++; w.reserve--; hudAmmo(); sfx.shell(); w.model.loadShell(); shellTimer = SHOTGUN.shellTime; }
          if (w.mag >= SHOTGUN.magazine || w.reserve <= 0) { reloading = false; w.model.setReloading(false); }
        }
      }
      queuedShot = Math.max(0, queuedShot - dt);
      if ((triggerHeld || queuedShot > 0) && pump < 0 && fire()) queuedShot = 0;
      // Keep the town busy: groups fly in to replace crows shot or scared off.
      const around = flock.crows.filter(c => c.alive && c.state !== 'flee').length, want = Math.min(28, 18 + Math.floor(kills / 5));
      spawnTimer -= dt;
      if (around < want && spawnTimer <= 0) { flock.spawnGroup(Math.min(want - around, 2 + Math.floor(Math.random() * 3))); spawnTimer = 2 + Math.random() * 3; }
    }
    eye = T.MathUtils.damp(eye, crouched ? 1.05 : 1.65, 10, dt);
    kick = T.MathUtils.damp(kick, 0, 8, dt);
    const ground = world.groundHeight(position.x, position.z);
    camera.position.set(position.x, ground + eye, position.z); camera.rotation.set(pitch + kick, yaw, 0);
    // The Barrett's scope zooms far in; the shotgun only narrows a little.
    const scoped = w.id === 'sniper' && aim > .85;
    camera.fov = w.id === 'sniper' ? T.MathUtils.lerp(70, SNIPER.zoomFov, Math.max(0, aim - .6) / .4) : 70 - aim * 22; camera.updateProjectionMatrix();
    const covered = coverNear(position.x, position.z, colliders);
    if (playing) {
      const events = flock.update(dt, at / 1000, { position: { x: position.x, y: ground + eye, z: position.z }, crouched, covered, moving });
      for (const ev of events) {
        const d = ev.crow.pos.clone().sub(camera.position), dist = d.length(), right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const pan = d.normalize().dot(right), volume = Math.max(0, 1 - dist / 70);
        if (ev.type === 'spotted') {
          fled++; sfx.caw(volume * .6, pan, 3); sfx.flap(volume * .4, pan); toast('Gagak nampak anda!');
          for (const other of flock.crows) if (other !== ev.crow && other.alive && other.state === 'perch' && other.pos.distanceTo(ev.crow.pos) < 10) other.aware += .6;
        }
        if (ev.type === 'caw') sfx.caw(volume * .3, pan, 1 + Math.floor(Math.random() * 2));
      }
      const result = missionState({ kills, timeLeft, shells: weapons.reduce((n, x) => n + x.mag + x.reserve, 0) + (pump >= 0 ? 1 : 0) });
      if (result !== 'playing') finish(result);
    } else flock.update(0, at / 1000, { position: { x: 1e5, y: 0, z: 1e5 } });

    // HUD: clock, stealth pill, crosshair spread, toasts, minimap.
    $('clock').textContent = clock(timeLeft); $('timer').classList.toggle('low', timeLeft < 30);
    const watched = flock.crows.some(c => c.alive && c.state === 'perch' && c.aware > .45);
    const label = watched ? 'GAGAK CURIGA' : stealthLabel(crouched, covered), pill = $('stealth');
    if (pill.dataset.label !== label) { pill.dataset.label = label; pill.className = 'hud card ' + (watched ? 'CURIGA' : label); $('stealth-text').textContent = label; }
    $('fire').classList.toggle('busy', pump >= 0 || reloading || !!nextWeapon);
    $('scope').hidden = !scoped; $('crosshair').hidden = scoped || (w.id === 'sniper' && aim > .5);
    const gap = Math.tan(spread()) / Math.tan(camera.fov * Math.PI / 360) * canvas.clientHeight / 2;
    const g = Math.max(7, gap), len = 13;
    chGap.l.style.cssText = `width:${len}px;height:2px;left:${-g - len}px;top:-1px`; chGap.r.style.cssText = `width:${len}px;height:2px;left:${g}px;top:-1px`;
    chGap.t.style.cssText = `width:2px;height:${len}px;top:${-g - len}px;left:-1px`; chGap.b.style.cssText = `width:2px;height:${len}px;top:${g}px;left:-1px`;
    toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show');
    hitTimer -= dt; $('hitmark').style.opacity = hitTimer > 0 ? 1 : 0;
    drawMap();

    world.wind.value = at / 1000; world.updateGrass(at / 1000, position, camera.position);
    w.model.update(dt, { moving, aim, pumpProgress: pump, lookDelta, lowered, reloadProgress: w.id === 'sniper' && reloading ? 1 - shellTimer / SNIPER.reloadTime : 0 }); lookDelta.x = lookDelta.y = 0;
    renderer.clear(); renderer.render(scene, camera);
    if (!scoped) { renderer.clearDepth(); renderer.render(w.model.scene, w.model.camera); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (error) {
  $('loading').textContent = 'Gagal memuatkan: ' + error.message; console.error(error);
}
