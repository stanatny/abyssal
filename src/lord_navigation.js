import * as T from "three";
import { aquaticHeading } from "./aquatic_reptile_motion.js";
import { updateLordBody } from "./lord_body.js";

const forward = new T.Vector3(0, 0, -1),
  up = new T.Vector3(0, 1, 0);
/** 承重解剖截面生成有限净空球；只存数字，柔性龙躯另留摆动包络。 */
export function createLordNavigation(mesh, species) {
  const inverse = mesh.matrixWorld.clone();
  mesh.updateWorldMatrix(true, true);
  inverse.copy(mesh.matrixWorld).invert();
  const scale = species.length,
    point = new T.Vector3();
  const probes = updateLordBody(mesh).map((c) => {
    point.set(c.x, c.y, c.z).applyMatrix4(inverse);
    return {
      x: point.x,
      y: point.y,
      z: point.z,
      radius:
        Math.max(c.axes.x, c.axes.y, c.axes.z) +
        (species.navigationSway ?? 0) +
        0.25,
    };
  });
  if (!probes.length)
    for (const z of [-0.32, 0, 0.32])
      probes.push({ x: 0, y: 0, z, radius: scale * 0.14 });
  return {
    probes,
    length: scale,
    pitchLimit: mesh.userData.aquaticPitchLimit,
    a: new T.Vector3(),
    b: new T.Vector3(),
    orientation: new T.Quaternion(),
    target: new T.Quaternion(),
    saved: new T.Quaternion(),
  };
}
export function lordHeadingQuaternion(
  out,
  heading,
  upright = false,
  pitchLimit,
  previousYaw = 0,
) {
  if (upright)
    return out.setFromAxisAngle(up, Math.atan2(-heading.x, -heading.z));
  if (Number.isFinite(pitchLimit))
    return aquaticHeading(out, heading, previousYaw, pitchLimit);
  return out.setFromUnitVectors(forward, heading);
}
/** 连续检查身体转向与平移，视线线段的零半径不再代替身体碰撞。 */
export function lordMoveClear(
  entry,
  from,
  to,
  rotation,
  heightAt,
  blocked,
  startRotation = entry.mesh.quaternion,
) {
  const nav = entry.navigation;
  if (!nav) return true;
  if (to.y > entry.maxCenterY + 0.01) return false;
  if (
    !entry.state.pursuitStarted &&
    to.distanceTo(entry.home) > entry.radius + 22
  )
    return false;
  for (const p of nav.probes) {
    nav.a
      .set(p.x, p.y, p.z)
      .multiplyScalar(nav.length)
      .applyQuaternion(startRotation)
      .add(from);
    nav.b
      .set(p.x, p.y, p.z)
      .multiplyScalar(nav.length)
      .applyQuaternion(rotation)
      .add(to);
    if (blocked(nav.a, nav.b, p.radius)) return false;
    if (!entry.groundHabitat) {
      const r = p.radius;
      const floor = Math.max(
        heightAt(nav.b.x, nav.b.z),
        heightAt(nav.b.x + r, nav.b.z),
        heightAt(nav.b.x - r, nav.b.z),
        heightAt(nav.b.x, nav.b.z + r),
        heightAt(nav.b.x, nav.b.z - r),
      );
      if (nav.b.y - r < floor + 0.2) return false;
    }
  }
  return true;
}
