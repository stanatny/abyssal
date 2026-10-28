import { ODYSSEY_SITES, odysseyRouteXZ } from "./odyssey_config.js";
import * as THREE from "three";
import {
  createOdysseyRuinsAssets,
  createOdysseyRuinMesh,
} from "./odyssey_ruins_asset.js";
import { createOdysseyGalley } from "./odyssey_galley.js";
import { createOdysseyMergeBucket } from "./odyssey_environment_geometry.js";

/** 开敞石门与破损古桨船；按实心构件建立碰撞，保留侧开口与上方自由通道。 */
export function* createOdysseyLandmarksSteps(
  parent,
  { keep, resources, kit, heightAt, colliders, shallowRows, shallowFallbacks },
) {
  const { materials: m, box, torus, pot } = kit;
  const assets = createOdysseyRuinsAssets(keep),
    detailMeshes = [];
  const profiles = Array.from({ length: 20 }, () => new THREE.Box3());
  const g = assets.column.geometry,
    p = g.attributes.position,
    idx = g.index;
  for (let i = 0; i < idx.count; i += 3) {
    const vertices = [0, 1, 2].map((a) =>
      new THREE.Vector3().fromBufferAttribute(p, idx.getX(i + a)),
    );
    const lo = Math.max(
      0,
      Math.floor((Math.min(...vertices.map((v) => v.y)) + 0.5) * 20),
    );
    const hi = Math.min(
      19,
      Math.floor((Math.max(...vertices.map((v) => v.y)) + 0.5) * 20),
    );
    for (let j = lo; j <= hi; j++)
      for (const q of vertices) profiles[j].expandByPoint(q);
  }
  const landmarks = [];
  let nextId = 0;
  function boxSolid(bucket, kind, position, scale, mat, rotation = [0, 0, 0]) {
    bucket.emit(box, mat, position, scale, rotation);
    colliders.push({
      type: "box",
      id: `odyssey_${kind}_${nextId++}`,
      kind,
      x: position[0],
      y: position[1],
      z: position[2],
      halfSize: new THREE.Vector3(...scale).multiplyScalar(0.5),
      rotation: new THREE.Quaternion().setFromEuler(
        new THREE.Euler(...rotation),
      ),
    });
  }
  // 两座柱门保持既有位置与跨度；门楣上方也能绕行。
  for (const [index, x, z, opening, height] of [
    [0, ...ODYSSEY_SITES.garden, 112, 48],
    [1, ...ODYSSEY_SITES.passage, 126, 54],
  ]) {
    const bucket = createOdysseyMergeBucket(keep, resources);
    const tops = [];
    for (const side of [-1, 1]) {
      const px = x + side * (opening * 0.5 + 4),
        samples = [-6, 6].flatMap((dx) =>
          [-6.5, 6.5].map((dz) => heightAt(px + dx, z + dz)),
        ),
        floor = Math.max(...samples),
        lowest = Math.min(...samples);
      boxSolid(
        bucket,
        "gateway_plinth",
        [px, (floor + 3 + lowest) * 0.5, z],
        [12, floor + 3 - lowest, 13],
        m.limestone,
      );
      const size = height + 4.5;
      const shaft = createOdysseyRuinMesh(
        assets.column,
        `odyssey_hf_column_${index}_${side}`,
        300,
      );
      shaft.scale.setScalar(size);
      shaft.position.set(px, floor + 3 + size * 0.5, z);
      parent.add(shaft);
      detailMeshes.push(shaft);
      profiles.forEach((profile, j) => {
        if (profile.isEmpty()) return;
        const center = profile.getCenter(new THREE.Vector3());
        colliders.push({
          type: "box",
          id: `odyssey_gateway_column_${index}_${side}_${j}`,
          kind: "gateway_column",
          x: px + center.x * size,
          y: floor + 3 + ((j + 0.5) * size) / 20,
          z: z + center.z * size,
          halfSize: new THREE.Vector3(
            (profile.max.x - profile.min.x) * size * 0.5,
            size / 40,
            (profile.max.z - profile.min.z) * size * 0.5,
          ),
        });
      });
      tops.push(floor + height + 7.5);
    }
    // 连续水平门楣采用两侧较高顶部，低侧补独立承托，避免斜坡悬浮。
    const top = Math.max(...tops);
    for (const [j, side] of [
      [0, -1],
      [1, 1],
    ])
      if (top > tops[j] + 0.2)
        boxSolid(
          bucket,
          "gateway_upper_support",
          [x + side * (opening * 0.5 + 4), (top + tops[j]) * 0.5, z],
          [10, top - tops[j], 10],
          m.marble,
        );
    // 石门梁由错缝石块承托，凸出的三陇板与檐口在正常距离仍有真实侧影。
    const span = opening + 20,
      blocks = 14,
      bw = span / blocks;
    for (let row = 0; row < 2; row++)
      for (let j = 0; j < blocks; j++) {
        boxSolid(
          bucket,
          "gateway_lintel",
          [x - span * 0.5 + (j + 0.5) * bw, top + 1 + row * 2, z],
          [bw - 0.065, 1.97, 11],
          j % 4 === 0 ? m.limestone : m.marble,
        );
      }
    for (const front of [-1, 1])
      for (let j = 0; j <= blocks; j++) {
        const px = x - span * 0.5 + j * bw;
        for (let flute = -1; flute <= 1; flute++)
          bucket.emit(
            box,
            m.limestone,
            [px + flute * 0.32, top + 2.2, z + front * 5.68],
            [0.24, 2.85, 0.45],
          );
        bucket.emit(
          box,
          m.marble,
          [px, top + 0.6, z + front * 5.85],
          [1.4, 0.32, 0.7],
        );
      }
    for (let j = 0; j < blocks; j++)
      boxSolid(
        bucket,
        "gateway_cornice",
        [x - span * 0.5 + (j + 0.5) * bw, top + 4.35, z],
        [bw - 0.07, 0.7, 12.7],
        m.limestone,
      );
    // 残存山花是开放的三角框，不用整块不可见盒子封住额外空间。
    for (const side of [-1, 1]) {
      const span = (opening + 24) * 0.5,
        rise = 14;
      const angle = -side * Math.atan2(rise, span);
      boxSolid(
        bucket,
        "gateway_pediment",
        [x + side * span * 0.5, top + 4 + rise * 0.5, z],
        [Math.hypot(span, rise), 2.2, 9],
        m.marble,
        [0, 0, angle],
      );
    }
    for (let n = 0; n < 17; n++) {
      const px = x + (n - 8) * 5.5,
        yy = top + 2.25,
        zz = z + 5.7;
      // 双层回纹带采用低对比的铜石嵌饰，不成为远方闪烁的发光点。
      bucket.emit(box, m.bronze, [px, yy + 0.65, zz], [3.9, 0.12, 0.15]);
      bucket.emit(box, m.bronze, [px + 1.9, yy, zz], [0.12, 1.35, 0.15]);
      bucket.emit(box, m.bronze, [px + 0.65, yy - 0.64, zz], [2.5, 0.12, 0.15]);
    }
    bucket.finish(parent, `odyssey_bronze_gateway_${index}`);
    landmarks.push({
      id: `odyssey_gateway_${index}`,
      name: index ? "双兽峡门" : "涅瑞伊德花园",
      position: new THREE.Vector3(x, heightAt(x, z) + 20, z),
    });
    yield "bronze-gateway";
  }
  // 散落陶罐以六个小型物流遗迹块分布，不覆盖主要转身区。
  for (let patch = 0; patch < 6; patch++) {
    const b = createOdysseyMergeBucket(keep, resources);
    const x =
        patch === 0 && shallowRows
          ? -55
          : (patch % 2 ? 1 : -1) * (95 + (patch % 3) * 24),
      z = -170 - patch * 100;
    for (let i = 0; i < 15; i++) {
      const [px, pz] = odysseyRouteXZ(
          x + Math.cos(i * 2.399) * (5 + (i % 4) * 3),
          z + Math.sin(i * 2.399) * (6 + (i % 5) * 2),
        ),
        y = heightAt(px, pz);
      const scale = 1.3 + (i % 4) * 0.5,
        fall = i % 4 === 0;
      if (patch < 3 && shallowRows)
        shallowRows.aegean_amphora.push({
          x: px,
          z: pz,
          size: scale * 2.3,
          yaw: i * 0.73,
          seed: i + patch * 15,
          fall: fall ? 1.15 : 0,
        });
      b.emit(
        pot,
        m.terracotta,
        [px, y + (fall ? scale * 0.6 : 0), pz],
        [scale, scale, scale],
        [fall ? 1.15 : 0, i * 0.73, fall ? 0.3 : 0],
      );
    }
    const cargo = b.finish(parent, `odyssey_amphora_cargo_${patch}`);
    if (patch < 3 && shallowFallbacks) shallowFallbacks.push(cargo);
    yield "amphora-field";
  }
  const { wreck, wreckEntrance } = createOdysseyGalley(
    parent,
    assets.galley,
    colliders,
    heightAt,
    ...ODYSSEY_SITES.wreck,
  );
  detailMeshes.push(wreck);
  landmarks.push({
    id: "odyssey_galley",
    name: "归航古桨船",
    position: wreck.userData.interior.clone(),
  });
  yield "galley-hf-shell";
  return {
    landmarks,
    wreck,
    wreckEntrance,
    assets,
    update(_t, position, highQuality) {
      for (const mesh of detailMeshes)
        mesh.userData.updateDetail(position, highQuality);
    },
  };
}
