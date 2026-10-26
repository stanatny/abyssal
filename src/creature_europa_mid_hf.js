import * as THREE from "three";
import { europaMidAsset } from "./europa_mid_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const EUROPA_HF_MID = new Set([
  "brine_rosette",
  "hinge_walker",
  "lantern_pod",
  "veil_glider",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
function weights(ids, w, o, entries) {
  const pairs = entries
    .filter((e) => e[1] > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const sum = pairs.reduce((s, e) => s + e[1], 0);
  for (let j = 0; j < 4; j++) {
    ids[o + j] = pairs[j]?.[0] ?? 0;
    w[o + j] = (pairs[j]?.[1] ?? 0) / sum;
  }
}
/** 沿实测解剖配置壳瓣、步足、裙叶与双层软翼；独立关节不改变游戏根节点。 */
export function buildEuropaMidHF(kind, root, motions) {
  const anatomy = new THREE.Group();
  anatomy.name = kind + "_anatomy";
  root.add(anatomy);
  const base = new THREE.Bone();
  base.name = kind + "_root";
  anatomy.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, type, extra = {}) => {
    const c = { name, points, type, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      if (i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      (i ? bones[c.ids[i - 1]] : base).add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  if (kind === "brine_rosette") {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      add(
        "valve_" + i,
        [[Math.cos(angle) * 0.13, -0.085, Math.sin(angle) * 0.13]],
        "valve",
        {
          angle,
          axis: new THREE.Vector3(Math.sin(angle), 0, -Math.cos(angle)),
        },
      );
    }
    add("core", [[0, -0.11, 0]], "core");
  } else if (kind === "hinge_walker") {
    for (const side of [-1, 1])
      for (const [i, z] of [-0.16, 0.06, 0.24].entries()) {
        const c = add(
          "leg_" + side + "_" + i,
          [
            [side * 0.12, 0.11, z],
            [side * (i === 1 ? 0.28 : 0.235), 0.005, z + (i - 1) * 0.025],
            [
              side * (i === 1 ? 0.368 : i === 0 ? 0.27 : 0.3),
              -0.128,
              z + (i - 1) * 0.065,
            ],
          ],
          "leg",
          { side, index: i },
        );
        c.hip = new THREE.Vector3(...c.points[0]);
        c.knee = new THREE.Vector3(...c.points[1]);
        c.foot = new THREE.Vector3(...c.points[2]);
        c.upper = c.knee.clone().sub(c.hip);
        c.lower = c.foot.clone().sub(c.knee);
        c.length1 = c.upper.length();
        c.length2 = c.lower.length();
        c.pole = c.knee
          .clone()
          .sub(c.hip.clone().add(c.foot).multiplyScalar(0.5));
        c.target = new THREE.Vector3();
        c.direction = new THREE.Vector3();
        c.bend = new THREE.Vector3();
        c.joint = new THREE.Vector3();
        c.temp = new THREE.Vector3();
        c.inverse = new THREE.Quaternion();
      }
    for (const side of [-1, 1])
      add(
        "antenna_" + side,
        [
          [side * 0.045, 0.15, -0.28],
          [side * 0.06, 0.1, -0.4],
        ],
        "antenna",
        { side },
      );
  } else if (kind === "lantern_pod") {
    for (let i = 0; i < 5; i++) {
      const angle = [0.55, 2.12, 3.14, 4.35, 5.57][i];
      add(
        "skirt_" + i,
        [
          [Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0.29],
          [Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0.41],
        ],
        "skirt",
        {
          angle,
          index: i,
          axis: new THREE.Vector3(Math.sin(angle), -Math.cos(angle), 0),
        },
      );
    }
  } else if (kind === "veil_glider") {
    for (const side of [-1, 1])
      for (let row = 0; row < 3; row++) {
        const z = -0.27 + row * 0.16;
        add(
          "wing_" + side + "_" + row,
          [
            [side * 0.045, 0, z],
            [side * 0.17, 0, z + 0.025],
            [side * 0.3, 0, z + 0.05],
          ],
          "wing",
          { side, index: row },
        );
      }
    add(
      "tail",
      [
        [0, 0, 0.08],
        [0, 0, 0.22],
        [0, 0, 0.36],
        [0, 0, 0.47],
      ],
      "tail",
    );
  } else throw Error("Unknown Europa mid creature");
  const asset = europaMidAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    if (kind === "brine_rosette") {
      const radius = Math.hypot(x, z),
        angle = Math.atan2(z, x),
        entries = [];
      const blend = smooth(0.08, 0.19, radius) * smooth(-0.24, -0.12, y);
      const options = chains
        .filter((c) => c.type === "valve")
        .map((c) => {
          const d = Math.atan2(
            Math.sin(angle - c.angle),
            Math.cos(angle - c.angle),
          );
          return { c, score: Math.exp(-d * d * 6) };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
      const sum = options.reduce((s, v) => s + v.score, 0),
        core =
          (1 - blend) *
          (1 - smooth(0.08, 0.16, radius)) *
          smooth(-0.23, -0.12, y);
      entries.push([0, 1 - blend - core], [chains[6].ids[0], core]);
      for (const v of options)
        entries.push([v.c.ids[0], (blend * v.score) / sum]);
      weights(ids, w, o, entries);
    } else if (kind === "hinge_walker") {
      const side = x < 0 ? -1 : 1,
        legs = chains.filter((c) => c.type === "leg" && c.side === side);
      const options = legs
          .map((c) => ({ c, d: Math.abs(z - c.points[1][2]) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 2),
        blend = smooth(0.105, 0.19, Math.abs(x)) * (1 - smooth(0.13, 0.21, y)),
        entries = [[0, 1 - blend]],
        score = options.map(({ d }) => Math.exp(-d * d * 95)),
        sum = score[0] + score[1];
      for (let j = 0; j < options.length; j++) {
        const tempIds = new Uint16Array(4),
          tempW = new Float32Array(4);
        chainWeights(options[j].c, point, 1, tempIds, tempW, 0);
        for (let k = 0; k < 4; k++)
          if (tempW[k])
            entries.push([tempIds[k], ((blend * score[j]) / sum) * tempW[k]]);
      }
      weights(ids, w, o, entries);
      if (z < -0.28 && Math.abs(x) < 0.12) {
        const ant = chains.find((c) => c.type === "antenna" && c.side === side);
        chainWeights(ant, point, smooth(0.28, 0.38, -z), ids, w, o);
      }
    } else if (kind === "lantern_pod") {
      const angle = Math.atan2(y, x),
        blend = smooth(0.29, 0.38, z),
        options = chains
          .map((c) => {
            const d = Math.atan2(
              Math.sin(angle - c.angle),
              Math.cos(angle - c.angle),
            );
            return { c, score: Math.exp(-d * d * 5) };
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 2),
        sum = options.reduce((s, v) => s + v.score, 0),
        tip = smooth(0.12, 0.24, Math.hypot(x, y)),
        entries = [[0, 1 - blend]];
      for (const { c, score } of options)
        entries.push(
          [c.ids[0], (blend * (1 - tip) * score) / sum],
          [c.ids[1], (blend * tip * score) / sum],
        );
      weights(ids, w, o, entries);
    } else {
      const side = x < 0 ? -1 : 1,
        rows = chains.filter((c) => c.type === "wing" && c.side === side),
        q = THREE.MathUtils.clamp((z + 0.27) / 0.16, 0, 2),
        i = Math.min(1, Math.floor(q)),
        f = q - i,
        span = smooth(0.04, 0.12, Math.abs(x)),
        outer = smooth(0.14, 0.29, Math.abs(x)),
        tipWing = smooth(0.29, 0.43, Math.abs(x)),
        entries = [[0, 1 - span]];
      for (const [c, k] of [
        [rows[i], 1 - f],
        [rows[i + 1], f],
      ])
        entries.push(
          [c.ids[0], span * k * (1 - outer)],
          [c.ids[1], span * k * outer * (1 - tipWing)],
          [c.ids[2], span * k * outer * tipWing],
        );
      weights(ids, w, o, entries);
      if (z > 0.12 && Math.abs(x) < 0.12)
        chainWeights(
          chains.find((c) => c.type === "tail"),
          point,
          smooth(0.12, 0.24, z),
          ids,
          w,
          o,
        );
    }
  });
  const mesh = bindOrganicBody(
    anatomy,
    kind + "_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.18,
  );
  root.userData.hfRig = { kind, mesh, bones, chains, asset };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_europa_mid_20261026";
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
      if (c.type === "valve")
        bones[c.ids[0]].quaternion.setFromAxisAngle(
          c.axis,
          0.025 + 0.025 * Math.sin(t * 0.65 - c.angle * 0.2),
        );
      else if (c.type === "core")
        bones[c.ids[0]].scale.y = 1 + Math.sin(t * 0.75) * 0.06;
      else if (c.type === "antenna")
        c.ids.forEach((id, i) => {
          bones[id].rotation.y = Math.sin(t * 0.65 - i * 0.5) * 0.045 * c.side;
        });
      else if (c.type === "leg") {
        // 三足交替支撑；足尖回程抬起，承重段保持基底高度。
        const phase = t * 1.1 + c.index * Math.PI + (c.side < 0 ? Math.PI : 0),
          stride = 0.018 + drive * 0.008;
        c.target.copy(c.foot);
        c.target.z += Math.cos(phase) * stride;
        c.target.y += Math.max(0, Math.sin(phase)) * 0.022;
        c.direction.copy(c.target).sub(c.hip);
        const distance = THREE.MathUtils.clamp(
          c.direction.length(),
          Math.abs(c.length1 - c.length2) + 0.0001,
          c.length1 + c.length2 - 0.0001,
        );
        c.direction.normalize();
        const along =
            (c.length1 * c.length1 -
              c.length2 * c.length2 +
              distance * distance) /
            (2 * distance),
          height = Math.sqrt(
            Math.max(0, c.length1 * c.length1 - along * along),
          );
        c.bend
          .copy(c.pole)
          .addScaledVector(c.direction, -c.pole.dot(c.direction))
          .normalize();
        c.joint
          .copy(c.hip)
          .addScaledVector(c.direction, along)
          .addScaledVector(c.bend, height);
        bones[c.ids[0]].quaternion.setFromUnitVectors(
          c.temp.copy(c.upper).normalize(),
          c.bend.copy(c.joint).sub(c.hip).normalize(),
        );
        c.inverse.copy(bones[c.ids[0]].quaternion).invert();
        bones[c.ids[1]].quaternion.setFromUnitVectors(
          c.temp.copy(c.lower).normalize(),
          c.bend
            .copy(c.target)
            .sub(c.joint)
            .normalize()
            .applyQuaternion(c.inverse),
        );
      } else if (c.type === "skirt")
        c.ids.forEach((id, i) => {
          bones[id].quaternion.setFromAxisAngle(
            c.axis,
            Math.sin(t * 1.2 - i * 0.7 - c.angle * 0.15) *
              (0.04 + drive * 0.02),
          );
        });
      else if (c.type === "wing")
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(t * 0.85 - c.index * 0.7 - i * 0.65) *
            (0.15 + i * 0.055);
          bones[id].rotation.y =
            c.side * Math.sin(t * 0.85 - c.index * 0.7 - i * 0.65) * 0.025;
        });
      else if (c.type === "tail")
        c.ids.forEach((id, i) => {
          bones[id].rotation.y =
            Math.sin(t * 0.85 - i * 0.65) * (0.035 + i * 0.018);
          bones[id].rotation.x = Math.sin(t * 0.65 - i * 0.5) * 0.035;
        });
    }
  });
}
