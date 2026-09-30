import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { AGORA_EXCAVATION_SITE } from "../src/atlantis_exploration_agora_site.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import { createAtlantisTerrainMesh } from "../src/atlantis_terrain_mesh.js";
import { castSegment } from "../src/collision.js";

test("Agora lower furniture fits the final ground across complete footprints", (t) => {
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => city.dispose());
  const floor = AGORA_EXCAVATION_SITE.levels[1].floorY;
  const furniture = city.agora.furniture;
  const lowerBoxes = furniture.colliders.filter(
    (collider) => collider.type === "box" && collider.y < floor + 10,
  );
  assert.ok(lowerBoxes.length > 30, "Preserve furnished lower aisles");

  // 中心落在平底不足以证明支撑；转向后的四角、边缘和中心一起复核。
  for (const box of lowerBoxes) {
    const rotation = box.rotation
      ? new THREE.Quaternion(
          box.rotation.x,
          box.rotation.y,
          box.rotation.z,
          box.rotation.w,
        )
      : new THREE.Quaternion();
    for (const sx of [-1, 0, 1])
      for (const sz of [-1, 0, 1]) {
        const point = new THREE.Vector3(
          sx * box.halfSize.x,
          0,
          sz * box.halfSize.z,
        )
          .applyQuaternion(rotation)
          .add(new THREE.Vector3(box.x, box.y, box.z));
        assert.ok(
          Math.abs(atlantisSeabedHeight(point.x, point.z) - floor) < 0.0001,
          `Furniture footprint enters the terrain slope at ${point.x}, ${point.z}`,
        );
      }
  }

  // 同时检查可见顶点，避免仅缩小碰撞盒而保留被土坡遮埋的器物。
  furniture.root.updateMatrixWorld(true);
  furniture.root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const positions = mesh.geometry.attributes.position;
    const point = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
      if (point.y >= floor + 10) continue;
      assert.ok(
        atlantisSeabedHeight(point.x, point.z) <= point.y + 0.08,
        `Visible furniture is buried by ground at ${point.toArray()}`,
      );
    }
  });

  const terrain = createAtlantisTerrainMesh({
    minX: 137.5,
    maxX: 275,
    minZ: -520,
    maxZ: -380,
    segmentsX: 16,
    segmentsZ: 20,
    heightAt: atlantisSeabedHeight,
    offset: 0.22,
  });
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const ground = new THREE.Mesh(terrain, material);
  t.after(() => {
    terrain.dispose();
    material.dispose();
  });
  ground.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  // 原缺陷点分别是东廊箱盖、瓶群投影和南廊转向长凳边缘。
  for (const [x, z] of [
    [241.76, -451.67],
    [241.9, -466.7],
    [221.75, -483.1],
  ]) {
    ray.set(new THREE.Vector3(x, floor + 20, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(ground, false)[0];
    assert.ok(hit, `Rendered ground missing at ${x}, ${z}`);
    assert.ok(
      Math.abs(hit.point.y - (floor + 0.22)) < 0.02,
      `Rendered ground covers lower furniture at ${x}, ${z}`,
    );
  }
});

test("Every integrated Agora marine root touches ground or a real host", (t) => {
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => city.dispose());
  // 植物不能用自己的胶囊碰撞证明根部支撑。
  const hosts = city.colliders.filter(
    (collider) => collider.kind !== "marine_growth",
  );
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let roots = 0;
  city.root.updateMatrixWorld(true);
  city.agoraMarine.root.traverse((mesh) => {
    if (!mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) {
      roots++;
      mesh.getMatrixAt(i, matrix);
      matrix.premultiply(mesh.matrixWorld).decompose(position, rotation, scale);
      const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
      const onGround =
        normal.y > 0.85 &&
        Math.abs(position.y - atlantisSeabedHeight(position.x, position.z)) <
          0.15;
      const start = position.clone().addScaledVector(normal, 0.2);
      const end = position.clone().addScaledVector(normal, -0.5);
      assert.ok(
        onGround || castSegment(start, end, hosts),
        `${mesh.name} has no root support at ${position.toArray()}`,
      );
    }
  });
  assert.ok(roots >= 100, "Preserve the populated Agora marine slice");
});
