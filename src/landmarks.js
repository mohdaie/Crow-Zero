import * as T from 'three';

// Low-poly landmark models drawn from the agreed concept sheets: a Straits
// shophouse terrace, a Kuala Kangsar-style mosque and a 1990s family sedan.
// Plain-coloured parts carry their colour per vertex and share two materials
// (smooth and faceted), so the town batcher still merges them per cell.
// Models are built in their unit's local frame under `parent()`.
export function createLandmarks({ parent, toon, textured, register, sign, collider, roundCollider }) {
  const paint = register('paint', toon(0xffffff, { vertexColors: true }));
  const facet = register('paint-facet', toon(0xffffff, { vertexColors: true, flatShading: true }));
  const tint = new T.Color();
  function add(geometry, hex, x, y, z, o = {}) {
    if (hex !== null) {
      tint.set(hex);
      const count = geometry.attributes.position.count, data = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) { data[i * 3] = tint.r; data[i * 3 + 1] = tint.g; data[i * 3 + 2] = tint.b; }
      geometry.setAttribute('color', new T.BufferAttribute(data, 3));
    }
    const m = new T.Mesh(geometry, o.material || (o.facet ? facet : paint));
    m.position.set(x, y, z); if (o.rot) m.rotation.set(...o.rot);
    m.castShadow = true; m.receiveShadow = true; if (o.occluder) m.userData.cameraOccluder = true;
    (o.parent || parent()).add(m); return m;
  }
  const box = (w, h, d, hex, x, y, z, o) => add(new T.BoxGeometry(w, h, d), hex, x, y, z, o);
  const cyl = (r1, r2, h, hex, x, y, z, segments = 8, o) => add(new T.CylinderGeometry(r1, r2, h, segments), hex, x, y, z, o);
  function beam(a, b, r, hex, o = {}) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start);
    const m = add(new T.CylinderGeometry(r, r, delta.length(), 6), hex, ...start.clone().add(end).multiplyScalar(.5).toArray(), o);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  // Textured boxes take UVs from world position, so plaster and tiles keep
  // one scale across long terraces instead of stretching per face.
  function worldBox(w, h, d, material, x, y, z, unit = 2, o = {}) {
    const g = new T.BoxGeometry(w, h, d), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const wx = p.getX(i) + x, wy = p.getY(i) + y, wz = p.getZ(i) + z, flat = Math.abs(n.getY(i)) > .5, side = Math.abs(n.getX(i)) > .5;
      uv.setXY(i, (flat || !side ? wx : wz) / unit, (flat ? wz : wy) / unit);
    }
    return add(g, null, x, y, z, { ...o, material });
  }
  function lathe(points, hex, x, y, z, segments = 12, o = {}) {
    return add(new T.LatheGeometry(points.map(([r, h]) => new T.Vector2(r, h)), segments), hex, x, y, z, { facet: true, ...o });
  }
  // A closed outline from the sill: straight jambs then a semicircular or
  // pointed, cusped arch. Used for openings, frames and mouldings.
  function arch(w, spring, kind = 'round', grow = 0) {
    const pts = [], half = w / 2 + grow, sill = grow > 0 ? -.08 : 0;
    pts.push(new T.Vector2(-half, sill), new T.Vector2(half, sill));
    if (kind === 'round') {
      for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; pts.push(new T.Vector2(Math.cos(a) * half, spring + Math.sin(a) * half)); }
    } else {
      // Pointed arch from two arcs, scalloped into three lobes per side.
      const R = w * .8 + grow, cx = half - R, top = Math.acos(-cx / R), lobe = w * .07;
      const side = [];
      for (let i = 0; i <= 18; i++) {
        const a = i / 18 * top, r = R - (kind === 'cusped' ? lobe * (1 - Math.abs(Math.sin(a / top * Math.PI * 3))) : 0);
        side.push(new T.Vector2(cx + Math.cos(a) * r, spring + Math.sin(a) * r));
      }
      pts.push(...side, ...side.slice(0, -1).reverse().map(p => new T.Vector2(-p.x, p.y)));
    }
    return pts;
  }
  const shape = (points, holes = []) => { const s = new T.Shape(points); for (const h of holes) s.holes.push(new T.Path(h)); return s; };
  const extrude = (s, depth) => new T.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 4 });
  function canvasMaterial(key, width, height, paint) {
    const c = document.createElement('canvas'); c.width = width; c.height = height; paint(c.getContext('2d'), width, height);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4;
    return register(key, toon(0xffffff, { map }));
  }

  // ---------------------------------------------------------------- shophouses
  // Louvred shutter windows with a radial fanlight, in peach and sage.
  const shutters = ['#e8a46c', '#8fb39a'].map((leaf, n) => canvasMaterial('shophouse-window-' + n, 128, 256, (c, w, h) => {
    const fan = 64;
    c.fillStyle = '#f4ead4'; c.fillRect(0, 0, w, h);
    c.fillStyle = n ? '#6f927c' : '#cf8c56'; c.beginPath(); c.arc(w / 2, fan, w / 2 - 6, Math.PI, 0); c.fill();
    c.strokeStyle = '#f7eedb'; c.lineWidth = 4;
    for (let a = 0; a <= 180; a += 15) { const r = a * Math.PI / 180; c.beginPath(); c.moveTo(w / 2, fan); c.lineTo(w / 2 - Math.cos(r) * 60, fan - Math.sin(r) * 60); c.stroke(); }
    c.fillStyle = '#f4ead4'; c.beginPath(); c.arc(w / 2, fan, 12, Math.PI, 0); c.fill(); c.fillRect(0, fan - 2, w, 8);
    for (const x0 of [4, w / 2 + 2]) {
      const lw = w / 2 - 6;
      c.fillStyle = leaf; c.fillRect(x0, fan + 10, lw, h - fan - 14);
      for (let y = fan + 14; y < h - 6; y += 7) { c.fillStyle = 'rgba(120,64,34,.38)'; c.fillRect(x0 + 4, y, lw - 8, 2); c.fillStyle = 'rgba(255,240,215,.45)'; c.fillRect(x0 + 4, y + 2, lw - 8, 1); }
      c.fillStyle = n ? '#5f7f6a' : '#b8743f'; c.fillRect(x0, fan + 10 + (h - fan) * .55, lw, 5);
      c.strokeStyle = n ? '#4f6d5a' : '#a3653a'; c.lineWidth = 3; c.strokeRect(x0 + 1.5, fan + 11.5, lw - 3, h - fan - 17);
    }
  }));
  const plaster = [textured(0xffffff, 'weathered'), textured(0xf6e6d2, 'weathered')];
  const floorTiles = textured(0xffffff, 'floor'), clay = textured(0xffffff, 'clay');
  const CREAM = 0xf3e8cc, TRIM = 0xfaf3e2, SALMON = 0xe2896b, SALMON_DARK = 0xc56e51, SHUTTER = 0x4a7461;
  function shophouseRow(names, x0 = -10, z0 = -24, step = 9) {
    const back = z0 - 5, shopfront = z0 + 5, face = shopfront + 2.95, west = x0 - step / 2, east = x0 + step * (names.length - .5);
    names.forEach((name, i) => {
      const x = x0 + i * step, wall = plaster[i % 2];
      // Two storeys of shop with the upper floor carried over the five-foot way.
      worldBox(step, 7.2, 10, wall, x, 3.6, z0, 3, { occluder: true });
      worldBox(step, 3.5, 2.95, wall, x, 3.7 + 1.75, shopfront + 1.475, 3, { occluder: true });
      worldBox(step, .26, 2.95, floorTiles, x, .13, shopfront + 1.475, 1.6);
      box(step, .12, .14, 0xd9cbb0, x, .2, face - .07);
      collider(x, z0, step, 10, 'building');
      // Shopfront: dark interior, folding doors and rolled-up green shutters.
      for (const side of [-1, 1]) {
        const ox = x + side * 2.25;
        box(3.4, 2.85, .06, 0x2b2622, ox, 1.68, shopfront + .03);
        for (const edge of [-1, 1]) box(.5, 2.55, .08, [0xd8a93e, 0xc9b08a, 0x7b8f96][(i + side + edge + 3) % 3], ox + edge * 1.4, 1.55, shopfront + .07);
        box(3.5, .62, .32, SHUTTER, ox, 2.95, shopfront + .17); box(3.5, .1, .34, 0x355646, ox, 2.62, shopfront + .18);
      }
      // Upper facade: string course with the shop's name, arched louvred
      // windows between pilasters, a stepped cornice and the scalloped valance.
      box(step + .02, .66, .24, CREAM, x, 4.03, face + .12);
      const board = sign(name, x, 4.03, face + .25, 6.4); board.scale.y = .43;
      for (const bay of [-2.25, 2.25]) for (const off of [-1, 1]) {
        const wx = x + bay + off * 1.0, w = .95, spring = 1.45;
        add(extrude(shape(arch(w, spring, 'round', .13), [arch(w, spring)]), .07), TRIM, wx, 4.6, face, {});
        const glass = new T.ShapeGeometry(shape(arch(w, spring)), 6), uv = glass.attributes.uv, p = glass.attributes.position;
        for (let k = 0; k < p.count; k++) uv.setXY(k, (p.getX(k) + w / 2) / w, p.getY(k) / (spring + w / 2));
        add(glass, null, wx, 4.6, face + .02, { material: shutters[(i + (bay > 0 ? 1 : 0)) % 2] });
        box(w + .34, .08, .18, TRIM, wx, 4.56, face + .08);
        box(.16, .16, .1, TRIM, wx, 4.6 + spring + w / 2 + .1, face + .06);
      }
      for (const [y, h, d] of [[6.8, .16, .3], [6.96, .14, .48], [7.1, .12, .3]]) box(step + .02, h, d, CREAM, x, y, face + d / 2);
      const scallops = [new T.Vector2(-step / 2, .36)], n = 30;
      for (let k = 0; k <= n; k++) { const cx = -step / 2 + k * step / n; for (let a = 0; a <= 6; a++) scallops.push(new T.Vector2(cx - step / n / 2 + a / 6 * step / n, .14 - Math.sin(a / 6 * Math.PI) * .13)); }
      scallops.push(new T.Vector2(step / 2, .36));
      add(extrude(shape(scallops.filter(p => p.x >= -step / 2 && p.x <= step / 2)), .03), 0xfdf8ec, x, 6.84, face + .6);
    });
    // Salmon five-foot-way pillars and the pilasters that rise above them.
    for (let px = west; px <= east + .01; px += step / 2) {
      const pz = face - .32;
      box(.78, .3, .78, SALMON_DARK, px, .41, pz); box(.62, 3.05, .62, SALMON, px, 1.86, pz);
      for (const y of [1.2, 2.2]) box(.66, .07, .66, SALMON_DARK, px, y, pz);
      box(.74, .23, .74, CREAM, px, 3.47, pz); box(.82, .12, .82, TRIM, px, 3.64, pz);
      roundCollider(px, pz, .4, 'post');
      box(.5, 2.4, .14, TRIM, px, 5.55, face + .07); box(.62, .18, .2, TRIM, px, 6.7, face + .1); box(.62, .2, .2, TRIM, px, 4.45, face + .1);
    }
    // Hipped terracotta roof over the whole terrace, with ridge and hip caps.
    const o = .62, x1 = west - o, x2 = east + o, z1 = back - o, z2 = face + o, base = 7.2, rise = 2.6, zc = (z1 + z2) / 2, inset = (z2 - z1) / 2;
    const r1 = [x1 + inset, base + rise, zc], r2 = [x2 - inset, base + rise, zc];
    const A = [x1, base, z2], B = [x2, base, z2], C = [x2, base, z1], D = [x1, base, z1], slope = Math.hypot(inset, rise);
    const faces = [[A, B, r2, r1, 'x', 1], [C, D, r1, r2, 'x', -1], [B, C, r2, null, 'z', 1], [D, A, r1, null, 'z', -1]];
    const position = [], uvs = [];
    const uvOf = (p, axis, sign) => [(axis === 'x' ? p[0] : p[2]) / 2, (axis === 'x' ? Math.abs(p[2] - (sign > 0 ? z2 : z1)) : Math.abs(p[0] - (sign > 0 ? x2 : x1))) / inset * slope / 2];
    for (const [a, b, c, d, axis, sgn] of faces) {
      const tris = d ? [[a, b, c], [a, c, d]] : [[a, b, c]];
      for (const tri of tris) for (const p of tri) { position.push(...p); uvs.push(...uvOf(p, axis, sgn)); }
    }
    const roof = new T.BufferGeometry(); roof.setAttribute('position', new T.Float32BufferAttribute(position, 3)); roof.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); roof.computeVertexNormals();
    add(roof, null, 0, 0, 0, { material: clay, occluder: true });
    beam(r1, r2, .13, 0x9d4a31); for (const [p, r] of [[A, r1], [D, r1], [B, r2], [C, r2]]) beam(p, r, .1, 0x9d4a31);
    box(x2 - x1, .1, o, 0x5a3b2b, (x1 + x2) / 2, base - .02, z2 - o / 2); box(x2 - x1, .1, o, 0x5a3b2b, (x1 + x2) / 2, base - .02, z1 + o / 2);
    for (let rx = x1 + .3; rx < x2; rx += .7) box(.1, .12, o - .05, 0x4a3022, rx, base - .12, z2 - o / 2);
    // Weathered end wall facing the kampung, with a side door and window.
    add(extrude(shape(arch(1.2, 2.0, 'round', .14), [arch(1.2, 2.0)]), .08), TRIM, west - .06, .26, z0 + 1.2, { rot: [0, -Math.PI / 2, 0] });
    box(.06, 2.5, 1.2, 0x3f6a58, west - .02, 1.5, z0 + 1.2);
    box(.08, 1.3, 1.0, TRIM, west - .04, 5.2, z0 - 1.5); box(.06, 1.1, .8, 0x6f927c, west - .07, 5.2, z0 - 1.5);
  }

  // ---------------------------------------------------------------- mosque
  const GOLD = 0xf4b630, GOLD_DARK = 0xd39522, WHITE = 0xf4ecda, RED = 0xb8583f, BAND = 0x7d4b45, BLACK = 0x3a3634;
  function onion(radius, x, y, z, segments = 12) {
    const pts = [[radius * .82, 0], [radius * .95, radius * .2], [radius, radius * .48], [radius * .93, radius * .8], [radius * .72, radius * 1.1], [radius * .44, radius * 1.36], [radius * .2, radius * 1.56], [radius * .07, radius * 1.72], [0, radius * 1.8]];
    lathe(pts, GOLD, x, y, z, segments);
    const tip = y + radius * 1.8;
    cyl(.035 * radius + .02, .05 * radius + .03, radius * .5, GOLD_DARK, x, tip + radius * .25, z, 6, { facet: true });
    add(new T.SphereGeometry(radius * .1 + .04, 6, 4), GOLD, x, tip + radius * .55, z, { facet: true });
    add(new T.ConeGeometry(radius * .05 + .03, radius * .9 + .3, 6), GOLD, x, tip + radius * 1.05 + .15, z, { facet: true });
  }
  function pinnacle(x, y, z, h = 1.3, r = .26) {
    cyl(r, r * 1.15, h, WHITE, x, y + h / 2, z, 8);
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; box(.04, .3, .04, BAND, x + Math.cos(a) * r * .95, y + h * .7, z + Math.sin(a) * r * .95); }
    cyl(r * 1.25, r * 1.25, .1, WHITE, x, y + h, z, 8);
    onion(r * 1.3, x, y + h + .05, z, 10);
  }
  function arcade(group, length, bays, height, spring, depth = .32) {
    const bay = length / bays, w = bay * .66, holes = [];
    for (let k = 0; k < bays; k++) holes.push(arch(w, spring, 'cusped').map(p => new T.Vector2(p.x - length / 2 + bay * (k + .5), p.y)));
    add(extrude(shape([new T.Vector2(-length / 2, -.06), new T.Vector2(length / 2, -.06), new T.Vector2(length / 2, height), new T.Vector2(-length / 2, height)], holes), depth), RED, 0, 0, -depth, { parent: group });
    for (let k = 0; k < bays; k++) {
      const cx = -length / 2 + bay * (k + .5);
      add(extrude(shape(arch(w, spring, 'cusped', .16), [arch(w, spring, 'cusped')]), .06), WHITE, cx, 0, .0, { parent: group });
    }
    for (let k = 0; k <= bays; k++) {
      const px = -length / 2 + bay * k;
      box(.34, spring, .12, RED, px, spring / 2, .07, { parent: group });
      box(.44, .42, .18, BLACK, px, .21, .08, { parent: group }); box(.44, .2, .18, BLACK, px, spring - .02, .08, { parent: group });
      box(.5, .12, .2, WHITE, px, spring + .14, .09, { parent: group });
    }
    box(length, .26, .14, WHITE, 0, height - .55, .06, { parent: group }); box(length + .1, .3, .2, WHITE, 0, height - .15, .08, { parent: group });
  }
  function mosque(cx, cz, name) {
    const W = 13, D = 11, H = 4.4, spring = 2.25;
    // Open arcades on all four sides around the prayer hall.
    for (const [len, x, z, ry] of [[W, cx, cz + D / 2, 0], [W, cx, cz - D / 2, Math.PI], [D, cx + W / 2, cz, Math.PI / 2], [D, cx - W / 2, cz, -Math.PI / 2]]) {
      const g = new T.Group(); g.position.set(x, .21, z); g.rotation.y = ry; parent().add(g);
      arcade(g, len, Math.round(len / 1.85), H, spring);
    }
    box(W - 2.2, H - .2, D - 2.2, 0xe9dcc0, cx, .21 + (H - .2) / 2, cz, { occluder: true });
    for (const dx of [-2.2, 0, 2.2]) { box(1.1, 2.3, .08, 0x477163, cx + dx, 1.36, cz + D / 2 - 1.08); box(1.3, .14, .1, WHITE, cx + dx, 2.55, cz + D / 2 - 1.06); }
    box(W, .36, D, WHITE, cx, H + .39, cz, { occluder: true });
    // Parapet with saw-tooth crenellations and gilded pinnacles.
    const top = H + .57;
    for (const [len, x, z, alongX] of [[W, cx, cz + D / 2, true], [W, cx, cz - D / 2, true], [D, cx + W / 2, cz, false], [D, cx - W / 2, cz, false]]) {
      box(alongX ? len : .22, .34, alongX ? .22 : len, WHITE, x, top + .17, z);
      for (let t = -len / 2 + .21; t < len / 2; t += .42) add(new T.ConeGeometry(.15, .32, 4), WHITE, alongX ? x + t : x, top + .5, alongX ? z : z + t, { rot: [0, Math.PI / 4, 0], facet: true });
    }
    for (const [x, z] of [[cx - 3.6, cz + D / 2], [cx + 3.6, cz + D / 2], [cx - 3.6, cz - D / 2], [cx + 3.6, cz - D / 2], [cx - W / 2, cz - 2.6], [cx - W / 2, cz + 2.6], [cx + W / 2, cz - 2.6], [cx + W / 2, cz + 2.6]]) pinnacle(x, top, z);
    // Central drum and the great gilded onion dome.
    cyl(3.2, 3.3, 1.5, WHITE, cx, top + .75, cz, 12, { facet: true, occluder: true });
    cyl(3.32, 3.32, .22, BAND, cx, top + .55, cz, 12, { facet: true });
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; add(new T.ConeGeometry(.14, .3, 4), WHITE, cx + Math.cos(a) * 3.1, top + 1.65, cz + Math.sin(a) * 3.1, { facet: true }); }
    onion(3.6, cx, top + 1.5, cz, 16);
    // Four striped minarets with open galleries and gilded caps.
    for (const [dx, dz, h] of [[-7.3, 6.3, 11], [7.3, 6.3, 11], [-7.3, -6.3, 12.6], [7.3, -6.3, 12.6]]) {
      const x = cx + dx, z = cz + dz;
      cyl(1.0, 1.05, 1.3, WHITE, x, .86, z, 8, { facet: true });
      cyl(.72, .8, h, WHITE, x, 1.5 + h / 2, z, 8, { facet: true, occluder: true });
      for (let y = 2.6; y < h; y += 1.25) cyl(.79, .81, .36, BAND, x, 1.5 + y, z, 8, { facet: true });
      const g = 1.5 + h * .62; cyl(1.06, 1.0, .2, WHITE, x, g, z, 8, { facet: true }); cyl(1.0, 1.0, .36, WHITE, x, g + .28, z, 8, { facet: true });
      const deck = 1.5 + h;
      cyl(1.05, .85, .25, WHITE, x, deck + .12, z, 8, { facet: true });
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + Math.PI / 8; cyl(.07, .07, 1.25, WHITE, x + Math.cos(a) * .72, deck + .87, z + Math.sin(a) * .72, 6); }
      cyl(.62, .62, 1.0, 0x8a7a63, x, deck + .75, z, 8);
      cyl(1.0, 1.0, .22, WHITE, x, deck + 1.6, z, 8, { facet: true });
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; add(new T.ConeGeometry(.08, .2, 4), WHITE, x + Math.cos(a) * .9, deck + 1.82, z + Math.sin(a) * .9, { facet: true }); }
      onion(.95, x, deck + 1.7, z, 12);
      roundCollider(x, z, 1.05, 'minaret');
    }
    // Entrance porch with a larger cusped arch and two gilded corner caps.
    const porch = new T.Group(); porch.position.set(cx, .21, cz + D / 2 + 1.5); parent().add(porch);
    add(extrude(shape([new T.Vector2(-2.1, -.06), new T.Vector2(2.1, -.06), new T.Vector2(2.1, 5.6), new T.Vector2(-2.1, 5.6)], [arch(2.3, 2.7, 'cusped')]), .3), WHITE, 0, 0, -.3, { parent: porch });
    add(extrude(shape(arch(2.3, 2.7, 'cusped', .22), [arch(2.3, 2.7, 'cusped')]), .06), RED, 0, 0, 0, { parent: porch });
    for (const s of [-1, 1]) { box(.3, 5.6, 1.5, WHITE, s * 1.95, 2.8, -.75, { parent: porch }); box(.5, .45, .3, BLACK, s * 1.95, .23, .05, { parent: porch }); }
    box(4.2, .3, 1.5, WHITE, 0, 5.75, -.75, { parent: porch });
    for (let t = -1.9; t <= 1.95; t += .42) add(new T.ConeGeometry(.15, .32, 4), WHITE, t, 6.06, 0, { rot: [0, Math.PI / 4, 0], facet: true, parent: porch });
    for (const s of [-1, 1]) pinnacle(cx + s * 2.1, 6.11, cz + D / 2 + 1.5, 1.1, .28);
    const plate = sign(name, cx, 5.26, cz + D / 2 + 1.53, 3.8); plate.scale.y = .8;
    collider(cx, cz, W, D, 'building'); collider(cx, cz + D / 2 + .75, 4.2, 1.5, 'building');
  }

  // ---------------------------------------------------------------- sedan
  // A boxy 1990s four-door: wedge nose, upright glasshouse, five-spoke rims.
  function sedan(x, z, heading, body = 0xd4322c) {
    const car = new T.Group(); car.position.set(x, 0, z); car.rotation.y = heading; parent().add(car);
    const o = { parent: car, facet: true }, dark = 0x2c2f33, glassTone = 0x8fa4ae, light = new T.Color(body).offsetHSL(0, 0, -.12).getHex();
    const shell = new T.BoxGeometry(1.68, .56, 4.3, 2, 2, 6), p = shell.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
      if (py > 0 && pz > .9) py -= (pz - .9) * .11;
      if (py > 0 && pz < -1.7) py -= .03;
      if (py < 0 && Math.abs(pz) > 2) pz *= .985;
      if (py > 0) px *= .97;
      p.setXYZ(i, px, py, pz);
    }
    shell.computeVertexNormals(); add(shell, body, 0, .6, 0, o);
    const cabin = new T.BoxGeometry(1, 1, 1), c = cabin.attributes.position;
    for (let i = 0; i < c.count; i++) {
      const up = c.getY(i) > 0, front = c.getZ(i) > 0;
      c.setXYZ(i, Math.sign(c.getX(i)) * (up ? .63 : .79), up ? 1.37 : .88, up ? (front ? .18 : -.86) : (front ? .86 : -1.28));
    }
    cabin.computeVertexNormals(); add(cabin, glassTone, 0, 0, 0, o);
    box(1.3, .05, 1.08, body, 0, 1.39, -.34, o);
    for (const s of [-1, 1]) {
      beam([s * .8, .9, .86], [s * .64, 1.38, .18], .045, body, { parent: car }); beam([s * .8, .9, -.32], [s * .64, 1.38, -.32], .05, body, { parent: car });
      beam([s * .8, .9, -1.28], [s * .64, 1.38, -.86], .07, body, { parent: car });
      box(.03, .06, 2.2, light, s * .82, .9, -.2, o);
      box(.13, .1, .16, body, s * .9, .99, .72, o);
      for (const dz of [.42, -.62]) box(.02, .04, .14, dark, s * .835, .79, dz, o);
      for (const dz of [.95, -.32, -1.32]) box(.012, .46, .012, light, s * .838, .62, dz, o);
      for (const dz of [1.33, -1.33]) {
        const wheel = new T.Group(); wheel.position.set(s * .76, .3, dz); wheel.rotation.z = Math.PI / 2; car.add(wheel);
        cyl(.3, .3, .21, 0x26282b, 0, 0, 0, 14, { parent: wheel, facet: true });
        cyl(.2, .2, .22, 0x6f757b, 0, 0, 0, 10, { parent: wheel, facet: true });
        // The axle rotation maps local +y to world -x, so the outer face is -side.
        for (let k = 0; k < 5; k++) { const spoke = box(.05, .025, .18, 0xeef0f2, 0, -s * .113, 0, { parent: wheel }); spoke.position.set(Math.sin(k * 1.2566) * .09, -s * .113, Math.cos(k * 1.2566) * .09); spoke.rotation.y = k * 1.2566; }
        cyl(.05, .05, .23, 0x8d9296, 0, 0, 0, 6, { parent: wheel });
      }
      box(.42, .13, .04, 0xe8eef0, s * .55, .7, 2.13, o); box(.08, .1, .04, 0xd99a3d, s * .8, .7, 2.12, o);
      box(.36, .14, .04, 0x8e2222, s * .58, .8, -2.13, o); box(.12, .14, .04, 0xd99a3d, s * .32, .8, -2.13, o);
    }
    box(.46, .05, .04, dark, 0, .72, 2.14, o); box(1.05, .1, .04, dark, 0, .45, 2.12, o); box(.52, .12, .03, 0x1f2124, 0, .56, 2.16, o);
    box(.5, .12, .03, 0x1f2124, 0, .58, -2.15, o);
    for (const s of [-1, 1]) beam([s * .05, .9, .84], [s * .55, .93, .8], .012, dark, { parent: car });
    beam([.45, 1.39, -.8], [.48, 1.72, -1.05], .008, dark, { parent: car });
    return car;
  }
  return { shophouseRow, mosque, sedan };
}
