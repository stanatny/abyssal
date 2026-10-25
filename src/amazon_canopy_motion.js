import * as THREE from "three";

const cycle = 1.1,
  stance = 0.65,
  smooth = (v) => v * v * (3 - 2 * v);

const cycleFor = (range) => cycle * Math.min(1, 6.8 / Math.max(6.8, range));

function travelAt(time, range) {
  const route = time * 0.2158;
  // Small acceleration through the bottom of each supported swing. The broad
  // route still slows before reversal rather than teleporting its handholds.
  return (
    Math.sin(route) * range +
    Math.cos(route) * Math.sin((time / cycleFor(range)) * Math.PI * 4) * 0.06
  );
}

/** Suspended branch crossing: load a fixed handhold, swing under it, then reach.
 * Ateles also walks/clambers; this is only the hanging part of its repertoire.
 */
export function sampleCanopyTraverse(time, span, out) {
  const range = Math.max(0, span * 0.5 - 3.2),
    duration = cycleFor(range),
    route = time * 0.2158,
    direction = Math.cos(route),
    gait = (time / duration) * Math.PI * 2,
    effort = Math.min(1, Math.abs(direction) * 2);
  out.x = travelAt(time, range);
  out.effort = effort;
  out.gait = gait;
  out.yaw = Math.tanh(direction * 4) * Math.PI * 0.5;
  out.pitch = (-0.12 + Math.sin(gait * 2) * 0.17) * effort;
  out.roll = Math.cos(gait) * 0.035 * effort;
  out.sway = Math.cos(gait) * 0.045 * effort;
  // Raise the torso as it approaches either end of a swing; pass lower under
  // the supporting hand. This is shared with the limb motion below.
  out.rise = (0.1 + 0.14 * Math.cos(gait * 2)) * effort;
  for (let side = 0; side < 2; side++) {
    const offset = side * duration * 0.5,
      count = Math.floor((time + offset) / duration),
      start = count * duration - offset,
      phase = (time - start) / duration,
      from = travelAt(start + duration * stance * 0.5, range),
      to = travelAt(start + duration * (1 + stance * 0.5), range),
      reach = phase < stance ? 0 : (phase - stance) / (1 - stance);
    const hand = out.hands[side];
    hand.x = THREE.MathUtils.lerp(from, to, smooth(reach));
    hand.drop = Math.sin(reach * Math.PI) ** 2 * 0.62;
    hand.gripping = phase < stance;
    hand.reach = reach;
  }
  return out;
}

/** One placement path for the scene and actual-skin/contact verification. */
export function placeCanopyMonkey(monkey, pose, vineHeight, offset) {
  const model = monkey.root;
  model.rotation.set(pose.pitch, pose.yaw, pose.roll, "YXZ");
  model.position.set(
    pose.x,
    vineHeight - monkey.hangOffset + pose.rise,
    pose.sway,
  );
  model.position.sub(
    offset.copy(monkey.centerOffset).applyQuaternion(model.quaternion),
  );
  model.updateMatrixWorld(true);
}

/** 求两段肢体的肘点；长度保持固定，极端目标夹在可达球壳内。 */
export function solveCanopyElbow(
  shoulder,
  hand,
  pole,
  upper,
  lower,
  elbow,
  scratch,
) {
  const { direction, bend } = scratch;
  direction.subVectors(hand, shoulder);
  const distance = THREE.MathUtils.clamp(
    direction.length(),
    Math.abs(upper - lower) + 1e-5,
    upper + lower - 1e-5,
  );
  direction.normalize();
  bend.copy(pole).addScaledVector(direction, -pole.dot(direction));
  if (bend.lengthSq() < 1e-8) {
    bend.set(0, 0, 1).addScaledVector(direction, -direction.z);
    if (bend.lengthSq() < 1e-8) bend.set(1, 0, 0);
  }
  bend.normalize();
  const along =
      (upper * upper - lower * lower + distance * distance) / (2 * distance),
    height = Math.sqrt(Math.max(0, upper * upper - along * along));
  elbow
    .copy(shoulder)
    .addScaledVector(direction, along)
    .addScaledVector(bend, height);
  return distance;
}
