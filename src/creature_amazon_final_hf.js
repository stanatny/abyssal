import * as THREE from "three";
import { amazonFinalAsset } from "./amazon_final_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const AMAZON_HF_FINAL = new Set([
  "green_anaconda",
  "titanoboa",
  "stupendemys",
  "flood_arapaima",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
// 同坐标的 UV 副本保持同一权重，所有分支在真实附着处渐变。
function blend(ids, w, o, targets, amount) {
  if (amount <= 0) return;
  const merged = new Map();
  for (let j = 0; j < 4; j++)
    if (w[o + j] > 0)
      merged.set(
        ids[o + j],
        (merged.get(ids[o + j]) || 0) + w[o + j] * (1 - amount),
      );
  for (const [id, weight] of targets)
    merged.set(id, (merged.get(id) || 0) + weight * amount);
  const pairs = [...merged].sort((a, b) => b[1] - a[1]).slice(0, 4),
    sum = pairs.reduce((s, p) => s + p[1], 0);
  for (let j = 0; j < 4; j++) {
    ids[o + j] = pairs[j]?.[0] ?? 0;
    w[o + j] = (pairs[j]?.[1] ?? 0) / sum;
  }
}
export function buildAmazonFinalHF(kind, root, motions) {
  if (!AMAZON_HF_FINAL.has(kind)) throw Error("Unknown Amazon final creature");
  const base = new THREE.Bone();
  base.name = kind + "_root";
  root.add(base);
  const bones = [base],
    chains = [],
    poses = [];
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
  if (kind === "green_anaconda" || kind === "titanoboa") {
    // 原始重建中轴已离线拉直；连续侧波从颈后向尾端传播，不让头随整身大幅甩动。
    const axial = add(
      "axial",
      Array.from({ length: 21 }, (_, i) => [0, 0, -0.405 + (i * 0.88) / 20]),
      true,
      { type: "tail" },
    );
    bind = (x, y, z, ids, w, o) => {
      point.set(x, y, z);
      chainWeights(axial, point, smooth(-0.42, -0.36, z), ids, w, o);
    };
    poses.push((phase, drive) => {
      let prior = 0;
      axial.ids.forEach((id, i) => {
        const t = i / 20,
          tangent =
            Math.sin(phase * 0.85 - t * Math.PI * 2.6) *
            smooth(0, 0.23, t) *
            (kind === "titanoboa" ? 0.47 : 0.52) *
            (0.82 + 0.18 * drive);
        bones[id].rotation.y = tangent - prior;
        prior = tangent;
      });
    });
    root.userData.aquaticUpright = true;
  }
  if (kind === "stupendemys") {
    // 淡水侧颈龟：四只蹼足交替做后推及羽化回收，壳体保持刚性。
    const limbs = [];
    for (const side of [-1, 1])
      for (const front of [true, false])
        limbs.push(
          add(
            (front ? "fore" : "hind") + side,
            front
              ? [
                  [side * 0.145, -0.065, -0.245],
                  [side * 0.265, -0.11, -0.22],
                ]
              : [
                  [side * 0.175, -0.065, 0.265],
                  [side * 0.275, -0.09, 0.365],
                ],
            true,
            { side, front, type: "leg" },
          ),
        );
    const neck = add("neck", [[0, 0, -0.305]]),
      tail = add("tail", [[0, -0.015, 0.395]]);
    bind = (x, y, z, ids, w, o) => {
      ids[o] = 0;
      w[o] = 1;
      const c = limbs.find(
          (c) => c.side === (x < 0 ? -1 : 1) && c.front === z < 0,
        ),
        width = 0.295 * Math.sqrt(Math.max(0, 1 - ((z - 0.025) / 0.36) ** 2));
      const exposed = Math.max(
        smooth(-0.008, 0.065, Math.abs(x) - width),
        1 - smooth(-0.155, -0.105, y),
      );
      const amount =
        exposed *
        smooth(0.1, 0.19, Math.abs(x)) *
        (1 - smooth(-0.055, -0.005, y)) *
        (z < 0
          ? band(-0.33, -0.28, -0.14, -0.09, z)
          : band(0.19, 0.24, 0.46, 0.5, z));
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
        amount,
      );
      blend(
        ids,
        w,
        o,
        [[neck.ids[0], 1]],
        (1 - smooth(-0.365, -0.305, z)) *
          (1 - smooth(0.065, 0.12, Math.abs(x))),
      );
      blend(
        ids,
        w,
        o,
        [[tail.ids[0], 1]],
        smooth(0.385, 0.435, z) * (1 - smooth(0.04, 0.075, Math.abs(x))),
      );
    };
    poses.push((phase, drive) => {
      for (const c of limbs) {
        const beat =
            phase * 1.55 + (c.side < 0 ? Math.PI : 0) + (c.front ? 0 : Math.PI),
          b = bones[c.ids[0]],
          foot = bones[c.ids[1]];
        b.rotation.y = c.side * Math.sin(beat) * (0.2 + 0.1 * drive);
        b.rotation.x = Math.cos(beat) * 0.065;
        foot.rotation.x = Math.sin(beat - 0.8) * 0.2;
        foot.rotation.z = c.side * Math.cos(beat) * 0.16;
      }
      bones[neck.ids[0]].rotation.y = Math.sin(phase * 0.75) * 0.028;
      bones[tail.ids[0]].rotation.y = Math.sin(phase * 1.2) * 0.11;
    });
  }
  if (kind === "flood_arapaima") {
    const tail = add(
      "tail",
      [
        [0, 0, -0.12],
        [0, 0, 0.04],
        [0, 0, 0.22],
        [0, 0, 0.37],
      ],
      true,
      { type: "tail" },
    );
    const fins = [-1, 1].map((side) =>
      add("pectoral" + side, [[side * 0.05, -0.065, -0.3]], false, {
        side,
        type: "pectoral",
      }),
    );
    bind = (x, y, z, ids, w, o) => {
      point.set(x, y, z);
      chainWeights(tail, point, smooth(-0.16, 0.09, z), ids, w, o);
      blend(ids, w, o, [[tail.ids.at(-1), 1]], smooth(0.36, 0.41, z));
      const weight =
        smooth(0.055, 0.105, Math.abs(x)) *
        band(-0.35, -0.31, -0.21, -0.18, z) *
        band(-0.15, -0.11, -0.02, 0.015, y);
      blend(ids, w, o, [[fins[x < 0 ? 0 : 1].ids[0], 1]], weight);
    };
    poses.push((phase, drive) => {
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y =
            Math.sin(phase * 1.7 - i * 0.6) *
            [0.008, 0.028, 0.06, 0.13][i] *
            (0.75 + 0.25 * drive)),
      );
      for (const c of fins) {
        const b = bones[c.ids[0]];
        b.rotation.y =
          c.side *
          (Math.sin(phase * 1.45 + c.side * 0.13) * 0.17 - drive * 0.025);
        b.rotation.z = c.side * Math.sin(phase * 1.45 - 0.6) * 0.025;
      }
    });
  }
  const asset = amazonFinalAsset(kind, bind),
    mesh = bindOrganicBody(
      root,
      kind + "_hf_body",
      asset.geometry,
      asset.material,
      bones,
      0.18,
    );
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.artRevision = "trellis_amazon_final_20261025";
  root.userData.normalizedLength = 1;
  root.userData.amazonAnatomy = kind;
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
    for (const apply of poses) apply(phase, drive);
  });
}
