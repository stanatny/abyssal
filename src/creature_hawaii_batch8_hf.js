import * as THREE from "three";
import { hawaiiBatch8Asset } from "./hawaii_batch8_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  createLordBones,
  lordEffortSmoother,
} from "./hawaii_lord_rig.js";
const smooth = (a, b, v) => THREE.MathUtils.smoothstep(v, a, b);
const point = new THREE.Vector3();

/** Fitted to the exported meshes: paired fin propulsion, rigid box carapace and a supported lure. */
export function buildHawaiiBatch8HF(kind, root, motions) {
  const box = kind === "boxfish",
    angler = kind === "angler";
  const fin = angler
    ? [0.145, -0.065, -0.12]
    : box
      ? [0.105, -0.06, -0.205]
      : kind === "wrasse"
        ? [0.108, -0.055, -0.22]
        : [0.095, -0.06, -0.245];
  const chains = [
    {
      name: "tail",
      type: "tail",
      points: (box
        ? [0.16, 0.26, 0.345]
        : angler
          ? [0.07, 0.24, 0.38]
          : [0.02, 0.19, 0.34]
      ).map((z) => [0, angler ? -0.045 : box ? -0.015 : 0, z]),
    },
  ];
  for (const side of [-1, 1])
    chains.push({
      name: `pectoral_${side}`,
      type: "pectoral",
      side,
      points: [[side * fin[0], fin[1], fin[2]]],
    });
  if (box) {
    chains.push({
      name: "dorsal",
      type: "median",
      side: 1,
      points: [[0, 0.045, 0.1]],
    });
    chains.push({
      name: "anal",
      type: "median",
      side: -1,
      points: [[0, -0.09, 0.19]],
    });
  }
  if (angler)
    chains.push({ name: "lure", type: "lure", points: [[0, 0.09, -0.32]] });
  const bones = createLordBones(root, chains);
  bones[0].name = `${kind}_root`;
  const asset = hawaiiBatch8Asset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    const tailBlend = smooth(
      box ? 0.16 : angler ? 0.015 : -0.065,
      box ? 0.23 : 0.12,
      z,
    );
    chainWeights(chains[0], point, tailBlend, ids, w, o);
    const side = x < 0 ? -1 : 1;
    let finBlend;
    if (angler)
      finBlend =
        smooth(0.158, 0.185, Math.abs(x)) *
        smooth(-0.19, -0.13, z) *
        (1 - smooth(0.055, 0.1, z)) *
        (1 - smooth(0.07, 0.11, y));
    else if (box)
      finBlend =
        smooth(0.11, 0.142, Math.abs(x)) *
        smooth(-0.29, -0.235, z) *
        (1 - smooth(-0.06, -0.025, z)) *
        smooth(-0.14, -0.1, y) *
        (1 - smooth(-0.015, 0.01, y));
    else
      finBlend =
        smooth(
          kind === "wrasse" ? 0.115 : 0.108,
          kind === "wrasse" ? 0.16 : 0.16,
          Math.abs(x),
        ) *
        smooth(-0.3, -0.24, z) *
        (1 - smooth(0.005, 0.065, z)) *
        (1 - smooth(0.035, 0.075, y));
    const overlay = (id, blend) => {
      if (blend <= 0) return;
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - blend;
      ids[o + 3] = id;
      w[o + 3] = blend;
    };
    overlay(chains[side < 0 ? 1 : 2].ids[0], finBlend);
    if (box) {
      if (y > 0.045)
        overlay(
          chains[3].ids[0],
          smooth(0.045, 0.085, y) *
            smooth(0.015, 0.06, z) *
            (1 - smooth(0.17, 0.205, z)),
        );
      if (y < -0.09)
        overlay(
          chains[4].ids[0],
          smooth(0.09, 0.125, -y) *
            smooth(0.13, 0.19, z) *
            (1 - smooth(0.28, 0.32, z)),
        );
    }
    if (angler)
      overlay(
        chains[3].ids[0],
        smooth(0.105, 0.145, y) *
          (1 - smooth(-0.285, -0.245, z)) *
          (1 - smooth(0.03, 0.065, Math.abs(x))),
      );
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.3,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData.normalizedLength = 1;
  root.userData[angler ? "hunterAnatomy" : "shoalAnatomy"] = kind;
  root.userData.artRevision = "trellis_hawaii_batch8_20261019";
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
  motions.push((phase, speed) => {
    const e = smooth(0.5, 3, effort(phase, speed)),
      t = phase * (box ? 2.3 : angler ? 0.8 : 1.25);
    chains[0].ids.forEach((id, j) => {
      bones[id].rotation.y =
        (Math.sin(t - j * 0.55) *
          (box ? 0.045 : angler ? 0.055 : 0.07) *
          (1 + e * 0.45) *
          (j + 1)) /
        2;
    });
    for (const c of chains.filter((c) => c.type === "pectoral")) {
      const p = t + (box ? c.side * 0.18 : 0);
      bones[c.ids[0]].rotation.y =
        -c.side *
        Math.sin(p) *
        (box ? 0.28 : angler ? 0.18 : 0.34) *
        (1 + e * 0.25);
      bones[c.ids[0]].rotation.z =
        c.side * Math.cos(p) * (box ? 0.13 : angler ? 0.1 : 0.17);
      bones[c.ids[0]].rotation.x = Math.cos(p) * 0.045;
    }
    for (const c of chains.filter((c) => c.type === "median"))
      bones[c.ids[0]].rotation.z = c.side * Math.sin(t + 0.7) * 0.18;
    if (angler) {
      bones[chains[3].ids[0]].rotation.z = Math.sin(t * 0.55) * 0.055;
      bones[chains[3].ids[0]].rotation.x = Math.sin(t * 0.4) * 0.022;
    }
  });
}
