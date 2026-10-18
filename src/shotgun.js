import * as T from 'three';
import { outline } from './illustration.js?v=0.1.0';

// First-person pump shotgun with a suppressor, drawn in its own scene over
// the world so it never clips into walls. Animations: walk bob, recoil, the
// pump stroke, shell loading and aiming down the bead.
export function createShotgun(toon) {
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 1, .01, 10);
  scene.add(new T.HemisphereLight(0xe5f3ff, 0x82917a, 1.3));
  const sun = new T.DirectionalLight(0xffedda, 1.4); sun.position.set(-1, 3, 2); scene.add(sun);
  const metal = toon(0x3a3f45), dark = toon(0x24272c), wood = toon(0x8a5a36), woodDark = toon(0x6e4429), skin = toon(0xc68e5f), sleeve = toon(0x3d5a45), cuff = toon(0xd6a83a), brass = toon(0xd9b45a), red = toon(0xb33a2e);
  const rig = new T.Group(), gun = new T.Group(); rig.add(gun); scene.add(rig);
  const inked = [];
  const part = (geometry, material, x, y, z, parent = gun, ink = true) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); if (ink) inked.push(m); return m; };
  const tube = (r, length, material, x, y, z, parent = gun, segments = 12) => { const m = part(new T.CylinderGeometry(r, r, length, segments), material, x, y, z, parent); m.rotation.x = Math.PI / 2; return m; };
  // The gun points down -z. Receiver, barrel, magazine tube, suppressor.
  part(new T.BoxGeometry(.055, .085, .26), metal, 0, 0, 0);
  tube(.016, .62, dark, 0, .02, -.44);
  tube(.014, .5, metal, 0, -.022, -.38);
  tube(.03, .2, dark, 0, .02, -.83, gun, 14);
  for (const z of [-.75, -.91]) tube(.032, .012, metal, 0, .02, z, gun, 14);
  // Sight rib on the receiver and a brass bead on a post at the suppressor,
  // raised so the suppressor never hides the target when aiming.
  part(new T.BoxGeometry(.012, .012, .2), metal, 0, .048, -.02);
  part(new T.BoxGeometry(.006, .03, .012), metal, 0, .055, -.9);
  part(new T.SphereGeometry(.007, 6, 4), brass, 0, .072, -.9, gun, false);
  part(new T.BoxGeometry(.03, .018, .05), metal, 0, -.048, .03);
  // Pistol grip and stock in wood.
  const grip = part(new T.BoxGeometry(.045, .12, .055), woodDark, 0, -.08, .13); grip.rotation.x = -.35;
  const stock = part(new T.BoxGeometry(.05, .085, .3), wood, 0, -.03, .3); stock.rotation.x = .08;
  part(new T.BoxGeometry(.052, .1, .03), dark, 0, -.045, .45);
  // The fore-end slides on the magazine tube when pumping.
  const pump = new T.Group(); pump.position.set(0, -.022, -.3); gun.add(pump);
  part(new T.BoxGeometry(.05, .045, .17), wood, 0, 0, 0, pump);
  for (let i = 0; i < 4; i++) part(new T.BoxGeometry(.052, .006, .012), woodDark, 0, -.024, -.06 + i * .04, pump, false);
  // Hands: right on the grip, left on the pump, sleeves in council green.
  const arm = (parent, x, y, z, rx, ry) => {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.set(rx, ry, 0); parent.add(g);
    part(new T.BoxGeometry(.07, .06, .1), skin, 0, 0, 0, g);
    const forearm = part(new T.CylinderGeometry(.042, .05, .28, 8), sleeve, 0, -.02, .19, g); forearm.rotation.x = Math.PI / 2;
    part(new T.CylinderGeometry(.057, .057, .03, 8), cuff, 0, -.02, .07, g).rotation.x = Math.PI / 2;
    return g;
  };
  // Forearms angle down and out of frame, never back into the lens.
  arm(gun, .02, -.1, .14, .95, .35);
  arm(pump, -.035, -.045, .02, .85, -.55);
  for (const m of inked) outline(m, 1.2);
  // Muzzle puff: a soft sprite at the suppressor end.
  const puffCanvas = document.createElement('canvas'); puffCanvas.width = puffCanvas.height = 64;
  { const g = puffCanvas.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(240,235,220,.9)'); grad.addColorStop(1, 'rgba(240,235,220,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64); }
  const puffMap = new T.CanvasTexture(puffCanvas); puffMap.colorSpace = T.SRGBColorSpace;
  const puff = new T.Sprite(new T.SpriteMaterial({ map: puffMap, transparent: true, depthWrite: false, opacity: 0 }));
  puff.position.set(0, .02, -.95); puff.scale.setScalar(.1); gun.add(puff);
  // Spent red shells eject to the right.
  const shells = [];
  const shellGeo = new T.CylinderGeometry(.011, .011, .05, 8);
  function eject() {
    const s = new T.Mesh(shellGeo, red); s.position.set(.04, .02, -.02); s.rotation.z = Math.PI / 2;
    gun.localToWorld(s.position); rig.worldToLocal(s.position); rig.add(s);
    shells.push({ mesh: s, vel: new T.Vector3(.9 + Math.random() * .4, .9, .2), life: .8 });
  }

  const hip = new T.Vector3(.2, -.2, -.46), aimed = new T.Vector3(0, -.074, -.4);
  rig.position.copy(hip);
  const state = { aim: 0, kick: 0, pump: 0, pumpQueued: false, reload: 0, bob: 0, puff: 0, ejected: false };
  return {
    scene, camera,
    fire() { state.kick = 1; state.puff = 1; state.pump = 0; state.ejected = false; },
    startPump() { state.pump = 1e-6; },
    setReloading(on) { state.reloading = on; },
    loadShell() { state.reload = 1; },
    resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); },
    // `pumpProgress` 0…1 across the pump stroke; `aim` 0…1 blend to the bead.
    update(dt, { moving, aim, pumpProgress, lookDelta }) {
      state.aim = aim; state.kick = Math.max(0, state.kick - dt * 6); state.puff = Math.max(0, state.puff - dt * 5);
      state.bob += dt * (moving ? 9 : 2); state.reload = Math.max(0, state.reload - dt * 3);
      const pos = hip.clone().lerp(aimed, aim), bobAmount = (moving ? .012 : .003) * (1 - aim * .8);
      pos.x += Math.sin(state.bob * .5) * bobAmount - lookDelta.x * .002; pos.y += Math.abs(Math.cos(state.bob * .5)) * bobAmount - lookDelta.y * .002;
      pos.z += state.kick * .09;
      const tilt = state.reloading ? .6 : 0;
      rig.position.lerp(pos, 1 - Math.exp(-dt * 18));
      gun.rotation.x = state.kick * .22 + (state.reloading ? -.25 : 0) + state.reload * .08;
      gun.rotation.z += ((state.reloading ? tilt : 0) - gun.rotation.z) * (1 - Math.exp(-dt * 10));
      gun.rotation.y = .09 * (1 - aim);
      // Pump stroke: back on the first half, forward on the second.
      const stroke = pumpProgress > 0 ? Math.sin(Math.min(1, pumpProgress) * Math.PI) : 0;
      pump.position.z = -.3 + stroke * .11;
      if (pumpProgress > .45 && pumpProgress < 1 && !state.ejected) { state.ejected = true; eject(); }
      puff.material.opacity = state.puff * .8; puff.scale.setScalar(.06 + (1 - state.puff) * .12);
      camera.fov = 55 - aim * 12; camera.updateProjectionMatrix();
      for (const s of [...shells]) {
        s.life -= dt; s.vel.y -= 4 * dt; s.mesh.position.addScaledVector(s.vel, dt * .5); s.mesh.rotation.x += dt * 12;
        if (s.life <= 0) { s.mesh.removeFromParent(); shells.splice(shells.indexOf(s), 1); }
      }
    }
  };
}
