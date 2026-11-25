import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildLadonHF, LADON_HF_DATA } from "../src/ladon_hf_asset.js";

function create() {
  const root = new T.Group(),
    motions = [];
  buildLadonHF(root, motions);
  root.userData.animate = (time, speed = 1) =>
    motions.forEach((motion) => motion(time, speed));
  return root;
}

test("Ladon is a real packed textured HF whole-body mesh with a measured extended swimming rest", () => {
  assert.match(LADON_HF_DATA.sourceSha256, /^[a-f0-9]{64}$/);
  assert.ok(
    LADON_HF_DATA.triangles >= 20000 && LADON_HF_DATA.triangles <= 26000,
  );
  assert.ok(LADON_HF_DATA.vertices < 30000);
  assert.equal(LADON_HF_DATA.max[2] - LADON_HF_DATA.min[2], 1);
  assert.ok(
    LADON_HF_DATA.centerlineLength > 0.98 &&
      LADON_HF_DATA.centerlineLength < 1.02,
  );
  const root = create();
  assert.equal(root.userData.anatomy.singleHead, true);
  assert.equal(root.userData.anatomy.limbs, 0);
  assert.equal(
    root.userData.hfRig.mesh.geometry.index.count / 3,
    LADON_HF_DATA.triangles,
  );
  assert.ok(root.userData.hfRig.mesh.userData.lordCoreParts.length >= 10);
  assert.ok(root.userData.tailSweepAnchors.length >= 8);
  assert.ok(
    root.userData.tailSweepAnchors.every(
      (a) => a.userData.radius > 0 && a.userData.radius < 0.06,
    ),
  );
  root.userData.disposeLocalMotion();
});

test("Ladon continuous skin, tail attack and instance-owned bones remain finite and bounded", () => {
  const root = create(),
    other = create();
  const { mesh } = root.userData.hfRig;
  const geometry = mesh.geometry;
  const rest = Array.from(
    { length: geometry.attributes.position.count },
    (_, i) =>
      new T.Vector3().fromBufferAttribute(geometry.attributes.position, i),
  );
  assert.equal(geometry, other.userData.hfRig.mesh.geometry);
  assert.notEqual(mesh.skeleton, other.userData.hfRig.mesh.skeleton);
  let moved = 0,
    worst = 0;
  const seams = new Map();
  for (let i = 0; i < rest.length; i++) {
    const weights = Array.from({ length: 4 }, (_, j) => [
      geometry.attributes.skinIndex.array[i * 4 + j],
      geometry.attributes.skinWeight.array[i * 4 + j],
    ]);
    assert.ok(Math.abs(weights.reduce((n, w) => n + w[1], 0) - 1) < 1e-5);
    const key = rest[i].toArray().join(",");
    if (seams.has(key)) assert.deepEqual(weights, seams.get(key));
    else seams.set(key, weights);
  }
  let previousTail;
  let maxStep = 0;
  for (let frame = 0; frame <= 540; frame++) {
    const t = frame / 60;
    const phase = t < 2.6 ? "windup" : t < 4.4 ? "attack" : "recover";
    const progress =
      phase === "windup"
        ? t / 2.6
        : phase === "attack"
          ? (t - 2.6) / 1.8
          : (t - 4.4) / 4.5;
    root.userData.setLadonCombat({ phase, ability: "tail_sweep", progress });
    root.userData.animate(t, 1);
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const tail = root.userData.tailSweepAnchors
      .at(-1)
      .getWorldPosition(new T.Vector3());
    if (previousTail)
      maxStep = Math.max(maxStep, tail.distanceTo(previousTail));
    previousTail = tail;
    if (frame % 20) continue;
    const now = rest.map((_, i) => mesh.getVertexPosition(i, new T.Vector3()));
    for (let i = 0; i < now.length; i++) {
      assert.ok(now[i].toArray().every(Number.isFinite));
      moved = Math.max(moved, now[i].distanceTo(rest[i]));
    }
    const ix = geometry.index.array;
    for (let j = 0; j < ix.length; j += 3)
      for (let k = 0; k < 3; k++) {
        const a = ix[j + k],
          b = ix[j + ((k + 1) % 3)],
          d = rest[a].distanceTo(rest[b]);
        if (d > 0.002) worst = Math.max(worst, now[a].distanceTo(now[b]) / d);
      }
  }
  assert.ok(
    moved > 0.03,
    "Actual tail skin must sweep, not only invisible anchors",
  );
  assert.ok(worst < 1.6, `Skin edge stretches ${worst}`);
  assert.ok(maxStep < 0.012, `Tail step ${maxStep}`);
  const freeze = mesh.skeleton.bones.map((b) => b.quaternion.toArray());
  root.userData.animate(9, 1);
  assert.deepEqual(
    mesh.skeleton.bones.map((b) => b.quaternion.toArray()),
    freeze,
  );
  assert.ok(
    other.userData.hfRig.bones.every((b) =>
      b.quaternion.equals(new T.Quaternion()),
    ),
  );
  mesh.skeleton.computeBoneTexture();
  let disposed = 0;
  mesh.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
  root.userData.disposeLocalMotion();
  root.userData.disposeLocalMotion();
  assert.equal(disposed, 1);
  other.userData.disposeLocalMotion();
});
