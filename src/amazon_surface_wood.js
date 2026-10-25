import * as THREE from "three";
import { acquireAmazonDriftwood } from "./amazon_driftwood_asset.js";
import {
  amazonChannels,
  amazonSurfaceHeight,
  AMAZON_WORLD as W,
} from "./amazon_config.js";

/** 水面浮木复用已验收的沉木实体；沿岸有界漂浮，不进入固定地形索引。 */
export function createAmazonSurfaceWood(parent, resources) {
  const asset = acquireAmazonDriftwood();
  resources.add({ dispose: asset.release });
  const root = new THREE.Group();
  root.name = "amazon_surface_driftwood";
  root.userData.prepareMaterials = asset.prepare;
  parent.add(root);
  void asset.prepare();
  const items = [],
    colliders = [],
    dummy = new THREE.Object3D(),
    point = new THREE.Vector3();
  const positions = asset.geometry.attributes.position;
  let radius = 0;
  for (let i = 0; i < positions.count; i++)
    radius = Math.max(
      radius,
      Math.hypot(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i) - THREE.MathUtils.clamp(positions.getZ(i), -5.7, 5.7),
      ),
    );
  // 只占河岸外侧，入口、横向渡口以及两条主航道始终保持畅通。
  for (let i = 0; i < 16; i++) {
    const z = -205 - i * 65;
    if ([-330, -650, -940].some((gate) => Math.abs(z - gate) < 32)) continue;
    const side = i % 2,
      channel = amazonChannels(z)[side],
      sign = side ? 1 : -1,
      scale = 0.7 + (i % 3) * 0.1,
      yaw = sign * (0.24 + (i % 3) * 0.19);
    let x;
    for (const fraction of [0.78, 0.72, 0.66, 0.6]) {
      const candidate = channel.center + sign * channel.halfWidth * fraction;
      let clear = true;
      for (const dx of [-3, 0, 3])
        for (const dz of [-9, 0, 9])
          if (amazonSurfaceHeight(candidate + dx, z + dz) > W.surfaceY - 3)
            clear = false;
      if (clear) {
        x = candidate;
        break;
      }
    }
    if (x === undefined) continue;
    const collider = {
      type: "capsule",
      kind: "surface_driftwood",
      a: new THREE.Vector3(),
      b: new THREE.Vector3(),
      radius: (radius + 0.025) * scale,
    };
    items.push({ x, z, scale, yaw, phase: i * 2.399, collider });
    colliders.push(collider);
  }
  const mesh = new THREE.InstancedMesh(
    asset.geometry,
    asset.material,
    items.length,
  );
  mesh.name = "floating_logs_hf";
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(mesh);
  // 漂移不超过一米；固定扩大包围体，避免每帧重新扫描全部实例。
  const box = new THREE.Box3();
  for (const item of items) {
    box.expandByPoint(point.set(item.x - 10, W.surfaceY - 3, item.z - 11));
    box.expandByPoint(point.set(item.x + 10, W.surfaceY + 3, item.z + 11));
  }
  mesh.boundingBox = box;
  mesh.boundingSphere = box.getBoundingSphere(new THREE.Sphere());
  let lastTime = NaN;
  function update(t, position, reducedMotion = false) {
    root.visible = position.y > -55;
    const time = reducedMotion ? 0 : t;
    if (time === lastTime) return;
    lastTime = time;
    // 即使隐藏也同步动态接触，不能留下旧位置的碰撞体。
    items.forEach((item, i) => {
      const phase = item.phase;
      dummy.position.set(
        item.x + Math.sin(time * 0.055 + phase) * 0.45,
        W.surfaceY - 0.18 + Math.sin(time * 0.72 + phase) * 0.13,
        item.z + Math.sin(time * 0.042 + phase) * 0.8,
      );
      dummy.rotation.set(
        Math.sin(time * 0.6 + phase) * 0.025,
        item.yaw + Math.sin(time * 0.047 + phase) * 0.045,
        Math.sin(time * 0.53 + phase) * 0.035,
        "YXZ",
      );
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      item.collider.a.set(0, 0, -5.7).applyMatrix4(dummy.matrix);
      item.collider.b.set(0, 0, 5.7).applyMatrix4(dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
  update(0, { y: 0 });
  return { root, colliders, update };
}
