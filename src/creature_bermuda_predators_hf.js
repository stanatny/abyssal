import * as THREE from "three";
import { bermudaPredatorAsset } from "./bermuda_predator_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { createCamerocerasMotion } from "./cameroceras_motion.js";
import {
  createLordBones,
  chainWeights,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

export const BERMUDA_HF_PREDATORS = new Set([
  "tiger_shark",
  "cameroceras",
  "livyatan",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
const ANATOMY = {
  tiger_shark: {
    y: -0.035,
    tail: [-0.09, 0.045, 0.16, 0.265, 0.33],
    fan: [0.3, 0.35],
    pec: [0.105, -0.085, -0.285],
    edge: [0.112, 0.175],
    span: [-0.345, -0.29, -0.13, -0.09],
  },
  livyatan: {
    y: 0.025,
    tail: [-0.04, 0.1, 0.23, 0.33, 0.405],
    fan: [0.37, 0.415],
    pec: [0.108, -0.045, -0.255],
    edge: [0.118, 0.17],
    span: [-0.305, -0.26, -0.15, -0.11],
  },
};

/** 硬壳不摆尾；仅使实际腕冠产生连续柔和波动，软组织复原不是化石定论。 */
function armRig(root) {
  const chains = Array.from({ length: 8 }, (_, i) => ({
    name: `cameroceras_arm_sector_${i}`,
    type: "arm",
    angle: (i * Math.PI) / 4,
    points: [
      [0, 0, -0.23],
      [0, 0, -0.33],
      [0, 0, -0.44],
    ],
  }));
  const bones = createLordBones(root, chains);
  return {
    chains,
    bones,
    bind(x, y, z, ids, w, o) {
      if (z >= -0.23) {
        ids[o] = 0;
        w[o] = 1;
        return;
      }
      // 相邻角区/轴向关节双线性混合，接缝两边使用同一场，不拆开原始皮肤。
      const angle =
        ((Math.atan2(y, x) / (Math.PI * 2) + 1) % 1) * chains.length;
      const a = Math.floor(angle),
        b = (a + 1) % chains.length,
        t = angle - a;
      const u = THREE.MathUtils.clamp((-0.23 - z) / 0.11, 0, 2);
      const j = Math.min(1, Math.floor(u)),
        v = u - j;
      ids[o] = chains[a].ids[j];
      ids[o + 1] = chains[a].ids[j + 1];
      ids[o + 2] = chains[b].ids[j];
      ids[o + 3] = chains[b].ids[j + 1];
      w[o] = (1 - t) * (1 - v);
      w[o + 1] = (1 - t) * v;
      w[o + 2] = t * (1 - v);
      w[o + 3] = t * v;
    },
    animate(phase, drive, jet = 0, gathering = 0) {
      for (const c of chains)
        c.ids.forEach((id, i) => {
          const amplitude = [0, 0.055, 0.1][i] * (1 - gathering * 0.5),
            t = phase * 0.85 - i * 0.65 + c.angle;
          const tuck = [0, 0.055, 0.08][i] * gathering;
          bones[id].rotation.x =
            Math.sin(t) * amplitude - Math.sin(c.angle) * tuck;
          bones[id].rotation.y =
            Math.cos(t * 0.91 + c.angle * 0.3) * amplitude * 0.7 +
            Math.cos(c.angle) * tuck;
          // 短促收缩只作用于壳口外的软组织，不压扁或伸缩硬壳。
          if (i === 1) bones[id].scale.set(1 - jet * 0.045, 1 - jet * 0.045, 1);
        });
    },
  };
}

function axialRig(kind, root) {
  const cfg = ANATOMY[kind],
    whale = kind === "livyatan";
  const chains = [
    {
      name: `${kind}_spine`,
      type: "tail",
      points: cfg.tail.map((z) => [0, cfg.y, z]),
    },
    ...[-1, 1].map((side) => ({
      name: `${kind}_pectoral_${side}`,
      type: "pectoral",
      side,
      points: [[side * cfg.pec[0], cfg.pec[1], cfg.pec[2]]],
    })),
  ];
  const bones = createLordBones(root, chains),
    spine = chains[0];
  return {
    chains,
    bones,
    bind(x, y, z, ids, w, o) {
      point.set(x, y, z);
      chainWeights(
        spine,
        point,
        smooth(cfg.tail[0] - 0.03, cfg.tail[1], z),
        ids,
        w,
        o,
      );
      const fan = smooth(...cfg.fan, z);
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
      ids[o + 3] = spine.ids.at(-1);
      w[o + 3] = fan;
      const fin =
        smooth(...cfg.edge, Math.abs(x)) *
        (1 - smooth(-0.025, 0.005, y)) *
        smooth(cfg.span[0], cfg.span[1], z) *
        (1 - smooth(cfg.span[2], cfg.span[3], z));
      if (fin > 0) {
        for (let j = 0; j < 3; j++) w[o + j] *= 1 - fin;
        ids[o + 3] = chains[x < 0 ? 1 : 2].ids[0];
        w[o + 3] = fin;
      }
    },
    animate(phase, drive) {
      const t = phase * (whale ? 0.82 : 1.22);
      spine.ids.forEach((id, i) => {
        bones[id].rotation[whale ? "x" : "y"] =
          Math.sin(t - i * 0.62) *
          [0.012, 0.04, 0.075, 0.12, 0.13][i] *
          (0.85 + drive * 0.25);
      });
      for (const c of chains.slice(1)) {
        const b = bones[c.ids[0]],
          s = c.side;
        b.rotation.z =
          s * (Math.sin(t * 0.55 + s * 0.2) * (whale ? 0.095 : 0.065));
        b.rotation.y =
          -s * (0.015 + drive * 0.045 + Math.sin(t * 0.45) * 0.025);
        b.rotation.x = Math.sin(t * 0.55) * 0.02;
      }
    },
  };
}

/** 只替换三个百慕大生物的显示工厂，不改变生态、速度、攻击和相机。 */
export function buildBermudaPredatorHF(kind, root, motions) {
  const body = kind === "cameroceras" ? new THREE.Group() : root;
  if (body !== root) {
    body.name = "cameroceras_attitude";
    root.add(body);
  }
  const rig = kind === "cameroceras" ? armRig(body) : axialRig(kind, root);
  const asset = bermudaPredatorAsset(kind, rig.bind);
  const mesh = bindOrganicBody(
    body,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    rig.bones,
    0.18,
  );
  root.userData.hfRig = { kind, mesh, bones: rig.bones, chains: rig.chains };
  root.userData[kind === "tiger_shark" ? "hunterAnatomy" : "ancientAnatomy"] =
    kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_bermuda_predators_20261023";
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
  if (kind === "cameroceras") {
    const motion = createCamerocerasMotion(body);
    root.userData.camerocerasMotion = motion.state;
    // 移动轴与捕食轴分开；咬击仍用原尺寸/扫掠规则，但方向必须跟随可见腕冠。
    root.userData.getPredatorForward = (out) =>
      out
        .set(0, 0, -1)
        .applyQuaternion(body.quaternion)
        .applyQuaternion(root.quaternion);
    motions.push((phase, speed, context) => {
      const state = motion.update(phase, speed, context);
      rig.animate(phase, state.travel, state.jet, state.gathering);
    });
  } else
    motions.push((phase, speed) =>
      rig.animate(phase, smooth(0.3, 3, effort(phase, speed))),
    );
}
