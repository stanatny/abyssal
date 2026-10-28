import * as T from "three";
import { odysseyShallowHFAsset } from "./odyssey_shallow_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const ODYSSEY_HF_SHALLOWS = new Set([
  "ambrosia_sprat",
  "moon_scallop",
  "lyre_ray",
  "pearl_seahorse",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 每种解剖使用自身支点；躯干稳定，鳍缘、双壳和卷尾分别处理。 */
export function buildOdysseyShallowHF(kind, root, motions) {
  if (!ODYSSEY_HF_SHALLOWS.has(kind))
    throw Error("Unknown Odyssean shallow HF creature");
  const bodyRoot = new T.Group();
  bodyRoot.name = `${kind}_anatomy`;
  root.add(bodyRoot);
  const base = new T.Bone();
  base.name = `${kind}_root`;
  bodyRoot.add(base);
  const bones = [base],
    chains = [],
    point = new T.Vector3();
  const add = (name, points, hierarchy = false, extra = {}) => {
    const c = { name, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = `${kind}_${name}_${i}`;
      b.position.fromArray(p);
      let parent = base;
      if (hierarchy && i) {
        parent = bones[c.ids[i - 1]];
        b.position.sub(new T.Vector3(...points[i - 1]));
      }
      parent.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  let tail,
    dorsal,
    upper,
    lower,
    mantle,
    pecs = [],
    wings = [];
  if (kind === "ambrosia_sprat") {
    tail = add(
      "tail",
      [
        [0, -0.03, -0.03],
        [0, -0.03, 0.12],
        [0, -0.03, 0.25],
        [0, -0.03, 0.34],
      ],
      true,
    );
    for (const s of [-1, 1])
      pecs.push(
        add("pectoral_" + s, [[s * 0.055, -0.055, -0.29]], false, { side: s }),
      );
    dorsal = add("sail", [[0, 0.06, -0.12]]);
  } else if (kind === "moon_scallop") {
    upper = add("upper_valve", [[0, 0.045, 0.43]]);
    lower = add("lower_valve", [[0, 0.015, 0.43]]);
    mantle = add("mantle", [[0, 0.025, 0]]);
  } else if (kind === "lyre_ray") {
    for (const s of [-1, 1])
      wings.push(
        add(
          "wing_" + s,
          [-0.38, -0.28, -0.18, -0.08, 0.02, 0.09].map((z) => [s * 0.09, 0, z]),
          false,
          { side: s },
        ),
      );
    tail = add(
      "twin_ribbons",
      [
        [0, 0, 0.04],
        [-0.07, 0, 0.18],
        [-0.15, 0, 0.32],
        [-0.22, 0, 0.45],
      ],
      true,
    );
  } else {
    tail = add(
      "curled_tail",
      [
        [0, -0.23, 0.25],
        [0, -0.45, 0.3],
        [0, -0.7, 0.25],
        [0, -0.88, 0.06],
        [0, -0.75, -0.13],
      ],
      true,
    );
    dorsal = add(
      "dorsal",
      [-0.09, -0.025, 0.04, 0.105, 0.17].map((y) => [0, y, 0.285]),
    );
    for (const s of [-1, 1])
      pecs.push(
        add("pectoral_" + s, [[s * 0.09, 0.63, -0.005]], false, { side: s }),
      );
  }
  const asset = odysseyShallowHFAsset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    const single = (id, blend) => {
      for (let j = 0; j < 4; j++) w[o + j] *= 1 - blend;
      ids[o + 3] = id;
      w[o + 3] += blend;
    };
    if (kind === "ambrosia_sprat") {
      chainWeights(tail, point, smooth(-0.12, 0.14, z), ids, w, o);
      if (z > 0.34) {
        ids[o] = tail.ids.at(-1);
        w[o] = 1;
        w[o + 1] = w[o + 2] = 0;
      }
      const fin =
        smooth(0.065, 0.105, Math.abs(x)) *
        (1 - smooth(-0.11, -0.06, z)) *
        smooth(-0.36, -0.29, z) *
        (1 - smooth(-0.01, 0.02, y));
      single(pecs[x < 0 ? 0 : 1].ids[0], fin);
      if (y > 0.06)
        single(
          dorsal.ids[0],
          smooth(0.065, 0.125, y) * (1 - smooth(0.02, 0.1, z)),
        );
    } else if (kind === "moon_scallop") {
      // 上壳、下壳为刚性瓣，中央外套膜仅有柔和收缩；铰链附近连续混合。
      const u = smooth(0.035, 0.06, y),
        l = 1 - smooth(0.0, 0.025, y),
        free = 1 - smooth(0.35, 0.49, z);
      ids[o] = upper.ids[0];
      w[o] = u * free;
      ids[o + 1] = lower.ids[0];
      w[o + 1] = l * free;
      ids[o + 2] = mantle.ids[0];
      w[o + 2] = (1 - u - l) * free;
      ids[o + 3] = 0;
      w[o + 3] = 1 - free;
    } else if (kind === "lyre_ray") {
      if (z > 0.095) {
        chainWeights(tail, point, smooth(0.07, 0.15, z), ids, w, o);
      } else {
        const c = wings[x < 0 ? 0 : 1],
          blend = smooth(0.075, 0.22, Math.abs(x));
        let i = 0;
        while (i < c.points.length - 2 && z > c.points[i + 1][2]) i++;
        const t = T.MathUtils.clamp(
          (z - c.points[i][2]) / (c.points[i + 1][2] - c.points[i][2]),
          0,
          1,
        );
        ids[o] = 0;
        w[o] = 1 - blend;
        ids[o + 1] = c.ids[i];
        w[o + 1] = blend * (1 - t);
        ids[o + 2] = c.ids[i + 1];
        w[o + 2] = blend * t;
      }
    } else {
      chainWeights(tail, point, 1 - smooth(-0.42, -0.23, y), ids, w, o);
      const fin =
        smooth(0.29, 0.35, z) *
        smooth(-0.14, -0.08, y) *
        (1 - smooth(0.18, 0.24, y));
      if (fin > 0) {
        let i = 0;
        while (i < dorsal.points.length - 2 && y > dorsal.points[i + 1][1]) i++;
        const t = T.MathUtils.clamp(
          (y - dorsal.points[i][1]) /
            (dorsal.points[i + 1][1] - dorsal.points[i][1]),
          0,
          1,
        );
        ids[o] = 0;
        w[o] = 1 - fin;
        ids[o + 1] = dorsal.ids[i];
        w[o + 1] = fin * (1 - t);
        ids[o + 2] = dorsal.ids[i + 1];
        w[o + 2] = fin * t;
      }
      const pec =
        smooth(0.095, 0.145, Math.abs(x)) *
        smooth(0.54, 0.59, y) *
        (1 - smooth(0.75, 0.8, y)) *
        smooth(-0.1, -0.04, z) *
        (1 - smooth(0.08, 0.14, z));
      single(pecs[x < 0 ? 0 : 1].ids[0], pec);
    }
  });
  const mesh = bindOrganicBody(
    bodyRoot,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.25,
  );
  const mouth = new T.Object3D();
  mouth.name = `${kind}_mouth`;
  mouth.position.fromArray(
    {
      ambrosia_sprat: [0, -0.025, -0.49],
      moon_scallop: [0, -0.08, -0.45],
      lyre_ray: [0, -0.04, -0.42],
      pearl_seahorse: [0, 0.53, -0.49],
    }[kind],
  );
  base.add(mouth);
  root.userData.mouthAnchors = [mouth];
  // Upright seahorses are measured crown-to-tail, not snout-to-back.
  // Uniform scaling preserves the generated proportions and the owner transform.
  if (kind === "pearl_seahorse") {
    const box = asset.geometry.boundingBox;
    bodyRoot.scale.setScalar(1 / (box.max.y - box.min.y));
  }
  root.userData.normalizedLength = bodyRoot.scale.z;
  root.userData.lengthAxis = kind === "pearl_seahorse" ? "y" : "z";
  root.userData.odysseyAnatomy = kind;
  root.userData.hfRig = { kind, mesh, bones, chains, asset };
  root.userData.artRevision = "trellis_odyssey_shallows_20261028";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  if (kind === "pearl_seahorse" || kind === "moon_scallop")
    root.userData.aquaticUpright = true;
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const e = effort(phase, speed),
      drive = 0.75 + smooth(0.3, 3, e) * 0.25;
    if (kind === "ambrosia_sprat") {
      const t = phase * 2.2;
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(t - i * 0.65) * [0.018, 0.055, 0.09, 0.16][i] * drive;
      });
      pecs.forEach((c) => {
        bones[c.ids[0]].rotation.y = c.side * Math.sin(t * 0.65) * 0.17 * drive;
      });
      bones[dorsal.ids[0]].rotation.z = Math.sin(t - 0.5) * 0.045;
    } else if (kind === "moon_scallop") {
      const t = (phase * 0.9) % (Math.PI * 2),
        clap = (0.5 + 0.5 * Math.cos(t)) ** 4;
      bones[upper.ids[0]].rotation.x = 0.1 * (1 - clap);
      bones[lower.ids[0]].rotation.x = -0.025 * (1 - clap);
      bones[mantle.ids[0]].scale.y = 0.96 + 0.04 * clap;
    } else if (kind === "lyre_ray") {
      wings.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side * Math.sin(phase * 1.1 - i * 0.52) * 0.29 * drive;
        }),
      );
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y = Math.sin(phase * 0.55 - i * 0.6) * 0.035;
        bones[id].rotation.x = Math.sin(phase * 0.7 - i * 0.65) * 0.025;
      });
    } else {
      tail.ids.forEach((id, i) => {
        bones[id].rotation.x = Math.sin(phase * 0.3 - i * 0.5) * 0.013;
        bones[id].rotation.z = Math.sin(phase * 0.35 - i * 0.4) * 0.013;
      });
      dorsal.ids.forEach((id, i) => {
        bones[id].rotation.y = Math.sin(phase * 4.1 - i * 0.75) * 0.38 * drive;
      });
      pecs.forEach((c) => {
        bones[c.ids[0]].rotation.y =
          c.side * Math.sin(phase * 3.5) * 0.28 * drive;
      });
    }
  });
}
