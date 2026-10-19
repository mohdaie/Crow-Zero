import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {VERSION,missionScore,makesTopTen,SCORE_MULTIPLIER,DIFFICULTY,crowsWanted,MOVE,moveSpeed,SHOTGUN,SNIPER,bulletPath,bearing,crowCallout,CROW_RADIUS,pelletOffsets,raySphere,pelletsKill,noticeRate,coverNear,stealthLabel,missionState,MISSION,clock} from '../src/hunt-rules.js';
import {planProblems} from '../src/town-layout.js';
import {CITY_PLAN} from '../src/city-plan.js';
import {derive} from '../src/town-layout.js';
test('built-in city map is valid, has a start point and uses the city avenues',()=>{
  assert.deepEqual(planProblems(CITY_PLAN),[]);
  const town=derive(CITY_PLAN);assert.ok(town.units.some(u=>u.kind==='spawn'));assert.ok(town.roads.length>=3);
  assert.ok(CITY_PLAN.units.filter(u=>u.kind==='custom'&&u.storeys>=3).length>=6,'office and flat blocks');
});
test('pellets spread inside the cone, tighter when aiming',()=>{
  let seed=1;const rand=()=>(seed=seed*16807%2147483647)/2147483647;
  const hip=pelletOffsets(rand),aimed=pelletOffsets(rand,SHOTGUN.pellets,SHOTGUN.aimSpread);
  assert.equal(hip.length,SHOTGUN.pellets);
  for(const [x,y] of hip)assert.ok(Math.hypot(x,y)<=SHOTGUN.hipSpread+1e-9);
  for(const [x,y] of aimed)assert.ok(Math.hypot(x,y)<=SHOTGUN.aimSpread+1e-9);
});
test('ray-sphere hits ahead, misses beside and behind',()=>{
  const o={x:0,y:0,z:0},dir={x:0,y:0,z:-1};
  assert.ok(Math.abs(raySphere(o,dir,{x:0,y:0,z:-10},.5)-9.5)<1e-9);
  assert.equal(raySphere(o,dir,{x:1,y:0,z:-10},.5),Infinity);
  assert.equal(raySphere(o,dir,{x:0,y:0,z:10},.5),Infinity);
  assert.ok(raySphere(o,dir,{x:.4,y:0,z:-20},CROW_RADIUS)<Infinity);
});
test('one pellet downs a crow in range; far crows need two; too far, none',()=>{
  assert.equal(pelletsKill(20,1),true);assert.equal(pelletsKill(20,0),false);
  assert.equal(pelletsKill(SHOTGUN.killRange+5,1),false);assert.equal(pelletsKill(SHOTGUN.killRange+5,2),true);
  assert.equal(pelletsKill(SHOTGUN.range+1,9),false);
});
test('crows notice a standing player far sooner than a hidden one',()=>{
  assert.ok(noticeRate({distance:15})>0,'standing in the open at 15 m is seen');
  assert.ok(noticeRate({distance:15,crouched:true,covered:true})<0,'hidden at 15 m is not');
  assert.ok(noticeRate({distance:3,crouched:true,covered:true})>0,'right under the crow, even hiding is noticed');
  assert.ok(noticeRate({distance:10,moving:true})>noticeRate({distance:10}));
});
test('cover means a wall, tree or car within reach',()=>{
  const colliders=[{x:0,z:0,w:4,d:4},{x:20,z:0,r:.4}];
  assert.equal(coverNear(3,0,colliders),true);assert.equal(coverNear(21,0,colliders),true);assert.equal(coverNear(10,10,colliders),false);
  assert.equal(stealthLabel(true,true),'TERSOROK');assert.equal(stealthLabel(false,false),'KELIHATAN');assert.equal(stealthLabel(true,false),'SEPARA');
});
test('mission ends on target, time or ammo, and the clock formats',()=>{
  assert.equal(missionState({kills:MISSION.target,timeLeft:10,shells:3}),'won');
  assert.equal(missionState({kills:1,timeLeft:0,shells:3}),'time');
  assert.equal(missionState({kills:1,timeLeft:10,shells:0}),'ammo');
  assert.equal(missionState({kills:1,timeLeft:10,shells:3}),'playing');
  assert.equal(clock(300),'05:00');assert.equal(clock(61.2),'01:02');assert.equal(clock(-3),'00:00');
});
test('sniper bullet passes through crows in a line, stops at walls and range',()=>{
  const hits=[[40,'b'],[12,'a'],[90,'c'],[150,'d']];
  assert.deepEqual(bulletPath(hits),['a','b','c']);
  assert.deepEqual(bulletPath(hits,50),['a','b']);
  assert.deepEqual(bulletPath([[SNIPER.range+1,'far']]),[]);
  assert.ok(SNIPER.noiseRadius>SHOTGUN.noiseRadius,'the Barrett is louder than the suppressed shotgun');
  assert.equal(MISSION.target,20);
});
test('callouts name the busiest direction relative to where the player faces',()=>{
  // yaw 0 faces -z: ahead is -z, right is +x.
  const me={x:0,z:0,yaw:0};
  assert.equal(bearing(me,{x:0,z:-20}).side,'depan');assert.equal(bearing(me,{x:15,z:0}).side,'kanan');
  assert.equal(bearing(me,{x:-15,z:0}).side,'kiri');assert.equal(bearing(me,{x:0,z:20}).side,'belakang');
  assert.equal(crowCallout(me,[{x:0,z:-21}]).text,'1 GAGAK 20M DI HADAPAN');
  assert.equal(crowCallout(me,[{x:-10,z:0},{x:-20,z:2},{x:-30,z:-3},{x:0,z:-15}]).text,'3 GAGAK DI KIRI ANDA');
  assert.match(crowCallout(me,[{x:0,z:30},{x:2,z:25}]).text,/DI BELAKANG ANDA — PUSING!/);
  // Turning 90° right puts a crow that was ahead on the left.
  assert.equal(bearing({x:0,z:0,yaw:-Math.PI/2},{x:0,z:-20}).side,'kiri');
  assert.equal(crowCallout(me,[{x:0,z:-500}]),null);
});
test('difficulty sets how many crows there are, and the version matches package.json',()=>{
  const {mudah,biasa,sukar}=DIFFICULTY;
  assert.ok(mudah.start>biasa.start&&biasa.start>sukar.start);
  assert.ok(crowsWanted(mudah,0)>crowsWanted(biasa,0)&&crowsWanted(biasa,0)>crowsWanted(sukar,0));
  assert.equal(crowsWanted(biasa,600),biasa.max);
  assert.ok(sukar.stay[1]<biasa.stay[1]);
  assert.equal(VERSION,JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version);
});
test('difficulty sets the clock: 5, 3 and 2 minutes',()=>{
  assert.deepEqual([DIFFICULTY.mudah.seconds,DIFFICULTY.biasa.seconds,DIFFICULTY.sukar.seconds],[300,180,120]);
  assert.equal(DIFFICULTY.biasa.label,'SEDERHANA');
});
test('holding a direction for 2 s breaks into a louder run',()=>{
  assert.equal(moveSpeed({held:1.9}),MOVE.walk);assert.equal(moveSpeed({held:2}),MOVE.run);
  assert.ok(moveSpeed({held:5,crouched:true})<MOVE.walk);assert.ok(moveSpeed({held:5,aim:1})<MOVE.walk);
  assert.ok(noticeRate({distance:30,running:true})>0&&noticeRate({distance:30,moving:true})<0,'running is heard further');
});
test('score: crows, time bonus when won, accuracy, times difficulty; top-10 check',()=>{
  assert.deepEqual(missionScore({kills:20,shots:25,timeLeft:30,won:true,difficulty:'mudah'}),{score:2000+300+400,accuracy:80});
  assert.equal(missionScore({kills:20,shots:25,timeLeft:30,won:true,difficulty:'sukar'}).score,5400);
  assert.equal(missionScore({kills:5,shots:0,timeLeft:0,won:false,difficulty:'biasa'}).score,750);
  // Never above the ceiling the server enforces.
  for(const d of Object.keys(SCORE_MULTIPLIER))assert.ok(missionScore({kills:20,shots:20,timeLeft:300,won:true,difficulty:d}).score<=Math.ceil((20*100+3000+500)*SCORE_MULTIPLIER[d]));
  const board=Array.from({length:10},(_,i)=>({score:1000-i*50}));
  assert.equal(makesTopTen(600,board),true);assert.equal(makesTopTen(550,board),false);assert.equal(makesTopTen(10,board.slice(0,4)),true);assert.equal(makesTopTen(0,[]),false);
});
