import { safeSpawn, movePlayer } from './walk.js?v=0.1.0';
const status=document.getElementById('status'), canvas=document.getElementById('world');
try {
  // Import the renderer only after selecting this visit's plan.
  if(!location.hash.includes('plan=')){
    let saved;try{saved=JSON.parse(localStorage.getItem('crow-zero-draft-v1')||'null')?.plan;}catch{}
    if(saved){const encoded=btoa(Array.from(new TextEncoder().encode(JSON.stringify(saved)),c=>String.fromCharCode(c)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');history.replaceState(null,'','#plan='+encoded);}
  }
  const {planFromHash}=await import('./town-layout.js?v=0.1.0');
  if(location.hash.includes('plan=')&&!planFromHash(location.hash))throw Error('Map tidak sah. Kembali ke editor dan betulkan masalah layout.');
  const {makeWorld}=await import('./world.js?v=0.1.0');
  const world=await makeWorld(canvas),{camera,renderer,scene,bounds,colliders}=world;
  const position=safeSpawn(world.spawn,bounds,colliders);let yaw=world.spawn.heading+Math.PI,pitch=0,last=performance.now();
  camera.rotation.order='YXZ';camera.fov=70;camera.updateProjectionMatrix();
  const keys=new Set(),stick={x:0,z:0};let look=null;
  window.addEventListener('resize',world.resize);world.resize();
  window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();stick.x=stick.z=0;});
  canvas.onclick=()=>{if(matchMedia('(pointer:fine)').matches)canvas.requestPointerLock?.()?.catch?.(()=>{});};
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){yaw-=e.movementX*.0025;pitch=Math.max(-1.4,Math.min(1.4,pitch-e.movementY*.0025));}});
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'){look={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
  canvas.addEventListener('pointermove',e=>{if(look?.id!==e.pointerId)return;yaw-=(e.clientX-look.x)*.006;pitch=Math.max(-1.4,Math.min(1.4,pitch-(e.clientY-look.y)*.006));look.x=e.clientX;look.y=e.clientY;});
  const endLook=()=>{look=null;};canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);
  const joy=document.getElementById('joystick'),knob=document.getElementById('knob');let joystickId=null;
  function updateStick(e){const r=joy.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dz=e.clientY-r.top-r.height/2,len=Math.max(38,Math.hypot(dx,dz));stick.x=dx/len;stick.z=dz/len;knob.style.transform=`translate(${stick.x*30}px,${stick.z*30}px)`;}
  joy.onpointerdown=e=>{joystickId=e.pointerId;joy.setPointerCapture(e.pointerId);updateStick(e);};joy.onpointermove=e=>{if(e.pointerId===joystickId)updateStick(e);};
  const stop=()=>{joystickId=null;stick.x=stick.z=0;knob.style.transform='';};joy.onpointerup=stop;joy.onpointercancel=stop;
  document.getElementById('respawn').onclick=()=>{Object.assign(position,safeSpawn(world.spawn,bounds,colliders));yaw=world.spawn.heading+Math.PI;pitch=0;};
  status.textContent='Preview map · WASD + mouse / joystick + leret';document.getElementById('loading').hidden=true;
  // Expose only read-only diagnostics for browser verification.
  globalThis.crowPreview={ready:true,get position(){return {...position};},get objects(){return colliders.length;}};
  function frame(at){const dt=Math.min(.05,(at-last)/1000);last=at;
    let dx=stick.x+Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    let dz=stick.z+Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
    const length=Math.max(1,Math.hypot(dx,dz));dx/=length;dz/=length;
    movePlayer(position,(dx*Math.cos(yaw)+dz*Math.sin(yaw))*dt*5,(-dx*Math.sin(yaw)+dz*Math.cos(yaw))*dt*5,bounds,colliders);
    camera.position.set(position.x,world.groundHeight(position.x,position.z)+1.65,position.z);camera.rotation.set(pitch,yaw,0);
    world.wind.value=at/1000;world.updateGrass(at/1000,position,camera.position);renderer.render(scene,camera);requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}catch(error){status.textContent='Preview gagal';document.getElementById('loading').textContent=error.message;console.error(error);}
