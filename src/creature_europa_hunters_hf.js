import * as THREE from "three";
import { europaHunterAsset } from "./europa_hunter_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { nearestChain } from "./hawaii_lord_rig.js";

export const EUROPA_HF_HUNTERS = new Set([
  "forkjaw_stalker",
  "prism_hunter",
  "rift_reaver",
  "void_siphon",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
function pack(ids, weights, offset, entries) {
  const sums = new Map();
  for (const [id, weight] of entries)
    if (weight > 0) sums.set(id, (sums.get(id) || 0) + weight);
  const pairs = [...sums].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = pairs.reduce((a, b) => a + b[1], 0);
  for (let j = 0; j < 4; j++) {
    ids[offset + j] = pairs[j]?.[0] || 0;
    weights[offset + j] = (pairs[j]?.[1] || 0) / sum;
  }
}

/** 四种猎手使用实测口器、尾根和鳍根；只读取既有猎手阶段，不改变接触或技能。 */
export function buildEuropaHunterHF(kind, root, motions) {
  const anatomy = new THREE.Group();
  anatomy.name = kind + "_anatomy";
  root.add(anatomy);
  const base = new THREE.Bone();
  base.name = kind + "_root";
  anatomy.add(base);
  const bones = [base],
    chains = [];
  function add(name, points, type, extra = {}, support) {
    const c = { name, points, type, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      if (i) b.position.sub(new THREE.Vector3(...points[i - 1]));
      else if (support) b.position.sub(new THREE.Vector3(...support.point));
      (i ? bones[c.ids[i - 1]] : support ? bones[support.id] : base).add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  }
  const axialPoints = {
    forkjaw_stalker: [
      [0, -0.045, -0.08],
      [0, -0.045, 0.05],
      [0, -0.025, 0.18],
      [0, -0.01, 0.29],
      [0, 0.01, 0.37],
    ],
    prism_hunter: [
      [0, 0, 0.04],
      [-0.006, -0.012, 0.17],
      [-0.006, -0.018, 0.29],
      [-0.006, -0.025, 0.42],
    ],
    rift_reaver: [
      [0, -0.015, -0.32],
      [0, -0.035, -0.2],
      [0, -0.045, -0.08],
      [0, -0.03, 0.04],
      [0, 0.01, 0.16],
      [0, 0.03, 0.28],
      [0, 0.04, 0.39],
    ],
    void_siphon: [
      [0, 0, -0.05],
      [0, 0, 0.08],
      [0, 0, 0.21],
      [0, 0, 0.33],
      [0, 0, 0.41],
    ],
  }[kind];
  if (!axialPoints) throw Error("Unknown Europa hunter");
  const tail = add("tail", axialPoints, "tail");
  if (kind === "forkjaw_stalker" || kind === "rift_reaver") {
    const z = kind === "forkjaw_stalker" ? -0.31 : -0.37;
    const y = kind === "forkjaw_stalker" ? -0.035 : -0.033;
    for (const side of [-1, 1])
      add("jaw_" + side, [[0, y, z]], "jaw", { side });
    if (kind === "forkjaw_stalker")
      for (const side of [-1, 1])
        add(
          "fin_" + side,
          [
            [side * 0.102, -0.053, -0.21],
            [side * 0.21, -0.1, -0.16],
          ],
          "fin",
          { side },
        );
  } else if (kind === "void_siphon") {
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      add(
        "mouth_" + i,
        [[Math.cos(angle) * 0.08, Math.sin(angle) * 0.08, -0.3]],
        "mouth",
        {
          angle,
          axis: new THREE.Vector3(Math.sin(angle), -Math.cos(angle), 0),
        },
      );
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI / 2 + (i * Math.PI * 2) / 3;
      add(
        "rudder_" + i,
        [[-0.006, -0.025, 0.42]],
        "rudder",
        {
          angle,
          axis: new THREE.Vector3(Math.sin(angle), -Math.cos(angle), 0),
        },
        { id: tail.ids.at(-1), point: tail.points.at(-1) },
      );
    }
  }
  const asset = europaHunterAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    const nearest = nearestChain(point, tail),
      axialBlend = smooth(
        axialPoints[0][2] - 0.07,
        axialPoints[0][2] + 0.09,
        z,
      );
    let entries = [
      [0, 1 - axialBlend],
      [nearest.a, axialBlend * (1 - nearest.t)],
      [nearest.b, axialBlend * nearest.t],
    ];
    if (kind === "forkjaw_stalker" || kind === "rift_reaver") {
      const split = kind === "forkjaw_stalker" ? -0.035 : -0.033;
      const jaws = chains.filter((c) => c.type === "jaw");
      const blend =
        1 -
        smooth(jaws[0].points[0][2] - 0.025, jaws[0].points[0][2] + 0.035, z);
      const width =
        kind === "rift_reaver" ? 0.006 + 0.024 * smooth(-0.47, -0.4, z) : 0.012;
      const upper = smooth(split - width, split + width, y);
      entries = entries.map(([id, w]) => [id, w * (1 - blend)]);
      entries.push(
        [jaws[0].ids[0], blend * (1 - upper)],
        [jaws[1].ids[0], blend * upper],
      );
      if (kind === "forkjaw_stalker") {
        const fin = chains.find(
          (c) => c.type === "fin" && c.side === (x < 0 ? -1 : 1),
        );
        const blend =
          smooth(0.105, 0.165, Math.abs(x)) *
          (1 - smooth(-0.04, 0.005, y)) *
          (1 - smooth(-0.01, 0.08, z)) *
          smooth(-0.3, -0.23, z);
        const tip = smooth(0.15, 0.25, Math.abs(x));
        entries = entries.map(([id, w]) => [id, w * (1 - blend)]);
        entries.push(
          [fin.ids[0], blend * (1 - tip)],
          [fin.ids[1], blend * tip],
        );
      }
    } else if (kind === "void_siphon" || kind === "prism_hunter") {
      const type = kind === "void_siphon" ? "mouth" : "rudder";
      const radialX = type === "mouth" ? x : x + 0.006;
      const radialY = type === "mouth" ? y : y + 0.025;
      const blend =
        type === "mouth"
          ? (1 - smooth(-0.34, -0.255, z)) *
            smooth(0.025, 0.07, Math.hypot(x, y))
          : smooth(0.42, 0.46, z) *
            smooth(0.018, 0.055, Math.hypot(radialX, radialY));
      const angle = Math.atan2(radialY, radialX);
      const options = chains
        .filter((c) => c.type === type)
        .map((c) => {
          const d = Math.atan2(
            Math.sin(angle - c.angle),
            Math.cos(angle - c.angle),
          );
          return { c, s: Math.exp(-d * d * 2.2) };
        })
        .sort((a, b) => b.s - a.s)
        .slice(0, type === "mouth" ? 2 : 3);
      const sum = options.reduce((sum, option) => sum + option.s, 0);
      entries = entries.map(([id, w]) => [id, w * (1 - blend)]);
      for (const { c, s } of options)
        entries.push([c.ids[0], (blend * s) / sum]);
    }
    pack(ids, w, o, entries);
  });
  const mesh = bindOrganicBody(
    anatomy,
    kind + "_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.22,
  );
  if (kind === "rift_reaver") mesh.userData.serpentine = true;
  root.userData.hfRig = { kind, mesh, bones, chains, asset };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_europa_hunters_20261026";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false,
    phase = "idle",
    phaseProgress = 0,
    previous,
    attack = 0,
    drive = 0,
    swimPhase = 0;
  root.userData.setHunterPhase = (p, timer = 0, duration = 1) => {
    phase = p;
    phaseProgress = THREE.MathUtils.clamp(
      1 - timer / Math.max(duration, 0.001),
      0,
      1,
    );
  };
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  motions.push((t, speed, motion) => {
    // Factory t is a speed-scaled phase, not seconds. World callers provide
    // resolved travel, including contact stops; the Guide uses its cruise input.
    const phaseDelta =
      previous === undefined || t < previous ? 0 : t - previous;
    const dt =
      phaseDelta <= 0
        ? 0
        : Math.min(0.12, motion?.dt ?? phaseDelta / (1.7 + speed * 1.1));
    previous = t;
    const travel = motion
      ? motion.travelSpeed / Math.max(1, motion.cruiseSpeed)
      : speed;
    drive +=
      (THREE.MathUtils.clamp(travel, 0, 2.2) - drive) * (1 - Math.exp(-dt * 5));
    const frequency = {
      forkjaw_stalker: 0.9,
      prism_hunter: 0.65,
      rift_reaver: 0.48,
      void_siphon: 0.38,
    }[kind];
    swimPhase += dt * Math.PI * 2 * frequency * (0.18 + drive * 0.82);
    const target =
      phase === "windup"
        ? 1
        : phase === "active"
          ? 0.6 * (1 - phaseProgress)
          : 0;
    attack += (target - attack) * (1 - Math.exp(-dt * 7));
    for (const c of chains) {
      if (c.type === "tail") {
        let previousTangent = 0;
        c.ids.forEach((id, i) => {
          const along = i / (c.ids.length - 1);
          const serpent = kind === "rift_reaver";
          const amplitude =
            kind === "prism_hunter" ? 0.1 : serpent ? 0.44 : 0.32;
          const tangent =
            Math.sin(swimPhase - along * (serpent ? 5.2 : 3.1)) *
            Math.pow(along, serpent ? 0.9 : 1.4) *
            amplitude *
            Math.min(1.35, 0.07 + drive);
          // Absolute travelling tangents become relative joint angles. Adding
          // all angles as before folds the back into one stiff C-shaped bend.
          bones[id].rotation.set(0, tangent - previousTangent, 0);
          previousTangent = tangent;
        });
      } else if (c.type === "jaw")
        bones[c.ids[0]].rotation.x = c.side * (-0.065 + attack * 0.18);
      else if (c.type === "fin")
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(swimPhase - i * 0.45) *
            (0.012 + Math.min(1.4, drive) * 0.04);
          bones[id].rotation.y =
            c.side *
            (-Math.min(1.5, drive) * 0.045 +
              Math.sin(swimPhase - i * 0.45) * 0.015);
        });
      else if (c.type === "mouth")
        bones[c.ids[0]].quaternion.setFromAxisAngle(
          c.axis,
          -0.065 + attack * 0.17 + Math.sin(swimPhase * 0.5) * 0.012,
        );
      else if (c.type === "rudder")
        bones[c.ids[0]].quaternion.setFromAxisAngle(
          c.axis,
          -0.2 * attack +
            Math.sin(swimPhase - c.angle) *
              (0.015 + Math.min(1.4, drive) * 0.045),
        );
    }
  });
}
