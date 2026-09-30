import * as THREE from "three";
import { createBermudaBiomes } from "./bermuda_biomes.js";
import { createStormWater } from "./bermuda_water.js";
import { WORLD } from "./world_config.js";
import { bermudaSeabedHeight } from "./bermuda_terrain.js";
import { createBermudaTerrainMesh } from "./bermuda_terrain_mesh.js";
import { createBermudaWreck } from "./bermuda_wreck.js";
import { createBermudaWeather } from "./bermuda_weather.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { bermudaCoralColonyGeometry } from "./bermuda_reef.js";

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
  const rockGeo = keep(new THREE.IcosahedronGeometry(1, 2)),
    rv = rockGeo.attributes.position;
  for (let i = 0; i < rv.count; i++) {
    const k =
      1 +
      0.13 *
        Math.sin(rv.getX(i) * 8 + rv.getZ(i) * 7) *
        Math.cos(rv.getY(i) * 11);
    rv.setXYZ(i, rv.getX(i) * k, rv.getY(i) * k, rv.getZ(i) * k);
  }
  rockGeo.computeVertexNormals();
  const rockMat = keep(
    new THREE.MeshStandardMaterial({ color: 0x48595c, roughness: 1 }),
  );
  addSurfaceDetail(rockMat, "stone", 1);
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 60),
    dummy = new THREE.Object3D(),
    colliders = [];
  rocks.name = "bermuda_shelf_outcrops";
  root.add(rocks);
  for (let i = 0; i < 60; i++) {
    const x = (i % 2 ? 1 : -1) * (90 + (i % 5) * 32),
      z = 90 - Math.floor(i / 2) * 39,
      size = 3 + (i % 4) * 2;
    dummy.position.set(x, bermudaSeabedHeight(x, z) + size * 0.3, z);
    dummy.scale.set(size, size * 0.7, size * 1.2);
    dummy.rotation.y = i * 0.8;
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
    colliders.push({
      type: "ellipsoid",
      x: dummy.position.x,
      y: dummy.position.y,
      z: dummy.position.z,
      axes: new THREE.Vector3(
        size * 1.13,
        size * 0.7 * 1.13,
        size * 1.2 * 1.13,
      ),
      rotation: dummy.quaternion.clone(),
      id: `bermuda_rock_${i}`,
    });
  }
  const coralGeo = keep(bermudaCoralColonyGeometry()),
    coralMat = keep(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }),
    );
  const corals = new THREE.InstancedMesh(coralGeo, coralMat, 64);
  corals.name = "bermuda_nursery_coral";
  root.add(corals);
  for (let i = 0; i < 64; i++) {
    const x = (i % 2 ? 1 : -1) * (28 + (i % 9) * 4),
      z = 120 - Math.floor(i / 2) * 7;
    dummy.position.set(x, bermudaSeabedHeight(x, z) + 0.1, z);
    dummy.scale.setScalar(3.0 + (i % 3) * 1.2);
    dummy.rotation.y = i;
    dummy.updateMatrix();
    corals.setMatrixAt(i, dummy.matrix);
  }
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
      rocks.dispose();
      corals.dispose();
      for (const r of resources) r.dispose();
      resources.clear();
      colliders.length = 0;
      root.clear();
    },
  };
}
