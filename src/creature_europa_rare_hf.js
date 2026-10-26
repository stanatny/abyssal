import * as THREE from "three";
import { europaRareAsset, seraphMembraneLabels } from "./europa_rare_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, lordEffortSmoother } from "./hawaii_lord_rig.js";

/** Three paired membranes fitted to the actual second HF export, not the legacy fan. */
export function buildEuropaRareHF(root, motions) {
  const base = new THREE.Bone();
  base.name = "crystal_seraph_sensory_sac";
  root.add(base);
  const bones = [base],
    chains = [],
    point = new THREE.Vector3();
  for (const side of [-1, 1])
    for (let pair = 0; pair < 3; pair++) {
      const z = [-0.19, 0.025, 0.21][pair],
        sweep = [-0.14, 0.015, 0.16][pair];
      const points = [
        [side * 0.085, 0, z],
        [side * 0.21, 0.015, z + sweep * 0.45],
        [side * 0.37, 0.025, z + sweep],
      ];
      const chain = { side, pair, points, ids: [] };
      points.forEach((p, i) => {
        const bone = new THREE.Bone();
        bone.name = `seraph_membrane_${side}_${pair}_${i}`;
        bone.position.fromArray(p);
        const parent = i ? bones[chain.ids[i - 1]] : base;
        if (i) bone.position.sub(new THREE.Vector3(...points[i - 1]));
        parent.add(bone);
        chain.ids.push(bones.length);
        bones.push(bone);
      });
      chains.push(chain);
    }
  const asset = europaRareAsset((x, y, z, ids, weights, offset, index) => {
    point.set(x, y, z);
    const label = seraphMembraneLabels[index];
    if (!label) {
      ids[offset] = 0;
      weights[offset] = 1;
      return;
    }
    chainWeights(
      chains[label - 1],
      point,
      THREE.MathUtils.smoothstep(Math.abs(x), 0.1, 0.19),
      ids,
      weights,
      offset,
    );
  });
  const mesh = bindOrganicBody(
    root,
    "crystal_seraph_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.16,
  );
  root.userData.hfRig = { kind: "crystal_seraph", mesh, bones, chains };
  root.userData.normalizedLength = 1;
  root.userData.guideRadius = 0.76;
  root.userData.artRevision = "trellis_europa_rare_20261026";
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed) => {
    const drive = THREE.MathUtils.smoothstep(effort(phase, speed), 0.3, 2.4);
    for (const c of chains)
      c.ids.forEach((id, i) => {
        const wave = phase * 0.95 - c.pair * 0.85 - i * 0.6;
        bones[id].rotation.z =
          c.side *
          (Math.sin(wave) * (0.12 + 0.055 * drive) + 0.045) *
          (i === 0 ? 0.7 : 1);
        bones[id].rotation.y =
          c.side * (-drive * 0.075 + Math.cos(wave - 0.7) * 0.035);
        bones[id].rotation.x = Math.sin(wave - 0.4) * 0.018;
      });
    base.scale.set(
      1 + Math.sin(phase * 0.65) * 0.008,
      1 + Math.sin(phase * 0.65) * 0.012,
      1,
    );
  });
}
