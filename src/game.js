import * as T from 'three';
import { safeSpawn, movePlayer, canStand } from './walk.js?v=0.1.0';
import { MAPS } from './maps.js?v=0.9.0';
import { VERSION, missionScore, makesTopTen, DIFFICULTY, crowsWanted, MOVE, moveSpeed, SHOTGUN, SNIPER, bulletPath, bearing, crowCallout, MISSION, pelletOffsets, raySphere, pelletsKill, coverNear, stealthLabel, missionState, clock } from './hunt-rules.js?v=0.9.0';
import { startAudio, setVolume, sfx } from './sfx.js?v=0.9.0';
import { topTen, submitScore } from './leaderboard.js?v=0.9.0';
const $ = id => document.getElementById(id), canvas = $('world');

// ------------------------------------------------------------ title & options
// Settings live on this device: volume (0…1) and difficulty.
const SETTINGS_KEY = 'crow-zero-settings-v1';
const settings = { volume: .8, difficulty: 'biasa', map: '01' };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch { }
if (!DIFFICULTY[settings.difficulty]) settings.difficulty = 'biasa';
const saveSettings = () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { } };
setVolume(settings.volume);
$('version').textContent = 'v' + VERSION;
// Maps: the built-in ones, plus the player's own from the editor if saved.
// The world is built once per page, so picking another map reloads.
const decode = text => { try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)))); } catch { return null; } };
const built = plan => plan?.units?.some(u => u.kind !== 'spawn');
let savedDraft; try { savedDraft = JSON.parse(localStorage.getItem('crow-zero-draft-v1') || 'null')?.plan; } catch { }
const linked = location.hash.match(/[#&]plan=([A-Za-z0-9_-]+)/);
const mapId = linked && built(decode(linked[1])) ? 'editor' : MAPS[settings.map] || (settings.map === 'saya' && built(savedDraft)) ? settings.map : '01';
const mapTitle = MAPS[mapId]?.title || (mapId === 'saya' ? 'Peta saya' : 'Peta dari editor');
const mapLabel = mapId === 'editor' || mapId === 'saya' ? 'PETA SAYA' : 'PETA ' + mapId;
const mapButtons = $('maps');
for (const [id, map] of [...Object.entries(MAPS), ...(built(savedDraft) ? [['saya', { name: 'PETA SAYA' }]] : [])]) {
  const b = document.createElement('button'); b.type = 'button'; b.innerHTML = id === 'saya' ? '<b>PETA SAYA</b><small>dari editor</small>' : `<b>PETA ${id}</b><small>${map.name}</small>`;
  b.classList.toggle('on', id === mapId || (id === 'saya' && mapId === 'editor'));
  b.onclick = () => { if (b.classList.contains('on')) return; settings.map = id; saveSettings(); history.replaceState(null, '', location.pathname); location.reload(); };
  mapButtons.append(b);
}
$('start-kicker').textContent = mapLabel; $('start-title').textContent = mapTitle; if (MAPS[mapId]) $('brief-where').textContent = MAPS[mapId].brief;
const levelButtons = $('levels');
for (const [id, level] of Object.entries(DIFFICULTY)) {
  const b = document.createElement('button'); b.dataset.level = id; b.innerHTML = `<b>${level.label}</b><small>${level.note}</small>`;
  b.onclick = () => { if (b.disabled) return; settings.difficulty = id; saveSettings(); showSettings(); };
  levelButtons.append(b);
}
function showSettings() {
  $('volume').value = Math.round(settings.volume * 100); $('volume-value').textContent = Math.round(settings.volume * 100) + '%';
  for (const b of levelButtons.children) b.classList.toggle('on', b.dataset.level === settings.difficulty);
  const level = DIFFICULTY[settings.difficulty];
  $('title-level').textContent = level.label; $('brief-time').textContent = level.seconds / 60 + ' minit'; $('clock').textContent = clock(level.seconds);
}
showSettings();
$('volume').oninput = () => { settings.volume = $('volume').value / 100; setVolume(settings.volume); saveSettings(); showSettings(); };
$('volume-test').onclick = () => { startAudio(); setVolume(settings.volume); sfx.shot(); sfx.ping(); };
$('options-open').onclick = () => { $('options').hidden = false; };
// High scores: the shared top 10 (needs a connection).
const esc = text => String(text).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
function showBoard(list, rows, mine = -1) {
  list.innerHTML = rows.map((row, i) => `<li class="${i === mine ? 'me' : ''}"><span>${esc(row.name)}</span><span class="lv">${esc(DIFFICULTY[row.difficulty]?.label || row.difficulty)}</span><b>${row.score}</b></li>`).join('');
}
$('scores-open').onclick = async () => {
  $('scores').hidden = false; $('board').innerHTML = ''; $('board-msg').textContent = 'Memuatkan…';
  try { const rows = await topTen(); showBoard($('board'), rows); $('board-msg').textContent = rows.length ? '' : 'Belum ada skor. Jadilah yang pertama!'; }
  catch { $('board-msg').textContent = 'Papan skor perlukan sambungan internet.'; }
};
$('scores-close').onclick = () => { $('scores').hidden = true; };
$('options-close').onclick = () => { $('options').hidden = true; };
// Install: Chrome/Android offer a prompt (caught early in index.html); iOS
// Safari installs from the Share menu, so it gets a hint instead.
const standalone = matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches || navigator.standalone;
const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const showInstall = () => { $('install').hidden = standalone || !(globalThis.installPrompt || ios); };
addEventListener('installprompt-ready', showInstall); showInstall();
$('install').onclick = async () => {
  const prompt = globalThis.installPrompt;
  if (prompt) { prompt.prompt(); await prompt.userChoice.catch(() => { }); globalThis.installPrompt = null; showInstall(); }
  else $('install-hint').hidden = false;
};
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(error => console.warn('Offline cache unavailable', error));
const encode = plan => btoa(Array.from(new TextEncoder().encode(JSON.stringify(plan)), c => String.fromCharCode(c)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

try {
  // The chosen map goes into the hash: town-layout.js reads it when it loads,
  // so it is imported after. The editor's own link is played as it is.
  if (mapId !== 'editor') history.replaceState(null, '', '#plan=' + encode(mapId === 'saya' ? savedDraft : MAPS[mapId].plan));
  const { planFromHash, ROADS } = await import('./town-layout.js?v=0.1.0');
  if (!planFromHash(location.hash)) throw Error('Peta tidak sah. Betulkan masalah layout di editor.');
  const { makeWorld } = await import('./world.js?v=0.9.0');
  const { toon } = await import('./illustration.js?v=0.1.0');
  const { findPerches, createFlock } = await import('./crows.js?v=0.9.0');
  const { createShotgun } = await import('./shotgun.js?v=0.4.0');
  const { createSniper } = await import('./sniper.js?v=0.4.0');
  const world = await makeWorld(canvas), { camera, renderer, scene, bounds, colliders } = world;
  camera.rotation.order = 'YXZ'; camera.fov = 70; camera.near = .05; camera.updateProjectionMatrix();
  renderer.autoClear = false;

  // Everything a pellet or a falling crow can strike: the batched town.
  const solids = [];
  scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.castShadow && o.material?.type !== 'ShaderMaterial') solids.push(o); });
  const perches = findPerches({ colliders, solids, bounds, groundHeight: world.groundHeight, canStand, rand: Math.random, wires: world.wires, hotspots: world.hotspots });
  const flock = createFlock({ scene, toon, perches, bounds, solids, groundHeight: world.groundHeight });
  let level = DIFFICULTY[settings.difficulty];
  // Two weapons, each with its own model, rules and ammunition. `cycle` is
  // the pump (shotgun) or the recoil recovery (Barrett) between shots.
  const weapons = [
    { id: 'shotgun', name: 'SENAPANG PATAH', rules: SHOTGUN, model: createShotgun(toon), mag: SHOTGUN.magazine, reserve: SHOTGUN.reserve, cycleTime: SHOTGUN.pumpTime },
    { id: 'sniper', name: 'BARRETT M82', rules: SNIPER, model: createSniper(toon), mag: SNIPER.magazine, reserve: SNIPER.reserve, cycleTime: SNIPER.fireDelay }
  ];
  let w = weapons[0], nextWeapon = null, lowered = 0;

  // ------------------------------------------------------------ player state
  const position = safeSpawn(world.spawn, bounds, colliders);
  // A random open spot, clear of walls by a couple of metres, away from the map edge.
  function randomStart() {
    for (let i = 0; i < 400; i++) {
      const x = bounds.minX + 8 + Math.random() * (bounds.maxX - bounds.minX - 16), z = bounds.minZ + 8 + Math.random() * (bounds.maxZ - bounds.minZ - 16);
      if (canStand(x, z, bounds, colliders) && !coverNear(x, z, colliders, 2)) return { x, z };
    }
    return safeSpawn(world.spawn, bounds, colliders);
  }
  let yaw = world.spawn.heading + Math.PI, pitch = 0, eye = 1.65, crouched = false, aimHeld = false, aimToggle = false, aim = 0;
  let pump = -1, reloading = false, shellTimer = 0;
  let held = 0, runFov = 0; const heldDir = { x: 0, z: 0 };
  let kills = 0, shots = 0, fled = 0, timeLeft = DIFFICULTY[settings.difficulty].seconds, state = 'loading', spawnTimer = 4, kick = 0;
  // Trigger input: held (button, mouse or Space) keeps firing as each pump
  // finishes; a tap during the pump is kept briefly and fires when ready.
  let triggerHeld = false, queuedShot = 0;
  const keys = new Set(), stick = { x: 0, z: 0 }, lookDelta = { x: 0, y: 0 };
  const ray = new T.Raycaster();

  // ---------------------------------------------------------------- HUD
  $('mission-id').textContent = MISSION.id; $('mission-title').textContent = mapTitle; $('brief-target').textContent = MISSION.target;
  function hudAmmo() {
    $('mag').textContent = String(w.mag).padStart(2, '0'); $('reserve').textContent = '/ ' + w.reserve; $('ammo').classList.toggle('empty', w.mag === 0);
    $('ammo').dataset.weapon = w.id; $('weapon-name').textContent = w.name;
  }
  function hudCount() { $('count').textContent = `${kills} / ${MISSION.target}`; $('progress').style.width = Math.min(100, kills / MISSION.target * 100) + '%'; }
  let toastTimer = 0;
  function toast(text, seconds = 1.6) { $('toast').textContent = text; $('toast').classList.add('show'); toastTimer = seconds; }
  let hitTimer = 0;
  // Spotter callouts: where the crows are, relative to where you face, with a
  // ping. Urgent ones (behind you, about to fly, very close) flash red.
  let alertTimer = 0, calloutTimer = 3;
  function alert(text, angle, urgent = false) {
    const el = $('alert'); $('alert-text').textContent = text; $('alert-arrow').style.transform = `rotate(${angle}rad)`;
    el.classList.toggle('urgent', urgent); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    alertTimer = urgent ? 3 : 2.6; sfx.ping(urgent);
  }
  const huntable = () => flock.crows.filter(c => c.alive && c.state !== 'flee' && c.state !== 'dead');
  const me = () => ({ x: position.x, z: position.z, yaw });
  function callout() {
    const call = crowCallout(me(), huntable().map(c => c.pos));
    if (call) alert(call.text, call.angle, call.side === 'belakang' || call.nearest < 12);
    else alert('TIADA GAGAK DEKAT — CARI DI BUMBUNG', 0);
  }
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
  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  window.addEventListener('keydown', e => {
    if (e.target.closest?.('input')) return; // typing a name, not playing
    if (MOVE_KEYS.includes(e.code)) { e.preventDefault(); keys.add(e.code); }
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
  // Two fire buttons, one for each thumb. Each also looks: drag from it to
  // adjust aim while shooting. The trigger is held while either is down.
  const firing = new Set();
  for (const button of [$('fire'), $('fire-left')]) {
    let drag = null;
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; button.classList.add('down'); firing.add(button); triggerHeld = true; pullTrigger(); });
    button.addEventListener('pointermove', e => { if (drag?.id !== e.pointerId || state !== 'playing') return; look(e.clientX - drag.x, e.clientY - drag.y, .0045); drag.x = e.clientX; drag.y = e.clientY; });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(ev, () => { drag = null; button.classList.remove('down'); firing.delete(button); triggerHeld = firing.size > 0; });
  }
  $('aim').addEventListener('pointerdown', e => { e.preventDefault(); toggleAim(); });
  $('reload').addEventListener('pointerdown', e => { e.preventDefault(); startReload(); });
  $('crouch').addEventListener('pointerdown', e => { e.preventDefault(); toggleCrouch(); });
  $('swap').addEventListener('pointerdown', e => { e.preventDefault(); switchWeapon(); });

  const lockLevels = on => { for (const b of levelButtons.children) b.disabled = on; $('level-note').hidden = !on; };
  function setPaused(on) {
    if (on && state === 'playing') { state = 'paused'; lockLevels(true); $('paused').hidden = false; keys.clear(); triggerHeld = false; if (document.pointerLockElement) document.exitPointerLock(); }
    else if (!on && state === 'paused') { state = 'playing'; $('paused').hidden = true; $('options').hidden = true; last = performance.now(); if (fine) canvas.requestPointerLock?.()?.catch?.(() => { }); }
  }
  $('pause').onclick = () => setPaused(state === 'playing');
  $('resume').onclick = () => setPaused(false);
  $('restart').onclick = $('again').onclick = () => location.reload();
  const groupSize = () => level.group[0] + Math.floor(Math.random() * (level.group[1] - level.group[0] + 1));
  $('go').onclick = () => {
    startAudio(); setVolume(settings.volume);
    // The difficulty sets the crows: how many sit in town at the start, and how long each stays.
    level = DIFFICULTY[settings.difficulty]; flock.settings.stay = level.stay; timeLeft = level.seconds;
    // Every mission starts somewhere new on the map, facing a random way.
    Object.assign(position, randomStart()); yaw = Math.random() * Math.PI * 2; pitch = 0;
    for (let i = 0; i < 60 && flock.crows.length < level.start; i++) flock.spawnGroup(Math.min(groupSize(), level.start - flock.crows.length), true);
    $('title').hidden = true; $('options').hidden = true; state = 'playing'; last = performance.now();
    // Phones: full screen, locked sideways, where the browser allows it.
    if (!fine && !standalone) document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).then(() => screen.orientation?.lock?.('landscape')).catch(() => { });
    if (fine) canvas.requestPointerLock?.()?.catch?.(() => { });
    toast(`${level.label} · cari gagak, sorok dan tembak`, 2.5);
  };
  $('pause-options').onclick = () => { $('options').hidden = false; };
  $('swap').dataset.next = 'sniper';
  $('loading').hidden = true; $('go').disabled = false;

  function finish(result) {
    state = 'over'; if (document.pointerLockElement) document.exitPointerLock();
    const titles = { won: 'MISI BERJAYA', time: 'MASA TAMAT', ammo: 'PELURU HABIS' };
    const texts = { won: 'Pusat bandar bersih daripada gagak. Syabas!', time: 'Gagak masih banyak. Cuba sorok lebih rapat dan bidik dahulu.', ammo: 'Semua peluru telah digunakan. Bidik sebelum menembak.' };
    $('end-title').textContent = titles[result]; $('end-text').textContent = texts[result]; $('end-kicker').textContent = mapLabel + ' · ' + mapTitle;
    $('s-kills').textContent = kills; $('s-acc').textContent = shots ? Math.round(kills / shots * 100) + '%' : '–'; $('s-fled').textContent = fled; $('s-time').textContent = clock(level.seconds - timeLeft);
    $('end').hidden = false; result === 'won' ? sfx.win() : sfx.lose();
    const { score, accuracy } = missionScore({ kills, shots, timeLeft, won: result === 'won', difficulty: settings.difficulty });
    $('s-score').textContent = score;
    const entry = { score, kills, accuracy, difficulty: settings.difficulty, seconds: level.seconds - timeLeft };
    $('end-board').innerHTML = ''; $('end-board-msg').textContent = 'Menyemak papan skor…';
    topTen().then(rows => {
      if (makesTopTen(score, rows)) {
        // Only a top-10 score asks for a name.
        $('entry').hidden = false; $('end-board-msg').textContent = ''; showBoard($('end-board'), rows);
        $('player-name').value = settings.name || ''; $('player-name').focus();
        $('entry').onsubmit = async event => {
          event.preventDefault();
          const name = $('player-name').value.trim(); if (!name) return;
          settings.name = name; saveSettings(); $('submit-score').disabled = true;
          try {
            const rank = await submitScore({ ...entry, name });
            $('entry').hidden = true; showBoard($('end-board'), await topTen(), rank - 1);
            $('end-board-msg').textContent = `Anda nombor ${rank}!`;
          } catch (error) { $('end-board-msg').textContent = error.message; $('submit-score').disabled = false; }
        };
      } else { showBoard($('end-board'), rows); $('end-board-msg').textContent = rows.length ? 'Belum masuk 10 teratas — cuba lagi!' : ''; }
    }).catch(() => { $('end-board-msg').textContent = 'Tiada internet: skor tidak dapat disemak.'; });
  }

  // Test hooks for automated browser checks: read state and aim at a crow.
  globalThis.crowGame = {
    ready: true, get state() { return state; }, get kills() { return kills; }, get ammo() { return [w.mag, w.reserve]; }, get weapon() { return w.id; }, swap: () => switchWeapon(), get perches() { return perches.length; },
    finish: result => finish(result), setKills(n) { kills = n; shots = n; }, get position() { return { ...position, yaw }; },
    get crows() { return flock.crows.map(c => ({ state: c.state, aware: c.aware, x: c.pos.x, y: c.pos.y, z: c.pos.z })); },
    aimAt(i) { const c = flock.crows[i]; const d = c.pos.clone().sub(camera.position); yaw = Math.atan2(-d.x, -d.z); pitch = Math.atan2(d.y, Math.hypot(d.x, d.z)); },
    moveTo(x, z) { position.x = x; position.z = z; },
    // Fast-forward the flock (crouched, hidden player) without rendering.
    step(seconds) { for (let t = 0; t < seconds; t += .05) { if (flock.crows.filter(c => c.alive).length < 10) flock.spawnGroup(2); flock.update(.05, t, { position: { x: position.x, y: 1, z: position.z }, crouched: true, covered: true, moving: false }); } },
    fire: () => fire(), callout: () => callout(), setCrouch(on) { if (crouched !== on) toggleCrouch(); }, setAim(on) { if (aimToggle !== on) toggleAim(); }
  };

  // ---------------------------------------------------------------- frame
  let last = performance.now();
  const edgeArrows = [...$('edges').children];
  const chGap = { l: $('ch-l'), r: $('ch-r'), t: $('ch-t'), b: $('ch-b') };
  function frame(at) {
    const dt = Math.max(0, Math.min(.05, (at - last) / 1000)); last = at;
    const playing = state === 'playing';
    let dx = stick.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let dz = stick.z + Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const length = Math.max(1, Math.hypot(dx, dz)); dx /= length; dz /= length;
    const moving = playing && Math.hypot(dx, dz) > .1;
    // Holding one direction for 2 s (or Shift) breaks into a run.
    if (moving && (held === 0 || dx * heldDir.x + dz * heldDir.z > .5)) held += dt; else held = 0;
    if (moving) { heldDir.x = dx; heldDir.z = dz; }
    const running = moving && !crouched && aim < .3 && (held >= MOVE.runAfter || keys.has('ShiftLeft') || keys.has('ShiftRight'));
    aim = T.MathUtils.damp(aim, playing && (aimHeld || aimToggle) && !reloading && !nextWeapon ? 1 : 0, w.id === 'sniper' ? 9 : 12, dt);
    // Switching: lower the gun in hand, swap, raise the other one.
    if (nextWeapon) { lowered = Math.min(1, lowered + dt / .22); if (lowered >= 1) { w = nextWeapon; nextWeapon = null; pump = -1; hudAmmo(); $('swap').dataset.next = weapons[(weapons.indexOf(w) + 1) % weapons.length].id; } }
    else lowered = Math.max(0, lowered - dt / .3);
    if (playing) {
      const speed = running ? MOVE.run : moveSpeed({ crouched, aim });
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
      // Scarce crows: a few at a time fly in to replace the ones shot or gone.
      const around = flock.crows.filter(c => c.alive && c.state !== 'flee').length, want = crowsWanted(level, kills);
      spawnTimer -= dt;
      if (around < want && spawnTimer <= 0) { flock.spawnGroup(Math.min(want - around, groupSize())); spawnTimer = 3.5 + Math.random() * 3; }
      calloutTimer -= dt; if (calloutTimer <= 0) { callout(); calloutTimer = 5 + Math.random() * 2; }
    }
    eye = T.MathUtils.damp(eye, crouched ? 1.05 : 1.65, 10, dt);
    kick = T.MathUtils.damp(kick, 0, 8, dt);
    runFov = T.MathUtils.damp(runFov, running ? 7 : 0, 6, dt);
    const ground = world.groundHeight(position.x, position.z);
    camera.position.set(position.x, ground + eye, position.z); camera.rotation.set(pitch + kick, yaw, 0);
    // The Barrett's scope zooms far in; the shotgun only narrows a little.
    const scoped = w.id === 'sniper' && aim > .85;
    camera.fov = (w.id === 'sniper' ? T.MathUtils.lerp(70, SNIPER.zoomFov, Math.max(0, aim - .6) / .4) : 70 - aim * 22) + runFov; camera.updateProjectionMatrix();
    const covered = coverNear(position.x, position.z, colliders);
    if (playing) {
      const events = flock.update(dt, at / 1000, { position: { x: position.x, y: ground + eye, z: position.z }, crouched, covered, moving, running, scoped });
      for (const ev of events) {
        const d = ev.crow.pos.clone().sub(camera.position), dist = d.length(), right = new T.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
        const pan = d.normalize().dot(right), volume = Math.max(0, 1 - dist / 70);
        if (ev.type === 'spotted') {
          fled++; sfx.caw(volume * .6, pan, 3); sfx.flap(volume * .4, pan); toast('Gagak nampak anda!');
          for (const other of flock.crows) if (other !== ev.crow && other.alive && other.state === 'perch' && other.pos.distanceTo(ev.crow.pos) < 10) other.aware += .6;
        }
        if (ev.type === 'caw') sfx.caw(volume * .3, pan, 1 + Math.floor(Math.random() * 2));
        const b = bearing(me(), ev.crow.pos), where = { depan: 'DI HADAPAN', kiri: 'DI KIRI', kanan: 'DI KANAN', belakang: 'DI BELAKANG' }[b.side];
        if (ev.type === 'landed' && b.distance < 70 && alertTimer < 1.5) { alert(`GAGAK HINGGAP ${Math.round(b.distance)}M ${where}`, b.angle, b.side === 'belakang'); calloutTimer = 5; }
        if (ev.type === 'restless' && b.distance < 80) { alert(`GAGAK ${Math.round(b.distance)}M ${where} AKAN TERBANG!`, b.angle, true); calloutTimer = 5; }
        if (ev.type === 'leave') { fled++; sfx.flap(volume * .4, pan); }
      }
      const result = missionState({ kills, timeLeft, shells: weapons.reduce((n, x) => n + x.mag + x.reserve, 0) + (pump >= 0 ? 1 : 0) });
      if (result !== 'playing') finish(result);
    } else flock.update(0, at / 1000, { position: { x: 1e5, y: 0, z: 1e5 } });

    // HUD: clock, stealth pill, crosshair spread, toasts, minimap.
    if (state === 'loading') timeLeft = DIFFICULTY[settings.difficulty].seconds; // the title shows the chosen clock
    $('clock').textContent = clock(timeLeft); $('timer').classList.toggle('low', timeLeft < 30);
    const watched = flock.crows.some(c => c.alive && c.state === 'perch' && c.aware > .45);
    const label = watched ? 'GAGAK CURIGA' : running ? 'LARI · BISING' : stealthLabel(crouched, covered), pill = $('stealth');
    if (pill.dataset.label !== label) { pill.dataset.label = label; pill.className = 'hud card ' + (watched ? 'CURIGA' : running ? 'KELIHATAN' : label); $('stealth-text').textContent = label; }
    for (const b of [$('fire'), $('fire-left')]) b.classList.toggle('busy', pump >= 0 || reloading || !!nextWeapon);
    $('scope').hidden = !scoped; $('crosshair').hidden = scoped || (w.id === 'sniper' && aim > .5);
    const gap = Math.tan(spread()) / Math.tan(camera.fov * Math.PI / 360) * canvas.clientHeight / 2;
    const g = Math.max(7, gap), len = 13;
    chGap.l.style.cssText = `width:${len}px;height:2px;left:${-g - len}px;top:-1px`; chGap.r.style.cssText = `width:${len}px;height:2px;left:${g}px;top:-1px`;
    chGap.t.style.cssText = `width:2px;height:${len}px;top:${-g - len}px;left:-1px`; chGap.b.style.cssText = `width:2px;height:${len}px;top:${g}px;left:-1px`;
    toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('show');
    hitTimer -= dt; $('hitmark').style.opacity = hitTimer > 0 ? 1 : 0;
    alertTimer -= dt; if (alertTimer <= 0) $('alert').classList.remove('show');
    // Edge arrows point to the nearest crows outside the view.
    const halfH = Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect) * .9;
    // Crows in nearly the same direction share one arrow with a count.
    const off = [];
    if (playing) for (const b of huntable().map(c => ({ ...bearing(me(), c.pos), urgent: c.warned, count: 1 })).filter(b => b.distance < 70 && Math.abs(b.angle) > halfH).sort((a, b) => a.distance - b.distance)) {
      const same = off.find(o => Math.abs(Math.atan2(Math.sin(o.angle - b.angle), Math.cos(o.angle - b.angle))) < .35);
      if (same) { same.count++; same.urgent ||= b.urgent; } else if (off.length < 4) off.push(b);
    }
    edgeArrows.forEach((el, i) => {
      const b = off[i]; el.hidden = !b; if (!b) return;
      // On an ellipse kept clear of the top panels and the thumb controls.
      const x = 50 + Math.sin(b.angle) * 31, y = 45 - Math.cos(b.angle) * 23;
      el.style.left = x + '%'; el.style.top = y + '%'; el.style.setProperty('--a', b.angle + 'rad'); el.classList.toggle('urgent', b.urgent || b.distance < 15);
      el.lastChild.textContent = (b.count > 1 ? b.count + ' · ' : '') + Math.round(b.distance) + 'm';
    });
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
