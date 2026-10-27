import * as THREE from "three";
import { penglaiWingedAsset } from "./penglai_winged_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  createLordBones,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const PENGLAI_HF_WINGED = new Set([
  "lotus_sprite",
  "wenyao",
  "luoyu",
  "cloud_crane",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b),
  point = new THREE.Vector3();
// 翼根、肘、腕来自导出网格测量；不同翼鱼不共用相同的解剖拟合。
const ANATOMY = {
  wenyao: {
    wing: [
      [0.08, 0.035, -0.3],
      [0.3, 0.1, -0.24],
      [0.53, 0.12, -0.24],
    ],
    edge: [0.075, 0.135],
    tail: [
      [0, -0.08, -0.08],
      [0, -0.1, 0.12],
      [0, -0.1, 0.3],
      [0, -0.1, 0.41],
    ],
    tailBlend: [-0.13, 0.15],
    beat: 1.95,
    flap: 0.39,
  },
  luoyu: {
    wing: [
      [0.055, 0.005, -0.28],
      [0.2, 0.04, -0.25],
      [0.36, 0.07, -0.24],
    ],
    edge: [0.052, 0.095],
    tail: [
      [0, -0.045, -0.12],
      [0, -0.045, 0.07],
      [0, -0.04, 0.23],
      [0, -0.04, 0.39],
    ],
    tailBlend: [-0.18, 0.04],
    beat: 1.55,
    flap: 0.33,
  },
  cloud_crane: {
    wing: [
      [0.06, -0.02, -0.015],
      [0.23, 0.045, -0.1],
      [0.4, 0.065, -0.14],
    ],
    edge: [0.06, 0.105],
    tail: [
      [0, -0.055, 0.12],
      [0, -0.06, 0.29],
      [0, -0.07, 0.43],
    ],
    tailBlend: [0.14, 0.27],
    beat: 0.95,
    flap: 0.47,
  },
};
const CONTACT = {
  lotus_sprite: { head: null, ground: 0.1345396232324869 },
  wenyao: {
    head: [[0, -0.009310713635090971, -0.4998631175673293]],
    ground: 0.16947146708272373,
  },
  luoyu: {
    head: [[0, -0.002382839535657948, -0.49073446786014363]],
    ground: 0.07625331295553874,
  },
  cloud_crane: {
    head: [[0, 0.09087737671363325, -0.4957752616977167]],
    ground: 0.14524854855886393,
  },
};
/** 原有飞行/泳动时钟驱动局部形变，位置、速度和进食逻辑保持不变。 */
export function buildPenglaiWingedHF(kind, root, motions) {
  const lotus = kind === "lotus_sprite",
    cfg = ANATOMY[kind],
    chains = [];
  if (lotus) {
    for (const side of [-1, 1])
      chains.push({
        name: `valve_${side}`,
        type: "shell",
        side,
        points: [[side * 0.035, -0.16, 0]],
      });
    const feelers = [
      [
        [-0.06, -0.18, 0],
        [-0.21, -0.3, -0.02],
        [-0.17, -0.39, -0.07],
        [-0.19, -0.46, -0.06],
      ],
      [
        [0.05, -0.18, -0.04],
        [0.23, -0.3, -0.06],
        [0.2, -0.39, -0.08],
        [0.22, -0.46, -0.04],
      ],
      [
        [-0.025, -0.18, 0.045],
        [0.04, -0.29, 0.08],
        [-0.05, -0.38, 0.07],
        [-0.1, -0.45, 0.07],
      ],
      [
        [0.1, -0.18, 0.035],
        [0.27, -0.29, 0.03],
        [0.36, -0.38, 0.015],
        [0.375, -0.45, 0.012],
      ],
    ];
    feelers.forEach((points, i) =>
      chains.push({ name: `feeler_${i}`, type: "arm", points }),
    );
  } else {
    for (const side of [-1, 1])
      chains.push({
        name: `wing_${side}`,
        type: "wing",
        side,
        points: cfg.wing.map(([x, y, z]) => [side * x, y, z]),
      });
    chains.push({ name: "tail", type: "tail", points: cfg.tail });
  }
  const bones = createLordBones(root, chains);
  bones[0].name = `${kind}_root`;
  const asset = penglaiWingedAsset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    if (lotus) {
      if (y < -0.2) {
        const arms = chains.slice(2);
        const chain = arms.reduce((best, c) =>
          nearestChain(point, c).distance < nearestChain(point, best).distance
            ? c
            : best,
        );
        chainWeights(chain, point, 1 - smooth(-0.26, -0.19, y), ids, w, o);
      } else {
        // 珠核和中央外套膜留在躯干；壳片绕底部铰链整体开合。
        const blend = smooth(0.065, 0.17, Math.abs(x)) * smooth(-0.19, -0.1, y);
        ids[o + 1] = chains[x < 0 ? 0 : 1].ids[0];
        w[o] = 1 - blend;
        w[o + 1] = blend;
      }
    } else {
      const wing = smooth(...cfg.edge, Math.abs(x));
      if (wing > 0) chainWeights(chains[x < 0 ? 0 : 1], point, wing, ids, w, o);
      else
        chainWeights(chains[2], point, smooth(...cfg.tailBlend, z), ids, w, o);
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    lotus ? 0.25 : 0.65,
  );
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.mythicAnatomy = kind;
  if (lotus) root.userData.aquaticUpright = true;
  const contact = CONTACT[kind];
  if (contact.head) {
    const head = new THREE.Vector3(...contact.head[0]);
    root.userData.getHeadWorldPositions = () => [
      root.localToWorld(head.clone()),
    ];
  }
  root.userData.groundSupport = contact.ground;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_penglai_winged_20261027";
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
    if (lotus) {
      chains.slice(0, 2).forEach((c) => {
        bones[c.ids[0]].rotation.z =
          c.side * (0.025 + Math.sin(phase * 0.55) * 0.065);
      });
      chains.slice(2).forEach((c, i) =>
        c.ids.forEach((id, j) => {
          bones[id].rotation.z =
            Math.sin(phase * 0.85 - j * 0.65 + i * 0.9) * (0.035 + j * 0.02);
          bones[id].rotation.x =
            Math.sin(phase * 0.7 - j * 0.5 + i) * (0.025 + j * 0.012);
        }),
      );
    } else {
      const glide = smooth(-0.55, 0.3, Math.sin(phase * 0.12));
      chains.slice(0, 2).forEach((c) =>
        c.ids.forEach((id, j) => {
          const beat = phase * cfg.beat - j * 0.43;
          const amp =
            cfg.flap *
            (j === 0 ? 1 : j === 1 ? 0.38 : 0.24) *
            (0.35 + glide * 0.65) *
            (0.85 + drive * 0.15);
          bones[id].rotation.z = c.side * (0.015 + Math.sin(beat) * amp);
          bones[id].rotation.y =
            c.side * Math.sin(beat - 0.8) * (0.025 + j * 0.008);
        }),
      );
      chains[2].ids.forEach((id, j) => {
        bones[id].rotation.y =
          Math.sin(phase * (kind === "cloud_crane" ? 0.55 : 1.15) - j * 0.55) *
          (kind === "cloud_crane" ? 0.008 : 0.012 + j * 0.018);
        bones[id].rotation.x =
          Math.sin(phase * 0.55 - j * 0.4) *
          (kind === "cloud_crane" ? 0.004 : 0.008);
      });
    }
  });
}
