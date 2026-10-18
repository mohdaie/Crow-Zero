import * as T from 'three';
import { outline } from './illustration.js?v=0.1.0';

// First-person pump shotgun with a suppressor, drawn in its own scene over
// the world so it never clips into walls. Parts are side profiles extruded
// with a bevel, so the silhouette reads like a real gun; hands wrap the
// wrist of the stock and the pump. Animations: walk bob, recoil, the pump
// stroke, shell loading and aiming down the bead.

// A side profile (points as [z, y], the gun pointing down -z) extruded
// across x, centred on x = 0.
function profile(points, width, bevel = .004) {
  const shape = new T.Shape(points.map(([z, y]) => new T.Vector2(z, y)));
  const g = new T.ExtrudeGeometry(shape, { depth: width - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  // rotateY(-90°) takes shape x to +z and the extrusion to -x, without
  // mirroring (a mirror would turn the faces inside out).
  g.rotateY(-Math.PI / 2); g.translate((width - bevel * 2) / 2, 0, 0); g.computeVertexNormals();
  return g;
}

export function createShotgun(toon) {
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(55, 1, .01, 10);
  scene.add(new T.HemisphereLight(0xeaf4ff, 0x7d8a72, 1.25));
  const sun = new T.DirectionalLight(0xfff0dc, 1.6); sun.position.set(-1.2, 3, 1.5); scene.add(sun);
  const metal = toon(0x464b52), steel = toon(0x5b616a), dark = toon(0x26292e), wood = toon(0x9a5a2c), woodDark = toon(0x6f3f1f), rubber = toon(0x1f2023);
  const skin = toon(0xd29a6a), skinDark = toon(0xb57f52), sleeve = toon(0x2f5a45), stripe = toon(0xd6a83a), brass = toon(0xe0b850), red = toon(0xb33a2e);
  const rig = new T.Group(), gun = new T.Group(); rig.add(gun); scene.add(rig);
  const inked = [];
  const add = (geometry, material, parent = gun, x = 0, y = 0, z = 0, ink = true) => { const m = new T.Mesh(geometry, material); m.position.set(x, y, z); parent.add(m); if (ink) inked.push(m); return m; };
  const rod = (r, length, material, y, z0, z1, parent = gun, segments = 14) => { const m = add(new T.CylinderGeometry(r, r, Math.abs(z1 - z0), segments), material, parent, 0, y, (z0 + z1) / 2); m.rotation.x = Math.PI / 2; return m; };

  // Receiver: flat sides, rounded top sloping into the stock.
  add(profile([[-.105, -.034], [.11, -.034], [.13, -.02], [.13, .02], [.1, .038], [-.09, .04], [-.105, .03]], .052, .005), metal);
  add(new T.BoxGeometry(.003, .022, .07), dark, gun, .027, .012, -.01, false); // ejection port
  add(new T.BoxGeometry(.012, .008, .19), steel, gun, 0, .046, .0); // sight rib
  // Trigger guard and trigger under the receiver.
  const guard = new T.Shape([[-.005, 0], [.075, 0], [.08, -.035], [.05, -.05], [.0, -.045], [-.01, -.02]].map(([z, y]) => new T.Vector2(z, y)));
  guard.holes.push(new T.Path([[.008, -.006], [.066, -.006], [.068, -.03], [.046, -.04], [.01, -.036], [.003, -.018]].map(([z, y]) => new T.Vector2(z, y))));
  const guardGeo = new T.ExtrudeGeometry(guard, { depth: .012, bevelEnabled: false }); guardGeo.rotateY(-Math.PI / 2); guardGeo.translate(.006, -.034, 0);
  add(guardGeo, dark, gun, 0, 0, .03);
  add(profile([[.0, 0], [.012, 0], [.02, -.028], [.012, -.03]], .008, .002), dark, gun, 0, -.034, .062, false);
  // Stock: comb along the top, wrist where the right hand grips, rubber butt.
  // Aiming puts the stock under the cheek: it and the right hand are hidden then.
  // (Outlines sit beside their mesh, so the parts go in a group that hides whole.)
  const stock = new T.Group(); gun.add(stock); const cheek = [stock];
  add(profile([[.12, .036], [.47, .028], [.47, -.112], [.43, -.115], [.27, -.08], [.19, -.052], [.13, -.036]], .046, .007), wood, stock);
  add(profile([[.47, .03], [.49, .03], [.49, -.115], [.47, -.115]], .05, .004), rubber, stock);
  // Barrel with vent rib, magazine tube and cap, suppressor with grip rings.
  rod(.0105, 0, steel, .022, -.105, -.6);
  add(new T.BoxGeometry(.006, .006, .49), steel, gun, 0, .035, -.35, false);
  rod(.012, 0, metal, -.014, -.105, -.53);
  rod(.0135, 0, dark, -.014, -.53, -.56);
  add(new T.BoxGeometry(.01, .03, .015), metal, gun, 0, .0, -.545); // barrel clamp
  rod(.021, 0, dark, .022, -.6, -.8, gun, 18);
  for (const z of [-.63, -.66, -.77]) rod(.0225, 0, steel, .022, z - .006, z + .006, gun, 18);
  add(new T.BoxGeometry(.005, .016, .01), steel, gun, 0, .049, -.785);
  add(new T.SphereGeometry(.0055, 8, 6), brass, gun, 0, .059, -.785, false);

  // Pump: grooved wooden fore-end around the magazine tube; the left hand rides it.
  const pump = new T.Group(); pump.position.set(0, -.014, -.33); gun.add(pump);
  add(profile([[-.1, .022], [.1, .022], [.105, .012], [.105, -.03], [.1, -.036], [-.1, -.036], [-.105, -.03], [-.105, .012]], .058, .008), wood, pump);
  for (let i = 0; i < 7; i++) add(new T.BoxGeometry(.061, .005, .007), woodDark, pump, 0, -.012, -.072 + i * .024, false);

  // Hands and sleeves. Every piece runs between two points in the gun's
  // frame, so the fingers can be laid around the stock and the pump.
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
    // The gold stripe running down the outside of the sleeve.
    const out = new T.Vector3(side, .4, 0).normalize().multiplyScalar(.052);
    between(parent, new T.Vector3(...at(.1)).add(out).toArray(), new T.Vector3(...at(.45)).add(out.clone().multiplyScalar(1.18)).toArray(), .009, .009, stripe, false);
  }
  // Right hand round the wrist of the stock: palm on the right, thumb over
  // the top, fingers curled underneath; the index finger by the trigger.
  const rightHand = new T.Group(); gun.add(rightHand); cheek.push(rightHand);
  between(rightHand, [.036, -.022, .175], [.04, -.062, .225], .026, undefined, skin).scale.set(.6, 1, 1);
  between(rightHand, [.03, .02, .17], [-.012, .03, .12], .011, undefined, skin);
  for (let i = 0; i < 4; i++) {
    const z = .155 + i * .022, y = -.072 + i * .006 - (i === 0 ? -.012 : 0);
    between(rightHand, [.045, y + .012, z], [.012, y - .014, z - .004], .0105, undefined, i % 2 ? skinDark : skin);
    between(rightHand, [.012, y - .014, z - .004], [-.022, y - .004, z - .01], .0098, undefined, skin);
  }
  sleeveFrom(rightHand, [.045, -.07, .235], [.35, -.5, 1], 1);
  // Left hand cradling the pump: palm underneath, fingers up the right side,
  // thumb along the left.
  add(new T.BoxGeometry(.07, .028, .1), skin, pump, 0, -.05, .005);
  for (let i = 0; i < 4; i++) {
    const z = -.045 + i * .024;
    between(pump, [.03, -.052, z], [.042, -.02, z - .004], .0105, undefined, i % 2 ? skinDark : skin);
    between(pump, [.042, -.02, z - .004], [.036, .006, z - .01], .0095, undefined, skin);
  }
  between(pump, [-.032, -.045, .03], [-.04, -.012, -.05], .0115, undefined, skin);
  sleeveFrom(pump, [-.01, -.07, .06], [-.35, -.55, 1], -1);
  for (const m of inked) outline(m, 1.25);

  // Muzzle puff: a soft sprite at the suppressor end.
  const puffCanvas = document.createElement('canvas'); puffCanvas.width = puffCanvas.height = 64;
  { const g = puffCanvas.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32); grad.addColorStop(0, 'rgba(240,235,220,.9)'); grad.addColorStop(1, 'rgba(240,235,220,0)'); g.fillStyle = grad; g.fillRect(0, 0, 64, 64); }
  const puffMap = new T.CanvasTexture(puffCanvas); puffMap.colorSpace = T.SRGBColorSpace;
  const puff = new T.Sprite(new T.SpriteMaterial({ map: puffMap, transparent: true, depthWrite: false, opacity: 0 }));
  puff.position.set(0, .022, -.83); puff.scale.setScalar(.1); gun.add(puff);
  // Spent red hulls with brass heads eject to the right.
  const shells = [], hullGeo = new T.CylinderGeometry(.0105, .0105, .05, 10), headGeo = new T.CylinderGeometry(.0112, .0112, .012, 10);
  function eject() {
    const s = new T.Group(); add(hullGeo, red, s, 0, .006, 0, false); add(headGeo, brass, s, 0, -.025, 0, false);
    s.position.set(.03, .015, -.01); s.rotation.z = Math.PI / 2; gun.localToWorld(s.position); rig.worldToLocal(s.position); rig.add(s);
    shells.push({ mesh: s, vel: new T.Vector3(.6 + Math.random() * .3, .7, -.1), life: .55 });
  }

  // Hip: low right, angled in toward the crosshair as in the mockup.
  const hip = new T.Vector3(.13, -.15, -.45), aimed = new T.Vector3(0, -.07, -.6);
  rig.position.copy(hip);
  const state = { aim: 0, kick: 0, reload: 0, bob: 0, puff: 0, ejected: false, reloading: false };
  return {
    scene, camera,
    fire() { state.kick = 1; state.puff = 1; state.ejected = false; },
    setReloading(on) { state.reloading = on; },
    loadShell() { state.reload = 1; },
    resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); },
    // `pumpProgress` 0…1 across the pump stroke; `aim` 0…1 blend to the bead.
    update(dt, { moving, aim, pumpProgress, lookDelta }) {
      state.aim = aim; state.kick = Math.max(0, state.kick - dt * 6); state.puff = Math.max(0, state.puff - dt * 5);
      state.bob += dt * (moving ? 9 : 2); state.reload = Math.max(0, state.reload - dt * 3);
      const pos = hip.clone().lerp(aimed, aim), bobAmount = (moving ? .012 : .003) * (1 - aim * .8);
      pos.x += Math.sin(state.bob * .5) * bobAmount - lookDelta.x * .0015; pos.y += Math.abs(Math.cos(state.bob * .5)) * bobAmount + lookDelta.y * .0015;
      pos.z += state.kick * .08;
      rig.position.lerp(pos, 1 - Math.exp(-dt * 18));
      gun.rotation.x = .06 * (1 - aim) + state.kick * .2 + (state.reloading ? -.3 : 0) + state.reload * .08;
      gun.rotation.y = .2 * (1 - aim);
      gun.rotation.z += ((state.reloading ? .55 : -.06 * (1 - aim)) - gun.rotation.z) * (1 - Math.exp(-dt * 10));
      // Pump stroke: back on the first half, forward on the second.
      const stroke = pumpProgress > 0 ? Math.sin(Math.min(1, pumpProgress) * Math.PI) : 0;
      pump.position.z = -.33 + stroke * .1;
      if (pumpProgress > .45 && pumpProgress < 1 && !state.ejected) { state.ejected = true; eject(); }
      for (const part of cheek) part.visible = aim < .7;
      puff.material.opacity = state.puff * .8; puff.scale.setScalar(.06 + (1 - state.puff) * .12);
      camera.fov = 55 - aim * 12; camera.updateProjectionMatrix();
      for (const s of [...shells]) {
        s.life -= dt; s.vel.y -= 4 * dt; s.mesh.position.addScaledVector(s.vel, dt * .5); s.mesh.rotation.x += dt * 12;
        if (s.life <= 0) { s.mesh.removeFromParent(); shells.splice(shells.indexOf(s), 1); }
      }
    }
  };
}
