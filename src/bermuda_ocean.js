import * as THREE from "three";
import { createBermudaBiomes } from "./bermuda_biomes.js";
import { createStormWater, stormWaveHeight } from "./bermuda_water.js";
import { WORLD } from "./world_config.js";
import { bermudaSeabedHeight } from "./bermuda_terrain.js";
import { createBermudaTerrainMesh } from "./bermuda_terrain_mesh.js";
import { createBermudaWreck } from "./bermuda_wreck.js";
import { createBermudaWeather } from "./bermuda_weather.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { createBermudaGeology } from "./bermuda_geology.js";
import { createBermudaColonies } from "./bermuda_colonies.js";

/** 风暴海域独立海床、育幼礁与可进入的邮轮沉船。 */
export function createBermudaOcean(parent, options = {}) {
  const root = new THREE.Group();
  root.name = "ocean_environment";
  parent.add(root);
  const resources = new Set(),
    keep = (r) => (resources.add(r), r),
    time = { value: 0 };
  let disposed = false;
  const g = keep(createBermudaTerrainMesh());
  const p = g.attributes.position,
    colors = new Float32Array(p.count * 3),
    c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = bermudaSeabedHeight(x, z);
    p.setY(i, y);
    c.set(z > -160 ? "#778c87" : "#33434a").multiplyScalar(
      0.9 + 0.09 * Math.sin(x * 0.18 + z * 0.21),
    );
    c.toArray(colors, i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const sand = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }),
  );
  addSurfaceDetail(sand, "stone", 0.65);
  const floor = new THREE.Mesh(g, sand);
  floor.name = "bermuda_eroded_seabed";
  root.add(floor);
  const { material: waterMat } = createStormWater(root, keep, time);
  const shelfArt = createBermudaGeology(root, {
    heightAt: bermudaSeabedHeight,
    shelf: true,
  });
  root.userData.shelfArt = shelfArt;
  const colliders = [...shelfArt.colliders];
  const nurseryArt = createBermudaColonies(root, {
    heightAt: bermudaSeabedHeight,
    nursery: true,
  });
  root.userData.nurseryArt = nurseryArt;
  const wreck = createBermudaWreck(root, { heightAt: bermudaSeabedHeight });
  colliders.push(...wreck.colliders);
  const biomes = createBermudaBiomes(root, { heightAt: bermudaSeabedHeight });
  colliders.push(...biomes.colliders);
  const weather = createBermudaWeather(root, options);
  const lights = Array.from({ length: 3 }, () => {
    const l = new THREE.PointLight(0x65d7c1, 0, 50, 1.4);
    root.add(l);
    return l;
  });
  const candidates = [...wreck.lightSources, ...biomes.lightSources];
  return {
    root,
    heightAt: bermudaSeabedHeight,
    waterHeightAt: (x, z, now) => WORLD.surfaceY + stormWaveHeight(x, z, now),
    colliders,
    obstacles: [],
    landmarks: [...wreck.landmarks, ...biomes.landmarks],
    wreck,
    weather,
    update(
      elapsed,
      position,
      dt = 0,
      highQuality = true,
      cameraPosition = position,
      reducedMotion = false,
    ) {
      if (disposed) return;
      time.value = elapsed;
      biomes.update(elapsed, position, highQuality);
      nurseryArt.update(elapsed, position);
      shelfArt.update(elapsed, position);
      waterMat.opacity = cameraPosition.y > WORLD.surfaceY ? 0.94 : 0.62;
      weather.update(
        elapsed,
        position,
        dt,
        highQuality,
        cameraPosition,
        reducedMotion,
      );
      candidates.sort(
        (a, b) =>
          a.position.distanceToSquared(position) -
          b.position.distanceToSquared(position),
      );
      lights.forEach((l, i) => {
        const source = candidates[i];
        l.visible = !!source && source.position.distanceTo(position) < 110;
        if (source) {
          l.position.copy(source.position);
          l.color.set(source.color);
          l.intensity = source.intensity;
          l.distance = source.distance;
        }
      });
    },
    reset() {
      weather.reset();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      weather.dispose();
      wreck.dispose();
      biomes.dispose();
      root.removeFromParent();
      shelfArt.dispose();
      nurseryArt.dispose();
      for (const r of resources) r.dispose();
      resources.clear();
      colliders.length = 0;
      root.clear();
    },
  };
}
