import * as THREE from "three";
import { marianaDeepFishAsset } from "./mariana_deep_fish_asset.js";
import { addBarreleyeHead } from "./mariana_barreleye_head.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const MARIANA_DEEP_HF_FISH = new Set([
  "barreleye",
  "dragonfish",
  "snailfish",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b),
  band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x)),
  point = new THREE.Vector3();
const ANATOMY = {
  barreleye: {
    tail: [-0.025, 0.12, 0.25, 0.36],
    tailY: -0.04,
    tailBlend: [-0.07, 0.17],
    fan: [0.3, 0.37],
    pec: [0.1, -0.075, -0.245],
    pecEdge: [0.115, 0.155],
    pecSpan: [-0.303, -0.275, 0, 0.04],
    pecY: [-0.3, -0.28, 0.04, 0.08],
  },
  dragonfish: {
    tail: [-0.1, 0.07, 0.23, 0.37],
    tailY: 0.005,
    tailBlend: [-0.17, 0.1],
    fan: [0.36, 0.42],
    pec: [0.055, -0.01, -0.285],
    pecEdge: [0.063, 0.085],
    pecSpan: [-0.31, -0.28, -0.23, -0.2],
    pecY: [-0.08, -0.065, 0.005, 0.025],
    barbel: [
      [0, -0.005, -0.47],
      [0, -0.055, -0.435],
      [0, -0.095, -0.4],
    ],
  },
  snailfish: {
    tail: [-0.02, 0.12, 0.26, 0.4],
    tailY: 0,
    tailBlend: [-0.1, 0.12],
    fan: [0.4, 0.46],
    pec: [0.085, -0.06, -0.285],
    pecEdge: [0.115, 0.15],
    pecSpan: [-0.46, -0.43, -0.09, -0.07],
    pecY: [-0.25, -0.22, 0.05, 0.09],
    pecPoints: [
      [-0.095, -0.078, -0.24],
      [0.073, -0.043, -0.32],
    ],
  },
};
/** 个体动作只消费世界原有相位/速度，胸鳍与柔软后躯分别绑定。 */
export function buildMarianaDeepHF(kind, root, motions) {
  const cfg = ANATOMY[kind];
  if (!cfg) throw Error("Unknown Mariana deep HF fish");
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
        [
          cfg.pecPoints?.[side < 0 ? 0 : 1] ?? [
            side * cfg.pec[0],
            cfg.pec[1],
            cfg.pec[2],
          ],
        ],
        false,
        { side },
      ),
    ),
    barbel = cfg.barbel ? add("barbel", cfg.barbel, true) : null;
  const asset = marianaDeepFishAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.tailBlend, z), ids, w, o);
    const fan = smooth(...cfg.fan, z);
    for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
    ids[o + 3] = tail.ids.at(-1);
    w[o + 3] = fan;
    if (barbel) {
      const blend =
        (1 - smooth(-0.35, -0.32, z)) * (1 - smooth(-0.045, -0.02, y));
      if (blend > 0) chainWeights(barbel, point, blend, ids, w, o);
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
  const head = asset.head ? addBarreleyeHead(base, asset.head) : [];
  root.userData.hfRig = { kind, mesh, bones, chains, head };
  root.userData.artRevision = "trellis_mariana_deep_fish_20261024";
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
      hover = kind === "barreleye",
      soft = kind === "snailfish",
      beat = phase * (hover ? 1.7 : soft ? 2 : 2.15),
      amp = hover
        ? [0.004, 0.012, 0.028, 0.055]
        : soft
          ? [0.025, 0.06, 0.095, 0.12]
          : [0.014, 0.036, 0.065, 0.09];
    tail.ids.forEach(
      (id, i) =>
        (bones[id].rotation.y =
          Math.sin(beat - i * 0.72) * amp[i] * (0.72 + 0.28 * drive)),
    );
    pecs.forEach((c) => {
      const b = bones[c.ids[0]];
      b.rotation.y =
        c.side *
        (Math.sin(beat + 0.13 * c.side) * (hover ? 0.13 : soft ? 0.1 : 0.08) -
          drive * 0.02);
      b.rotation.z =
        c.side * Math.sin(beat - 0.6) * (hover ? 0.035 : soft ? 0.025 : 0.025);
    });
    barbel?.ids.forEach(
      (id, i) =>
        (bones[id].rotation.y =
          Math.sin(beat * 0.48 - i * 0.6) * (0.015 + i * 0.015)),
    );
  });
}
