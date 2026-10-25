import * as THREE from "three";
import { amazonCrocAsset } from "./amazon_croc_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
export const AMAZON_HF_CROCS = new Set([
  "black_caiman",
  "saltwater_crocodile",
  "purussaurus",
  "rootback_colossus",
]);
// 离线俯视、侧视实测的肩/髋、肘/膝与足根，不套用旧模型关节坐标。
const FIT = {
  black_caiman: {
    front: [
      [0.067, -0.018, -0.285],
      [0.12, -0.04, -0.25],
      [0.15, -0.052, -0.175],
    ],
    rear: [
      [0.06, -0.018, -0.035],
      [0.105, -0.037, 0.015],
      [0.126, -0.055, 0.09],
    ],
    jaw: [0, 0.005, -0.355],
  },
  saltwater_crocodile: {
    front: [
      [0.073, -0.018, -0.28],
      [0.13, -0.043, -0.235],
      [0.169, -0.06, -0.15],
    ],
    rear: [
      [0.063, -0.015, -0.04],
      [0.12, -0.035, 0.01],
      [0.15, -0.055, 0.09],
    ],
    jaw: [0, 0.003, -0.34],
  },
  purussaurus: {
    front: [
      [0.095, -0.025, -0.23],
      [0.15, -0.07, -0.15],
      [0.185, -0.115, -0.065],
    ],
    rear: [
      [0.078, -0.002, 0.025],
      [0.12, -0.025, 0.09],
      [0.15, -0.064, 0.18],
    ],
    jaw: [0, 0, -0.34],
  },
  rootback_colossus: {
    front: [
      [0.075, -0.012, -0.3],
      [0.125, -0.054, -0.26],
      [0.162, -0.09, -0.2],
    ],
    rear: [
      [0.064, -0.015, -0.075],
      [0.1, -0.055, -0.02],
      [0.107, -0.092, 0.055],
    ],
    jaw: [0, 0, -0.36],
  },
};
/** 保留既有世界速度与动作时钟，以后躯尾波推进，前后足沿体侧收拢。 */
export function buildAmazonCrocHF(kind, root, motions) {
  const fit = FIT[kind],
    base = new THREE.Bone();
  base.name = kind + "_root";
  root.add(base);
  const bones = [base],
    chains = [];
  const add = (
    name,
    points,
    type,
    extra = {},
    parent = base,
    parentPoint = [0, 0, 0],
  ) => {
    const c = { name, points, type, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position
        .fromArray(p)
        .sub(new THREE.Vector3(...(i ? points[i - 1] : parentPoint)));
      (i ? bones[c.ids[i - 1]] : parent).add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  const tail = add(
    "axis",
    [-0.12, -0.02, 0.08, 0.18, 0.28, 0.38, 0.48].map((z) => [0, -0.012, z]),
    "tail",
  );
  const limbs = [];
  for (const side of [-1, 1])
    for (const rear of [false, true]) {
      const points = fit[rear ? "rear" : "front"].map(([x, y, z]) => [
        side * x,
        y,
        z,
      ]);
      const support = rear
        ? Math.max(
            0,
            tail.points.findLastIndex((p) => p[2] <= points[0][2]),
          )
        : -1;
      limbs.push(
        add(
          (rear ? "hind_" : "fore_") + side,
          points,
          "leg",
          { side, rear },
          support < 0 ? base : bones[tail.ids[support]],
          support < 0 ? [0, 0, 0] : tail.points[support],
        ),
      );
    }
  const jaw = add("jaw", [fit.jaw], "jaw");
  const bind = (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(-0.12, 0.035, z), ids, w, o);
    const blend = (parts, f) => {
      if (f <= 0) return;
      const all = new Map();
      for (let j = 0; j < 4; j++)
        all.set(ids[o + j], (all.get(ids[o + j]) || 0) + w[o + j] * (1 - f));
      for (const [id, v] of parts) all.set(id, (all.get(id) || 0) + v * f);
      const best = [...all].sort((a, b) => b[1] - a[1]).slice(0, 4),
        sum = best.reduce((s, p) => s + p[1], 0);
      for (let j = 0; j < 4; j++) {
        ids[o + j] = best[j]?.[0] || 0;
        w[o + j] = (best[j]?.[1] || 0) / sum;
      }
    };
    for (const c of limbs) {
      if (Math.sign(x) !== c.side) continue;
      const p = c.points[0],
        end = c.points.at(-1),
        inner = Math.max(0.025, Math.abs(p[0]) - 0.2 * Math.max(0, z - p[2])),
        f =
          smooth(inner - 0.012, inner + 0.035, Math.abs(x)) *
          (1 - smooth(p[1] + 0.006, p[1] + 0.04, y)) *
          smooth(p[2] - 0.05, p[2] - 0.01, z) *
          (1 - smooth(end[2] + 0.12, end[2] + 0.18, z));
      if (f) {
        const n = nearestChain(point, c);
        blend(
          [
            [n.a, 1 - n.t],
            [n.b, n.t],
          ],
          f * (1 - smooth(0.055, 0.12, Math.sqrt(n.distance))),
        );
      }
    }
    const j =
      (1 - smooth(fit.jaw[2] - 0.04, fit.jaw[2] + 0.01, z)) *
      (1 - smooth(fit.jaw[1] - 0.022, fit.jaw[1] - 0.006, y));
    blend([[jaw.ids[0], 1]], j);
  };
  const asset = amazonCrocAsset(kind, bind),
    mesh = bindOrganicBody(
      root,
      kind + "_hf_body",
      asset.geometry,
      asset.material,
      bones,
      0.3,
    );
  root.userData.hfRig = { kind, mesh, bones, chains, asset };
  root.userData.normalizedLength = 1;
  root.userData.amazonAnatomy = kind;
  root.userData.artRevision = "trellis_amazon_crocs_20261025";
  root.userData.aquaticUpright = true;
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let previous,
    state = "idle",
    tension = 0,
    disposed = false;
  const effort = lordEffortSmoother();
  root.userData.setHunterPhase = (value) => {
    state = value;
  };
  root.userData.setBossPhase = root.userData.setHunterPhase;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  motions.push((t, speed) => {
    if (previous === t) return;
    const dt =
      previous === undefined || t < previous
        ? 0
        : Math.min(0.12, (t - previous) / (1.7 + speed * 1.1));
    previous = t;
    const drive = smooth(0.2, 3, effort(t, speed));
    tension +=
      ((state === "attack" ? 0.9 : state === "windup" ? 0.45 : 0) - tension) *
      (1 - Math.exp(-dt * 9));
    let prior = 0;
    tail.ids.forEach((id, i) => {
      const u = i / (tail.ids.length - 1),
        angle = Math.sin(t * 0.82 - u * 4.2) * smooth(0, 0.5, u) * 0.44;
      const b = bones[id];
      b.rotation.set(0, angle - prior, 0);
      prior = angle;
    });
    for (const c of limbs) {
      const b = bones[c.ids[0]],
        lower = bones[c.ids[1]],
        foot = bones[c.ids[2]];
      b.rotation.y = -c.side * ((c.rear ? 0.3 : 0.34) + drive * 0.12);
      b.rotation.z = c.side * (c.rear ? 0.14 : 0.2);
      b.rotation.x = Math.sin(t * 0.52 + (c.rear ? 1.7 : 0)) * 0.012;
      lower.rotation.y = -c.side * 0.025;
      foot.rotation.z = c.side * 0.025;
    }
    bones[jaw.ids[0]].rotation.x = -0.1 * tension;
  });
}
