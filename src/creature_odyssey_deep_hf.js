import * as T from "three";
import { odysseyDeepHFAsset } from "./odyssey_deep_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const ODYSSEY_HF_DEEP = new Set([
  "ketos",
  "abyss_lamprey",
  "oracle_whale",
  "ceto_serpent",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 只驱动解剖表面；世界速度、体长、攻击和生态沿用原有规则。 */
export function buildOdysseyDeepHF(kind, root, motions) {
  if (!ODYSSEY_HF_DEEP.has(kind)) throw Error("Unknown Odyssey deep creature");
  const bodyRoot = new T.Group(),
    base = new T.Bone(),
    bones = [base],
    chains = [],
    point = new T.Vector3();
  root.add(bodyRoot);
  bodyRoot.add(base);
  function add(name, points, extra = {}) {
    // 躯干碰撞按解剖类型排除鳍，不能遗漏 type 而把轴向骨链也误判为鳍。
    const c = {
      name,
      type: name.startsWith("pectoral_") ? "pectoral" : name,
      points,
      ids: [],
      ...extra,
    };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      if (i) {
        bones[c.ids[i - 1]].add(b);
        b.position.sub(new T.Vector3(...points[i - 1]));
      } else base.add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  }
  let tail, head;
  const fins = [];
  if (kind === "ketos") {
    tail = add("tail", [
      [0, -0.02, -0.13],
      [0, -0.025, 0.02],
      [0, -0.01, 0.18],
      [0, 0.02, 0.34],
      [0, 0.035, 0.43],
    ]);
    for (const side of [-1, 1])
      fins.push(
        add(
          "pectoral_" + side,
          [
            [side * 0.065, -0.04, -0.3],
            [side * 0.21, -0.08, -0.32],
            [side * 0.35, -0.11, -0.29],
          ],
          { side },
        ),
      );
  } else if (kind === "oracle_whale") {
    tail = add("tail", [
      [0, -0.04, -0.02],
      [0, -0.035, 0.15],
      [0, 0.01, 0.3],
      [0, 0.055, 0.4],
    ]);
    for (const side of [-1, 1])
      fins.push(
        add("pectoral_" + side, [[side * 0.09, -0.025, -0.29]], { side }),
      );
  } else {
    tail = add(
      "axial",
      Array.from({ length: 10 }, (_, i) => [
        0,
        (kind === "ceto_serpent"
          ? [
              0.05, -0.005, -0.07, -0.085, -0.07, -0.06, -0.065, -0.075, -0.06,
              -0.08,
            ]
          : [
              -0.015, -0.015, -0.015, -0.02, -0.025, -0.03, -0.035, -0.03, 0,
              0.04,
            ])[i],
        -0.37 + i * 0.09,
      ]),
    );
    head = add("head", [[0, kind === "ceto_serpent" ? 0.055 : 0, -0.36]]);
  }
  const asset = odysseyDeepHFAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    const single = (id, blend) => {
      if (blend <= 0) return;
      for (let j = 0; j < 4; j++) w[o + j] *= 1 - blend;
      ids[o + 3] = id;
      w[o + 3] += blend;
    };
    const side = x < 0 ? 0 : 1,
      ax = Math.abs(x);
    if (kind === "ketos") {
      chainWeights(tail, point, smooth(-0.18, 0.04, z), ids, w, o);
      if (z < -0.17)
        chainWeights(
          fins[side],
          point,
          smooth(0.065, 0.15, ax) * (1 - smooth(-0.17, -0.14, z)),
          ids,
          w,
          o,
        );
    } else if (kind === "oracle_whale") {
      chainWeights(tail, point, smooth(-0.1, 0.16, z), ids, w, o);
      if (z < -0.1 && z > -0.36)
        single(
          fins[side].ids[0],
          smooth(0.095, 0.16, ax) * (1 - smooth(-0.035, -0.015, y)),
        );
    } else {
      chainWeights(tail, point, smooth(-0.4, -0.29, z), ids, w, o);
      if (z < -0.3) single(head.ids[0], 1 - smooth(-0.4, -0.3, z));
    }
  });
  const mesh = bindOrganicBody(
    bodyRoot,
    kind + "_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.38,
  );
  const mouth = new T.Object3D();
  mouth.name = kind + "_mouth";
  mouth.position.set(
    0,
    { ketos: 0.06, abyss_lamprey: 0, oracle_whale: 0.075, ceto_serpent: 0.065 }[
      kind
    ],
    -0.48,
  );
  if (head) {
    bones[head.ids[0]].add(mouth);
    mouth.position.sub(new T.Vector3(...head.points[0]));
  } else base.add(mouth);
  Object.assign(root.userData, {
    mouthAnchors: [mouth],
    normalizedLength: 1,
    odysseyAnatomy: kind,
    hfRig: { kind, mesh, bones, chains, asset },
    artRevision: "trellis_odyssey_deep_20261028",
    prepareMaterials: asset.prepare,
    aquaticUpright: true,
  });
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const drive = 0.68 + 0.32 * smooth(0.3, 3, effort(phase, speed));
    if (kind === "ketos") {
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.y =
            Math.sin(phase * 1.8 - i * 0.65) *
            [0.025, 0.06, 0.1, 0.13, 0.12][i] *
            drive),
      );
      fins.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(phase * 0.9 - i * 0.4) *
            [0.12, 0.06, 0.035][i] *
            drive;
          bones[id].rotation.y =
            c.side * Math.cos(phase * 0.9) * [0.055, 0.025, 0.015][i];
        }),
      );
    } else if (kind === "oracle_whale") {
      tail.ids.forEach(
        (id, i) =>
          (bones[id].rotation.x =
            Math.sin(phase * 1.2 - i * 0.65) *
            [0.035, 0.08, 0.16, 0.12][i] *
            drive),
      );
      fins.forEach((c) => {
        bones[c.ids[0]].rotation.z =
          c.side * Math.sin(phase * 0.65) * 0.12 * drive;
        bones[c.ids[0]].rotation.y = c.side * Math.cos(phase * 0.65) * 0.07;
      });
    } else {
      const f = kind === "abyss_lamprey" ? 1.8 : 1.4;
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(phase * f - i * 0.64) * (0.045 + i * 0.014) * drive;
        bones[id].rotation.x =
          Math.sin(phase * f * 0.5 - i * 0.45) * 0.014 * drive;
      });
      bones[head.ids[0]].rotation.y = Math.sin(phase * f + 0.4) * 0.035 * drive;
    }
  });
}
