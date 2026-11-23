import * as THREE from "three";
import { acquireHawaiiReefAsset } from "./hawaii_reef_asset.js";
import { acquireBermudaGeologyAsset } from "./bermuda_geology_asset.js";
import { sceneryFootSamples, seatUprightScenery } from "./scenery_grounding.js";
import { WRECK_BED } from "./bermuda_sites.js";
import { isPositionBlocked } from "./collision.js";

// 群落沿阶地与深沟交替，不把整个海床铺成相同密度的装饰地毯。
export const BERMUDA_REEF_FIELDS = Object.freeze(
  [
    ["western_branch_shelf", -395, -360, 65, 85, "reef_branch"],
    ["western_fan_gorge", -410, -650, 60, 90, "reef_fan"],
    ["western_sponge_slope", -390, -950, 60, 90, "reef_sponge"],
    ["eastern_branch_bluffs", 400, -400, 58, 80, "reef_branch"],
    ["eastern_flight_reef", 390, -690, 60, 90, "reef_fan"],
    ["eastern_sponge_terraces", 400, -1030, 60, 80, "reef_sponge"],
    ["western_deep_garden", -395, -1250, 65, 85, "reef_fan"],
    ["southern_cargo_garden", -330, -1420, 100, 95, "reef_sponge"],
    ["central_coral_ridge", 65, -1345, 90, 70, "reef_fan"],
    ["southern_return_grove", -110, -1625, 100, 50, "reef_fan"],
    ["eastern_cable_reef", 370, -1450, 58, 80, "reef_sponge"],
    ["abyssal_fan_bridge", 80, -1690, 80, 35, "reef_fan"],
  ].map(([id, x, z, rx, rz, kind]) =>
    Object.freeze({ id, x, z, rx, rz, kind }),
  ),
);

const UP = new THREE.Vector3(0, 1, 0),
  ARENAS = [
    [-310, -580],
    [300, -900],
    [-290, -1260],
    [230, -1570],
  ],
  GATES = [
    [-390, -420],
    [-390, -580],
    [390, -1110],
    [-120, -1600],
  ];

function solidReservation(x, z, radius) {
  if (Math.abs(x) + radius > 487 || z - radius < -1735 || z + radius > -210)
    return true;
  if (
    x > WRECK_BED.minX - radius - 12 &&
    x < WRECK_BED.maxX + radius + 12 &&
    z > WRECK_BED.minZ - radius - 12 &&
    z < WRECK_BED.maxZ + radius + 12
  )
    return true;
  if (ARENAS.some(([xx, zz]) => Math.hypot(x - xx, z - zz) < 130 + radius))
    return true;
  // 岩洞中线前后各留六十米，不能用新岩柱封住已经声明的成年通道。
  if (
    GATES.some(
      ([xx, zz]) =>
        Math.abs(x - xx) < 28 + radius && Math.abs(z - zz) < 75 + radius,
    )
  )
    return true;
  return false;
}

/** 分片礁台用共享HF近远原型；全底面贴最终地形，实体与装饰分开拥有。 */
export function createBermudaReefFields(parent, { heightAt }) {
  const root = new THREE.Group();
  root.name = "bermuda_reef_fields";
  parent.add(root);
  const assets = [],
    batches = [],
    placements = [],
    colliders = [],
    fields = [];
  const byKind = new Map(),
    dummy = new THREE.Object3D(),
    point = new THREE.Vector3();
  function add(row) {
    if (!byKind.has(row.kind)) byKind.set(row.kind, []);
    byKind.get(row.kind).push(row);
  }
  for (const [index, field] of BERMUDA_REEF_FIELDS.entries()) {
    fields.push({ ...field, y: heightAt(field.x, field.z), colonies: 24 });
    // 三个不规则聚簇，各自有稠密核心和稀疏边缘；中心水道与阴影边界保留空隙。
    for (let i = 0; i < 24; i++) {
      const cluster = i % 3,
        angle = i * 2.399963 + index * 0.71,
        radial = 0.12 + 0.28 * Math.sqrt((i + 0.5) / 24),
        x =
          field.x +
          field.rx *
            (Math.cos(cluster * 2.3 + index) * 0.42 + Math.cos(angle) * radial),
        z =
          field.z +
          field.rz *
            (Math.sin(cluster * 2.3 + index) * 0.42 + Math.sin(angle) * radial),
        kind =
          i % 6 === 0
            ? field.kind === "reef_sponge"
              ? "reef_fan"
              : "reef_sponge"
            : field.kind,
        height =
          kind === "reef_fan"
            ? 6 + ((i * 7 + index) % 6)
            : kind === "reef_sponge"
              ? 4 + ((i * 3 + index) % 5)
              : 3 + ((i + index) % 4);
      add({
        id: `${field.id}_colony_${i}`,
        fieldId: field.id,
        kind,
        // 该海绵原来因旧岩柱避让而落在此处；柱体迁位后仍保留已验收的根点。
        x:
          field.id === "southern_return_grove" && i === 12
            ? -121.29556199542303
            : x,
        z:
          field.id === "southern_return_grove" && i === 12
            ? -1629.1355253356603
            : z,
        height,
        yaw: angle,
      });
    }
    for (let i = 0; i < 8; i++) {
      const angle = i * 2.399963 + index * 0.6,
        x = field.x + Math.cos(angle) * field.rx * (i < 4 ? 0.83 : 0.6),
        z = field.z + Math.sin(angle) * field.rz * (i < 4 ? 0.83 : 0.6),
        kind = i < 4 ? "rock" : "spire",
        width =
          kind === "rock"
            ? 13 + ((i + index) % 4) * 3
            : 12 + ((i + index) % 3) * 3,
        height =
          kind === "rock"
            ? 7 + ((i + index) % 4) * 2
            : 26 + ((i * 7 + index * 3) % 35);
      if (solidReservation(x, z, width / 2 + 4)) continue;
      // 仅让开新沉睡巨兽的嘴口与岩床；原南部花园的其余根点保持不变。
      const titanRelocation =
        field.id === "southern_return_grove"
          ? i === 7
            ? [-115, -1435]
            : i === 2
              ? [-155, -1450]
              : null
          : null;
      add({
        id: `${field.id}_${kind}_${i}`,
        fieldId: field.id,
        kind,
        x: titanRelocation?.[0] ?? x,
        z: titanRelocation?.[1] ?? z,
        height,
        width,
        yaw: angle,
      });
    }
  }
  const ordered = [...byKind].sort(
    ([a], [b]) =>
      Number(b === "rock" || b === "spire") -
      Number(a === "rock" || a === "spire"),
  );
  for (const [kind, rows] of ordered) {
    const geological = kind === "rock" || kind === "spire",
      asset = geological
        ? acquireBermudaGeologyAsset(kind)
        : acquireHawaiiReefAsset(kind),
      near = new THREE.InstancedMesh(
        asset.geometry,
        asset.material,
        rows.length,
      ),
      far = new THREE.InstancedMesh(
        asset.farGeometry,
        asset.farMaterial,
        rows.length,
      ),
      extent = asset.geometry.boundingBox.getSize(new THREE.Vector3()),
      center = asset.geometry.boundingBox.getCenter(new THREE.Vector3()),
      foot = sceneryFootSamples(
        [asset.geometry, asset.farGeometry],
        geological ? 0.035 : 0.12,
      ),
      base = new THREE.Matrix4().makeTranslation(
        -center.x,
        -asset.geometry.boundingBox.min.y,
        -center.z,
      ),
      bands = [];
    assets.push(asset);
    if (geological)
      for (let j = 0; j < 4; j++) {
        const bounds = new THREE.Box3(),
          lo = asset.geometry.boundingBox.min.y + (extent.y * j) / 4,
          hi = asset.geometry.boundingBox.min.y + (extent.y * (j + 1)) / 4;
        for (let v = 0; v < asset.geometry.attributes.position.count; v++) {
          point.fromBufferAttribute(asset.geometry.attributes.position, v);
          if (point.y >= lo - 0.0001 && point.y <= hi + 0.0001)
            bounds.expandByPoint(point);
        }
        bounds.min.y = lo;
        bounds.max.y = hi;
        bands.push(bounds);
      }
    for (const [i, row] of rows.entries()) {
      if (geological) {
        dummy.position.set(row.x, 0, row.z);
        dummy.scale.set(
          row.width / extent.x,
          row.height / extent.y,
          (row.width * 0.76) / extent.z,
        );
        dummy.quaternion.setFromAxisAngle(UP, row.yaw);
        dummy.updateMatrix();
        let matrix = dummy.matrix.clone().multiply(base),
          maximum = -Infinity;
        for (const samples of foot)
          for (const id of samples.ids) {
            point
              .fromBufferAttribute(samples.position, id)
              .applyMatrix4(matrix);
            maximum = Math.max(maximum, point.y - heightAt(point.x, point.z));
          }
        dummy.position.y = -maximum - 0.35;
        dummy.updateMatrix();
        matrix = dummy.matrix.clone().multiply(base);
        row.matrix = matrix;
        for (const [band, bounds] of bands.entries()) {
          point
            .copy(bounds.getCenter(new THREE.Vector3()))
            .applyMatrix4(matrix);
          colliders.push({
            id: `outer_${row.id}_${band}`,
            type: "box",
            x: point.x,
            y: point.y,
            z: point.z,
            halfSize: bounds
              .getSize(new THREE.Vector3())
              .multiply(dummy.scale)
              .multiplyScalar(0.5)
              .addScalar(0.08),
            rotation: dummy.quaternion.clone(),
          });
        }
      } else {
        const field = fields.find((f) => f.id === row.fieldId);
        for (let attempt = 0; attempt < 30; attempt++) {
          seatUprightScenery(dummy, {
            x: row.x,
            z: row.z,
            yaw: row.yaw,
            scale: row.height / extent.y,
            heightAt,
            samples: foot,
            embed: 0.15,
          });
          point.set(row.x, heightAt(row.x, row.z) + 0.4, row.z);
          if (!isPositionBlocked(point, { colliders, radius: 0.6 })) break;
          // 基部不能从已有石柱内部冒出；在本群落内寻找实际裸露的生长位置。
          const a = row.yaw + attempt * 2.399963,
            r = 0.14 + ((attempt * 0.618) % 0.36);
          row.x = field.x + Math.cos(a) * field.rx * r;
          row.z = field.z + Math.sin(a) * field.rz * r;
        }
        row.matrix = dummy.matrix.clone();
      }
      point.setFromMatrixPosition(row.matrix);
      row.y = point.y;
      row.close = false;
      near.setMatrixAt(i, row.matrix);
      far.setMatrixAt(i, row.matrix);
      placements.push(row);
    }
    near.name = `bermuda_field_${kind}_close`;
    far.name = `bermuda_field_${kind}_distant`;
    near.computeBoundingSphere();
    far.computeBoundingSphere();
    near.count = 0;
    near.visible = false;
    root.add(near, far);
    batches.push({ kind, geological, near, far, rows, asset });
  }
  const prepare = async (options) =>
    (await Promise.all(assets.map((a) => a.prepare(options)))).every(Boolean);
  root.userData.prepareMaterials = prepare;
  root.userData.fields = fields;
  void prepare();
  let disposed = false,
    last = -Infinity;
  return {
    root,
    assets,
    fields,
    batches,
    placements,
    colliders,
    prepare,
    update(time, position, highQuality = true) {
      if (disposed || (time >= last && time - last < 0.4)) return;
      last = time;
      for (const batch of batches) {
        let n = 0,
          f = 0;
        for (const row of batch.rows) {
          const distance = point
              .setFromMatrixPosition(row.matrix)
              .distanceTo(position),
            nearRange = batch.geological
              ? highQuality
                ? 100
                : 65
              : highQuality
                ? 38
                : 23,
            farRange = batch.geological ? 420 : highQuality ? 230 : 185;
          row.close = distance < nearRange + (row.close ? 10 : 0);
          if (distance > farRange + (row.visible ? 20 : 0)) {
            row.visible = false;
            continue;
          }
          row.visible = true;
          (row.close ? batch.near : batch.far).setMatrixAt(
            row.close ? n++ : f++,
            row.matrix,
          );
        }
        for (const [mesh, count] of [
          [batch.near, n],
          [batch.far, f],
        ]) {
          mesh.count = count;
          mesh.visible = count > 0;
          mesh.instanceMatrix.needsUpdate = true;
        }
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const batch of batches) {
        batch.near.dispose();
        batch.far.dispose();
      }
      root.clear();
      for (const asset of assets) asset.release();
      colliders.length = 0;
    },
  };
}
