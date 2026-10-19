import * as T from 'three';
import { toon, comicEdges, inkViewport } from './illustration.js?v=0.1.0';
import { PLAN, BUILDINGS, DISTRICTS, ROADS, BRIDGES, RIVER, TOWN_BOUNDS, GROUND, UNITS, customLook, FLOORS, SPOTS, PASSERSBY, STREET_PROPS, PROPS, PLACES, KINDS, toWorld } from './town-layout.js?v=0.1.0';
import { createProps } from './props.js?v=0.1.0';
import { createStorefronts } from './storefronts.js?v=0.1.0';
import { createLandmarks } from './landmarks.js?v=0.1.0';
import { loadTownCars } from './town-cars.js?v=0.1.0';
import { loadTownBus } from './town-bus.js?v=0.1.0';
import { loadPetrolPump } from './petrol-pump.js?v=0.1.0';
import { createTrees } from './trees.js?v=0.1.0';
import { createGrass, grassMask, maskTexture, groundMaterial } from './grass.js?v=0.9.0';
import { roadSurfaces } from './road-surfaces.js?v=0.1.0';
import { paintSkyline, createCityRing } from './skyline.js?v=0.2.0';
export const places = BUILDINGS;
export async function makeWorld(canvas) {
  // Wait for the local fallback font before painting permanent sign textures.
  await document.fonts.load('bold 35px sans-serif');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const carLoad = loadTownCars(renderer).catch(error => { console.warn('Town car model unavailable; using the original sedans', error); return null; });
  const busLoad = loadTownBus(renderer).catch(error => { console.warn('Town bus model unavailable; using the original bus', error); return null; });
  const pumpLoad = loadPetrolPump().catch(error => { console.warn('Petrol pump model unavailable; using the original pumps', error); return null; });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.setClearColor(0xc8dce0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  renderer.toneMappingExposure = 1.12;
  const scene = new T.Scene();
  scene.background = new T.Color(0xc8dce0);
  scene.fog = new T.Fog(0xc8dce0, 110, 300);
  const camera = new T.PerspectiveCamera(43, 1, .1, Math.max(700, Math.hypot(GROUND.maxX-GROUND.minX,GROUND.maxZ-GROUND.minZ)*2));
  // Units of the town plan are built in their own frame: `root` is the group
  // being filled and `placing` the unit whose transform colliders follow.
  let root = scene, placing = null;
  const hemi = new T.HemisphereLight(0xe5f3ff, 0x82917a, 1.20);
  scene.add(hemi);
  const sun = new T.DirectionalLight(0xffedda, 1.30);
  sun.position.set(-35, 70, 30);
  sun.castShadow = true;
  const shadowSize = matchMedia('(pointer:coarse)').matches ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 200 });
  sun.shadow.bias = -.0006;
  sun.shadow.normalBias = .03;
  scene.add(sun);
  scene.add(sun.target);
  // Original procedural textures add surface variation without external assets.
  let seed = 2001;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function surface(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = kind === 'grass' ? '#becf88' : kind === 'dirt' ? '#efd6ac' : kind==='asphalt' ? '#8eaaaa' : '#f4efe4'; ctx.fillRect(0,0,256,256);
    for(let i=0;i<1000;i++) { const a=rand()*.035; ctx.fillStyle=rand()>.5?`rgba(55,67,38,${a})`:`rgba(255,252,222,${a})`; ctx.fillRect(rand()*256,rand()*256,kind==='wood'?rand()*30+4:rand()*5+1,kind==='wood'?.7:rand()*3+1); }
    if(kind==='wood') for(let y=0;y<256;y+=32){ctx.fillStyle='#67533935';ctx.fillRect(0,y,256,1);ctx.fillStyle='#ffffff35';ctx.fillRect(0,y+2,256,1);}
    if(kind==='grass') for(let i=0;i<180;i++){ctx.strokeStyle=rand()>.5?'#77946365':'#e0e9b675';const x=rand()*256,y=rand()*256;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+rand()*5-2,y-3-rand()*3);ctx.stroke();}
    if(kind==='asphalt')for(let i=0;i<900;i++){ctx.fillStyle=i%2?'#ffffff25':'#253b3925';ctx.fillRect(rand()*256,rand()*256,1,1);}
    if(kind==='tile'){ctx.fillStyle='#e9d8c3';ctx.fillRect(0,0,256,256);for(let row=0;row<12;row++)for(let col=0;col<20;col++){const x=col*14-(row%2)*7,y=row*23;ctx.fillStyle=(row+col)%3?'#e8c5a1':'#d4a480';ctx.fillRect(x,y,13,22);ctx.strokeStyle='#71544d80';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+2,y);ctx.quadraticCurveTo(x+6,y+11,x+2,y+22);ctx.stroke();ctx.strokeRect(x,y,13,22);}}
    if(kind==='plaster')for(let i=0;i<3000;i++){ctx.fillStyle=i%2?'#ffffff30':'#afa99a20';ctx.fillRect(rand()*256,rand()*256,1+rand()*3,1);}
    // Weathered lime plaster: angular ochre, peach and grey patches, drawn
    // with wrapped copies so the tile repeats without seams.
    if(kind==='weathered'){ctx.fillStyle='#f3e6c8';ctx.fillRect(0,0,256,256);const tones=['rgba(234,190,110,.42)','rgba(226,160,108,.34)','rgba(178,171,152,.3)','rgba(255,249,232,.5)','rgba(240,210,146,.4)'];for(let i=0;i<46;i++){ctx.fillStyle=tones[i%tones.length];const cx=rand()*256,cy=rand()*256,r=14+rand()*46,n=5+Math.floor(rand()*3),pts=[];for(let k=0;k<n;k++){const a=k/n*Math.PI*2+rand()*.6,rr=r*(.55+rand()*.6);pts.push([Math.cos(a)*rr,Math.sin(a)*rr*.75]);}for(const ox of [-256,0,256])for(const oy of [-256,0,256]){ctx.beginPath();for(const [px,py] of pts)ctx.lineTo(cx+px+ox,cy+py+oy);ctx.closePath();ctx.fill();}}}
    // Five-foot-way floor: terracotta and cream encaustic squares.
    if(kind==='floor')for(let row=0;row<8;row++)for(let col=0;col<8;col++){ctx.fillStyle=(row+col)%2?'#e9dcc0':'#b9654b';ctx.fillRect(col*32,row*32,32,32);ctx.strokeStyle='#8c7a68';ctx.lineWidth=1.5;ctx.strokeRect(col*32+.75,row*32+.75,30.5,30.5);}
    // Clay roof tiles laid in rows down the slope.
    if(kind==='clay'){ctx.fillStyle='#b95a39';ctx.fillRect(0,0,256,256);for(let row=0;row<8;row++)for(let col=0;col<10;col++){const x=col*25.6,y=row*32;ctx.fillStyle=['#c4643f','#b95a39','#cc6b46','#bf6140'][(row*3+col)%4];ctx.fillRect(x+1,y,23.6,30);ctx.fillStyle='rgba(255,196,150,.35)';ctx.fillRect(x+8,y+2,7,26);ctx.fillStyle='rgba(90,35,22,.45)';ctx.fillRect(x,y,2,32);ctx.fillRect(x,y+28,25.6,4);}}
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace; texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const unit=['wood','weathered','floor','clay'].includes(kind);texture.repeat.set(unit?1:24,unit?1:24); return texture;
  }
  const loader=new T.TextureLoader();
  const [grass,wood]=await Promise.all(['kampung-grass.webp','kampung-timber.webp'].map(name=>loader.loadAsync(new URL('../assets/textures/'+name,import.meta.url).href)));
  for(const texture of [grass,wood]){texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
  wood.repeat.set(2,2);
  const textures = {grass:surface('grass'), dirt:surface('dirt'), wood, asphalt:surface('asphalt'), plaster:surface('plaster'), tile:surface('tile'), weathered:surface('weathered'), floor:surface('floor'), clay:surface('clay')};
  textures.dirt.repeat.set(1,1);textures.asphalt.repeat.set(1,1);textures.plaster.repeat.set(2,2);textures.tile.repeat.set(1,1);
  // City maps: a painted city skyline wraps the streets and a 3D tower ring
  // (skyline.js) fills the middle distance. Jungle maps (plan.theme
  // 'jungle'): the painted hills and palms, and a forest wall of trees.
  const jungle=PLAN.theme==='jungle';
  const panorama=jungle?await loader.loadAsync(new URL('../assets/textures/illustrated-horizon.webp',import.meta.url).href):new T.CanvasTexture(paintSkyline());
  panorama.colorSpace=T.SRGBColorSpace;panorama.wrapS=T.RepeatWrapping;panorama.repeat.x=3;
  scene.background=new T.Color(0x8ab8d1);
  const horizonRadius=Math.max(210,Math.hypot(Math.max(-GROUND.minX,GROUND.maxX),Math.max(-GROUND.minZ,GROUND.maxZ))+60);
  const horizon=new T.Mesh(new T.CylinderGeometry(horizonRadius,horizonRadius,160,64,1,true),new T.MeshBasicMaterial({map:panorama,side:T.BackSide,fog:false}));
  horizon.position.y=54;scene.add(horizon);
  const mats = new Map();
  if(jungle){const floor=new T.Mesh(new T.PlaneGeometry(horizonRadius*2.2,horizonRadius*2.2),toon(0x5b8353));floor.rotation.x=-Math.PI/2;floor.position.y=-.09;floor.receiveShadow=true;floor.userData.landscape=true;mats.set('forest-floor',floor.material);scene.add(floor);}
  else createCityRing({scene,toon,register:(key,material)=>{mats.set(key,material);return material;},ground:GROUND,roads:ROADS,bounds:TOWN_BOUNDS,outer:horizonRadius-8});
  function textured(color,kind) {
    const key=kind+color;
    if(!mats.has(key)){
      const material=toon(kind==='wood'?new T.Color(color).lerp(new T.Color(0xffffff),.40):color,{map:textures[kind]});

      mats.set(key,material);
    }
    return mats.get(key);
  }
  const scenePalette=[0xe5a88c,0x9fc8ba,0xf0d18d,0xd99cb6,0x89b0ca,0x71967a,0x755d42,0xb5986a,0xe8dbb8,0xcbbd99,0xb3bca6,0x8a946f,0x677b69,0x4e6b62,0x344e42,0x5b8353,0x749458,0xab6046,0xbf815e,0xb28272,0xd4b24b,0xf4e9d0,0x414b3f];
  const mat = color => {
    if (color?.isMaterial) return color;
    const rgb=new T.Color(color);let closest=color,best=Infinity;
    for(const candidate of scenePalette){const c=new T.Color(candidate),distance=(rgb.r-c.r)**2+(rgb.g-c.g)**2+(rgb.b-c.b)**2;if(distance<best){best=distance;closest=candidate;}}color=closest;
    if (!mats.has(color)) mats.set(color, toon(color));
    return mats.get(color);
  };
  const colliders = [];
  const animated = [];
  const homeSigns = [];
  function mesh(geometry, color, x, y, z, parent = root) {
    const m = new T.Mesh(geometry, mat(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(w, h, d, color, x, y, z, parent) {
    const geometry=new T.BoxGeometry(w,h,d);
    if(color?.isMaterial&&[textures.grass,textures.dirt,textures.asphalt].includes(color.map)){
      const pos=geometry.attributes.position,uv=geometry.attributes.uv;
      for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+x)/6,(pos.getZ(i)+z)/6);
    }
    const object=mesh(geometry,color,x,y,z,parent);if(h>=2.7&&w>=5&&d>=4)object.userData.cameraOccluder=true;return object;
  }
  function beam(a,b,r,color,parent=root){const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=mesh(new T.CylinderGeometry(r,r*.85,delta.length(),6),color,...start.clone().add(end).multiplyScalar(.5).toArray(),parent);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}
  function softBox(w,h,d,color,x,y,z,parent,r=.12){
    r=Math.min(r,w/3,h/3,d/3);const g=new T.BoxGeometry(w,h,d,4,4,4),p=g.attributes.position,n=g.attributes.normal;
    for(let i=0;i<p.count;i++){
      const v=new T.Vector3(p.getX(i),p.getY(i),p.getZ(i)),core=new T.Vector3(T.MathUtils.clamp(v.x,-w/2+r,w/2-r),T.MathUtils.clamp(v.y,-h/2+r,h/2-r),T.MathUtils.clamp(v.z,-d/2+r,d/2-r)),normal=v.clone().sub(core).normalize();v.copy(core).addScaledVector(normal,r);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    const object=mesh(g,color,x,y,z,parent);if(h>=2.5&&w>=2.5&&d>=4)object.userData.cameraOccluder=true;return object;
  }
  function cylinder(r1, r2, h, color, x, y, z, parent, segments = 8) { return mesh(new T.CylinderGeometry(r1, r2, h, segments), color, x, y, z, parent); }
  function collider(x, z, w, d, kind='solid') {
    if(placing){const [wx,wz]=toWorld(placing,x,z),swap=placing.rot%2;colliders.push({x:wx,z:wz,w:swap?d:w,d:swap?w:d,kind});}
    else colliders.push({ x, z, w, d, kind });
  }
  // Spots crows love (bin rims, bag piles), in world space, for the crow game.
  const hotspots=[];
  function hotspot(x,y,z){const [wx,wz]=placing?toWorld(placing,x,z):[x,z];hotspots.push({x:wx,y,z:wz});}
  function roundCollider(x,z,r,kind='trunk'){const [wx,wz]=placing?toWorld(placing,x,z):[x,z];colliders.push({x:wx,z:wz,r,kind});}
  function place(unit,build){
    const group=new T.Group();group.position.set(unit.x,0,unit.z);group.rotation.y=unit.rot*Math.PI/2;scene.add(group);
    const previous=[root,placing];root=group;placing=unit;
    try{build(unit);}finally{[root,placing]=previous;}
    return group;
  }
  function sign(text, x, y, z, width = 5, color = '#294e42', parent = root) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#f5e6bd'; ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = color; ctx.font = 'bold 35px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 65, 465);
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
    if (text === 'RUMAH AMIR' || text === 'RUMAH NUR') homeSigns.push({ friend: text === 'RUMAH NUR', update: name => {
      ctx.fillStyle = '#f5e6bd'; ctx.fillRect(0,0,512,128); ctx.strokeStyle = color; ctx.lineWidth=8; ctx.strokeRect(8,8,496,112);
      ctx.fillStyle=color; ctx.fillText('RUMAH ' + name.toUpperCase(),256,65,465); texture.needsUpdate=true;
    } });
    const m = new T.Mesh(new T.PlaneGeometry(width, width / 4), new T.MeshBasicMaterial({ map: texture })); m.position.set(x, y, z); parent.add(m); return m;
  }
  // PETRONAS branding as it looked around 2001: turquoise lettering on ivory,
  // with the long turquoise band beside it on wide fascias.
  const brandTeal='#1d8e91',brandIvory='#eae7da';
  function brandPanel(w,h,x,y,z,turn=0,band=false,parent=root){
    const c=document.createElement('canvas');c.height=128;c.width=Math.min(2048,Math.round(128*w/h));
    const ctx=c.getContext('2d');ctx.fillStyle=brandIvory;ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle=brandTeal;ctx.font='bold 84px sans-serif';ctx.textBaseline='middle';
    const text='PETRONAS',space=12,glyphs=[...text].map(ch=>ctx.measureText(ch).width),run=glyphs.reduce((a,b)=>a+b,0)+space*(text.length-1);
    let px=band?48:(c.width-run)/2;
    for(let i=0;i<text.length;i++){ctx.fillText(text[i],px,68);px+=glyphs[i]+space;}
    if(band)ctx.fillRect(px+36,34,c.width-px-36,60);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture}));m.position.set(x,y,z);m.rotation.y=turn;parent.add(m);return m;
  }
  const glass=toon(0x75a6aa);mats.set('window-glass',glass);
  function windowDetail(x,y,z,w=1.6,h=1.5){
    box(w,h,.05,glass,x,y,z);
    for(const side of [-1,1])box(.085,h+.18,.12,0xece1c4,x+side*(w/2+.03),y,z+.04);
    for(const side of [-1,1])box(w+.2,.085,.12,0xece1c4,x,y+side*(h/2+.04),z+.04);
    box(.045,h,.08,0xc2c8b2,x,y,z+.045);box(w,.045,.08,0xc2c8b2,x,y,z+.045);
    const glint=box(w*.4,.035,.015,0xa3bdc2,x-w*.12,y+h*.26,z+.075);glint.rotation.z=.1;
  }
  function malaysianFlag(x,y,z,width=1.5){
    const c=document.createElement('canvas');c.width=280;c.height=140;const ctx=c.getContext('2d');
    for(let i=0;i<14;i++){ctx.fillStyle=i%2?'#f4eee0':'#b9443d';ctx.fillRect(0,i*10,280,10);}
    ctx.fillStyle='#28446a';ctx.fillRect(0,0,140,80);ctx.fillStyle='#f0c85b';ctx.beginPath();ctx.arc(45,40,25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#28446a';ctx.beginPath();ctx.arc(53,36,22,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f0c85b';ctx.beginPath();for(let i=0;i<28;i++){const a=i*Math.PI/14-Math.PI/2,r=i%2?11:22;const px=100+Math.cos(a)*r,py=40+Math.sin(a)*r;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const cloth=toon(0xffffff,{map:texture,side:T.DoubleSide});mats.set('flag'+x+z,cloth);
    const g=new T.PlaneGeometry(width,width/2,12,2),pos=g.attributes.position;for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin((pos.getX(i)+width/2)*5)*.055);g.computeVertexNormals();return mesh(g,cloth,x,y,z);
  }
  function roof(w, d, x, y, z, color, parent = root) {
    // Long pitched roof with a horizontal ridge along X.
    const vertices = new Float32Array([-w/2,0,-d/2,w/2,0,-d/2,-w/2,2,0,w/2,2,0,-w/2,0,d/2,w/2,0,d/2]);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(vertices, 3));
    g.setIndex([0,2,1,1,2,3,2,4,3,3,4,5,0,4,2,1,3,5,0,1,4,1,5,4]);g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,0,.5,1,.5,0,1,1,1],2));
    const flat = g.toNonIndexed(); flat.computeVertexNormals(); g.dispose();
    const m=mesh(flat,textured(color,'tile'),x,y,z,parent);m.userData.cameraOccluder=true;
    const ridge=cylinder(.095,.095,w+.15,color,x,y+2.02,z,parent,8);ridge.rotation.z=Math.PI/2;
    for(const side of [-1,1]){beam([x-w/2,y,z+side*d/2],[x-w/2,y+2,z],.075,0xe0c493,parent);beam([x+w/2,y,z+side*d/2],[x+w/2,y+2,z],.075,0xe0c493,parent);}
    return m;
  }
  function house(x, z, color = 0xc8aa75, w = 9, d = 7, label = '', stilt = true) {
    const floor = stilt ? 1.4 : .3;
    box(w, .35, d, 0x816145, x, floor, z);
    box(w, 3.6, d, textured(color,'wood'), x, floor + 1.9, z);
    roof(w + 1.4, d + 1.5, x, floor + 3.7, z, 0x8b5442);
    for (const a of [-1, 1]) for (const b of [-1, 1]) cylinder(.18,.18,floor,0x66513c,x+a*(w/2-.4),floor/2,z+b*(d/2-.4));
    for (const a of [-1, 1]) { box(1.6, 1.5, .15, 0x455f5d, x+a*w*.29, floor+2, z+d/2+.06); box(1.75,.15,.24,0xf1d9a7,x+a*w*.29,floor+2.85,z+d/2+.15); }
    box(1.5,2.7,.12,0x674c37,x,floor+1.5,z+d/2+.08);
    box(w+1, .25, 2.3, textured(0xbaa078,'wood'),x,floor,z+d/2+1.1);
    for(let i=0;i<4;i++) box(2,.25+(i*.28),.65,0xbcad8a,x,.125+i*.14,z+d/2+3.1-i*.6);
    box(w+1,.2,2.5,0x915541,x,floor+3,z+d/2+1.2).rotation.x=.14;
    for(const a of [-1,1]) cylinder(.09,.09,3,0x705c42,x+a*(w/2),floor+1.5,z+d/2+2.1);
    for(let i=0;i<6;i++) box(w,.055,.05,0x9e8359,x,floor+.55+i*.48,z+d/2+.09);
    // Timber shutters, window frames and verandah railings give the houses scale.
    for(const a of [-1,1]) {
      const wx=x+a*w*.29;
      for(const edge of [-1,1])box(.13,1.7,.19,0xe3c994,wx+edge*.85,floor+2,z+d/2+.15);
      box(1.8,.13,.2,0xe3c994,wx,floor+1.18,z+d/2+.15);
      for(const edge of [-1,1]) {
        const shutter=box(.48,1.6,.16,textured(0x7f936f,'wood'),wx+edge*1.05,floor+2,z+d/2+.24); shutter.rotation.y=edge*.22;
        for(let line=0;line<7;line++)box(.46,.045,.09,0x485e44,wx+edge*1.05,floor+1.37+line*.19,z+d/2+.35);
      }
    }
    for(const a of [-1,1]) {
      box(w*.31,.12,.11,0xbda375,x+a*w*.345,floor+1,z+d/2+2.16);
      for(let i=0;i<5;i++)box(.075,.83,.09,0xa48d62,x+a*(1.9+i*.54),floor+.55,z+d/2+2.16);
    }
    box(.14,.12,.16,0xd5b65f,x+.53,floor+1.4,z+d/2+.2);
    // Carved eave trim, side windows, warm ceramic stair tiles and doorstep props.
    for(let i=0;i<Math.floor(w/.45);i++){
      const xx=x-w/2+.2+i*.45;box(.065,.27,.07,0xdcc393,xx,floor+2.9,z+d/2+2.35);
      const trim=mesh(new T.SphereGeometry(.07,6,5),0xdcc393,xx,floor+2.76,z+d/2+2.35);trim.scale.y=.65;
    }
    for(const a of [-1,1]){
      const side=new T.Group();side.position.set(x+a*(w/2+.07),floor+2,z);side.rotation.y=a*Math.PI/2;root.add(side);
      box(2,1.6,.055,glass,0,0,0,side);for(const b of [-1,1])box(.08,1.75,.1,0xe4cba0,b*1.04,0,.04,side);box(2.16,.09,.14,0xe4cba0,0,.86,.04,side);box(2.16,.09,.14,0xe4cba0,0,-.86,.04,side);box(.075,1.6,.09,0xe4cba0,0,0,.055,side);
    }
    if(label==='RUMAH AMIR'){
      for(let row=0;row<4;row++)for(let col=0;col<7;col++){
        box(.265,.025,.48,[0x9faaa0,0xddd0af,0x956a51][(row+col)%3],x-.84+col*.28,.27+row*.28,z+d/2+3.1-row*.6);
      }
      box(.7,.035,.43,0x6d785a,x,floor+.17,z+d/2+.5);
      for(const a of [-1,1])softBox(.17,.07,.3,0x405b58,x+a*.18,floor+.19,z+d/2+.9,undefined,.04);
      cylinder(.05,.05,2.5,0xbda78d,x-1.8,floor+1.7,z+d/2+1.85);malaysianFlag(x-1.45,floor+2.5,z+d/2+1.85,.7);
    }
    if(label) sign(label,x,floor+3.3,z+d/2+2.2,4);
    collider(x,z,w,d,'building');
    // Verandah rails leave the central stair approach open.
    collider(x-w*.345,z+d/2+2.16,w*.31,.11,'rail');
    collider(x+w*.345,z+d/2+2.16,w*.31,.11,'rail');
    for(const side of [-1,1])roundCollider(x+side*w/2,z+d/2+2.1,.09,'post');
  }
  function fence(x,z,length,axis='x') {
    collider(x+(axis==='x'?length/2:0),z+(axis==='z'?length/2:0),axis==='x'?length:.12,axis==='z'?length:.12,'fence');
    for(let i=0;i<=length;i+=1.6){const px=x+(axis==='x'?i:0),pz=z+(axis==='z'?i:0);box(.12,1.3,.12,0xd4c6a0,px,.65,pz);}
    for(const y of [.35,.95]) box(axis==='x'?length:.1,.12,axis==='z'?length:.1,0xd4c6a0,x+(axis==='x'?length/2:0),y,z+(axis==='z'?length/2:0));
  }
  // Two lawns leave an actual opening for the lower water and sloping banks.
  // Lawn patches and bare earth share one mask with the living grass.
  const groundMask=grassMask({units:UNITS,roads:ROADS,bridges:BRIDGES,props:STREET_PROPS},TOWN_BOUNDS,GROUND,RIVER),groundMaskTexture=maskTexture(groundMask);
  const lawnGround=groundMaterial({toon,mask:groundMask,texture:groundMaskTexture,lawn:grass,earth:textures.dirt});lawnGround.userData.noInk=true;mats.set('lawn-ground',lawnGround);
  box(GROUND.maxX-GROUND.minX+2,.6,GROUND.maxZ-GROUND.minZ+2,lawnGround,(GROUND.minX+GROUND.maxX)/2,-.35,(GROUND.minZ+GROUND.maxZ)/2).userData.landscape=true;
  // One surface per point, including road extensions beyond the town edge.
  // World-aligned UVs keep the texture continuous across the trimmed pieces.
  for(const road of roadSurfaces(ROADS,TOWN_BOUNDS))box(road.w,.08,road.d,textured(0xffffff,road.kind),road.x,.015,road.z);
  const inRoad=(x,z,pad=0,except=null)=>ROADS.some(r=>r!==except&&Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad);
  const onBridge=(x,z,pad=1)=>BRIDGES.some(b=>Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad);
  const inRiver=(x,pad=0)=>Math.abs(x-RIVER.x)<RIVER.w/2+pad;
  const inside=(x,z,pad=0)=>x>TOWN_BOUNDS.minX-pad&&x<TOWN_BOUNDS.maxX+pad&&z>TOWN_BOUNDS.minZ-pad&&z<TOWN_BOUNDS.maxZ+pad;
  // Asphalt roads: centre dashes, kerbs and an open longkang drain on each
  // side, broken wherever another road or a bridge joins.
  const asphalt=ROADS.filter(r=>r.kind==='asphalt');
  for(const r of asphalt){
    const alongX=r.w>=r.d,length=alongX?r.w:r.d,half=(alongX?r.d:r.w)/2,at=(t,o)=>alongX?[r.x+t,r.z+o]:[r.x+o,r.z+t];
    for(let t=-length/2+4;t<length/2-2;t+=8){const [x,z]=at(t,0);if(asphalt.some(o=>o!==r&&Math.abs(x-o.x)<o.w/2+1&&Math.abs(z-o.z)<o.d/2+1))continue;box(alongX?3:.16,.02,alongX?.16:3,0xd6d1a9,x,.07,z);}
    for(const side of [-1,1])for(let t=-length/2+2.5;t<length/2-2;t+=5){
      const [x,z]=at(t,side*(half+.2)),[dx,dz]=at(t,side*(half+.55));
      if(inRoad(x,z,2.6,r)||onBridge(x,z)||inRiver(x,1))continue;
      box(alongX?4.6:.3,.14,alongX?.3:4.6,0xc9cbb3,x,.09,z);box(alongX?4.6:.3,.035,alongX?.3:4.6,0x687c6c,dx,.03,dz);
    }
  }
  function pavilion(w,d,name,school=false){
    box(w,.18,d,0xd8cba3,0,.08,0);
    roof(w+1,d+1,0,3.1,0,school?0xab6046:0x749458);
    for(const a of [-1,1])for(const c of [-1,1]){cylinder(.10,.10,3,0x755d42,a*(w/2-.3),1.6,c*(d/2-.3));roundCollider(a*(w/2-.3),c*(d/2-.3),.1,'post');}
    sign(name.toUpperCase(),0,2.6,d/2+.5,Math.min(w,8));
    for(const side of [-1,1]){box(w*.65,.15,.6,0xb5986a,0,.6,side*(d/2-.7));collider(0,side*(d/2-.7),w*.65,.6,'bench');}
    if(school){box(w-1,1,.75,0xb5986a,0,.6,-d/2+.45);collider(0,-d/2+.45,w-1,.75,'counter');}
  }
  function civic(w,d,name,color=0xe8dbb8){
    box(w,3.8,d,textured(color,'plaster'),0,2,0);roof(w+1,d+1,0,4,0,0xab6046);
    for(const side of [-1,1])windowDetail(side*w*.30,2.4,d/2+.1,1.8,1.5);
    box(1.5,2.6,.15,0x677b69,0,1.5,d/2+.1);
    sign(name.toUpperCase(),0,3.6,d/2+.16,Math.min(w-1,9));collider(0,0,w,d,'building');
  }
  function bicycle(x,z){
    collider(x,z,2.4,.55,'bicycle');
    for(const dx of [-.7,.7]){
      mesh(new T.TorusGeometry(.5,.045,6,24),0x354238,x+dx,.56,z);mesh(new T.TorusGeometry(.46,.014,4,24),0xb9b9a0,x+dx,.56,z);
      for(let spoke=0;spoke<8;spoke++){const angle=spoke*Math.PI/4;beam([x+dx,.56,z],[x+dx+Math.sin(angle)*.45,.56+Math.cos(angle)*.45,z],.008,0xc5c5ac);}
      cylinder(.06,.06,.15,0x807966,x+dx,.56,z).rotation.x=Math.PI/2;
    }
    const a=[x-.7,.56,z],b=[x-.1,.66,z],c=[x-.3,1.25,z],d=[x+.4,1.22,z],e=[x+.7,.56,z];
    for(const pair of [[a,b],[b,c],[c,a],[b,d],[c,d],[d,e]])beam(...pair,.032,0xa66047);
    beam([x-.33,1.38,z],c,.027,0x807966);softBox(.33,.075,.21,0x443e32,x-.32,1.4,z,undefined,.035);
    beam(d,[x+.32,1.48,z],.028,0x807966);beam([x+.32,1.48,z-.21],[x+.32,1.48,z+.21],.025,0x807966);
    for(const side of [-1,1])box(.16,.04,.08,0x56584a,x-.1,.64,z+side*.16);
  }
  function pot(x,z,y=0) {
    if(y<.5)roundCollider(x,z,.31,'pot');
    cylinder(.28,.2,.48,0xa57454,x,y+.24,z,undefined,10);cylinder(.31,.31,.07,0xbc9068,x,y+.48,z,undefined,10);
    for(let a=0;a<4;a++){const leaf=mesh(new T.SphereGeometry(.3,6,4),0x62834f,x+Math.sin(a*1.57)*.13,y+.78,z+Math.cos(a*1.57)*.13);leaf.scale.set(.45,1.25,.45);}
  }
  const landmarks=createLandmarks({parent:()=>root,toon,textured,register:(key,material)=>{mats.set(key,material);return material;},sign,collider,roundCollider});
  const [townCars, townBus, petrolPump] = await Promise.all([carLoad, busLoad, pumpLoad]), cars = [], buses = [];
  petrolPump?.materials.forEach((material,i)=>mats.set('petrol-pump-'+i,material));
  const storefronts=await createStorefronts(renderer);
  const props=createProps({paint:mats.get('paint'),register:(key,material)=>{mats.set(key,material);return material;},toon});
  const placeName=id=>BUILDINGS.find(b=>b.id===id)?.name || PLACES[id]?.[0] || 'Bangunan';
  // Extra buildings added in the map editor have no numbered place: they
  // take the name given in the plan, or their kind's label.
  const unitName=u=>u.name||(u.places[0]?placeName(u.places[0].id):u.def.label);
  const hashOf=text=>[...String(text)].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const timberColors=[0xc7ad75,0xa8b4a0,0xe0c39b,0xc9bd92,0xb28272];
  const civicColors={19:0xe5a88c,20:0xd99cb6,32:0xf0d18d,33:0x9fc8ba,37:0x9fc8ba};
  // Every builder works in its unit's frame: (0,0) is the unit's centre and
  // +z is its front, so the plan can move and turn it freely.
  const builders={
    home(u){
      house(0,0,timberColors[1],10,8,'RUMAH AMIR');
      fence(-10,-7,20);fence(-10,-7,21,'z');fence(-10,14,7);fence(5,14,5);
      // Hanging laundry behind the yard, a familiar kampung afternoon detail.
      for(const x of [-11,-4])cylinder(.05,.05,2.5,0x8b7958,x,1.25,-9);
      box(7,.025,.025,0xc3bd9d,-7.5,2.4,-9);
      for(let i=0;i<4;i++)box(.85,1.0,.025,[0xd1c2a7,0x809eb0,0xb88461,0xbabf94][i],-10+i*1.6,1.8,-9);
      for(const xx of [-4,4])for(let i=0;i<5;i++){const zz=5.7+Math.sin(i*2.4)*.12,px=xx+Math.cos(i*2.4)*.16;cylinder(.015,.018,.55,0x667e47,px,2.42,zz);for(let petal=0;petal<5;petal++){const flower=mesh(new T.SphereGeometry(.065,6,5),0xc08178,px+Math.sin(petal*1.256)*.055,2.71,zz+Math.cos(petal*1.256)*.055);flower.scale.y=.4;}mesh(new T.SphereGeometry(.029,6,5),0xe5c775,px,2.73,zz);}
      pot(-4,5.7,1.55);pot(4,5.7,1.55);bicycle(9,6);
    },
    house(u){const id=u.places[0]?.id??hashOf(u.id),[,,w,d]=u.def.places[0];house(0,0,timberColors[id%5],w,d,unitName(u).toUpperCase());},
    wakaf(u){pavilion(7,6,unitName(u));},
    pondok(u){pavilion(4,5,unitName(u));},
    canteen(u){pavilion(10,6,unitName(u),true);storefronts.add(30,root,{panels:[{x:0,y:1.55,z:3.1,w:8.4,h:2.2}],badge:{x:3.4,y:1.9,z:3.55}});},
    terrace(u){
      const id=u.places[0]?.id??11+hashOf(u.id)%4,color=[0xe5a88c,0x9fc8ba,0xf0d18d,0x89b0ca][(id-11)%4];
      box(6.8,3.4,7,textured(color,'plaster'),0,1.8,0);roof(7.1,8,0,3.6,0,0xab6046);
      box(1.3,2.6,.12,0x796956,.9,1.5,-3.55);box(1.9,1.4,.12,glass,-1.6,2,-3.57);
      for(const side of [-1,1])box(.10,1.6,.18,0xf4e9d0,-1.6+side*.99,2,-3.63);
      box(6.8,.1,3.5,0xd3c9a9,0,.1,-5.2);
      fence(-3.4,-6.5,3.6);fence(1.6,-6.5,1.8); // 1.4-metre gate.
      collider(0,0,6.8,7,'building');
      const name=sign(unitName(u).toUpperCase(),0,3.1,-3.68,3.7);name.rotation.y=Math.PI;
      box(6.8,.12,.2,0xe6dcca,0,3.3,-3.6);
    },
    minishop(u){civic(9,8,unitName(u),civicColors[19]);if(u.places.length)storefronts.add(19,root,{panels:[{x:0,y:1.55,z:4.26,w:7.6,h:2.6}],badge:{x:2.7,y:2.8,z:4.3}});},
    hall(u){civic(13,8,unitName(u),civicColors[32]);},
    library(u){civic(12,8,unitName(u),civicColors[33]);},
    nursery(u){civic(9,10,unitName(u),civicColors[20]);for(let i=0;i<3;i++)box(.6,.2,.6,[0xe5a88c,0xf0d18d,0x89b0ca][i],-2+i*1.1,.18,7);},
    petrol(u){
      // Retro PETRONAS kiosk and two physical pumps under a flat canopy.
      civic(9,8,placeName(37),civicColors[37]);
      box(10,.25,7,0xf0d18d,0,4.4,-10);
      for(const x of [-4,4]){box(.18,4.3,.18,0x755d42,x,2.2,-10);collider(x,-10,.18,.18,'post');}
      // Ivory fascia with the period turquoise lettering and band on all four sides.
      for(const [w,x,z,turn] of [[10.2,0,-6.39,0],[10.2,0,-13.61,Math.PI],[7.2,5.11,-10,Math.PI/2],[7.2,-5.11,-10,-Math.PI/2]])brandPanel(w,.62,x,4.42,z,turn,true);
      for(const x of [-2,2]){
        // Raised concrete island; the pump from the station model stands on it.
        box(2,.2,1.1,0xcbbd99,x,.1,-10);collider(x,-10,2,1.1,'pump');
        let top=1.8;
        if(petrolPump){const pump=petrolPump.create();pump.position.set(x,0,-10);root.add(pump);top=petrolPump.height;}
        else{box(.9,1.7,.75,0x749458,x,.95,-10);box(.7,.5,.1,0x414b3f,x,1.35,-9.6);}
        // Brand topper on the pump head, readable from both sides.
        box(.04,.1,.04,0xa6adad,x,top+.05,-10);
        for(const turn of [0,Math.PI])brandPanel(.7,.18,x,top+.19,-10+(turn?-.012:.012),turn);
      }
      // Pak Din's solid wooden Dam table, beside the kiosk's front counter.
      box(1.25,.12,1.25,0x6e482e,-3,.8,5.4);collider(-3,5.4,1.25,1.25,'dam-table');
      for(const x of [-3.5,-2.5])for(const z of [4.9,5.9])box(.09,.74,.09,0x6e482e,x,.39,z);
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const x=-3+(c-3.5)*.13,z=5.4+(r-3.5)*.13;
        box(.13,.025,.13,(r+c)%2?0x65442e:0xeacb96,x,.875,z);
        if((r+c)%2&&(r<3||r>4))cylinder(.048,.048,.035,r<3?0x2a2832:0xd8533f,x,.905,z,undefined,10);
      }
      for(const z of [4.35,6.45]){box(.5,.08,.5,0xa77a4b,-3,.44,z);box(.14,.4,.14,0x6e482e,-3,.2,z);collider(-3,z,.5,.5,'seat');}
      cylinder(.08,.065,.18,0xbd8c51,-2.43,.93,5.88,undefined,10);
      sign('DAM HAJI · PAK DIN',-3,.6,6.035,1.2);
      storefronts.add(37,root,{panels:[{x:0,y:1.55,z:4.26,w:6.8,h:2.6}],badge:{x:2.7,y:2.8,z:4.3}});
    },
    warung(u){
      // Warung has an open social space facing the lane.
      box(11,.25,6.5,0xcbbb96,0,.14,0);box(11,2.8,.3,0xd4c597,0,1.5,-3.15);
      for(const x of [-5.3,5.3])for(const z of [-2.5,3]){cylinder(.13,.13,3.3,0x766746,x,1.7,z);roundCollider(x,z,.13,'post');}
      roof(12.5,8.4,0,3.4,0,0x657d6d);sign(placeName(21).toUpperCase(),0,2.8,4.4,8);
      box(6,.75,1,0x776548,0,.6,-2.2);box(6,.08,1.2,0xb0a285,0,1.02,-2.2);collider(0,-2.2,6,1.2,'counter');
      for(const x of [-3.5,3.5]){cylinder(1.1,1.1,.15,0x8f7350,x,.95,.7);cylinder(.1,.2,.8,0x6e6247,x,.5,.7);for(const a of [-1,1]){collider(x+a*1.5,.7,1,.65,'seat');box(1,.16,.65,0xd0b98a,x+a*1.5,.55,.7);box(.15,.5,.15,0x665a42,x+a*1.5,.25,.7);}}
      box(1.5,.12,.5,0x845634,3.5,1.08,.7);collider(0,-3.15,11,.5);collider(-3.5,.7,2,2);collider(3.5,.7,2,2);
      // Tea glasses, enamel plates, a serving counter and the actual congkak shape.
      for(const xx of [-3.5,3.5]){
        for(const a of [-1,1]){cylinder(.13,.11,.28,0xc98f53,xx+a*.45,1.165,.85,undefined,12);const rim=mesh(new T.TorusGeometry(.13,.013,4,16),0xeee2cb,xx+a*.45,1.31,.85);rim.rotation.x=Math.PI/2;const handle=mesh(new T.TorusGeometry(.085,.017,4,12),0xceb79b,xx+a*.45+.15,1.18,.85);handle.scale.x=.7;}
        cylinder(.3,.29,.035,0xeee5ca,xx,.995,.34,undefined,20);cylinder(.14,.17,.12,0xb0793f,xx,1.07,.34,undefined,10);
        for(const a of [-1,1]){box(.07,.7,.65,0x796449,xx+a*1.94,.92,.7);box(.07,.18,.65,0xa08a63,xx+a*1.94,1.18,.7);}
      }
      softBox(1.7,.13,.53,0x94613f,3.5,1.075,.85,undefined,.15);
      for(let row=0;row<2;row++)for(let pit=0;pit<7;pit++){const hole=mesh(new T.TorusGeometry(.059,.015,5,12),0x69482f,2.91+pit*.195,1.147,.7+row*.25);hole.rotation.x=Math.PI/2;cylinder(.044,.044,.005,0x513a29,2.91+pit*.195,1.151,.7+row*.25,undefined,10);}
      for(const a of [-1,1]){const store=mesh(new T.TorusGeometry(.085,.018,5,14),0x654328,3.5+a*.76,1.147,.825);store.rotation.x=Math.PI/2;}
      for(let i=0;i<4;i++){cylinder(.3,.27,.6,0x839987,-1.8+i*.85,1.35,-2.2,undefined,12);cylinder(.33,.33,.035,0xc4c7b3,-1.8+i*.85,1.67,-2.2,undefined,12);}
      softBox(.65,1.0,.35,0x667d6e,5.5,.65,-1.7,undefined,.06);sign('TEH TARIK · RM1',0,2.04,-2.94,3.2);
      pot(-6,3.5);pot(6,3.5);
      storefronts.add(21,root,{panels:[{x:0,y:1.5,z:3.32,w:10.2,h:2.5}],badge:{x:4.1,y:1.8,z:4.45}});
    },
    shophouses(u){
      // A Straits terrace with salmon five-foot-way pillars, arched louvred
      // windows, a scalloped valance and a hipped clay roof.
      landmarks.shophouseRow(Array.from({length:7},(_,i)=>u.places[i]?placeName(u.places[i].id).toUpperCase():['KEDAI RUNCIT','KEDAI GUNTING','KEDAI BASIKAL','ALAT TULIS & GAME','KEDAI JAHIT','KLINIK','KEDAI ROTI'][i]),-27,0);
      for(let i=0;i<u.places.length;i++){const x=-27+i*9;storefronts.add(u.places[i].id,root,{panels:[{x:x-2.25,y:1.42,z:5.15,w:3.35,h:2.3,half:0},{x:x+2.25,y:1.42,z:5.15,w:3.35,h:2.3,half:1}],badge:{x:x+2.25,y:2.85,z:8.16}});}
      // Sacks outside the sundry shop and the barber's sandwich board.
      for(let j=0;j<3;j++)box(.65,.6,.65,0x9e7954,-29.6+j*.72,.56,5.6);collider(-28.9,5.6,2.2,.7,'goods');
      softBox(.7,.95,.08,0x34584b,-15.3,1.05,6.8,undefined,.07);sign('GUNTING',-15.3,1.05,6.86,.65);
      bicycle(-7,9);pot(-29,8);pot(-12,8);
    },
    school(u){
      // A full old SK classroom block and side wing around a fenced
      // assembly ground; the canteen and court may stand inside the yard.
      box(38,4.2,10,textured(0xe7d8ad,'plaster'),-5.5,2.2,-4);roof(40,12,-5.5,4.35,-4,0x9e5544);
      box(40,.2,3.5,0xc8bc94,-5.5,.12,2.5);box(40,.18,3.8,0xad6650,-5.5,3.7,2.6);
      for(let x=-21.5;x<=13.5;x+=5){
        windowDetail(x,2.35,1.09,2.25,1.45);box(.18,3.6,.18,0xf1e4bd,x,1.9,4.25);
        if(x<13.5){box(.92,2.35,.08,0x687a62,x+1.65,1.3,1.14);box(.04,.1,.06,0xd5bd77,x+1.98,1.3,1.21);}
      }
      box(9,4.2,20,textured(0xe7d8ad,'plaster'),19.5,2.2,-3);roof(10.5,22,19.5,4.35,-3,0x9e5544);
      for(let z=-9;z<=6;z+=5){const window=new T.Group();window.position.set(14.95,2.35,z);window.rotation.y=-Math.PI/2;root.add(window);box(2.3,1.4,.08,glass,0,0,0,window);for(const a of [-1,1])box(.08,1.6,.12,0xe8dbb8,a*1.19,0,.02,window);}
      box(31,.04,9,0xc4bc8f,-5.5,.10,10);
      for(const x of [-21.5,10.5]){box(.3,3.0,.3,0xe8dbb8,x,1.5,14.3);collider(x,14.3,.3,.3,'gatepost');}
      sign('SEKOLAH KEBANGSAAN',-5.5,3.15,14.5,12);
      cylinder(.06,.06,8,0xc7c7b3,1.5,4,11);malaysianFlag(2.25,7.3,11);roundCollider(1.5,11,.06,'flagpole');
      collider(-5.5,-4,38,10);collider(19.5,-3,9,20);
      fence(-25.5,-15,51);fence(-25.5,-15,30,'z');fence(25.5,-15,30,'z');
      fence(-25.5,15,16);fence(-1.5,15,27); // 8-metre school gate.
    },
    court(u){
      // A playable courtyard, with painted court lines and solid goal supports.
      box(14,.045,8,0x89b0ca,0,.14,0);
      for(const side of [-1,1]){box(13.5,.015,.08,0xf4e9d0,0,.17,side*3.7);box(.08,.015,7.4,0xf4e9d0,side*6.75,.17,0);}
      box(.08,.015,7.4,0xf4e9d0,0,.17,0);
      const ring=mesh(new T.TorusGeometry(1.2,.045,4,24),0xf4e9d0,0,.17,0);ring.rotation.x=Math.PI/2;
      for(const side of [-1,1])for(const zz of [-1.2,1.2]){cylinder(.055,.055,2,0xf4e9d0,side*6.5,1.12,zz);roundCollider(side*6.5,zz,.055,'goal');}
      sign('GELANGGANG',0,2.8,4.4,5);
      // A dirt practice circle and a solid box of tops in the padang corner.
      cylinder(1.75,1.75,.035,0xc4a173,3,.205,-.5,undefined,32);
      const gasingRing=mesh(new T.TorusGeometry(1.55,.035,4,32),0xf8eac9,3,.24,-.5);gasingRing.rotation.x=Math.PI/2;
      box(.9,.48,.65,0x9a7149,5.4,.44,1.8);collider(5.4,1.8,.9,.65,'gasing-box');
      for(const [x,c] of [[5.15,0xcb5540],[5.65,0x527bb3]]){
        cylinder(.19,.025,.19,c,x,.79,1.8,undefined,12);cylinder(.065,.065,.13,0xc39663,x,.94,1.8,undefined,8);
      }
      sign('GASING · ATUK & FAIZ',3,1.35,-2.1,2.8);
      // Solid portable Mini 4WD track on the other side of the padang.
      box(3.7,.26,2.1,0x665e51,-3.4,.31,-.8);collider(-3.4,-.8,3.7,2.1,'tamiya-track');
      for(let lane=0;lane<4;lane++){const rail=mesh(new T.TorusGeometry(1,.026,4,40),0xf4e9d0,-3.4,.47,-.8);rail.rotation.x=Math.PI/2;rail.scale.set(1.72-lane*.15,.83-lane*.1,1);}
      for(const [x,c] of [[-3.7,0xd75245],[-3.1,0xe5a6bd]]){box(.17,.11,.32,c,x,.51,-1.3);box(.28,.035,.4,0x333943,x,.48,-1.3);}
      sign('JOM DASH · FAIZ & MEI LING',-3.4,1.35,-2.5,3.5);
    },
    mosque(u){box(19,.18,19,0xdbd2b4,0,.12,0);landmarks.mosque(0,0,placeName(31).toUpperCase());},
    busstop(u){
      box(13,.15,9,0xd1c6a3,0,.1,0);
      for(const x of [-6,0,6]){box(.2,3,.2,0x747d66,x,1.6,-1);collider(x,-1,.2,.2,'post');}
      box(14,.3,10,0x81947a,0,3.3,0);sign('PERHENTIAN BAS',0,2.7,5.1,8);
      for(const x of [-4,4]){box(3,.18,.8,0xb5986a,x,.65,2);collider(x,2,3,.8,'bench');}
    },
    bus(u){
      collider(0,0,4.3,10.3,'vehicle');
      buses.push({id:u.id,source:townBus?'glb':'procedural',x:u.x,z:u.z});
      if(townBus){const copy=townBus.clone(true);root.add(copy);copy.position.y=groundHeight(u.x,u.z)+.015;return;}
      softBox(4,3.1,10,0xe7dbc0,0,2.1,0,undefined,.2);box(4.05,.8,10.1,0xb95670,0,1.4,0);box(3.6,1.2,.12,glass,0,2.9,5.07);
      for(const side of [-1,1])for(let z=-3.2;z<=3.3;z+=2.1)box(.1,1.1,1.6,glass,side*2.05,2.9,z);
      for(const side of [-1,1])for(const z of [-3.4,3.4]){const wheel=cylinder(.65,.65,.3,0x414b3f,side*2,.7,z,undefined,12);wheel.rotation.z=Math.PI/2;}
      sign('BAS PEKAN · 01',0,3.43,5.12,3.2,'#2c4d40');
    },
    workshop(u){
      // Open workshop bay, with walls, tyre stacks and bench as solid obstacles.
      box(10,.18,10,0xb3bca6,0,.1,0);roof(11,11,0,4,0,0x749458);
      collider(0,4.85,10,.3,'wall');box(10,3.8,.3,0xcbbd99,0,2,4.85);
      for(const side of [-1,1]){box(.3,3.8,10,0xcbbd99,side*4.85,2,0);collider(side*4.85,0,.3,10,'wall');}
      const label=sign(unitName(u).toUpperCase(),0,3.4,-5.1,8);label.rotation.y=Math.PI;
      for(const x of [-3,3]){for(let j=0;j<3;j++)cylinder(.65,.65,.35,0x414b3f,x,.3+j*.35,2,undefined,12);roundCollider(x,2,.65,'tyres');}
      if(u.places.length)storefronts.add(36,root,{panels:[{x:0,y:1.65,z:-5.17,w:9.2,h:2.9,turn:Math.PI}],badge:{x:3.2,y:2.7,z:-5.23,turn:Math.PI}});
    },
    market(u){
      const colors=[0xe5a88c,0xf0d18d,0x89b0ca,0xd99cb6,0x71967a,0xc79959];
      for(let i=0;i<6;i++){
        const x=(i%3)*8-8,z=Math.floor(i/3)*12-6;
        for(const a of [-1,1])for(const b of [-1,1]){cylinder(.07,.07,3,0x755d42,x+a*2.4,1.6,z+b*1.8);roundCollider(x+a*2.4,z+b*1.8,.07,'post');}
        roof(5.6,4.5,x,3,z,colors[i]);box(4.8,.12,2,0xb5986a,x,.9,z);collider(x,z,4.8,2,'counter');
        for(let j=0;j<4;j++)mesh(new T.IcosahedronGeometry(.3,0),i%2?0xf0d18d:0x71967a,x-1.5+j,1.2,z);
      }
      const label=sign('PASAR MALAM · SABTU',0,4.4,-10,12);label.rotation.y=Math.PI;
    },
    // Padang: white lines, a goal at each end and benches along the sides.
    // Crows land on the grass all over it, in plain view.
    padang(u){
      let seed=hashOf(u.id);const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
      for(const [w,d,x,z] of [[52,.18,0,-16],[52,.18,0,16],[.18,32,-26,0],[.18,32,26,0],[.18,32,0,0]])box(w,.02,d,0xf4e9d0,x,.03,z);
      const ring=new T.Mesh(new T.RingGeometry(4.8,5.05,40),mat(0xf4e9d0));ring.rotation.x=-Math.PI/2;ring.position.set(0,.035,0);root.add(ring);
      for(const side of [-1,1]){
        const x=side*26;for(const z of [-3.6,3.6]){cylinder(.08,.08,2.4,0xf4e9d0,x,1.2,z);roundCollider(x,z,.1,'post');}
        const bar=cylinder(.08,.08,7.2,0xf4e9d0,x,2.4,0);bar.rotation.x=Math.PI/2;
        hotspot(x,2.5,-1.5);hotspot(x,2.5,1.5);
      }
      for(const z of [-19,19])for(const x of [-18,-6,6,18]){box(3,.12,.6,0xb5986a,x,.55,z);box(3,.5,.1,0x755d42,x,.85,z+(z<0?-.28:.28));for(const s of [-1.3,1.3])box(.1,.5,.5,0x414b3f,x+s,.27,z);collider(x,z,3,.7,'bench');hotspot(x+(r()-.5)*2,.62,z);}
      // Crows all over the grass.
      for(let x=-23;x<=23;x+=5.5)for(let z=-13;z<=13;z+=5.5)hotspot(x+(r()-.5)*3,.05,z+(r()-.5)*3);
    },
    // Kawasan sampah: three skip bins against a low brick wall, piles of
    // rubbish bags and litter in front. Crows sit on the bin rims and bags.
    dump(u){
      let seed=hashOf(u.id);const r=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
      box(16,.08,9,0x8a946f,0,.04,0);
      for(const [x,z,w,d] of [[0,-4.4,16,.3],[-7.85,0,.3,9],[7.85,0,.3,9]]){box(w,1.2,d,0xab6046,x,.6,z);box(w+.1,.12,d+.1,0xcbbd99,x,1.26,z);collider(x,z,w,d,'wall');}
      const label=sign('KAWASAN SAMPAH',0,1.95,-4.2,5);
      for(const [x,color] of [[-5,0x4e6b62],[0,0x89b0ca],[5,0xab6046]]){
        box(3.2,1.3,1.9,color,x,.73,-2.9);box(3.4,.12,2.05,0x344e42,x,1.42,-2.9);
        for(const side of [-1,1])box(.12,.5,.12,0x414b3f,x+side*1.4,.2,-2.9+side*.7);
        const lid=box(3.3,.08,1.9,color,x,1.75,-3.9);lid.rotation.x=x?-1.2:-.15;
        collider(x,-2.9,3.4,2.1,'bin');
        for(const t of [-1.2,-.4,.4,1.2]){hotspot(x+t,1.48,-2.0);if(r()<.5)hotspot(x+t,1.48,-3.8);}
      }
      // Bag piles: black, green and blue sacks, squashed spheres.
      for(let i=0;i<7;i++){
        const px=-6+i*2+r()-.5,pz=.5+r()*2.8,n=3+Math.floor(r()*4);
        for(let k=0;k<n;k++){const bag=mesh(new T.IcosahedronGeometry(.42+r()*.2,1),[0x414b3f,0x344e42,0x4e6b62,0x89b0ca][Math.floor(r()*4)],px+(r()-.5)*1.1,.32+(k>2?.4:0),pz+(r()-.5)*1.1);bag.scale.set(1,.72,1);}
        roundCollider(px,pz,.85,'bags');hotspot(px,.95,pz);hotspot(px+1,.1,pz+1.2);
      }
      // Litter: cartons, cans and paper.
      for(let i=0;i<26;i++)box(.2+r()*.3,.05+r()*.12,.15+r()*.25,[0xf4e9d0,0xbf815e,0xd4b24b,0xe5a88c,0x9fc8ba][i%5],(r()-.5)*14,.1,(r()-.2)*4.5).rotation.y=r()*3;
      for(let i=0;i<6;i++)hotspot((r()-.5)*12,.1,2.8+r()*1.4);
    },
    square(u){
      // The town's little square: paths, gardens and an old clock.
      box(22,.08,17,0xe8dbb8,0,.05,0);
      box(3,.09,17,textured(0xffffff,'dirt'),0,.06,0);box(22,.09,3,textured(0xffffff,'dirt'),0,.06,0);
      box(2.7,.35,2.7,0xcbbd99,0,.25,0);box(1.4,4.6,1.4,0xf4e9d0,0,2.6,0);roof(2.3,2.3,0,5,0,0xab6046);
      collider(0,0,2.7,2.7,'monument');
      for(const side of [-1,1]){
        const clockFace=sign('12 : 00',0,4.35,side*.72,1.25);if(side<0)clockFace.rotation.y=Math.PI;
        for(const zz of [-6,6]){const xx=side*8;box(3,.18,.75,0xb5986a,xx,.62,zz);box(3,.5,.14,0x755d42,xx,.95,zz+.4);collider(xx,zz,3,.9,'bench');}
        box(5,.24,3.5,0x71967a,side*6,.17,10);collider(side*6,10,5,3.5,'planter');
      }
    },
    sedan(u){
      const color=u.color||'#d4322c', car=townCars?townCars.create(color):landmarks.sedan(0,0,0,new T.Color(color).getHex());
      if(townCars){root.add(car);car.position.y=groundHeight(u.x,u.z)+.015;}
      cars.push({id:u.id,source:townCars?'glb':'procedural',paint:new T.Color(color).getHSL({}).l>.65?'white':'red',x:u.x,z:u.z});
      collider(0,0,1.9,4.5,'vehicle');
    },
    passerby(){},
    // A building made in the map editor: one of the shared shapes, sized and
    // coloured by the plan (see CUSTOM_STYLES in town-layout.js).
    custom(u){
      const c=customLook(u),label=c.name.toUpperCase(),wall=new T.Color(c.wall).getHex(),top=new T.Color(c.roofColor).getHex();
      if(c.style==='kampung')return house(0,0,wall,c.w,c.d,label);
      if(c.style==='wakaf')return pavilion(c.w,c.d,c.name||'Wakaf');
      if(c.style==='plaza'){box(c.w,.08,c.d,wall,0,.05,0);if(label)sign(label,0,1.4,c.d/2-.2,Math.min(c.w-1,8));return;}
      const H=c.storeys*3.4+.4;
      box(c.w,H,c.d,textured(wall,'plaster'),0,H/2+.1,0);
      if(c.roof==='flat')box(c.w+.6,.35,c.d+.6,top,0,H+.27,0);else roof(c.w+1,c.d+1,0,H+.2,0,top);
      for(let s=0;s<c.storeys;s++)if(s||c.w>=6)for(const side of [-1,1])windowDetail(side*c.w*.3,2.4+s*3.4,c.d/2+.1,Math.min(1.8,c.w*.2),1.5);
      box(1.5,2.6,.15,0x677b69,0,1.5,c.d/2+.1);
      if(label)sign(label,0,3.25,c.d/2+.16,Math.min(c.w-1,9));
      collider(0,0,c.w,c.d,'building');
    }
  };
  const patchPositions=[];
  for(const unit of UNITS)place(unit,u=>{
    if(KINDS[u.kind]?.species || u.kind==='spawn')return;
    builders[u.kind](u);
    for(const [lx,lz,size] of u.def.patches||[])patchPositions.push([...toWorld(u,lx,lz),size]);
  });
  // Trees: planting.js works out the yards, lawns, river banks and the dense
  // orchard and rubber rows past the town edge; trees.js models each species.
  const TOWN={units:UNITS,roads:ROADS,bridges:BRIDGES,buildings:BUILDINGS,spots:SPOTS,passersby:PASSERSBY,props:STREET_PROPS};
  const trees=createTrees({parent:()=>root,toon,register:(key,material)=>{mats.set(key,material);return material;}});
  for(const u of UNITS.filter(u=>KINDS[u.kind]?.species)){
    const species=KINDS[u.kind].species,size=Math.max(.4,Math.min(2,Number(u.size)||1));
    trees.plant({kind:species,x:u.x,z:u.z,size,seed:hashOf(u.id),ring:'in'});
    roundCollider(u.x,u.z,.35*size,'trunk');
  }
  // Jungle maps: a forest wall all round outside the playable ground, in the
  // trees' cheaper far style, leaving the road out open.
  if(jungle){
    let s=77;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
    const out=(x,z)=>x<GROUND.minX-2||x>GROUND.maxX+2||z<GROUND.minZ-2||z>GROUND.maxZ+2,onRoad=(x,z)=>ROADS.some(rd=>rd.kind==='asphalt'&&(rd.w>=rd.d?Math.abs(z-rd.z)<rd.d/2+3:Math.abs(x-rd.x)<rd.w/2+3));
    const kinds=['getah','durian','hujan','beringin','buluh','kelapa','nangka','pinang','hujan','getah'];
    for(let i=0,made=0;i<2000&&made<190;i++){
      const a=r()*Math.PI*2,d=Math.max(GROUND.maxX,GROUND.maxZ)+4+Math.pow(r(),.7)*70,x=Math.cos(a)*d*1.05,z=Math.sin(a)*d*1.05;
      if(!out(x,z)||onRoad(x,z)||Math.hypot(x,z)>horizonRadius-12)continue;
      trees.plant({kind:kinds[Math.floor(r()*kinds.length)],x,z,size:1+r()*.8,seed:i*7+3,ring:'far'});made++;
    }
  }
  // Open ground: away from roads, the river, every unit and every obstacle.
  const solidNear=(x,z,pad)=>colliders.some(c=>c.r!==undefined?Math.hypot(x-c.x,z-c.z)<c.r+pad:Math.abs(x-c.x)<c.w/2+pad&&Math.abs(z-c.z)<c.d/2+pad);
  const unitNear=(x,z,pad)=>UNITS.some(u=>{const [ax,az,aw,ad]=u.area;return Math.abs(x-ax)<aw/2+pad&&Math.abs(z-az)<ad/2+pad;});
  const roadNear=(x,z,asphaltPad,dirtPad)=>ROADS.some(r=>{const pad=r.kind==='asphalt'?asphaltPad:dirtPad;return Math.abs(x-r.x)<r.w/2+pad&&Math.abs(z-r.z)<r.d/2+pad;});
  // Street props of around 2001, placed by each building kind (see props.js).
  for(const p of STREET_PROPS){
    scene.add(props.place(p.name,p.x,groundHeight(p.x,p.z)+p.y,p.z,p.heading,p.print));
    const def=PROPS[p.name];if(def.hit)roundCollider(p.x,p.z,def.hit,'prop');
    if(p.name==='banner')for(const lx of [-2.2,2.2])roundCollider(p.x+lx*Math.cos(p.heading),p.z-lx*Math.sin(p.heading),.07,'pole');
  }
  // Street lamps follow every asphalt road on one verge, facing the road:
  // sodium heads on steel poles. The kampung lanes get timber poles with a
  // fluorescent tube under a tin hood. Both light up after dark (setSky).
  const sodium=toon(0xf3d9a0),tube=toon(0xeef4ea);mats.set('lamp-sodium',sodium);mats.set('lamp-tube',tube);
  const lamps=[];
  for(const r of asphalt){
    const alongX=r.w>=r.d,length=alongX?r.w:r.d,half=(alongX?r.d:r.w)/2;
    for(let t=-length/2+12;t<length/2-4;t+=24){
      const x=alongX?r.x+t:r.x+half+2,z=alongX?r.z+half+2:r.z+t;
      if(!inside(x,z,-1)||inRiver(x,2)||onBridge(x,z,3)||inRoad(x,z,1.5)||unitNear(x,z,1)||solidNear(x,z,1))continue;
      const hx=alongX?x:x-.4,hz=alongX?z-.4:z;
      roundCollider(x,z,.13,'lamp');cylinder(.09,.13,5.2,0x7b8270,x,2.6,z);box(alongX?.4:.9,.18,alongX?.9:.4,0xd9c596,hx,5.1,hz);
      box(alongX?.28:.7,.05,alongX?.7:.28,sodium,hx,4.99,hz);lamps.push({x:hx,z:alongX?hz-.6:hz,y:4.95,warm:true});
    }
  }
  for(const r of ROADS.filter(r=>r.kind==='dirt')){
    const alongX=r.w>=r.d,length=alongX?r.w:r.d,half=(alongX?r.d:r.w)/2;
    for(let t=-length/2+8;t<length/2-3;t+=22){
      // Either verge, whichever is clear; the tube leans out over the lane.
      for(const side of [1,-1]){
        const x=alongX?r.x+t:r.x+side*(half+.8),z=alongX?r.z+side*(half+.8):r.z+t;
        if(!inside(x,z,-1)||inRiver(x,2)||onBridge(x,z,3)||inRoad(x,z,.5)||unitNear(x,z,.4)||solidNear(x,z,.8)||BUILDINGS.some(b=>Math.hypot(x-b.door.x,z-b.door.z)<3))continue;
        const ox=alongX?0:-side*.7,oz=alongX?-side*.7:0;
        roundCollider(x,z,.1,'lamp');cylinder(.07,.1,4.4,0x6b5a45,x,2.2,z);box(alongX?.08:.8,.08,alongX?.8:.08,0x6b5a45,x+ox/2,4.25,z+oz/2);
        box(alongX?.7:.22,.06,alongX?.22:.7,0x677b69,x+ox,4.2,z+oz);box(alongX?.6:.07,.06,alongX?.07:.6,tube,x+ox,4.13,z+oz);
        lamps.push({x:x+ox,z:z+oz,y:4.1,warm:false});break;
      }
    }
  }
  // Each lamp throws a soft pool on the ground: one instanced draw, fading in
  // at dusk. A single real light follows the lamp nearest the view, so the
  // children are lit as they walk under it.
  const poolCanvas=document.createElement('canvas');poolCanvas.width=poolCanvas.height=128;
  {const g=poolCanvas.getContext('2d'),grad=g.createRadialGradient(64,64,0,64,64,64);grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.45,'rgba(255,255,255,.45)');grad.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);}
  const poolMap=new T.CanvasTexture(poolCanvas);poolMap.colorSpace=T.SRGBColorSpace;
  const pools=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:poolMap,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}),Math.max(1,lamps.length));
  {const o=new T.Object3D(),warm=new T.Color(0xffb35c),cool=new T.Color(0xcfe6ff);
   lamps.forEach((l,i)=>{const r=l.warm?9:6;o.position.set(l.x,groundHeight(l.x,l.z)+.03,l.z);o.rotation.set(-Math.PI/2,0,0);o.scale.set(r,r,1);o.updateMatrix();pools.setMatrixAt(i,o.matrix);pools.setColorAt(i,l.warm?warm:cool);});}
  pools.count=lamps.length;pools.instanceMatrix.needsUpdate=true;if(pools.instanceColor)pools.instanceColor.needsUpdate=true;pools.computeBoundingSphere();pools.visible=false;pools.renderOrder=1;scene.add(pools);
  const lampLight=new T.PointLight(0xffb35c,0,13,1.6);lampLight.position.set(0,-50,0);scene.add(lampLight);
  let lampsOn=0;
  // Timber utility poles carry sagging phone and power lines along whichever
  // verge has more room; a pole is left out in a yard or a doorway, and the
  // line runs on over one missing pole.
  // Spans of overhead line, kept for the crows that perch on them.
  const wires=[];
  const inUnit=(x,z,pad)=>UNITS.some(u=>u.solids.some(([sx,sz,sw,sd])=>Math.abs(x-sx)<sw/2+pad&&Math.abs(z-sz)<sd/2+pad));
  for(const r of asphalt){
    const alongX=r.w>=r.d,length=alongX?r.w:r.d,half=(alongX?r.d:r.w)/2;
    const verge=side=>{const out=[];for(let t=-length/2+5;t<length/2-3;t+=20){const x=alongX?r.x+t:r.x+side*(half+1.4),z=alongX?r.z+side*(half+1.4):r.z+t;
      if(inside(x,z,-1)&&!inRiver(x,2)&&!onBridge(x,z,3)&&!inRoad(x,z,.4)&&!inUnit(x,z,.3)&&!solidNear(x,z,.6)&&!BUILDINGS.some(b=>Math.hypot(x-b.door.x,z-b.door.z)<2.5))out.push([x,z]);}return out;};
    const [a,b]=[verge(-1),verge(1)],spots=a.length>=b.length?a:b;let last=null;
    for(const [x,z] of spots){
      const pole=props.pole(x,groundHeight(x,z),z,alongX);scene.add(pole.group);roundCollider(x,z,.15,'pole');
      if(last&&Math.hypot(x-last.x,z-last.z)<41&&![.25,.5,.75].some(t=>inUnit(last.x+(x-last.x)*t,last.z+(z-last.z)*t,.2))){scene.add(props.wires(last.points,pole.points));wires.push({a:last.points,b:pole.points,sag:.7});}
      last={x,z,points:pole.points};
    }
  }
  // Transparent painted ground-cover patches layer over the lawn. They sit
  // below paths/roads, whose depth naturally masks foliage at their edges.
  const grassPatch=await loader.loadAsync(new URL('../assets/textures/illustrated-grass-patch.webp',import.meta.url).href);
  grassPatch.colorSpace=T.SRGBColorSpace;grassPatch.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  for(let i=0;i<Math.round(270*(TOWN_BOUNDS.maxX-TOWN_BOUNDS.minX)*(TOWN_BOUNDS.maxZ-TOWN_BOUNDS.minZ)/20328);i++){
    const x=TOWN_BOUNDS.minX+rand()*(TOWN_BOUNDS.maxX-TOWN_BOUNDS.minX),z=TOWN_BOUNDS.minZ+rand()*(TOWN_BOUNDS.maxZ-TOWN_BOUNDS.minZ);
    if(inRiver(x)||roadNear(x,z,0,-9)||solidNear(x,z,0))continue;
    patchPositions.push([x,z,4+rand()*5]);
  }
  const patches=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:grassPatch,color:0xe8eecb,transparent:true,opacity:.75,alphaTest:.08,depthWrite:false}),patchPositions.length);
  const patchTransform=new T.Object3D();
  for(let i=0;i<patchPositions.length;i++){const [x,z,size]=patchPositions[i];patchTransform.position.set(x,-.038,z);patchTransform.rotation.set(-Math.PI/2,0,rand()*Math.PI*2);patchTransform.scale.set(size,size*(.8+rand()*.3),1);patchTransform.updateMatrix();patches.setMatrixAt(i,patchTransform.matrix);}
  patches.instanceMatrix.needsUpdate=true;patches.computeBoundingSphere();scene.add(patches);
  // Living grass near the player (grass.js); phones draw a smaller, sparser field.
  const phone=matchMedia('(pointer: coarse)').matches;
  const lawn=createGrass({scene,toon,mask:groundMask,texture:groundMaskTexture,radius:phone?17:22,count:phone?6500:14000});
  // Batch geometry by material and 24-metre cells, so off-screen streets
  // can be culled without submitting the entire town on every frame.
  scene.updateMatrixWorld(true);
  const buckets = new Map();
  const cameraOccluders=[],distantDetails=[];
  const staticMaterials = new Set(mats.values());
  const staticMeshes = [];
  const inkCells=new Map();
  scene.traverse(object => {
    if (object.isMesh && !object.userData.dynamic && staticMaterials.has(object.material)) {
      // Trees are 'land': never culled with distance, unlike small props.
      const pos=new T.Vector3().setFromMatrixPosition(object.matrixWorld),kind=object.userData.cameraOccluder?'solid':object.userData.landscape?'land':'detail',key=object.material.uuid+':'+Math.floor(pos.x/24)+':'+Math.floor(pos.z/24)+':'+kind;
      if (!buckets.has(key)) buckets.set(key,{material:object.material,geometries:[],occluder:kind==='solid',landscape:kind==='land'});
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      buckets.get(key).geometries.push(geometry);
      staticMeshes.push(object);
    }
  });
  for (const object of staticMeshes) { object.removeFromParent(); object.geometry.dispose(); }
  for (const {material,geometries,occluder,landscape} of buckets.values()) {
    const count = geometries.reduce((sum, geometry) => sum + geometry.attributes.position.count, 0);
    const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), uvs = new Float32Array(count * 2), colors = material.vertexColors ? new Float32Array(count * 3).fill(1) : null;
    let offset = 0;
    for (const geometry of geometries) {
      positions.set(geometry.attributes.position.array, offset);
      normals.set(geometry.attributes.normal.array, offset);
      if (geometry.attributes.uv) uvs.set(geometry.attributes.uv.array, offset / 3 * 2);
      if (colors && geometry.attributes.color) colors.set(geometry.attributes.color.array, offset);
      offset += geometry.attributes.position.array.length;
      geometry.dispose();
    }
    const merged = new T.BufferGeometry();
    merged.setAttribute('position', new T.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new T.BufferAttribute(normals, 3));
    merged.setAttribute('uv', new T.BufferAttribute(uvs, 2));
    if (colors) merged.setAttribute('color', new T.BufferAttribute(colors, 3));
    merged.computeBoundingSphere();
    const object = new T.Mesh(merged, occluder?material.clone():material);if(occluder){object.material.onBeforeCompile=material.onBeforeCompile;object.material.customProgramCacheKey=material.customProgramCacheKey;}if(occluder){object.material.transparent=true;cameraOccluders.push(object);}
    object.castShadow = true; object.receiveShadow = true; scene.add(object);
    if(!occluder&&!landscape&&![textures.grass,textures.dirt,textures.asphalt].includes(material.map))distantDetails.push(object);
    if(![textures.grass,textures.dirt,textures.asphalt].includes(material.map)&&!material.userData.noInk){
      const edges=new T.EdgesGeometry(merged,38);
      if(occluder){const lines=comicEdges(edges);scene.add(lines);object.userData.ink=lines;}
      else{const center=merged.boundingSphere.center,key=Math.floor(center.x/24)+':'+Math.floor(center.z/24);if(!inkCells.has(key))inkCells.set(key,[]);inkCells.get(key).push(edges);}
    }
  }
  for(const geometries of inkCells.values()){
    const size=geometries.reduce((n,g)=>n+g.attributes.position.array.length,0),positions=new Float32Array(size);let offset=0;
    for(const g of geometries){positions.set(g.attributes.position.array,offset);offset+=g.attributes.position.array.length;g.dispose();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.computeBoundingSphere();const lines=comicEdges(g,1.8);scene.add(lines);distantDetails.push(lines);
  }
  // Standing height: the highest raised floor, bridge or road under a point.
  function groundHeight(x,z){
    let height=inRoad(x,z)?.065:-.025;
    for(const [fx,fz,fw,fd,fh] of FLOORS)if(fh>height&&Math.abs(x-fx)<fw/2&&Math.abs(z-fz)<fd/2)height=fh;
    return height;
  }
  storefronts.setTime(12*60);
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();inkViewport.set(w,h);}
  return {scene,camera,renderer,colliders,groundHeight,resize,bounds:TOWN_BOUNDS,spawn:SPOTS.spawn,wind:trees.wind,updateGrass:lawn.update,wires,hotspots};
}
