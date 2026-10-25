import * as THREE from "three";
import { amazonRareAsset } from "./amazon_rare_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";

const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
// 根据新翡翠银龙鱼的实体鳍根拟合；不是银龙鱼旧模型的比例重用。
const ANATOMY = {
  jade_arowana: {
    tail: [-0.12, 0.05, 0.22, 0.35],
    tailY: 0.01,
    blend: [-0.2, 0.15],
    fan: [0.35, 0.39],
    pec: [0.033, -0.073, -0.31],
    edge: [0.04, 0.085],
    span: [-0.34, -0.29, -0.1, -0.07],
    height: [-0.24, -0.18, -0.09, -0.065],
    beat: 2.35,
    amplitude: [0.008, 0.025, 0.06, 0.12],
    finBeat: 1.8,
    finSweep: 0.16,
    median: {
      z: [0.08, 0.17, 0.25, 0.32],
      upper: [0.135, 0.13, 0.1, 0.065],
      lower: [-0.1, -0.08, -0.06, -0.04],
    },
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

export function buildAmazonRareHF(kind, root, motions) {
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
  const pelvics = [-1, 1].map((side) =>
    add("pelvic_" + side, [[side * 0.027, -0.105, -0.07]], false, {
      side,
      parent: bones[tail.ids[0]],
      parentPoint: tail.points[0],
    }),
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
  const asset = amazonRareAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(tail, point, smooth(...cfg.blend, z), ids, w, o);
    blendInfluences(ids, w, o, [[tail.ids.at(-1), 1]], smooth(...cfg.fan, z));
    const pec =
      smooth(...cfg.edge, Math.abs(x)) *
      band(...cfg.span, z) *
      band(...cfg.height, y);
    blendInfluences(ids, w, o, [[pecs[x < 0 ? 0 : 1].ids[0], 1]], pec);
    const pelvic =
      smooth(0.016, 0.04, Math.abs(x)) *
      (1 - smooth(-0.135, -0.105, y)) *
      band(-0.1, -0.06, 0.04, 0.07, z);
    blendInfluences(ids, w, o, [[pelvics[x < 0 ? 0 : 1].ids[0], 1]], pelvic);
    if (medians.length && Math.abs(x) < 0.025 && z > 0.035 && z < 0.35) {
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
        band(0.035, 0.08, 0.32, 0.35, z);
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
  root.userData.artRevision = "trellis_amazon_rare_20261025";
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
    pelvics.forEach((c) => {
      const b = bones[c.ids[0]];
      b.rotation.y = c.side * Math.sin(phase * cfg.finBeat - 0.5) * 0.09;
      b.rotation.z = c.side * Math.sin(phase * cfg.finBeat - 1) * 0.015;
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
