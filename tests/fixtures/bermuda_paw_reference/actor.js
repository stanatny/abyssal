import * as THREE from "three";
import { acquireBermudaSleepingTitanAsset } from "../../../src/bermuda_sleeping_titan_asset.js";
import { bermudaSeabedHeight } from "../../../src/bermuda_terrain.js";
import footBinding from "./binding.json" with { type: "json" };
import { cloneCleanOriginal } from "./cleanup.js";
import { createWholeWristSeatSampledSupports } from "./supports_sampled.js";

export const footPivot = new THREE.Vector3(
  -0.14362746477127075,
  -0.11010973155498505,
  -0.25123584270477295,
);
export const footPitch = 0.26;
export function createBermudaWholeWristSeatSampledCandidate(
  parent,
  { heightAt = bermudaSeabedHeight } = {},
) {
  const asset = acquireBermudaSleepingTitanAsset(),
    root = new THREE.Group(),
    pose = new THREE.Group(),
    length = 280,
    rotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -Math.PI / 2,
    ),
    cleaned = cloneCleanOriginal(asset),
    { geometry, farGeometry } = cleaned,
    near = new THREE.SkinnedMesh(geometry, asset.material),
    far = new THREE.SkinnedMesh(farGeometry, asset.farMaterial),
    baseBone = new THREE.Bone(),
    pawBone = new THREE.Bone(),
    p = geometry.attributes.position,
    weights = cleaned.sourceVertexIds.map((i) => footBinding.weights[i]),
    probe = new THREE.Vector3(),
    skinIndex = new Uint16Array(p.count * 4),
    skinWeight = new Float32Array(p.count * 4);
  root.name = "original_whole_hf_local_wrist_candidate";
  root.userData.inspectionOnly = true;
  parent.add(root);
  root.add(pose);
  pose.position.set(-290, 0, -1590);
  pose.quaternion.copy(rotation);
  pose.scale.setScalar(length);
  let originY = -Infinity,
    feetSamples = 0;
  for (const i of cleaned.usedVertexIds) {
    if (p.getY(i) > -0.095 || Math.abs(p.getX(i)) < 0.065 || p.getZ(i) > 0.16)
      continue;
    probe
      .fromBufferAttribute(p, i)
      .multiplyScalar(length)
      .applyQuaternion(rotation);
    originY = Math.max(
      originY,
      heightAt(pose.position.x + probe.x, pose.position.z + probe.z) - probe.y,
    );
    feetSamples++;
  }
  pose.position.y = originY + 0.12;
  pose.add(near, far);
  far.visible = false;
  near.frustumCulled = false;
  far.frustumCulled = false;
  near.name = "original_whole_hf_true_forefoot_local_wrist";
  far.name = "original_whole_hf_true_forefoot_far";
  for (let i = 0; i < p.count; i++) {
    const w = weights[i];
    skinIndex[i * 4 + 1] = 1;
    skinWeight[i * 4] = 1 - w;
    skinWeight[i * 4 + 1] = w;
  }
  for (const g of [geometry, farGeometry]) {
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
    g.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(skinWeight, 4),
    );
  }
  baseBone.name = "fixed_original_whole_body";
  pawBone.name = "real_negative_x_front_wrist";
  pawBone.position.copy(footPivot);
  baseBone.add(pawBone);
  near.add(baseBone);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton([baseBone, pawBone]);
  near.bind(skeleton);
  far.bind(skeleton, near.bindMatrix.clone());
  let disposed = false;
  for (const mesh of [near, far]) {
    mesh.boundingBox = mesh.geometry.boundingBox.clone().expandByScalar(0.06);
    mesh.boundingSphere = mesh.geometry.boundingSphere.clone();
    mesh.boundingSphere.radius += 0.06;
  }
  function setPose(state = {}) {
    const guard = THREE.MathUtils.clamp(state.guardAmount ?? 1, 0, 1);
    pawBone.rotation.x = footPitch * (1 - guard);
    root.userData.guardAmount = guard;
    root.updateMatrixWorld(true);
    skeleton.update();
  }
  const prepare = (options) => asset.prepare(options);
  root.userData.prepareMaterials = prepare;
  setPose({ guardAmount: 1 });
  const supports = createWholeWristSeatSampledSupports(root, {
    near,
    pose,
    setPose,
    heightAt,
  });
  return {
    inspectionOnly: true,
    root,
    pose,
    near,
    far,
    front: { root: pose, near, far, width: length },
    rearPose: null,
    rearNear: null,
    rearFar: null,
    beds: [{ mesh: supports.body }],
    treasureRock: { mesh: supports.body, root: supports.body },
    relicPoint: supports.relicPoint,
    relicQuaternion: pose.quaternion.clone(),
    foot: {
      bone: pawBone,
      index: 1,
      pivot: footPivot.clone(),
      pitch: footPitch,
      weights,
    },
    sourceVertexIds: cleaned.sourceVertexIds,
    candidate: {
      source:
        "Original full HF768a1452; only connected original forefoot/wrist is locally bound",
      length,
      feetSamples,
      vertices: p.count,
      triangles: geometry.index.count / 3,
      cleanup: cleaned.metadata,
      binding: footBinding.metadata,
      supports: supports.metadata,
      contactsUnbaked: true,
      jawUnrigged: true,
    },
    setPose,
    setBreathLean() {},
    prepare,
    dispose() {
      if (disposed) return;
      disposed = true;
      supports.dispose();
      root.removeFromParent();
      geometry.dispose();
      farGeometry.dispose();
      skeleton.dispose();
      asset.release();
    },
  };
}
