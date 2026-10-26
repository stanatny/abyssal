import * as THREE from "three";
import { europaGiantAsset } from "./europa_giant_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { nearestChain, chainWeights } from "./hawaii_lord_rig.js";
export const EUROPA_HF_GIANTS = new Set([
  "crown_filterer",
  "bell_carrier",
  "siphon_colossus",
  "spiral_grazer",
]);
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const point = new THREE.Vector3();
/** Four distinct propulsion anatomies fitted to the exported surfaces, sharing only immutable mesh/material resources. */
export function buildEuropaGiantHF(kind, root, motions) {
  const base = new THREE.Bone();
  base.name = kind + "_anatomy";
  root.add(base);
  const bones = [base],
    chains = [];
  const add = (name, points, type, extra = {}) => {
    const c = { name, points, type, ids: [], ...extra };
    chains.push(c);
    points.forEach((p, i) => {
      const b = new THREE.Bone();
      b.name = kind + "_" + name + "_" + i;
      b.position.fromArray(p);
      if (i && !extra.independent)
        b.position.sub(new THREE.Vector3(...points[i - 1]));
      (i && !extra.independent ? bones[c.ids[i - 1]] : base).add(b);
      c.ids.push(bones.length);
      bones.push(b);
    });
    return c;
  };
  if (kind === "crown_filterer") {
    add("mantle", [[0, 0, -0.3]], "mantle");
    // The regenerated source already trails eight arms behind its mantle.
    // Circumferential supports form a continuous flow field, avoiding hard
    // nearest-arm seams where neighbouring soft tissues share a web.
    for (let index = 0; index < 8; index++) {
      const angle = (index * Math.PI) / 4;
      add(
        "arm_" + index,
        [-0.065, 0.12, 0.3, 0.47].map((z) => [
          Math.cos(angle) * 0.07,
          Math.sin(angle) * 0.07,
          z,
        ]),
        "arm",
        { index, angle, independent: true },
      );
    }
  } else if (kind === "bell_carrier") {
    add("umbrella", [[0, 0, -0.28]], "umbrella");
    [
      [
        [-0.08, 0.01, -0.12],
        [-0.29, 0.13, 0.04],
        [-0.38, 0.2, 0.2],
      ],
      [
        [0.07, 0, -0.12],
        [0.22, 0, 0.12],
        [0.4, 0.055, 0.3],
      ],
      [
        [0.02, 0.065, -0.12],
        [0.04, 0.22, 0.13],
        [0.045, 0.36, 0.4],
      ],
      [
        [0.01, -0.02, -0.12],
        [0.045, -0.12, 0.21],
        [0.1, -0.26, 0.41],
      ],
    ].forEach((p, index) => add("ribbon_" + index, p, "ribbon", { index }));
  } else if (kind === "siphon_colossus") {
    for (const side of [-1, 1]) {
      add(
        "siphon_" + side,
        [
          [side * 0.12, 0.065, -0.31],
          [side * 0.23, 0.1, -0.45],
        ],
        "siphon",
        { side },
      );
      for (let row = 0; row < 4; row++) {
        const z = -0.27 + row * 0.155;
        add("skirt_" + side + "_" + row, [[side * 0.08, -0.065, z]], "skirt", {
          side,
          row,
        });
      }
    }
  } else if (kind === "spiral_grazer") {
    for (const side of [-1, 1]) {
      add(
        "fin_" + side,
        [
          [side * 0.11, -0.15, -0.13],
          [side * 0.26, -0.19, -0.1],
          [side * 0.43, -0.22, -0.05],
        ],
        "fin",
        { side },
      );
      add(
        "feeler_" + side,
        [
          [side * 0.055, -0.09, -0.25],
          [side * 0.08, 0.02, -0.35],
          [side * 0.08, 0.13, -0.48],
        ],
        "feeler",
        { side },
      );
    }
    add(
      "foot",
      [
        [0, -0.19, 0.15],
        [0, -0.17, 0.3],
        [0, -0.15, 0.44],
      ],
      "foot",
    );
  }
  const nearest = (type) =>
    chains
      .filter((c) => c.type === type)
      .map((c) => ({ c, d: nearestChain(point, c).distance }))
      .sort((a, b) => a.d - b.d)[0].c;
  const asset = europaGiantAsset(kind, (x, y, z, ids, w, o) => {
    point.set(x, y, z);
    ids[o] = 0;
    w[o] = 1;
    const single = (c, blend) => {
      ids[o + 1] = c.ids[0];
      w[o] = 1 - blend;
      w[o + 1] = blend;
    };
    if (kind === "crown_filterer") {
      const armBlend = smooth(-0.13, -0.035, z);
      if (armBlend === 0) {
        single(chains[0], 1 - smooth(-0.2, -0.12, z));
      } else {
        const arms = chains.filter((c) => c.type === "arm"),
          azimuth =
            THREE.MathUtils.euclideanModulo(Math.atan2(y, x), Math.PI * 2) /
            (Math.PI / 4),
          lo = Math.floor(azimuth),
          mix = azimuth - lo,
          stations = [-0.065, 0.12, 0.3, 0.47];
        let row = 0;
        while (row < 2 && z > stations[row + 1]) row++;
        const along = THREE.MathUtils.clamp(
            (z - stations[row]) / (stations[row + 1] - stations[row]),
            0,
            1,
          ),
          influence = new Map([[0, 1 - armBlend]]);
        for (const [arm, f] of [
          [arms[lo], 1 - mix],
          [arms[(lo + 1) % 8], mix],
        ]) {
          influence.set(arm.ids[row], armBlend * f * (1 - along));
          influence.set(arm.ids[row + 1], armBlend * f * along);
        }
        const top = [...influence].sort((a, b) => b[1] - a[1]).slice(0, 4),
          total = top.reduce((n, a) => n + a[1], 0);
        for (let i = 0; i < 4; i++) {
          ids[o + i] = top[i]?.[0] || 0;
          w[o + i] = (top[i]?.[1] || 0) / total;
        }
      }
    } else if (kind === "bell_carrier") {
      // The entire canopy uses one continuous squeeze. Pendant chains only
      // take over behind the rim, avoiding hard nearest-arm seams in the hood.
      const body = 1 - smooth(-0.13, 0.015, z);
      ids[o] = chains[0].ids[0];
      w[o] = body;
      const candidates = chains
        .filter((c) => c.type === "ribbon")
        .map((c) => ({ c, h: nearestChain(point, c) }))
        .sort((a, b) => a.h.distance - b.h.distance);
      const first = candidates[0],
        second = candidates[1];
      const weight =
        1 /
        (1 +
          Math.exp(
            -Math.min(40, (second.h.distance - first.h.distance) * 550),
          ));
      const influences = new Map([[chains[0].ids[0], body]]);
      for (const [candidate, f] of [
        [first, weight],
        [second, 1 - weight],
      ]) {
        const h = candidate.h;
        influences.set(
          h.a,
          (influences.get(h.a) || 0) + (1 - body) * f * (1 - h.t),
        );
        influences.set(h.b, (influences.get(h.b) || 0) + (1 - body) * f * h.t);
      }
      const top = [...influences].sort((a, b) => b[1] - a[1]).slice(0, 4),
        total = top.reduce((n, a) => n + a[1], 0);
      for (let i = 0; i < 4; i++) {
        ids[o + i] = top[i]?.[0] || 0;
        w[o + i] = (top[i]?.[1] || 0) / total;
      }
    } else if (kind === "siphon_colossus") {
      if (Math.abs(x) > 0.13 && z < -0.28 && y > 0.01)
        chainWeights(
          nearest("siphon"),
          point,
          smooth(0.13, 0.21, Math.abs(x)),
          ids,
          w,
          o,
        );
      else if (y < -0.07) {
        const side = x < 0 ? -1 : 1,
          row = THREE.MathUtils.clamp((z + 0.27) / 0.155, 0, 3),
          i = Math.min(2, Math.floor(row)),
          t = row - i;
        const blend =
          (1 - smooth(-0.17, -0.07, y)) * smooth(0.04, 0.14, Math.abs(x));
        const a = chains.find(
            (c) => c.type === "skirt" && c.side === side && c.row === i,
          ),
          b = chains.find(
            (c) => c.type === "skirt" && c.side === side && c.row === i + 1,
          );
        ids[o + 1] = a.ids[0];
        ids[o + 2] = b.ids[0];
        w[o] = 1 - blend;
        w[o + 1] = blend * (1 - t);
        w[o + 2] = blend * t;
      }
    } else if (kind === "spiral_grazer") {
      // The shell ends well behind the feelers; shell vertices remain on the rigid root.
      if (z < -0.25)
        chainWeights(
          nearest("feeler"),
          point,
          1 - smooth(-0.4, -0.25, z),
          ids,
          w,
          o,
        );
      else if (y < -0.13 && Math.abs(x) > 0.13)
        chainWeights(
          nearest("fin"),
          point,
          smooth(0.13, 0.3, Math.abs(x)) * (1 - smooth(-0.18, -0.13, y)),
          ids,
          w,
          o,
        );
      else if (y < -0.13 && z > 0.15)
        chainWeights(
          chains.find((c) => c.type === "foot"),
          point,
          (1 - smooth(-0.2, -0.13, y)) * smooth(0.06, 0.27, z),
          ids,
          w,
          o,
        );
    }
  });
  const mesh = bindOrganicBody(
    root,
    kind + "_hf_surface",
    asset.geometry,
    asset.material,
    bones,
    0.2,
  );
  const state = { drive: 0, phase: 0 };
  root.userData.hfRig = { kind, mesh, bones, chains, asset, state };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_europa_giants_20261026";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false,
    previous;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  motions.push((t, speed, motion) => {
    const delta = previous === undefined || t < previous ? 0 : t - previous;
    previous = t;
    const dt =
      delta > 0 ? Math.min(0.12, motion?.dt ?? delta / (1.7 + speed * 1.1)) : 0;
    const travel = motion
      ? motion.travelSpeed / Math.max(1, motion.cruiseSpeed)
      : speed;
    state.drive +=
      (THREE.MathUtils.clamp(travel, 0, 2.2) - state.drive) *
      (1 - Math.exp(-dt * 4));
    state.phase +=
      dt *
      Math.PI *
      2 *
      {
        crown_filterer: 0.65,
        bell_carrier: 0.36,
        siphon_colossus: 0.25,
        spiral_grazer: 0.48,
      }[kind] *
      (0.35 + 0.65 * state.drive);
    const phase = state.phase,
      drive = state.drive;
    for (const c of chains) {
      if (c.type === "mantle") {
        const pulse = Math.max(0, Math.sin(phase)) ** 3;
        const s = 1 - pulse * 0.035 * Math.min(1, drive);
        bones[c.ids[0]].scale.set(s, s, 1 + (1 - s) * 0.5);
      } else if (c.type === "arm") {
        // The trailing bundle carries a visible travelling bend, with a small
        // circumferential offset for each arm. Roots stay planted; the same
        // continuous field preserves the web instead of rotating rigid rods.
        const gathered = smooth(0.05, 1.25, drive),
          spread = 1.16 - gathered * 0.3,
          jet = Math.max(0, Math.sin(phase)) ** 4;
        c.ids.forEach((id, i) => {
          const z = c.points[i][2],
            t = smooth(-0.065, 0.47, z),
            wave = phase * 0.9 - t * 4,
            width =
              1 +
              (spread -
                1 +
                Math.sin(wave + c.angle) * (0.025 + 0.055 * gathered)) *
                t,
            sway = (0.012 + 0.024 * gathered) * (1 - jet * 0.3) * t,
            x = Math.sin(wave) * sway,
            y = Math.cos(wave - 0.6) * sway * 0.8;
          bones[id].position.set(
            c.points[i][0] * width + x,
            c.points[i][1] * width + y,
            z,
          );
          bones[id].scale.set(width, width, 1);
        });
      } else if (c.type === "umbrella") {
        const squeeze =
          Math.max(0, Math.sin(phase)) ** 2 *
          (0.035 + 0.1 * Math.min(1.3, drive));
        bones[c.ids[0]].scale.set(1 - squeeze, 1 - squeeze, 1 + squeeze * 0.4);
      } else if (c.type === "ribbon")
        c.ids.forEach((id, i) => {
          bones[id].rotation.x =
            (Math.sin(phase - i * 0.65 + c.index * 0.6) *
              (0.025 + 0.065 * drive) *
              (i + 0.5)) /
            3;
          bones[id].rotation.y =
            (Math.cos(phase - i * 0.6 + c.index) *
              (0.018 + 0.045 * drive) *
              (i + 0.5)) /
            3;
        });
      else if (c.type === "siphon") {
        bones[c.ids[1]].scale.setScalar(
          1 + Math.sin(phase - c.side * 0.2) * 0.035,
        );
      } else if (c.type === "skirt") {
        bones[c.ids[0]].rotation.z =
          c.side *
          Math.sin(phase - c.row * 0.65) *
          (0.025 + 0.075 * Math.min(1.3, drive));
      } else if (c.type === "fin")
        c.ids.forEach((id, i) => {
          bones[id].rotation.z =
            c.side *
            Math.sin(phase - i * 0.7) *
            (0.04 + 0.21 * Math.min(1.3, drive)) *
            (i === 0 ? 0.6 : 0.4);
        });
      else if (c.type === "feeler")
        c.ids.forEach((id, i) => {
          bones[id].rotation.x =
            Math.sin(phase * 0.6 + c.side + i * 0.6) * 0.035;
          bones[id].rotation.y =
            c.side * Math.cos(phase * 0.6 + i * 0.7) * 0.02;
        });
      else if (c.type === "foot")
        c.ids.forEach((id, i) => {
          bones[id].rotation.x =
            (Math.sin(phase - i * 0.8) * (0.02 + 0.035 * drive) * i) / 2;
        });
    }
  });
}
