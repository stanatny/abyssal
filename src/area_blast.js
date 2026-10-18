import * as THREE from "three";
import { updateLordBody } from "./lord_body.js";
import { isRegionalRare, preyRespawnDelay } from "./regional_rare.js";
import { consumeDefeatedPrey, consumePrey } from "./simulation.js";
import {
  MECHANICAL_RULES,
  hitOrdinaryWithTorpedo,
  resetTorpedoTarget,
} from "./mechanical_shark_rules.js";

/** 鱼雷与尸爆共用单次、当地的范围命中；不搜寻、追踪或创建可视资源。 */
export function createAreaBlast({
  entities = () => [],
  bosses = () => [],
  blocked = () => false,
  hitBoss = () => ({ hit: false }),
  effects,
  creditOversized = true,
} = {}) {
  const bodyPoint = createBlastBodyQuery();
  return function blast(at, player, directBoss = null) {
    const result = {
      point: at.clone(),
      killed: 0,
      defeated: 0,
      hits: 0,
      bossHits: 0,
      rare: false,
      rarePoint: null,
    };
    if (player.dead || player.won || player.timedOut) return result;
    // 在爆炸发生时确定体型，不能让前一条鱼的成长改变同一批命中的资格。
    const size = { length: player.length },
      seen = new Set();
    for (const e of entities()) {
      if (seen.has(e) || e.hiddenFor > 0) continue;
      seen.add(e);
      const radius = Math.max(0.15, e.species.length * 0.13);
      if (
        e.mesh.position.distanceToSquared(at) >
          (MECHANICAL_RULES.blastRadius + radius) ** 2 ||
        blocked(at, e.mesh.position)
      )
        continue;
      const before = e.torpedoHits || 0;
      const defeated = hitOrdinaryWithTorpedo(e, size);
      // 无效目标（载具、领主等）不能被记录成一次普通命中。
      if ((e.torpedoHits || 0) === before) continue;
      if (!defeated) {
        result.hits++;
        effects?.blood?.(e.mesh.position, Math.min(5, e.species.length));
        continue;
      }
      const edible = e.species.length < size.length;
      const credited = creditOversized
        ? consumeDefeatedPrey(player, e.species)
        : edible && consumePrey(player, e.species);
      result.defeated++;
      if (credited) {
        result.killed++;
        if (isRegionalRare(e.species)) {
          result.rare = true;
          result.rarePoint = e.mesh.position.clone();
        }
      }
      // 击杀立即退休，不产生可被重复结算的尸体；大鱼尸爆击杀也不给吞食收益。
      e.hiddenFor = preyRespawnDelay(e.species);
      e.mesh.visible = false;
      e.chase = 0;
      e.groundState = null;
      e.flight = null;
      resetTorpedoTarget(e);
      effects?.blood?.(e.mesh.position, Math.min(5, e.species.length));
    }
    seen.clear();
    for (const b of bosses()) {
      if (
        seen.has(b) ||
        !b.enabled ||
        b.state.defeated ||
        b.mesh.position.distanceTo(at) >
          MECHANICAL_RULES.blastRadius + b.state.species.length * 0.7
      )
        continue;
      seen.add(b);
      const actual =
        b === directBoss ? at : bodyPoint(at, b, MECHANICAL_RULES.blastRadius);
      if (!actual || blocked(at, actual)) continue;
      if (hitBoss(player, b, actual).hit) {
        result.hits++;
        result.bossHits++;
      }
    }
    return result;
  };
}

/** 追击触发与范围伤害共用真实可见身体表面，避开空触腕和隐藏的子网格。 */
export function createBlastBodyQuery() {
  const ray = new THREE.Raycaster(),
    direction = new THREE.Vector3(),
    target = new THREE.Vector3(),
    intersections = [],
    candidates = [];
  function cast(origin, at, contact, range) {
    direction.copy(at).sub(origin);
    const distance = direction.length();
    if (distance < 0.001) direction.set(0, 0, -1);
    else direction.divideScalar(distance);
    ray.set(origin, direction);
    ray.far = range;
    intersections.length = 0;
    ray.intersectObject(contact, true, intersections);
    return intersections.find(
      (i) => i.object.isMesh && visibleMesh(i.object, contact),
    )?.point;
  }
  return (origin, boss, range = Infinity) => {
    const contact = boss.mesh.userData.contactRoot || boss.mesh;
    contact.updateWorldMatrix(true, true);
    const direct = cast(origin, boss.mesh.position, contact, range);
    if (direct) return direct;
    // 模型原点可能落在四足之间或弯曲躯干外；截面只提供方向，命中仍须落到真实网格。
    candidates.length = 0;
    for (const section of updateLordBody(boss.mesh)) {
      target.set(section.x, section.y, section.z);
      const distance = target.distanceTo(origin);
      if (distance <= range + Math.max(...Object.values(section.axes)))
        candidates.push(section);
    }
    candidates.sort(
      (a, b) =>
        (a.x - origin.x) ** 2 +
        (a.y - origin.y) ** 2 +
        (a.z - origin.z) ** 2 -
        ((b.x - origin.x) ** 2 + (b.y - origin.y) ** 2 + (b.z - origin.z) ** 2),
    );
    // 上限限制退路成本；不分配网格、不注册另一套动画/碰撞状态。
    for (let i = 0; i < Math.min(8, candidates.length); i++) {
      const section = candidates[i];
      target.set(section.x, section.y, section.z);
      const point = cast(origin, target, contact, range);
      if (point) return point;
    }
  };
}

function visibleMesh(object, root) {
  for (let node = object; node; node = node.parent) {
    if (!node.visible && node !== root) return false;
    if (node === root) return true;
  }
  return false;
}
