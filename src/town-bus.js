import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { outline } from './illustration.js?v=0.1.0';

export const TOWN_BUS_URL = new URL('../assets/models/town-bus.glb', import.meta.url).href;

export async function loadTownBus(renderer, url = TOWN_BUS_URL) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Town bus asset: HTTP ${response.status}`);
  const { scene: model } = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL('.', url).href);
  const bounds = new T.Box3().setFromObject(model), size = bounds.getSize(new T.Vector3());
  if (![size.x, size.y, size.z].every(v => Number.isFinite(v) && v > 0)) throw new Error('Town bus has invalid bounds');
  // Uniform scale preserves the supplied shape inside the existing bus collider.
  const scale = Math.min(4.15 / size.x, 10.05 / size.z);
  const center = bounds.getCenter(new T.Vector3());
  model.position.set(-center.x, -bounds.min.y, -center.z);
  const meshes = [];
  model.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
    mesh.castShadow = mesh.receiveShadow = true;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      material.metalness = 0; material.roughness = .85;
      if (material.map) material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    }
    meshes.push(mesh);
  });
  for (const mesh of meshes) outline(mesh, 1.2);
  const bus = new T.Group();
  bus.add(model); bus.scale.setScalar(scale);
  // This export faces +Z, matching the original parked bus.
  bus.userData.townBus = { source: 'glb' };
  return bus;
}
