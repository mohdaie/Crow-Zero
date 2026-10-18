export const RADIUS=.32;
export function canStand(x,z,bounds,obstacles){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<bounds.minX+RADIUS||x>bounds.maxX-RADIUS||z<bounds.minZ+RADIUS||z>bounds.maxZ-RADIUS)return false;
  return !obstacles.some(o=>o.r!==undefined?Math.hypot(x-o.x,z-o.z)<o.r+RADIUS:Math.hypot(Math.max(0,Math.abs(x-o.x)-o.w/2),Math.max(0,Math.abs(z-o.z)-o.d/2))<RADIUS);
}
export function safeSpawn(spawn,bounds,obstacles){
  if(canStand(spawn.x,spawn.z,bounds,obstacles))return {x:spawn.x,z:spawn.z};
  for(let radius=1;radius<=Math.hypot(bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ);radius+=1)for(let i=0;i<Math.max(8,radius*6);i++){
    const angle=i/Math.max(8,radius*6)*Math.PI*2,x=spawn.x+Math.cos(angle)*radius,z=spawn.z+Math.sin(angle)*radius;
    if(canStand(x,z,bounds,obstacles))return {x,z};
  }
  throw Error('Tiada ruang berjalan. Padam atau pindahkan bangunan di editor.');
}
export function movePlayer(position,dx,dz,bounds,obstacles){
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
  for(let i=0;i<steps;i++){const x=position.x+dx/steps;if(canStand(x,position.z,bounds,obstacles))position.x=x;const z=position.z+dz/steps;if(canStand(position.x,z,bounds,obstacles))position.z=z;}
  return position;
}
