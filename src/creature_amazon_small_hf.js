import * as THREE from "three";
import { amazonSmallAsset } from "./amazon_small_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const AMAZON_HF_SMALL = new Set([
  "neon_tetra",
  "amazon_discus",
  "silver_hatchet",
  "armored_cory",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
// 参数来自归一化后的实际导出表面，头部朝向 -Z。
const ANATOMY = {
  neon_tetra: {
    tail: [-0.05, 0.1, 0.23, 0.34],
    tailY: -0.005,
    blend: [-0.09, 0.15],
    fan: [0.29, 0.35],
    pec: [0.05, -0.08, -0.3],
    edge: [0.047, 0.075],
    span: [-0.34, -0.3, -0.19, -0.16],
    height: [-0.19, -0.17, -0.08, -0.055],
    beat: 2.8,
    amplitude: [0.008, 0.025, 0.055, 0.13],
    finBeat: 2.1,
    finSweep: 0.19,
  },
  amazon_discus: {
    tail: [0.1, 0.17, 0.24, 0.31],
    tailY: -0.04,
    blend: [0.1, 0.24],
    fan: [0.27, 0.32],
    pec: [0.067, -0.05, -0.3],
    edge: [0.075, 0.135],
    span: [-0.35, -0.3, -0.15, -0.1],
    height: [-0.17, -0.13, 0.08, 0.1],
    beat: 1.9,
    amplitude: [0.003, 0.008, 0.018, 0.075],
    finBeat: 2.5,
    finSweep: 0.2,
    median: true,
  },
  silver_hatchet: {
    tail: [0.02, 0.16, 0.28, 0.37],
    tailY: 0,
    blend: [0, 0.2],
    fan: [0.31, 0.37],
    pec: [0.055, 0.085, -0.29],
    edge: [0.06, 0.1],
    span: [-0.34, -0.28, -0.065, -0.02],
    height: [0.06, 0.09, 0.23, 0.25],
    beat: 2.7,
    amplitude: [0.006, 0.025, 0.06, 0.12],
    finBeat: 1.5,
    finSweep: 0.08,
  },
  armored_cory: {
    tail: [-0.05, 0.1, 0.24, 0.34],
    tailY: -0.04,
    blend: [-0.04, 0.17],
    fan: [0.3, 0.36],
    pec: [0.045, -0.12, -0.27],
    edge: [0.05, 0.085],
    span: [-0.31, -0.26, -0.18, -0.14],
    height: [-0.25, -0.22, -0.135, -0.11],
    beat: 2.25,
    amplitude: [0.005, 0.02, 0.05, 0.12],
    finBeat: 1.75,
    finSweep: 0.18,
  },
};
function blendBone(ids, w, o, id, weight) {
  if (weight <= 0) return;
  const merged = new Map([[id, weight]]);
  for (let j = 0; j < 4; j++)
    if (w[o + j] > 0)
      merged.set(
        ids[o + j],
        (merged.get(ids[o + j]) || 0) + w[o + j] * (1 - weight),
      );
  const pairs = [...merged].sort((a, b) => b[1] - a[1]).slice(0, 4),
    sum = pairs.reduce((s, p) => s + p[1], 0);
  for (let j = 0; j < 4; j++) {
    ids[o + j] = pairs[j]?.[0] ?? 0;
    w[o + j] = (pairs[j]?.[1] ?? 0) / sum;
  }
}
/** 保持躯干稳定，以尾部推进、胸鳍微调；沿用原有游戏时钟。 */
export function buildAmazonSmallHF(kind, root, motions) {
  const cfg = ANATOMY[kind];
  if (!cfg) throw Error("Unknown Amazon small fish");
  const base = new THREE.Bone();
  base.name = `${kind}_root`;
  root.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, hierarchy = false, extra = {}) => {
    const c = { name, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const bone = new THREE.Bone();
      bone.name = `${kind}_${name}_${i}`;
      bone.position.fromArray(p);
      const parent = hierarchy && i ? bones[c.ids[i - 1]] : base;
      if (hierarchy && i)
        bone.position.sub(new THREE.Vector3(...points[i - 1]));
      parent.add(bone);
      c.ids.push(bones.length);
      bones.push(bone);
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
    median = cfg.median
      ? [-1, 1].map((side) =>
          add(
            side < 0 ? "anal_fin" : "dorsal_fin",
            [[0, side < 0 ? -0.23 : 0.25, 0.04]],
            false,
            { side },
          ),
        )
      : [];
  const asset = amazonSmallAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.blend, z), ids, w, o);
    blendBone(ids, w, o, tail.ids.at(-1), smooth(...cfg.fan, z));
    if (cfg.median) {
      const edge =
        smooth(0.24, 0.34, Math.abs(y)) *
        (1 - smooth(0.022, 0.045, Math.abs(x))) *
        band(-0.28, -0.18, 0.23, 0.29, z);
      blendBone(ids, w, o, median[y < 0 ? 0 : 1].ids[0], edge * 0.85);
    }
    const pec =
      smooth(...cfg.edge, Math.abs(x)) *
      band(...cfg.span, z) *
      band(...cfg.height, y);
    blendBone(ids, w, o, pecs[x < 0 ? 0 : 1].ids[0], pec);
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.13,
  );
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.amazonAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_amazon_small_20261025";
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
      beat = phase * cfg.beat;
    tail.ids.forEach((id, i) => {
      bones[id].rotation.y =
        Math.sin(beat - i * 0.58) * cfg.amplitude[i] * (0.75 + drive * 0.25);
    });
    pecs.forEach((c) => {
      const b = bones[c.ids[0]],
        wave = phase * cfg.finBeat + c.side * 0.14;
      b.rotation.y = c.side * (Math.sin(wave) * cfg.finSweep - drive * 0.035);
      b.rotation.z =
        c.side *
        Math.sin(wave - 0.6) *
        (kind === "silver_hatchet" ? 0.035 : 0.025);
    });
    median.forEach((c) => {
      bones[c.ids[0]].rotation.z = -c.side * Math.sin(beat - 0.8) * 0.045;
    });
  });
}
