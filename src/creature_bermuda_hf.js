import * as THREE from "three";
import { bermudaFishAsset } from "./bermuda_fish_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";

export const BERMUDA_HF_FISH = new Set([
  "queen_angelfish",
  "triggerfish",
  "needlefish",
  "barracuda",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
// 站位从归一化后的实际表面取样；鱼鳍不使用通用鱼体的固定转轴。
const ANATOMY = {
  queen_angelfish: {
    tail: [0.23, 0.29, 0.35, 0.4],
    tailBlend: [0.21, 0.35],
    fan: [0.35, 0.41],
    pec: [0.086, -0.075, -0.29],
    pecEdge: [0.09, 0.145],
    pecSpan: [-0.33, -0.27, -0.105, -0.07],
    pecY: [-0.17, -0.1, 0.11, 0.15],
    median: [0.16, -0.17, 0.06],
    medianSpan: [-0.12, 0, 0.5, 0.55],
    medianEdge: [0.11, 0.17],
  },
  triggerfish: {
    tail: [0.08, 0.18, 0.25, 0.3],
    tailBlend: [0.06, 0.23],
    fan: [0.25, 0.31],
    pec: [0.075, -0.03, -0.22],
    pecEdge: [0.055, 0.14],
    pecSpan: [-0.28, -0.23, -0.12, -0.08],
    pecY: [-0.13, -0.07, 0.07, 0.12],
    median: [0.12, -0.14, 0.015],
    medianSpan: [-0.23, -0.15, 0.22, 0.32],
    medianEdge: [0.09, 0.15],
  },
  needlefish: {
    tail: [-0.02, 0.15, 0.3, 0.41],
    tailBlend: [-0.08, 0.21],
    fan: [0.4, 0.44],
    pec: [0.027, 0.009, -0.15],
    pecEdge: [0.024, 0.085],
    pecSpan: [-0.22, -0.18, -0.05, 0],
    pecY: [-0.05, -0.035, 0.035, 0.05],
  },
  barracuda: {
    tail: [-0.06, 0.12, 0.27, 0.38],
    tailBlend: [-0.1, 0.14],
    fan: [0.35, 0.41],
    pec: [0.045, -0.02, -0.2],
    pecEdge: [0.05, 0.085],
    pecSpan: [-0.24, -0.2, -0.07, -0.025],
    pecY: [-0.075, -0.045, 0.025, 0.05],
  },
};
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));

/** 只驱动显示：礁鱼软鳍划水、细长鱼后躯摆尾，沿用原位移与相位。 */
export function buildBermudaHF(kind, root, motions) {
  const cfg = ANATOMY[kind];
  if (!cfg) throw Error("Unknown Bermuda HF fish");
  const base = new THREE.Bone();
  base.name = `${kind}_root`;
  root.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, hierarchy = false, extra = {}) => {
    const chain = { name, points, ids: [], ...extra };
    chains.push(chain);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = `${kind}_${name}_${i}`;
      b.position.fromArray(p);
      const parent = hierarchy && i ? bones[chain.ids[i - 1]] : base;
      if (hierarchy && i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      parent.add(b);
      chain.ids.push(bones.length);
      bones.push(b);
    });
    return chain;
  };
  const tail = add(
    "tail",
    cfg.tail.map((z) => [0, 0, z]),
    true,
  );
  const pecs = [-1, 1].map((side) =>
    add(
      "pectoral_" + side,
      [[side * cfg.pec[0], cfg.pec[1], cfg.pec[2]]],
      false,
      { side },
    ),
  );
  const median = cfg.median
    ? [1, -1].map((side, i) =>
        add(
          side > 0 ? "soft_dorsal" : "soft_anal",
          [[0, cfg.median[i], cfg.median[2]]],
          false,
          { side },
        ),
      )
    : [];
  const asset = bermudaFishAsset(kind, (x, y, z, ids, weights, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.tailBlend, z), ids, weights, o);
    // 整片尾扇由末端支撑，尾叶不会因上下不同权重对折。
    const fan = smooth(...cfg.fan, z);
    for (let i = 0; i < 3; i++) weights[o + i] *= 1 - fan;
    ids[o + 3] = tail.ids.at(-1);
    weights[o + 3] = fan;
    // 神仙鱼的软鳍根沿后躯下降，不能按固定水平线把长鳍条截成两段。
    const medianRoot =
      kind === "queen_angelfish"
        ? 0.02 + 0.17 * (1 - smooth(-0.15, 0.32, z))
        : 0;
    const fin = median.length
      ? (kind === "queen_angelfish"
          ? smooth(medianRoot, medianRoot + 0.05, Math.abs(y))
          : smooth(...cfg.medianEdge, Math.abs(y))) *
        band(...cfg.medianSpan, z) *
        (1 - smooth(0.045, 0.055, Math.abs(x)))
      : 0;
    if (fin > 0) {
      // 中央尾扇与背/臀鳍的自由端按实际高度分开；前缘连续留在躯干上。
      const freeFin = fin;
      for (let i = 0; i < 4; i++) weights[o + i] *= 1 - freeFin;
      // 此区域没有胸鳍，尾扇的第四槽退回同一末端骨以保持总权重。
      weights[o + 2] += weights[o + 3];
      if (fan > 0) ids[o + 2] = tail.ids.at(-1);
      ids[o + 3] = median[y > 0 ? 0 : 1].ids[0];
      weights[o + 3] = freeFin;
    }
    const pec =
      smooth(...cfg.pecEdge, Math.abs(x)) *
      band(...cfg.pecSpan, z) *
      band(...cfg.pecY, y);
    if (pec > 0) {
      // 胸鳍与尾扇/软背鳍区域不相交，保留已有躯干权重的连续过渡。
      for (let i = 0; i < 3; i++) weights[o + i] *= 1 - pec;
      ids[o + 3] = pecs[x < 0 ? 0 : 1].ids[0];
      weights[o + 3] = pec;
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
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.artRevision = "trellis_bermuda_fish_20261023";
  root.userData.normalizedLength = 1;
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
      drive = smooth(0.3, 3, e);
    const reef = median.length > 0,
      trigger = kind === "triggerfish";
    const beat = phase * (reef ? 2.05 : kind === "needlefish" ? 2.9 : 2.3);
    const amplitudes = trigger
      ? [0.002, 0.008, 0.02, 0.055]
      : reef
        ? [0.004, 0.015, 0.03, 0.095]
        : [0.008, 0.024, 0.055, 0.14];
    tail.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(beat - i * 0.6) * amplitudes[i] * (0.75 + drive * 0.25);
    });
    median.forEach((c) => {
      bones[c.ids[0]].rotation.z =
        c.side *
        Math.sin(beat - 0.45) *
        (trigger ? 0.26 : 0.1) *
        (0.75 + drive * 0.25);
    });
    pecs.forEach((c) => {
      const b = bones[c.ids[0]];
      b.rotation.y =
        c.side *
        (Math.sin(beat * (reef ? 0.7 : 0.4) + c.side * 0.12) *
          (reef ? 0.14 : 0.09) -
          drive * 0.035);
      b.rotation.z =
        c.side * Math.sin(beat * 0.7 - 0.7) * (reef ? 0.045 : 0.025);
    });
  });
}
