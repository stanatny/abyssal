import { createPlayerMotion, addFeedingMouth } from "./player_motion.js";
import { SHOAL_CREATURE_KINDS, buildShoalCreature } from "./creature_shoal.js";
import {
  HUNTER_CREATURE_KINDS,
  buildHunterCreature,
} from "./creature_hunters.js";
import * as THREE from "three";
import { LORD_CREATURE_KINDS, buildLordCreature } from "./creature_lords.js";
import {
  ANCIENT_CREATURE_KINDS,
  buildAncientCreature,
} from "./creature_ancient.js";
import {
  bindAxialMotion,
  skinMaterial,
  sculptedFin,
} from "./creature_surface.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildExtraCreature, EXTRA_CREATURE_KINDS } from "./creature_extra.js";
import {
  buildEcosystemCreature,
  ECOSYSTEM_CREATURE_KINDS,
} from "./creature_ecosystem.js";

/**
 * 创建原创程序化海洋生物，所有模型朝向 -Z，Y 轴向上。
 * @param {string} kind 生物名称，包含虎鲸、鱼群、深海巨兽及海鸥等模型。
 * @param {number} length 包括尾鳍的近似全长，单位与场景一致。
 * @param {number} seed 外观与动作的确定性种子。
 * @returns {THREE.Group} 根节点；userData.animate(time, speed, motionState?) 用于更新游泳动作。
 */
export function createCreature(kind, length = 6, seed = 1) {
  const root = new THREE.Group();
  root.name = `creature_${kind}`;
  const random = seededRandom(seed);
  const phase = random() * Math.PI * 2;
  const motions = [];
  const playerMotion = ["orca", "squid"].includes(kind)
    ? createPlayerMotion(kind, phase)
    : null;
  if (playerMotion) {
    root.userData.motionState = playerMotion.state;
    root.userData.pose = {};
    root.userData.triggerFeed = playerMotion.feed;
    root.userData.resetMotion = () => {
      const state = playerMotion.reset();
      for (const motion of motions) motion(state.phase, state.effort, state);
    };
  }
  let previousTime;
  let swimTime = phase;

  if (SHOAL_CREATURE_KINDS.has(kind)) buildShoalCreature(kind, root, motions);
  else if (HUNTER_CREATURE_KINDS.has(kind))
    buildHunterCreature(kind, root, motions);
  else if (LORD_CREATURE_KINDS.has(kind))
    buildLordCreature(kind, root, motions);
  else if (ANCIENT_CREATURE_KINDS.has(kind))
    buildAncientCreature(kind, root, motions);
  else if (ECOSYSTEM_CREATURE_KINDS.has(kind))
    buildEcosystemCreature(kind, root, motions);
  else if (kind === "orca") buildOrca(root, motions);
  else if (kind === "shark") buildShark(root, motions);
  else if (kind === "leviathan") buildLeviathan(root, motions);
  else if (EXTRA_CREATURE_KINDS.has(kind))
    buildExtraCreature(kind, root, motions);
  else if (kind === "ray") buildRay(root, motions);
  else if (kind === "angler") buildAngler(root, motions);
  else if (kind === "tuna") buildTuna(root, motions);
  else buildFish(root, motions, random);

  mergeStaticParts(root, kind);
  root.scale.setScalar(length);
  root.userData.kind = kind;
  root.userData.length = length;
  root.userData.animate = (time, speed = 1, motionState) => {
    const effort = THREE.MathUtils.clamp(Math.abs(speed), 0.15, 3);
    if (playerMotion) {
      const state = playerMotion.update(time, effort, motionState);
      for (const motion of motions) motion(state.phase, state.effort, state);
      return;
    }
    // 累积动作相位，冲刺切换和远距离休眠恢复时不会突然跳帧。
    const delta =
      previousTime === undefined
        ? 0
        : THREE.MathUtils.clamp(time - previousTime, 0, 0.12);
    previousTime = time;
    swimTime += delta * (1.7 + effort * 1.1);
    for (const motion of motions) motion(swimTime, effort);
  };
  return root;
}

const MATERIALS = {
  orca: material("#0d1c24", 0.34),
  white: material("#e2f1e7", 0.4),
  body: material("#ffffff", 0.4, { vertexColors: true }),
  eye: material("#03080b", 0.12),
  mouth: material("#08151c", 0.7),
  gum: material("#291523", 0.55),
  tooth: material("#cfd8c2", 0.45),
  shark: material("#36505c", 0.42),
  ray: material("#1d3448", 0.5),
  fin: material("#4c8b9b", 0.45),
  finlet: material("#d9b24c", 0.5),
  angler: material("#394b55", 0.67),
  kraken: material("#401f4b", 0.48),
  suckers: material("#b575ae", 0.55),
  leviathan: material("#12242f", 0.44),
  armor: material("#33505e", 0.55),
  bone: material("#cfc9a8", 0.5),
  glowCore: material("#eafef8", 0.25, {
    emissive: "#c8fff0",
    emissiveIntensity: 3.2,
  }),
  aqua: material("#73e6e0", 0.3, {
    emissive: "#25deca",
    emissiveIntensity: 2.4,
  }),
  amber: material("#ffb850", 0.3, {
    emissive: "#ff721e",
    emissiveIntensity: 2.2,
  }),
  violet: material("#be9cea", 0.35, {
    emissive: "#964eed",
    emissiveIntensity: 1.3,
  }),
};

// 虎鲸黑白分区在片元中求值，近景不会露出低分辨率顶点色的锯齿边。
const ORCA_SKIN = skinMaterial({
  color: "#ffffff",
  roughness: 0.4,
  pattern: 0.006,
});
const compileOrcaSkin = ORCA_SKIN.onBeforeCompile;
ORCA_SKIN.onBeforeCompile = (shader) => {
  compileOrcaSkin(shader);
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <color_fragment>",
    `#include <color_fragment>
    float chin = 1.0 - smoothstep(-0.405, -0.32, vSkinPosition.z);
    float flank = exp(-pow((vSkinPosition.z - 0.255) / 0.074, 2.0));
    float border = -0.065 + chin * 0.050 + flank * 0.047;
    float belly = 1.0 - smoothstep(border - 0.002, border + 0.002, vSkinPosition.y);
    diffuseColor.rgb = mix(vec3(0.003,0.009,0.014), vec3(0.79,0.86,0.8), belly);
    float saddle = exp(-pow((vSkinPosition.z-0.18)/0.038,2.0)) * smoothstep(0.035,0.08,vSkinPosition.y);
    diffuseColor.rgb = mix(diffuseColor.rgb,vec3(0.13,0.18,0.20),saddle*0.52);
  `,
  );
};
ORCA_SKIN.customProgramCacheKey = () => "orca_skin_v6";

const SPHERE = new THREE.SphereGeometry(1, 14, 10);
const SMALL_SPHERE = new THREE.SphereGeometry(1, 8, 6);
const GEOMETRY_CACHE = new Map();
const SADDLE = new THREE.Color("#6d828a");

// 每个截面依次为 Z、横向半径、竖向半径、竖向偏移。
const ORCA_PROFILE = [
  [-0.478, 0.014, 0.02, -0.012],
  [-0.463, 0.043, 0.043, -0.011],
  [-0.442, 0.072, 0.064, -0.003],
  [-0.4, 0.098, 0.101, 0.004],
  [-0.32, 0.133, 0.135, 0.01],
  [-0.2, 0.153, 0.151, 0.006],
  [-0.04, 0.151, 0.148, 0],
  [0.1, 0.127, 0.129, -0.004],
  [0.22, 0.085, 0.091, -0.01],
  [0.32, 0.05, 0.06, -0.014],
  [0.4, 0.022, 0.03, -0.016],
  [0.435, 0.005, 0.011, -0.016],
];

const SHARK_PROFILE = [
  [-0.48, 0.004, 0.007, -0.003],
  [-0.44, 0.031, 0.033, -0.002],
  [-0.36, 0.076, 0.083, 0.002],
  [-0.24, 0.116, 0.123, 0.004],
  [-0.06, 0.133, 0.133, 0.002],
  [0.1, 0.109, 0.111, 0],
  [0.24, 0.061, 0.065, 0],
  [0.35, 0.025, 0.031, 0.002],
  [0.41, 0.008, 0.013, 0.004],
];

const LEVIATHAN_PROFILE = [
  [-0.485, 0.006, 0.01, -0.002],
  [-0.45, 0.048, 0.056, 0],
  [-0.37, 0.099, 0.109, 0.004],
  [-0.24, 0.139, 0.143, 0.006],
  [-0.05, 0.143, 0.139, 0.002],
  [0.13, 0.113, 0.109, -0.002],
  [0.27, 0.063, 0.061, -0.002],
  [0.37, 0.027, 0.031, 0],
  [0.425, 0.009, 0.013, 0.002],
];

function orcaColors(z, y, shade, upper, lower) {
  // 下颌白区、胸腹白区向后沿体侧上卷，是虎鲸最易辨认的体色特征。
  let threshold;
  if (z < -0.34) threshold = -0.05;
  else if (z < -0.05) threshold = -0.4;
  else if (z < 0.16) threshold = -0.36;
  else if (z < 0.34) threshold = -0.36 + ((z - 0.16) / 0.18) * 0.52;
  else threshold = -0.55;
  shade
    .copy(upper)
    .lerp(
      lower,
      1 - THREE.MathUtils.smoothstep(y, threshold - 0.09, threshold + 0.09),
    );
  if (z > 0.135 && z < 0.24 && y > 0.28) {
    const saddle =
      Math.sin(((z - 0.135) / 0.105) * Math.PI) *
      0.5 *
      THREE.MathUtils.smoothstep(y, 0.28, 0.55);
    shade.lerp(SADDLE, saddle);
  }
}

function orcaSection(z, theta) {
  const s = Math.abs(Math.sin(theta));
  const keel =
    THREE.MathUtils.smoothstep(z, 0.22, 0.32) *
    (1 - THREE.MathUtils.smoothstep(z, 0.38, 0.44)) *
    THREE.MathUtils.smoothstep(s, 0.68, 0.95) *
    0.22;
  return [1, 1 + keel];
}

function buildOrca(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  const torso = mesh(
    inner,
    cached("orca_body", () =>
      bodyGeometry(ORCA_PROFILE, "#0a181f", "#e6f2ea", {
        rings: 54,
        sides: 34,
        colorFn: orcaColors,
        sectionFn: orcaSection,
      }),
    ),
    ORCA_SKIN,
  );
  const body = bindAxialMotion(torso, [], { axis: "x" });
  const [, peduncle, tailJoint] = body.skeleton.bones;
  addFeedingMouth(root, inner, [0, -0.052, -0.43]);

  // 眼斑贴合体表，向后上方倾斜拉长。
  for (const side of [-1, 1]) {
    mesh(
      inner,
      cached(`orca_patch_${side}`, () =>
        surfacePatch(ORCA_PROFILE, -0.305, 0.052, 0.052, 0.026, side, -0.42),
      ),
      MATERIALS.white,
    );
    ellipsoid(
      inner,
      MATERIALS.eye,
      [side * 0.114, 0.014, -0.364],
      [0.006, 0.0065, 0.008],
    );
    ellipsoid(
      inner,
      MATERIALS.white,
      [side * 0.118, 0.016, -0.367],
      [0.0014, 0.0014, 0.002],
    );
    mesh(
      inner,
      tube(
        [
          [side * 0.018, -0.052, -0.455],
          [side * 0.062, -0.072, -0.415],
          [side * 0.089, -0.08, -0.352],
          [side * 0.094, -0.072, -0.3],
        ],
        0.0026,
      ),
      MATERIALS.mouth,
    );
    // 宽大桨状胸鳍，游动时轻缓划水，冲刺时向后收拢。
    const flipper = new THREE.Group();
    flipper.position.set(side * 0.095, -0.055, -0.185);
    inner.add(flipper);
    mesh(
      flipper,
      cached(`orca_flipper_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [0.0, 0.02],
              [-0.05, 0.055],
              [-0.06, 0.13],
              [-0.02, 0.21],
              [0.04, 0.225],
              [0.075, 0.155],
              [0.06, 0.06],
            ],
            side,
          ),
          0.016,
          "horizontal",
          { bevel: 0.007 },
        ),
      ),
      MATERIALS.orca,
    );
    flipper.name = `orca_flipper_${side}`;
    motions.push((t, effort, state) => {
      const folded = Math.max(state.boost, state.airborne);
      flipper.rotation.z =
        -side *
          (0.3 - folded * 0.12 + Math.sin(t - 0.8) * 0.065 * (1 - folded)) +
        state.turn * 0.26;
      flipper.rotation.x = Math.sin(t - 0.7) * 0.055 + state.pitchInput * 0.16;
      flipper.rotation.y = -side * (0.08 + folded * 0.53);
    });
  }
  // 呼吸孔嵌在头顶，黑白体色之外保留近景解剖尺度。
  ellipsoid(inner, MATERIALS.mouth, [0, 0.145, -0.225], [0.013, 0.0025, 0.009]);
  // 高大镰刀形背鳍，从正后方也能立刻认出虎鲸。
  mesh(
    inner,
    cached("orca_dorsal", () =>
      finSolid(
        [
          [-0.115, 0.12],
          [-0.055, 0.235],
          [0.01, 0.345],
          [0.055, 0.415],
          [0.088, 0.4],
          [0.108, 0.3],
          [0.135, 0.175],
          [0.125, 0.124],
        ],
        0.016,
        "vertical",
        { bevel: 0.006 },
      ),
    ),
    MATERIALS.orca,
  );

  const tail = new THREE.Group();
  tail.name = "orca_flukes";
  tail.position.set(0, -0.016, 0.15);
  tailJoint.add(tail);
  mesh(
    tail,
    cached("orca_flukes", () =>
      finSolid(
        // 前后缘保持正的弦长，避免旧轮廓在两侧中段交叉成薄线。
        [
          [0.0, 0.0],
          [0.012, 0.075],
          [0.043, 0.16],
          [0.095, 0.235],
          [0.142, 0.265],
          [0.148, 0.225],
          [0.132, 0.16],
          [0.105, 0.075],
          [0.06, 0.018],
          [0.048, 0.0],
          [0.06, -0.018],
          [0.105, -0.075],
          [0.132, -0.16],
          [0.148, -0.225],
          [0.142, -0.265],
          [0.095, -0.235],
          [0.043, -0.16],
          [0.012, -0.075],
        ],
        0.013,
        "horizontal",
        { bevel: 0.005 },
      ),
    ),
    MATERIALS.orca,
  );
  motions.push((t, effort, state) => {
    // 尾柄由近端到远端传递推进波，尾鳍接在同一骨骼上，避免与躯干脱节。
    const amplitude =
      (0.13 + state.power * 0.13 + state.boost * 0.04) *
      (1 - state.airborne * 0.85);
    peduncle.rotation.x = Math.sin(t) * amplitude * 0.48;
    tailJoint.rotation.x = Math.sin(t - 0.62) * amplitude;
    tailJoint.rotation.y = -state.turn * 0.08;
    tail.rotation.x = Math.sin(t - 1.25) * amplitude * 1.15;
    tail.rotation.y = -state.turn * 0.045;
    inner.rotation.x = -state.boost * 0.018;
    inner.rotation.z = -state.turn * 0.16;
    Object.assign(root.userData.pose, {
      tailBeat: tailJoint.rotation.x,
      flukePitch: tail.rotation.x,
      bank: inner.rotation.z,
      folded: state.boost,
    });
  });
}

function countershaded(threshold, softness = 0.12) {
  return (z, y, shade, upper, lower) => {
    shade
      .copy(upper)
      .lerp(
        lower,
        1 -
          THREE.MathUtils.smoothstep(
            y,
            threshold - softness,
            threshold + softness,
          ),
      );
  };
}

function buildShark(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  const torso = mesh(
    inner,
    cached("shark_body", () =>
      bodyGeometry(SHARK_PROFILE, "#3e5765", "#e0e8e0", {
        colorFn: countershaded(-0.12),
        sectionFn: (z, theta) => [1, Math.sin(theta) < 0 ? 0.94 : 1],
      }),
    ),
    MATERIALS.body,
  );
  bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 1.3,
    amplitude: 0.06,
  });
  for (const side of [-1, 1]) {
    ellipsoid(
      inner,
      MATERIALS.eye,
      [side * 0.086, 0.026, -0.355],
      [0.0135, 0.0135, 0.016],
    );
    ellipsoid(
      inner,
      MATERIALS.white,
      [side * 0.09, 0.031, -0.36],
      [0.0035, 0.0035, 0.004],
    );
    // 鳃裂上端短、下端向嘴后弯，宽度小于体长千分之二。
    for (let index = 0; index < 5; index++) {
      const z = -0.278 + index * 0.018;
      const reach = 1 - index * 0.07;
      const points = [0.48, 0.27, -0.04, -0.4].map((y, i) => {
        const at = z + [-0.003, 0, 0.004, 0.011][i];
        const [width, height, offset] = sampleProfile(SHARK_PROFILE, at);
        const yy = y * reach;
        return [
          side * (width * Math.sqrt(1 - yy * yy) + 0.00025),
          height * yy + offset,
          at,
        ];
      });
      mesh(
        inner,
        cached(`shark_gill_${side}_${index}`, () => tube(points, 0.00085)),
        MATERIALS.mouth,
      );
    }
    ellipsoid(
      inner,
      MATERIALS.mouth,
      [side * 0.016, -0.022, -0.448],
      [0.003, 0.002, 0.004],
    );
    const pectoral = new THREE.Group();
    pectoral.position.set(side * 0.07, -0.055, -0.1);
    inner.add(pectoral);
    mesh(
      pectoral,
      cached(`shark_pectoral_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.155, 0.085],
              [-0.075, 0.19],
              [0.065, 0.305],
              [0.085, 0.283],
              [0.02, 0.16],
              [0.0, 0.09],
            ],
            side,
          ),
          0.01,
          "horizontal",
          { bevel: 0.004 },
        ),
      ),
      MATERIALS.shark,
    );
    motions.push((t, effort) => {
      pectoral.rotation.z =
        -side * (0.16 + Math.sin(t * 1.3 + 1.4) * 0.04 * (2 - effort));
      pectoral.rotation.y =
        side * THREE.MathUtils.smoothstep(effort, 1.4, 2.6) * 0.15;
    });
    mesh(
      inner,
      cached(`shark_pelvic_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [0.16, 0.02],
              [0.205, 0.075],
              [0.255, 0.02],
            ],
            side,
          ),
          0.005,
          "horizontal",
          { bevel: 0.002 },
        ),
      ),
      MATERIALS.shark,
    ).position.set(side * 0.03, -0.085, 0.0);
  }
  mesh(
    inner,
    cached("shark_dorsal", () =>
      finSolid(
        [
          [-0.1, 0.118],
          [-0.03, 0.235],
          [0.035, 0.295],
          [0.068, 0.268],
          [0.05, 0.19],
          [0.1, 0.124],
        ],
        0.013,
        "vertical",
        { bevel: 0.005 },
      ),
    ),
    MATERIALS.shark,
  );
  mesh(
    inner,
    cached("shark_dorsal2", () =>
      finSolid(
        [
          [0.245, 0.052],
          [0.27, 0.1],
          [0.298, 0.05],
        ],
        0.005,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    MATERIALS.shark,
  );
  mesh(
    inner,
    cached("shark_anal", () =>
      finSolid(
        [
          [0.27, -0.048],
          [0.31, -0.1],
          [0.335, -0.042],
        ],
        0.004,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    MATERIALS.shark,
  );

  // 完整的吻下口裂向两侧嘴角后延，齿列收在唇内而非独立挂在鼻尖。
  const jawArc = [];
  for (let i = 0; i <= 24; i++) {
    const angle = -Math.PI / 2 + (i / 24) * Math.PI;
    const z = -0.421 + Math.abs(Math.sin(angle)) * 0.102;
    const [width, height, offset] = sampleProfile(SHARK_PROFILE, z);
    const y = -0.995 + Math.abs(Math.sin(angle)) * 0.62;
    const x = Math.sign(angle) * width * Math.sqrt(1 - y * y);
    jawArc.push([x, height * y + offset - 0.001, z]);
  }
  mesh(
    inner,
    cached("shark_mouth", () => tube(jawArc, 0.0018)),
    MATERIALS.mouth,
  );
  const lowerLip = jawArc.map(([x, y, z]) => [x * 0.997, y - 0.003, z + 0.001]);
  mesh(
    inner,
    cached("shark_lower_lip", () => tube(lowerLip, 0.0014)),
    MATERIALS.white,
  );

  const tail = new THREE.Group();
  tail.position.set(0, 0.004, 0.385);
  inner.add(tail);
  mesh(
    tail,
    cached("shark_tail", () =>
      finSolid(
        [
          [-0.02, -0.03],
          [0.01, 0.05],
          [0.075, 0.155],
          [0.115, 0.205],
          [0.126, 0.184],
          [0.065, 0.03],
          [0.055, -0.01],
          [0.095, -0.085],
          [0.106, -0.1],
          [0.06, -0.045],
        ],
        0.009,
        "vertical",
        { bevel: 0.003 },
      ),
    ),
    MATERIALS.shark,
  );
  for (const side of [-1, 1]) {
    mesh(
      tail,
      cached(`shark_keel_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.045, 0.028],
              [-0.015, 0.058],
              [0.015, 0.03],
            ],
            side,
          ),
          0.004,
          "horizontal",
          { bevel: 0.0015 },
        ),
      ),
      MATERIALS.shark,
    );
  }
  motions.push((t, effort) => {
    const beat = t * 1.3;
    // 鲨鱼尾鳍左右侧摆，身体小幅反向扭动。
    tail.rotation.y = Math.sin(beat) * (0.16 + effort * 0.05);
    inner.rotation.y = -Math.sin(beat) * 0.028;
    inner.rotation.z = Math.sin(t * 0.5) * 0.03;
    inner.position.y = Math.sin(beat - 0.9) * 0.004;
  });
}

function buildLeviathan(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  mesh(
    inner,
    cached("leviathan_body", () =>
      bodyGeometry(LEVIATHAN_PROFILE, "#16303a", "#4a656e", {
        rings: 50,
        sides: 32,
        colorFn: countershaded(-0.28, 0.16),
      }),
    ),
    MATERIALS.body,
  );
  // 锯齿状连体脊冠而非散乱骨板，与大白鲨的三角背鳍形成剪影差异。
  mesh(
    inner,
    cached("leviathan_ridge", () => {
      const outline = [[-0.18, 0.125]];
      for (let index = 0; index < 7; index++) {
        const z = -0.16 + index * 0.088;
        const height = 0.115 - index * 0.011;
        const [, y] = sampleProfile(LEVIATHAN_PROFILE, z);
        outline.push([z + 0.02, y + height * 0.38]);
        outline.push([z + 0.05, y + height]);
        outline.push([z + 0.088, y + height * 0.38]);
      }
      outline.push([0.44, 0.02]);
      return finSolid(outline, 0.02, "vertical", {
        smooth: false,
        bevel: 0.004,
      });
    }),
    MATERIALS.armor,
  );
  for (let index = 0; index < 4; index++) {
    const z = -0.08 + index * 0.13;
    const [, y] = sampleProfile(LEVIATHAN_PROFILE, z + 0.05);
    ellipsoid(
      inner,
      MATERIALS.aqua,
      [0, y + 0.04 - index * 0.007, z + 0.05],
      [0.007, 0.009, 0.012],
    );
  }
  for (const side of [-1, 1]) {
    // 头部装甲眉脊与发光双目。
    const brow = ellipsoid(
      inner,
      MATERIALS.armor,
      [side * 0.075, 0.085, -0.35],
      [0.075, 0.045, 0.1],
    );
    brow.rotation.x = -0.15;
    brow.rotation.z = side * 0.12;
    ellipsoid(
      inner,
      MATERIALS.eye,
      [side * 0.093, 0.03, -0.36],
      [0.017, 0.019, 0.021],
    );
    ellipsoid(
      inner,
      MATERIALS.amber,
      [side * 0.099, 0.031, -0.366],
      [0.009, 0.011, 0.012],
    );
    // 上下两对触须向后飘摆，是冲锋巨兽的标志轮廓。
    mesh(
      inner,
      cached(`leviathan_whisker_low_${side}`, () =>
        taperedTube(
          curveFrom([
            [side * 0.05, -0.012, -0.44],
            [side * 0.13, -0.032, -0.36],
            [side * 0.2, -0.058, -0.2],
          ]),
          0.009,
          0.002,
        ),
      ),
      MATERIALS.armor,
    );
    mesh(
      inner,
      cached(`leviathan_whisker_up_${side}`, () =>
        taperedTube(
          curveFrom([
            [side * 0.07, 0.05, -0.4],
            [side * 0.16, 0.09, -0.3],
            [side * 0.22, 0.125, -0.12],
          ]),
          0.008,
          0.0015,
        ),
      ),
      MATERIALS.armor,
    );
    // 体侧发光侧线与光点。
    mesh(
      inner,
      cached(`leviathan_glowline_${side}`, () =>
        tube(
          [
            [side * 0.1, 0.02, -0.28],
            [side * 0.126, 0.012, -0.05],
            [side * 0.1, 0.01, 0.18],
            [side * 0.05, 0.008, 0.36],
          ],
          0.0035,
        ),
      ),
      MATERIALS.aqua,
    );
    const fin = new THREE.Group();
    fin.position.set(side * 0.08, -0.05, -0.1);
    inner.add(fin);
    mesh(
      fin,
      cached(`leviathan_fin_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.14, 0.06],
              [-0.02, 0.22],
              [0.16, 0.335],
              [0.18, 0.305],
              [0.02, 0.14],
            ],
            side,
          ),
          0.011,
          "horizontal",
          { bevel: 0.004 },
        ),
      ),
      MATERIALS.leviathan,
    );
    motions.push((t, effort) => {
      fin.rotation.z =
        -side * (0.2 + Math.sin(t * 0.9 + 1) * 0.035 * (2 - effort));
      fin.rotation.y =
        side * THREE.MathUtils.smoothstep(effort, 1.3, 2.4) * 0.3;
    });
  }
  mesh(
    inner,
    cached("leviathan_mouth", () =>
      tube(
        [
          [-0.075, -0.052, -0.41],
          [0, -0.078, -0.395],
          [0.075, -0.052, -0.41],
        ],
        0.005,
      ),
    ),
    MATERIALS.gum,
  );
  const fangs = [];
  for (let index = -3; index <= 3; index++) {
    if (index === 0) continue;
    const x = index * 0.019;
    const long = Math.abs(index) % 2 === 1;
    fangs.push(
      coneGeometry(
        [x, -0.062, -0.406],
        [x * 0.3, -1, 0.12],
        0.005,
        long ? 0.03 : 0.018,
      ),
    );
  }
  mesh(
    inner,
    cached("leviathan_fangs", () => mergeAndDispose(fangs)),
    MATERIALS.bone,
  );

  const tail = new THREE.Group();
  tail.position.set(0, 0.002, 0.4);
  inner.add(tail);
  mesh(
    tail,
    cached("leviathan_tail", () =>
      finSolid(
        [
          [-0.015, 0],
          [0.03, 0.09],
          [0.1, 0.2],
          [0.116, 0.184],
          [0.055, 0.02],
          [0.045, 0],
          [0.055, -0.02],
          [0.116, -0.184],
          [0.1, -0.2],
          [0.03, -0.09],
        ],
        0.01,
        "vertical",
        { bevel: 0.003 },
      ),
    ),
    MATERIALS.leviathan,
  );
  motions.push((t, effort) => {
    const sprint = THREE.MathUtils.smoothstep(effort, 1.2, 2.2);
    const beat = t * 0.95;
    // 冲锋姿态：高速时收鳍低头，尾鳍大幅强力侧摆。
    tail.rotation.y = Math.sin(beat) * (0.13 + effort * 0.05);
    inner.rotation.y = -Math.sin(beat) * 0.022;
    inner.rotation.x = -sprint * 0.055 + Math.sin(beat - 0.7) * 0.012;
    inner.rotation.z = Math.sin(t * 0.4) * 0.02 * (1 - sprint * 0.6);
  });
}

const FISH_PALETTES = [
  ["#208ca9", "#b3e2d5"],
  ["#e9a048", "#f8e2a8"],
  ["#648fc5", "#d1d6f1"],
  ["#b95178", "#e8b8a4"],
  ["#64b2a2", "#d2e9b9"],
];

function buildFish(root, motions, random) {
  const colorId = Math.floor(random() * FISH_PALETTES.length);
  const profile = [
    [-0.44, 0.006, 0.012, 0],
    [-0.36, 0.036, 0.078, 0],
    [-0.2, 0.053, 0.136, 0],
    [-0.02, 0.049, 0.146, 0],
    [0.14, 0.035, 0.106, 0],
    [0.28, 0.014, 0.042, 0],
    [0.345, 0.004, 0.015, 0],
  ];
  const inner = new THREE.Group();
  root.add(inner);
  mesh(
    inner,
    cached(`fish_body_${colorId}`, () =>
      bodyGeometry(profile, ...FISH_PALETTES[colorId], {
        rings: 26,
        sides: 20,
        colorFn: countershaded(-0.3, 0.18),
      }),
    ),
    MATERIALS.body,
  );
  mesh(
    inner,
    cached("fish_fins", () => {
      const fins = [
        finSolid(
          [
            [-0.2, 0.135],
            [-0.1, 0.228],
            [0.02, 0.148],
          ],
          0.004,
          "vertical",
          { bevel: 0.0015 },
        ),
        finSolid(
          [
            [0.08, -0.115],
            [0.16, -0.188],
            [0.22, -0.09],
          ],
          0.003,
          "vertical",
          { bevel: 0.0012 },
        ),
      ];
      for (const side of [-1, 1]) {
        fins.push(
          placeGeometry(
            finSolid(
              mirrorOutline(
                [
                  [-0.13, 0.045],
                  [-0.05, 0.1],
                  [-0.02, 0.05],
                ],
                side,
              ),
              0.0025,
              "horizontal",
              { bevel: 0.001 },
            ),
            [side * 0.028, -0.045, -0.06],
            [0.2, 0, -side * 0.5],
          ),
        );
      }
      return mergeAndDispose(fins);
    }),
    MATERIALS.fin,
  );
  mesh(
    inner,
    cached("fish_eyes", () => {
      const eyes = [];
      for (const side of [-1, 1]) {
        const geometry = SMALL_SPHERE.clone();
        geometry.scale(0.014, 0.017, 0.017);
        geometry.translate(side * 0.042, 0.03, -0.325);
        eyes.push(geometry);
      }
      return mergeAndDispose(eyes);
    }),
    MATERIALS.eye,
  );
  const tail = new THREE.Group();
  tail.position.z = 0.3;
  inner.add(tail);
  mesh(
    tail,
    cached("fish_tail", () =>
      finSolid(
        [
          [0, 0],
          [0.035, 0.05],
          [0.1, 0.12],
          [0.09, 0.1],
          [0.05, 0.015],
          [0.05, -0.015],
          [0.09, -0.1],
          [0.1, -0.12],
          [0.035, -0.05],
        ],
        0.0035,
        "vertical",
        { bevel: 0.0012 },
      ),
    ),
    MATERIALS.fin,
  );
  motions.push((t, effort) => {
    const beat = t * 2.05;
    tail.rotation.y = Math.sin(beat) * (0.24 + effort * 0.07);
    inner.rotation.y = Math.sin(beat - 0.5) * 0.045;
    inner.rotation.z = Math.sin(t * 0.7) * 0.05;
  });
}

function buildTuna(root, motions) {
  const profile = [
    [-0.46, 0.004, 0.008, 0],
    [-0.4, 0.038, 0.056, 0],
    [-0.28, 0.083, 0.119, 0],
    [-0.08, 0.097, 0.133, 0],
    [0.1, 0.079, 0.111, 0],
    [0.24, 0.041, 0.059, 0],
    [0.34, 0.015, 0.025, 0],
    [0.385, 0.005, 0.01, 0],
  ];
  const inner = new THREE.Group();
  root.add(inner);
  const torso = mesh(
    inner,
    cached("tuna_body", () =>
      bodyGeometry(profile, "#1d3d5c", "#d2dad6", {
        colorFn: countershaded(-0.32),
        sectionFn: (z, theta) => [1, Math.sin(theta) < 0 ? 0.95 : 1],
      }),
    ),
    MATERIALS.body,
  );
  bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 2.3,
    amplitude: 0.035,
  });
  // 尾柄前后一排金黄小鳍（finlet），金枪鱼的科属标志。
  mesh(
    inner,
    cached("tuna_finlets", () => {
      const finlets = [];
      for (let index = 0; index < 6; index++) {
        const z = 0.15 + index * 0.032;
        const [, top] = sampleProfile(profile, z);
        finlets.push(
          placeGeometry(
            finSolid(
              [
                [-0.012, 0],
                [0.0, 0.026],
                [0.014, 0],
              ],
              0.004,
              "vertical",
              { smooth: false, bevel: 0.001 },
            ),
            [0, top - 0.002, z],
          ),
        );
      }
      for (let index = 0; index < 5; index++) {
        const z = 0.17 + index * 0.034;
        const [, top] = sampleProfile(profile, z);
        finlets.push(
          placeGeometry(
            finSolid(
              [
                [-0.012, 0],
                [0.0, 0.023],
                [0.014, 0],
              ],
              0.004,
              "vertical",
              { smooth: false, bevel: 0.001 },
            ),
            [0, -(top * 0.95 - 0.002), z],
            [Math.PI, 0, 0],
          ),
        );
      }
      return mergeAndDispose(finlets);
    }),
    MATERIALS.finlet,
  );
  mesh(
    inner,
    cached("tuna_dorsal", () =>
      finSolid(
        [
          [-0.22, 0.115],
          [-0.12, 0.21],
          [-0.05, 0.215],
          [-0.02, 0.13],
        ],
        0.006,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    MATERIALS.shark,
  );
  mesh(
    inner,
    cached("tuna_dorsal2", () =>
      finSolid(
        [
          [0.08, 0.1],
          [0.12, 0.145],
          [0.16, 0.095],
        ],
        0.005,
        "vertical",
        { bevel: 0.0015 },
      ),
    ),
    MATERIALS.shark,
  );
  for (const side of [-1, 1]) {
    mesh(
      inner,
      cached(`tuna_pectoral_${side}`, () =>
        placeGeometry(
          finSolid(
            mirrorOutline(
              [
                [-0.16, 0.05],
                [-0.06, 0.14],
                [0.06, 0.155],
                [0.02, 0.06],
              ],
              side,
            ),
            0.005,
            "horizontal",
            { bevel: 0.002 },
          ),
          [side * 0.055, -0.045, -0.08],
          [0.15, 0, -side * 0.35],
        ),
      ),
      MATERIALS.shark,
    );
    ellipsoid(
      inner,
      MATERIALS.eye,
      [side * 0.062, 0.028, -0.35],
      [0.012, 0.013, 0.014],
    );
  }
  const tail = new THREE.Group();
  tail.position.z = 0.36;
  inner.add(tail);
  mesh(
    tail,
    cached("tuna_tail", () =>
      finSolid(
        [
          [-0.015, 0],
          [0.03, 0.075],
          [0.1, 0.165],
          [0.112, 0.15],
          [0.05, 0.015],
          [0.05, -0.015],
          [0.112, -0.15],
          [0.1, -0.165],
          [0.03, -0.075],
        ],
        0.006,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    MATERIALS.shark,
  );
  motions.push((t, effort) => {
    const beat = t * 2.3;
    // 金枪鱼刚体快摆，只尾柄以后大幅运动。
    tail.rotation.y = Math.sin(beat) * (0.19 + effort * 0.06);
    inner.rotation.y = Math.sin(beat - 0.4) * 0.018;
    inner.position.y = Math.sin(beat - 1) * 0.003;
  });
}

function buildRay(root, motions) {
  const inner = new THREE.Group();
  root.add(inner);
  const profile = [
    [-0.46, 0.012, 0.014, 0],
    [-0.38, 0.075, 0.028, 0],
    [-0.15, 0.115, 0.045, 0],
    [0.08, 0.095, 0.038, 0],
    [0.26, 0.045, 0.02, 0],
    [0.34, 0.01, 0.01, 0],
  ];
  mesh(
    inner,
    cached("ray_body", () =>
      bodyGeometry(profile, "#1c3242", "#b9ccc8", {
        rings: 36,
        sides: 24,
        colorFn: countershaded(-0.05, 0.35),
      }),
    ),
    MATERIALS.body,
  );
  for (const side of [-1, 1]) {
    // 头鳍（头鳍是蝠鲼的标志性卷须）。
    mesh(
      inner,
      cached(`ray_cephalic_${side}`, () =>
        taperedTube(
          curveFrom([
            [side * 0.045, -0.01, -0.4],
            [side * 0.052, -0.016, -0.5],
            [side * 0.04, -0.004, -0.555],
          ]),
          0.012,
          0.004,
        ),
      ),
      MATERIALS.ray,
    );
    ellipsoid(
      inner,
      MATERIALS.eye,
      [side * 0.085, 0.026, -0.3],
      [0.011, 0.009, 0.013],
    );
    // 双翼分内外两段，外段滞后内段，模拟行波式扇动。
    const wing = new THREE.Group();
    wing.position.set(side * 0.09, 0.004, 0);
    inner.add(wing);
    mesh(
      wing,
      cached(`ray_wing_inner_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.455, -0.04],
              [-0.34, 0.11],
              [-0.16, 0.19],
              [0.1, 0.19],
              [0.24, 0.03],
              [0.02, -0.04],
            ],
            side,
          ),
          0.019,
          "horizontal",
          { bevel: 0.009 },
        ),
      ),
      MATERIALS.ray,
    );
    const tip = new THREE.Group();
    tip.position.set(side * 0.19, 0, 0);
    wing.add(tip);
    mesh(
      tip,
      cached(`ray_wing_outer_${side}`, () =>
        finSolid(
          mirrorOutline(
            [
              [-0.16, 0.0],
              [-0.06, 0.16],
              [0.03, 0.27],
              [0.055, 0.26],
              [0.1, 0.16],
              [0.16, 0.02],
              [0.1, 0.0],
            ],
            side,
          ),
          0.011,
          "horizontal",
          { bevel: 0.005 },
        ),
      ),
      MATERIALS.ray,
    );
    motions.push((t, effort) => {
      const flap = 1 + effort * 0.35;
      wing.rotation.z = side * Math.sin(t * 1.05) * 0.13 * flap + side * 0.02;
      tip.rotation.z = side * Math.sin(t * 1.05 - 0.85) * 0.17 * flap;
    });
  }
  mesh(
    inner,
    cached("ray_tail", () =>
      taperedTube(
        curveFrom([
          [0, 0, 0.3],
          [0, 0.004, 0.52],
          [0.012, 0.008, 0.62],
        ]),
        0.01,
        0.0018,
      ),
    ),
    MATERIALS.ray,
  );
  motions.push((t) => {
    inner.position.y = Math.sin(t * 1.05 - 1.2) * 0.008;
    inner.rotation.x = Math.sin(t * 1.05 - 0.9) * 0.03;
    inner.rotation.z = Math.sin(t * 0.3) * 0.06;
  });
}

function buildAngler(root, motions) {
  const profile = [
    [-0.42, 0.1, 0.11, 0.01],
    [-0.36, 0.17, 0.2, 0.02],
    [-0.18, 0.21, 0.235, 0.03],
    [0.02, 0.16, 0.17, 0.02],
    [0.16, 0.09, 0.095, 0.01],
    [0.3, 0.035, 0.045, 0],
    [0.36, 0.01, 0.018, 0],
  ];
  const inner = new THREE.Group();
  root.add(inner);
  mesh(
    inner,
    cached("angler_body", () =>
      bodyGeometry(profile, "#263d49", "#5d6f6e", {
        colorFn: countershaded(-0.35, 0.2),
        sectionFn: (z, theta) => {
          const headness = 1 - THREE.MathUtils.smoothstep(z, -0.1, 0.15);
          const s = Math.sin(theta);
          return [1, s < 0 ? 1 + headness * 0.28 : 1 - headness * 0.12];
        },
      }),
    ),
    MATERIALS.body,
  );
  // 巨大的斜口与参差不齐的针齿。
  const mouthDisc = ellipsoid(
    inner,
    MATERIALS.gum,
    [0, -0.008, -0.4],
    [0.125, 0.135, 0.032],
  );
  mouthDisc.rotation.x = -0.1;
  const teeth = [];
  const lengths = [
    0.075, 0.042, 0.084, 0.036, 0.068, 0.05, 0.08, 0.038, 0.07, 0.045, 0.065,
  ];
  for (let index = 0; index < 11; index++) {
    const angle = -1.15 + (index / 10) * 2.3;
    const x = Math.sin(angle) * 0.112;
    const y = Math.cos(angle) * 0.122 - 0.015;
    teeth.push(
      coneGeometry(
        [x, y - 0.012, -0.416],
        [x * 0.25, -1, 0.3],
        0.004,
        lengths[index],
      ),
    );
  }
  mesh(
    inner,
    cached("angler_teeth_up", () => mergeAndDispose(teeth)),
    MATERIALS.tooth,
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.115, -0.3);
  inner.add(jaw);
  ellipsoid(jaw, MATERIALS.angler, [0, -0.005, -0.09], [0.1, 0.035, 0.11]);
  const jawTeeth = [];
  for (let index = 0; index < 9; index++) {
    const angle = -1.05 + (index / 8) * 2.1;
    const x = Math.sin(angle) * 0.1;
    jawTeeth.push(
      coneGeometry(
        [x, 0.008, -0.105 - Math.cos(angle) * 0.02],
        [x * 0.25, 1, 0.25],
        0.0034,
        0.04 + (index % 3) * 0.016,
      ),
    );
  }
  mesh(
    jaw,
    cached("angler_teeth_low", () => mergeAndDispose(jawTeeth)),
    MATERIALS.tooth,
  );
  motions.push((t, effort) => {
    jaw.rotation.x = 0.05 + Math.sin(t * 0.5) * 0.05 + effort * 0.035;
  });
  for (const side of [-1, 1]) {
    ellipsoid(
      inner,
      MATERIALS.eye,
      [side * 0.115, 0.085, -0.315],
      [0.02, 0.02, 0.017],
    );
    ellipsoid(
      inner,
      MATERIALS.aqua,
      [side * 0.121, 0.088, -0.319],
      [0.009, 0.009, 0.008],
    );
    mesh(
      inner,
      cached(`angler_pectoral_${side}`, () =>
        placeGeometry(
          finSolid(
            mirrorOutline(
              [
                [-0.06, 0.02],
                [-0.03, 0.1],
                [0.05, 0.115],
                [0.07, 0.03],
              ],
              side,
            ),
            0.007,
            "horizontal",
            { bevel: 0.003 },
          ),
          [side * 0.155, -0.05, -0.06],
          [0.25, 0, -side * 0.45],
        ),
      ),
      MATERIALS.angler,
    );
  }
  mesh(
    inner,
    cached("angler_ridge", () =>
      finSolid(
        [
          [-0.05, 0.19],
          [0.0, 0.235],
          [0.05, 0.185],
          [0.1, 0.215],
          [0.15, 0.16],
          [0.2, 0.175],
          [0.24, 0.12],
        ],
        0.008,
        "vertical",
        { smooth: false, bevel: 0.003 },
      ),
    ),
    MATERIALS.angler,
  );
  // 钓竿与发光饵：双层光球加缓速摆动，黑暗水域中远远可读。
  const rod = new THREE.Group();
  rod.position.set(0, 0.19, -0.26);
  inner.add(rod);
  mesh(
    rod,
    cached("angler_rod", () =>
      taperedTube(
        curveFrom([
          [0, 0, 0],
          [0, 0.13, -0.03],
          [0, 0.21, -0.14],
          [0, 0.155, -0.26],
        ]),
        0.005,
        0.0025,
      ),
    ),
    MATERIALS.angler,
  );
  const lure = ellipsoid(
    rod,
    MATERIALS.aqua,
    [0, 0.15, -0.26],
    [0.03, 0.034, 0.03],
  );
  const core = ellipsoid(
    rod,
    MATERIALS.glowCore,
    [0, 0.15, -0.26],
    [0.015, 0.017, 0.015],
  );
  const tail = new THREE.Group();
  tail.position.z = 0.33;
  inner.add(tail);
  mesh(
    tail,
    cached("angler_tail", () =>
      finSolid(
        [
          [0, -0.09],
          [0.02, -0.13],
          [0.1, -0.12],
          [0.13, -0.06],
          [0.135, 0],
          [0.13, 0.06],
          [0.1, 0.12],
          [0.02, 0.13],
          [0, 0.09],
        ],
        0.006,
        "vertical",
        { bevel: 0.002 },
      ),
    ),
    MATERIALS.angler,
  );
  motions.push((t, effort) => {
    tail.rotation.y = Math.sin(t * 1.1) * (0.18 + effort * 0.05);
    rod.rotation.x = Math.sin(t * 0.6) * 0.08;
    rod.rotation.z = Math.sin(t * 0.45) * 0.06;
    const pulse = 1 + Math.sin(t * 1.8) * 0.1 + Math.sin(t * 3.1) * 0.05;
    lure.scale.set(0.03, 0.034, 0.03).multiplyScalar(pulse);
    core.scale.set(0.015, 0.017, 0.015).multiplyScalar(pulse);
    inner.rotation.y = Math.sin(t * 1.1 - 0.4) * 0.03;
  });
}

function material(color, roughness, options = {}) {
  return skinMaterial({
    color,
    roughness,
    metalness: 0.015,
    ...options,
  });
}

function mesh(parent, geometry, mat) {
  const object = new THREE.Mesh(geometry, mat);
  parent.add(object);
  return object;
}

function ellipsoid(parent, mat, position, scale) {
  const object = mesh(parent, SPHERE, mat);
  object.position.set(...position);
  object.scale.set(...scale);
  return object;
}

function cached(key, create) {
  if (!GEOMETRY_CACHE.has(key)) GEOMETRY_CACHE.set(key, create());
  return GEOMETRY_CACHE.get(key);
}

function seededRandom(seed) {
  let state = (Number(seed) || 1) >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sampleProfile(profile, z) {
  let index = 0;
  while (index < profile.length - 2 && z > profile[index + 1][0]) index++;
  const p1 = profile[index];
  const p2 = profile[index + 1];
  const p0 = profile[Math.max(0, index - 1)];
  const p3 = profile[Math.min(profile.length - 1, index + 2)];
  const t = THREE.MathUtils.clamp((z - p1[0]) / (p2[0] - p1[0]), 0, 1);
  return [1, 2, 3].map((dimension) => {
    const v0 = (p2[dimension] - p0[dimension]) * 0.5;
    const v1 = (p3[dimension] - p1[dimension]) * 0.5;
    const value =
      (2 * p1[dimension] - 2 * p2[dimension] + v0 + v1) * t ** 3 +
      (-3 * p1[dimension] + 3 * p2[dimension] - 2 * v0 - v1) * t ** 2 +
      v0 * t +
      p1[dimension];
    return dimension === 3 ? value : Math.max(0.0005, value);
  });
}

function curveFrom(points) {
  return new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
  );
}

// 平滑重采样封闭轮廓，供挤出成带倒角的实体鳍。

function mirrorOutline(outline, side) {
  if (side > 0) return outline;
  return outline.map((point) => [point[0], -point[1]]).reverse();
}

// 把二维轮廓挤出成有厚度、边缘圆润的实体鳍；vertical 立于中纵面，horizontal 平铺。
function finSolid(outline, thickness, orientation, options = {}) {
  return sculptedFin(outline, thickness, orientation, options);
}

function placeGeometry(geometry, position, rotation = [0, 0, 0]) {
  const clone = geometry.clone();
  const object = new THREE.Object3D();
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.updateMatrix();
  clone.applyMatrix4(object.matrix);
  geometry.dispose();
  return clone;
}

function bodyGeometry(profile, upperColor, lowerColor, options = {}) {
  const { rings = 44, sides = 30, colorFn = null, sectionFn = null } = options;
  const positions = [];
  const colors = [];
  const indices = [];
  const upper = new THREE.Color(upperColor);
  const lower = new THREE.Color(lowerColor);
  const shade = new THREE.Color();
  for (let ring = 0; ring <= rings; ring++) {
    const z = THREE.MathUtils.lerp(
      profile[0][0],
      profile.at(-1)[0],
      ring / rings,
    );
    const [width, height, offset] = sampleProfile(profile, z);
    for (let side = 0; side <= sides; side++) {
      const theta = (side / sides) * Math.PI * 2;
      const y = Math.sin(theta);
      let scaleX = 1,
        scaleY = 1;
      if (sectionFn) [scaleX, scaleY] = sectionFn(z, theta);
      positions.push(
        Math.cos(theta) * width * scaleX,
        y * height * scaleY + offset,
        z,
      );
      if (colorFn) colorFn(z, y, shade, upper, lower);
      else {
        const blend = THREE.MathUtils.smoothstep(-y, 0.05, 0.65);
        shade.copy(upper).lerp(lower, blend);
      }
      colors.push(shade.r, shade.g, shade.b);
      if (ring < rings && side < sides) {
        const a = ring * (sides + 1) + side;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
  // 封闭吻端与尾柄端面，避免前侧三分之四视角直接看进躯干。
  for (const end of [0, 1]) {
    const center = positions.length / 3,
      section = profile[end ? profile.length - 1 : 0];
    positions.push(0, section[3] || 0, section[0] + (end ? 0.001 : -0.002));
    shade.copy(upper);
    colors.push(shade.r, shade.g, shade.b);
    const base = end ? rings * (sides + 1) : 0;
    for (let side = 0; side < sides; side++) {
      if (end) indices.push(center, base + side, base + side + 1);
      else indices.push(center, base + side + 1, base + side);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function surfacePatch(
  profile,
  centerZ,
  centerY,
  radiusZ,
  radiusY,
  side,
  tilt = 0,
) {
  const positions = [];
  const indices = [];
  const rings = 6;
  const segments = 28;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  for (let ring = 0; ring <= rings; ring++) {
    for (let segment = 0; segment <= segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      const distance = ring / rings;
      const ellipseZ = Math.cos(angle) * radiusZ * distance;
      const ellipseY = Math.sin(angle) * radiusY * distance;
      const z = centerZ + ellipseZ * cosT - ellipseY * sinT;
      const y = centerY + ellipseZ * sinT + ellipseY * cosT;
      const [width, height, offset] = sampleProfile(profile, z);
      const x =
        width * Math.sqrt(Math.max(0, 1 - ((y - offset) / height) ** 2)) +
        0.001;
      positions.push(side * x, y, z);
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        if (side > 0) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function tube(points, radius) {
  const curve = curveFrom(points);
  return new THREE.TubeGeometry(curve, points.length * 5, radius, 6, false);
}

function taperedTube(curve, startRadius, endRadius) {
  const geometry = new THREE.TubeGeometry(curve, 36, 1, 8, false);
  const positions = geometry.attributes.position;
  for (let ring = 0; ring <= 36; ring++) {
    const center = curve.getPointAt(ring / 36);
    const radius = THREE.MathUtils.lerp(startRadius, endRadius, ring / 36);
    for (let side = 0; side <= 8; side++) {
      const index = ring * 9 + side;
      positions.setXYZ(
        index,
        center.x + (positions.getX(index) - center.x) * radius,
        center.y + (positions.getY(index) - center.y) * radius,
        center.z + (positions.getZ(index) - center.z) * radius,
      );
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

function coneGeometry(position, direction, radius, length) {
  const geometry = new THREE.ConeGeometry(radius, length, 5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(...direction).normalize(),
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(...position);
  return geometry.toNonIndexed();
}

function mergeAndDispose(geometries) {
  const merged = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();
  return merged;
}

// 只合并局部静态部件，尾鳍、胸鳍和触腕所在的动画组仍独立保留。
function mergeStaticParts(parent, kind, path = "root") {
  const batches = new Map();
  parent.children.forEach((child, index) => {
    if (child.isGroup) mergeStaticParts(child, kind, `${path}_${index}`);
    if (!child.isMesh || child.userData.keepSeparate) return;
    const key = child.material.uuid;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(child);
  });
  for (const [materialId, parts] of batches) {
    if (parts.length < 2) continue;
    const geometry = cached(`merged_${kind}_${path}_${materialId}`, () => {
      const transformed = parts.map((part) => {
        part.updateMatrix();
        const clone = part.geometry.index
          ? part.geometry.toNonIndexed()
          : part.geometry.clone();
        clone.applyMatrix4(part.matrix);
        // 所有生物均为程序化纯色材质，无需保留未使用的纹理坐标。
        clone.deleteAttribute("uv");
        return clone;
      });
      return mergeAndDispose(transformed);
    });
    mesh(parent, geometry, parts[0].material);
    for (const part of parts) parent.remove(part);
  }
}
