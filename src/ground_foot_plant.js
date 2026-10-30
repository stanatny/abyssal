import * as T from "three";

/** Per-instance visual contacts. Navigation, leap timing and collision stay with the caller. */
export function createGroundFootPlant(root, bones, legs) {
  const base = bones[0];
  const contacts = legs.map(() => ({ planted: false, recovering: false }));
  root.userData.groundFootContacts = contacts;
  const feet = legs.map((c) => {
    const [a, b, d] = c.points.map((p) => new T.Vector3(...p));
    const axis = d.clone().sub(a).normalize();
    const bend = b.clone().sub(a);
    bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    return {
      c,
      a,
      b,
      d,
      bend,
      l1: a.distanceTo(b),
      l2: b.distanceTo(d),
      anchor: new T.Vector3(),
      orientation: new T.Quaternion(),
      active: false,
      stance: false,
      recovery: null,
      nominal: new T.Vector3(),
      q: new T.Quaternion(),
      qa: new T.Quaternion(),
      qb: new T.Quaternion(),
      nb: new T.Vector3(),
      nd: new T.Vector3(),
    };
  });
  const inverse = new T.Matrix4(),
    baseQ = new T.Quaternion(),
    target = new T.Vector3(),
    delta = new T.Vector3(),
    dir = new T.Vector3(),
    normal = new T.Vector3(),
    knee = new T.Vector3(),
    v0 = new T.Vector3(),
    v1 = new T.Vector3(),
    q0 = new T.Quaternion(),
    q1 = new T.Quaternion(),
    previous = new T.Vector3();
  let initialized = false;
  return (state, cycles, duty) => {
    if (!state?.groundContacts || state.phase !== "walk") {
      contacts.forEach((c) => {
        c.planted = c.recovering = false;
      });
      initialized = false;
      feet.forEach((f) => {
        f.active = false;
        f.recovery = null;
      });
      return;
    }
    root.updateMatrixWorld(true);
    if (initialized && root.position.distanceTo(previous) > root.scale.x * 0.3)
      feet.forEach((f) => {
        f.active = false;
        f.recovery = null;
      });
    previous.copy(root.position);
    initialized = true;
    inverse.copy(base.matrixWorld).invert();
    base.getWorldQuaternion(baseQ).invert();
    // Sample every nominal endpoint before solving any limb.
    feet.forEach((f) => {
      bones[f.c.ids[2]].getWorldPosition(f.nominal);
      f.nd.copy(f.nominal).applyMatrix4(inverse);
      bones[f.c.ids[1]].getWorldPosition(f.nb).applyMatrix4(inverse);
      bones[f.c.ids[0]].getWorldQuaternion(f.qa).premultiply(baseQ);
      bones[f.c.ids[1]].getWorldQuaternion(f.qb).premultiply(baseQ);
      // Existing navigation includes a small sole margin. Remove it visually.
      f.nominal.y -= root.scale.x * 0.004;
      bones[f.c.ids[2]].getWorldQuaternion(f.q);
    });
    feet.forEach((f, i) => {
      const cycle = cycles[i],
        stance = cycle < duty;
      if (!f.active || (stance && !f.stance)) {
        f.anchor.copy(f.nominal);
        f.orientation.copy(f.q);
        f.active = true;
      }
      target.copy(f.anchor).applyMatrix4(inverse);
      v0.copy(f.nominal).applyMatrix4(inverse);
      if (f.recovery === null && stance && target.distanceTo(v0) > 0.065)
        f.recovery = 0;
      const recovering = f.recovery !== null;
      if (recovering)
        f.recovery = Math.min(
          1,
          f.recovery + Math.max(0, state.deltaSeconds || 0) / 0.18,
        );
      const u = recovering
        ? T.MathUtils.smoothstep(f.recovery, 0, 1)
        : stance
          ? 0
          : T.MathUtils.smoothstep((cycle - duty) / (1 - duty), 0, 1);
      target.copy(f.anchor).lerp(f.nominal, u);
      if (recovering)
        target.y += Math.sin(Math.PI * u) ** 2 * root.scale.x * 0.025;
      target.applyMatrix4(inverse);
      delta.copy(target).sub(f.a);
      const len = Math.min(f.l1 + f.l2 - 1e-5, Math.max(1e-5, delta.length()));
      dir.copy(delta).normalize();
      const along = (f.l1 * f.l1 - f.l2 * f.l2 + len * len) / (2 * len);
      const height = Math.sqrt(Math.max(0, f.l1 * f.l1 - along * along));
      normal.copy(f.nb).sub(f.a);
      normal.addScaledVector(dir, -normal.dot(dir)).normalize();
      knee
        .copy(f.a)
        .addScaledVector(dir, along)
        .addScaledVector(normal, height);
      target.copy(f.a).addScaledVector(dir, len);
      q0.setFromUnitVectors(
        v0.copy(f.nb).sub(f.a).normalize(),
        v1.copy(knee).sub(f.a).normalize(),
      ).multiply(f.qa);
      q1.setFromUnitVectors(
        v0.copy(f.nd).sub(f.nb).normalize(),
        v1.copy(target).sub(knee).normalize(),
      ).multiply(f.qb);
      bones[f.c.ids[0]].quaternion.copy(q0);
      bones[f.c.ids[1]].quaternion.copy(q0).invert().multiply(q1);
      // Keep a planted paw's world heading, then recover toward the body heading.
      f.q.copy(f.orientation);
      root.getWorldQuaternion(q0);
      f.q.slerp(q0, u).premultiply(baseQ);
      bones[f.c.ids[2]].quaternion.copy(q1).invert().multiply(f.q);
      contacts[i].planted = stance && !recovering;
      contacts[i].recovering = recovering;
      f.stance = stance;
      if (f.recovery === 1) {
        f.recovery = null;
        f.active = false;
      }
    });
  };
}

/** Leg ownership follows height through the fitted joints, avoiding nearest-segment flips at a bent knee. */
export function legHeightWeights(y, c) {
  const j = y >= c.points[1][1] ? 0 : 1;
  const t = T.MathUtils.clamp(
    (c.points[j][1] - y) / (c.points[j][1] - c.points[j + 1][1]),
    0,
    1,
  );
  return { a: c.ids[j], b: c.ids[j + 1], t };
}
