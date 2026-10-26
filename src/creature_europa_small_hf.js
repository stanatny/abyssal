import * as THREE from "three";
import { europaSmallAsset } from "./europa_small_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const EUROPA_HF_SMALL = new Set([
  "glass_seed",
  "ribbon_spore",
  "tripod_bloom",
  "sail_crawler",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
function weights(ids, w, o, entries) {
  const pairs = entries
      .filter((e) => e[1] > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4),
    sum = pairs.reduce((s, e) => s + e[1], 0);
  for (let j = 0; j < 4; j++) {
    ids[o + j] = pairs[j]?.[0] ?? 0;
    w[o + j] = (pairs[j]?.[1] ?? 0) / sum;
  }
}
/** 按实体解剖分开设计晶壳呼吸、膜带波动、三瓣开合与六桨划水；不移动游戏根节点。 */
export function buildEuropaSmallHF(kind, root, motions) {
  const anatomy = new THREE.Group();
  anatomy.name = `${kind}_anatomy`;
  root.add(anatomy);
  const base = new THREE.Bone();
  base.name = `${kind}_root`;
  anatomy.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, type, extra = {}) => {
    const c = { name, points, type, ids: [], ...extra };
    if (type === "petal")
      c.axis = new THREE.Vector3(Math.cos(c.angle), 0, Math.sin(c.angle));
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = `${kind}_${name}_${i}`;
      b.position.fromArray(p);
      const parent = i ? bones[c.ids[i - 1]] : base;
      if (i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      parent.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  if (kind === "glass_seed") {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      add(
        "valve_" + i,
        [[Math.cos(angle) * 0.12, Math.sin(angle) * 0.12, -0.07]],
        "valve",
        { angle },
      );
    }
    for (const side of [-1, 1])
      add("rudder_" + side, [[0, side * 0.05, 0.285]], "rudder", { side });
  } else if (kind === "ribbon_spore") {
    add(
      "membrane_axis",
      Array.from({ length: 12 }, (_, i) => [0, 0, -0.44 + i * 0.08]),
      "ribbon",
    );
  } else if (kind === "tripod_bloom") {
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      add(
        "petal_" + i,
        [
          [Math.sin(angle) * 0.11, 0.01, 0.12 - Math.cos(angle) * 0.11],
          [Math.sin(angle) * 0.28, 0.01, 0.12 - Math.cos(angle) * 0.28],
        ],
        "petal",
        { angle, index: i },
      );
    }
  } else if (kind === "sail_crawler") {
    for (const side of [-1, 1])
      for (const [i, z] of [-0.2, -0.02, 0.19].entries())
        add(
          "paddle_" + side + "_" + i,
          [
            [side * 0.11, -0.15, z],
            [side * 0.23, -0.2, z + (i - 1) * 0.07],
          ],
          "paddle",
          { side, index: i },
        );
    add("sail", [[0, -0.075, -0.06]], "sail");
    for (const side of [-1, 1])
      add(
        "antenna_" + side,
        [
          [side * 0.035, -0.13, -0.3],
          [side * 0.045, -0.15, -0.42],
        ],
        "antenna",
        { side },
      );
  } else throw Error("Unknown Europa small creature");
  const asset = europaSmallAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    if (kind === "glass_seed") {
      const a =
          ((Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 3),
        i = Math.floor(a),
        f = a - i,
        fin = smooth(0.24, 0.34, z),
        side = y < 0 ? 0 : 1;
      weights(ids, w, o, [
        [chains[i].ids[0], (1 - f) * (1 - fin)],
        [chains[(i + 1) % 6].ids[0], f * (1 - fin)],
        [chains[6 + side].ids[0], fin],
      ]);
    } else if (kind === "ribbon_spore") {
      chainWeights(chains[0], point, 1, ids, w, o);
    } else if (kind === "tripod_bloom") {
      const a = Math.atan2(x, -(z - 0.12)),
        rad = Math.hypot(x, z - 0.12),
        blend = smooth(0.09, 0.23, rad),
        entries = [[0, 1 - blend]];
      const candidates = chains
          .map((c) => {
            const angle = Math.atan2(
              Math.sin(a - c.angle),
              Math.cos(a - c.angle),
            );
            return { c, score: Math.exp(-angle * angle * 3) };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 2),
        sum = candidates.reduce((s, e) => s + e.score, 0),
        tip = smooth(0.15, 0.34, rad);
      for (const { c, score } of candidates) {
        entries.push(
          [c.ids[0], (blend * (1 - tip) * score) / sum],
          [c.ids[1], (blend * tip * score) / sum],
        );
      }
      weights(ids, w, o, entries);
    } else {
      const limbs = chains.filter((c) => c.type === "paddle"),
        side = x < 0 ? -1 : 1,
        options = limbs.filter((c) => c.side === side),
        c = options.reduce((a, b) =>
          Math.abs(z - a.points[0][2]) < Math.abs(z - b.points[0][2]) ? a : b,
        ),
        limb =
          smooth(0.115, 0.175, Math.abs(x)) * (1 - smooth(-0.12, -0.07, y));
      chainWeights(c, point, limb, ids, w, o);
      const sail =
        smooth(-0.055, 0.08, y) * (1 - smooth(0.025, 0.055, Math.abs(x)));
      if (sail > 0)
        weights(ids, w, o, [
          [0, 1 - sail],
          [chains.find((c) => c.type === "sail").ids[0], sail],
        ]);
      if (z < -0.29 && Math.abs(x) < 0.08) {
        const ant = chains.find((c) => c.type === "antenna" && c.side === side);
        chainWeights(
          ant,
          point,
          smooth(0.3, 0.42, -z) * smooth(0.012, 0.035, Math.abs(x)),
          ids,
          w,
          o,
        );
      }
    }
  });
  const mesh = bindOrganicBody(
    anatomy,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.18,
  );
  root.userData.hfRig = { kind, mesh, bones, chains, asset };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_europa_small_20261026";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const effort = lordEffortSmoother();
  motions.push((t, speed) => {
    const drive = smooth(0.15, 3, effort(t, speed));
    for (const c of chains) {
      if (c.type === "valve") {
        const b = bones[c.ids[0]],
          opening = (0.5 + 0.5 * Math.sin(t * 0.65)) * 0.009;
        b.position.fromArray(c.points[0]);
        b.position.x += Math.cos(c.angle) * opening;
        b.position.y += Math.sin(c.angle) * opening;
      } else if (c.type === "rudder") {
        bones[c.ids[0]].rotation.y =
          Math.sin(t * 1.7 - c.side * 0.2) * (0.12 + drive * 0.06);
        bones[c.ids[0]].rotation.x = c.side * Math.sin(t * 0.85) * 0.04;
      } else if (c.type === "ribbon") {
        c.ids.forEach((id, i) => {
          const b = bones[id],
            flex = smooth(0, 4, i),
            wave = t * 1.25 - i * 0.72,
            amplitude =
              (0.035 + flex * 0.12 + i * 0.003) * (0.85 + drive * 0.3);
          // 前端轻稳，中后段逐节传递曲率；保留骨长，不把膜带整体上下搬动。
          b.rotation.x =
            Math.sin(wave) * amplitude +
            Math.sin(wave * 1.7 - 0.6) * 0.022 * smooth(7, 11, i);
          b.rotation.y = Math.sin(wave - 0.8) * 0.035 * flex;
          // 缓慢扭转膜面，尾丝叠加滞后的细波；速度已由外层连续相位处理。
          b.rotation.z = Math.sin(t * 0.78 - i * 0.5) * 0.11 * flex;
        });
      } else if (c.type === "petal") {
        const curl = 0.14 + 0.13 * Math.sin(t * 0.7 - c.index * 0.2);
        c.ids.forEach((id, i) => {
          bones[id].quaternion.setFromAxisAngle(c.axis, curl * (i ? 0.65 : 1));
        });
      } else if (c.type === "paddle") {
        const phase = t * 1.25 - c.index * 2.1 + (c.side < 0 ? Math.PI : 0),
          stroke = Math.sin(phase),
          b = bones[c.ids[0]],
          tip = bones[c.ids[1]];
        b.rotation.y = c.side * stroke * (0.23 + drive * 0.1);
        b.rotation.z = c.side * (Math.cos(phase) * 0.07 - 0.035);
        tip.rotation.y = -c.side * stroke * 0.12;
        tip.rotation.x = Math.cos(phase) * 0.16;
      } else if (c.type === "sail") {
        bones[c.ids[0]].rotation.z = Math.sin(t * 0.63) * 0.025;
      } else if (c.type === "antenna") {
        c.ids.forEach((id, i) => {
          bones[id].rotation.y = c.side * Math.sin(t * 0.55 - i * 0.6) * 0.04;
        });
      }
    }
  });
}
