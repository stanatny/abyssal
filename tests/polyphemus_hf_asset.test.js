import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import {
  buildPolyphemusHF,
  POLYPHEMUS_HF_DATA,
} from "../src/polyphemus_hf_asset.js";

function create() {
  const root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.userData.animate = (time) => motions.forEach((motion) => motion(time));
  return root;
}

test("Polyphemus retains a complete textured HF source and a height-normalized independent humanoid rig", () => {
  const root = create(),
    second = create();
  assert.match(POLYPHEMUS_HF_DATA.sourceSha256, /^[a-f0-9]{64}$/);
  assert.ok(
    POLYPHEMUS_HF_DATA.triangles >= 24000 &&
      POLYPHEMUS_HF_DATA.triangles <= 36000,
  );
  assert.equal(POLYPHEMUS_HF_DATA.min[1], -0.5);
  assert.equal(POLYPHEMUS_HF_DATA.max[1], 0.5);
  assert.equal(root.userData.anatomy.singleEye, true);
  assert.equal(root.userData.anatomy.arms, 2);
  assert.equal(root.userData.anatomy.legs, 2);
  assert.equal(root.userData.hfRig.bones.length, 22);
  assert.equal(
    root.userData.hfRig.mesh.geometry,
    second.userData.hfRig.mesh.geometry,
  );
  assert.notEqual(
    root.userData.hfRig.mesh.skeleton,
    second.userData.hfRig.mesh.skeleton,
  );
  assert.notEqual(
    root.userData.poseBones.right_shoulder,
    second.userData.poseBones.right_shoulder,
  );
  assert.ok(root.userData.hfRig.mesh.userData.lordCoreParts.length > 15);
  assert.ok(root.userData.hfRig.mesh.userData.tentacleChunks.length > 100);
  assert.equal(root.userData.throwAnchor.parent, root.userData.rightPalmAnchor);
  assert.equal(root.userData.throwReleaseProgress, 0.42);
  root.userData.disposeLocalMotion();
  second.userData.disposeLocalMotion();
});

test("Actual feet and lower body stay planted throughout a finite continuous upper-body throw", () => {
  const root = create(),
    second = create();
  const { mesh, bones } = root.userData.hfRig;
  const geometry = mesh.geometry,
    attribute = geometry.attributes.position;
  const rest = Array.from({ length: attribute.count }, (_, i) =>
    new T.Vector3().fromBufferAttribute(attribute, i),
  );
  const seams = new Map();
  for (let i = 0; i < rest.length; i++) {
    const weights = Array.from({ length: 4 }, (_, j) => [
      geometry.attributes.skinIndex.array[i * 4 + j],
      geometry.attributes.skinWeight.array[i * 4 + j],
    ]);
    assert.ok(Math.abs(weights.reduce((sum, p) => sum + p[1], 0) - 1) < 1e-5);
    const key = rest[i].toArray().join(",");
    if (seams.has(key)) assert.deepEqual(weights, seams.get(key));
    else seams.set(key, weights);
  }
  let worstStretch = 0,
    worstTriangle,
    maximumHandStep = 0,
    handExcursion = 0;
  const handRest = new T.Vector3(...POLYPHEMUS_HF_DATA.rig.anchors.rightPalm);
  let previousHand;
  const timing = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus")
    .abilityTimings.boulder;
  const attackStart = timing.windup,
    recoverStart = attackStart + timing.attack;
  const totalDuration = recoverStart + timing.recover;
  for (let frame = 0; frame <= Math.round(totalDuration * 60); frame++) {
    const time = frame / 60;
    const phase =
      time < attackStart
        ? "windup"
        : time < recoverStart
          ? "attack"
          : "recover";
    const progress =
      phase === "windup"
        ? time / timing.windup
        : phase === "attack"
          ? (time - attackStart) / timing.attack
          : (time - recoverStart) / timing.recover;
    root.userData.setPolyphemusCombat({
      phase,
      ability: "boulder_throw",
      progress,
    });
    root.userData.animate(time);
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const hand = root.userData.rightPalmAnchor.getWorldPosition(
      new T.Vector3(),
    );
    handExcursion = Math.max(handExcursion, hand.distanceTo(handRest));
    if (previousHand)
      maximumHandStep = Math.max(
        maximumHandStep,
        hand.distanceTo(previousHand),
      );
    previousHand = hand;
    assert.deepEqual(root.position.toArray(), [0, 0, 0]);
    for (const id of [0, 1, 14, 15, 16, 17, 18, 19, 20, 21])
      assert.ok(bones[id].quaternion.equals(new T.Quaternion()));
    if (frame % 20) continue;
    const now = rest.map((_, i) => mesh.getVertexPosition(i, new T.Vector3()));
    for (let i = 0; i < now.length; i++) {
      assert.ok(now[i].toArray().every(Number.isFinite));
      if (rest[i].y < -0.3)
        assert.ok(
          now[i].distanceTo(rest[i]) < 1e-6,
          `Planted vertex ${i} moved`,
        );
    }
    const ix = geometry.index.array;
    for (let i = 0; i < ix.length; i += 3)
      for (let j = 0; j < 3; j++) {
        const a = ix[i + j],
          b = ix[i + ((j + 1) % 3)],
          length = rest[a].distanceTo(rest[b]);
        if (length > 0.002) {
          const stretch = now[a].distanceTo(now[b]) / length;
          if (stretch > worstStretch) {
            worstStretch = stretch;
            worstTriangle = [a, b, time, rest[a].toArray(), rest[b].toArray()];
          }
        }
      }
  }
  assert.ok(handExcursion > 0.3, `Actual hand excursion ${handExcursion}`);
  assert.ok(maximumHandStep < 0.025, `Actual hand step ${maximumHandStep}`);
  assert.ok(
    worstStretch < 2.0,
    `Skin stretch ${worstStretch}: ${JSON.stringify(worstTriangle)}`,
  );
  const frozen = bones.map((b) => b.quaternion.toArray());
  root.userData.animate(totalDuration);
  assert.deepEqual(
    bones.map((b) => b.quaternion.toArray()),
    frozen,
  );
  assert.ok(
    second.userData.hfRig.bones.every((b) =>
      b.quaternion.equals(new T.Quaternion()),
    ),
  );
  mesh.skeleton.computeBoneTexture();
  let disposals = 0;
  mesh.skeleton.boneTexture.addEventListener("dispose", () => disposals++);
  root.userData.disposeLocalMotion();
  root.userData.disposeLocalMotion();
  assert.equal(disposals, 1);
  second.userData.disposeLocalMotion();
});
