import { tr } from "./i18n.js";
import { WORLD } from "./world_config.js";

const TAU = Math.PI * 2;
const MAP_PADDING = 9;
const MAP_SIZE = 100;

/**
 * 将世界水平坐标等比例投影到固定北向的100×100地图，越界位置贴在实际边界。
 * @param {{x:number,z:number}} position 世界位置；-Z为北，+X为东。
 * @returns {{x:number,y:number}} 地图坐标，不改变输入。
 */
export function projectMinimapPosition(position) {
  const width = WORLD.maxX - WORLD.minX;
  const depth = WORLD.maxZ - WORLD.minZ;
  const scale = (MAP_SIZE - MAP_PADDING * 2) / Math.max(width, depth);
  const centerX = (WORLD.minX + WORLD.maxX) / 2;
  const centerZ = (WORLD.minZ + WORLD.maxZ) / 2;
  return {
    x:
      50 +
      (clamp(finite(position?.x, centerX), WORLD.minX, WORLD.maxX) - centerX) *
        scale,
    y:
      50 +
      (clamp(finite(position?.z, centerZ), WORLD.minZ, WORLD.maxZ) - centerZ) *
        scale,
  };
}

/**
 * 计算地图航向及返航提示；角度从北向顺时针，距离遵循游戏的显示米制。
 * @param {object} context 当前坐标、前向、出生点和垂直游动时沿用的航向。
 * @returns {object} 玩家/出生点投影、角度、水平距离和上浮或下潜提示。
 */
export function getMinimapState({
  position,
  forward,
  spawn,
  fallbackHeading = 0,
}) {
  const player = readPoint(position);
  const home = readPoint(spawn);
  const headingLength = Math.hypot(finite(forward?.x), finite(forward?.z));
  const heading =
    headingLength > 1e-6
      ? normalizeAngle(Math.atan2(forward.x, -forward.z))
      : normalizeAngle(finite(fallbackHeading));
  const dx = home.x - player.x;
  const dz = home.z - player.z;
  const horizontalDistance = Math.hypot(dx, dz);
  const bearing =
    horizontalDistance > 1e-6 ? normalizeAngle(Math.atan2(dx, -dz)) : null;
  const verticalOffset = home.y - player.y;
  const elevation =
    verticalOffset > 3 ? "above" : verticalOffset < -3 ? "below" : "level";
  const ascent = Math.max(
    0,
    Math.round(verticalOffset * WORLD.displayDepthScale),
  );
  const descent = Math.max(
    0,
    Math.round(-verticalOffset * WORLD.displayDepthScale),
  );
  const distance = Math.round(horizontalDistance * WORLD.displayDepthScale);
  const nearby = horizontalDistance < 8;
  const arrow =
    bearing === null
      ? ""
      : ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"][
          Math.round(bearing / (Math.PI / 4)) % 8
        ];
  const homeLabel = nearby
    ? elevation === "above"
      ? "浅滩正上方"
      : elevation === "below"
        ? "浅滩正下方"
        : "浅滩附近"
    : tr`浅滩 ${arrow} ${formatDistance(distance)}`;
  const depth = Math.max(0, Math.round(-player.y * WORLD.displayDepthScale));
  const depthLabel =
    elevation === "above"
      ? tr`上浮 ${ascent}m`
      : elevation === "below"
        ? tr`下潜 ${descent}m`
        : tr`水深 ${depth}m`;
  return {
    player: projectMinimapPosition(player),
    home: projectMinimapPosition(home),
    heading,
    bearing,
    relativeBearing:
      bearing === null
        ? null
        : Math.atan2(Math.sin(bearing - heading), Math.cos(bearing - heading)),
    horizontalDistance: distance,
    elevation,
    ascent,
    descent,
    depth,
    nearby,
    homeLabel,
    depthLabel,
  };
}

function readPoint(point) {
  return Array.isArray(point)
    ? { x: finite(point[0]), y: finite(point[1]), z: finite(point[2]) }
    : { x: finite(point?.x), y: finite(point?.y), z: finite(point?.z) };
}

function formatDistance(distance) {
  return distance >= 1000
    ? tr`${(distance / 1000).toFixed(1)}km`
    : tr`${distance}m`;
}

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeAngle(angle) {
  return ((angle % TAU) + TAU) % TAU;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
