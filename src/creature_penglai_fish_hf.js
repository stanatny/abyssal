import * as THREE from "three";
import { penglaiFishAsset } from "./penglai_fish_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const PENGLAI_HF_FISH = new Set([
  "jade_minnow",
  "chiru",
  "spirit_carp",
  "dragon_carp",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
// 参数来自归一化后的实际导出表面，头部朝向 -Z。
const ANATOMY = {
  dragon_carp: {
    tail: [-0.03, 0.12, 0.25, 0.34],
    tailY: -0.035,
    blend: [-0.1, 0.18],
    fan: [0.29, 0.35],
    pec: [0.08, -0.095, -0.315],
    edge: [0.09, 0.13],
    span: [-0.35, -0.3, -0.16, -0.12],
    height: [-0.235, -0.2, -0.09, -0.06],
    beat: 1.5,
    amplitude: [0.008, 0.026, 0.055, 0.12],
    finBeat: 1.35,
    finSweep: 0.18,
  },
  spirit_carp: {
    tail: [-0.1, 0.04, 0.17, 0.28, 0.39, 0.47],
    tailY: 0.035,
    blend: [-0.19, 0.12],
    pec: [0.075, -0.025, -0.3],
    edge: [0.085, 0.12],
    span: [-0.35, -0.3, -0.1, -0.075],
    height: [-0.25, -0.23, 0, 0.025],
    beat: 1.25,
    amplitude: [0.008, 0.026, 0.055, 0.07, 0.07, 0.06],
    finBeat: 1.3,
    finSweep: 0.19,
  },
  jade_minnow: {
    tail: [-0.05, 0.1, 0.24, 0.35],
    tailY: -0.014,
    blend: [-0.14, 0.16],
    fan: [0.32, 0.37],
    pec: [0.026, -0.027, -0.225],
    edge: [0.031, 0.052],
    span: [-0.26, -0.225, -0.095, -0.07],
    height: [-0.105, -0.08, -0.012, 0.008],
    beat: 2.1,
    amplitude: [0.012, 0.03, 0.065, 0.13],
    finBeat: 1.7,
    finSweep: 0.17,
  },
  chiru: {
    tail: [-0.03, 0.11, 0.25, 0.34],
    tailY: -0.024,
    blend: [-0.12, 0.17],
    fan: [0.29, 0.35],
    pec: [0.083, -0.061, -0.305],
    edge: [0.09, 0.125],
    span: [-0.34, -0.29, -0.155, -0.12],
    height: [-0.235, -0.21, -0.05, -0.025],
    beat: 1.65,
    amplitude: [0.009, 0.025, 0.06, 0.13],
    finBeat: 1.5,
    finSweep: 0.19,
  },
};
// Feeding callers retain the published anchors even as the visible surface is redrawn.
const CONTACT = {
  jade_minnow: [
    0, -0.0200205410780342, -0.4958892321015303, 0.1268424260953233,
  ],
  chiru: [0, -0.057662859935383705, -0.47477769617730886, 0.24255713696428294],
  spirit_carp: [
    0, 0.026696214997538124, -0.4963824623601441, 0.20501698087544656,
  ],
  dragon_carp: [
    0, -0.024215247406079197, -0.49591865216116354, 0.18889728634784791,
  ],
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
export function buildPenglaiFishHF(kind, root, motions) {
  const cfg = ANATOMY[kind];
  if (!cfg) throw Error("Unknown Penglai fish");
  const base = new THREE.Bone();
  base.name = `${kind}_root`;
  root.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, hierarchy = false, extra = {}) => {
    const c = {
      name,
      type: name === "tail" ? "tail" : "fin",
      points,
      ids: [],
      ...extra,
    };
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
    );
  const asset = penglaiFishAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.blend, z), ids, w, o);
    if (cfg.fan) blendBone(ids, w, o, tail.ids.at(-1), smooth(...cfg.fan, z));
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
  root.userData.mythicAnatomy = kind;
  const contact = CONTACT[kind],
    head = new THREE.Vector3(...contact.slice(0, 3));
  root.userData.getHeadWorldPositions = () => [root.localToWorld(head.clone())];
  root.userData.groundSupport = contact[3];
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_penglai_fish_20261027";
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
        c.side * Math.sin(wave - 0.6) * (kind === "spirit_carp" ? 0.05 : 0.03);
    });
  });
}
