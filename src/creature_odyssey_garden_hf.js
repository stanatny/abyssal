import * as T from "three";
import { odysseyGardenHFAsset } from "./odyssey_garden_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
export const ODYSSEY_HF_GARDEN = new Set([
  "iris_cuttlefish",
  "amphora_hermit",
  "aegean_jelly",
  "silver_pipefish",
]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 四种体制分别绑定；母体/陶壶保持连续，推进组织拥有独立的可见表面。 */
export function buildOdysseyGardenHF(kind, root, motions) {
  if (!ODYSSEY_HF_GARDEN.has(kind))
    throw Error("Unknown Odyssey garden creature");
  const bodyRoot = new T.Group();
  root.add(bodyRoot);
  const base = new T.Bone();
  bodyRoot.add(base);
  const bones = [base],
    chains = [],
    point = new T.Vector3();
  function add(name, points, hierarchy = false, extra = {}) {
    const c = { name, points, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = kind + "_" + name + "_" + i;
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
  }
  let fins = [],
    arms = [],
    legs = [],
    claws = [],
    feelers = [],
    tail,
    bell,
    dorsal,
    pecs = [];
  if (kind === "iris_cuttlefish") {
    for (const side of [-1, 1])
      fins.push(
        add(
          "fin_" + side,
          [-0.08, 0.01, 0.1, 0.19, 0.28, 0.37, 0.46].map((z) => [
            side *
              (0.045 +
                0.12 * Math.sqrt(Math.max(0, 1 - ((z - 0.15) / 0.35) ** 2))),
            0.02,
            z,
          ]),
          false,
          { side },
        ),
      );
    for (let i = 0; i < 10; i++) {
      const side = i < 5 ? -1 : 1,
        j = i % 5,
        spread = [0.035, 0.06, 0.09, 0.12, 0.18][j];
      arms.push(
        add(
          "arm_" + i,
          [
            [side * 0.035, -0.005, -0.22],
            [side * spread * 0.7, -0.06, -0.34],
            [side * spread, -0.1, -0.46],
          ],
          true,
          { side, phase: i * 0.73 },
        ),
      );
    }
  } else if (kind === "amphora_hermit") {
    // Fitted to the asymmetric export, not a mirrored procedural crab.
    const walking = [
      [
        [-0.115, -0.08, -0.175],
        [-0.29, -0.12, -0.235],
        [-0.37, -0.27, -0.31],
      ],
      [
        [-0.12, -0.08, -0.12],
        [-0.34, -0.13, -0.13],
        [-0.43, -0.27, -0.15],
      ],
      [
        [0.1, -0.08, -0.16],
        [0.29, -0.14, -0.24],
        [0.38, -0.28, -0.23],
      ],
      [
        [0.1, -0.08, -0.1],
        [0.24, -0.12, -0.06],
        [0.29, -0.27, 0.05],
      ],
    ];
    walking.forEach((p, i) =>
      legs.push(
        add("walking_" + i, p, true, {
          side: i < 2 ? -1 : 1,
          phase: ((i % 2) + (i < 2 ? 1 : 0)) * Math.PI,
        }),
      ),
    );
    claws.push(
      add(
        "claw_left",
        [
          [-0.07, -0.08, -0.22],
          [-0.13, -0.1, -0.28],
          [-0.1, -0.17, -0.34],
        ],
        true,
        { side: -1 },
      ),
    );
    claws.push(
      add(
        "claw_right",
        [
          [0.06, -0.03, -0.23],
          [0.095, -0.11, -0.34],
          [0.01, -0.17, -0.4],
        ],
        true,
        { side: 1 },
      ),
    );
    for (const side of [-1, 1])
      feelers.push(
        add(
          "feeler_" + side,
          [
            [side * 0.045, 0.025, -0.24],
            [side * 0.1, 0.045, -0.4],
          ],
          true,
          { side },
        ),
      );
  } else if (kind === "aegean_jelly") {
    bell = add("bell", [[0, 0.28, 0]]);
    for (let j = 0; j < 4; j++) {
      const [cx, cz] = [
        [0.202, -0.068],
        [0.112, 0.192],
        [-0.175, 0.137],
        [-0.062, -0.228],
      ][j];
      arms.push(
        add(
          "oral_" + j,
          [
            [cx * 0.6, 0.22, cz * 0.6],
            [cx, -0.12, cz],
            [cx * 1.12, -0.43, cz * 1.12],
          ],
          true,
          { phase: j * 1.5 },
        ),
      );
    }
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      feelers.push(
        add(
          "fringe_" + j,
          [
            [Math.cos(a) * 0.41, 0.29, Math.sin(a) * 0.41],
            [Math.cos(a) * 0.48, 0.18, Math.sin(a) * 0.48],
          ],
          true,
          { phase: j * 0.7 },
        ),
      );
    }
  } else {
    tail = add(
      "body_tail",
      [
        [0, -0.015, -0.13],
        [0, -0.055, 0],
        [0, -0.1, 0.15],
        [0, -0.11, 0.3],
        [0, -0.16, 0.44],
      ],
      true,
    );
    dorsal = add("dorsal", [[0, -0.085, 0.18]]);
    bones[tail.ids[2]].add(bones[dorsal.ids[0]]);
    bones[dorsal.ids[0]].position.sub(new T.Vector3(...tail.points[2]));
    for (const side of [-1, 1])
      pecs.push(
        add("pectoral_" + side, [[side * 0.025, 0, -0.175]], false, { side }),
      );
  }
  const asset = odysseyGardenHFAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    const single = (id, blend) => {
      if (blend <= 0) return;
      for (let j = 0; j < 4; j++) w[o + j] *= 1 - blend;
      ids[o + 3] = id;
      w[o + 3] += blend;
    };
    const closest = (cs) =>
      cs.reduce(
        (best, c) => {
          const d = nearestChain(point, c).distance;
          return d < best.d ? { c, d } : best;
        },
        { c: cs[0], d: Infinity },
      ).c;
    if (kind === "iris_cuttlefish") {
      if (z < -0.22)
        chainWeights(
          closest(arms),
          point,
          1 - smooth(-0.34, -0.22, z),
          ids,
          w,
          o,
        );
      const c = fins[x < 0 ? 0 : 1],
        u = T.MathUtils.clamp((z + 0.08) / 0.09, 0, 5.999),
        i = Math.floor(u),
        f = u - i;
      const radius =
        Math.abs(c.points[i][0]) * (1 - f) + Math.abs(c.points[i + 1][0]) * f;
      const weight =
        smooth(radius, radius + 0.075, Math.abs(x)) *
        smooth(-0.13, -0.07, z) *
        (1 - smooth(0.055, 0.095, Math.abs(y - 0.02)));
      if (weight > 0) {
        w[o] *= 1 - weight;
        w[o + 1] *= 1 - weight;
        w[o + 2] *= 1 - weight;
        ids[o + 1] = c.ids[i];
        ids[o + 2] = c.ids[i + 1];
        w[o + 1] = weight * (1 - f);
        w[o + 2] = weight * f;
      }
    } else if (kind === "amphora_hermit") {
      // The rigid ceramic vessel is excluded before selecting nearby limbs.
      const c = closest([...legs, ...claws]),
        near = nearestChain(point, c),
        rootPoint = new T.Vector3(...c.points[0]);
      const offRoot = point.distanceTo(rootPoint);
      // Posterior shell remains rigid; only nearby limb tubes below it are bound.
      const shellSafe = 1 - smooth(-0.14, -0.075, z) * smooth(-0.25, -0.16, y);
      const limb =
        smooth(0.018, 0.09, offRoot) *
        (1 - smooth(0.055, 0.085, Math.sqrt(near.distance))) *
        shellSafe *
        (1 - smooth(-0.035, 0.005, y));
      if (limb > 0) chainWeights(c, point, limb, ids, w, o);
      if (z < -0.29 && y > -0.005) {
        const c = feelers[x < 0 ? 0 : 1];
        chainWeights(
          c,
          point,
          (1 - smooth(-0.39, -0.29, z)) * smooth(-0.005, 0.03, y),
          ids,
          w,
          o,
        );
      }
    } else if (kind === "aegean_jelly") {
      const r = Math.hypot(x, z);
      if (r < 0.31 && y < 0.29)
        chainWeights(
          closest(arms),
          point,
          1 - smooth(0.12, 0.29, y),
          ids,
          w,
          o,
        );
      else if (r >= 0.31 && y < 0.3)
        chainWeights(
          closest(feelers),
          point,
          1 - smooth(0.2, 0.3, y),
          ids,
          w,
          o,
        );
      single(bell.ids[0], smooth(0.18, 0.3, y));
    } else {
      chainWeights(tail, point, smooth(-0.22, -0.08, z), ids, w, o);
      const fin =
        smooth(-0.075, -0.035, y) *
        smooth(0.1, 0.15, z) *
        (1 - smooth(0.23, 0.27, z));
      single(dorsal.ids[0], fin);
      const pec =
        smooth(0.025, 0.045, Math.abs(x)) *
        smooth(-0.025, -0.012, y) *
        (1 - smooth(0.015, 0.035, y)) *
        smooth(-0.21, -0.185, z) *
        (1 - smooth(-0.155, -0.13, z));
      single(pecs[x < 0 ? 0 : 1].ids[0], pec);
    }
  });
  const mesh = bindOrganicBody(
    bodyRoot,
    kind + "_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.3,
  );
  const mouth = new T.Object3D();
  mouth.name = kind + "_mouth";
  mouth.position.fromArray(
    {
      iris_cuttlefish: [0, -0.02, -0.21],
      amphora_hermit: [0, -0.04, -0.22],
      aegean_jelly: [0, 0, 0],
      silver_pipefish: [0, 0.1, -0.49],
    }[kind],
  );
  base.add(mouth);
  root.userData.mouthAnchors = [mouth];
  root.userData.normalizedLength = 1;
  root.userData.odysseyAnatomy = kind;
  root.userData.hfRig = { kind, mesh, bones, chains, asset };
  root.userData.artRevision = "trellis_odyssey_garden_20261028";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  if (kind === "aegean_jelly") {
    const b = asset.geometry.boundingBox;
    bodyRoot.scale.setScalar(1 / (b.max.y - b.min.y));
    root.userData.lengthAxis = "y";
    root.userData.normalizedLength = bodyRoot.scale.z;
  }
  root.userData.aquaticUpright = true;
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const drive = 0.7 + 0.3 * smooth(0.3, 3, effort(phase, speed));
    if (kind === "iris_cuttlefish") {
      fins.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side * Math.sin(phase * 2.1 - i * 0.85) * 0.29 * drive;
        }),
      );
      arms.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.x =
            Math.sin(phase * 0.8 + c.phase - i * 0.6) * 0.045 * drive;
          bones[id].rotation.y =
            Math.sin(phase * 0.7 + c.phase - i * 0.7) * 0.03;
        }),
      );
    } else if (kind === "amphora_hermit") {
      legs.forEach((c) =>
        c.ids.forEach((id, i) => {
          const wave = phase * 2.2 + c.phase;
          bones[id].rotation.y = Math.sin(wave) * [0.2, 0.08, 0.04][i] * drive;
          bones[id].rotation.z =
            c.side *
            Math.max(0, Math.cos(wave)) *
            [0.08, -0.18, 0.09][i] *
            drive;
        }),
      );
      claws.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.y =
            c.side * Math.sin(phase * 0.7) * [0.04, 0.06, 0.04][i];
        }),
      );
      feelers.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.y =
            Math.sin(phase * 1.6 + c.side + i * 0.7) * 0.045;
        }),
      );
    } else if (kind === "aegean_jelly") {
      const pulse = (0.5 + 0.5 * Math.cos(phase * 1.35)) ** 3;
      const b = bones[bell.ids[0]];
      b.scale.set(1 - 0.12 * pulse, 1 + 0.14 * pulse, 1 - 0.12 * pulse);
      arms.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            Math.sin(phase * 0.9 + c.phase - i * 0.6) * 0.055;
          bones[id].rotation.x =
            Math.sin(phase * 0.7 + c.phase - i * 0.7) * 0.04;
        }),
      );
      feelers.forEach((c) =>
        c.ids.forEach((id, i) => {
          bones[id].rotation.x = Math.sin(phase + c.phase - i * 0.5) * 0.07;
        }),
      );
    } else {
      tail.ids.forEach((id, i) => {
        bones[id].rotation.y =
          Math.sin(phase * 0.7 - i * 0.6) *
          [0.008, 0.014, 0.024, 0.033, 0.04][i];
      });
      bones[dorsal.ids[0]].rotation.y = Math.sin(phase * 4.5) * 0.42 * drive;
      pecs.forEach((c) => {
        bones[c.ids[0]].rotation.y =
          c.side * Math.sin(phase * 4.1) * 0.35 * drive;
      });
    }
  });
}
