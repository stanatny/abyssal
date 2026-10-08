import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { sampleSection } from "../src/creature_surface.js";
import {
  disposeTentacleMotion,
  tentacleChunkBounds,
} from "../src/tentacle_motion.js";

function pose(root, time, effort = 1) {
  root.userData.animate(time, effort);
  root.updateMatrixWorld(true);
}
function skinSamples(root, stride = 89) {
  const samples = [];
  root.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    for (
      let index = 0;
      index < mesh.geometry.attributes.position.count;
      index += stride
    )
      samples.push({
        mesh,
        index,
        point: mesh.getVertexPosition(index, new THREE.Vector3()),
      });
  });
  return samples;
}
function trunk(root) {
  let result;
  root.traverse((node) => {
    if (node.userData.odysseyVerticalRig?.motion.continuousWaist)
      result = node.userData.odysseyVerticalRig;
  });
  return result;
}

test("Coral Mermaid preserves unit dimensions and its fixed visible mouth through vertical swimming", () => {
  const root = createCreature("nereid", 1, 71),
    body = root.children[0],
    mouth = root.userData.mouthAnchors[0];
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3()
      .setFromObject(root, true)
      .getSize(new THREE.Vector3()),
    expectedMouth = mouth.getWorldPosition(new THREE.Vector3()),
    expectedHead = root
      .getObjectByName("nereid_anatomical_head")
      .matrixWorld.clone(),
    expectedBody = body.matrixWorld.clone();
  assert.ok(Math.abs(bounds.z - 1) < 1e-7);
  assert.ok(Math.abs(bounds.x - 0.29217869573929706) < 1e-7);
  assert.ok(Math.abs(bounds.y - 0.244627773754227) < 1e-7);
  assert.ok(
    expectedMouth.distanceTo(
      new THREE.Vector3(0, 0.003784290901499245, -0.4972520180517417),
    ) < 1e-7,
  );
  for (let frame = 0; frame <= 480; frame++) {
    pose(root, frame / 60, frame < 240 ? 0.5 : 3);
    assert.deepEqual(body.matrixWorld.elements, expectedBody.elements);
    assert.deepEqual(
      root.getObjectByName("nereid_anatomical_head").matrixWorld.elements,
      expectedHead.elements,
    );
    assert.ok(
      mouth.getWorldPosition(new THREE.Vector3()).distanceTo(expectedMouth) <
        1e-10,
    );
  }
  disposeTentacleMotion(root);
});

test("Mermaid waist, middle tail and fluke skin participate in one bounded vertical wave", () => {
  const root = createCreature("nereid", 1, 71),
    rig = trunk(root),
    skin = rig.meshes.find(
      (mesh) => mesh.geometry.attributes.position.getZ(0) < 0,
    ),
    positions = skin.geometry.attributes.position,
    zones = [
      { min: -0.245, max: -0.12, points: [] },
      { min: 0.02, max: 0.16, points: [] },
      { min: 0.36, max: 0.5, points: [] },
      { min: 0.72, max: 0.84, points: [] },
    ];
  for (const zone of zones)
    for (let index = 0; index < positions.count; index += 13)
      if (
        positions.getZ(index) >= zone.min &&
        positions.getZ(index) <= zone.max
      )
        zone.points.push({
          index,
          initial: null,
          minY: Infinity,
          maxY: -Infinity,
          maxXDelta: 0,
        });
  assert.ok(zones.every((zone) => zone.points.length > 0));
  for (let frame = 0; frame <= 360; frame++) {
    pose(root, frame / 60, 1.2);
    for (const zone of zones)
      for (const point of zone.points) {
        const live = skin.getVertexPosition(point.index, new THREE.Vector3());
        point.initial ||= live.clone();
        point.minY = Math.min(point.minY, live.y);
        point.maxY = Math.max(point.maxY, live.y);
        point.maxXDelta = Math.max(
          point.maxXDelta,
          Math.abs(live.x - point.initial.x),
        );
        assert.ok(live.toArray().every(Number.isFinite));
        const world = live.clone().applyMatrix4(skin.matrixWorld),
          chunk = skin.userData.tentacleChunks[Math.floor(point.index / 192)];
        assert.ok(
          tentacleChunkBounds(skin, chunk, new THREE.Box3()).containsPoint(
            world,
          ),
        );
      }
  }
  const amplitudes = zones.map((zone) =>
    Math.max(...zone.points.map((point) => point.maxY - point.minY)),
  );
  assert.ok(
    amplitudes[0] < 1e-9,
    `Anterior torso must stay steady: ${amplitudes}`,
  );
  assert.ok(
    amplitudes[1] > 0.001,
    `The actual waist skin must participate: ${amplitudes}`,
  );
  assert.ok(
    amplitudes[2] > amplitudes[1] * 2,
    `Propulsion should strengthen posteriorly: ${amplitudes}`,
  );
  assert.ok(
    amplitudes[3] > amplitudes[2],
    `The distal tail must follow the travelling wave: ${amplitudes}`,
  );
  assert.ok(
    amplitudes[3] < 0.3,
    `Tail excursion must remain bounded: ${amplitudes}`,
  );
  assert.ok(
    zones.every((zone) => zone.points.every((point) => point.maxXDelta < 1e-9)),
    "Tail propulsion must not become lateral snake motion",
  );
  disposeTentacleMotion(root);
});

test("Mermaid effort transitions preserve frozen skin, independent instances and immutable caches", () => {
  const first = createCreature("nereid", 1, 71),
    second = createCreature("nereid", 1, 71),
    a = trunk(first),
    b = trunk(second);
  pose(first, 0, 0.5);
  pose(second, 0, 0.5);
  const before = skinSamples(first),
    untouched = skinSamples(second),
    immutable = a.meshes.map((mesh) =>
      Float32Array.from(mesh.geometry.attributes.position.array),
    );
  assert.deepEqual(
    a.meshes.map((mesh) => mesh.geometry),
    b.meshes.map((mesh) => mesh.geometry),
  );
  assert.notEqual(a.meshes[0].skeleton, b.meshes[0].skeleton);
  pose(first, 0, 3);
  assert.deepEqual(
    skinSamples(first).map((item) => item.point.toArray()),
    before.map((item) => item.point.toArray()),
    "A speed change at a paused phase must not snap the posed skin",
  );
  pose(first, 1 / 60, 3);
  const after = skinSamples(first);
  assert.ok(
    after.some(
      (item, index) => item.point.distanceTo(before[index].point) > 0.00001,
    ),
  );
  assert.ok(
    Math.max(
      ...after.map((item, index) => item.point.distanceTo(before[index].point)),
    ) < 0.025,
    "The first accelerated frame must remain continuous",
  );
  for (let frame = 2; frame <= 360; frame++)
    pose(first, frame / 60, frame < 180 ? 3 : 0.5);
  const frozen = skinSamples(first).map((item) => item.point.toArray());
  pose(first, 6, 0.5);
  assert.deepEqual(
    skinSamples(first).map((item) => item.point.toArray()),
    frozen,
  );
  assert.deepEqual(
    skinSamples(second).map((item) => item.point.toArray()),
    untouched.map((item) => item.point.toArray()),
  );
  assert.deepEqual(
    a.meshes.map((mesh) => mesh.geometry.attributes.position.array),
    immutable,
  );
  let disposed = 0;
  a.meshes[0].skeleton.computeBoneTexture();
  b.meshes[0].skeleton.computeBoneTexture();
  a.meshes[0].skeleton.boneTexture.addEventListener(
    "dispose",
    () => disposed++,
  );
  disposeTentacleMotion(first);
  disposeTentacleMotion(first);
  assert.equal(disposed, 1);
  assert.ok(b.meshes[0].skeleton.boneTexture);
  disposeTentacleMotion(second);
});

test("Mermaid shell bodice is fitted to the torso and follows the same skin under turns and full cycles", () => {
  const root = createCreature("nereid", 1, 71),
    rig = trunk(root),
    bodice = rig.meshes.find((mesh) => mesh.userData.mermaidBodice),
    skin = rig.meshes.find((mesh) => mesh !== bodice),
    positions = bodice.geometry.attributes.position,
    attachments = [];
  assert.equal(bodice.skeleton, skin.skeleton);
  for (let index = 0; index < positions.count; index++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index),
      [rx, ry, cy] = sampleSection(rig.motion.profile, point.z),
      support = cy - ry * Math.sqrt(Math.max(0, 1 - (point.x / rx) ** 2)),
      inset = point.y - support;
    if (inset > 0.0015 && inset < 0.0021)
      attachments.push({ index, point, inset });
  }
  assert.ok(
    attachments.length > 100,
    "Both shell rims must actually enter their supporting chest surface",
  );
  assert.ok(attachments.some(({ point }) => point.x < -0.01));
  assert.ok(attachments.some(({ point }) => point.x > 0.01));
  root.rotation.set(0.25, 1.4, -0.15);
  for (let frame = 0; frame <= 240; frame++) {
    pose(root, frame / 30, frame < 120 ? 0.5 : 3);
    for (let sample = 0; sample < attachments.length; sample += 13) {
      const attachment = attachments[sample],
        live = bodice.getVertexPosition(attachment.index, new THREE.Vector3());
      assert.ok(
        live.distanceTo(attachment.point) < 1e-8,
        "The shell root must stay attached to the stable anterior torso while the waist swims",
      );
      assert.ok(
        tentacleChunkBounds(
          bodice,
          bodice.userData.tentacleChunks[Math.floor(attachment.index / 192)],
          new THREE.Box3(),
        ).containsPoint(live.clone().applyMatrix4(bodice.matrixWorld)),
      );
    }
  }
  disposeTentacleMotion(root);
});
