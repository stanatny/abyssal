import * as THREE from "three";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const HORIZONTAL_LIMIT = Math.PI / 6;
const VERTICAL_LIMIT = (25 * Math.PI) / 180;
const GROUP_LIMIT = 4;

/**
 * 仅投影相机前方水平±30°、垂直±25°且留有屏边余量的声呐目标。
 * @param {object} contact 包含世界坐标与捕食资格的目标。
 * @param {THREE.Camera} camera 当前游戏相机。
 * @param {object} viewport 画面宽高，单位为 CSS 像素。
 * @returns {object|null} 实际屏幕锚点；屏外、身后或扇区外目标返回 null。
 */
export function projectSonarContact(contact, camera, viewport) {
  const { width, height } = viewport;
  const point = contact.position;
  if (
    !camera ||
    !point ||
    ![point.x, point.y, point.z, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    return null;
  const view = new THREE.Vector3(point.x, point.y, point.z).applyMatrix4(
    camera.matrixWorldInverse,
  );
  if (view.z >= -Math.max(0.001, camera.near || 0.01)) return null;
  const horizontalAngle = Math.atan2(view.x, -view.z);
  const verticalAngle = Math.atan2(view.y, -view.z);
  if (
    Math.abs(horizontalAngle) > HORIZONTAL_LIMIT ||
    Math.abs(verticalAngle) > VERTICAL_LIMIT
  )
    return null;
  const projected = new THREE.Vector3(point.x, point.y, point.z).project(
    camera,
  );
  const x = (projected.x * 0.5 + 0.5) * width;
  const y = (0.5 - projected.y * 0.5) * height;
  const margin = isCompact(viewport) ? 18 : 24;
  if (
    ![x, y].every(Number.isFinite) ||
    x < margin ||
    x > width - margin ||
    y < margin ||
    y > height - margin
  )
    return null;
  return {
    ...contact,
    anchor: { x, y },
    onscreen: true,
    behind: false,
    horizontalAngle,
    verticalAngle,
  };
}

/**
 * 排布前方少量回声说明；同种同资格共用一条文字，不再绘制屏外箭头或指向线。
 * @param {object} context 全量探测、相机、画面尺寸和需避让的 HUD 矩形。
 * @returns {object} 最多四组文字及每组至多两个真实锚点，附探测/前方/已标记数量。
 */
export function buildSonarMarkerLayout({
  contacts = [],
  camera,
  viewport,
  occlusions = [],
}) {
  const empty = {
    contacts: [],
    labels: [],
    totalDetected: contacts.length,
    frontVisible: 0,
    markedCount: 0,
    shownGroups: 0,
  };
  if (!camera || !viewport) return empty;
  camera.updateMatrixWorld();
  const compact = isCompact(viewport);
  const blockers = occlusions.filter(
    (rect) =>
      [rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite) &&
      rect.right > rect.left &&
      rect.bottom > rect.top,
  );
  const projected = contacts
    .map((contact) => projectSonarContact(contact, camera, viewport))
    .filter(Boolean);
  const groups = new Map();
  for (const contact of projected) {
    const id = `${contact.kind}:${contact.boss ? "boss" : "fish"}:${contact.eligible}`;
    if (!groups.has(id)) groups.set(id, { id, contacts: [] });
    contact.labelId = id;
    groups.get(id).contacts.push(contact);
  }
  const candidates = [...groups.values()]
    .map((group) => {
      group.contacts.sort(
        (a, b) =>
          angularDistance(a) - angularDistance(b) ||
          (a.distance || 0) - (b.distance || 0),
      );
      const first = group.contacts[0];
      const lengths = group.contacts.map((contact) => contact.length);
      const min = Math.min(...lengths),
        max = Math.max(...lengths);
      const lengthText =
        min === max
          ? formatLength(min)
          : `${formatLength(min)}–${formatLength(max)}`;
      const qualifier = first.boss
        ? first.eligible
          ? "可战"
          : "避开"
        : first.eligible
          ? "可食"
          : "不可食";
      const text = `${first.label.split(" · ").at(-1)} ${lengthText}m ${qualifier}${group.contacts.length > 1 ? ` ×${group.contacts.length}` : ""}`;
      const textUnits = [...text].reduce(
        (total, character) =>
          total + (character.charCodeAt(0) > 255 ? 1 : 0.59),
        0,
      );
      return {
        ...group,
        text,
        width: Math.min(
          compact ? 174 : 210,
          Math.ceil(textUnits * (compact ? 10 : 11) + 13),
        ),
        height: compact ? 20 : 22,
        boss: first.boss,
        dangerous: first.dangerous,
        eligible: first.eligible,
        onscreen: true,
        behind: false,
        priority: first.boss ? 3 : first.dangerous ? 2 : 1,
        centerDistance: angularDistance(first),
        distance: first.distance || 0,
      };
    })
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        a.centerDistance - b.centerDistance ||
        a.distance - b.distance,
    );
  const labels = [],
    anchors = [],
    occupied = [];
  for (const label of candidates) {
    if (labels.length >= GROUP_LIMIT) break;
    // 不把说明拉向远处空白；附近无法避开 HUD 的组等待玩家转向后再显示。
    const usable = label.contacts.filter(
      (contact) => !pointBlocked(contact.anchor, blockers),
    );
    let placement, representative;
    for (const contact of usable.slice(0, 3)) {
      placement = placeNearby(
        label,
        contact.anchor,
        viewport,
        blockers,
        occupied,
      );
      if (placement) {
        representative = contact;
        break;
      }
    }
    if (!placement) continue;
    Object.assign(label, placement, { anchor: representative.anchor });
    labels.push(label);
    occupied.push(placement.rect);
    anchors.push(
      representative,
      ...usable
        .filter((contact) => contact.id !== representative.id)
        .slice(0, 1),
    );
  }
  return {
    contacts: anchors,
    labels,
    totalDetected: contacts.length,
    frontVisible: projected.length,
    markedCount: labels.reduce(
      (total, label) => total + label.contacts.length,
      0,
    ),
    shownGroups: labels.length,
  };
}

/** 返回两个矩形的交叠面积，供实际布局与回归测试使用同一规则。 */
export function overlapArea(a, b) {
  return (
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
  );
}

function placeNearby(label, anchor, viewport, blockers, occupied) {
  const width = Math.min(label.width, Math.max(1, viewport.width - 36));
  const halfWidth = width / 2,
    halfHeight = label.height / 2;
  const margin = isCompact(viewport) ? 18 : 24;
  const distanceLimit = isCompact(viewport) ? 70 : 88;
  const xCandidates = new Set([anchor.x, anchor.x - 36, anchor.x + 36]);
  const yCandidates = new Set([
    anchor.y - 24,
    anchor.y + 24,
    anchor.y - 46,
    anchor.y + 46,
  ]);
  for (const rect of [...blockers, ...occupied]) {
    xCandidates.add(rect.left - halfWidth - 2);
    xCandidates.add(rect.right + halfWidth + 2);
    yCandidates.add(rect.top - halfHeight - 2);
    yCandidates.add(rect.bottom + halfHeight + 2);
  }
  const candidates = [];
  for (const sourceX of xCandidates)
    for (const sourceY of yCandidates) {
      const x = clamp(
        sourceX,
        margin + halfWidth,
        viewport.width - margin - halfWidth,
      );
      const y = clamp(
        sourceY,
        margin + halfHeight,
        viewport.height - margin - halfHeight,
      );
      const distance = Math.hypot(x - anchor.x, y - anchor.y);
      if (distance > distanceLimit) continue;
      candidates.push({
        x,
        y,
        distance,
        preference: Math.hypot(x - anchor.x, y - (anchor.y - 24)),
      });
    }
  candidates.sort((a, b) => a.preference - b.preference);
  for (const point of candidates) {
    const rect = {
      left: point.x - halfWidth,
      top: point.y - halfHeight,
      right: point.x + halfWidth,
      bottom: point.y + halfHeight,
    };
    if (
      [...blockers, ...occupied].some((block) => overlapArea(rect, block) > 0)
    )
      continue;
    return {
      x: point.x,
      y: point.y,
      width,
      height: label.height,
      rect,
      hudOverlap: 0,
      labelOverlap: 0,
    };
  }
  return null;
}

function pointBlocked(point, blockers) {
  return blockers.some(
    (rect) =>
      point.x >= rect.left - 3 &&
      point.x <= rect.right + 3 &&
      point.y >= rect.top - 3 &&
      point.y <= rect.bottom + 3,
  );
}
function angularDistance(contact) {
  return Math.hypot(contact.horizontalAngle, contact.verticalAngle);
}
function isCompact(viewport) {
  return viewport.width <= 700 || viewport.height <= 500;
}
function formatLength(value) {
  return Number(value.toFixed(1)).toString();
}
