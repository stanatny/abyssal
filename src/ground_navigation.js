import * as THREE from "three";
import { groundCreatureClearance } from "./ground_creatures.js";

const PROFILES = new Map();

/**
 * 从完成模型的下包络提取有界地形探针；只缓存数字，不持有模型或 GPU 资源。
 * @param {THREE.Object3D} mesh 完成归一化的生物根模型。
 * @param {number} length 模型当前世界体长。
 * @returns {object} 脚底净空与归一化刚性身体探针，供栖息配置复用。
 */
export function groundCreatureProfile(mesh, length) {
  const key = mesh.userData.kind;
  let profile = key && PROFILES.get(key);
  if (!profile) {
    mesh.updateWorldMatrix(true, true);
    const inverse = mesh.matrixWorld.clone().invert();
    const point = new THREE.Vector3();
    const cells = new Map();
    mesh.traverse((part) => {
      // 腿与柔性尾部保留活动余量；穿山判定使用刚性腹部与头部。
      for (
        let ancestor = part;
        ancestor && ancestor !== mesh;
        ancestor = ancestor.parent
      )
        if (ancestor.userData.terrainFlexible) return;
      const vertices = part.geometry?.attributes.position;
      if (!vertices) return;
      const matrix = new THREE.Matrix4().multiplyMatrices(
        inverse,
        part.matrixWorld,
      );
      for (let i = 0; i < vertices.count; i++) {
        point
          .fromBufferAttribute(vertices, i)
          .applyMatrix4(matrix)
          .multiplyScalar(mesh.scale.x / length);
        const x = Math.floor(point.x / 0.1),
          z = Math.floor(point.z / 0.1);
        const id = `${x}/${z}`;
        let cell = cells.get(id);
        if (!cell)
          cells.set(
            id,
            (cell = {
              minX: point.x,
              maxX: point.x,
              minZ: point.z,
              maxZ: point.z,
              y: point.y,
            }),
          );
        cell.minX = Math.min(cell.minX, point.x);
        cell.maxX = Math.max(cell.maxX, point.x);
        cell.minZ = Math.min(cell.minZ, point.z);
        cell.maxZ = Math.max(cell.maxZ, point.z);
        cell.y = Math.min(cell.y, point.y);
      }
    });
    profile = [...cells.values()].flatMap((c) => [
      { x: c.minX, y: c.y, z: c.minZ },
      { x: c.minX, y: c.y, z: c.maxZ },
      { x: c.maxX, y: c.y, z: c.minZ },
      { x: c.maxX, y: c.y, z: c.maxZ },
    ]);
    if (key) PROFILES.set(key, profile);
  }
  return {
    groundClearance: groundCreatureClearance(mesh, length),
    groundFootprint: profile,
  };
}

/**
 * 检查头部/躯干占地，而非只检查中心；允许小幅贴地，拒绝陡坡上的大幅悬空。
 * @param {object} position 候选世界坐标，输入 Y 不参与贴地求解。
 * @param {object} direction 候选平面朝向；不会修改输入。
 * @param {object} habitat 体长、支撑净空、探针和陆地高度限制。
 * @param {Function} heightAt 可见地形的高度查询。
 * @returns {object} 支撑高度、额外抬升量与可行走标记。
 */
export function groundTerrainPose(position, direction, habitat, heightAt) {
  const length = habitat.length;
  const clearance = habitat.groundClearance ?? length * 0.28 + 2;
  const floor = heightAt(position.x, position.z);
  const n = Math.hypot(direction.x, direction.z) || 1;
  const fx = direction.x / n,
    fz = direction.z / n;
  let support = floor + clearance;
  const footprint = habitat.groundFootprint;
  if (footprint) {
    for (const p of footprint) {
      const x = position.x + (-fz * p.x - fx * p.z) * length;
      const z = position.z + (fx * p.x - fz * p.z) * length;
      support = Math.max(support, heightAt(x, z) - p.y * length + 0.08);
    }
  } else {
    // 未来没有模型元数据的地面生物仍检查头尾与两侧，不能回退到中心点判定。
    for (const [along, side] of [
      [0.4, 0],
      [-0.4, 0],
      [0, 0.18],
      [0, -0.18],
    ])
      support = Math.max(
        support,
        heightAt(
          position.x + (fx * along - fz * side) * length,
          position.z + (fz * along + fx * side) * length,
        ) +
          clearance -
          length * 0.08,
      );
  }
  const rise = support - floor - clearance;
  return {
    y: support,
    rise,
    walkable:
      Number.isFinite(support) &&
      floor >=
        (habitat.minimumGroundHeight ?? habitat.worldBounds?.surfaceY ?? 0) &&
      rise <= Math.max(0.5, length * 0.1),
  };
}

/**
 * 为实际模型选择可迈步的出生朝向，不能要求陡坡上的整圈朝向都可行走。
 * @param {object} position 候选出生位置。
 * @param {object} habitat 完整地面栖息配置。
 * @param {Function} heightAt 可见地形高度查询。
 * @param {Function} isBlocked 可选完整身体实体检查，接收位置和朝向。
 * @returns {object|null} 合法支撑姿态及朝向；没有可行山径时返回空值。
 */
export function groundSpawnPose(
  position,
  habitat,
  heightAt,
  isBlocked = () => false,
) {
  if (
    heightAt(position.x, position.z) <
    (habitat.minimumGroundHeight ?? habitat.worldBounds?.surfaceY ?? 0)
  )
    return null;
  let best = null;
  for (let i = 0; i < 16; i++) {
    const direction = {
      x: Math.sin((i * Math.PI) / 8),
      y: 0,
      z: -Math.cos((i * Math.PI) / 8),
    };
    const pose = groundTerrainPose(position, direction, habitat, heightAt);
    if (
      !pose.walkable ||
      isBlocked({ x: position.x, y: pose.y, z: position.z }, direction)
    )
      continue;
    // 出生点不仅能容纳身体，还要有可实际迈出的山径，不能生成在仅容一个朝向的死角。
    const distance = Math.max(2, Math.min(6, habitat.length * 0.25));
    let mobile = true;
    for (const scale of [0.5, 1]) {
      const next = {
        x: position.x + direction.x * distance * scale,
        z: position.z + direction.z * distance * scale,
      };
      const nextPose = groundTerrainPose(next, direction, habitat, heightAt);
      if (
        !nextPose.walkable ||
        !groundTerrainTransition(position, next, heightAt) ||
        isBlocked({ ...next, y: nextPose.y }, direction)
      ) {
        mobile = false;
        break;
      }
    }
    if (mobile && (!best || pose.rise < best.rise))
      best = { ...pose, direction };
  }
  return best;
}

/**
 * 跨帧高度差也必须可走，不能从山脚直接贴地投影到断崖顶部。
 * @param {object} previous 移动起点。
 * @param {object} next 候选终点。
 * @param {Function} heightAt 地形高度查询。
 * @returns {boolean} 两段连续地形高度差是否允许通过。
 */
export function groundTerrainTransition(previous, next, heightAt) {
  const distance = Math.hypot(next.x - previous.x, next.z - previous.z);
  if (distance < 1e-8) return true;
  const a = heightAt(previous.x, previous.z);
  const b = heightAt((previous.x + next.x) * 0.5, (previous.z + next.z) * 0.5);
  const c = heightAt(next.x, next.z);
  const allowed = distance * 0.5 * 0.9 + 0.12;
  return Math.abs(b - a) <= allowed && Math.abs(c - b) <= allowed;
}

/**
 * 前方不可行走时选连续绕行方向；短暂保持选择，避免左右抖动或不停顶山。
 * @param {object} position 当前世界位置。
 * @param {object} desired 原本期望的朝向。
 * @param {object} habitat 地面栖息配置。
 * @param {Function} heightAt 地形高度查询。
 * @param {object} state 个体导航缓存，将写入绕行朝向及期限。
 * @param {number} elapsed 活跃游戏累计秒数。
 * @param {Function} isBlocked 可选实体检查。
 * @returns {object} 有界的期望朝向；位置不会被修改。
 */
export function steerGroundTerrain(
  position,
  desired,
  habitat,
  heightAt,
  state,
  elapsed,
  isBlocked = () => false,
) {
  const look = Math.max(
    3,
    Math.min(14, habitat.length * 0.45 + habitat.speed * 0.4),
  );
  if (state.terrainAvoidUntil > elapsed && !state.terrainBlocked)
    return state.terrainAvoidHeading;
  const yaw = Math.atan2(desired.x, desired.z);
  const probe = (angle) => {
    const d = { x: Math.sin(angle), y: 0, z: Math.cos(angle) };
    const p = { x: position.x + d.x * look, z: position.z + d.z * look };
    const pose = groundTerrainPose(p, d, habitat, heightAt);
    pose.walkable &&=
      groundTerrainTransition(position, p, heightAt) &&
      !isBlocked({ ...p, y: pose.y }, d);
    return { direction: d, pose };
  };
  if (!state.terrainBlocked && probe(yaw).pose.walkable) return desired;
  state.terrainBlocked = false;
  let best = null;
  for (const angle of [0.65, -0.65, 1.3, -1.3, 2, -2, Math.PI]) {
    const result = probe(yaw + angle);
    if (!result.pose.walkable) continue;
    const score = Math.abs(angle) + result.pose.rise * 0.1;
    if (!best || score < best.score) best = { ...result, score };
  }
  if (!best) {
    // 狭窄山径上先退回上一方向，不用向上投影到山峰或屋顶。
    const dx =
      heightAt(position.x + 3, position.z) -
      heightAt(position.x - 3, position.z);
    const dz =
      heightAt(position.x, position.z + 3) -
      heightAt(position.x, position.z - 3);
    const norm = Math.hypot(dx, dz) || 1;
    best = { direction: { x: -dx / norm, y: 0, z: -dz / norm } };
  }
  state.terrainAvoidHeading = best.direction;
  state.terrainAvoidUntil = elapsed + 0.85;
  return best.direction;
}

/**
 * 保留最后合法朝向，阻挡跃击穿山并允许小幅侧退，不用瞬移解卡。
 * @param {object} previous 上一合法位置。
 * @param {THREE.Vector3} desired 将修正的候选位置。
 * @param {THREE.Vector3} direction 将修正的身体朝向。
 * @param {object} habitat 地面栖息配置。
 * @param {Function} heightAt 地形高度查询。
 * @param {object} state 个体导航状态，写入受阻标记。
 * @param {number} leapHeight 已有跃击状态机提供的高度。
 * @param {Function} isBlocked 可选实体检查。
 * @returns {boolean} 本次提案是否受阻；受阻后仍可能完成合法的小步退让。
 */
export function resolveGroundTerrain(
  previous,
  desired,
  direction,
  habitat,
  heightAt,
  state,
  leapHeight = 0,
  isBlocked = () => false,
) {
  let pose = groundTerrainPose(desired, direction, habitat, heightAt);
  if (
    pose.walkable &&
    groundTerrainTransition(previous, desired, heightAt) &&
    !isBlocked(previous, direction) &&
    groundTerrainPose(previous, direction, habitat, heightAt).walkable &&
    !isBlocked(
      { x: desired.x, y: pose.y + leapHeight, z: desired.z },
      direction,
    )
  ) {
    desired.y = pose.y + leapHeight;
    return false;
  }
  const travel = Math.hypot(desired.x - previous.x, desired.z - previous.z);
  desired.copy(previous);
  pose = groundTerrainPose(previous, direction, habitat, heightAt);
  if (state.safeDirection) {
    direction.set(state.safeDirection.x, 0, state.safeDirection.z);
    pose = groundTerrainPose(previous, direction, habitat, heightAt);
    // 转身空间不足时先侧退一步；身体仍保持原朝向，静态碰撞在随后统一处理。
    let best = null;
    const yaw = Math.atan2(direction.x, direction.z);
    for (let i = 0; i < 32; i++) {
      const angle = yaw + Math.PI + (i * Math.PI) / 16;
      const x = previous.x + Math.sin(angle) * travel * 0.7;
      const z = previous.z + Math.cos(angle) * travel * 0.7;
      const candidate = groundTerrainPose(
        { x, z },
        direction,
        habitat,
        heightAt,
      );
      if (
        !candidate.walkable ||
        !groundTerrainTransition(previous, { x, z }, heightAt) ||
        isBlocked({ x, y: candidate.y + leapHeight, z }, direction)
      )
        continue;
      // 同样净空时优先退离阻挡方向，避免选择前方死角反复顶墙。
      const score = candidate.rise + Math.cos(angle - yaw) * 0.2;
      if (!best || score < best.score) best = { x, z, pose: candidate, score };
      // 已找到明显退离阻挡的合法小步，不再遍历其余方向；所有实体与地形检查仍完整执行。
      if (score <= pose.rise - 0.08) break;
    }
    if (best) {
      desired.x = best.x;
      desired.z = best.z;
      pose = best.pose;
    }
  }
  desired.y = pose.y + leapHeight;
  state.terrainBlocked = true;
  return true;
}

/**
 * 静态墙体滑动后再次检查地形，最后合法姿态只在整条导航链完成后保存。
 * @param {object} previous 上一合法位置。
 * @param {THREE.Vector3} position 将提交或回退的位置。
 * @param {THREE.Vector3} direction 将提交或回退的朝向。
 * @param {object} habitat 地面栖息配置。
 * @param {Function} heightAt 地形高度查询。
 * @param {object} state 个体导航状态，保存最终合法朝向。
 * @param {number} leapHeight 保留已有跃击的高度。
 * @param {Function} isBlocked 可选实体检查。
 * @returns {void} 原地修正位置、朝向和导航状态。
 */
export function commitGroundTerrain(
  previous,
  position,
  direction,
  habitat,
  heightAt,
  state,
  leapHeight = 0,
  isBlocked = () => false,
) {
  let pose = groundTerrainPose(position, direction, habitat, heightAt);
  if (
    (!pose.walkable ||
      !groundTerrainTransition(previous, position, heightAt) ||
      isBlocked(
        { x: position.x, y: pose.y + leapHeight, z: position.z },
        direction,
      )) &&
    state.safeDirection
  ) {
    position.copy(previous);
    direction.set(state.safeDirection.x, 0, state.safeDirection.z);
    pose = groundTerrainPose(position, direction, habitat, heightAt);
    state.terrainBlocked = true;
  }
  position.y = pose.y + leapHeight;
  state.safeDirection ??= { x: 0, y: 0, z: -1 };
  state.safeDirection.x = direction.x;
  state.safeDirection.z = direction.z;
}
