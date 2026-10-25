import * as THREE from "three";
import { amazonRiverAsset } from "./amazon_river_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

export const AMAZON_HF_RIVER = new Set([
  "amazon_pacu",
  "silver_arowana",
  "arapaima",
  "redtail_catfish",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
// 位置按实际 HF 表面拟合，-Z 为头部；躯干保持稳定，柔软鳍缘独立微调。
const ANATOMY = {
  amazon_pacu: {
    tail: [0.02, 0.14, 0.25, 0.34],
    tailY: -0.015,
    blend: [0.01, 0.2],
    fan: [0.29, 0.35],
    pec: [0.075, -0.115, -0.31],
    edge: [0.084, 0.13],
    span: [-0.35, -0.3, -0.05, 0],
    height: [-0.2, -0.15, 0, 0.03],
    beat: 2.15,
    amplitude: [0.006, 0.025, 0.055, 0.13],
    finBeat: 1.7,
    finSweep: 0.16,
  },
  silver_arowana: {
    tail: [-0.14, 0.02, 0.19, 0.36],
    tailY: 0.005,
    blend: [-0.21, 0.1],
    fan: [0.37, 0.405],
    pec: [0.032, -0.032, -0.28],
    edge: [0.045, 0.09],
    span: [-0.3, -0.26, 0, 0.03],
    height: [-0.1, -0.07, 0.02, 0.04],
    beat: 2.3,
    amplitude: [0.012, 0.035, 0.065, 0.12],
    finBeat: 1.8,
    finSweep: 0.16,
    median: {
      z: [-0.015, 0.1, 0.23, 0.35],
      upper: [0.08, 0.075, 0.055, 0.025],
      lower: [-0.085, -0.08, -0.055, -0.025],
    },
  },
  arapaima: {
    tail: [-0.12, 0.04, 0.22, 0.37],
    tailY: -0.005,
    blend: [-0.16, 0.09],
    fan: [0.36, 0.41],
    pec: [0.047, -0.049, -0.29],
    edge: [0.054, 0.115],
    span: [-0.31, -0.28, -0.15, -0.1],
    height: [-0.14, -0.11, -0.025, 0],
    beat: 1.9,
    amplitude: [0.008, 0.03, 0.065, 0.14],
    finBeat: 1.45,
    finSweep: 0.16,
  },
  redtail_catfish: {
    tail: [-0.05, 0.11, 0.25, 0.34],
    tailY: -0.04,
    blend: [-0.08, 0.14],
    fan: [0.28, 0.36],
    pec: [0.075, -0.06, -0.27],
    edge: [0.085, 0.145],
    span: [-0.3, -0.25, -0.1, -0.06],
    height: [-0.16, -0.14, -0.02, 0],
    beat: 1.9,
    amplitude: [0.006, 0.03, 0.07, 0.12],
    finBeat: 1.4,
    finSweep: 0.13,
    // 六根须沿实际表面分别拟合，已计入离线轴向修正后的平移。
    barbels: [
      [
        [-0.083, -0.018, -0.405],
        [-0.133, -0.065, -0.325],
        [-0.19, -0.11, -0.24],
        [-0.237, -0.128, -0.126],
      ],
      [
        [0.063, -0.025, -0.417],
        [0.085, -0.055, -0.401],
        [0.159, -0.108, -0.372],
        [0.237, -0.167, -0.303],
      ],
      [
        [-0.065, -0.018, -0.436],
        [-0.1, -0.017, -0.444],
        [-0.15, -0.033, -0.4],
        [-0.16, -0.059, -0.36],
      ],
      [
        [0.045, -0.018, -0.45],
        [0.077, -0.007, -0.497],
        [0.104, 0.012, -0.468],
        [0.109, 0.026, -0.437],
      ],
      [
        [-0.06, -0.04, -0.41],
        [-0.08, -0.064, -0.42],
        [-0.098, -0.088, -0.426],
        [-0.109, -0.107, -0.427],
      ],
      [
        [0.04, -0.04, -0.455],
        [0.047, -0.072, -0.472],
        [0.059, -0.107, -0.488],
        [0.068, -0.131, -0.483],
      ],
    ].map((points) => points.map(([x, y, z]) => [x - 0.022, y, z])),
    barbelRegion: (x, y, z) =>
      z < -0.3 || (z < -0.1 && x < -(0.14 + (0.3 + z) * 0.3)),
  },
};

// 合并最多四个有效权重，接缝副本按位置得到相同结果。
function blendInfluences(ids, w, o, targets, amount) {
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

export function buildAmazonRiverHF(kind, root, motions) {
  const cfg = ANATOMY[kind];
  if (!cfg) throw Error("Unknown Amazon river fish");
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
      const parent =
        hierarchy && i ? bones[c.ids[i - 1]] : (extra.parent ?? base);
      if (hierarchy && i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      else if (extra.parentPoint)
        b.position.sub(new THREE.Vector3(...extra.parentPoint));
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
  );
  const pecs = [-1, 1].map((side) =>
    add(
      "pectoral_" + side,
      [[side * cfg.pec[0], cfg.pec[1], cfg.pec[2]]],
      false,
      { side },
    ),
  );
  const medians = cfg.median
    ? [-1, 1].map((side) => {
        const chain = {
          name: side < 0 ? "anal_fin" : "dorsal_fin",
          points: [],
          ids: [],
          side,
        };
        chains.push(chain);
        cfg.median.z.forEach((z, i) => {
          const y = (side < 0 ? cfg.median.lower : cfg.median.upper)[i],
            p = [0, y, z];
          let support = 0;
          cfg.tail.forEach((value, j) => {
            if (value <= z) support = j;
          });
          const bone = new THREE.Bone();
          bone.name = `${kind}_${chain.name}_${i}`;
          bone.position
            .fromArray(p)
            .sub(new THREE.Vector3(...tail.points[support]));
          bones[tail.ids[support]].add(bone);
          chain.ids.push(bones.length);
          chain.points.push(p);
          bones.push(bone);
        });
        return chain;
      })
    : [];
  const barbels = (cfg.barbels || []).map((points, i) =>
    add("barbel_" + i, points, true),
  );
  const asset = amazonRiverAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.blend, z), ids, w, o);
    blendInfluences(ids, w, o, [[tail.ids.at(-1), 1]], smooth(...cfg.fan, z));
    const pec =
      smooth(...cfg.edge, Math.abs(x)) *
      band(...cfg.span, z) *
      band(...cfg.height, y);
    blendInfluences(ids, w, o, [[pecs[x < 0 ? 0 : 1].ids[0], 1]], pec);
    if (medians.length && Math.abs(x) < 0.025 && z > -0.06 && z < 0.4) {
      const chain = medians[y < 0 ? 0 : 1],
        near = nearestChain(point, chain);
      const ia = chain.ids.indexOf(near.a),
        ib = chain.ids.indexOf(near.b);
      const rootY = THREE.MathUtils.lerp(
        chain.points[ia][1],
        chain.points[ib][1],
        near.t,
      );
      const edge =
        smooth(0, 0.026, (y - rootY) * chain.side) *
        (1 - smooth(0.01, 0.025, Math.abs(x))) *
        band(-0.06, 0.01, 0.35, 0.4, z);
      blendInfluences(
        ids,
        w,
        o,
        [
          [near.a, 1 - near.t],
          [near.b, near.t],
        ],
        edge * 0.85,
      );
    }
    if (barbels.length && cfg.barbelRegion(x, y, z)) {
      let best,
        distance = Infinity;
      for (const chain of barbels) {
        const near = nearestChain(point, chain);
        if (near.distance < distance) {
          best = { chain, near };
          distance = near.distance;
        }
      }
      if (distance < 0.00012) {
        const fromRoot = point.distanceTo(
          new THREE.Vector3(...best.chain.points[0]),
        );
        const blend =
          smooth(0.006, 0.026, fromRoot) *
          Math.max(
            smooth(0.025, 0.06, Math.abs(x)),
            1 - smooth(-0.07, -0.03, y),
          );
        blendInfluences(
          ids,
          w,
          o,
          [
            [best.near.a, 1 - best.near.t],
            [best.near.b, best.near.t],
          ],
          blend,
        );
      }
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.15,
  );
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.amazonAnatomy = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_amazon_river_20261025";
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
        Math.sin(beat - i * 0.6) * cfg.amplitude[i] * (0.72 + drive * 0.28);
    });
    pecs.forEach((c) => {
      const b = bones[c.ids[0]],
        wave = phase * cfg.finBeat + c.side * 0.13;
      b.rotation.y = c.side * (Math.sin(wave) * cfg.finSweep - drive * 0.03);
      b.rotation.z = c.side * Math.sin(wave - 0.6) * 0.022;
    });
    medians.forEach((c) =>
      c.ids.forEach((id, i) => {
        bones[id].rotation.z = -c.side * Math.sin(beat - i * 0.7) * 0.065;
      }),
    );
    barbels.forEach((c, j) =>
      c.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(phase * 1.6 - i * 0.55 + j * 0.8) * 0.014 * (i + 1);
        bones[id].rotation.x = Math.sin(phase * 1.2 - i * 0.5 + j) * 0.012;
      }),
    );
  });
}
