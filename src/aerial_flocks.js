import * as THREE from "three";

/** 连续巡航队列同时给出位置和切线，队员不再追上静止槽位后减速悬停。 */
export function aerialFormationPose(school, slot, time, position, tangent) {
  const species = school.species,
    radius = species.flightRadius ?? 55,
    speed = species.speed * 0.85,
    phase = school.seed + (time * speed) / radius,
    sin = Math.sin(phase),
    cos = Math.cos(phase),
    yaw = phase - Math.PI / 2;
  const x = slot.x * Math.cos(yaw) + slot.z * Math.sin(yaw),
    z = -slot.x * Math.sin(yaw) + slot.z * Math.cos(yaw);
  position.set(
    school.center.x + x + sin * radius,
    school.center.y + Math.sin(phase * 0.5) * 3,
    school.center.z + z + cos * radius,
  );
  tangent.set(cos, 0.025 * Math.cos(phase * 0.5), -sin).normalize();
  return position;
}

/** 稀疏近邻格只处理飞行个体，维持翼展净空；复用容器，不比较全海域所有动物。 */
export function createAerialSpacing() {
  const cells = new Map(),
    pool = [],
    cellSize = 48;
  let used = 0;
  const key = (x, y, z) => (x + 256) * 1048576 + (y + 256) * 1024 + z + 256;
  return {
    rebuild(entities) {
      cells.clear();
      used = 0;
      for (const e of entities) {
        if (!e.species.flying || e.hiddenFor > 0) continue;
        const p = e.mesh.position,
          k = key(
            Math.floor(p.x / cellSize),
            Math.floor(p.y / cellSize),
            Math.floor(p.z / cellSize),
          );
        let list = cells.get(k);
        if (!list) {
          list = pool[used] ?? (pool[used] = []);
          used++;
          list.length = 0;
          cells.set(k, list);
        }
        list.push(e);
      }
    },
    steer(entity, direction) {
      const p = entity.mesh.position,
        cx = Math.floor(p.x / cellSize),
        cy = Math.floor(p.y / cellSize),
        cz = Math.floor(p.z / cellSize);
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const list = cells.get(key(cx + x, cy + y, cz + z));
            if (!list) continue;
            for (const other of list) {
              if (other === entity) continue;
              const q = other.mesh.position,
                dx = p.x - q.x,
                dy = p.y - q.y,
                dz = p.z - q.z,
                d = Math.hypot(dx, dy, dz),
                safe =
                  entity.species.length *
                    (entity.species.flightClearance ?? 0.8) +
                  other.species.length * (other.species.flightClearance ?? 0.8);
              if (d > 0.001 && d < safe) {
                const weight = (2 * (1 - d / safe)) / d;
                direction.x += dx * weight;
                direction.y += dy * weight;
                direction.z += dz * weight;
              }
            }
          }
      return direction.normalize();
    },
    clear() {
      cells.clear();
      pool.length = 0;
    },
  };
}

const flightEuler = new THREE.Euler(0, 0, 0, "YXZ");
/** 飞行转向使用稳定偏航与有界俯仰，禁止绕身体纵轴翻成倒飞。 */
export function aerialHeadingQuaternion(out, direction) {
  const yaw = Math.atan2(-direction.x, -direction.z),
    pitch = Math.atan2(direction.y, Math.hypot(direction.x, direction.z));
  return out.setFromEuler(
    flightEuler.set(THREE.MathUtils.clamp(pitch, -1, 1), yaw, 0, "YXZ"),
  );
}
