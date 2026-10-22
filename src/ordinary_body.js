import * as THREE from "three";
import { bodyRadius, resolveMotion } from "./collision.js";

const profiles = new WeakMap();
const point = new THREE.Vector3();
const box = new THREE.Box3();
const matrix = new THREE.Matrix4();
const scale = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const displacement = new THREE.Vector3();
const query = new THREE.Line3();
const nearest = new THREE.Vector3();

/** 合批前保留大型普通生物的躯干截面；不把鳍、翅或肢体间隙变成障碍。 */
export function prepareOrdinaryBody(root) {
  if (root.userData.lordBody || root.userData.ordinaryBody) return;
  const rig = root.userData.hfRig;
  const parts = [];
  root.updateMatrixWorld(true);
  if (rig?.mesh) parts.push(rig.mesh);
  else {
    root.traverse((part) => {
      if (!part.isMesh || !part.visible || part.userData.visualOnly) return;
      const materials = [].concat(part.material);
      if (materials.some((m) => m.transparent || m.opacity < 1)) return;
      part.geometry.computeBoundingBox();
      const size = part.geometry.boundingBox.getSize(new THREE.Vector3());
      part.getWorldScale(scale);
      size.multiply(scale);
      const dims = [size.x, size.y, size.z].sort((a, b) => a - b);
      if (dims[0] < dims[2] * 0.08 && !part.isSkinnedMesh) return;
      parts.push(part);
    });
    parts.sort((a, b) => volume(b) - volume(a));
    const largest = parts[0] ? volume(parts[0]) : 0;
    parts.splice(3);
    for (let i = parts.length - 1; i >= 0; i--)
      if (volume(parts[i]) < largest * 0.3) parts.splice(i, 1);
  }
  const excluded = new Set(
    (rig?.chains || [])
      .filter((c) => /fin|pectoral|pelvic|wing|leg|arm|tentacle/.test(c.type))
      .flatMap((c) => c.ids),
  );
  const sections = [];
  for (const part of parts) {
    const geometry = part.geometry;
    let profile = profiles.get(geometry);
    if (!profile) {
      profile = fitSections(geometry, excluded, !!rig?.mesh);
      profiles.set(geometry, profile);
    }
    part.updateMatrix();
    for (const original of profile) {
      const section = reserveMouth(part, original);
      if (!section) continue;
      sections.push({
        parent: part.parent,
        local: part.matrix.clone(),
        skin: part.isSkinnedMesh ? part : null,
        ...section,
        center: section.center.clone(),
        radii: section.radii.clone(),
      });
    }
  }
  root.userData.ordinaryBody = {
    sections,
    skins: [...new Set(sections.map((s) => s.skin).filter(Boolean))],
    colliders: sections.map(() => ({
      type: "ellipsoid",
      axes: { x: 1, y: 1, z: 1 },
      rotation: new THREE.Quaternion(),
      tag: "creature_body",
    })),
  };
}

// 咬击中心沿用长度的0.36倍；躯干不能抢先封住原有嘴部接触区域。
function reserveMouth(part, original) {
  const section = {
    ...original,
    center: original.center.clone(),
    radii: original.radii.clone(),
  };
  const m = part.matrixWorld.elements;
  const axis = ["x", "y", "z"].sort(
    (a, b) =>
      Math.abs(m[{ x: 2, y: 6, z: 10 }[b]]) -
      Math.abs(m[{ x: 2, y: 6, z: 10 }[a]]),
  )[0];
  const coefficient = m[{ x: 2, y: 6, z: 10 }[axis]];
  if (Math.abs(coefficient) < 1e-6) return section;
  const centerZ = point.copy(section.center).applyMatrix4(part.matrixWorld).z;
  const extent = Math.hypot(
    m[2] * section.radii.x,
    m[6] * section.radii.y,
    m[10] * section.radii.z,
  );
  const back = centerZ + extent;
  const front = Math.max(-0.32, centerZ - extent);
  if (back <= front + 0.01) return null;
  if (front <= centerZ - extent + 1e-6) return section;
  section.center[axis] += ((front + back) / 2 - centerZ) / coefficient;
  const half = (back - front) / 2;
  const otherSquared = Math.max(
    0,
    extent * extent - (coefficient * section.radii[axis]) ** 2,
  );
  if (half * half <= otherSquared) return null;
  section.radii[axis] =
    Math.sqrt(half * half - otherSquared) / Math.abs(coefficient);
  return section;
}

function volume(part) {
  part.geometry.boundingBox.getSize(point);
  part.getWorldScale(scale);
  return Math.abs(point.x * point.y * point.z * scale.x * scale.y * scale.z);
}

function fitSections(geometry, excluded, generated) {
  const p = geometry.attributes.position;
  const ids = geometry.attributes.skinIndex;
  const weights = geometry.attributes.skinWeight;
  const candidates = [];
  box.makeEmpty();
  for (let i = 0; i < p.count; i++) {
    let limbWeight = 0;
    if (ids && weights)
      for (let j = 0; j < 4; j++)
        if (excluded.has(ids.getComponent(i, j)))
          limbWeight += weights.getComponent(i, j);
    if (limbWeight > 0.35 || (generated && p.getZ(i) < -0.34)) continue;
    point.fromBufferAttribute(p, i);
    box.expandByPoint(point);
    candidates.push(i);
  }
  if (!candidates.length) return [];
  const dimensions = box.getSize(new THREE.Vector3());
  const axis = ["x", "y", "z"].sort((a, b) => dimensions[b] - dimensions[a])[0];
  const count = Math.min(
    10,
    Math.max(
      1,
      Math.ceil(
        dimensions[axis] /
          Math.max(0.06, Math.min(...dimensions.toArray()) * 0.65),
      ),
    ),
  );
  const span = dimensions[axis] / count;
  const low = box.min[axis];
  const result = [];
  for (let s = 0; s < count; s++) {
    const indices = candidates.filter((i) => {
      point.fromBufferAttribute(p, i);
      return Math.abs(point[axis] - (low + (s + 0.5) * span)) <= span * 0.62;
    });
    if (indices.length < 6) continue;
    // 用稳定的分位截面排除背鳍尖与少量离群面；每段最多64个实际表面样本。
    const values = [0, 1, 2].map((a) =>
      indices.map((i) => p.getComponent(i, a)).sort((a, b) => a - b),
    );
    const min = new THREE.Vector3(
      ...values.map((v) => v[Math.floor(v.length * 0.06)]),
    );
    const max = new THREE.Vector3(
      ...values.map((v) => v[Math.floor((v.length - 1) * 0.94)]),
    );
    const center = min.clone().add(max).multiplyScalar(0.5);
    const radii = max.clone().sub(min).multiplyScalar(0.55);
    if (count > 1)
      radii[axis] = span * (s === 0 || s === count - 1 ? 0.58 : 1.05);
    if (Math.min(...radii.toArray()) < 0.006) continue;
    const samples = [];
    for (let j = 0; j < Math.min(64, indices.length); j++)
      samples.push(
        indices[
          Math.floor((j * indices.length) / Math.min(64, indices.length))
        ],
      );
    result.push({ center, radii, samples, axis, span });
  }
  return result;
}

/** 只更新接近玩家的实例，复用固定截面与碰撞对象，不扫描整张蒙皮网格。 */
export function updateOrdinaryBody(root) {
  const body = root.userData.ordinaryBody;
  if (!body) return [];
  root.updateWorldMatrix(true, false);
  root.updateMatrixWorld(true);
  for (const skin of body.skins) skin.skeleton.update();
  body.sections.forEach((s, i) => {
    // 截面中心跟随骨骼，截面尺寸保持绑定时的稳定值，避免尾波导致碰撞壳呼吸抖动。
    const center = s.center;
    if (s.skin) {
      const offset = displacement.set(0, 0, 0);
      for (const index of s.samples) {
        s.skin.getVertexPosition(index, point);
        offset.add(point);
        point.fromBufferAttribute(s.skin.geometry.attributes.position, index);
        offset.sub(point);
      }
      center
        .copy((s.centerRest ??= s.center.clone()))
        .addScaledVector(offset, 1 / s.samples.length);
    }
    matrix.multiplyMatrices(s.parent.matrixWorld, s.local);
    matrix.decompose(point, rotation, scale);
    point.copy(center).applyMatrix4(matrix);
    const c = body.colliders[i];
    c.x = point.x;
    c.y = point.y;
    c.z = point.z;
    c.axes.x = s.radii.x * Math.abs(scale.x);
    c.axes.y = s.radii.y * Math.abs(scale.y);
    c.axes.z = s.radii.z * Math.abs(scale.z);
    c.rotation.copy(rotation);
  });
  return body.colliders;
}

/** 小型猎物和可吞食个体不阻挡嘴部；无敌/攻击冷却不影响实体接触。 */
export function ordinaryBodyEnabled(entity, playerLength) {
  return (
    entity.hiddenFor <= 0 &&
    entity.species.length >= 8 &&
    entity.species.length >= playerLength &&
    !!entity.mesh.userData.ordinaryBody
  );
}

export function nearbyOrdinaryBodies(
  entities,
  position,
  length,
  previous = position,
) {
  const result = [];
  query.set(previous, position);
  for (const e of entities) {
    if (!ordinaryBodyEnabled(e, length)) continue;
    if (query.start.distanceToSquared(query.end) < 1e-12)
      nearest.copy(position);
    else query.closestPointToPoint(e.mesh.position, true, nearest);
    if (
      nearest.distanceToSquared(e.mesh.position) >
      (e.species.length * 0.85 + length + 2) ** 2
    )
      continue;
    result.push(...updateOrdinaryBody(e.mesh));
  }
  return result;
}

/** 相对扫掠处理猎手迎面/追尾运动，修正猎手而不把角色持续推着走。 */
export function stopOrdinaryAtPlayer(
  entity,
  previous,
  playerPosition,
  playerForward,
  playerLength,
) {
  if (!ordinaryBodyEnabled(entity, playerLength)) return false;
  query.set(previous, entity.mesh.position);
  if (query.start.distanceToSquared(query.end) < 1e-12) nearest.copy(previous);
  else query.closestPointToPoint(playerPosition, true, nearest);
  if (
    nearest.distanceToSquared(playerPosition) >
    (entity.species.length * 0.85 + playerLength + 2) ** 2
  )
    return false;
  const delta = entity.mesh.position.clone().sub(previous);
  const relativeStart = playerPosition.clone().add(delta);
  const solved = resolveMotion(relativeStart, playerPosition, {
    colliders: updateOrdinaryBody(entity.mesh),
    radius: bodyRadius(playerLength),
    forward: playerForward,
    length: playerLength,
  });
  if (!solved.blocked) return false;
  entity.mesh.position.sub(point.copy(solved.position).sub(playerPosition));
  return true;
}
