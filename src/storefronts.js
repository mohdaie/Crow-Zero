import * as T from 'three';
import { isShopOpen, shopHours, SHOPS } from './shop-hours.js?v=0.1.0';
import { timeLabel } from './clock.js?v=0.1.0';

// Independent dynamic meshes: the town's static batcher must not merge them.
export async function createStorefronts(renderer) {
  const atlas = await new T.TextureLoader().loadAsync(new URL('../assets/textures/open-shop-interiors.webp', import.meta.url).href);
  atlas.colorSpace = T.SRGBColorSpace; atlas.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const interior = new T.MeshBasicMaterial({ map: atlas, toneMapped: false });
  const materials = new Map(), fronts = [];
  function painted(key, paint) {
    if (materials.has(key)) return materials.get(key);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 192; paint(canvas.getContext('2d'));
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    const material = new T.MeshBasicMaterial({ map, toneMapped: false }); materials.set(key, material); return material;
  }
  const shutter = painted('shutter', ctx => {
    ctx.fillStyle = '#5a7667'; ctx.fillRect(0,0,512,192);
    for(let y=0;y<192;y+=12){ctx.fillStyle='#354d41';ctx.fillRect(0,y,512,3);ctx.fillStyle='#789181';ctx.fillRect(0,y+3,512,2);}
    ctx.fillStyle='#263b31';ctx.fillRect(234,159,44,8);
  });
  function board(place, open) {
    const [from,to]=shopHours(place),hours=`${timeLabel(from)} – ${timeLabel(to)}`;
    return painted(`${open}:${hours}`,ctx=>{
      ctx.fillStyle=open?'#f6edcf':'#e1d7c0';ctx.fillRect(0,0,512,192);
      ctx.strokeStyle=open?'#315e46':'#7c5745';ctx.lineWidth=12;ctx.strokeRect(6,6,500,180);
      ctx.fillStyle=ctx.strokeStyle;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 66px sans-serif';ctx.fillText(open?'BUKA':'TUTUP',256,74);
      ctx.font='bold 31px sans-serif';ctx.fillText(hours,256,144);
    });
  }
  function plane(parent,spec,material,tile) {
    const geometry=new T.PlaneGeometry(spec.w,spec.h);
    if(tile!==undefined){
      // The generated atlas is 2×4; measured row edges keep divider lines out.
      const row=Math.floor(tile/2),col=tile%2,edges=[0,280,560,828,1122],inset=.006;
      const left=col/2+inset,right=(col+1)/2-inset;
      const lo=1-edges[row+1]/1122+inset,hi=1-edges[row]/1122-inset;
      const u0=spec.half===1?(left+right)/2:left,u1=spec.half===0?(left+right)/2:right,uv=geometry.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setXY(i,u0+uv.getX(i)*(u1-u0),lo+uv.getY(i)*(hi-lo));
    }
    const mesh=new T.Mesh(geometry,material);mesh.position.set(spec.x,spec.y,spec.z);mesh.rotation.y=spec.turn||0;
    mesh.userData.dynamic=true;mesh.userData.noInk=true;parent.add(mesh);return mesh;
  }
  return {
    add(place,parent,{panels=[],badge}){
      const open=new T.Group(),closed=new T.Group(),openBoard=new T.Group(),closedBoard=new T.Group();parent.add(open,closed,openBoard,closedBoard);
      for(const panel of panels){if(SHOPS[place].tile!==undefined)plane(open,panel,interior,SHOPS[place].tile);plane(closed,{...panel,z:panel.z+(panel.turn?-.012:.012)},shutter);}
      plane(openBoard,{w:1.9,h:.71,...badge},board(place,true));plane(closedBoard,{w:1.9,h:.71,...badge},board(place,false));
      const state={place,open,closed,openBoard,closedBoard,active:null};fronts.push(state);
    },
    setTime(minute){for(const f of fronts){const active=isShopOpen(f.place,minute);if(active===f.active)continue;f.active=active;f.open.visible=f.openBoard.visible=active;f.closed.visible=f.closedBoard.visible=!active;}},
    snapshot:()=>fronts.map(f=>({place:f.place,open:f.active,interiorVisible:f.open.visible&&SHOPS[f.place].tile!==undefined,shutterVisible:f.closed.visible&&f.closed.children.length>0,hours:[...shopHours(f.place)]}))
  };
}
