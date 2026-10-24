import * as THREE from "three";
import { marianaFinalAsset } from "./mariana_final_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b),
  band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x)),
  point = new THREE.Vector3();
/** 秀尼鱼龙采用尾部侧摆和四鳍肢微调，玻璃虾采用腹节与腹足推进。 */
export function buildMarianaFinalHF(kind, root, motions) {
  const base = new THREE.Bone();
  base.name = kind + "_root";
  root.add(base);
  const bones = [base],
    chains = [];
  function add(
    name,
    points,
    type,
    parent = base,
    parentPoint = [0, 0, 0],
    extra = {},
  ) {
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
  }
  const prawn = kind === "glass_prawn";
  let bind, pose;
  if (!prawn) {
    const zs = [-0.08, 0.08, 0.21, 0.32, 0.39],
      tail = add(
        "tail",
        zs.map((z) => [0, 0.02, z]),
        "tail",
      ),
      fins = [];
    for (const side of [-1, 1])
      for (const rear of [false, true]) {
        const pos = [side * 0.07, -0.022, rear ? 0.12 : -0.21],
          support = rear ? 1 : 0;
        fins.push(
          add(
            (rear ? "pelvic_" : "pectoral_") + side,
            [pos],
            rear ? "pelvic" : "pectoral",
            rear ? bones[tail.ids[support]] : base,
            rear ? tail.points[support] : [0, 0, 0],
            { side, rear },
          ),
        );
      }
    bind = (x, y, z, ids, w, o) => {
      point.set(x, y, z);
      chainWeights(tail, point, smooth(-0.12, 0.1, z), ids, w, o);
      const fan = smooth(0.35, 0.4, z);
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
      ids[o + 3] = tail.ids.at(-1);
      w[o + 3] = fan;
      for (const c of fins) {
        if ((x < 0 ? -1 : 1) !== c.side) continue;
        const f =
          smooth(0.075, 0.105, Math.abs(x)) *
          (c.rear
            ? band(0.085, 0.12, 0.24, 0.27, z)
            : band(-0.255, -0.22, -0.13, -0.1, z)) *
          (1 - smooth(-0.005, 0.02, y));
        if (f <= 0) continue;
        for (let j = 0; j < 4; j++) w[o + j] *= 1 - f;
        w[o] += w[o + 3];
        ids[o + 3] = c.ids[0];
        w[o + 3] = f;
      }
    };
    pose = (phase, drive) => {
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y =
            Math.sin(phase * 1.15 - i * 0.68) *
            [0.008, 0.025, 0.055, 0.08, 0.1][i] *
            (0.8 + 0.2 * drive)),
      );
      for (const c of fins) {
        const b = bones[c.ids[0]];
        b.rotation.z =
          c.side *
          (Math.sin(phase * 0.8 + (c.rear ? 1.2 : 0)) * 0.055 - drive * 0.025);
        b.rotation.y =
          c.side *
          (Math.sin(phase * 0.7 + (c.rear ? 0.8 : 0)) * 0.045 + drive * 0.025);
      }
    };
  } else {
    const abdomen = add(
        "abdomen",
        [
          [0, 0.018, 0.055],
          [0, 0.01, 0.13],
          [0, -0.003, 0.205],
          [0, -0.025, 0.28],
          [0, -0.05, 0.35],
          [0, -0.08, 0.42],
        ],
        "tail",
      ),
      legs = [],
      swimmers = [],
      antennae = [];
    for (const side of [-1, 1]) {
      [-0.15, -0.1, -0.045, 0.005, 0.05].forEach((z, i) =>
        legs.push(
          add(
            "leg_" + side + "_" + i,
            [[side * 0.038, -0.022, z]],
            "leg",
            base,
            [0, 0, 0],
            { side, index: i, z },
          ),
        ),
      );
      [0.105, 0.155, 0.2, 0.245, 0.29].forEach((z, i) => {
        const parent = Math.max(
          0,
          abdomen.points.findLastIndex((p) => p[2] <= z),
        );
        swimmers.push(
          add(
            "pleopod_" + side + "_" + i,
            [[side * 0.022, -0.022 - i * 0.004, z]],
            "leg",
            bones[abdomen.ids[parent]],
            abdomen.points[parent],
            { side, index: i, z },
          ),
        );
      });
      antennae.push(
        add(
          "antenna_" + side,
          [
            [side * 0.02, 0.055, -0.195],
            [side * 0.065, 0.08, -0.3],
            [side * 0.085, 0.1, -0.4],
          ],
          "antenna",
          base,
          [0, 0, 0],
          { side },
        ),
      );
    }
    const blendBone = (ids, w, o, id, amount) => {
      const weights = new Map();
      for (let j = 0; j < 4; j++)
        weights.set(
          ids[o + j],
          (weights.get(ids[o + j]) || 0) + w[o + j] * (1 - amount),
        );
      weights.set(id, (weights.get(id) || 0) + amount);
      const picked = [...weights].sort((a, b) => b[1] - a[1]).slice(0, 4),
        total = picked.reduce((v, x) => v + x[1], 0);
      for (let j = 0; j < 4; j++) {
        ids[o + j] = picked[j]?.[0] ?? 0;
        w[o + j] = (picked[j]?.[1] ?? 0) / total;
      }
    };
    bind = (x, y, z, ids, w, o) => {
      point.set(x, y, z);
      chainWeights(abdomen, point, smooth(0.035, 0.11, z), ids, w, o);
      const fan = smooth(0.37, 0.42, z);
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - fan;
      ids[o + 3] = abdomen.ids.at(-1);
      w[o + 3] = fan;
      const side = x < 0 ? -1 : 1;
      if (z < -0.22) {
        const c = antennae.find((c) => c.side === side),
          a =
            (1 - smooth(-0.27, -0.22, z)) *
            smooth(0.012, 0.03, Math.abs(x)) *
            smooth(0.045, 0.065, y);
        if (a > 0) chainWeights(c, point, a, ids, w, o);
      }
      const legBlend =
        (1 - smooth(-0.052, -0.025, y)) * band(-0.3, -0.245, 0.065, 0.09, z);
      if (legBlend > 0) {
        const c = legs
          .filter((c) => c.side === side)
          .sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0];
        blendBone(ids, w, o, c.ids[0], legBlend);
      }
      const leafBlend =
        (1 - smooth(-0.058, -0.028, y)) * band(0.065, 0.09, 0.32, 0.35, z);
      if (leafBlend > 0) {
        const c = swimmers
          .filter((c) => c.side === side)
          .sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0];
        blendBone(ids, w, o, c.ids[0], leafBlend);
      }
    };
    pose = (phase, drive) => {
      const beat = phase * 2.2,
        pulse = Math.pow(Math.max(0, Math.sin(phase * 1.5)), 6) * drive;
      abdomen.ids.forEach((id, i) => {
        bones[id].rotation.x =
          (Math.sin(beat * 0.55 - i * 0.45) * 0.014 + pulse * 0.025) * i;
        bones[id].rotation.y = Math.sin(beat * 0.36 - i * 0.5) * 0.005 * i;
      });
      for (const c of swimmers) {
        const b = bones[c.ids[0]];
        b.rotation.x =
          Math.sin(beat * 1.5 - c.index * 0.7) * (0.2 + 0.12 * drive);
        b.rotation.z =
          c.side * (0.025 + Math.cos(beat * 1.5 - c.index * 0.7) * 0.025);
      }
      for (const c of legs) {
        const b = bones[c.ids[0]];
        b.rotation.x =
          Math.sin(beat - c.index * 0.6 + c.side * 0.25) *
          (0.07 + 0.035 * drive);
        b.rotation.z = c.side * Math.cos(beat - c.index * 0.6) * 0.035;
      }
      for (const c of antennae)
        c.ids.forEach((id, i) => {
          bones[id].rotation.y =
            c.side * Math.sin(phase * 0.8 - i * 0.7) * [0.008, 0.02, 0.035][i];
          bones[id].rotation.x =
            Math.sin(phase * 0.65 - i * 0.8) * [0.007, 0.015, 0.025][i];
        });
    };
  }
  const asset = marianaFinalAsset(kind, bind),
    mesh = bindOrganicBody(
      root,
      kind + "_hf_body",
      asset.geometry,
      asset.material,
      bones,
      0.2,
    );
  root.userData.hfRig = { kind, mesh, bones, chains };
  root.userData.normalizedLength = 1;
  if (!prawn) root.userData.ancientAnatomy = kind;
  root.userData.artRevision = "trellis_mariana_final_20261024";
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
  motions.push((phase, speed) =>
    pose(phase, smooth(0.3, 3, effort(phase, speed))),
  );
}
