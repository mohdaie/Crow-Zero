import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { outline } from './illustration.js?v=0.1.0';

export const TOWN_CAR_URL = new URL('../assets/models/town-sedan.glb', import.meta.url).href;

// Paint only the red body panels. The shared texture also contains the glass,
// tyres, trim and rear lamps; tinting the entire material would lose those.
function whitePaint(material) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vCarLocal;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCarLocal = position;');
    shader.fragmentShader = 'varying vec3 vCarLocal;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float red = diffuseColor.r;
      float paint = smoothstep(.25, .65, (red - max(diffuseColor.g, diffuseColor.b)) / max(red, .001));
      // This export faces -Z. Keep the small red rear lamps below the boot.
      bool rearLamp = vCarLocal.z > .445 && vCarLocal.y > -.055 && vCarLocal.y < .015
        && abs(vCarLocal.x) > .09 && abs(vCarLocal.x) < .205;
      if (rearLamp) paint = 0.0;
      vec3 pearl = vec3(1.0, .99, .955) * (.55 + .4 * sqrt(red));
      diffuseColor.rgb = mix(diffuseColor.rgb, pearl, paint);
    `);
  };
  material.customProgramCacheKey = () => 'town-sedan-white-v1';
}

export async function loadTownCars(renderer, url = TOWN_CAR_URL) {
  // Bound the optional download so a missing car asset cannot block startup.
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Town car asset: HTTP ${response.status}`);
  const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), new URL('.', url).href);
  const template = gltf.scene;
  const bounds = new T.Box3().setFromObject(template), size = bounds.getSize(new T.Vector3());
  if (![size.x, size.y, size.z].every(v => Number.isFinite(v) && v > 0)) throw new Error('Town car has invalid bounds');
  // Keep mirrors inside the existing 1.9 x 4.5 m collision footprint.
  const scale = Math.min(1.86 / size.x, 4.4 / size.z);
  const center = bounds.getCenter(new T.Vector3());
  const variants = new Map();
  template.traverse(mesh => {
    if (!mesh.isMesh) return;
    if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
    mesh.castShadow = mesh.receiveShadow = true;
    const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const pairs = originals.map(original => {
      const red = original.clone();
      red.metalness = 0; red.roughness = .82;
      if (red.map) red.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      const white = red.clone(); whitePaint(white);
      return { red, white };
    });
    variants.set(mesh.name, pairs);
    mesh.material = Array.isArray(mesh.material) ? pairs.map(p => p.red) : pairs[0].red;
  });
  return {
    create(color) {
      const white = new T.Color(color).getHSL({}).l > .65;
      // Geometry and the single embedded texture are shared by both cars.
      const model = template.clone(true), car = new T.Group();
      model.position.set(-center.x, -bounds.min.y, -center.z);
      car.add(model); car.scale.setScalar(scale); car.rotation.y = Math.PI;
      car.userData.townCar = { source: 'glb', paint: white ? 'white' : 'red' };
      model.traverse(mesh => {
        if (!mesh.isMesh) return;
        const materials = variants.get(mesh.name).map(p => white ? p.white : p.red);
        mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
      });
      // A single silhouette pass, rather than outlining every triangle.
      const meshes = []; model.traverse(mesh => { if (mesh.isMesh) meshes.push(mesh); });
      for (const mesh of meshes) outline(mesh, 1.2);
      return car;
    }
  };
}
