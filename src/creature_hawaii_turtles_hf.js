import * as THREE from "three";
import { hawaiiTurtleAsset } from "./hawaii_turtle_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { lordEffortSmoother } from "./hawaii_lord_rig.js";

const smooth = (a, b, value) => THREE.MathUtils.smoothstep(value, a, b);

/** 海龟以前鳍作同步水翼推进，后鳍小幅调整；背甲不参与鱼类尾波。 */
export function buildHawaiiTurtleHF(kind, root, motions) {
  const ancient = kind === "archelon";
  const base = new THREE.Bone();
  base.name = `${kind}_shell_support`;
  root.add(base);
  const bones = [base],
    chains = [];
  for (const rear of [false, true])
    for (const side of [-1, 1]) {
      const point = rear
        ? [side * 0.12, -0.055, 0.28]
        : [side * 0.13, -0.025, -0.265];
      const bone = new THREE.Bone();
      bone.name = `${kind}_${rear ? "hind" : "fore"}_${side}`;
      bone.position.fromArray(point);
      base.add(bone);
      chains.push({
        name: bone.name,
        type: "fin",
        rear,
        side,
        points: [point],
        ids: [bones.length],
      });
      bones.push(bone);
    }
  const tail = new THREE.Bone();
  tail.name = `${kind}_tail`;
  tail.position.set(0, -0.035, 0.32);
  base.add(tail);
  const tailId = bones.length;
  bones.push(tail);
  const asset = hawaiiTurtleAsset(kind, (x, y, z, ids, weights, offset) => {
    ids[offset] = 0;
    weights[offset] = 1;
    const rear = z > 0.2,
      fin = chains[(rear ? 2 : 0) + (x < 0 ? 0 : 1)];
    const limit = rear ? 0.075 : 0.13 + smooth(-0.27, -0.08, z) * 0.15;
    const lateral = smooth(limit, limit + (rear ? 0.065 : 0.09), Math.abs(x));
    const vertical = 1 - smooth(rear ? -0.015 : 0.015, rear ? 0.04 : 0.07, y);
    const longitudinal = rear
      ? smooth(0.24, 0.31, z)
      : smooth(-0.4, -0.33, z) * (1 - smooth(-0.09, 0.005, z));
    const blend = lateral * vertical * longitudinal;
    weights[offset] = 1 - blend;
    ids[offset + 3] = fin.ids[0];
    weights[offset + 3] = blend;
    const tailBlend =
      smooth(0.34, 0.41, z) * (1 - smooth(0.025, 0.065, Math.abs(x)));
    if (tailBlend > 0) {
      weights[offset] *= 1 - tailBlend;
      weights[offset + 3] *= 1 - tailBlend;
      ids[offset + 1] = tailId;
      weights[offset + 1] = tailBlend;
    }
  });
  const mesh = bindOrganicBody(
    root,
    `${kind}_hf_body`,
    asset.geometry,
    asset.material,
    bones,
    0.4,
  );
  root.userData.hfRig = { kind, chains, bones, mesh };
  root.userData[ancient ? "ancientAnatomy" : "shoalAnatomy"] = kind;
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_hawaii_turtles_20261019";
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
      t = phase * (ancient ? 0.66 : 0.82);
    for (const fin of chains) {
      const b = bones[fin.ids[0]],
        s = fin.side;
      if (fin.rear) {
        b.rotation.z = s * (0.025 + Math.sin(t * 0.7 - 0.5) * 0.075);
        b.rotation.y = -s * (0.025 + e * 0.035 + Math.cos(t * 0.7) * 0.035);
        b.rotation.x = Math.cos(t * 0.7) * 0.035;
      } else {
        b.rotation.z = s * (0.015 + Math.sin(t) * (0.28 + e * 0.1));
        b.rotation.y = -s * Math.cos(t) * (0.055 + e * 0.035);
        b.rotation.x = Math.cos(t) * (0.09 + e * 0.03);
      }
    }
    tail.rotation.y = Math.sin(t * 0.6) * 0.035;
  });
}
