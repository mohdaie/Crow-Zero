import * as T from 'three';

// Street props of a Malaysian town around 2001: kapcai motorcycles, red
// plastic warung chairs, LPG tong gas, the ice-cream freezer, soft-drink
// crates, a pillar post box, a payphone hood, tempayan, TV aerials on bamboo
// poles, Astro dishes, air-con boxes, timber utility poles and their wires.
// Plain parts are coloured per vertex with the landmarks' paint material, so
// they batch into the same per-cell draws; printed faces (posters, boards,
// signs, the freezer front) come from one painted atlas.
const TAU = Math.PI * 2;
const REGIONS = {
  aiskrim: [0, 0, 256, 256], menu: [256, 0, 256, 256], photostat: [512, 0, 256, 256], prabayar: [768, 0, 256, 256],
  gotong: [0, 256, 512, 128], merdeka: [0, 384, 512, 128], sekolah: [512, 256, 256, 256], telefon: [768, 256, 256, 128], pos: [768, 384, 256, 128]
};
function paintAtlas(c) {
  const text = (t, x, y, size, colour, weight = 800, width = 230, font = 'Arial, Helvetica, sans-serif') => { c.fillStyle = colour; c.font = `${weight} ${size}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y, width); };
  const frame = ([x, y, w, h], fill, edge, inset = 6) => { c.fillStyle = fill; c.fillRect(x, y, w, h); if (edge) { c.strokeStyle = edge; c.lineWidth = inset; c.strokeRect(x + inset / 2, y + inset / 2, w - inset, h - inset); } };
  // Ice-cream freezer front: red band, three ice lollies, a 30 sen price.
  frame(REGIONS.aiskrim, '#f6f1e4', '#c8322c', 10);
  c.fillStyle = '#c8322c'; c.fillRect(0, 0, 256, 70); text('AIS KRIM', 128, 38, 46, '#fff6e6', 900);
  [['#f2c84b', 64], ['#e8869a', 128], ['#7fb36a', 192]].forEach(([colour, x]) => { c.fillStyle = '#d9b27a'; c.fillRect(x - 5, 170, 10, 40); c.fillStyle = colour; c.beginPath(); c.roundRect(x - 26, 88, 52, 92, 20); c.fill(); });
  text('POTONG 30sen', 128, 232, 26, '#2a2a2e');
  // Warung price board in chalk.
  frame(REGIONS.menu, '#2f4a3c', '#8a6234', 14);
  text('MENU', 384, 40, 34, '#f4e9d0', 900);
  [['Nasi Lemak', 'RM1.00'], ['Roti Canai', '60sen'], ['Teh Tarik', '80sen'], ['Sirap Ais', '50sen'], ['Kuih', '20sen']].forEach(([a, b], i) => { c.textAlign = 'left'; c.font = '600 22px Arial, sans-serif'; c.fillStyle = '#f4e9d0'; c.fillText(a, 282, 82 + i * 36); c.textAlign = 'right'; c.fillStyle = '#f2c84b'; c.fillText(b, 494, 82 + i * 36); });
  // Stationers' photocopy board.
  frame(REGIONS.photostat, '#fbf8f0', '#2b5fa8', 10);
  text('PHOTOSTAT', 640, 62, 40, '#2b5fa8', 900); text('10 sen', 640, 120, 44, '#c8322c', 900); text('LAMINATE', 640, 176, 28, '#2a2a2e'); text('JILID · TAIP', 640, 214, 26, '#2a2a2e');
  // Prepaid reload cards, with a candy-bar phone of the time.
  frame(REGIONS.prabayar, '#f2c84b', '#2a2a2e', 8);
  text('KAD', 860, 46, 34, '#2a2a2e', 900); text('PRABAYAR', 860, 86, 34, '#2a2a2e', 900); text('ADA DIJUAL', 860, 222, 26, '#c8322c', 900);
  c.fillStyle = '#4c5560'; c.beginPath(); c.roundRect(948, 104, 52, 120, 16); c.fill(); c.fillStyle = '#b9d3a0'; c.fillRect(958, 118, 32, 28);
  c.fillStyle = '#d9dde2'; for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(962 + k * 12, 160 + r * 14, 4, 0, TAU); c.fill(); }
  // Cloth banners: the balai raya's gotong-royong and the 2001 Merdeka greeting.
  frame(REGIONS.gotong, '#fbf6ea', '#2b5fa8', 6);
  text('GOTONG-ROYONG PERDANA', 256, 300, 38, '#c8322c', 900, 480); text('AHAD · 8 PAGI · BALAI RAYA', 256, 348, 26, '#2b5fa8', 800, 480);
  frame(REGIONS.merdeka, '#fbf6ea', null);
  for (let i = 0; i < 14; i++) { c.fillStyle = i % 2 ? '#fbf6ea' : '#c8322c'; c.fillRect(0, 384 + i * 128 / 14, 56, 128 / 14 + .5); c.fillRect(456, 384 + i * 128 / 14, 56, 128 / 14 + .5); }
  c.fillStyle = '#1f3a8a'; c.fillRect(0, 384, 56, 70); c.fillRect(456, 384, 56, 70);
  c.fillStyle = '#f2c84b'; for (const x of [28, 484]) { c.beginPath(); c.arc(x, 419, 20, 0, TAU); c.fill(); c.fillStyle = '#1f3a8a'; c.beginPath(); c.arc(x + 7, 419, 17, 0, TAU); c.fill(); c.fillStyle = '#f2c84b'; }
  text('SELAMAT HARI KEBANGSAAN', 256, 424, 30, '#1f3a8a', 900, 380); text('KE-44 · 2001', 256, 470, 30, '#c8322c', 900, 380);
  // Yellow diamond: children crossing, at the school gate.
  c.save(); c.translate(640, 384); c.rotate(Math.PI / 4); c.fillStyle = '#f2c84b'; c.fillRect(-84, -84, 168, 168); c.strokeStyle = '#2a2a2e'; c.lineWidth = 10; c.strokeRect(-78, -78, 156, 156); c.restore();
  c.fillStyle = '#2a2a2e';
  for (const [x, s] of [[612, 1], [664, .85]]) { c.beginPath(); c.arc(x, 340 + (1 - s) * 30, 13 * s, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - 14 * s, 360 + (1 - s) * 30); c.lineTo(x + 14 * s, 360 + (1 - s) * 30); c.lineTo(x + 18 * s, 420); c.lineTo(x + 6 * s, 420); c.lineTo(x, 400); c.lineTo(x - 6 * s, 420); c.lineTo(x - 18 * s, 420); c.closePath(); c.fill(); }
  text('SEKOLAH', 640, 440, 24, '#2a2a2e', 900);
  // Payphone sign and the post-box plate.
  frame(REGIONS.telefon, '#1f5aa0', '#f6f1e4', 6);
  text('TELEFON', 896, 306, 40, '#f6f1e4', 900); text('KAD · SYILING', 896, 350, 22, '#f2c84b');
  frame(REGIONS.pos, '#c2312f', '#f6f1e4', 6);
  text('SURAT', 896, 432, 44, '#f6f1e4', 900); text('POS', 896, 476, 26, '#f6f1e4');
}

export function createProps({ paint, register, toon }) {
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 512; paintAtlas(canvas.getContext('2d'));
  const atlas = new T.CanvasTexture(canvas); atlas.colorSpace = T.SRGBColorSpace; atlas.anisotropy = 4;
  const print = register('prop-print', toon(0xffffff, { map: atlas, alphaTest: .5 }));
  const tint = new T.Color();
  let parent = null;
  function add(geometry, hex, x, y, z, rot, material = paint) {
    if (hex !== null) {
      tint.set(hex);
      const n = geometry.attributes.position.count, data = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { data[i * 3] = tint.r; data[i * 3 + 1] = tint.g; data[i * 3 + 2] = tint.b; }
      geometry.setAttribute('color', new T.BufferAttribute(data, 3));
    }
    const m = new T.Mesh(geometry, material); m.position.set(x, y, z); if (rot) m.rotation.set(...rot);
    m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  const box = (w, h, d, hex, x, y, z, rot) => add(new T.BoxGeometry(w, h, d), hex, x, y, z, rot);
  const cyl = (r1, r2, h, hex, x, y, z, seg = 8, rot) => add(new T.CylinderGeometry(r1, r2, h, seg), hex, x, y, z, rot);
  const ring = (r, tube, hex, x, y, z, rot, seg = 12) => add(new T.TorusGeometry(r, tube, 4, seg), hex, x, y, z, rot);
  function beam(a, b, r, hex, seg = 5) {
    const s = new T.Vector3(...a), e = new T.Vector3(...b), d = e.clone().sub(s);
    const m = add(new T.CylinderGeometry(r, r, d.length(), seg), hex, ...s.clone().add(e).multiplyScalar(.5).toArray());
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); return m;
  }
  // A printed face: a region of the atlas on a plane facing +z.
  function printed(region, w, h, x, y, z, rot) {
    const [rx, ry, rw, rh] = REGIONS[region], g = new T.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (rx + uv.getX(i) * rw) / 1024, 1 - (ry + (1 - uv.getY(i)) * rh) / 512);
    return add(g, null, x, y, z, rot, print);
  }
  const PALETTE = { red: 0xc8322c, blue: 0x2f6fb0, maroon: 0x7a2a3a, cream: 0xeee3c8, black: 0x2a2a2e, chrome: 0xb9bdc4, wood: 0x8a6234, white: 0xf3f0e6 };

  const build = {
    // Kapcai: step-through 100 cc bike, leg shield, rear rack, long seat.
    motor(v) {
      const body = [PALETTE.red, PALETTE.blue, PALETTE.maroon][v % 3];
      for (const x of [-.62, .62]) { ring(.27, .06, PALETTE.black, x, .3, 0, null, 14); cyl(.07, .07, .14, PALETTE.chrome, x, .3, 0, 8, [Math.PI / 2, 0, 0]); }
      box(.62, .26, .26, body, -.18, .6, 0); box(.5, .16, .3, body, -.45, .72, 0);
      box(.1, .52, .38, PALETTE.cream, .3, .58, 0, [0, 0, -.28]);
      beam([.62, .3, .07], [.42, 1.0, .07], .025, PALETTE.chrome); beam([.62, .3, -.07], [.42, 1.0, -.07], .025, PALETTE.chrome);
      box(.18, .16, .22, body, .45, 1.02, 0); cyl(.07, .07, .04, PALETTE.white, .55, 1.02, 0, 10, [0, 0, Math.PI / 2]);
      beam([.4, 1.1, -.32], [.4, 1.1, .32], .018, PALETTE.black);
      box(.72, .1, .28, PALETTE.black, -.22, .82, 0); box(.36, .03, .26, PALETTE.chrome, -.62, .8, 0);
      beam([0, .34, .16], [-.72, .4, .16], .035, PALETTE.chrome); box(.3, .06, .5, PALETTE.black, .02, .38, 0);
    },
    // Red or blue plastic warung table and four stacking chairs.
    chairs(v) {
      const c = v ? PALETTE.blue : PALETTE.red;
      cyl(.46, .46, .04, c, 0, .72, 0, 14); cyl(.05, .2, .7, c, 0, .36, 0, 8);
      for (let i = 0; i < 4; i++) {
        const a = i * TAU / 4 + .4, x = Math.sin(a) * .78, z = Math.cos(a) * .78;
        const seat = new T.Group(); seat.position.set(x, 0, z); seat.rotation.y = a; parent.add(seat);
        const prev = parent; parent = seat;
        box(.42, .04, .4, c, 0, .44, 0); box(.42, .4, .04, c, 0, .66, .2, [-.12, 0, 0]);
        for (const [lx, lz] of [[-.18, -.17], [.18, -.17], [-.18, .17], [.18, .17]]) box(.035, .44, .035, c, lx, .22, lz);
        parent = prev;
      }
    },
    // Marble-topped kopitiam table and three wooden stools.
    kopitiam() {
      cyl(.4, .4, .05, 0xeeeeea, 0, .74, 0, 16); cyl(.05, .05, .7, PALETTE.black, 0, .37, 0, 6); cyl(.22, .26, .04, PALETTE.black, 0, .02, 0, 10);
      for (let i = 0; i < 3; i++) { const a = i * TAU / 3, x = Math.sin(a) * .62, z = Math.cos(a) * .62; cyl(.17, .15, .05, PALETTE.wood, x, .46, z, 10); cyl(.06, .1, .44, 0x6b4a2f, x, .22, z, 6); }
    },
    // LPG tong gas with its red valve guard.
    gas() { cyl(.17, .17, .5, 0x3f7f5a, 0, .27, 0, 10); add(new T.SphereGeometry(.17, 10, 5, 0, TAU, 0, Math.PI / 2), 0x3f7f5a, 0, .52, 0); ring(.08, .02, PALETTE.red, 0, .66, 0, [Math.PI / 2, 0, 0], 10); cyl(.18, .18, .03, PALETTE.black, 0, .02, 0, 10); },
    // Chest freezer of ice lollies, its front printed.
    freezer() {
      box(1.1, .78, .62, PALETTE.white, 0, .47, 0); box(1.12, .08, .64, 0xdcd8cc, 0, .9, 0); box(1.1, .06, .58, PALETTE.black, 0, .05, 0);
      printed('aiskrim', .66, .56, 0, .5, .312);
    },
    // Two stacks of soft-drink crates with bottle tops showing.
    crates() {
      [[-.24, 3, 0xe5b83a], [.24, 2, PALETTE.red]].forEach(([x, n, c]) => {
        for (let i = 0; i < n; i++) box(.44, .26, .34, c, x, .14 + i * .27, 0);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) cyl(.035, .035, .06, 0x2b3a2a, x - .13 + a * .13, .29 + (n - 1) * .27, -.07 + b * .14, 6);
      });
    },
    // Pillar post box: red, domed, with a slot and plate.
    postbox() {
      cyl(.24, .24, .06, 0x5a5a5a, 0, .03, 0, 12); cyl(.21, .21, .92, 0xc2312f, 0, .52, 0, 14);
      add(new T.SphereGeometry(.22, 14, 5, 0, TAU, 0, Math.PI / 2), 0xc2312f, 0, .98, 0); box(.2, .03, .04, PALETTE.black, 0, .86, .2);
      printed('pos', .3, .15, 0, .66, .215);
    },
    // Payphone under a hooded booth on a post.
    phone() {
      box(.12, 1.2, .12, 0x6e7680, 0, .6, -.26); const hood = 0xe9dfc6;
      box(.72, .95, .05, hood, 0, 1.6, -.28); for (const s of [-1, 1]) box(.05, .95, .52, hood, s * .36, 1.6, -.03); box(.8, .06, .6, 0x2f6fb0, 0, 2.1, -.03);
      box(.3, .46, .12, 0x7b8590, 0, 1.55, -.2); box(.07, .22, .06, PALETTE.black, -.11, 1.58, -.12); box(.12, .1, .02, 0x9fc2a8, .05, 1.68, -.135);
      printed('telefon', .6, .3, 0, 2.3, -.03);
      printed('telefon', .6, .3, 0, 2.3, -.04, [0, Math.PI, 0]);
    },
    // Round green rubbish bin with a lid.
    bin() { cyl(.27, .3, .72, 0x3d6b4e, 0, .36, 0, 12); cyl(.32, .32, .06, 0x2f5640, 0, .75, 0, 12); box(.16, .04, .04, 0x2f5640, 0, .8, 0); },
    // Clay tempayan with a wooden lid and a coconut-shell dipper.
    tempayan() {
      const g = new T.LatheGeometry([[.16, 0], [.3, .14], [.35, .34], [.3, .56], [.2, .66], [.21, .7]].map(([r, y]) => new T.Vector2(r, y)), 12);
      add(g, 0x8a5132, 0, 0, 0); cyl(.23, .23, .04, PALETTE.wood, 0, .72, 0, 12);
      beam([.05, .74, 0], [.38, .95, 0], .015, 0x6b4a2f, 4); add(new T.SphereGeometry(.07, 8, 4, 0, TAU, 0, Math.PI / 2), 0x5a3a24, .04, .78, 0, [Math.PI, 0, 0]);
    },
    // Blue oil drum used for water or rubbish.
    drum() { cyl(.3, .3, .88, 0x2f5a8a, 0, .44, 0, 12); for (const y of [.3, .6]) ring(.305, .015, 0x24476e, 0, y, 0, [Math.PI / 2, 0, 0], 14); cyl(.28, .28, .02, 0x24476e, 0, .89, 0, 12); },
    // Ais kacang push cart under a red umbrella.
    cart() {
      box(1.4, .7, .7, 0x4f8a6a, 0, .75, 0); box(1.44, .05, .74, PALETTE.white, 0, 1.12, 0); box(.6, .34, .5, 0xd9e8e8, -.3, 1.32, 0);
      for (const s of [-1, 1]) { ring(.28, .04, PALETTE.black, .3, .3, s * .4, null, 12); beam([.7, .9, s * .3], [1.2, .95, s * .3], .025, PALETTE.chrome, 4); }
      cyl(.04, .04, .4, PALETTE.wood, -.6, .2, 0, 5); beam([.55, 1.1, 0], [.55, 2.1, 0], .03, PALETTE.chrome, 4);
      add(new T.ConeGeometry(.95, .35, 10, 1, true), PALETTE.red, .55, 2.25, 0);
      cyl(.08, .06, .2, 0xe8869a, -.45, 1.25, .1, 8); cyl(.08, .06, .2, 0xf2c84b, -.2, 1.25, .1, 8);
    },
    // Wooden shoe rack outside the mosque, with selipar on it.
    rack() {
      for (const s of [-1, 1]) box(.05, .7, .35, PALETTE.wood, s * .7, .35, 0);
      for (const y of [.1, .36, .64]) box(1.4, .04, .35, PALETTE.wood, 0, y, 0);
      [0x2f6fb0, PALETTE.red, PALETTE.black, 0x3f7f5a, 0x8a6234].forEach((c, i) => { for (const d of [-.05, .05]) box(.09, .025, .25, c, -.5 + i * .25 + d, i % 2 ? .4 : .14, 0); });
    },
    // Standing A-frame board, printed both sides.
    board(v, region) {
      for (const s of [-1, 1]) box(.62, .82, .03, PALETTE.wood, 0, .45, s * .14, [s * -.17, 0, 0]);
      printed(region, .54, .54, 0, .48, .162, [-.17, 0, 0]); printed(region, .54, .54, 0, .48, -.162, [-.17, Math.PI, 0]);
    },
    // Ampaian: bamboo poles and a line of washing.
    ampaian() {
      for (const x of [-1.4, 1.4]) { cyl(.05, .05, 2.1, 0x8a7a55, x, 1.05, 0, 6); box(.5, .05, .05, 0x8a7a55, x, 2.05, 0); }
      for (const z of [-.2, .2]) beam([-1.4, 2.05, z], [1.4, 2.05, z], .008, 0xc3bd9d, 3);
      [[0xd1c2a7, .6], [0x809eb0, .9], [0xb88461, .55], [0xbabf94, .75]].forEach(([c, h], i) => box(.5, h, .02, c, -1 + i * .62, 2.02 - h / 2, (i % 2 ? .2 : -.2)));
    },
    // Kain rentang: a cloth banner between two bamboo poles.
    banner(v, region) {
      for (const x of [-2.2, 2.2]) cyl(.05, .06, 3, 0x8a7a55, x, 1.5, 0, 6);
      printed(region, 3.9, .98, 0, 2.3, .03); printed(region, 3.9, .98, 0, 2.3, -.03, [0, Math.PI, 0]);
    },
    // A yellow warning sign on a grey post, facing the road.
    roadsign(v, region) { cyl(.04, .04, 2.3, 0x8a9096, 0, 1.15, 0, 6); printed(region, .78, .78, 0, 2.15, .05); box(.56, .56, .02, 0x8a9096, 0, 2.15, .03, [0, 0, Math.PI / 4]); },
    // TV aerial: a tall pole lashed beside the house, a fishbone at the top.
    antenna() {
      cyl(.045, .06, 7.6, 0x9aa0a0, 0, 3.8, 0, 6);
      beam([0, 7.3, -.8], [0, 7.3, .8], .02, 0x9aa0a0, 4);
      for (let i = 0; i < 6; i++) { const z = -.7 + i * .28, h = .55 - i * .06; beam([-h, 7.3, z], [h, 7.3, z], .01, 0xc9cdd0, 3); }
      beam([0, 6.9, .03], [0, 3.2, .06], .01, PALETTE.black, 3);
    },
    // Astro dish on a wall bracket.
    dish() {
      box(.08, .08, .3, 0x8a9096, 0, 0, .15);
      cyl(.38, .07, .12, 0xf1efe8, 0, .05, .34, 14, [Math.PI / 2 - .35, 0, 0]);
      beam([0, -.25, .38], [0, .02, .74], .015, 0x8a9096, 4); box(.08, .1, .1, PALETTE.black, 0, .04, .76);
    },
    // Window air-con box.
    aircon() { box(.8, .52, .3, 0xe3dfd2, 0, 0, .15); ring(.16, .03, 0x9aa0a0, .18, 0, .31, null, 12); cyl(.12, .12, .02, 0x5a5a5a, .18, 0, .3, 10, [Math.PI / 2, 0, 0]); for (let i = 0; i < 4; i++) box(.24, .02, .02, 0x9aa0a0, -.2, -.15 + i * .1, .31); beam([-.38, -.2, .15], [-.38, -1.6, .15], .02, 0xd8d0bf, 4); },
    // A poster on the wall.
    poster(v, region) { const [, , w, h] = REGIONS[region]; printed(region, .8 * w / 256, .8 * h / 256, 0, 0, .02); }
  };
  // Builds one prop at a world position: its y is the ground height (or the
  // mounting height for wall props), its heading turns its +z front.
  function place(name, x, y, z, heading, variant = 0, region = null) {
    const group = new T.Group(); group.position.set(x, y, z); group.rotation.y = heading;
    parent = group; build[name](typeof variant === 'number' ? variant : 0, typeof variant === 'string' ? variant : region); parent = null;
    return group;
  }
  // Timber utility pole: crossarm, insulators, and three attachment points.
  function pole(x, y, z, alongX) {
    const group = new T.Group(); group.position.set(x, y, z); group.rotation.y = alongX ? 0 : Math.PI / 2; parent = group;
    cyl(.11, .15, 8, 0x6b5a45, 0, 4, 0, 6); box(.12, .12, 1.5, 0x6b5a45, 0, 7.5, 0);
    for (const s of [-.6, 0, .6]) cyl(.04, .05, .14, PALETTE.white, 0, 7.63, s, 6);
    beam([0, 7.2, .1], [0, 7.5, .55], .03, 0x6b5a45, 4);
    parent = null;
    const points = [-.6, 0, .6].map(s => alongX ? [x, y + 7.7, z + s] : [x - s, y + 7.7, z]);
    return { group, points };
  }
  // Sagging lines between two poles' attachment points.
  function wires(a, b) {
    const group = new T.Group(); parent = group;
    for (let k = 0; k < a.length; k++) {
      const p = a[k], q = b[k], steps = 6, pts = [];
      for (let i = 0; i <= steps; i++) { const t = i / steps; pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t - .7 * 4 * t * (1 - t), p[2] + (q[2] - p[2]) * t]); }
      for (let i = 0; i < steps; i++) beam(pts[i], pts[i + 1], .014, 0x2f2f33, 3);
    }
    parent = null; return group;
  }
  return { place, pole, wires, regions: REGIONS };
}
