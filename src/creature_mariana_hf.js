import * as THREE from "three";
import { marianaFishAsset } from "./mariana_fish_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const MARIANA_HF_FISH = new Set([
  "moorish_idol",
  "lanternfish",
  "goblin_shark",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
// 由实际等比归一化表面拟合转轴，镰鱼的长背鳍不能受尾部权重牵拉。
const ANATOMY = {
  moorish_idol: {
    tail: [-0.025, 0.005, 0.035, 0.065],
    tailY: -0.068,
    tailBlend: [-0.05, 0.04],
    fan: [0.025, 0.065],
    pec: [0.062, -0.066, -0.292],
    pecEdge: [0.055, 0.087],
    pecSpan: [-0.34, -0.3, -0.15, -0.12],
    pecY: [-0.2, -0.16, 0.09, 0.13],
    streamer: [
      [0, 0.24, -0.19],
      [0, 0.34, 0.02],
      [0, 0.32, 0.27],
      [0, 0.26, 0.43],
    ],
  },
  lanternfish: {
    tail: [-0.08, 0.09, 0.24, 0.36],
    tailY: -0.015,
    tailBlend: [-0.12, 0.13],
    fan: [0.33, 0.39],
    pec: [0.047, -0.043, -0.28],
    pecEdge: [0.053, 0.098],
    pecSpan: [-0.32, -0.28, -0.13, -0.1],
    pecY: [-0.15, -0.125, -0.005, 0.018],
  },
  goblin_shark: {
    tail: [-0.06, 0.1, 0.26, 0.38],
    tailY: 0,
    tailBlend: [-0.1, 0.14],
    fan: [0.39, 0.46],
    pec: [0.062, -0.038, -0.235],
    pecEdge: [0.075, 0.125],
    pecSpan: [-0.275, -0.23, -0.09, -0.055],
    pecY: [-0.18, -0.14, -0.02, 0.015],
  },
};
/** 仅显示动作；沿用世界位移与累计相位，不改变速度、食物或攻击规则。 */
export function buildMarianaHF(kind, root, motions) {
  const cfg = ANATOMY[kind];
  if (!cfg) throw Error("Unknown Mariana HF fish");
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
      const parent = hierarchy && i ? bones[c.ids[i - 1]] : base;
      if (hierarchy && i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      parent.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  const tail = add(
      "tail",
      cfg.tail.map((z) => [0, cfg.tailY, z]),
      true,
    ),
    pecs = [-1, 1].map((side) =>
      add(
        "pectoral_" + side,
        [[side * cfg.pec[0], cfg.pec[1], cfg.pec[2]]],
        false,
        { side },
      ),
    ),
    streamer = cfg.streamer ? add("streamer", cfg.streamer, true) : null;
  const asset = marianaFishAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.tailBlend, z), ids, w, o);
    const fan = smooth(...cfg.fan, z);
    for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
    ids[o + 3] = tail.ids.at(-1);
    w[o + 3] = fan;
    if (streamer) {
      const rootHeight = 0.12 + 0.11 * (1 - smooth(-0.22, 0.2, z));
      const influence =
        smooth(rootHeight, rootHeight + 0.035, y) * smooth(-0.29, -0.17, z);
      if (influence > 0) {
        const si = new Uint16Array(4),
          sw = new Float32Array(4);
        chainWeights(streamer, point, 1, si, sw, 0);
        const pairs = [];
        for (let j = 0; j < 4; j++) {
          if (w[o + j] > 0)
            pairs.push([ids[o + j], w[o + j] * (1 - influence)]);
          if (sw[j] > 0) pairs.push([si[j], sw[j] * influence]);
        }
        const merged = new Map();
        for (const [id, v] of pairs) merged.set(id, (merged.get(id) || 0) + v);
        const sorted = [...merged].sort((a, b) => b[1] - a[1]).slice(0, 4),
          sum = sorted.reduce((a, p) => a + p[1], 0);
        for (let j = 0; j < 4; j++) {
          ids[o + j] = sorted[j]?.[0] ?? 0;
          w[o + j] = (sorted[j]?.[1] ?? 0) / sum;
        }
      }
    }
    const pec =
      smooth(...cfg.pecEdge, Math.abs(x)) *
      band(...cfg.pecSpan, z) *
      band(...cfg.pecY, y);
    if (pec > 0) {
      for (let j = 0; j < 4; j++) w[o + j] *= 1 - pec;
      w[o] += w[o + 3];
      ids[o + 3] = pecs[x < 0 ? 0 : 1].ids[0];
      w[o + 3] = pec;
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.18,
  );
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.artRevision = "trellis_mariana_fish_20261024";
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
    const drive = smooth(0.3, 3, effort(phase, speed)),
      idol = kind === "moorish_idol",
      shark = kind === "goblin_shark",
      beat = phase * (idol ? 1.6 : shark ? 1.35 : 2.35),
      amplitudes = idol
        ? [0.003, 0.008, 0.016, 0.045]
        : shark
          ? [0.012, 0.035, 0.065, 0.1]
          : [0.008, 0.025, 0.055, 0.12];
    tail.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(beat - i * 0.6) * amplitudes[i] * (0.7 + drive * 0.3);
    });
    pecs.forEach((c) => {
      const b = bones[c.ids[0]];
      b.rotation.y =
        c.side *
        (Math.sin(beat + c.side * 0.12) * (idol ? 0.24 : shark ? 0.045 : 0.11) -
          drive * 0.025);
      b.rotation.z = c.side * Math.sin(beat - 0.8) * (idol ? 0.06 : 0.025);
    });
    streamer?.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(beat * 0.55 - i * 0.6) * (0.01 + i * 0.009);
    });
  });
}
