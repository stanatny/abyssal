import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createRestPoseNormalizer } from "../src/rest_pose_normalization.js";
import {
  AMAZON_CREATURE_KINDS,
  buildAmazonCreature,
} from "../src/creature_amazon.js";
import {
  ODYSSEY_CREATURE_KINDS,
  buildOdysseyCreature,
} from "../src/creature_odyssey.js";
import { buildAmazonCreature as acceptedAmazon } from "./fixtures/creature_amazon_87095f5.js";
import { buildOdysseyCreature as acceptedOdyssey } from "./fixtures/creature_odyssey_87095f5.js";
import { disposeTentacleMotion } from "../src/tentacle_motion.js";

function create(build, kind) {
  const root = new THREE.Group(),
    motions = [];
  build(kind, root, motions);
  return { root, motions };
}
function pose({ root, motions }, t, speed) {
  for (const motion of motions) motion(t, speed);
  root.updateMatrixWorld(true);
  root.traverse((n) => {
    if (n.isSkinnedMesh) n.skeleton.update();
  });
}
function snapshot(root) {
  const list = [],
    v = new THREE.Vector3();
  root.traverse((n) => {
    const row = { name: n.name, matrix: n.matrixWorld.toArray() };
    if (n.isMesh) {
      row.bounds = n.boundingBox
        ? [n.boundingBox.min.toArray(), n.boundingBox.max.toArray()]
        : null;
      row.positions = [];
      for (let i = 0; i < n.geometry.attributes.position.count; i += 31)
        row.positions.push(
          n.getVertexPosition(i, v).applyMatrix4(n.matrixWorld).toArray(),
        );
    }
    list.push(row);
  });
  return list;
}
for (const [kinds, build, accepted] of [
  [AMAZON_CREATURE_KINDS, buildAmazonCreature, acceptedAmazon],
  [ODYSSEY_CREATURE_KINDS, buildOdysseyCreature, acceptedOdyssey],
]) {
  test(`${kinds === AMAZON_CREATURE_KINDS ? "Amazon" : "Odyssey"} cached factories preserve accepted bounds, anchors and posed surfaces for unchanged kinds`, () => {
    for (const kind of kinds) {
      if (kind === "armored_cory") continue;
      // HF replacements have independent anatomy/motion checks in the lord, shallow, garden, large and deep HF suites.
      if (
        kinds === ODYSSEY_CREATURE_KINDS &&
        [
          "scylla",
          "charybdis",
          "karkinos",
          "ambrosia_sprat",
          "moon_scallop",
          "lyre_ray",
          "pearl_seahorse",
          "iris_cuttlefish",
          "amphora_hermit",
          "aegean_jelly",
          "silver_pipefish",
          "aegis_sturgeon",
          "thalassa_manta",
          "cerulean_hound",
          "bronze_turtle",
          "ketos",
          "abyss_lamprey",
          "oracle_whale",
          "ceto_serpent",
          "nereid",
          "hippocampus",
          "triton_guard",
          "siren_eel",
          "naga_huntress",
          "golden_argonaut",
        ].includes(kind)
      )
        continue;
      const reference = create(accepted, kind),
        cold = create(build, kind),
        warm = create(build, kind);
      try {
        for (const [t, speed] of [
          [0, 0],
          [1.3, 1],
          [2.7, 3],
          [2.7, 3],
          [8.2, 1],
        ]) {
          for (const item of [reference, cold, warm]) pose(item, t, speed);
          assert.deepEqual(
            snapshot(cold.root),
            snapshot(reference.root),
            `${kind} cold at ${t}`,
          );
          assert.deepEqual(
            snapshot(warm.root),
            snapshot(reference.root),
            `${kind} warm at ${t}`,
          );
        }
        const frozen = snapshot(warm.root);
        pose(cold, 12, 3);
        assert.deepEqual(
          snapshot(warm.root),
          frozen,
          `${kind} independent animation`,
        );
        const rebuilt = create(build, kind),
          freshReference = create(accepted, kind);
        try {
          pose(freshReference, 0, 0);
          pose(rebuilt, 0, 0);
          assert.deepEqual(
            snapshot(rebuilt.root),
            snapshot(freshReference.root),
            `${kind} rebuild after animation`,
          );
        } finally {
          disposeTentacleMotion(rebuilt.root);
          disposeTentacleMotion(freshReference.root);
        }
      } finally {
        [reference, cold, warm].forEach(({ root }) =>
          disposeTentacleMotion(root),
        );
      }
    }
  });
}

test("mutable armored cory keeps per-instance bounds after repeated construction", () => {
  for (let i = 0; i < 8; i++) {
    const { root } = create(buildAmazonCreature, "armored_cory");
    const body = root.children[0],
      scale = body.scale.clone(),
      position = body.position.clone();
    body.scale.setScalar(1);
    body.position.set(0, 0, 0);
    body.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(body),
      expected = 1 / bounds.getSize(new THREE.Vector3()).z;
    assert.equal(scale.z, expected);
    assert.deepEqual(
      position,
      bounds.getCenter(new THREE.Vector3()).multiplyScalar(-expected),
    );
    disposeTentacleMotion(root);
  }
});

test("transformed factories retain uncached world-bound semantics without poisoning the identity cache", () => {
  const normalize = createRestPoseNormalizer();
  const geometry = new THREE.BoxGeometry(2, 4, 8);
  const material = new THREE.MeshBasicMaterial();
  for (const transformed of [false, true, false]) {
    const parent = new THREE.Group(),
      body = new THREE.Group();
    parent.add(body);
    body.add(new THREE.Mesh(geometry, material));
    if (transformed) {
      parent.position.set(3, 5, 7);
      parent.scale.set(2, 3, 4);
      parent.rotation.y = 0.4;
    }
    parent.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(body),
      scale = 1 / bounds.getSize(new THREE.Vector3()).z;
    normalize(body, "box");
    assert.equal(body.scale.z, scale);
    assert.deepEqual(
      body.position,
      bounds.getCenter(new THREE.Vector3()).multiplyScalar(-scale),
    );
  }
  geometry.dispose();
  material.dispose();
});
