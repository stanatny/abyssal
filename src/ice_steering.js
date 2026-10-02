import { needsGroundRecovery, stepGroundSteering } from "./ground_steering.js";

/** 冰顶接触是地板恢复的镜像，只在封闭海域的实际上撞发生后启动。 */
export function needsIceRecovery(
  pitch,
  { desiredY, position, ceilingY, contacts = [], jet = false },
) {
  return needsGroundRecovery(-pitch, {
    desiredY: -desiredY,
    position: { y: -position.y },
    floorY: -ceilingY,
    contacts: contacts.map((hit) => ({ normal: { y: -hit.normal.y } })),
    jet,
  });
}
export function stepIceSteering(orientation, input, movement, dt) {
  const next = stepGroundSteering(
    { yaw: orientation.yaw, pitch: -orientation.pitch },
    { x: input.x, y: -input.y },
    movement,
    dt,
  );
  return { ...next, pitch: -next.pitch };
}
