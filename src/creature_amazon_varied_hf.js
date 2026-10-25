import * as THREE from "three";
import { amazonVariedAsset } from "./amazon_varied_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { createEelChargeEffect } from "./eel_charge_effect.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

export const AMAZON_HF_VARIED = new Set([
  "red_piranha",
  "electric_eel",
  "river_stingray",
  "amazon_river_turtle",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();

// 按位置连续混合权重；UV 接缝的副本获得完全相同的运动。
function blend(ids, w, o, targets, amount) {
  if (amount <= 0) return;
  const weights = new Map();
  for (let i = 0; i < 4; i++)
    if (w[o + i] > 0)
      weights.set(
        ids[o + i],
        (weights.get(ids[o + i]) || 0) + w[o + i] * (1 - amount),
      );
  for (const [id, value] of targets)
    weights.set(id, (weights.get(id) || 0) + value * amount);
  const pairs = [...weights].sort((a, b) => b[1] - a[1]).slice(0, 4),
    sum = pairs.reduce((s, p) => s + p[1], 0);
  for (let i = 0; i < 4; i++) {
    ids[o + i] = pairs[i]?.[0] ?? 0;
    w[o + i] = (pairs[i]?.[1] ?? 0) / sum;
  }
}

export function buildAmazonVariedHF(kind, root, motions) {
  if (!AMAZON_HF_VARIED.has(kind))
    throw Error("Unknown Amazon varied creature");
  const base = new THREE.Bone();
  base.name = kind + "_root";
  root.add(base);
  const bones = [base],
    chains = [],
    pose = [];
  const add = (name, points, hierarchy = false, extra = {}) => {
    const c = { name, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      const parent = hierarchy && i ? bones[c.ids[i - 1]] : base;
      if (hierarchy && i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      parent.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  let bind;
  if (kind === "red_piranha") {
    const tail = add(
      "tail",
      [0.015, 0.14, 0.25, 0.315].map((z) => [0, 0.005, z]),
      true,
    );
    const pecs = [-1, 1].map((side) =>
      add("pectoral_" + side, [[side * 0.061, -0.09, -0.26]], false, { side }),
    );
    bind = (x, y, z, ids, w, o) => {
      point.set(x, y, z);
      chainWeights(tail, point, smooth(0, 0.2, z), ids, w, o);
      blend(ids, w, o, [[tail.ids.at(-1), 1]], smooth(0.29, 0.335, z));
      const amount =
        smooth(0.066, 0.088, Math.abs(x)) *
        band(-0.29, -0.26, -0.14, -0.11, z) *
        band(-0.18, -0.14, -0.055, -0.025, y);
      blend(ids, w, o, [[pecs[x < 0 ? 0 : 1].ids[0], 1]], amount);
    };
    pose.push((t, drive) => {
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y =
            Math.sin(t * 2.5 - i * 0.55) *
            [0.006, 0.025, 0.065, 0.15][i] *
            (0.7 + drive * 0.3)),
      );
      pecs.forEach((c) => {
        const b = bones[c.ids[0]];
        b.rotation.y = c.side * Math.sin(t * 1.8 + c.side * 0.12) * 0.2;
        b.rotation.z = c.side * Math.sin(t * 1.8 - 0.5) * 0.035;
      });
    });
  }
  if (kind === "electric_eel") {
    // 电鳗的长臀鳍承担主要推进，躯干只有轻微的连续侧移。
    const zs = [
      -0.3, -0.22, -0.14, -0.06, 0.02, 0.1, 0.18, 0.26, 0.34, 0.43, 0.49,
    ];
    const roots = [
      -0.027, -0.032, -0.035, -0.036, -0.032, -0.025, -0.016, -0.007, 0.001,
      0.008, 0.012,
    ];
    const axis = add(
      "body",
      zs.map((z) => [0, 0.012, z]),
    );
    const ribbon = add(
      "anal_ribbon",
      zs.map((z, i) => [0, roots[i], z]),
    );
    const pecs = [-1, 1].map((side) =>
      add("pectoral_" + side, [[side * 0.039, -0.003, -0.345]], false, {
        side,
      }),
    );
    bind = (x, y, z, ids, w, o) => {
      point.set(x, y, z);
      chainWeights(axis, point, smooth(-0.36, -0.22, z), ids, w, o);
      const near = nearestChain(point, ribbon),
        a = ribbon.ids.indexOf(near.a),
        b = ribbon.ids.indexOf(near.b);
      const rootY = THREE.MathUtils.lerp(roots[a], roots[b], near.t);
      const amount =
        smooth(0.001, 0.016, rootY - y) *
        (1 - smooth(0.007, 0.016, Math.abs(x))) *
        band(-0.33, -0.25, 0.46, 0.5, z);
      blend(
        ids,
        w,
        o,
        [
          [near.a, 1 - near.t],
          [near.b, near.t],
        ],
        amount,
      );
      blend(
        ids,
        w,
        o,
        [[pecs[x < 0 ? 0 : 1].ids[0], 1]],
        smooth(0.043, 0.062, Math.abs(x)) *
          band(-0.37, -0.35, -0.3, -0.28, z) *
          band(-0.05, -0.03, 0.015, 0.03, y),
      );
    };
    pose.push((t, drive) => {
      zs.forEach((z, i) => {
        const wave = t * 1.65 - z * 4,
          amp = 0.009 * smooth(-0.3, 0.5, z);
        for (const id of [axis.ids[i], ribbon.ids[i]]) {
          bones[id].position.x = Math.sin(wave) * amp;
          bones[id].rotation.y = Math.cos(wave) * amp * 3;
        }
        bones[ribbon.ids[i]].rotation.z =
          Math.sin(t * 4.2 - (z + 0.3) * 15) * (0.52 + drive * 0.18);
      });
      pecs.forEach((c) => {
        bones[c.ids[0]].rotation.y = c.side * Math.sin(t * 1.7) * 0.18;
      });
    });
  }
  if (kind === "river_stingray") {
    // 沿圆盘前后传播边缘波，中央头胸保持稳定，尾刺不承担扇翼推进。
    const zs = [-0.43, -0.33, -0.23, -0.13, -0.03];
    const wings = [-1, 1].map((side) =>
      add(
        "disc_" + side,
        zs.map((z) => [side * 0.1, -0.01, z]),
        false,
        { side },
      ),
    );
    const tail = add(
      "tail",
      [0.035, 0.15, 0.28, 0.4, 0.48].map((z) => [0, -0.015, z]),
      true,
    );
    bind = (x, y, z, ids, w, o) => {
      ids[o] = 0;
      w[o] = 1;
      if (z > 0.035) {
        point.set(x, y, z);
        chainWeights(tail, point, smooth(0.035, 0.12, z), ids, w, o);
      }
      const wing = wings[x < 0 ? 0 : 1];
      point.set(x, y, z);
      const n = nearestChain(point, wing);
      const margin =
        smooth(0.105, 0.265, Math.abs(x)) * band(-0.5, -0.42, -0.015, 0.065, z);
      blend(
        ids,
        w,
        o,
        [
          [n.a, 1 - n.t],
          [n.b, n.t],
        ],
        margin,
      );
    };
    pose.push((t, drive) => {
      wings.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side * Math.sin(t * 2.3 - i * 0.72) * (0.24 + drive * 0.06);
        }),
      );
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y =
            Math.sin(t * 1.4 - i * 0.55) *
            [0.014, 0.028, 0.045, 0.055, 0.035][i]),
      );
    });
  }
  if (kind === "amazon_river_turtle") {
    // 河龟用四只蹼足交替划水；壳体不弯曲，前后足各自在真实根部转动。
    const limbs = [];
    for (const side of [-1, 1])
      for (const front of [true, false]) {
        const z = front ? -0.215 : 0.205,
          tipZ = front ? (side < 0 ? -0.235 : -0.3) : 0.285;
        limbs.push(
          add(
            (front ? "fore" : "hind") + side,
            [
              [side * 0.185, -0.075, z],
              [side * 0.24, -0.115, tipZ],
            ],
            true,
            { side, front },
          ),
        );
      }
    const neck = add("neck", [[0, 0.035, -0.26]]),
      tail = add("tail", [[0, -0.015, 0.355]]);
    bind = (x, y, z, ids, w, o) => {
      ids[o] = 0;
      w[o] = 1;
      const front = z < 0,
        side = x < 0 ? -1 : 1,
        c = limbs.find((l) => l.side === side && l.front === front);
      const width =
        0.29 * Math.sqrt(Math.max(0, 1 - ((z - 0.035) / 0.335) ** 2));
      const exposed = Math.max(
        smooth(-0.01, 0.09, Math.abs(x) - width),
        1 - smooth(-0.15, -0.06, y),
      );
      const limbWeight =
        exposed *
        smooth(0.07, 0.15, Math.abs(x)) *
        (1 - smooth(-0.06, -0.02, y)) *
        (front
          ? band(-0.55, -0.45, -0.13, -0.08, z)
          : band(0.13, 0.18, 0.44, 0.5, z));
      point.set(x, y, z);
      const n = nearestChain(point, c);
      blend(
        ids,
        w,
        o,
        [
          [n.a, 1 - n.t],
          [n.b, n.t],
        ],
        limbWeight,
      );
      blend(
        ids,
        w,
        o,
        [[neck.ids[0], 1]],
        (1 - smooth(-0.36, -0.265, z)) * (1 - smooth(0.09, 0.13, Math.abs(x))),
      );
      blend(
        ids,
        w,
        o,
        [[tail.ids[0], 1]],
        smooth(0.35, 0.4, z) * (1 - smooth(0.06, 0.1, Math.abs(x))),
      );
    };
    pose.push((t, drive) => {
      limbs.forEach((c) => {
        const phase =
            t * 1.65 + (c.side < 0 ? Math.PI : 0) + (c.front ? 0 : Math.PI),
          stroke = Math.sin(phase),
          root = bones[c.ids[0]],
          foot = bones[c.ids[1]];
        root.rotation.y = c.side * stroke * (0.18 + drive * 0.08);
        root.rotation.x = Math.cos(phase) * 0.08;
        foot.rotation.x = Math.sin(phase - 0.7) * 0.16;
        foot.rotation.z = c.side * Math.cos(phase) * 0.12;
      });
      bones[neck.ids[0]].rotation.y = Math.sin(t * 0.85) * 0.025;
      bones[tail.ids[0]].rotation.y = Math.sin(t * 1.35) * 0.1;
    });
  }
  const asset = amazonVariedAsset(kind, bind);
  const mesh = bindOrganicBody(
    root,
    kind + "_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.16,
  );
  if (asset.details) {
    const detail = new THREE.Mesh(
      asset.details.geometry,
      asset.details.material,
    );
    detail.name = kind + "_ventral_details";
    detail.userData.keepSeparate = true;
    root.add(detail);
  }
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.artRevision = "trellis_amazon_varied_20261025";
  root.userData.normalizedLength = 1;
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  const charge = kind === "electric_eel" ? createEelChargeEffect(root) : null;
  if (charge) {
    root.userData.electricCharge = charge;
    root.userData.setHunterPhase = charge.setPhase;
  }
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
      charge?.dispose();
    }
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const drive = smooth(0.3, 3, effort(phase, speed));
    for (const apply of pose) apply(phase, drive);
  });
}
