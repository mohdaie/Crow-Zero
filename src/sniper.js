import * as T from 'three';
import { outline } from './illustration.js?v=0.1.0';
import { profile } from './shotgun.js?v=0.4.0';

// First-person Barrett M82: a long semi-automatic .50 rifle with its
// double-chamber muzzle brake, perforated barrel sleeve, box magazine,
// pistol grip, folded bipod, carry handle and a big scope on the top rail.
// Drawn in its own scene like the shotgun. Aiming brings the scope to the
// eye; the game then shows the full-screen scope view and hides the model.
export function createSniper(toon) {
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 1, .01, 10);
  scene.add(new T.HemisphereLight(0xeaf4ff, 0x7d8a72, 1.25));
  const sun = new T.DirectionalLight(0xfff0dc, 1.6); sun.position.set(-1.2, 3, 1.5); scene.add(sun);
  const black = toon(0x2a2d32), park = toon(0x3d4148), steel = toon(0x555b63), hole = toon(0x121315), rubber = toon(0x1b1c1f), lens = toon(0x4f8fb8);
  const skin = toon(0xd29a6a), skinDark = toon(0xb57f52), sleeve = toon(0x2f5a45), stripe = toon(0xd6a83a), brass = toon(0xe0b850);
  const rig = new T.Group(), gun = new T.Group(); rig.add(gun); scene.add(rig);
  const inked = [];
  const add = (geometry, material, parent = gun, x = 0, y = 0, z = 0, ink = true) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); if (ink) inked.push(m); return m; };
  const rod = (r0, r1, material, y, z0, z1, parent = gun, segments = 16, x = 0, ink = true) => { const m = add(new T.CylinderGeometry(r0, r1, Math.abs(z1 - z0), segments), material, parent, x, y, (z0 + z1) / 2, ink); m.rotation.x = -Math.PI / 2; return m; }; // radius r0 at z0, r1 at z1

  // Upper receiver: one long slab from the buttstock to the barrel sleeve.
  add(profile([[-.36, -.005], [.36, -.005], [.38, .02], [.36, .06], [-.34, .06], [-.36, .045]], .06, .006), park);
  // Top rail with its cross slots, carrying the scope.
  add(new T.BoxGeometry(.024, .012, .5), black, gun, 0, .066, -.02);
  for (let i = 0; i < 16; i++) add(new T.BoxGeometry(.026, .004, .008), hole, gun, 0, .07, -.25 + i * .031, false);
  // Perforated barrel sleeve, then the bare barrel and the muzzle brake.
  add(profile([[-.62, .0], [-.34, .0], [-.34, .055], [-.6, .05], [-.62, .04]], .056, .005), park);
  for (let i = 0; i < 6; i++) for (const side of [-1, 1]) { const h = add(new T.CylinderGeometry(.009, .009, .004, 10), hole, gun, side * .029, .027, -.38 - i * .04, false); h.rotation.z = Math.PI / 2; }
  rod(.016, .016, steel, .027, -.62, -1.02);
  add(new T.BoxGeometry(.07, .042, .1), black, gun, 0, .027, -1.06);
  for (const z of [-1.035, -1.08]) for (const side of [-1, 1]) add(new T.BoxGeometry(.004, .03, .022), hole, gun, side * .036, .027, z, false);
  // Lower receiver with pistol grip, trigger guard and box magazine.
  add(profile([[-.2, -.06], [.27, -.06], [.29, -.04], [.29, -.005], [-.22, -.005], [-.22, -.035]], .052, .005), black);
  add(profile([[.14, -.06], [.2, -.06], [.24, -.17], [.2, -.18], [.165, -.17]], .04, .008), rubber);
  add(profile([[.06, -.06], [.15, -.06], [.15, -.095], [.1, -.1], [.07, -.09]], .012, .002), black, gun, 0, -.0, 0);
  add(new T.BoxGeometry(.036, .12, .1), park, gun, 0, -.115, .02).rotation.x = -.12;
  add(new T.BoxGeometry(.038, .014, .104), black, gun, 0, -.17, .027).rotation.x = -.12;
  // Buttstock with the recoil pad and the folded rear monopod.
  add(profile([[.36, .055], [.6, .055], [.62, .04], [.62, -.11], [.58, -.115], [.48, -.05], [.36, -.03]], .056, .008), black);
  add(profile([[.62, .055], [.66, .055], [.66, -.115], [.62, -.115]], .062, .006), rubber);
  rod(.008, .008, steel, -.08, .4, .56);
  // Carry handle above the receiver, ahead of the scope.
  add(profile([[-.32, .06], [-.3, .11], [-.18, .11], [-.16, .06], [-.19, .06], [-.205, .095], [-.295, .095], [-.31, .06]], .016, .003), black);
  // Folded bipod along the barrel.
  for (const side of [-1, 1]) rod(.006, .006, steel, -.012, -.6, -.95, gun, 8, side * .02);
  add(new T.BoxGeometry(.06, .02, .03), black, gun, 0, .0, -.6);
  // Scope: rings, tube, objective bell, eyepiece, turrets and a lens glint.
  const scopeY = .115;
  for (const z of [-.12, .1]) add(new T.BoxGeometry(.03, .045, .025), black, gun, 0, .085, z);
  rod(.019, .019, black, scopeY, -.15, .2);
  rod(.029, .019, black, scopeY, -.27, -.15);
  rod(.031, .031, black, scopeY, -.3, -.27);
  rod(.023, .02, black, scopeY, .2, .3);
  add(new T.CylinderGeometry(.013, .013, .03, 12), park, gun, 0, scopeY + .03, -.02);
  add(new T.CylinderGeometry(.012, .012, .03, 12), park, gun, .03, scopeY, -.02).rotation.z = Math.PI / 2;
  add(new T.CircleGeometry(.026, 20), lens, gun, 0, scopeY, -.301, false).rotation.y = Math.PI;

  // Hands: the right on the pistol grip, the left under the receiver ahead
  // of the magazine; green sleeves with the gold stripe, as on the shotgun.
  const UP = new T.Vector3(0, 1, 0);
  function between(parent, from, to, r0, r1, material, ink = true) {
    const a = new T.Vector3(...from), b = new T.Vector3(...to), d = b.clone().sub(a), len = d.length();
    const geometry = r1 === undefined ? new T.CapsuleGeometry(r0, Math.max(.001, len - r0 * 2), 4, 10) : new T.CylinderGeometry(r1, r0, len, 14);
    const m = add(geometry, material, parent, ...a.clone().add(b).multiplyScalar(.5).toArray(), ink);
    m.quaternion.setFromUnitVectors(UP, d.normalize()); return m;
  }
  function sleeveFrom(parent, wrist, dir, side) {
    const d = new T.Vector3(...dir).normalize(), at = k => new T.Vector3(...wrist).addScaledVector(d, k).toArray();
    between(parent, at(0), at(.03), .036, .04, skinDark);
    between(parent, at(.02), at(.07), .046, .048, stripe, false);
    between(parent, at(.06), at(.5), .05, .062, sleeve);
    const out = new T.Vector3(side, .4, 0).normalize().multiplyScalar(.052);
    between(parent, new T.Vector3(...at(.1)).add(out).toArray(), new T.Vector3(...at(.45)).add(out.clone().multiplyScalar(1.18)).toArray(), .009, .009, stripe, false);
  }
  const rightHand = new T.Group(); gun.add(rightHand);
  between(rightHand, [.034, -.08, .17], [.04, -.14, .205], .028, undefined, skin).scale.set(.6, 1, 1);
  for (let i = 0; i < 4; i++) { const y = -.085 - i * .022, z = .15 + i * .008; between(rightHand, [.042, y, z + .02], [.0, y - .004, z - .02], .0105, undefined, i % 2 ? skinDark : skin); between(rightHand, [.0, y - .004, z - .02], [-.026, y, z], .0098, undefined, skin); }
  between(rightHand, [.03, -.065, .2], [.0, -.03, .23], .011, undefined, skin);
  sleeveFrom(rightHand, [.045, -.16, .23], [.35, -.45, 1], 1);
  const leftHand = new T.Group(); gun.add(leftHand);
  // Palm under the front of the lower receiver, fingers up its right side.
  add(new T.BoxGeometry(.07, .026, .1), skin, leftHand, 0, -.075, -.16);
  for (let i = 0; i < 4; i++) { const z = -.2 + i * .024; between(leftHand, [.03, -.078, z], [.036, -.04, z - .004], .0105, undefined, i % 2 ? skinDark : skin); }
  between(leftHand, [-.032, -.07, -.12], [-.036, -.038, -.19], .0115, undefined, skin);
  sleeveFrom(leftHand, [-.01, -.09, -.1], [-.4, -.6, 1], -1);
  for (const m of inked) outline(m, 1.25);

  // Muzzle blast from the brake, sideways and forward.
  const puffCanvas = document.createElement('canvas'); puffCanvas.width = puffCanvas.height = 64;
  { const g = puffCanvas.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(255,236,170,1)'); grad.addColorStop(.35, 'rgba(255,170,70,.8)'); grad.addColorStop(1, 'rgba(255,150,60,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64); }
  const puffMap = new T.CanvasTexture(puffCanvas); puffMap.colorSpace = T.SRGBColorSpace;
  const flashes = [[0, .027, -1.13, .16], [.07, .027, -1.06, .1], [-.07, .027, -1.06, .1]].map(([x, y, z, size]) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: puffMap, transparent: true, depthWrite: false, opacity: 0 })); sp.position.set(x, y, z); sp.userData.size = size; gun.add(sp); return sp; });
  // Spent .50 cases eject to the right.
  const shells = [], caseGeo = new T.CylinderGeometry(.009, .011, .09, 10);
  function eject() {
    const s = add(caseGeo, brass, rig, 0, 0, 0, false); s.position.set(.03, .03, -.05); s.rotation.z = Math.PI / 2;
    gun.localToWorld(s.position); rig.worldToLocal(s.position);
    shells.push({ mesh: s, vel: new T.Vector3(.7 + Math.random() * .3, .6, -.05), life: .6 });
  }

  // Hip: low right, the long barrel reaching toward the crosshair. Aimed:
  // the eyepiece at the eye (the game takes over with the scope overlay).
  const hip = new T.Vector3(.17, -.2, -.68), aimed = new T.Vector3(0, -.115, -.08);
  rig.position.copy(hip);
  const state = { kick: 0, flash: 0, bob: 0, reloading: false, magOut: 0 };
  return {
    scene, camera,
    fire() { state.kick = 1; state.flash = 1; eject(); },
    setReloading(on) { state.reloading = on; },
    loadShell() {},
    resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); },
    update(dt, { moving, aim, lookDelta, lowered = 0, reloadProgress = 0 }) {
      state.kick = Math.max(0, state.kick - dt * 4); state.flash = Math.max(0, state.flash - dt * 9);
      state.bob += dt * (moving ? 8 : 2);
      const pos = hip.clone().lerp(aimed, aim), bobAmount = (moving ? .014 : .004) * (1 - aim * .9);
      pos.x += Math.sin(state.bob * .5) * bobAmount - lookDelta.x * .0015; pos.y += Math.abs(Math.cos(state.bob * .5)) * bobAmount + lookDelta.y * .0015;
      pos.z += state.kick * .14; pos.y -= lowered * .4;
      rig.position.lerp(pos, 1 - Math.exp(-dt * 16));
      gun.rotation.x = .05 * (1 - aim) + state.kick * .3 + (state.reloading ? -.25 + Math.sin(reloadProgress * Math.PI) * -.15 : 0);
      gun.rotation.y = .16 * (1 - aim);
      gun.rotation.z += ((state.reloading ? .5 : -.05 * (1 - aim)) - gun.rotation.z) * (1 - Math.exp(-dt * 8));
      for (const f of flashes) { f.material.opacity = state.flash; f.scale.setScalar(f.userData.size * (.6 + (1 - state.flash))); }
      camera.fov = 55 - aim * 15; camera.updateProjectionMatrix();
      for (const s of [...shells]) {
        s.life -= dt; s.vel.y -= 4 * dt; s.mesh.position.addScaledVector(s.vel, dt * .5); s.mesh.rotation.x += dt * 10;
        if (s.life <= 0) { s.mesh.removeFromParent(); shells.splice(shells.indexOf(s), 1); }
      }
    }
  };
}
