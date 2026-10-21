import * as THREE from "three";
import { pelicanHfAsset } from "./pelican_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { chainWeights, createLordBones } from "./hawaii_lord_rig.js";
const smooth = THREE.MathUtils.smoothstep,
  point = new THREE.Vector3();
/** 褐鹈鹕保持收颈，宽翼滑翔间歇接有力拍翼；实际航线仍归表层系统所有。 */
export function buildPelicanHF(root, motions) {
  const anatomy = new THREE.Group();
  anatomy.name = "pelican_anatomy";
  root.add(anatomy);
  const chains = [-1, 1].map((side) => ({
    name: `wing_${side}`,
    type: "wing",
    side,
    points: [
      [side * 0.135, 0.005, 0.065],
      [side * 0.34, 0.1, 0.085],
      [side * 0.51, 0.18, 0.11],
    ],
  }));
  chains.push({
    name: "tail",
    type: "tail",
    points: [
      [0, -0.16, 0.32],
      [0, -0.19, 0.43],
    ],
  });
  const bones = createLordBones(anatomy, chains);
  const asset = pelicanHfAsset((x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    const outer = smooth(Math.abs(x), 0.13, 0.23);
    const wing = outer * (1 - smooth(z, 0.28, 0.36)) * smooth(y, -0.18, -0.055);
    if (wing > 0) chainWeights(chains[x < 0 ? 0 : 1], point, wing, ids, w, o);
    else if (z > 0.33 && Math.abs(x) < 0.15 && y > -0.25)
      chainWeights(chains[2], point, smooth(z, 0.33, 0.42), ids, w, o);
  });
  const mesh = bindOrganicBody(
    anatomy,
    "pelican_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.6,
  );
  root.userData.hfRig = { kind: "pelican", mesh, bones, chains };
  root.userData.artRevision = "trellis_pelican_20261021";
  root.userData.normalizedLength = 1;
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    mesh.skeleton.dispose();
  };
  motions.push((t) => {
    // 上游已按速度连续积累相位；这里不再给频率乘一次速度。
    const flap = smooth(Math.sin(t * 0.25), -0.1, 0.55);
    for (const c of chains.slice(0, 2)) {
      bones[c.ids[0]].rotation.z =
        c.side * (-0.27 + flap * Math.sin(t * 1.6) * 0.52);
      bones[c.ids[1]].rotation.z =
        c.side * (-0.04 + flap * Math.sin(t * 1.6 - 0.35) * 0.12);
      bones[c.ids[2]].rotation.z =
        c.side * (flap * Math.sin(t * 1.6 - 0.65) * 0.07);
      bones[c.ids[1]].rotation.y =
        c.side * flap * Math.cos(t * 1.6 - 0.35) * 0.045;
      bones[c.ids[2]].rotation.y =
        c.side * flap * Math.cos(t * 1.6 - 0.65) * 0.045;
    }
    chains[2].ids.forEach((id, j) => {
      bones[id].rotation.x = Math.sin(t * 0.55 - j * 0.3) * 0.02;
    });
  });
}
