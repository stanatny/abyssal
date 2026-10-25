import * as THREE from "three";
import {
  amazonChannels,
  amazonSeabedHeight,
  amazonSurfaceHeight,
  AMAZON_WORLD,
} from "./amazon_config.js";
import {
  acquireAmazonLily,
  createAmazonLilyMaterial,
} from "./amazon_lily_asset.js";

/** 沿旧浮叶种子分布，微调重叠叶缘；花朵独立长在叶旁，不占用航道碰撞。 */
export function amazonWaterlilyLayout() {
  const leaves = [],
    flowers = [];
  const waterFits = (x, z, radius) => {
    for (let j = 0; j < 16; j++)
      if (
        amazonSurfaceHeight(
          x + Math.cos((j * Math.PI) / 8) * radius,
          z + Math.sin((j * Math.PI) / 8) * radius,
        ) >
        AMAZON_WORLD.surfaceY - 0.3
      )
        return false;
    return true;
  };
  const separate = (x, z, radius) =>
    leaves.every(
      (l) => Math.hypot(x - l.x, z - l.z) > radius + l.diameter * 0.5 + 0.14,
    );
  for (let i = 0; i < 900 && leaves.length < 230; i++) {
    const z = 115 - ((i * 73.97) % 1380),
      ch = amazonChannels(z)[i % 2],
      x =
        ch.center +
        (i % 4 < 2 ? -1 : 1) * ch.halfWidth * (0.6 + (i % 9) * 0.017);
    if (amazonSeabedHeight(x, z) <= -80) continue;
    const radius = 0.9 + (i % 5) * 0.25;
    for (let attempt = 0; attempt < 65; attempt++) {
      const ring = attempt ? Math.ceil(attempt / 16) * 1.25 : 0,
        angle = attempt * 2.399,
        px = x + Math.cos(angle) * ring,
        pz = z + Math.sin(angle) * ring;
      if (!waterFits(px, pz, radius + 0.12) || !separate(px, pz, radius))
        continue;
      leaves.push({
        x: px,
        z: pz,
        y: AMAZON_WORLD.surfaceY + 0.035,
        diameter: radius * 2,
        yaw: i * 2.399,
        sourceIndex: i,
        offset: Math.hypot(px - x, pz - z),
      });
      break;
    }
  }
  for (let j = 3; j < leaves.length; j += 12) {
    const l = leaves[j],
      diameter = 0.5 + (j % 3) * 0.06,
      radius = diameter * 0.5;
    for (let a = 0; a < 16; a++) {
      const angle = l.yaw + (a * Math.PI) / 8,
        x = l.x + Math.cos(angle) * (l.diameter * 0.5 + radius + 0.2),
        z = l.z + Math.sin(angle) * (l.diameter * 0.5 + radius + 0.2);
      if (!waterFits(x, z, radius + 0.12) || !separate(x, z, radius)) continue;
      flowers.push({
        x,
        z,
        y: AMAZON_WORLD.surfaceY + 0.035,
        diameter,
        yaw: -j * 1.31,
      });
      break;
    }
  }
  return { leaves, flowers };
}

export function createAmazonWaterlilies(parent, resources) {
  const root = new THREE.Group();
  root.name = "amazon_victoria_waterlilies";
  parent.add(root);
  const time = { value: 0 },
    layout = amazonWaterlilyLayout(),
    assets = {},
    chunks = new Map(),
    dummy = new THREE.Object3D();
  for (const kind of ["leaf", "flower"]) {
    const asset = (assets[kind] = acquireAmazonLily(kind));
    resources.add({ dispose: asset.release });
    const material = createAmazonLilyMaterial(asset, time, resources);
    const groups = new Map();
    for (const item of kind === "leaf" ? layout.leaves : layout.flowers) {
      const key = `${Math.floor(item.x / 96)},${Math.floor(item.z / 96)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    for (const [key, items] of groups) {
      const mesh = new THREE.InstancedMesh(
        asset.geometry,
        material,
        items.length,
      );
      mesh.name = `victoria_${kind}_hf`;
      for (let i = 0; i < items.length; i++) {
        const v = items[i];
        dummy.position.set(v.x, v.y, v.z);
        dummy.rotation.set(0, v.yaw, 0);
        dummy.scale.setScalar(v.diameter);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.computeBoundingSphere();
      mesh.boundingSphere.radius += 0.05;
      root.add(mesh);
      const [cx, cz] = key.split(",").map(Number);
      chunks.set(`${kind}:${key}`, { mesh, x: cx * 96 + 48, z: cz * 96 + 48 });
    }
  }
  root.userData.prepareMaterials = (options) =>
    Promise.all(Object.values(assets).map((a) => a.prepare(options)));
  void root.userData.prepareMaterials();
  return {
    root,
    layout,
    time,
    update(t, position, reducedMotion = false) {
      time.value = reducedMotion ? 0 : t;
      const range = position.y > -8 ? 310 : 140;
      for (const chunk of chunks.values())
        chunk.mesh.visible =
          position.y > -70 &&
          Math.hypot(position.x - chunk.x, position.z - chunk.z) < range;
    },
  };
}
