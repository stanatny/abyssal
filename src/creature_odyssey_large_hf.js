import * as T from "three";
import { odysseyLargeHFAsset } from "./odyssey_large_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";
export const ODYSSEY_HF_LARGE = new Set([
  "aegis_sturgeon",
  "thalassa_manta",
  "cerulean_hound",
  "bronze_turtle",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 按四种实际表面拟合：硬甲固定，软体和推进肢体分开，不改变世界运动。 */
export function buildOdysseyLargeHF(kind, root, motions) {
  if (!ODYSSEY_HF_LARGE.has(kind))
    throw Error("Unknown Odyssey large creature");
  const bodyRoot = new T.Group(),
    base = new T.Bone(),
    bones = [base],
    chains = [],
    point = new T.Vector3();
  root.add(bodyRoot);
  bodyRoot.add(base);
  function add(name, points, extra = {}, parent = base, parentPoint = null) {
    const c = { name, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      if (i) {
        bones[c.ids[i - 1]].add(b);
        b.position.sub(new T.Vector3(...points[i - 1]));
      } else {
        parent.add(b);
        if (parentPoint) b.position.sub(new T.Vector3(...parentPoint));
      }
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  }
  let tail, head;
  const fore = [],
    hind = [],
    wings = [],
    lobes = [];
  if (kind === "aegis_sturgeon") {
    tail = add("rear_body", [
      [0, 0, -0.05],
      [0, 0, 0.12],
      [0, -0.01, 0.28],
      [0, -0.005, 0.4],
    ]);
    for (const side of [-1, 1])
      fore.push(
        add("pectoral_" + side, [[side * 0.065, -0.035, -0.28]], { side }),
      );
  } else if (kind === "thalassa_manta") {
    for (const side of [-1, 1]) {
      wings.push(
        add(
          "wing_" + side,
          [
            [side * 0.12, 0.015, -0.16],
            [side * 0.25, 0.04, -0.155],
            [side * 0.38, 0.075, -0.15],
            [side * 0.49, 0.11, -0.12],
          ],
          { side },
        ),
      );
      lobes.push(
        add("cephalic_" + side, [[side * 0.085, -0.025, -0.405]], { side }),
      );
    }
    tail = add("whip_tail", [
      [0, -0.01, 0.1],
      [-0.025, -0.015, 0.22],
      [-0.065, 0, 0.36],
      [-0.16, 0.025, 0.49],
    ]);
  } else if (kind === "cerulean_hound") {
    tail = add("rear_body", [
      [0, 0, -0.02],
      [0, 0, 0.15],
      [0, 0.01, 0.3],
      [0, 0.02, 0.43],
    ]);
    for (const side of [-1, 1]) {
      fore.push(
        add("steering_" + side, [[side * 0.08, -0.035, -0.29]], { side }),
      );
      hind.push(
        add(
          "hind_paddle_" + side,
          [[side * 0.035, 0.005, 0.29]],
          { side },
          bones[tail.ids[2]],
          tail.points[2],
        ),
      );
    }
  } else {
    for (const side of [-1, 1]) {
      fore.push(
        add(
          "front_paddle_" + side,
          [
            [side * 0.1, -0.04, -0.24],
            [side * 0.28, -0.08, -0.27],
            [side * 0.46, -0.1, -0.23],
          ],
          { side },
        ),
      );
      hind.push(
        add("rear_trim_" + side, [[side * 0.075, -0.085, 0.27]], { side }),
      );
    }
    head = add("neck", [[0, -0.01, -0.25]]);
    tail = add("short_tail", [[0, -0.065, 0.3]]);
  }
  const asset = odysseyLargeHFAsset(kind, (x, y, z, ids, w, o) => {
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
    if (kind === "aegis_sturgeon") {
      chainWeights(tail, point, smooth(-0.12, 0.12, z), ids, w, o);
      if (z > -0.36 && z < -0.16)
        single(
          fore[side].ids[0],
          smooth(0.058, 0.1, ax) * (1 - smooth(-0.03, -0.01, y)),
        );
    } else if (kind === "thalassa_manta") {
      if (z < 0.15 && ax > 0.08)
        chainWeights(wings[side], point, smooth(0.08, 0.19, ax), ids, w, o);
      if (z > 0.06)
        chainWeights(
          tail,
          point,
          smooth(0.06, 0.18, z) * (1 - smooth(0.025, 0.075, ax)),
          ids,
          w,
          o,
        );
      if (z < -0.4) single(lobes[side].ids[0], 1 - smooth(-0.46, -0.4, z));
    } else if (kind === "cerulean_hound") {
      chainWeights(tail, point, smooth(-0.1, 0.16, z), ids, w, o);
      if (z < -0.16 && z > -0.39)
        single(
          fore[side].ids[0],
          smooth(0.08, 0.14, ax) *
            smooth(-0.39, -0.34, z) *
            (1 - smooth(-0.24, -0.16, z)),
        );
      if (z > 0.24)
        single(
          hind[side].ids[0],
          smooth(0.03, 0.095, ax) * smooth(0.24, 0.31, z),
        );
    } else {
      const front =
        smooth(0.105, 0.19, ax) *
        (1 - smooth(-0.19, -0.12, z)) *
        (1 - smooth(-0.045, -0.015, y));
      if (front > 0) chainWeights(fore[side], point, front, ids, w, o);
      if (z > 0.235)
        single(
          hind[side].ids[0],
          smooth(0.235, 0.325, z) *
            smooth(0.04, 0.1, ax) *
            (1 - smooth(-0.06, -0.035, y)),
        );
      if (z < -0.24 && ax < 0.1)
        single(head.ids[0], 1 - smooth(-0.34, -0.24, z));
      if (z > 0.28 && ax < 0.045)
        single(
          tail.ids[0],
          smooth(0.28, 0.38, z) * (1 - smooth(0.025, 0.045, ax)),
        );
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
  mouth.position.fromArray(
    {
      aegis_sturgeon: [0, -0.05, -0.44],
      thalassa_manta: [0, -0.035, -0.405],
      cerulean_hound: [0, 0.045, -0.46],
      bronze_turtle: [0, 0, -0.48],
    }[kind],
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
    artRevision: "trellis_odyssey_large_20261028",
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
    if (kind === "aegis_sturgeon") {
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(phase * 1.8 - i * 0.65) *
          [0.018, 0.045, 0.095, 0.15][i] *
          drive;
      });
      fore.forEach((c) => {
        bones[c.ids[0]].rotation.z =
          c.side * Math.sin(phase * 0.9) * 0.1 * drive;
        bones[c.ids[0]].rotation.y = c.side * Math.cos(phase * 0.9) * 0.06;
      });
    } else if (kind === "thalassa_manta") {
      wings.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(phase * 1.25 - i * 0.55) *
            [0.2, 0.21, 0.2, 0.12][i] *
            drive;
        }),
      );
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y = Math.sin(phase * 0.65 - i * 0.7) * 0.045;
      });
      lobes.forEach((c) => {
        bones[c.ids[0]].rotation.x = Math.sin(phase * 0.6) * 0.035;
      });
    } else if (kind === "cerulean_hound") {
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(phase * 1.9 - i * 0.6) *
          [0.035, 0.095, 0.15, 0.07][i] *
          drive;
      });
      hind.forEach((c) => {
        bones[c.ids[0]].rotation.y = Math.sin(phase * 1.9 - 1.5) * 0.18 * drive;
        bones[c.ids[0]].rotation.z =
          c.side * Math.cos(phase * 1.9 - 1.5) * 0.075 * drive;
      });
      fore.forEach((c) => {
        bones[c.ids[0]].rotation.y =
          c.side * (-0.18 + Math.sin(phase * 0.9) * 0.09);
        bones[c.ids[0]].rotation.z = c.side * Math.sin(phase * 0.9) * 0.08;
      });
    } else {
      fore.forEach((c) =>
        c.ids.forEach((id, i) => {
          const t = phase * 1.1 - i * 0.48;
          bones[id].rotation.z =
            c.side * Math.sin(t) * [0.43, 0.16, 0.065][i] * drive;
          bones[id].rotation.y =
            c.side * Math.cos(t) * [0.14, 0.08, 0.02][i] * drive;
        }),
      );
      hind.forEach((c) => {
        bones[c.ids[0]].rotation.z = c.side * Math.sin(phase * 0.75 + 1) * 0.1;
        bones[c.ids[0]].rotation.y = c.side * Math.cos(phase * 0.75) * 0.05;
      });
      bones[head.ids[0]].rotation.y = Math.sin(phase * 0.4) * 0.025;
      bones[head.ids[0]].rotation.x = Math.sin(phase * 0.55) * 0.025;
      bones[tail.ids[0]].rotation.y = Math.sin(phase * 0.7) * 0.04;
    }
  });
}
