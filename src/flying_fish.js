import { WORLD } from "./world_config.js";

/** 飞鱼近距离受惊后借惯性滑翔，轨迹只由主循环推进；返回当前是否在空中/跃升。 */
export function stepFlyingFish(entity, dt, now, playerPosition) {
  if (entity.species.kind !== "flying_fish") return false;
  const point = entity.mesh.position;
  if (
    !entity.flight &&
    now >= (entity.flightReadyAt || 0) &&
    point.y > -14 &&
    point.distanceTo(playerPosition) < 22
  ) {
    let x = point.x - playerPosition.x,
      z = point.z - playerPosition.z;
    const length = Math.hypot(x, z);
    if (length < 0.1) {
      x = 0;
      z = -1;
    } else {
      x /= length;
      z /= length;
    }
    entity.flight = { age: 0, originY: point.y, x, z };
    entity.flightReadyAt = now + 18;
    entity.mesh.userData.setGliding?.(true);
  }
  const flight = entity.flight;
  if (!flight) return false;
  flight.age += dt;
  point.x = Math.max(
    WORLD.minX + 12,
    Math.min(WORLD.maxX - 12, point.x + flight.x * 16 * dt),
  );
  point.z = Math.max(
    WORLD.minZ + 12,
    Math.min(WORLD.maxZ - 12, point.z + flight.z * 16 * dt),
  );
  const t = flight.age;
  if (t < 0.7)
    point.y =
      flight.originY + (WORLD.surfaceY + 1.8 - flight.originY) * (t / 0.7);
  else if (t < 3.7)
    point.y = WORLD.surfaceY + 1.8 + Math.sin(((t - 0.7) / 3) * Math.PI) * 2.8;
  else
    point.y = WORLD.surfaceY + 1.8 - ((t - 3.7) / 0.7) * (WORLD.surfaceY + 4.8);
  entity.velocity
    .set(flight.x, t < 0.7 ? 0.35 : t >= 3.7 ? -0.3 : 0, flight.z)
    .normalize();
  if (t >= 4.4) {
    point.y = -3;
    entity.flight = null;
    entity.mesh.userData.setGliding?.(false);
  }
  return true;
}
