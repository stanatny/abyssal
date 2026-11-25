import * as T from "three";
import { prepareLordSkinChunks } from "./hawaii_lord_rig.js";

const UP = new T.Vector3(0, 1, 0);
const FORWARD = new T.Vector3(0, 0, -1);
const smooth = (a, b, value) => T.MathUtils.smoothstep(value, a, b);
const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));

/** 复用已接受的髋、膝、脚骨；踝中间节保持中立，原始模型和共享接触缓存不变。 */
function legGeometry(source) {
  const geometry = source.clone();
  geometry.userData = { ...source.userData };
  delete geometry.userData.lordSkinChunks;
  const p = geometry.attributes.position;
  const ids = geometry.attributes.skinIndex.array;
  const weights = geometry.attributes.skinWeight.array;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i);
    const ownership =
      Math.max(
        smooth(0, 0.22, Math.abs(x)),
        (1 - smooth(-0.47, -0.36, y)) * smooth(0, 0.06, Math.abs(x)),
      ) *
      (1 - smooth(-0.38, -0.22, y));
    if (ownership <= 0) continue;
    const hip = x < 0 ? 14 : 18,
      knee = hip + 1,
      foot = hip + 3;
    const thigh = smooth(-0.385, -0.245, y);
    const sole = 1 - smooth(-0.47, -0.33, y);
    const mix = new Map();
    for (let q = 0; q < 4; q++)
      mix.set(
        ids[i * 4 + q],
        (mix.get(ids[i * 4 + q]) || 0) + weights[i * 4 + q] * (1 - ownership),
      );
    for (const [id, w] of [
      [hip, thigh * (1 - sole)],
      [knee, (1 - thigh) * (1 - sole)],
      [foot, sole],
    ])
      mix.set(id, (mix.get(id) || 0) + ownership * w);
    const ranked = [...mix].sort((a, b) => b[1] - a[1]).slice(0, 4),
      total = ranked.reduce((sum, row) => sum + row[1], 0);
    for (let q = 0; q < 4; q++) {
      ids[i * 4 + q] = ranked[q]?.[0] || 0;
      weights[i * 4 + q] = ranked[q] ? ranked[q][1] / total : 0;
    }
  }
  return geometry;
}

/** 固定中心的守卫通过真实双脚交替小步转向；锁定攻击前推进，
 * 上半身动画后可重复调用 applyPose，但不重复推进时钟。 */
export function createPolyphemusTurn(
  root,
  {
    rate = 0.52,
    stepDuration = 0.42,
    lift = 0.022,
    alignment = Math.PI / 12,
  } = {},
) {
  const { mesh, bones, definitions } = root.userData.hfRig || {};
  if (!mesh || bones?.length !== 22)
    throw new Error(
      "Polyphemus turning requires its actual complete22-bone HF rig.",
    );
  const source = mesh.geometry,
    geometry = legGeometry(source);
  mesh.geometry = geometry;
  prepareLordSkinChunks(mesh);
  const rest = definitions.map((d) => new T.Vector3(...d.point));
  const feet = [14, 18].map((hip) => ({
    hip,
    knee: hip + 1,
    foot: hip + 3,
    position: new T.Vector3(),
    quaternion: new T.Quaternion(),
  }));
  const status = {
    heading: new T.Vector3(0, 0, -1),
    angle: 0,
    aligned: true,
    stepping: false,
  };
  const parentPoint = new T.Vector3(),
    currentForward = new T.Vector3(),
    rootWorldQ = new T.Quaternion(),
    parentQ = new T.Quaternion();
  const inverseRootQ = new T.Quaternion(),
    targetQ = new T.Quaternion(),
    inverse = new T.Quaternion();
  const goal = new T.Vector3(),
    axis = new T.Vector3(),
    pole = new T.Vector3(),
    kneePoint = new T.Vector3(),
    endPoint = new T.Vector3();
  const upper = new T.Vector3(),
    lower = new T.Vector3(),
    qUpper = new T.Quaternion(),
    qLower = new T.Quaternion();
  const targetMatrix = new T.Matrix4(),
    localMatrix = new T.Matrix4();
  let yaw = 0,
    step = null,
    nextFoot = 0,
    disposed = false;
  const frame = (u, v, z) => {
    const x = new T.Vector3().crossVectors(u, v).normalize();
    const y = new T.Vector3().crossVectors(z, x).normalize();
    return new T.Quaternion().setFromRotationMatrix(
      new T.Matrix4().makeBasis(x, y, z),
    );
  };
  const footAt = (index, atYaw, out, outQ) => {
    targetQ.setFromAxisAngle(UP, atYaw);
    localMatrix.compose(root.position, targetQ, root.scale);
    if (root.parent) {
      root.parent.updateWorldMatrix(true, false);
      targetMatrix.multiplyMatrices(root.parent.matrixWorld, localMatrix);
      root.parent.getWorldQuaternion(parentQ);
      outQ.copy(parentQ).multiply(targetQ);
    } else {
      targetMatrix.copy(localMatrix);
      outQ.copy(targetQ);
    }
    out.copy(rest[feet[index].foot]).applyMatrix4(targetMatrix);
  };
  function applyPose() {
    if (disposed) return status;
    root.updateWorldMatrix(true, false);
    root.getWorldQuaternion(rootWorldQ);
    inverseRootQ.copy(rootWorldQ).invert();
    for (const foot of feet) {
      const h = rest[foot.hip],
        k = rest[foot.knee],
        f = rest[foot.foot];
      const ru = k.clone().sub(h),
        rl = f.clone().sub(k),
        u = ru.length(),
        l = rl.length();
      root.worldToLocal(goal.copy(foot.position));
      axis.copy(goal).sub(h);
      const distance = T.MathUtils.clamp(
        axis.length(),
        Math.abs(u - l) + 0.0001,
        (u + l) * 0.995,
      );
      axis.normalize();
      const restAxis = f.clone().sub(h).normalize();
      pole.copy(ru).addScaledVector(restAxis, -ru.dot(restAxis));
      pole.addScaledVector(axis, -pole.dot(axis)).normalize();
      const along = (u * u - l * l + distance * distance) / (2 * distance),
        height = Math.sqrt(Math.max(0, u * u - along * along));
      kneePoint
        .copy(h)
        .addScaledVector(axis, along)
        .addScaledVector(pole, height);
      endPoint.copy(h).addScaledVector(axis, distance);
      upper.copy(kneePoint).sub(h).normalize();
      lower.copy(endPoint).sub(kneePoint).normalize();
      ru.normalize();
      rl.normalize();
      qUpper
        .copy(frame(upper, lower, upper))
        .multiply(frame(ru, rl, ru).invert());
      qLower
        .copy(frame(upper, lower, lower))
        .multiply(frame(ru, rl, rl).invert());
      bones[foot.hip].quaternion.copy(qUpper);
      bones[foot.knee].quaternion
        .copy(inverse.copy(qUpper).invert())
        .multiply(qLower);
      bones[foot.hip + 2].quaternion.identity();
      bones[foot.foot].quaternion
        .copy(inverse.copy(qLower).invert())
        .multiply(targetQ.copy(inverseRootQ).multiply(foot.quaternion));
    }
    mesh.boundingBox = null;
    root.updateMatrixWorld(true);
    status.heading.copy(FORWARD).applyQuaternion(rootWorldQ).normalize();
    status.stepping = Boolean(step);
    return status;
  }
  function reset() {
    if (disposed) return;
    step = null;
    nextFoot = 0;
    for (const foot of feet)
      for (let i = foot.hip; i <= foot.foot; i++)
        bones[i].quaternion.identity();
    root.updateMatrixWorld(true);
    currentForward.copy(FORWARD).applyQuaternion(root.quaternion);
    yaw = Math.atan2(-currentForward.x, -currentForward.z);
    for (let i = 0; i < feet.length; i++)
      footAt(i, yaw, feet[i].position, feet[i].quaternion);
    status.angle = 0;
    status.aligned = true;
    applyPose();
  }
  reset();
  return {
    status,
    applyPose,
    reset,
    update(dt, target, { phase = "hunt", locked = false, active = true } = {}) {
      if (disposed || !active || !Number.isFinite(dt) || dt <= 0) return status;
      const valid =
        target && [target.x, target.y, target.z].every(Number.isFinite);
      if (valid) {
        parentPoint.copy(target);
        if (root.parent) root.parent.worldToLocal(parentPoint);
        parentPoint.sub(root.position);
      }
      const desired =
        valid && Math.hypot(parentPoint.x, parentPoint.z) > 1e-6
          ? Math.atan2(-parentPoint.x, -parentPoint.z)
          : yaw;
      const frozen =
        locked || ["attack", "defeated", "disoriented"].includes(phase);
      if (step && frozen && !step.frozen) {
        const foot = feet[step.index];
        const remaining = step.duration - step.elapsed;
        step.start.copy(foot.position);
        step.startQ.copy(foot.quaternion);
        step.elapsed = 0;
        step.duration = Math.max(0.12, remaining);
        step.fromYaw = step.toYaw = yaw;
        step.lift = 0;
        step.frozen = true;
        footAt(step.index, yaw, step.end, step.endQ);
      }
      if (!step && valid && !frozen && Math.abs(wrap(desired - yaw)) > 0.02) {
        const index = nextFoot;
        nextFoot = 1 - nextFoot;
        const delta = T.MathUtils.clamp(
          wrap(desired - yaw),
          (-rate * stepDuration) / 1.5,
          (rate * stepDuration) / 1.5,
        );
        step = {
          index,
          start: feet[index].position.clone(),
          startQ: feet[index].quaternion.clone(),
          end: new T.Vector3(),
          endQ: new T.Quaternion(),
          fromYaw: yaw,
          toYaw: yaw + delta,
          elapsed: 0,
          previousElapsed: 0,
          duration: stepDuration,
          lift,
          frozen: false,
        };
        footAt(index, step.toYaw, step.end, step.endQ);
      }
      if (step) {
        step.previousElapsed = step.elapsed;
        step.elapsed = Math.min(step.duration, step.elapsed + dt);
        const t = step.elapsed / step.duration,
          eased = t * t * (3 - 2 * t);
        if (!frozen) yaw = T.MathUtils.lerp(step.fromYaw, step.toYaw, eased);
        root.quaternion.setFromAxisAngle(UP, yaw);
        const foot = feet[step.index];
        foot.position
          .lerpVectors(step.start, step.end, eased)
          .addScaledVector(
            UP,
            Math.sin(Math.PI * t) * step.lift * root.scale.y,
          );
        foot.quaternion.slerpQuaternions(step.startQ, step.endQ, eased);
        if (step.lift > 0)
          foot.quaternion.multiply(
            targetQ.setFromAxisAngle(
              new T.Vector3(1, 0, 0),
              Math.sin(Math.PI * t) * 0.04,
            ),
          );
        if (step.elapsed >= step.duration - 1e-9) {
          foot.position.copy(step.end);
          foot.quaternion.copy(step.endQ);
          step = null;
        }
      }
      status.angle = wrap(desired - yaw);
      status.aligned = Math.abs(status.angle) <= alignment;
      return applyPose();
    },
    dispose() {
      if (disposed) return;
      reset();
      disposed = true;
      mesh.geometry = source;
      prepareLordSkinChunks(mesh);
      geometry.dispose();
    },
  };
}
