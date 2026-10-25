import * as THREE from "three";
import { amazonLordAsset } from "./amazon_lord_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  nearestChain,
  lordEffortSmoother,
  prepareLordSkinChunks,
} from "./hawaii_lord_rig.js";
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const band = (a, b, c, d, x) => smooth(a, b, x) * (1 - smooth(c, d, x));
const point = new THREE.Vector3();
export const AMAZON_HF_LORDS = new Set([
  "thunderbarbel",
  "yacumama",
  "rootjaw",
]);

/** Neutral meshes are fitted offline; living poses use only the existing simulation clock. */
export function buildAmazonLordHF(kind, root, motions) {
  const base = new THREE.Bone();
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
  const snake = kind === "yacumama",
    cat = kind === "thunderbarbel";
  const tailPoints = (
    snake
      ? Array.from({ length: 18 }, (_, i) => -0.38 + (i * 0.86) / 17)
      : cat
        ? [-0.12, 0, 0.1, 0.2, 0.3, 0.39, 0.48]
        : [-0.02, 0.08, 0.18, 0.28, 0.38, 0.48]
  ).map((z) => [0, 0, z]);
  const tail = add("axis", tailPoints, "tail");
  const fins = [],
    limbs = [],
    barbels = [];
  if (cat) {
    for (const side of [-1, 1]) {
      fins.push(
        add("pectoral_" + side, [[side * 0.075, -0.05, -0.2]], "fin", {
          side,
          rear: false,
        }),
      );
      fins.push(
        add(
          "pelvic_" + side,
          [[side * 0.045, -0.06, 0.025]],
          "fin",
          { side, rear: true },
          bones[tail.ids[1]],
          tail.points[1],
        ),
      );
      for (let i = 0; i < 3; i++) {
        const p =
          i === 0
            ? [
                [side * 0.076, -0.043, -0.44],
                [side * 0.15, -0.1, -0.39],
                [side * 0.218, -0.145, -0.32],
              ]
            : i === 1
              ? [
                  [side * 0.03, -0.075, -0.42],
                  [side * 0.068, -0.12, -0.4],
                  [side * 0.09, -0.16, -0.36],
                ]
              : [
                  [side * 0.012, -0.075, -0.405],
                  [side * 0.025, -0.115, -0.38],
                  [side * 0.035, -0.15, -0.34],
                ];
        barbels.push(
          add("barbel_" + side + "_" + i, p, "barbel", { side, index: i }),
        );
      }
    }
  } else if (!snake) {
    for (const side of [-1, 1])
      for (const rear of [false, true]) {
        const p = [side * 0.105, -0.045, rear ? 0.015 : -0.245];
        limbs.push(
          add(
            (rear ? "rear_" : "front_") + side,
            [
              p,
              [side * 0.165, -0.07, p[2] + 0.045],
              [side * 0.21, -0.1, p[2] + 0.13],
            ],
            "limb",
            { side, rear },
            rear ? bones[tail.ids[0]] : base,
            rear ? tail.points[0] : [0, 0, 0],
          ),
        );
      }
  }
  const jaw = add(
    "jaw",
    [
      [
        0,
        cat ? -0.035 : snake ? -0.012 : 0.015,
        cat ? -0.32 : snake ? -0.4 : -0.31,
      ],
    ],
    "jaw",
  );
  const bind = (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    chainWeights(
      tail,
      point,
      smooth(
        snake ? -0.42 : cat ? -0.16 : -0.065,
        snake ? -0.33 : cat ? -0.02 : 0.06,
        z,
      ),
      ids,
      w,
      o,
    );
    const blendWeights = (parts, f) => {
      if (f <= 0) return;
      const combined = new Map();
      for (let i = 0; i < 4; i++)
        combined.set(
          ids[o + i],
          (combined.get(ids[o + i]) || 0) + w[o + i] * (1 - f),
        );
      for (const [id, weight] of parts)
        combined.set(id, (combined.get(id) || 0) + weight * f);
      const ranked = [...combined].sort((a, b) => b[1] - a[1]).slice(0, 4),
        sum = ranked.reduce((v, p) => v + p[1], 0);
      for (let i = 0; i < 4; i++) {
        ids[o + i] = ranked[i]?.[0] || 0;
        w[o + i] = (ranked[i]?.[1] || 0) / sum;
      }
    };
    const blendTo = (id, f) => blendWeights([[id, 1]], f);
    const blendChain = (c, f) => {
      const n = nearestChain(point, c);
      blendWeights(
        [
          [n.a, 1 - n.t],
          [n.b, n.t],
        ],
        f,
      );
    };
    for (const c of fins) {
      if (Math.sign(x) !== c.side) continue;
      const f =
        smooth(c.rear ? 0.045 : 0.075, c.rear ? 0.065 : 0.105, Math.abs(x)) *
        (c.rear
          ? band(-0.015, 0.025, 0.095, 0.13, z)
          : band(-0.26, -0.2, -0.08, -0.035, z)) *
        (1 - smooth(-0.025, 0.005, y));
      blendTo(c.ids[0], f);
    }
    if (cat && z < -0.25 && y < -0.065) {
      let closest = null,
        best = Infinity;
      for (const c of barbels) {
        if (Math.sign(x) !== c.side) continue;
        for (const p of c.points) {
          const d = point.distanceToSquared(new THREE.Vector3(...p));
          if (d < best) {
            best = d;
            closest = c;
          }
        }
      }
      if (closest) {
        const f =
          (1 - smooth(-0.115, -0.068, y)) * (1 - smooth(-0.29, -0.245, z));
        blendChain(closest, f);
      }
    }

    for (const c of limbs) {
      if (Math.sign(x) !== c.side) continue;
      const f =
        smooth(0.095, 0.15, Math.abs(x)) *
        (c.rear
          ? band(-0.045, -0.015, 0.22, 0.25, z)
          : band(-0.31, -0.27, -0.05, -0.015, z)) *
        (1 - smooth(-0.045, -0.015, y));
      if (f > 0) blendChain(c, f);
    }
    const j =
      (1 -
        smooth(
          cat ? -0.36 : snake ? -0.425 : -0.29,
          cat ? -0.28 : snake ? -0.395 : -0.22,
          z,
        )) *
      (1 -
        smooth(
          cat ? -0.06 : snake ? -0.018 : -0.015,
          cat ? -0.027 : snake ? -0.005 : 0.008,
          y,
        ));
    if (!(cat && y < -0.105))
      blendTo(
        jaw.ids[0],
        j *
          (1 - smooth(snake ? 0.025 : 0.065, snake ? 0.04 : 0.09, Math.abs(x))),
      );
  };
  const asset = amazonLordAsset(kind, bind);
  const charged = cat
    ? new THREE.MeshStandardMaterial({
        color: 0xc7c59c,
        emissive: 0xa7b94a,
        emissiveIntensity: 0.1,
        roughness: 0.65,
      })
    : null;
  const mesh = bindOrganicBody(
    root,
    kind + "_hf_body",
    asset.geometry,
    cat ? [asset.material, charged] : asset.material,
    bones,
    0.38,
  );
  const groups = Array.from({ length: snake ? 14 : 8 }, () => []),
    p = asset.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    let core = snake
      ? z < 0.45
      : cat
        ? z < 0.37 &&
          Math.abs(x) < (z < -0.15 ? 0.095 : z < 0.15 ? 0.07 : 0.035) &&
          y > -0.07 &&
          y < 0.09
        : z < 0.42 &&
          Math.abs(x) < (z < -0.18 ? 0.12 : z < 0.15 ? 0.115 : 0.07) &&
          y > -0.06 &&
          y < 0.1;
    if (core)
      groups[
        Math.min(
          groups.length - 1,
          Math.max(0, Math.floor((z + 0.5) * groups.length)),
        )
      ].push(i);
  }
  mesh.userData.lordCoreParts = groups.filter((g) => g.length > 24);
  prepareLordSkinChunks(mesh);
  root.userData.hfRig = { kind, mesh, bones, chains, asset, charged };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_amazon_lords_20261025";
  root.userData.aquaticUpright = true;
  // 根颚君王在深潭里俯冲或抬头上游，导航提案与实际姿态共用俯仰范围。
  if (kind === "rootjaw") {
    root.userData.aquaticPitchLimit = 1.05;
    root.userData.aquaticTurnRate = 2.4;
  }
  root.userData.amazonAnatomy = kind;
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  const anchor = (x, y, z) => {
    const a = new THREE.Object3D();
    a.position.set(x, y, z);
    base.add(a);
    return a;
  };
  root.userData.mouthAnchors = cat
    ? [
        anchor(-0.073, -0.045, -0.435),
        anchor(0, -0.045, -0.47),
        anchor(0.073, -0.045, -0.435),
      ]
    : [anchor(0, snake ? -0.014 : -0.03, -0.48)];
  let state = "dormant",
    previous,
    tension = 0,
    disposed = false;
  const effort = lordEffortSmoother();
  root.userData.setBossPhase = (value) => (state = value);
  root.userData.setHunterPhase = root.userData.setBossPhase;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
    charged?.dispose();
  };
  motions.push((phase, speed) => {
    const dt =
      previous === undefined || phase < previous
        ? 0
        : Math.min(0.6, phase - previous);
    previous = phase;
    tension +=
      ((state === "windup" ? 1 : state === "attack" ? 0.8 : 0) - tension) *
      (1 - Math.exp(-dt * 5));
    const drive = smooth(0.2, 3, effort(phase, speed));
    let prior = 0;
    tail.ids.forEach((id, i) => {
      const t = i / (tail.ids.length - 1);
      const tangent =
        Math.sin(
          phase * (snake ? 0.74 : 0.85) - t * Math.PI * (snake ? 2.6 : 1.35),
        ) *
        smooth(0, snake ? 0.22 : 0.4, t) *
        (snake ? 0.42 : 0.4) *
        (1 + drive * 0.18);
      bones[id].rotation.y = tangent - prior;
      bones[id].rotation.x = bones[id].rotation.z = 0;
      prior = tangent;
    });
    for (const c of fins) {
      const b = bones[c.ids[0]];
      b.rotation.y =
        c.side * (0.08 + drive * 0.11 + Math.sin(phase * 0.8) * 0.055);
      b.rotation.z =
        c.side *
        (Math.sin(phase * 0.67 + (c.rear ? 1 : 0)) * 0.07 - drive * 0.03);
    }
    for (const c of barbels)
      c.ids.forEach((id, i) => {
        bones[id].rotation.y =
          c.side *
          (Math.sin(phase * 0.65 - i * 0.6 - c.index * 0.8) * 0.04 -
            tension * 0.06);
        bones[id].rotation.x =
          Math.sin(phase * 0.6 - i * 0.8 + c.index) * 0.025;
      });
    for (const c of limbs) {
      const b = bones[c.ids[0]],
        k = bones[c.ids[1]],
        foot = bones[c.ids[2]];
      // The HF neutral already sweeps the limbs backward. A modest adduction
      // keeps their skin intact; thrust comes from the trunk/tail, not crawling.
      b.rotation.y =
        -c.side * ((c.rear ? 0.36 : 0.4) + drive * (c.rear ? 0.08 : 0.12));
      b.rotation.z = c.side * (c.rear ? 0.2 : 0.3);
      k.rotation.y = -c.side * 0.025;
      foot.rotation.z = c.side * 0.025;
      b.rotation.x = Math.sin(phase * 0.55 + (c.rear ? 1.8 : 0)) * 0.012;
    }
    bones[jaw.ids[0]].rotation.x =
      -(cat ? 0.05 : snake ? 0.06 : 0.085) * tension;
    if (charged) charged.emissiveIntensity = 0.12 + tension * 1.2;
  });
}
