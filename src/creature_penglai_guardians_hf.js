import * as T from "three";
import { penglaiGuardianHFAsset } from "./penglai_guardian_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const PENGLAI_HF_GUARDIANS = new Set(["white_tiger", "vermilion_bird"]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 基于实际 HF 表面拟合翼根、胸肩、腿与口部，所有实例只共用不可变资产。 */
export function buildPenglaiGuardianHF(kind, root, motions) {
  const tiger = kind === "white_tiger",
    base = new T.Bone(),
    bones = [base],
    chains = [];
  root.add(base);
  const add = (name, points, type, extra = {}) => {
    if (!tiger) points = points.map(([x, y, z]) => [x * 1.35, y, z]);
    const c = { name, points, type, ...extra, ids: [] };
    for (let i = 0; i < points.length; i++) {
      const b = new T.Bone();
      b.name = name + "_" + i;
      b.position.fromArray(points[i]);
      if (i) b.position.sub(new T.Vector3(...points[i - 1]));
      (i ? bones[c.ids[i - 1]] : base).add(b);
      c.ids.push(bones.length);
      bones.push(b);
    }
    chains.push(c);
    return c;
  };
  const head = add(
    "guardian_head",
    tiger
      ? [
          [0.005, 0.16, -0.32],
          [0.014, 0.15, -0.48],
        ]
      : [
          [0, 0.12, -0.29],
          [0, 0.095, -0.48],
        ],
    "head",
  );
  const jaw = add(
    "guardian_jaw",
    tiger ? [[0.014, 0.105, -0.43]] : [[0, 0.08, -0.43]],
    "jaw",
  );
  // 下颌与头骨共同转动，口部不因颈部动作脱离。
  base.remove(bones[jaw.ids[0]]);
  bones[head.ids[0]].add(bones[jaw.ids[0]]);
  bones[jaw.ids[0]].position.sub(bones[head.ids[0]].position);
  const tail = add(
    "guardian_tail",
    tiger
      ? [
          [0, 0.155, 0.29],
          [0, 0.105, 0.335],
          [-0.015, 0.015, 0.375],
          [-0.06, -0.075, 0.412],
          [-0.115, -0.11, 0.447],
          [-0.17, -0.09, 0.48],
        ]
      : [
          [0, -0.065, -0.04],
          [0, -0.17, 0.12],
          [0, -0.29, 0.29],
          [0, -0.43, 0.48],
        ],
    "tail",
  );
  const legs = [],
    wings = [];
  if (tiger) {
    for (const side of [-1, 1])
      for (const front of [true, false]) {
        // 实际 HF 四肢略有错位，关节分别拟合，不能套用对称的旧模型坐标。
        const points = front
          ? side === 1
            ? [
                [0.115, 0.005, -0.26],
                [0.125, -0.155, -0.29],
                [0.137, -0.27, -0.34],
              ]
            : [
                [-0.063, 0.005, -0.21],
                [-0.062, -0.15, -0.25],
                [-0.068, -0.27, -0.29],
              ]
          : side === 1
            ? [
                [0.115, 0.025, 0.245],
                [0.125, -0.13, 0.265],
                [0.15, -0.27, 0.205],
              ]
            : [
                [-0.075, 0.025, 0.27],
                [-0.078, -0.13, 0.322],
                [-0.086, -0.27, 0.255],
              ];
        legs.push(add(`leg_${side}_${front}`, points, "leg", { side, front }));
      }
  } else
    for (const side of [-1, 1]) {
      wings.push(
        add(
          "wing_" + side,
          [
            [side * 0.07, 0.1, -0.245],
            [side * 0.29, 0.19, -0.23],
            [side * 0.47, 0.3, -0.17],
            [side * 0.6, 0.4, -0.07],
          ],
          "wing",
          { side },
        ),
      );
    }
  const p = new T.Vector3();
  const bind = (x, y, z, ids, w, o) => {
    p.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    if (tiger) {
      // 以真实尾轴的距离分离尾皮与后腿；仅用 Z 阈值会把后腿一起拽走。
      const tailWeight =
        smooth(0.285, 0.355, z) *
        (1 - smooth(0.026, 0.06, Math.sqrt(nearestChain(p, tail).distance)));
      if (tailWeight > 0.001) {
        chainWeights(tail, p, tailWeight, ids, w, o);
        return;
      }
      if (y < 0.025) {
        let best, leg;
        for (const c of legs) {
          const n = nearestChain(p, c);
          if (!best || n.distance < best.distance) {
            best = n;
            leg = c;
          }
        }
        const k =
          (1 - smooth(-0.15, 0.025, y)) *
          (1 - smooth(0.065, 0.14, Math.sqrt(best.distance)));
        if (k > 0.001) {
          chainWeights(leg, p, k, ids, w, o);
          return;
        }
      }
      const neck = smooth(0.24, 0.35, -z);
      chainWeights(
        { ...head, ids: [head.ids[0], head.ids[0]] },
        p,
        neck,
        ids,
        w,
        o,
      );
      if (z < -0.38 && y < 0.09) {
        const j = neck * (1 - smooth(0.063, 0.09, y)) * smooth(0.38, 0.435, -z);
        ids[o] = head.ids[0];
        ids[o + 1] = jaw.ids[0];
        w[o] = 1 - j;
        w[o + 1] = j;
        w[o + 2] = 0;
      }
    } else {
      const wing = wings[x < 0 ? 0 : 1];
      const k = smooth(0.065 * 1.35, 0.17 * 1.35, Math.abs(x));
      if (k > 0) {
        chainWeights(wing, p, k, ids, w, o);
        return;
      }
      if (z > -0.04 && y < -0.045) {
        chainWeights(
          tail,
          p,
          smooth(-0.07, 0.09, z) * (1 - smooth(-0.08, 0.01, y)),
          ids,
          w,
          o,
        );
        return;
      }
      chainWeights(
        { ...head, ids: [head.ids[0], head.ids[0]] },
        p,
        smooth(0.26, 0.36, -z),
        ids,
        w,
        o,
      );
    }
  };
  const asset = penglaiGuardianHFAsset(kind, bind),
    mesh = bindOrganicBody(
      root,
      kind + "_continuous_hf",
      asset.geometry,
      asset.material,
      bones,
      0.42,
    );
  const pos = asset.geometry.attributes.position,
    parts = Array.from({ length: 5 }, () => []);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (
      tiger
        ? z < 0.27 && y > -0.115
        : Math.abs(x) < 0.115 && z < 0.02 && y > -0.1 && y < 0.28
    ) {
      const bucket = Math.min(
        4,
        Math.max(0, Math.floor(((z + 0.5) / 0.77) * 5)),
      );
      parts[bucket].push(i);
    }
  }
  mesh.userData.lordCoreParts = parts.filter((a) => a.length > 20);
  const mouth = new T.Object3D();
  mouth.position
    .set(tiger ? 0.014 : 0, tiger ? 0.115 : 0.085, -0.49)
    .sub(new T.Vector3(...head.points[0]));
  bones[head.ids[0]].add(mouth);
  root.userData.mouthAnchors = [mouth];
  root.userData.getHeadWorldPositions = () => [
    mouth.getWorldPosition(new T.Vector3()),
  ];
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  root.userData.artRevision = "penglai_guardians_hf_v1";
  root.userData.normalizedLength = 1;
  root.userData.mythicAnatomy = kind;
  root.userData.groundSupport = tiger ? -asset.geometry.boundingBox.min.y : 0;
  root.userData.guideRadius = tiger ? 0.72 : 1.08;
  root.userData.hfRig = {
    asset,
    kind,
    mesh,
    bones,
    chains,
    legs,
    wings,
    head,
    tail,
  };
  let phase = "dormant",
    ability,
    previous,
    crouch = 0,
    leap = 0,
    roar = 0,
    recovery = 0,
    disposed = false,
    previousYaw,
    previousEffort = 1,
    tailTurn = 0;
  root.userData.setBossPhase = (value, activeAbility) => {
    phase = value;
    ability = activeAbility;
  };
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const travel = {
    active: false,
    drive: 1,
    phase: 0,
    speed: 0,
    distance: 0,
    running: 0,
    stride: 0.055,
    duty: 0.72,
  };
  root.userData.groundGaitState = travel;
  if (tiger) {
    root.userData.setGroundTravel = (distance, dt) => {
      if (!(dt > 0) || !Number.isFinite(distance)) return;
      if (!travel.active) {
        travel.phase = (previous ?? 0) * 0.9;
        travel.drive = Math.min(1, previousEffort);
      }
      travel.active = true;
      travel.speed = Math.max(0, distance) / dt;
      if (!(distance > 0)) return;
      const scale = Math.max(0.001, root.scale.x),
        run = smooth(0.2, 1.1, travel.speed / scale);
      travel.running += (run - travel.running) * (1 - Math.exp(-8 * dt));
      travel.stride = 0.055 + 0.05 * travel.running;
      travel.duty = 0.72 - 0.13 * travel.running;
      travel.distance += Math.max(0, distance);
      travel.phase +=
        (((Math.max(0, distance) / scale) * travel.duty) /
          (2 * travel.stride)) *
        Math.PI *
        2;
    };
    root.userData.resetGroundTravel = () =>
      Object.assign(travel, {
        active: false,
        phase: 0,
        speed: 0,
        distance: 0,
        running: 0,
        stride: 0.055,
        duty: 0.72,
      });
  }
  for (const c of legs) {
    c.rest = c.points.map((point) => new T.Vector3(...point));
    c.lengths = [
      c.rest[0].distanceTo(c.rest[1]),
      c.rest[1].distanceTo(c.rest[2]),
    ];
    const axis = c.rest[2].clone().sub(c.rest[0]).normalize();
    c.bend = c.rest[1].clone().sub(c.rest[0]);
    c.bend.addScaledVector(axis, -c.bend.dot(axis)).normalize();
  }
  const legTarget = new T.Vector3(),
    legDelta = new T.Vector3(),
    legDirection = new T.Vector3(),
    legNormal = new T.Vector3(),
    legKnee = new T.Vector3();
  const ease = lordEffortSmoother(),
    v0 = new T.Vector3(),
    v1 = new T.Vector3(),
    q0 = new T.Quaternion(),
    q1 = new T.Quaternion();
  // 脚掌目标通过两段 IK 求解；支撑期后移，抬脚期回收，避免四肢齐摆滑步。
  function solveLeg(c, dy, dz) {
    const [a, b, d] = c.rest,
      [l1, l2] = c.lengths,
      target = legTarget.set(0, dy - base.position.y, dz).add(d),
      delta = legDelta.copy(target).sub(a),
      dist = delta.length(),
      len = Math.min(l1 + l2 - 0.00001, Math.max(0.0001, dist)),
      dir = legDirection.copy(delta).normalize();
    const along = (l1 * l1 - l2 * l2 + len * len) / (2 * len),
      height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    const normal = legNormal.copy(c.bend);
    normal.addScaledVector(dir, -normal.dot(dir)).normalize();
    const knee = legKnee
      .copy(a)
      .addScaledVector(dir, along)
      .addScaledVector(normal, height);
    target.copy(a).addScaledVector(dir, len);
    q0.setFromUnitVectors(
      v0.copy(b).sub(a).normalize(),
      v1.copy(knee).sub(a).normalize(),
    );
    q1.setFromUnitVectors(
      v0.copy(d).sub(b).normalize(),
      v1.copy(target).sub(knee).normalize(),
    );
    bones[c.ids[0]].quaternion.copy(q0);
    bones[c.ids[1]].quaternion.copy(q0).invert().multiply(q1);
    bones[c.ids[2]].quaternion.copy(q1).invert();
  }
  motions.push((t, e) => {
    const dt =
      previous === undefined || t < previous
        ? 0
        : Math.min(0.12, (t - previous) / (1.7 + e * 1.1));
    previous = t;
    previousEffort = e;
    if (travel.active && travel.speed > 0)
      travel.drive += (1 - travel.drive) * (1 - Math.exp(-10 * dt));
    const f = 1 - Math.exp(-9 * dt);
    crouch += ((phase === "windup" ? 1 : 0) - crouch) * f;
    leap += ((phase === "attack" && ability !== "roar" ? 1 : 0) - leap) * f;
    recovery += ((phase === "recover" ? 1 : 0) - recovery) * f;
    roar += ((ability === "roar" && phase === "attack" ? 1 : 0) - roar) * f;
    const effort = ease(t, e);
    if (tiger) {
      const drive = travel.active
          ? travel.distance > 0
            ? travel.drive
            : 0
          : Math.min(1, e),
        gait = travel.active ? travel.phase : t * 0.9,
        walk = (1 - crouch) * (1 - leap) * (1 - roar) * (1 - recovery * 0.7);
      base.position.y = -0.018 * crouch - 0.065 * travel.running * walk;
      for (const c of legs) {
        const cycle =
            (((gait / (Math.PI * 2) +
              (c.side === 1 ? 0.5 : 0) +
              (c.front ? 0.25 + 0.25 * travel.running : 0)) %
              1) +
              1) %
            1,
          stance = cycle < travel.duty,
          u = stance
            ? cycle / travel.duty
            : (cycle - travel.duty) / (1 - travel.duty),
          step =
            (stance ? -1 + 2 * u : 1 - 2 * u * u * (3 - 2 * u)) *
            travel.stride *
            drive *
            walk,
          lift =
            (stance ? 0 : Math.sin(Math.PI * u) ** 2 * 0.038) * drive * walk;
        solveLeg(
          c,
          lift + (c.front ? 0.1 : 0.065) * leap,
          step + (c.front ? -0.11 : 0.06) * leap - 0.014 * crouch,
        );
      }
      bones[head.ids[0]].rotation.x =
        -0.035 * crouch + 0.035 * leap + roar * 0.055;
      bones[jaw.ids[0]].rotation.x = -0.2 * crouch - 0.32 * leap - roar * 0.32;
    } else {
      for (const c of wings) {
        bones[c.ids[0]].rotation.z =
          c.side *
          (Math.sin(t * 0.68) * (0.4 + Math.min(effort, 2) * 0.08) - 0.17);
        bones[c.ids[1]].rotation.z = c.side * Math.sin(t * 0.68 - 0.4) * 0.12;
        bones[c.ids[2]].rotation.z = c.side * Math.sin(t * 0.68 - 0.75) * 0.065;
        bones[c.ids[1]].rotation.y =
          c.side * (0.035 + Math.max(0, Math.cos(t * 0.68)) * 0.06);
      }
      bones[head.ids[0]].rotation.x = -crouch * 0.035 + leap * 0.025;
    }
    if (tiger && dt > 0) {
      const yaw = Math.atan2(
        2 *
          (root.quaternion.w * root.quaternion.y +
            root.quaternion.x * root.quaternion.z),
        1 - 2 * (root.quaternion.y ** 2 + root.quaternion.x ** 2),
      );
      const delta =
        previousYaw === undefined
          ? 0
          : Math.atan2(
              Math.sin(yaw - previousYaw),
              Math.cos(yaw - previousYaw),
            );
      const target = T.MathUtils.clamp((-delta / dt) * 0.06, -0.12, 0.12);
      tailTurn += (target - tailTurn) * (1 - Math.exp(-4 * dt));
      previousYaw = yaw;
    }
    for (let i = 0; i < tail.ids.length; i++) {
      bones[tail.ids[i]].rotation.y = tiger
        ? (Math.sin(t * 0.22 - i * 0.45) * 0.022 + tailTurn * 0.3) *
          (i === 0 ? 0.3 : 1)
        : Math.sin(t * 0.45 - i * 0.7) * 0.025;
      bones[tail.ids[i]].rotation.x = tiger
        ? 0
        : Math.sin(t * 0.68 - i * 0.4) * 0.025;
    }
  });
}
