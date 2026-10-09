import { isRegionalRare } from "./regional_rare.js";

export const RARE_DISCOVERY_RULES = Object.freeze({
  discoveryNoticeDuration: 6,
  enterDistance: 240,
  leaveDistance: 300,
  levelTolerance: 45,
});

const finitePoint = (p) => p && [p.x, p.y, p.z].every(Number.isFinite);

/** 邻近线索独立于声呐与渲染裁剪；只显示本局实际选中的栖地范围。 */
export function createRareDiscovery() {
  let resident = null;
  let area = null;
  let nearbyArea = null;
  let discoveredArea = null;
  let discovered = false;
  let nearby = false;
  let noticeUntil = 0;
  function reset() {
    resident = area = nearbyArea = discoveredArea = null;
    discovered = false;
    nearby = false;
    noticeUntil = 0;
  }
  return {
    update({ active, position, entity, regionId, now = 0 }) {
      // 暂停不推进状态；终局、切图与新局由调用方显式清理。
      if (!active) return null;
      const species = entity?.species;
      const home = species?.spawnAnchors?.[0];
      if (
        !isRegionalRare(species) ||
        species.regionId !== regionId ||
        entity.hiddenFor > 0 ||
        !finitePoint(position) ||
        !finitePoint(entity.mesh?.position) ||
        home?.length !== 3 ||
        !home.every(Number.isFinite) ||
        !(species.residentRadius > 0)
      ) {
        reset();
        return null;
      }
      if (entity !== resident) {
        resident = entity;
        area = Object.freeze({
          x: home[0],
          y: home[1],
          z: home[2],
          radius: species.residentRadius,
          phase: "search",
        });
        nearbyArea = Object.freeze({ ...area, phase: "nearby" });
        discoveredArea = Object.freeze({ ...area, phase: "discovered" });
        discovered = false;
        nearby = false;
        noticeUntil = 0;
      }
      // 首次经过海图圆圈时才揭示；深度与个体游到多近都不能绕过发现条件。
      const horizontalDistance = Math.hypot(
        area.x - position.x,
        area.z - position.z,
      );
      if (!discovered) {
        if (horizontalDistance > area.radius) return null;
        discovered = true;
        noticeUntil = now + RARE_DISCOVERY_RULES.discoveryNoticeDuration;
      }
      const p = entity.mesh.position;
      const distance = Math.hypot(
        p.x - position.x,
        p.y - position.y,
        p.z - position.z,
      );
      nearby =
        distance <=
        (nearby
          ? RARE_DISCOVERY_RULES.leaveDistance
          : RARE_DISCOVERY_RULES.enterDistance);
      // 共用有效游玩时钟，暂停不消耗一次性提示，也不重新触发。
      if (now < noticeUntil) return discoveredArea;
      return nearby ? nearbyArea : area;
    },
    reset,
  };
}

/** 箭头指向已知栖地而非游动个体，俯仰游动时沿用海图的水平朝向。 */
export function getRareClueDirection(area, position, heading = 0) {
  const dx = area.x - position.x;
  const dz = area.z - position.z;
  const relative = Math.atan2(dx, -dz) - heading;
  const index = ((Math.round(relative / (Math.PI / 4)) % 8) + 8) % 8;
  const dy = area.y - position.y;
  return {
    arrow:
      Math.hypot(dx, dz) <= area.radius
        ? ""
        : ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][index],
    elevation:
      dy > RARE_DISCOVERY_RULES.levelTolerance
        ? "更高"
        : dy < -RARE_DISCOVERY_RULES.levelTolerance
          ? "更深"
          : "同一层",
  };
}
