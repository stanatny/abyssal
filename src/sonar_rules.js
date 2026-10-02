import { canPredatorRetaliate } from "./predator_combat.js";
/** 虎鲸主动声呐规则：以实际游玩秒数计时，不依赖相机、可见性或渲染器。 */
import { canEat } from "./simulation.js";
import { getCharacter } from "./character_rules.js";

const ORCA_SONAR = getCharacter("orca").active;

export const SONAR_ABILITY = Object.freeze({
  duration: ORCA_SONAR.duration,
  cooldown: ORCA_SONAR.cooldown,
  range: ORCA_SONAR.range,
});

/** 创建本局的声呐计时状态；重开时重新创建，暂停时保持调用方的游玩时钟不变。 */
export function createSonarState() {
  return { activatedAt: null, activeUntil: 0, readyAt: 0 };
}

/** 尝试释放声呐；返回是否成功，冷却中的重复操作不会延长显示时间。 */
export function activateSonar(state, now) {
  if (!Number.isFinite(now) || now < 0 || now < state.readyAt) return false;
  state.activatedAt = now;
  state.activeUntil = now + SONAR_ABILITY.duration;
  state.readyAt = now + SONAR_ABILITY.cooldown;
  return true;
}

/** 查询指定游玩时刻的技能状态；返回有效期、冷却剩余秒数以及能否释放。 */
export function getSonarStatus(state, now) {
  const time = Number.isFinite(now) ? Math.max(0, now) : 0;
  const active =
    state.activatedAt !== null &&
    time >= state.activatedAt &&
    time < state.activeUntil;
  const cooldownRemaining = Math.max(0, state.readyAt - time);
  return {
    active,
    remaining: active ? state.activeUntil - time : 0,
    cooldownRemaining,
    ready: cooldownRemaining === 0,
  };
}

/**
 * 探测半径内的存活生物，不检查屏幕、雾或岩石遮挡，因此能显示肉眼看不到的目标。
 * @param {object} context 玩家位置、方向、状态以及普通鱼和领主列表。
 * @returns {object[]} 包含相对方位、体长、距离与捕食或交战资格的雷达目标。
 */
export function detectSonarContacts({
  position,
  forward,
  player,
  entities = [],
  bosses = [],
}) {
  if (!isPoint(position) || !isPoint(forward) || !player) return [];
  const horizontal = Math.hypot(forward.x, forward.z);
  const facingX = horizontal > 1e-6 ? forward.x / horizontal : 0;
  const facingZ = horizontal > 1e-6 ? forward.z / horizontal : -1;
  const contacts = [];
  function add(source, species, id, boss = false) {
    const point = source.mesh?.position || source.position;
    if (
      !species ||
      !isPoint(point) ||
      !Number.isFinite(species.length) ||
      species.length <= 0
    )
      return;
    const dx = point.x - position.x;
    const dy = point.y - position.y;
    const dz = point.z - position.z;
    const distance = Math.hypot(dx, dy, dz);
    if (distance > SONAR_ABILITY.range) return;
    const right = -dx * facingZ + dz * facingX;
    const ahead = dx * facingX + dz * facingZ;
    const bearing = Math.atan2(right, ahead);
    const sector = (Math.round(bearing / (Math.PI / 4)) + 8) % 8;
    const direction = [
      "前方",
      "右前",
      "右侧",
      "右后",
      "后方",
      "左后",
      "左侧",
      "左前",
    ][sector];
    const elevation = dy > 12 ? "上方" : dy < -12 ? "下方" : "同层";
    const playerAvailable = !player.dead && !player.won && !player.timedOut;
    const eligible = boss
      ? playerAvailable && player.length >= species.minAttackLength
      : canEat(player, species.length);
    const dangerous =
      boss ||
      (species.predator && canPredatorRetaliate(player.length, species.length));
    contacts.push({
      id,
      kind: species.kind,
      label: species.label,
      length: species.length,
      position: { x: point.x, y: point.y, z: point.z },
      distance,
      bearing,
      direction,
      elevation,
      verticalOffset: dy,
      radarX: right / SONAR_ABILITY.range,
      radarY: -ahead / SONAR_ABILITY.range,
      boss,
      eligible,
      dangerous,
      status: boss
        ? eligible
          ? "可交战 · 需多次接触"
          : "体型不足 · 避开领主"
        : eligible
          ? dangerous
            ? "可捕食 · 会反击"
            : "可捕食"
          : "不可捕食",
      priority: boss ? 3 : dangerous ? 2 : species.predator ? 1 : 0,
    });
  }
  entities.forEach((entity, index) => {
    if (
      entity.hiddenFor > 0 ||
      entity.enabled === false ||
      entity.dead ||
      entity.defeated ||
      entity.health <= 0
    )
      return;
    add(entity, entity.species, `fish-${index}`);
  });
  bosses.forEach((entry, index) => {
    if (
      !entry.enabled ||
      !entry.state ||
      entry.state.defeated ||
      entry.state.health <= 0
    )
      return;
    add(entry, entry.state.species, `boss-${index}`, true);
  });
  return contacts;
}

/** 按种类去重后优先展示领主和危险猎手，其余选择最近目标；雷达仍保留所有目标。 */
export function selectSonarContacts(contacts, limit = 4) {
  const nearestByKind = new Map();
  for (const contact of contacts) {
    const previous = nearestByKind.get(contact.kind);
    if (!previous || contact.distance < previous.distance)
      nearestByKind.set(contact.kind, contact);
  }
  return [...nearestByKind.values()]
    .sort((a, b) => b.priority - a.priority || a.distance - b.distance)
    .slice(0, Math.max(0, Math.floor(limit)));
}

function isPoint(point) {
  return (
    point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Number.isFinite(point.z)
  );
}
