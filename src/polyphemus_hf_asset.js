import * as T from "three";
import data from "./assets/models/polyphemus_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh, bindOrganicBody } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import { decodePackedArray } from "./packed_array.js";
import { prepareLordSkinChunks } from "./hawaii_lord_rig.js";

export const POLYPHEMUS_HF_DATA = data;
const definitions = data.rig.bones;
const points = definitions.map((b) => new T.Vector3(...b.point));
const smooth = (a, b, value) => T.MathUtils.smoothstep(value, a, b);
const ownership = decodePackedArray(data.armOwnership, Uint16Array);
let shared;

// 一整轮蓄力、出手与余势共享时间轴；各通道独立延迟，不把全身当作一个开关。
const MOTION_KEYS = [
  [0, [-0.425, -0.05, -0.168, 0.425, -0.05, -0.163, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  [
    0.65,
    [
      -0.43, -0.045, -0.16, 0.42, -0.04, -0.18, 0.012, 0.008, 0.004, -0.01,
      0.012, 0.006, 0, 0.25, 0.2,
    ],
  ],
  [
    2.3,
    [
      -0.435, 0.24, -0.1, 0.4, -0.015, -0.205, 0.075, 0.025, 0.012, -0.035,
      0.035, 0.018, -0.012, 1, 0.6,
    ],
  ],
  [
    3,
    [
      -0.4, 0.235, -0.08, 0.4, -0.02, -0.2, 0.075, 0.025, 0.012, -0.035, 0.035,
      0.018, -0.012, 1, 0.6,
    ],
  ],
  [
    3.84,
    [
      -0.38, 0.13, -0.32, 0.45, -0.07, -0.12, -0.045, -0.025, -0.01, 0.025,
      -0.025, -0.015, 0.018, 1, 0.6,
    ],
  ],
  [
    4.4,
    [
      -0.295, 0.02, -0.35, 0.44, -0.065, -0.13, -0.095, -0.045, -0.015, 0.05,
      -0.06, -0.01, 0.012, 1, 0.45,
    ],
  ],
  [
    5,
    [
      -0.315, -0.005, -0.3, 0.43, -0.045, -0.15, -0.07, -0.032, -0.01, 0.025,
      -0.035, 0, 0.006, 1, 0.3,
    ],
  ],
  [
    6.7,
    [
      -0.395, -0.025, -0.2, 0.42, -0.035, -0.17, -0.025, -0.015, -0.004, 0.012,
      -0.012, 0.005, 0, 0.55, 0.15,
    ],
  ],
  [
    9.5,
    [-0.425, -0.05, -0.168, 0.425, -0.05, -0.163, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
];
// 形状保持的三次插值不越过解剖关键位；中间的放石点仍有连续的前冲与下沉速度。
const motionSlope = (index, axis) => {
  if (index === 0 || index === MOTION_KEYS.length - 1) return 0;
  const [a, b, c] = MOTION_KEYS.slice(index - 1, index + 2);
  const h0 = b[0] - a[0],
    h1 = c[0] - b[0];
  const d0 = (b[1][axis] - a[1][axis]) / h0,
    d1 = (c[1][axis] - b[1][axis]) / h1;
  if (d0 * d1 <= 0) return 0;
  const w0 = 2 * h1 + h0,
    w1 = h1 + 2 * h0;
  return (w0 + w1) / (w0 / d0 + w1 / d1);
};
const MOTION_SLOPES = MOTION_KEYS.map((key, i) =>
  key[1].map((_, axis) => motionSlope(i, axis)),
);
function motionProfile(phase, progress, out) {
  const time =
    phase === "windup"
      ? progress * 3
      : phase === "attack"
        ? 3 + progress * 2
        : phase === "recover"
          ? 5 + progress * 4.5
          : 0;
  let i = 0;
  while (i < MOTION_KEYS.length - 2 && time > MOTION_KEYS[i + 1][0]) i++;
  const a = MOTION_KEYS[i],
    b = MOTION_KEYS[i + 1],
    h = b[0] - a[0];
  const u = T.MathUtils.clamp((time - a[0]) / h, 0, 1),
    u2 = u * u,
    u3 = u2 * u;
  for (let axis = 0; axis < out.length; axis++)
    out[axis] =
      (2 * u3 - 3 * u2 + 1) * a[1][axis] +
      (u3 - 2 * u2 + u) * h * MOTION_SLOPES[i][axis] +
      (-2 * u3 + 3 * u2) * b[1][axis] +
      (u3 - u2) * h * MOTION_SLOPES[i + 1][axis];
  return time;
}

/** 以实际肢体分区选择肩肘腕，而非把膝盖、腹部和靠近身体的手掌绑定到最近的错误骨骼。 */
function bindAnatomy(x, y, z, ids, weights, offset, vertexIndex) {
  const point = new T.Vector3(x, y, z);
  const side = x < 0 ? 6 : 10;
  const torsoY = y;
  const torso = (() => {
    // 直立躯干按连续的髋—脊—胸—颈高度插值，不在弯折轴线的 Voronoi 边界换骨。
    const chain = [1, 2, 3, 4, 5];
    let a = 1,
      b = 2,
      t = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      a = chain[i];
      b = chain[i + 1];
      t = smooth(points[a].y, points[b].y, torsoY);
      if (torsoY <= points[b].y) break;
    }
    return { a, b, t };
  })();
  // 面部、下颌与额眼属于同一头骨；不能只转头顶而把嘴留在胸骨上。
  const face =
    smooth(0.1, 0.205, y) *
    (1 - smooth(-0.1, 0.035, z)) *
    (1 - smooth(0.1, 0.25, Math.abs(x)));
  const headBlend = face;
  const torsoInfluences = [
    [torso.a, (1 - torso.t) * (1 - headBlend)],
    [torso.b, torso.t * (1 - headBlend)],
    [5, headBlend],
  ];
  const writeWeights = (influences) => {
    const merged = new Map();
    for (const [id, weight] of influences)
      merged.set(id, (merged.get(id) || 0) + weight);
    const ranked = [...merged].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = ranked.reduce((n, entry) => n + entry[1], 0);
    for (let i = 0; i < 4; i++) {
      ids[offset + i] = ranked[i]?.[0] || 0;
      weights[offset + i] = ranked[i] ? ranked[i][1] / sum : 0;
    }
  };
  // 实际三角网的测地归属防止拇指、腹部与膝盖因空间相邻而串骨。
  const armBlend = ownership[vertexIndex] / 65535;
  if (armBlend > 0) {
    const upperDirection = points[side + 1]
      .clone()
      .sub(points[side])
      .normalize();
    const lowerDirection = points[side + 2]
      .clone()
      .sub(points[side + 1])
      .normalize();
    const hingePlane = upperDirection.add(lowerDirection).normalize();
    const elbowBlend = smooth(
      -0.1,
      0.1,
      point
        .clone()
        .sub(points[side + 1])
        .dot(hingePlane),
    );
    const wristBlend = Math.max(
      smooth(0.1, 0.2, -z),
      smooth(
        -0.075,
        0.055,
        point
          .clone()
          .sub(points[side + 2])
          .dot(lowerDirection),
      ),
    );
    // 臂根的基底也必须沿真实腰胸分段混合；极小臂权不能把腹部突然提到胸骨。
    writeWeights([
      ...torsoInfluences.map(([id, weight]) => [id, (1 - armBlend) * weight]),
      [side, armBlend * (1 - elbowBlend)],
      [side + 1, armBlend * elbowBlend * (1 - wristBlend)],
      [side + 2, armBlend * elbowBlend * wristBlend],
    ]);
    return;
  }
  if (y < -0.3) {
    // 下半身和脚承重固定，不能通过整只巨人平移来制造呼吸或出手机会。
    ids[offset] = 1;
    weights[offset] = 1;
    return;
  }
  writeWeights(torsoInfluences);
}

function polyphemusAsset() {
  if (shared) return shared;
  const geometry = decodeOrganicMesh(data, bindAnatomy, (x, y, z, color) =>
    color.set(0x8c7560),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0,
    vertexColors: true,
  });
  material.name = "polyphemus_hf_original_scarred_skin";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: new URL(
          "./assets/models/polyphemus_hf_color.webp",
          import.meta.url,
        ),
        colorSpace: T.SRGBColorSpace,
        apply(texture) {
          material.map = texture;
          material.vertexColors = false;
          material.needsUpdate = true;
        },
      },
    ],
    (ready) => {
      material.userData.texturesReady = ready;
    },
  );
  shared = { geometry, material, prepare };
  return shared;
}

/** 完整独眼巨人：-Z 朝前、Y 为身高，固定双脚和骨盆，独立肩肘腕完成抬石投掷。 */
export function buildPolyphemusHF(root, motions) {
  root.userData.aquaticUpright = true;
  root.userData.aquaticPitchLimit = 0;
  root.userData.aquaticTurnRate = 0.45;
  const body = new T.Group();
  body.name = "polyphemus_complete_grounded_body";
  root.add(body);
  const bones = definitions.map(({ name, point }) => {
    const bone = new T.Bone();
    bone.name = `polyphemus_${name}`;
    bone.position.fromArray(point);
    return bone;
  });
  definitions.forEach(({ parent }, i) => {
    if (parent < 0) body.add(bones[i]);
    else {
      bones[i].position.sub(points[parent]);
      bones[parent].add(bones[i]);
    }
  });
  const asset = polyphemusAsset();
  const mesh = bindOrganicBody(
    body,
    "polyphemus_hf_one_eye_whole_body",
    asset.geometry,
    asset.material,
    bones,
    0.7,
  );
  const parts = new Map();
  const p = mesh.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    // 按实体解剖截面分块，膝间和手臂下方不会成为隐形实心盒。
    const name =
      y < -0.22
        ? `leg_${x < 0 ? "r" : "l"}_${Math.floor((y + 0.5) / 0.075)}`
        : Math.abs(x) > 0.25 && y < 0.25
          ? `arm_${x < 0 ? "r" : "l"}_${Math.floor((z + 0.42) / 0.09)}`
          : `trunk_${Math.floor((y + 0.22) / 0.085)}`;
    if (!parts.has(name)) parts.set(name, []);
    parts.get(name).push(i);
  }
  mesh.userData.lordCoreParts = [...parts.values()].filter(
    (ids) => ids.length > 24,
  );
  prepareLordSkinChunks(mesh);
  const anchor = (name, point, boneIndex) => {
    const a = new T.Object3D();
    a.name = `polyphemus_actual_${name}`;
    a.position.fromArray(point).sub(points[boneIndex]);
    bones[boneIndex].add(a);
    return a;
  };
  const mouth = anchor("mouth", data.rig.anchors.mouth, 5);
  const eye = anchor("single_eye", data.rig.anchors.eye, 5);
  const rightPalm = anchor("right_palm", data.rig.anchors.rightPalm, 9);
  const leftPalm = anchor("left_palm", data.rig.anchors.leftPalm, 13);
  const rock = new T.Object3D();
  rock.name = "polyphemus_separate_boulder_grip";
  // 岩石中心位于真实手掌外侧，岩石几何由战斗效果独立持有，不能和皮肤合并。
  rock.position.set(0, 0, -0.045);
  rightPalm.add(rock);
  root.userData.mouthAnchors = [mouth];
  root.userData.combatAnchor = mouth;
  root.userData.eyeAnchor = eye;
  root.userData.palmAnchors = [rightPalm, leftPalm];
  root.userData.rightPalmAnchor = rightPalm;
  root.userData.throwAnchor = rock;
  root.userData.throwReleaseProgress = data.rig.throwReleaseProgress;
  root.userData.getThrowAnchorWorldPosition = (target = new T.Vector3()) =>
    rock.getWorldPosition(target);
  root.userData.getHeadWorldPositions = () => [
    mouth.getWorldPosition(new T.Vector3()),
  ];
  root.userData.normalizedLength = 1;
  root.userData.normalizedHeight = 1;
  root.userData.lengthAxis = "y";
  root.userData.odysseyAnatomy = "polyphemus";
  root.userData.artRevision = "polyphemus_hf_motion_v2";
  root.userData.anatomy = {
    singleEye: true,
    continuousBody: true,
    arms: 2,
    legs: 2,
    plantedLowerBody: true,
  };
  root.userData.guideRadius = 0.9;
  root.userData.prepareMaterials = asset.prepare;
  root.userData.hfRig = { asset, mesh, bones, body, definitions };
  root.userData.poseBones = Object.fromEntries(
    definitions.map((b, i) => [b.name, bones[i]]),
  );
  let combat = { phase: "dormant", ability: "", progress: 0 },
    disposed = false;
  const worldTarget = new T.Vector3(),
    localTarget = new T.Vector3();
  let hasTarget = false;
  root.userData.setPolyphemusTarget = (point) => {
    hasTarget = Boolean(
      point && [point.x, point.y, point.z].every(Number.isFinite),
    );
    if (hasTarget) worldTarget.copy(point);
  };
  root.userData.setPolyphemusCombat = (state = {}) => {
    combat = {
      phase: state.phase || "dormant",
      ability: state.ability || "",
      progress: T.MathUtils.clamp(state.progress || 0, 0, 1),
    };
  };
  root.userData.setBossPhase = (
    phase,
    abilityOrProgress,
    progressOrAbility,
  ) => {
    const progress =
      typeof abilityOrProgress === "number"
        ? abilityOrProgress
        : progressOrAbility;
    const ability =
      typeof abilityOrProgress === "string"
        ? abilityOrProgress
        : progressOrAbility;
    if (phase !== combat.phase) combat.progress = 0;
    combat.phase = phase;
    if (typeof ability === "string") combat.ability = ability;
    if (typeof progress === "number")
      combat.progress = T.MathUtils.clamp(progress, 0, 1);
  };
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const upper = new T.Vector3(),
    lower = new T.Vector3(),
    direction = new T.Vector3(),
    pole = new T.Vector3();
  const elbow = new T.Vector3(),
    target = new T.Vector3(),
    wristTarget = new T.Vector3();
  const upperQ = new T.Quaternion(),
    lowerQ = new T.Quaternion(),
    inverse = new T.Quaternion();
  const aimArm = (start, palmTarget) => {
    const shoulderPoint = points[start],
      elbowPoint = points[start + 1],
      wristPoint = points[start + 2];
    const restUpper = elbowPoint.clone().sub(shoulderPoint),
      restLower = wristPoint.clone().sub(elbowPoint);
    const u = restUpper.length(),
      l = restLower.length();
    // 目标在胸骨支撑坐标中，肩随胸廓呼吸，肘向身体外侧弯曲。
    wristTarget
      .copy(palmTarget)
      .sub(
        new T.Vector3(
          ...data.rig.anchors[start === 6 ? "rightPalm" : "leftPalm"],
        ).sub(wristPoint),
      );
    direction.copy(wristTarget).sub(shoulderPoint);
    const distance = T.MathUtils.clamp(
      direction.length(),
      Math.abs(u - l) + 0.001,
      (u + l) * 0.975,
    );
    direction.normalize();
    pole.set(start === 6 ? -1 : 1, 0.12, 0.16);
    pole.addScaledVector(direction, -pole.dot(direction)).normalize();
    const along = (u * u - l * l + distance * distance) / (2 * distance);
    const lift = Math.sqrt(Math.max(0, u * u - along * along));
    elbow
      .copy(shoulderPoint)
      .addScaledVector(direction, along)
      .addScaledVector(pole, lift);
    target.copy(shoulderPoint).addScaledVector(direction, distance);
    upper.copy(elbow).sub(shoulderPoint).normalize();
    lower.copy(target).sub(elbow).normalize();
    const makeFrame = (u, v, z) => {
      const x = u.clone().cross(v).normalize();
      const y = z.clone().cross(x).normalize();
      return new T.Quaternion().setFromRotationMatrix(
        new T.Matrix4().makeBasis(x, y, z),
      );
    };
    restUpper.normalize();
    restLower.normalize();
    upperQ
      .copy(makeFrame(upper, lower, upper))
      .multiply(makeFrame(restUpper, restLower, restUpper).invert());
    lowerQ
      .copy(makeFrame(upper, lower, lower))
      .multiply(makeFrame(restUpper, restLower, restLower).invert());
    bones[start].quaternion.copy(upperQ);
    bones[start + 1].quaternion
      .copy(inverse.copy(upperQ).invert())
      .multiply(lowerQ);
    bones[start + 2].quaternion.identity();
  };
  void asset.prepare();
  const neutral = new T.Quaternion();
  const profile = new Float64Array(15),
    previousProfile = new Float64Array(15),
    cancellation = new Float64Array(15);
  let previousTime = null,
    previousPhase = "dormant",
    cancellationRemaining = 0;
  let gazeYaw = 0,
    gazePitch = 0;
  const naturalTransition = (from, to) =>
    from === to ||
    (["dormant", "hunt", "return"].includes(from) &&
      ["dormant", "hunt", "return", "windup"].includes(to)) ||
    (from === "windup" && to === "attack") ||
    (from === "attack" && to === "recover") ||
    (from === "recover" &&
      ["hunt", "dormant", "return", "windup"].includes(to));
  motions.push((time) => {
    if (disposed || !Number.isFinite(time)) return;
    const reset = previousTime !== null && time < previousTime;
    const dt =
      previousTime === null || reset
        ? 1 / 60
        : T.MathUtils.clamp(time - previousTime, 0, 0.12);
    if (reset) {
      gazeYaw = gazePitch = cancellationRemaining = 0;
      previousProfile.fill(0);
      previousPhase = "dormant";
    }
    const phase = combat.phase;
    motionProfile(phase, combat.progress, profile);
    if (
      previousTime !== null &&
      !naturalTransition(previousPhase, phase) &&
      !reset
    ) {
      cancellation.set(previousProfile);
      cancellationRemaining = 0.45;
    }
    if (cancellationRemaining > 0) {
      cancellationRemaining = Math.max(0, cancellationRemaining - dt);
      const blend = smooth(0, 0.45, 0.45 - cancellationRemaining);
      for (let i = 0; i < profile.length; i++)
        profile[i] = T.MathUtils.lerp(cancellation[i], profile[i], blend);
    }
    previousTime = time;
    previousPhase = phase;
    previousProfile.set(profile);
    // 骨盆与所有腿骨都不动；重量变化通过髋以上的扭转、肩部和另一只手传达。
    const breathing = Math.sin(time * 1.1) * 0.008;
    const twist = profile[6],
      lean = profile[7],
      roll = profile[8];
    bones[2].rotation.set(breathing + lean * 0.4, twist * 0.4, roll * 0.45);
    bones[3].rotation.set(
      -breathing * 0.35 + lean * 0.6,
      twist * 0.6,
      roll * 0.55,
    );
    let desiredYaw = Math.sin(time * 0.35) * 0.025,
      desiredPitch = Math.sin(time * 0.8) * 0.006;
    if (hasTarget && ["hunt", "windup", "attack", "recover"].includes(phase)) {
      root.updateWorldMatrix(true, false);
      localTarget.copy(worldTarget);
      root.worldToLocal(localTarget);
      localTarget.sub(new T.Vector3(...data.rig.anchors.eye));
      desiredYaw = T.MathUtils.clamp(
        Math.atan2(-localTarget.x, -localTarget.z),
        -0.22,
        0.22,
      );
      desiredPitch = T.MathUtils.clamp(
        Math.atan2(localTarget.y, Math.hypot(localTarget.x, localTarget.z)),
        -0.14,
        0.14,
      );
    }
    const focus = 1 - Math.exp(-dt * (phase === "windup" ? 5 : 3));
    gazeYaw = T.MathUtils.lerp(gazeYaw, desiredYaw, focus);
    gazePitch = T.MathUtils.lerp(gazePitch, desiredPitch, focus);
    bones[4].rotation.set(
      gazePitch * 0.3 - lean * 0.3,
      gazeYaw * 0.26 - twist * 0.42,
      -roll * 0.25,
    );
    bones[5].rotation.set(
      gazePitch * 0.7 - lean * 0.45,
      gazeYaw * 0.74 - twist * 0.48,
      -roll * 0.45,
    );
    target.set(profile[0], profile[1], profile[2]);
    aimArm(6, target);
    for (const index of [6, 7, 8])
      bones[index].quaternion.slerp(neutral, 1 - profile[13]);
    bones[8].rotation.x += profile[9];
    bones[8].rotation.z += profile[10];
    // 非投掷手只在原始肩肘轴上小幅配重；镜像手不复用右臂的肘极点解。
    const leftWeight = profile[14];
    bones[10].rotation.set(
      -(profile[5] + 0.163) * 0.6 * leftWeight,
      0,
      -(profile[3] - 0.425) * 0.9 * leftWeight,
    );
    bones[11].rotation.set(
      (profile[4] + 0.05) * 0.7 * leftWeight,
      (profile[3] - 0.425) * 0.5 * leftWeight,
      0,
    );
    bones[12].rotation.set(profile[11], 0, profile[12]);
    mesh.boundingBox = null;
  });
}
