import * as THREE from "three";
import { penglaiWaterbirdAsset } from "./penglai_waterbird_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  createLordBones,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const PENGLAI_HF_WATERBIRD = new Set([
  "xuangui",
  "bifang",
  "hujiao",
  "pool_hujiao",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const CONTACT = {
  xuangui: {
    head: [0, -0.0016500114571403046, -0.4874327950054255],
    ground: 0.12907073935413096,
  },
  bifang: {
    head: [0, 0.02712798444544183, -0.404518423056474],
    ground: 0.2815505948611257,
  },
  hujiao: { head: [0, 0, -0.4803980943275633], ground: 0.09237567819358776 },
  pool_hujiao: {
    head: [0, 0, -0.4803980943275633],
    ground: 0.09237567819358776,
  },
};
/** 每个 HF 表面按实际关节拟合；沿用原来的世界运动、食物和攻击锚点。 */
export function buildPenglaiWaterbirdHF(kind, root, motions) {
  const turtle = kind === "xuangui",
    bird = kind === "bifang",
    pool = kind === "pool_hujiao",
    chains = [];
  const add = (name, type, points, extra = {}) => {
    const c = { name, type, points, ...extra };
    chains.push(c);
    return c;
  };
  let tail;
  const limbs = [];
  if (turtle) {
    tail = add("serpent_tail", "tail", [
      [0, -0.12, 0.055],
      [0, -0.145, 0.18],
      [0, -0.16, 0.32],
      [0, -0.17, 0.44],
    ]);
    for (const side of [-1, 1])
      for (const front of [true, false])
        limbs.push(
          add(
            `paddle_${side}_${front}`,
            "paddle",
            front
              ? [
                  [side * 0.14, -0.145, -0.285],
                  [side * 0.22, -0.195, -0.28],
                  [side * 0.29, -0.24, -0.285],
                ]
              : [
                  [side * 0.13, -0.15, 0.0],
                  [side * 0.23, -0.2, 0.0],
                  [side * 0.3, -0.23, 0.025],
                ],
            { side, front },
          ),
        );
  } else if (bird) {
    for (const side of [-1, 1])
      limbs.push(
        add(
          `wing_${side}`,
          "wing",
          [
            [side * 0.055, -0.105, -0.1],
            [side * 0.23, 0.025, -0.14],
            [side * 0.42, 0.145, -0.05],
          ],
          { side },
        ),
      );
    tail = add("tail_plumes", "tail", [
      [0, -0.14, 0.1],
      [0, -0.2, 0.26],
      [0, -0.25, 0.42],
    ]);
  } else {
    tail = add(
      "axial_wave",
      "tail",
      [-0.22, -0.1, 0.025, 0.15, 0.27, 0.38, 0.47].map((z) => [0, 0, z]),
    );
    for (const side of [-1, 1])
      for (const front of [true, false])
        limbs.push(
          add(
            `fin_${side}_${front}`,
            "fin",
            front
              ? [
                  [side * 0.045, -0.025, -0.29],
                  [side * 0.1, -0.065, -0.24],
                  [side * 0.14, -0.095, -0.2],
                ]
              : [
                  [side * 0.025, -0.025, -0.075],
                  [side * 0.05, -0.06, -0.045],
                  [side * 0.065, -0.085, 0],
                ],
            { side, front },
          ),
        );
  }
  if (kind === "hujiao") {
    const tucked = limbs.find((c) => c.side === 1 && !c.front);
    tucked.points = [
      [0.016, -0.035, -0.08],
      [0.02, -0.065, -0.06],
      [0.024, -0.09, -0.025],
    ];
  }
  // Fin chains are parented to the corresponding axial section by createLordBones.
  const bones = createLordBones(root, chains),
    p = new THREE.Vector3();
  const asset = penglaiWaterbirdAsset(kind, (x, y, z, ids, w, o) => {
    p.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    if (turtle) {
      const edge =
        smooth(0.13, 0.215, Math.abs(x)) * (1 - smooth(-0.155, -0.115, y));
      if (edge > 0) {
        const c = limbs.find(
          (c) => c.side === (x < 0 ? -1 : 1) && c.front === z < -0.13,
        );
        chainWeights(c, p, edge, ids, w, o);
      } else chainWeights(tail, p, smooth(0.055, 0.16, z), ids, w, o);
    } else if (bird) {
      const edge =
        smooth(0.055, 0.105, Math.abs(x)) * (1 - smooth(0.12, 0.23, z));
      if (edge > 0) chainWeights(limbs[x < 0 ? 0 : 1], p, edge, ids, w, o);
      else chainWeights(tail, p, smooth(0.12, 0.24, z), ids, w, o);
    } else {
      const axial = nearestChain(p, tail),
        blend = smooth(-0.3, -0.15, z);
      ids[o] = 0;
      ids[o + 1] = axial.a;
      ids[o + 2] = axial.b;
      w[o] = 1 - blend;
      w[o + 1] = blend * (1 - axial.t);
      w[o + 2] = blend * axial.t;
      if (z < 0.075 && y < -0.025) {
        const c = limbs.find(
          (c) => c.side === (x < 0 ? -1 : 1) && c.front === z < -0.14,
        );
        let edge =
          smooth(
            c.front ? 0.055 : 0.028,
            c.front ? 0.095 : 0.052,
            Math.abs(x),
          ) *
          (1 - smooth(-0.04, -0.015, y));
        if (kind === "hujiao" && c.side === 1 && !c.front)
          edge =
            smooth(0.006, 0.022, x) *
            (1 - smooth(-0.065, -0.035, y)) *
            (1 - smooth(0.0, 0.07, z));
        if (edge > 0) {
          const n = nearestChain(p, c);
          ids[o] = axial.a;
          ids[o + 1] = axial.b;
          ids[o + 2] = n.a;
          ids[o + 3] = n.b;
          w[o] = (1 - edge) * (1 - axial.t);
          w[o + 1] = (1 - edge) * axial.t;
          w[o + 2] = edge * (1 - n.t);
          w[o + 3] = edge * n.t;
        }
      }
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.4,
  );
  const contact = CONTACT[kind],
    head = new THREE.Vector3(...contact.head);
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.mythicAnatomy = kind;
  root.userData.getHeadWorldPositions = () => [root.localToWorld(head.clone())];
  root.userData.groundSupport = contact.ground;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_penglai_waterbird_20261027";
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
    const drive = smooth(0.3, 3, effort(phase, speed));
    if (turtle) {
      for (const c of limbs) {
        const ph =
            phase * 0.95 +
            (c.front ? 0 : Math.PI) +
            (1 - drive) * c.side * 0.12,
          cycle = (((ph / (Math.PI * 2)) % 1) + 1) % 1,
          power = cycle < 0.6,
          u = power ? cycle / 0.6 : (cycle - 0.6) / 0.4,
          s = u * u * (3 - 2 * u),
          recover = power ? 0 : Math.sin(u * Math.PI),
          amp = c.front ? 0.26 + drive * 0.12 : 0.09 + drive * 0.04,
          sweep = (power ? 1 - 2 * s : -1 + 2 * s) * amp;
        bones[c.ids[0]].rotation.y = c.side * sweep;
        bones[c.ids[0]].rotation.z = c.side * recover * 0.11;
        bones[c.ids[1]].rotation.y = -c.side * sweep * 0.25;
        bones[c.ids[1]].rotation.x = recover * (c.front ? 0.3 : 0.16);
        bones[c.ids[2]].rotation.x = -recover * 0.12;
      }
      tail.ids.forEach((id, j) => {
        bones[id].rotation.y =
          Math.sin(phase * 0.65 - j * 0.7) * (0.012 + j * 0.012);
      });
    } else if (bird) {
      const glide = smooth(-0.65, 0.4, Math.sin(phase * 0.12));
      for (const c of limbs)
        c.ids.forEach((id, j) => {
          const beat = phase * 0.95 - j * 0.42;
          bones[id].rotation.z =
            c.side *
            ((j === 0 ? -0.2 : 0) +
              Math.sin(beat) *
                (0.45 * (j === 0 ? 1 : j === 1 ? 0.38 : 0.22)) *
                (0.3 + glide * 0.7));
          bones[id].rotation.y =
            c.side * Math.sin(beat - 0.7) * (0.022 + j * 0.01);
        });
      tail.ids.forEach((id, j) => {
        bones[id].rotation.x = Math.sin(phase * 0.55 - j * 0.5) * 0.014;
        bones[id].rotation.y = Math.sin(phase * 0.43 - j * 0.45) * 0.009;
      });
    } else {
      tail.ids.forEach((id, j) => {
        bones[id].rotation.y =
          Math.sin(phase * (pool ? 0.85 : 1.03) - j * 0.62) *
          (0.013 + j * 0.022) *
          (1 + drive * 0.18);
        bones[id].rotation.x = Math.sin(phase * 0.43 - j * 0.6) * 0.005;
      });
      for (const c of limbs)
        c.ids.forEach((id, j) => {
          bones[id].rotation.z =
            c.side *
            (Math.sin(phase * 0.85 - j * 0.38 + (c.front ? 0 : 1.2)) *
              (c.front ? 0.07 : 0.045));
          bones[id].rotation.y =
            c.side * Math.sin(phase * 0.7 - j * 0.4) * 0.035;
        });
    }
  });
}
