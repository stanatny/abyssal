import * as THREE from "three";
import { crimsonSailAsset } from "./crimson_sail_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { lordEffortSmoother } from "./hawaii_lord_rig.js";

const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
const BODY_Z = [-0.18, -0.02, 0.14, 0.28, 0.38];
const SAIL_Z = [-0.14, -0.01, 0.12, 0.25];
const sailRoot = (z) => 0.015 - 0.2 * (z + 0.1);
function along(z, positions, ids) {
  if (z <= positions[0]) return [[ids[0], 1]];
  for (let i = 1; i < positions.length; i++) {
    if (z <= positions[i]) {
      const t = (z - positions[i - 1]) / (positions[i] - positions[i - 1]);
      return [
        [ids[i - 1], 1 - t],
        [ids[i], t],
      ];
    }
  }
  return [[ids.at(-1), 1]];
}

/** 绯帆保留稳定长吻，后躯连续摆尾；帆根随躯干，帆梢轻微滞后。 */
export function buildCrimsonSailHF(root, motions) {
  const base = new THREE.Bone();
  base.name = "crimson_sail_root";
  root.add(base);
  const bones = [base];
  const add = (name, position, parent = base, parentPosition = [0, 0, 0]) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.fromArray(position).sub(new THREE.Vector3(...parentPosition));
    parent.add(bone);
    bones.push(bone);
    return bones.length - 1;
  };
  const body = [];
  BODY_Z.forEach((z, i) =>
    body.push(
      add(
        `body_${i}`,
        [0, -0.09, z],
        i ? bones[body[i - 1]] : base,
        i ? [0, -0.09, BODY_Z[i - 1]] : [0, 0, 0],
      ),
    ),
  );
  const sail = SAIL_Z.map((z, i) => {
    const index = Math.max(
      0,
      BODY_Z.findLastIndex((v) => v <= z),
    );
    return add(`sail_${i}`, [0, sailRoot(z), z], bones[body[index]], [
      0,
      -0.09,
      BODY_Z[index],
    ]);
  });
  const pec = [-1, 1].map((side) =>
    add(`pectoral_${side}`, [side * 0.034, -0.11, -0.155], bones[body[0]], [
      0,
      -0.09,
      BODY_Z[0],
    ]),
  );
  const asset = crimsonSailAsset((x, y, z, ids, weights, o) => {
    const torso = along(z, BODY_Z, body);
    const fin =
      smooth(sailRoot(z), sailRoot(z) + 0.075, y) *
      smooth(-0.19, -0.14, z) *
      (1 - smooth(0.26, 0.31, z)) *
      (1 - smooth(0.02, 0.035, Math.abs(x)));
    const p =
      smooth(0.036, 0.062, Math.abs(x)) *
      smooth(-0.19, -0.12, z) *
      (1 - smooth(0.09, 0.17, z)) *
      (1 - smooth(-0.15, -0.11, y));
    const chosen = p > 0 ? [[pec[x < 0 ? 0 : 1], 1]] : along(z, SAIL_Z, sail);
    const amount = p > 0 ? p : fin;
    const all = new Map();
    for (const [id, w] of torso)
      all.set(id, (all.get(id) || 0) + w * (1 - amount));
    for (const [id, w] of chosen) all.set(id, (all.get(id) || 0) + w * amount);
    let i = 0;
    for (const [id, w] of all) {
      ids[o + i] = id;
      weights[o + i] = w;
      i++;
    }
  });
  const mesh = bindOrganicBody(
    root,
    "crimson_sail_hf_body",
    asset.geometry,
    asset.material,
    bones,
    0.2,
  );
  root.userData.hfRig = { kind: "crimson_sail", mesh, bones, body, sail, pec };
  root.userData.artRevision = "trellis_bermuda_crimson_20261023";
  root.userData.normalizedLength = 1;
  root.userData.prepareMaterials = asset.prepare;
  // 世界入口也主动申请贴图，不能依赖先打开图鉴来暖缓存。
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  const effort = lordEffortSmoother();
  motions.push((phase, speed = 1) => {
    const e = effort(phase, speed);
    body.forEach((id, i) => {
      bones[id].rotation.y =
        i === 0
          ? 0
          : Math.sin(phase * 1.15 - i * 0.68) *
            (0.018 + i * 0.021) *
            (0.7 + e * 0.23);
    });
    sail.forEach((id, i) => {
      bones[id].rotation.z =
        (Math.sin(phase * 0.9 - i * 0.55) * 0.042) / (1 + e * 0.16);
    });
    pec.forEach((id, i) => {
      const side = i ? 1 : -1;
      bones[id].rotation.z =
        side * (0.025 + Math.sin(phase * 0.75 + i * 0.3) * 0.06);
      bones[id].rotation.y = side * (0.018 + smooth(1, 3, e) * 0.04);
    });
  });
}
