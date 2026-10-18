import * as T from 'three';

// Low-poly kampung trees, c. 2001: kelapa and pinang palms, tattered pisang,
// fruit trees in season (rambutan, mangga, jambu air, nangka in its sack,
// durian), a rubber smallholding with tapping cups, bamboo, the pekan's rain
// trees, the school's ketapang, the mosque's kemboja, an old beringin, bunga
// raya hedges and the herbs of a kebun dapur.
// Each tree is built straight into world space and handed over as at most
// two meshes (wood and leaf); the town batcher then merges them per
// cell. Colours ride on the vertices, so all species share three materials.
// Thin leaves carry a sway weight in uv.x and get no ink lines. Crowns sit
// above head height, so the low chase camera passes under them rather than
// fading them like walls.
export function createTrees({ parent, toon, register }) {
  const wind = { value: 0 };
  const solid = register('tree-solid', toon(0xffffff, { vertexColors: true }));
  const leaf = toon(0xffffff, { vertexColors: true, side: T.DoubleSide });
  const halftone = leaf.onBeforeCompile;
  leaf.onBeforeCompile = shader => {
    halftone(shader);
    shader.uniforms.windTime = wind;
    shader.vertexShader = 'uniform float windTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      // A slow breeze: still at the stem, loose at the leaf tip.
      float windPhase = windTime * 1.6 + position.x * .23 + position.z * .19;
      transformed += vec3(sin(windPhase), sin(windPhase * 1.3) * .35, cos(windPhase * .8)) * .1 * uv.x;`);
  };
  leaf.customProgramCacheKey = () => 'illustrated-halftone-v1-wind';
  leaf.userData.noInk = true;
  register('tree-leaf', leaf);

  const tint = new T.Color(), up = new T.Vector3(0, 1, 0), turn = new T.Quaternion(), from = new T.Vector3(), to = new T.Vector3();
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  // Flat colour per triangle with a small random shade, for faceted variety.
  function paint(g, hex, rnd, jitter) {
    if (g.index) g = g.toNonIndexed();
    const n = g.attributes.position.count, data = new Float32Array(n * 3); tint.set(hex);
    for (let i = 0; i < n; i += 3) {
      const k = 1 + (rnd() - .5) * 2 * jitter;
      for (let j = i; j < Math.min(n, i + 3); j++) data.set([Math.min(1, tint.r * k), Math.min(1, tint.g * k), Math.min(1, tint.b * k)], j * 3);
    }
    g.setAttribute('color', new T.BufferAttribute(data, 3)); return g;
  }
  function merge(list) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3);
    let o = 0;
    for (const g of list) {
      const a = g.attributes; pos.set(a.position.array, o * 3); nor.set(a.normal.array, o * 3); col.set(a.color.array, o * 3);
      if (a.uv) uv.set(a.uv.array, o * 2);
      o += a.position.count; g.dispose();
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3));
    g.setAttribute('uv', new T.BufferAttribute(uv, 2)); g.setAttribute('color', new T.BufferAttribute(col, 3));
    g.computeBoundingSphere(); return g;
  }
  // Shapes, already in place. Solid shapes keep uv at zero (no sway).
  const still = g => { g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); return g; };
  function limb(a, b, r0, r1, sides = 10) {
    from.set(...a); to.set(...b); const dir = to.clone().sub(from), length = Math.max(.01, dir.length());
    const g = new T.CylinderGeometry(r1, r0, length, sides, 1, true); g.translate(0, length / 2, 0);
    turn.setFromUnitVectors(up, dir.normalize()); g.applyQuaternion(turn); g.translate(from.x, from.y, from.z); return still(g);
  }
  function blob(x, y, z, r, sy, detail, rnd) {
    const g = new T.IcosahedronGeometry(r, detail); g.rotateY(rnd() * 6.283); g.rotateX((rnd() - .5) * .5); g.scale(1, sy, 1); g.translate(x, y, z); return still(g);
  }
  // Small fruit and flowers: an eight-sided bead.
  function bead(x, y, z, r, sy, rnd) { const g = new T.OctahedronGeometry(r, 0); g.rotateY(rnd() * 6.283); g.scale(1, sy, 1); g.translate(x, y, z); return still(g); }
  function cone(x, y, z, r, h, sides, down) { const g = new T.ConeGeometry(r, h, sides); if (down) g.rotateX(Math.PI); g.translate(x, y, z); return still(g); }
  function sheet(pos, weights) {
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(weights.flatMap(w => [w, 0]), 2)); g.computeVertexNormals(); return g;
  }
  // A palm frond along +x: leaflets slant forward off the rachis in a fishbone.
  function frond(length, lift, droop, width, segments, sway = 1.4) {
    const pos = [], w = [], at = t => [t * length * Math.cos(lift), t * length * Math.sin(lift) - t * t * droop * length, 0];
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments, t1 = (i + 1) / segments, a = at(t0), b = at(t1), half = width * Math.sin(Math.PI * (.12 + .86 * t1)) + .04;
      for (const side of [-1, 1]) { pos.push(...a, ...b, b[0] + length / segments * .7, b[1] - half * .6, side * half); w.push(t0 * sway, t1 * sway, t1 * sway); }
    }
    return sheet(pos, w);
  }
  // A banana leaf: a wide paddle that rises and droops, torn into slices.
  function paddle(length, width, rise, droop, segments, rnd, torn) {
    const pos = [], w = [], mid = t => [t * length, t * length * rise - t * t * length * droop, 0];
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments, t1 = (i + 1) / segments, a = mid(t0), b = mid(t1);
      const w0 = width * Math.sin(Math.PI * Math.min(.97, .1 + t0 * .9)), w1 = width * Math.sin(Math.PI * Math.min(.97, .1 + t1 * .9));
      for (const side of [-1, 1]) {
        if (torn && i > 0 && rnd() < .2) continue;
        const cut = torn && rnd() < .3 ? .5 : 1, ea = [a[0], a[1] - w0 * .3, side * w0 * cut], eb = [b[0], b[1] - w1 * .3, side * w1 * cut];
        pos.push(...a, ...b, ...eb, ...a, ...eb, ...ea); w.push(t0, t1, t1, t0, t1, t0);
      }
    }
    return sheet(pos, w);
  }
  // A narrow tapering strap: pandan, serai, bamboo and kemboja leaves.
  function strap(length, width, rise, droop, segments) {
    const pos = [], w = [], mid = t => [t * length, t * length * rise - t * t * length * droop, 0];
    for (let i = 0; i < segments; i++) {
      const t0 = i / segments, t1 = (i + 1) / segments, a = mid(t0), b = mid(t1), h0 = width * (1 - t0 * .9), h1 = width * (1 - t1 * .9);
      pos.push(a[0], a[1], -h0, b[0], b[1], -h1, b[0], b[1], h1, a[0], a[1], -h0, b[0], b[1], h1, a[0], a[1], h0); w.push(t0, t1, t1, t0, t1, t0);
    }
    return sheet(pos, w);
  }
  const place = (g, x, y, z, yaw) => { g.rotateY(yaw); g.translate(x, y, z); return g; };
  // A point on the outside of a crown, for fruit and flowers.
  function onCrown(crowns, rnd, below = -.2) {
    const [x, y, z, r, sy] = crowns[Math.floor(rnd() * crowns.length)], a = rnd() * 6.283, e = below + rnd() * (1 - below);
    const c = Math.sqrt(1 - e * e); return [x + Math.sin(a) * c * r * .95, y + e * r * sy * .95, z + Math.cos(a) * c * r * .95];
  }

  const GREEN = [0x4d7a3c, 0x5a8a44, 0x456f37], HEADROOM = 2.9;
  // A broadleaf fruit or shade tree: trunk, limbs, a clustered crown, fruit.
  function broadleaf(p, rnd, add, far, o) {
    const s = p.size, h = o.trunk * s * (.9 + rnd() * .2), crowns = [];
    add(limb([p.x, 0, p.z], [p.x, h, p.z], o.girth * s, o.girth * .75 * s, 10), o.bark, 'wood', .05);
    const count = far ? Math.ceil(o.blobs * .6) : o.blobs;
    for (let i = 0; i < count; i++) {
      const a = i * 2.399 + rnd() * .5, ring = i === 0 ? 0 : o.spread * s * (.55 + rnd() * .45), r = o.blob * s * (.8 + rnd() * .35);
      const x = p.x + Math.sin(a) * ring, z = p.z + Math.cos(a) * ring, y = Math.max(o.height * s + (rnd() - .5) * o.blob * s * .8 - ring * .15, HEADROOM + r * o.squash);
      if (i > 0 && i < 4 && !far) add(limb([p.x, h * .92, p.z], [x * .7 + p.x * .3, y - r * .3, z * .7 + p.z * .3], o.girth * .55 * s, o.girth * .3 * s, 5), o.bark, 'wood');
      else if (i === 0 && y - r * o.squash > h + .3) add(limb([p.x, h * .9, p.z], [x, y - r * .4, z], o.girth * .7 * s, o.girth * .5 * s, 6), o.bark, 'wood');
      crowns.push([x, y, z, r, o.squash]);
      add(blob(x, y, z, r, o.squash, far ? 0 : 1, rnd), o.colors[i % o.colors.length], 'crown', .08);
    }
    return crowns;
  }

  const SPECIES = {
    kelapa(p, rnd, add, far) {
      const s = p.size, h = (6 + rnd() * 2.4) * s, a = rnd() * 6.283, lean = .1 + rnd() * .2, segs = far ? 3 : 5;
      const at = t => [p.x + Math.sin(a) * lean * h * t * t, t * h, p.z + Math.cos(a) * lean * h * t * t];
      for (let i = 0; i < segs; i++) add(limb(at(i / segs), at((i + 1) / segs), (.2 - i * .016) * s, (.185 - i * .016) * s, 10), i % 2 ? 0x8f8068 : 0x9e8f73, 'wood', .05);
      const [x, y, z] = at(1), fronds = far ? 7 : 10;
      add(blob(x, y, z, .3 * s, .8, 0, rnd), 0x8a7a55, 'wood');
      for (let i = 0; i < fronds; i++) {
        // The two oldest fronds hang down dry and brown.
        const old = i >= fronds - 2 && !far, yaw = i / fronds * 6.283 + rnd() * .4;
        add(place(frond((3.2 + rnd() * .9) * s, old ? -1 : .25 + rnd() * .5, old ? .1 : .55 + rnd() * .3, .7 * s, far ? 6 : 9), x, y, z, yaw), old ? 0xa48a55 : [0x6f9a3e, 0x7aa545, 0x66903a][i % 3], 'leaf', .06);
      }
      const nuts = far ? 3 : 5 + Math.floor(rnd() * 3);
      for (let i = 0; i < nuts; i++) { const b = i / nuts * 6.283; add(blob(x + Math.sin(b) * .27 * s, y - (.38 + (i % 2) * .16) * s, z + Math.cos(b) * .27 * s, .19 * s, 1, 0, rnd), i % 3 ? 0x7d953a : 0x9a7b46, 'fruit', .05); }
    },
    pinang(p, rnd, add, far) {
      const s = p.size, h = (6.5 + rnd() * 2) * s, segs = far ? 3 : 6;
      for (let i = 0; i < segs; i++) add(limb([p.x, h * i / segs, p.z], [p.x, h * (i + 1) / segs, p.z], .12 * s, .11 * s, 10), i % 2 ? 0x9a957c : 0xaaa58c, 'wood', .04);
      add(limb([p.x, h, p.z], [p.x, h + 1.1 * s, p.z], .15 * s, .13 * s, 10), 0x86a04a, 'wood');
      const top = h + 1.1 * s, fronds = far ? 5 : 7;
      for (let i = 0; i < fronds; i++) add(place(frond((2.1 + rnd() * .5) * s, .5 + rnd() * .4, .45, .42 * s, far ? 5 : 7), p.x, top, p.z, i / fronds * 6.283 + rnd() * .3), [0x6f9a3e, 0x7aa545][i % 2], 'leaf', .06);
      if (!far) for (let i = 0; i < 4; i++) add(bead(p.x + Math.sin(i * 1.6) * .2 * s, h - .1 - i * .12, p.z + Math.cos(i * 1.6) * .2 * s, .1 * s, 1.2, rnd), 0xd9822f, 'fruit', .08);
    },
    pisang(p, rnd, add, far) {
      const s = p.size, stems = far ? 2 : 2 + Math.floor(rnd() * 3);
      for (let k = 0; k < stems; k++) {
        const a = k * 2.4 + rnd(), d = k ? (.4 + rnd() * .35) * s : 0, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, h = (k ? 2.1 + rnd() * 1.1 : 3 + rnd() * .6) * s;
        add(limb([x, 0, z], [x, h, z], .15 * s, .11 * s, 10), 0xa1b468, 'wood', .06);
        add(limb([x, 0, z], [x, .55 * s, z], .16 * s, .14 * s, 10), 0x8d7c50, 'wood', .06);
        const leaves = far ? 4 : 5 + Math.floor(rnd() * 3);
        for (let j = 0; j < leaves; j++) add(place(paddle((2.2 + rnd() * .8) * s, .46 * s, .75 + rnd() * .5, 1 + rnd() * .5, far ? 4 : 6, rnd, !far), x, h - .05, z, j / leaves * 6.283 + rnd() * .5 + k), [0x82ad4c, 0x76a245, 0x8cb757][j % 3], 'leaf', .05);
        // An old leaf hangs dry down the stem.
        if (!far && rnd() < .75) add(place(paddle(.75 * s, .15 * s, -2.6, .1, 3, rnd, true), x, h - .25, z, rnd() * 6.283), 0xab8d57, 'leaf', .08);
        // The tallest stem carries a bunch and its purple jantung.
        if (k === 0 && !far && rnd() < .65) {
          const b = rnd() * 6.283, ox = Math.sin(b) * .45 * s, oz = Math.cos(b) * .45 * s;
          add(limb([x, h - .1, z], [x + ox, h - .45 * s, z + oz], .04 * s, .035 * s, 4), 0x7d8a45, 'fruit');
          for (let t = 0; t < 4; t++) for (let i = 0; i < 3; i++) { const c = i * 2.1 + t; add(bead(x + ox + Math.sin(c) * .12 * s, h - (.6 + t * .2) * s, z + oz + Math.cos(c) * .12 * s, .11 * s, 1.5, rnd), 0x9db648, 'fruit', .06); }
          add(cone(x + ox * 1.15, h - 1.6 * s, z + oz * 1.15, .11 * s, .34 * s, 6, true), 0x7b3047, 'fruit');
        }
      }
    },
    buluh(p, rnd, add, far) {
      const s = p.size, n = far ? 7 : 9 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const a = i * 2.399 + rnd() * .6, d = (.1 + rnd() * .6) * s, x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d, h = (6 + rnd() * 3.5) * s, arch = .12 + rnd() * .2;
        const at = t => [x + Math.sin(a) * arch * h * t * t, h * t * (1 - .08 * t), z + Math.cos(a) * arch * h * t * t];
        for (let k = 0; k < 3; k++) add(limb(at(k / 3), at((k + 1) / 3), .075 * s * (1 - k * .2), .065 * s * (1 - k * .2), 10), i % 3 ? 0xaab45c : 0x93a64c, 'wood', .05);
        const sprays = far ? 2 : 4, fans = far ? 3 : 5;
        for (let k = 0; k < sprays; k++) {
          const [sx, sy, sz] = at(.45 + k / sprays * .55);
          for (let f = 0; f < fans; f++) add(place(strap((.9 + rnd() * .4) * s, .11 * s, -.1, .5, 2), sx, sy, sz, a + (f - (fans - 1) / 2) * .75 + rnd() * .3), f % 2 ? 0x7ea44c : 0x8db158, 'leaf', .05);
        }
      }
    },
    rambutan(p, rnd, add, far) {
      // Fruit season: red clusters all over the crown.
      const crowns = broadleaf(p, rnd, add, far, { trunk: 2, girth: .22, bark: 0x6e5a44, blobs: 8, blob: 1.3, spread: 1.6, height: 3.7, squash: .8, colors: GREEN });
      for (let i = 0; i < (far ? 6 : 14); i++) { const [x, y, z] = onCrown(crowns, rnd), hex = rnd() < .8 ? 0xc93a2e : 0xd99a35; for (let k = 0; k < (far ? 1 : 3); k++) add(bead(x + (k - 1) * .09, y - (k % 2) * .08, z + (k % 2) * .07, .085 * p.size, 1, rnd), hex, 'fruit', .1); }
    },
    mangga(p, rnd, add, far) {
      const crowns = broadleaf(p, rnd, add, far, { trunk: 2.6, girth: .26, bark: 0x5f4e3c, blobs: 9, blob: 1.45, spread: 1.9, height: 4.6, squash: .78, colors: [0x3f6a36, 0x4b7a3f, 0x446f39] });
      if (far) return;
      for (let i = 0; i < 2; i++) add(blob(...onCrown(crowns, rnd, .5), .55 * p.size, .6, 0, rnd), 0x9b6a3c, 'crown', .08);
      for (let i = 0; i < 8; i++) { const [x, y, z] = onCrown(crowns, rnd, -.95); add(bead(x, Math.min(y, crowns[0][1] - .4), z, .14 * p.size, 1.4, rnd), 0x93b046, 'fruit', .08); }
    },
    jambu(p, rnd, add, far) {
      const crowns = broadleaf(p, rnd, add, far, { trunk: 1.4, girth: .17, bark: 0x7a6650, blobs: 6, blob: 1.05, spread: 1.2, height: 2.9, squash: .82, colors: [0x5f9246, 0x6a9a4c] });
      if (!far) for (let i = 0; i < 12; i++) { const [x, y, z] = onCrown(crowns, rnd, -.9); add(cone(x, Math.min(y, crowns[0][1]), z, .09 * p.size, .17 * p.size, 6, true), rnd() < .6 ? 0xe0566a : 0xf28a96, 'fruit', .06); }
    },
    nangka(p, rnd, add, far) {
      broadleaf(p, rnd, add, far, { trunk: 3.6, girth: .27, bark: 0x6b5a45, blobs: 8, blob: 1.35, spread: 1.7, height: 5, squash: .8, colors: [0x48703b, 0x52793f] });
      // Fruit grows straight off the trunk; some are wrapped in sacks.
      if (!far) for (let i = 0; i < 4; i++) { const a = i * 1.9 + rnd(), r = .27 * p.size + .2; add(blob(p.x + Math.sin(a) * r, (1.2 + i * .55) * p.size, p.z + Math.cos(a) * r, .26 * p.size, 1.5, 0, rnd), rnd() < .45 ? 0xdccfa8 : 0x9aa848, 'wood', .07); }
    },
    durian(p, rnd, add, far) {
      const s = p.size, h = (8 + rnd() * 2) * s;
      add(limb([p.x, 0, p.z], [p.x, h, p.z], .34 * s, .2 * s, 10), 0x6a5846, 'wood', .05);
      for (let i = 0; i < (far ? 4 : 6); i++) {
        const y = (6 + i * .95) * s, r = (2.2 - i * .24) * s, a = i * 2.4 + rnd(), d = (.5 + rnd() * .9) * s;
        add(blob(p.x + Math.sin(a) * d, y, p.z + Math.cos(a) * d, r, .7, far ? 0 : 1, rnd), [0x4c7340, 0x587e45, 0x6b7f45][i % 3], 'crown', .08);
      }
      if (!far) for (let i = 0; i < 3; i++) add(blob(p.x + Math.sin(i * 2.1) * 1.3 * s, 4.9 * s, p.z + Math.cos(i * 2.1) * 1.3 * s, .22 * s, 1.15, 0, rnd), 0x8c9a42, 'fruit', .1);
    },
    getah(p, rnd, add, far) {
      const s = p.size, h = (5.2 + rnd() * 1.4) * s, lean = (rnd() - .5) * .14, dir = rnd() * 6.283, tx = p.x + Math.sin(dir) * lean * h, tz = p.z + Math.cos(dir) * lean * h;
      add(limb([p.x, 0, p.z], [tx, h, tz], .19 * s, .13 * s, 10), 0x9c978a, 'wood', .07);
      if (!far) {
        // The tapping cut spirals down to a latex cup on a wire.
        const face = rnd() * 6.283, fx = Math.sin(face), fz = Math.cos(face), r = .19 * s;
        add(limb([p.x + fx * r, .9 * s, p.z + fz * r], [p.x + fx * r + fz * .25, 1.35 * s, p.z + fz * r - fx * .25], .03, .03, 4), 0xe6dcc2, 'fruit');
        add(limb([p.x + fx * (r + .06), .72 * s, p.z + fz * (r + .06)], [p.x + fx * (r + .06), .82 * s, p.z + fz * (r + .06)], .07, .085, 7), 0xefeadb, 'fruit');
      }
      for (let i = 0; i < (far ? 4 : 6); i++) {
        const a = i * 1.9 + rnd(), r = i ? 1.6 * s : 0, y = h - .2 + (i % 3) * .5 * s;
        add(blob(tx + Math.sin(a) * r, y, tz + Math.cos(a) * r, (i ? 1.35 : 1.7) * s, .7, far ? 0 : 1, rnd), rnd() < .08 ? 0xb59a48 : [0x5b8347, 0x6a9150, 0x557c42][i % 3], 'crown', .08);
      }
    },
    hujan(p, rnd, add, far) {
      // The pekan's rain tree: a short trunk, wide limbs, a flat umbrella.
      const s = p.size, h = 2.3 * s;
      add(limb([p.x, 0, p.z], [p.x, h, p.z], .55 * s, .45 * s, 12), 0x5f4f3e, 'wood', .05);
      for (let i = 0; i < 4; i++) { const a = i * 1.57 + rnd() * .5; add(limb([p.x, h - .2, p.z], [p.x + Math.sin(a) * 3 * s, 4.6 * s, p.z + Math.cos(a) * 3 * s], .3 * s, .16 * s, 6), 0x5f4f3e, 'wood', .05); }
      add(blob(p.x, 6.6 * s, p.z, 2.8 * s, .45, 1, rnd), 0x5d8c45, 'crown', .08);
      for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283 + rnd() * .3, d = (3.6 + rnd()) * s; add(blob(p.x + Math.sin(a) * d, (5.7 + rnd() * .7) * s, p.z + Math.cos(a) * d, (2.2 + rnd() * .5) * s, .45, 1, rnd), [0x5d8c45, 0x6c9a4e, 0x527f3f][i % 3], 'crown', .08); }
    },
    ketapang(p, rnd, add, far) {
      // Tiered, pagoda branches; a few leaves turning red.
      const s = p.size, h = 3.2 + 2.2 * s;
      add(limb([p.x, 0, p.z], [p.x, h, p.z], .24 * s, .14 * s, 10), 0x6b5a48, 'wood', .05);
      [[3.3, 1.8, 1.3, 4], [4.2, 1.4, 1.1, 4], [5, .9, .9, 3]].forEach(([y, d, r, n], tier) => {
        y = 3.3 + (y - 3.3) * s;
        for (let i = 0; i < n; i++) {
          const a = i / n * 6.283 + tier * .6, x = p.x + Math.sin(a) * d * s, z = p.z + Math.cos(a) * d * s;
          if (!far) add(limb([p.x, y - .2, p.z], [x, y, z], .07 * s, .05 * s, 4), 0x6b5a48, 'wood');
          add(blob(x, y + .2, z, r * s, .38, far ? 0 : 1, rnd), (i + tier) % 6 === 2 ? 0xc0643c : [0x5f8d43, 0x6b9849][i % 2], 'crown', .08);
        }
      });
      add(blob(p.x, h + .2, p.z, .9 * s, .55, 1, rnd), 0x6b9849, 'crown', .08);
    },
    kemboja(p, rnd, add, far) {
      // Grey forked branches with leaf rosettes and cream flowers at the tips.
      const s = p.size, base = [p.x, 1.2 * s, p.z];
      add(limb([p.x, 0, p.z], base, .2 * s, .16 * s, 10), 0x9d968a, 'wood', .05);
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + rnd() * .5, mid = [p.x + Math.sin(a) * .9 * s, 2.1 * s, p.z + Math.cos(a) * .9 * s];
        add(limb(base, mid, .13 * s, .1 * s, 5), 0x9d968a, 'wood', .05);
        for (let j = 0; j < 2; j++) {
          const b = a + (j ? .6 : -.6), tip = [mid[0] + Math.sin(b) * .7 * s, 2.9 * s + rnd() * .3, mid[2] + Math.cos(b) * .7 * s];
          add(limb(mid, tip, .09 * s, .07 * s, 5), 0x9d968a, 'wood', .05);
          for (let k = 0; k < 7; k++) add(place(strap(.95 * s, .17 * s, .55, .7, 2), ...tip, k / 7 * 6.283), k % 2 ? 0x5d8a43 : 0x6a9849, 'leaf', .06);
          for (let k = 0; k < 5; k++) add(bead(tip[0] + Math.sin(k * 1.3) * .2, tip[1] + .12 + (k % 2) * .06, tip[2] + Math.cos(k * 1.3) * .2, .12 * s, .5, rnd), k % 3 ? 0xf6f0de : 0xecc65a, 'fruit', .03);
        }
      }
    },
    beringin(p, rnd, add, far) {
      // The old banyan: a knotted trunk, hanging aerial roots, a vast crown.
      const s = p.size;
      for (let i = 0; i < 5; i++) { const a = i * 1.26, d = i ? .55 * s : 0; add(limb([p.x + Math.sin(a) * d, 0, p.z + Math.cos(a) * d], [p.x + Math.sin(a + .8) * d * .5, 4.6 * s, p.z + Math.cos(a + .8) * d * .5], (i ? .45 : .7) * s, .35 * s, 12), i % 2 ? 0x6f5e4a : 0x7d6a55, 'wood', .06); }
      const tips = [];
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + rnd() * .3, tip = [p.x + Math.sin(a) * 4.6 * s, (6 + rnd() * .8) * s, p.z + Math.cos(a) * 4.6 * s]; tips.push(tip); add(limb([p.x, 4.2 * s, p.z], tip, .38 * s, .2 * s, 6), 0x6f5e4a, 'wood', .05); }
      // Aerial roots stop above head height, except a few by the trunk.
      for (let i = 0; i < 22; i++) {
        const t = tips[i % 6], f = .3 + rnd() * .6, x = p.x + (t[0] - p.x) * f, z = p.z + (t[2] - p.z) * f, y = 4.5 * s + (t[1] - 4.5 * s) * f, low = f < .32 ? 0 : 2.3 + rnd() * 1.1;
        add(limb([x, y, z], [x + (rnd() - .5) * .3, low, z + (rnd() - .5) * .3], .05, .04, 4), 0x7d6a55, 'wood', .06);
      }
      add(blob(p.x, 8.4 * s, p.z, 3.2 * s, .55, 1, rnd), 0x3f6638, 'crown', .08);
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283 + rnd() * .3, d = (3.4 + rnd() * 2.6) * s; add(blob(p.x + Math.sin(a) * d, (7 + rnd() * 1.6) * s, p.z + Math.cos(a) * d, (2.2 + rnd() * .7) * s, .6, 1, rnd), [0x3f6638, 0x4a733e, 0x446c3a][i % 3], 'crown', .08); }
    },
    bungaraya(p, rnd, add, far) {
      const s = p.size, crowns = [];
      for (let i = 0; i < 5; i++) { const a = i * 2.4, d = i ? .45 * s : 0, c = [p.x + Math.sin(a) * d, (i ? .6 : 1) * s + rnd() * .3, p.z + Math.cos(a) * d, (.45 + rnd() * .15) * s, .85]; crowns.push(c); add(blob(c[0], c[1], c[2], c[3], .85, 1, rnd), [0x548a42, 0x62984b][i % 2], 'wood', .08); }
      for (let i = 0; i < 12; i++) { const g = new T.OctahedronGeometry(.15 * s, 0); g.scale(1, .45, 1); const [x, y, z] = onCrown(crowns, rnd, 0); g.translate(x, y, z); add(still(g), i % 4 ? 0xde3438 : 0xf06a4a, 'fruit', .05); }
    },
    serai(p, rnd, add) {
      for (let i = 0; i < 16; i++) add(place(strap((.42 + rnd() * .15) * p.size, .045, 2.2 + rnd() * .8, 1.1, 3), p.x + (rnd() - .5) * .25, 0, p.z + (rnd() - .5) * .25, i / 16 * 6.283 + rnd() * .3), i % 2 ? 0x9fc25a : 0x86b04c, 'leaf', .06);
    },
    pandan(p, rnd, add) {
      for (let i = 0; i < 12; i++) add(place(strap((.75 + rnd() * .3) * p.size, .075, 1.3 + rnd() * .5, .95, 3), p.x, .05, p.z, i / 12 * 6.283 + rnd() * .3), i % 2 ? 0x3f7d3e : 0x4b8a45, 'leaf', .05);
    },
    cili(p, rnd, add) {
      const crowns = [];
      for (let i = 0; i < 3; i++) { const c = [p.x + Math.sin(i * 2.1) * .15, .38, p.z + Math.cos(i * 2.1) * .15, .24, .9]; crowns.push(c); add(blob(c[0], c[1], c[2], .24, .9, 0, rnd), 0x5b8a3f, 'wood', .08); }
      add(limb([p.x, 0, p.z], [p.x, .2, p.z], .03, .03, 4), 0x6f7a45, 'wood');
      for (let i = 0; i < 9; i++) { const [x, y, z] = onCrown(crowns, rnd, -.6); add(cone(x, y - .05, z, .03, .13, 4, true), i % 3 ? 0xd6342a : 0x6f9a3e, 'fruit', .05); }
    }
  };

  // Build one planting from planting.js; far rows are lighter. Trees are
  // 'landscape' for the batcher: kept at any distance, never faded.
  function plant(p) {
    const build = SPECIES[p.kind]; if (!build) return 0;
    const rnd = rng(p.seed), far = p.ring === 'far', parts = new Map();
    // Wood and crowns are inked; leaves, fruit and flowers are not (small
    // shapes would drown in their outlines). Only leaves have sway weights.
    const add = (g, hex, key, jitter = .06) => { key = key === 'leaf' || key === 'fruit' ? 'leaf' : 'wood'; if (!parts.has(key)) parts.set(key, []); parts.get(key).push(paint(g, hex, rnd, jitter)); };
    build(p, rnd, add, far);
    let triangles = 0;
    for (const [key, list] of parts) {
      const mesh = new T.Mesh(merge(list), key === 'leaf' ? leaf : solid);
      // Unshared vertices give the solid parts flat, faceted low-poly shading.
      if (key !== 'leaf') mesh.geometry.computeVertexNormals();
      // Anchor the mesh at the tree's foot so the town batcher files it in the right cell.
      mesh.geometry.translate(-p.x, 0, -p.z); mesh.geometry.computeBoundingSphere(); mesh.position.set(p.x, 0, p.z);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData.landscape = true;
      triangles += mesh.geometry.attributes.position.count / 3; parent().add(mesh);
    }
    return triangles;
  }
  return { plant, wind, species: Object.keys(SPECIES) };
}
