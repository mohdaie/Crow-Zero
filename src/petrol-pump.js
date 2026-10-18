import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toon } from './illustration.js?v=0.1.0';

// One pump from the Vintage PETRONAS Station model: plinth, enamel pedestal,
// charcoal head, mechanical counter, two hoses and nozzles. Six meshes, one
// per material. Metres, standing on a 0.2 m island, facing +Z.
export const PETROL_PUMP_URL = new URL('../assets/models/petrol-pump.glb', import.meta.url).href;

export async function loadPetrolPump(url = PETROL_PUMP_URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Petrol pump asset: HTTP ${response.status}`);
  const { scene: model } = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL('.', url).href);
  const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3());
  if (![size.x, size.y, size.z].every(v => Number.isFinite(v) && v > 0)) throw new Error('Petrol pump has invalid bounds');
  // Same flat cel ramp as the rest of the town, keeping the model's colours.
  const materials = new Map();
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
    const source = mesh.material, key = source.color.getHex();
    if (!materials.has(key)) materials.set(key, toon(source.color.clone()));
    mesh.material = materials.get(key); source.dispose();
  });
  // The town registers these materials so placed pumps are baked and inked
  // with the other static scenery instead of drawing on their own.
  return {
    height: bounds.max.y,
    materials: [...materials.values()],
    create() {
      const pump = model.clone(true);
      pump.traverse(mesh => { if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true; });
      pump.userData.petrolPump = { source: 'glb' };
      return pump;
    }
  };
}
