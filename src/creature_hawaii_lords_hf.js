import * as THREE from "three";
import { hawaiiLordAsset } from "./hawaii_lord_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { createKrakenMotion } from "./kraken_motion.js";
import { createKrakenIntake } from "./kraken_intake_visual.js";
import {
  createLordBones,
  nearestChain,
  chainWeights,
  lordEffortSmoother,
  lordCoreParts,
  prepareLordSkinChunks,
} from "./hawaii_lord_rig.js";

const smooth = (low, high, value) =>
  THREE.MathUtils.smoothstep(value, low, high);
const point = new THREE.Vector3();
const eyeGeometry = new THREE.SphereGeometry(1, 12, 8);
const eyeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x90b4d0,
  emissive: 0x276eaa,
  emissiveIntensity: 0.3,
  roughness: 0.35,
  metalness: 0,
});
const pupilGeometry = new THREE.SphereGeometry(1, 10, 6);
const pupilMaterial = new THREE.MeshStandardMaterial({
  color: 0x080f19,
  roughness: 0.4,
});

function rigChains(kind) {
  if (kind === "kraken") {
    const arms = [
      [
        [0.075, -0.025, 0.02],
        [0.17, -0.03, 0.08],
        [0.29, -0.025, 0.19],
        [0.4, 0.005, 0.25],
        [0.46, -0.018, 0.22],
      ],
      [
        [0.075, -0.055, -0.025],
        [0.18, -0.035, -0.025],
        [0.32, -0.025, 0.005],
        [0.44, -0.018, 0.055],
        [0.505, -0.045, 0.04],
      ],
      [
        [0.075, -0.06, -0.06],
        [0.18, -0.038, -0.115],
        [0.31, -0.048, -0.21],
        [0.41, -0.065, -0.25],
        [0.46, -0.1, -0.31],
      ],
      [
        [0.04, -0.065, -0.09],
        [0.075, -0.04, -0.22],
        [0.13, -0.056, -0.34],
        [0.18, -0.08, -0.43],
        [0.235, -0.105, -0.49],
      ],
    ];
    return [-1, 1].flatMap((side) =>
      arms.map((p, i) => ({
        name: `kraken_arm_${side}_${i}`,
        type: "arm",
        side,
        index: i,
        points: p
          .flatMap((q, j) =>
            j === p.length - 1
              ? [q]
              : [0, 1 / 3, 2 / 3].map((t) =>
                  q.map((v, k) => v + (p[j + 1][k] - v) * t),
                ),
          )
          .map(([x, y, z]) => [x * side, y, z]),
      })),
    );
  }
  const chains = [
    {
      name: `${kind}_tail`,
      type: "tail",
      points:
        kind === "mayan"
          ? [
              [0, 0, -0.19],
              [0, 0, -0.04],
              [0, -0.005, 0.12],
              [0, -0.009, 0.27],
              [0, -0.012, 0.41],
              [0, -0.012, 0.49],
            ]
          : kind === "hydra"
            ? [
                [0, -0.015, -0.04],
                [0, -0.025, 0.09],
                [0, -0.025, 0.21],
                [0, -0.028, 0.34],
                [0, -0.03, 0.43],
                [0, -0.03, 0.49],
              ]
            : [
                [0, -0.005, -0.01],
                [0, -0.005, 0.11],
                [0, -0.005, 0.23],
                [0, 0, 0.34],
                [0, 0.005, 0.39],
                [0, 0.005, 0.49],
              ],
    },
  ];
  if (kind === "hydra") {
    const necks = [
      [
        [-0.14, 0.025, -0.245],
        [-0.14, 0.1, -0.25],
        [-0.147, 0.19, -0.242],
        [-0.18, 0.24, -0.25],
        [-0.24, 0.265, -0.265],
      ],
      [
        [-0.03, 0.02, -0.32],
        [-0.056, 0.12, -0.3],
        [-0.048, 0.22, -0.28],
        [-0.049, 0.28, -0.27],
        [-0.09, 0.33, -0.34],
      ],
      [
        [0.015, 0.025, -0.26],
        [0.03, 0.11, -0.32],
        [0.055, 0.19, -0.333],
        [0.052, 0.235, -0.35],
        [0.034, 0.275, -0.42],
      ],
    ];
    necks.forEach((points, index) =>
      chains.push({
        name: `hydra_neck_${index + 1}`,
        type: "neck",
        index,
        points,
      }),
    );
    for (const side of [-1, 1])
      chains.push({
        name: `hydra_fin_${side}`,
        type: "fin",
        side,
        index: 0,
        points:
          side < 0
            ? [
                [-0.11, -0.018, -0.24],
                [-0.33, -0.08, -0.25],
              ]
            : [
                [0.035, -0.02, -0.33],
                [0.1, -0.07, -0.42],
              ],
      });
  } else if (kind === "leviathan") {
    for (const side of [-1, 1])
      for (const [index, z, r] of [
        [0, -0.24, 0.084],
        [1, -0.005, 0.052],
        [2, 0.105, 0.029],
      ])
        chains.push({
          name: `leviathan_fin_${side}_${index}`,
          type: "fin",
          side,
          index,
          points: [
            [side * r, -0.065, z],
            [side * (r + 0.1), -0.08, z + 0.035],
          ],
        });
  } else
    chains.push({
      name: "gran_maja_lower_jaw",
      type: "jaw",
      points: [
        [0, -0.035, -0.35],
        [0, -0.055, -0.46],
      ],
    });
  return chains;
}

function bind(kind, chains, x, y, z, ids, weights, offset) {
  point.set(x, y, z);
  if (kind === "kraken") {
    // 先限定在前腕扇区，后方外套不随邻近的回卷腕一起拉扯。
    const nearest = chains
      .map((chain) => ({ chain, ...nearestChain(point, chain) }))
      .sort((a, b) => a.distance - b.distance);
    const blend =
      smooth(0.11, 0.19, Math.hypot(x, z + 0.02)) *
      Math.max(smooth(0.15, 0.22, Math.abs(x)), 1 - smooth(-0.16, -0.07, z)) *
      (1 - smooth(0.24, 0.31, z) * (1 - smooth(0.18, 0.25, Math.abs(x))));
    // The web between neighboring arms must not jump to a different chain at
    // a Voronoi boundary. Blend both anatomical centerlines across that web.
    const mix =
      0.5 *
      (1 -
        smooth(
          0,
          0.045,
          Math.sqrt(nearest[1].distance) - Math.sqrt(nearest[0].distance),
        ));
    const combined = new Map([[0, 1 - blend]]);
    for (let n = 0; n < 2; n++) {
      const hit = nearest[n],
        amount = blend * (n ? mix : 1 - mix);
      combined.set(hit.a, (combined.get(hit.a) || 0) + amount * (1 - hit.t));
      combined.set(hit.b, (combined.get(hit.b) || 0) + amount * hit.t);
    }
    const selected = [...combined].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = selected.reduce((sum, pair) => sum + pair[1], 0);
    for (let n = 0; n < 4; n++) {
      ids[offset + n] = selected[n]?.[0] || 0;
      weights[offset + n] = (selected[n]?.[1] || 0) / total;
    }
    return;
  }
  if (kind === "hydra" && y > 0.115 && z < -0.13) {
    const necks = chains.filter((c) => c.type === "neck");
    let best = necks[0],
      distance = Infinity;
    for (const c of necks) {
      const d = nearestChain(point, c).distance;
      if (d < distance) {
        distance = d;
        best = c;
      }
    }
    chainWeights(best, point, smooth(0.115, 0.225, y), ids, weights, offset);
    return;
  }
  if (kind === "mayan" && z < -0.3 && y < -0.015) {
    chainWeights(
      chains.find((c) => c.type === "jaw"),
      point,
      (1 - smooth(-0.035, -0.015, y)) * (1 - smooth(-0.4, -0.3, z)),
      ids,
      weights,
      offset,
    );
    return;
  }
  const tailBlend = smooth(
    kind === "mayan" ? -0.23 : -0.1,
    kind === "mayan" ? -0.1 : 0.025,
    z,
  );
  chainWeights(chains[0], point, tailBlend, ids, weights, offset);
  const fins = chains.filter((c) => c.type === "fin" && c.side * x > 0);
  const influences = [];
  for (const c of fins) {
    const r = Math.abs(c.points[0][0]),
      distance = Math.abs(z - c.points[0][2]),
      span = kind === "hydra" ? 0.16 : c.index === 0 ? 0.13 : 0.075;
    const amount =
      smooth(r + 0.012, r + 0.07, Math.abs(x)) *
      (1 - smooth(span * 0.5, span, distance)) *
      (1 - smooth(0.005, 0.04, y));
    if (amount > 0) influences.push([c.ids[0], amount]);
  }
  const total = influences.reduce((sum, pair) => sum + pair[1], 0),
    blend = Math.min(1, total);
  const combined = new Map();
  for (let j = 0; j < 3; j++)
    combined.set(
      ids[offset + j],
      (combined.get(ids[offset + j]) || 0) + weights[offset + j] * (1 - blend),
    );
  for (const [id, w] of influences)
    combined.set(id, (combined.get(id) || 0) + w / Math.max(1, total));
  const chosen = [...combined].sort((a, b) => b[1] - a[1]).slice(0, 4),
    sum = chosen.reduce((n, p) => n + p[1], 0);
  for (let j = 0; j < 4; j++) {
    ids[offset + j] = chosen[j]?.[0] || 0;
    weights[offset + j] = (chosen[j]?.[1] || 0) / sum;
  }
}

function anchor(parent, name, position) {
  const o = new THREE.Object3D();
  o.name = name;
  o.position.fromArray(position);
  parent.add(o);
  return o;
}

/** 四种原始 HF 重建领主；外观与实际口部锚点共享关节，不修改任何战斗状态或数值。 */
export function buildHawaiiLordHF(kind, root, motions) {
  const chains = rigChains(kind),
    bones = createLordBones(root, chains);
  const asset = hawaiiLordAsset(kind, (...args) => bind(kind, chains, ...args));
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.38,
  );
  prepareLordSkinChunks(mesh);
  mesh.userData.lordCoreParts = lordCoreParts(asset.geometry, kind);
  root.userData.artIdentity = kind === "mayan" ? "gran_maja" : kind;
  root.userData.artRevision = "trellis_lord_20261019";
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  const intake = kind === "kraken" ? createKrakenIntake(bones[0]) : null;
  if (intake) {
    root.userData.krakenIntake = intake;
    root.userData.updateKrakenIntake = intake.update;
  }
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    intake?.dispose();
    mesh.skeleton.dispose();
  };
  if (kind === "hydra")
    root.userData.mouthAnchors = chains
      .filter((c) => c.type === "neck")
      .map((c, i) => {
        const mouth = [
            [-0.308, 0.256, -0.26],
            [-0.16, 0.303, -0.427],
            [0.0, 0.25, -0.493],
          ][i],
          tip = c.points.at(-1);
        return anchor(
          bones[c.ids.at(-1)],
          `hydra_mouth_${i + 1}`,
          mouth.map((v, j) => v - tip[j]),
        );
      });
  else if (kind === "kraken") {
    root.userData.mouthAnchors = [
      anchor(bones[0], "kraken_mouth_anchor", [0, 0.015, -0.075]),
    ];
    root.userData.combatAnchor = anchor(
      bones[0],
      "kraken_mantle_combat_anchor",
      [0, 0, 0.22],
    );
  } else
    root.userData.mouthAnchors = [
      anchor(bones[0], `${kind}_mouth_anchor`, [
        0,
        kind === "mayan" ? -0.027 : 0.006,
        -0.485,
      ]),
    ];
  if (kind === "mayan") addMajaEyes(root, mesh);
  const krakenMotion = intake
    ? createKrakenMotion(root, chains, bones, intake, mesh)
    : null;
  let grip = 0,
    targetGrip = 0,
    previous;
  root.userData.setKrakenGrip = (v) => {
    targetGrip = THREE.MathUtils.clamp(v, 0, 1);
  };
  root.userData.resetKrakenGrip = () => {
    grip = targetGrip = 0;
    intake?.reset();
    krakenMotion?.reset();
  };
  const smoothEffort = lordEffortSmoother();
  motions.push((phase, effort) => {
    const power = smoothEffort(phase, effort),
      step =
        previous === undefined
          ? 0
          : Math.max(0, Math.min(0.4, phase - previous));
    previous = phase;
    grip += (targetGrip - grip) * (1 - Math.exp(-step * 3));
    intake?.idle(phase, grip);
    if (krakenMotion) {
      krakenMotion.update(phase, power, grip);
      return;
    }
    for (const chain of chains)
      for (let i = 0; i < chain.ids.length; i++) {
        const bone = bones[chain.ids[i]],
          wave = phase * (kind === "kraken" ? 0.44 : 0.66) - i * 0.78;
        bone.rotation.set(0, 0, 0);
        if (chain.type === "tail") {
          const amp =
            (0.065 + power * 0.025) *
            (i === 0
              ? 0.12
              : i === chain.ids.length - 1
                ? 0.3
                : 0.55 + i * 0.12);
          bone.rotation.y = Math.sin(wave) * amp;
          bone.rotation.x = Math.sin(wave - 0.7) * 0.009;
        } else if (chain.type === "fin") {
          bone.rotation.z =
            chain.side *
            Math.sin(phase * 0.5 - chain.index * 0.55) *
            (0.045 + power * 0.013) *
            (i ? 0.3 : 1);
          bone.rotation.y =
            chain.side *
            (Math.sin(phase * 0.5 - 0.8) * 0.025 +
              Math.max(0, power - 1) * 0.035) *
            (i ? 0 : 1);
        } else if (chain.type === "neck") {
          bone.rotation.y =
            Math.sin(phase * 0.32 + chain.index * 1.9 - i * 0.45) *
            (0.026 + power * 0.006) *
            (i === 4 ? 0.75 : 1);
          bone.rotation.x =
            Math.sin(phase * 0.28 + chain.index * 0.9 - i * 0.65) * 0.024;
        } else if (chain.type === "jaw")
          bone.rotation.x =
            i === 0
              ? -0.012 -
                (0.013 + power * 0.003) * (0.5 + 0.5 * Math.sin(phase * 0.28))
              : 0;
      }
  });
}

function addMajaEyes(root, mesh) {
  const ray = new THREE.Raycaster(),
    direction = new THREE.Vector3(0, 0, 1);
  mesh.updateMatrixWorld(true);
  mesh.skeleton.update();
  const positions = [-0.105, -0.075, -0.039, 0.039, 0.075, 0.105];
  for (const x of positions) {
    ray.set(new THREE.Vector3(x, 0.028, -0.7), direction);
    const hit = ray.intersectObject(mesh)[0];
    if (!hit) throw new Error("Gran Maja eye has no skin support");
    const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eye.name = "gran_maja_eye_lens";
    eye.position.copy(hit.point);
    eye.position.z -= 0.0015;
    eye.scale.set(0.0058, 0.0058, 0.0035);
    eye.userData.keepSeparate = true;
    root.add(eye);
    const pupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    pupil.name = "gran_maja_eye_pupil";
    pupil.position.copy(eye.position);
    pupil.position.z -= 0.0031;
    pupil.scale.set(0.0023, 0.0031, 0.0012);
    root.add(pupil);
  }
}
