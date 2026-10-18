import test from 'node:test';
import assert from 'node:assert/strict';
import {TOWN_PLAN} from '../src/town-plan.js';
import {KINDS,CATEGORIES,TREE_SPECIES,derive,planProblems,validatePlan,encodePlan,decodePlan,planFromHash} from '../src/town-layout.js';
import {canStand,safeSpawn,movePlayer} from '../src/walk.js';
const empty=()=>structuredClone(TOWN_PLAN);
const errors=plan=>planProblems(plan).filter(p=>p.level==='error');
test('new city is genuinely empty, valid and previewable without any RPG location',()=>{
  const plan=empty(),world=derive(plan);assert.deepEqual(plan.units,[]);assert.deepEqual(plan.roads,[]);assert.deepEqual(world.bridges,[]);assert.deepEqual(errors(plan),[]);assert.deepEqual(world.spots.spawn,{x:0,z:0,heading:0});assert.deepEqual(planFromHash('#plan='+encodePlan(plan)),plan);
});
test('all original scenery types can exist independently and all buildings can repeat',()=>{
  const categories=new Set(CATEGORIES.map(c=>c.id));
  for(const [kind,def] of Object.entries(KINDS)){
    assert.ok(categories.has(def.cat),kind);
    const plan=empty();plan.units.push({id:'a',kind,x:-40,z:0,rot:0});
    if(kind!=='spawn')plan.units.push({id:'b',kind,x:45,z:0,rot:1});
    assert.deepEqual(errors(plan),[],kind);assert.equal(derive(plan).units.length,kind==='spawn'?1:2);
  }
});
test('the entire 18-species tree library is available and size affects its footprint',()=>{
  assert.equal(Object.keys(TREE_SPECIES).length,18);
  for(const species of Object.keys(TREE_SPECIES)){
    const plan=empty();plan.units.push({id:'tree',kind:'tree-'+species,x:10,z:10,rot:0,size:2});assert.deepEqual(errors(plan),[]);assert.deepEqual(derive(plan).units[0].solids,[[10,10,3,3]]);
  }
});
test('FPS start follows its marker and quarter-turn rotation',()=>{
  const plan=empty();plan.units.push({id:'spawn',kind:'spawn',x:17,z:-12,rot:1});assert.deepEqual(derive(plan).spots.spawn,{x:17,z:-12,heading:Math.PI/2});
});
test('duplicate ids, overlap, out-of-bounds roads and objects are flagged',()=>{
  const plan=empty();plan.units.push({id:'a',kind:'house',x:0,z:0,rot:0},{id:'a',kind:'house',x:0,z:0,rot:0});assert.ok(errors(plan).some(p=>/share one id/.test(p.text)));assert.ok(errors(plan).some(p=>/overlaps/.test(p.text)));
  const road=empty();road.roads.push({id:'r',kind:'asphalt',x:99,z:0,w:20,d:8});assert.ok(errors(road).some(p=>/outside/.test(p.text)));
});
test('UTF-8 names, templates, rotation, road widths and tree sizes survive export/preview',()=>{
  const plan=empty();plan.name='Bandar Aie — 市中心 🌴';plan.templates=[{id:'t1',name:'Kedai 咖啡',style:'block',w:9,d:8}];plan.units.push({id:'shop',kind:'custom',x:20,z:0,rot:3,name:'Kedai 咖啡',w:9,d:8,storeys:4},{id:'tree',kind:'tree-kelapa',x:-20,z:0,rot:0,size:1.5});plan.roads.push({id:'jalan',kind:'asphalt',x:0,z:40,w:70,d:12});assert.deepEqual(decodePlan(encodePlan(plan)),plan);assert.deepEqual(planFromHash('#plan='+encodePlan(plan)),plan);
});
test('large maps encode without argument-stack overflow',()=>{
  const plan=empty();plan.units=Array.from({length:2000},(_,i)=>({id:'tree-'+i,kind:'tree-cili',x:i,z:0,rot:0,name:'Nama panjang pokok '+i}));assert.deepEqual(decodePlan(encodePlan(plan)),plan);
});
test('malformed imports and preview links are rejected instead of crashing',()=>{
  for(const plan of [null,{}, {version:2,units:[],roads:[]},{version:1,units:[{id:'x',kind:'unknown',x:0,z:0}],roads:[]},{version:1,units:[{id:'x',kind:'house',x:'x',z:0}],roads:[]},{version:1,units:[],roads:[{id:'a',kind:'asphalt',x:0,z:0,w:-1,d:5}]}])assert.ok(validatePlan(plan).length);
  assert.equal(planFromHash('#plan=broken'),null);assert.equal(planFromHash('#plan='+encodePlan({})),null);
});
test('collision prevents walking through walls or trees, slides along them and finds a safe spawn',()=>{
  const bounds={minX:-10,maxX:10,minZ:-10,maxZ:10},obstacles=[{x:0,z:0,w:2,d:4},{x:5,z:5,r:1}];
  assert.equal(canStand(0,0,bounds,obstacles),false);assert.equal(canStand(5,5,bounds,obstacles),false);assert.equal(canStand(10,0,bounds,obstacles),false);
  const spawn=safeSpawn({x:0,z:0},bounds,obstacles);assert.ok(canStand(spawn.x,spawn.z,bounds,obstacles));
  const pos={x:-5,z:0};movePlayer(pos,12,1,bounds,obstacles);assert.ok(pos.x<-1.3);assert.ok(pos.z>.9);
});
