import * as THREE from "three";
import { atlantisSmallAsset } from "./atlantis_small_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const ATLANTIS_HF_SMALL = new Set([
  "spadefish",
  "seahorse",
  "cuttlefish",
  "pearl_nautilus",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const v = new THREE.Vector3();
/** 按相邻站位连续插值，不按网格顶点编号分割；UV 接缝两边权重一致。 */
function stripWeights(chain, value, axis, blend, ids, w, o) {
  let i = 0;
  while (i < chain.points.length - 2 && value > chain.points[i + 1][axis]) i++;
  const t = THREE.MathUtils.clamp(
    (value - chain.points[i][axis]) /
      (chain.points[i + 1][axis] - chain.points[i][axis]),
    0,
    1,
  );
  ids[o] = 0;
  w[o] = 1 - blend;
  ids[o + 1] = chain.ids[i];
  w[o + 1] = blend * (1 - t);
  ids[o + 2] = chain.ids[i + 1];
  w[o + 2] = blend * t;
}
/** 四种不同解剖各用独立驱动：尾鳍、小鳍、裙鳍及壳口软触须。只影响显示。 */
export function buildAtlantisSmallHF(kind, root, motions) {
  if (!ATLANTIS_HF_SMALL.has(kind))
    throw Error("Unknown Atlantis small HF creature");
  const base = new THREE.Bone();
  base.name = `${kind}_root`;
  root.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, hierarchy = false, extra = {}) => {
    const c = { name, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = `${kind}_${name}_${i}`;
      b.position.fromArray(p);
      let parent = base;
      if (hierarchy && i) {
        parent = bones[c.ids[i - 1]];
        b.position.sub(new THREE.Vector3(...points[i - 1]));
      }
      parent.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  let tail,
    dorsal,
    pecs = [],
    medianFins = [],
    skirts = [],
    arms;
  if (kind === "spadefish") {
    tail = add(
      "tail",
      [
        [0, 0, 0],
        [0, 0, 0.14],
        [0, 0, 0.26],
        [0, 0, 0.34],
      ],
      true,
    );
    for (const s of [-1, 1])
      pecs.push(
        add("pectoral_" + s, [[s * 0.065, -0.035, -0.24]], false, { side: s }),
      );
    for (const side of [-1, 1])
      medianFins.push(
        add(
          side > 0 ? "soft_dorsal" : "soft_anal",
          [[0, side * 0.16, 0]],
          false,
          { side },
        ),
      );
  } else if (kind === "seahorse") {
    tail = add(
      "prehensile_tail",
      [
        [0, -0.14, 0.15],
        [0, -0.28, 0.2],
        [0, -0.41, 0.12],
        [0, -0.4, -0.045],
      ],
      true,
    );
    dorsal = add(
      "dorsal",
      [-0.1, -0.04, 0.02, 0.08, 0.14].map((y) => [0, y, 0.19]),
    );
    for (const s of [-1, 1])
      pecs.push(
        add("pectoral_" + s, [[s * 0.067, 0.29, 0.02]], false, { side: s }),
      );
  } else if (kind === "cuttlefish") {
    for (const s of [-1, 1])
      skirts.push(
        add(
          "skirt_" + s,
          [
            [-0.19, 0.17],
            [-0.08, 0.22],
            [0.04, 0.245],
            [0.16, 0.23],
            [0.28, 0.19],
            [0.41, 0.11],
            [0.48, 0.035],
          ].map(([z, x]) => [s * x, -0.025, z]),
          false,
          { side: s },
        ),
      );
    arms = add(
      "arm_crown",
      [-0.16, -0.055, 0.055, 0.16].map((x) => [x, 0.025, -0.3]),
    );
  } else {
    arms = add(
      "cirri",
      [-0.18, -0.06, 0.06, 0.18].map((x) => [x, -0.07, -0.21]),
    );
  }
  const asset = atlantisSmallAsset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    v.set(x, y, z);
    if (kind === "spadefish") {
      // 深而扁的躯干保持稳定；推进弯曲集中在后躯和尾柄。
      chainWeights(tail, v, smooth(0, 0.2, z), ids, w, o);
      const softFin =
        smooth(0.15, 0.27, Math.abs(y)) *
        smooth(-0.07, 0.08, z) *
        (1 - smooth(0.26, 0.3, z));
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - softFin;
      ids[o + 3] = medianFins[y < 0 ? 0 : 1].ids[0];
      w[o + 3] = softFin;
      const fan = smooth(0.3, 0.36, z);
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
      // 尾扇与上下软鳍区域不重叠，整片尾扇使用同一末端支撑。
      if (fan > 0) {
        ids[o + 3] = tail.ids.at(-1);
        w[o + 3] = fan;
      }
      const f = pecs[x < 0 ? 0 : 1],
        blend =
          smooth(0.07, 0.125, Math.abs(x)) *
          smooth(-0.31, -0.27, z) *
          (1 - smooth(-0.055, -0.015, z)) *
          smooth(-0.15, -0.095, y) *
          (1 - smooth(0.005, 0.055, y));
      if (blend > 0) {
        for (let j = 0; j < 4; j++) w[o + j] *= 1 - blend;
        ids[o + 3] = f.ids[0];
        w[o + 3] += blend;
      }
    } else if (kind === "seahorse") {
      chainWeights(tail, v, 1 - smooth(-0.25, -0.12, y), ids, w, o);
      const fin =
        smooth(0.195, 0.235, z) *
        smooth(-0.16, -0.1, y) *
        (1 - smooth(0.15, 0.19, y));
      if (fin > 0) stripWeights(dorsal, y, 1, fin, ids, w, o);
      const pec =
        smooth(0.075, 0.12, Math.abs(x)) *
        smooth(0.19, 0.25, y) *
        (1 - smooth(0.34, 0.39, y)) *
        smooth(-0.09, -0.045, z) *
        (1 - smooth(0.08, 0.14, z));
      if (pec > 0) {
        for (let j = 0; j < 4; j++) w[o + j] *= 1 - pec;
        ids[o + 3] = pecs[x < 0 ? 0 : 1].ids[0];
        w[o + 3] += pec;
      }
    } else if (kind === "cuttlefish") {
      const c = skirts[x < 0 ? 0 : 1];
      let i = 0;
      while (i < c.points.length - 2 && z > c.points[i + 1][2]) i++;
      const t = THREE.MathUtils.clamp(
          (z - c.points[i][2]) / (c.points[i + 1][2] - c.points[i][2]),
          0,
          1,
        ),
        edge = Math.abs(
          THREE.MathUtils.lerp(c.points[i][0], c.points[i + 1][0], t),
        );
      const fin =
        smooth(edge - 0.015, edge + 0.065, Math.abs(x)) *
        smooth(-0.24, -0.18, z) *
        (1 - smooth(0.04, 0.11, y));
      if (fin > 0) stripWeights(c, z, 2, fin, ids, w, o);
      const arm = 1 - smooth(-0.39, -0.295, z);
      if (arm > 0) stripWeights(arms, x, 0, arm, ids, w, o);
    } else {
      const arm = 1 - smooth(-0.32, -0.19, z);
      if (arm > 0) stripWeights(arms, x, 0, arm, ids, w, o);
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.16,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.normalizedLength = 1;
  if (kind !== "pearl_nautilus") root.userData.atlantisAnatomy = kind;
  if (kind === "seahorse" || kind === "pearl_nautilus")
    root.userData.aquaticUpright = true;
  root.userData.artRevision = "trellis_atlantis_small_20261021";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const e = effort(phase, speed),
      drive = 0.7 + smooth(0.3, 3, e) * 0.3;
    if (kind === "spadefish") {
      // 使用既有连续相位，快游加快尾拍而不额外转动整条鱼。
      const beat = phase * 2.6;
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(beat - i * 0.55) * [0.008, 0.025, 0.055, 0.13][i] * drive;
      });
      medianFins.forEach((c) => {
        bones[c.ids[0]].rotation.z =
          -c.side * Math.sin(beat - 0.75) * 0.07 * drive;
      });
      pecs.forEach((c) => {
        bones[c.ids[0]].rotation.y =
          c.side *
          (-0.025 + Math.sin(beat * 0.7 + c.side * 0.15) * 0.17 * drive);
        bones[c.ids[0]].rotation.z =
          c.side * Math.sin(beat * 0.7 - 0.4) * 0.015;
      });
    } else if (kind === "seahorse") {
      tail.ids.forEach((id, i) => {
        bones[id].rotation.x = Math.sin(phase * 0.33 - i * 0.5) * 0.018;
        bones[id].rotation.z = Math.sin(phase * 0.25 - i * 0.45) * 0.012;
      });
      dorsal.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y = Math.sin(phase * 4 - i * 0.8) * 0.34 * drive),
      );
      pecs.forEach((c) => {
        bones[c.ids[0]].rotation.y =
          c.side * Math.sin(phase * 3.1 + c.side * 0.2) * 0.28 * drive;
      });
    } else if (kind === "cuttlefish") {
      skirts.forEach((c) =>
        c.ids.forEach(
          (id, i) =>
            (bones[id].rotation.z =
              c.side * Math.sin(phase * 1.4 - i * 0.9) * 0.28 * drive),
        ),
      );
      arms.ids.forEach((id, i) => {
        bones[id].rotation.x = Math.sin(phase * 0.7 - i * 0.5) * 0.065;
        bones[id].rotation.y = Math.sin(phase * 0.6 - i * 0.7) * 0.045;
      });
    } else {
      arms.ids.forEach((id, i) => {
        bones[id].rotation.x = Math.sin(phase * 0.65 - i * 0.7) * 0.075;
        bones[id].rotation.y = Math.sin(phase * 0.7 - i * 0.8) * 0.07;
      });
    }
  });
}
