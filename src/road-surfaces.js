const EPS = 1e-8;
const rect = r => ({ ...r, left:r.x-r.w/2, right:r.x+r.w/2, bottom:r.z-r.d/2, top:r.z+r.d/2 });

// Cut overlapping rectangles rather than drawing two coplanar road tops.
// Full-width side strips plus centre end strips cover the remainder once.
function subtract(a, b) {
  const left=Math.max(a.left,b.left),right=Math.min(a.right,b.right),bottom=Math.max(a.bottom,b.bottom),top=Math.min(a.top,b.top);
  if(right-left<=EPS || top-bottom<=EPS)return [a];
  return [
    { ...a, right:left }, { ...a, left:right },
    { ...a, left, right, top:bottom }, { ...a, left, right, bottom:top }
  ].filter(r=>r.right-r.left>EPS&&r.top-r.bottom>EPS);
}

// Only render geometry is partitioned. The town's logical roads still drive
// navigation, standing height, planting, the minimap and kerb openings.
export function roadSurfaces(roads, townBounds=null) {
  const candidates=roads.map(r=>({...r}));
  if(townBounds)for(const r of roads.filter(r=>r.kind==='asphalt')){
    const alongX=r.w>=r.d,lo=alongX?r.x-r.w/2:r.z-r.d/2,hi=alongX?r.x+r.w/2:r.z+r.d/2;
    const [min,max,edge]=alongX?[townBounds.minX,townBounds.maxX,90]:[townBounds.minZ,townBounds.maxZ,80];
    for(const [from,to] of [lo<=min+1?[-edge,lo]:null,hi>=max-1?[hi,edge]:null].filter(Boolean)){
      const mid=(from+to)/2,len=to-from;
      if(len>EPS)candidates.push({...r,x:alongX?mid:r.x,z:alongX?r.z:mid,w:alongX?len:r.w,d:alongX?r.d:len});
    }
  }
  // Asphalt owns junctions; dirt paths stop cleanly at its edge. For roads
  // of the same kind, the first road owns their common area.
  candidates.sort((a,b)=>Number(b.kind==='asphalt')-Number(a.kind==='asphalt'));
  const occupied=[],surfaces=[];
  for(const road of candidates){
    const whole=rect(road);let pieces=[whole];
    for(const earlier of occupied)pieces=pieces.flatMap(p=>subtract(p,earlier));
    for(const p of pieces)surfaces.push({id:p.id,kind:p.kind,x:(p.left+p.right)/2,z:(p.bottom+p.top)/2,w:p.right-p.left,d:p.top-p.bottom});
    occupied.push(whole);
  }
  return surfaces;
}
