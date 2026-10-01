import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createAtlantisRelic } from "../src/atlantis_relic.js";
import { ATLANTIS_RELIC } from "../src/expedition_objectives.js";

test("Sacred pearl has a fixed world capture center, unlocks without resizing, and resets after collection", () => {
  const scene = new THREE.Scene(),
    relic = createAtlantisRelic(scene);
  const pearl = relic.root.getObjectByName("sacred_pearl"),
    seal = relic.root.getObjectByName("guardian_seal");
  const world = new THREE.Vector3();
  relic.root.updateMatrixWorld(true);
  pearl.getWorldPosition(world);
  assert.deepEqual(world.toArray(), [
    ATLANTIS_RELIC.x,
    ATLANTIS_RELIC.y,
    ATLANTIS_RELIC.z,
  ]);
  relic.setState({ relicUnlocked: true, relicCollected: false });
  assert.equal(seal.visible, false);
  for (const reduced of [true, false])
    for (const time of [0, 0.5, 1, 10]) {
      relic.update(time, world, reduced);
      pearl.getWorldPosition(world);
      assert.deepEqual(world.toArray(), [0, -699, -922]);
      assert.ok(pearl.material.emissiveIntensity >= 1.55);
    }
  relic.setState({ relicUnlocked: true, relicCollected: true });
  assert.equal(pearl.visible, false);
  relic.reset();
  assert.equal(seal.visible, true);
  assert.equal(pearl.visible, false);
  assert.equal(relic.unlocked, false);
  assert.equal(relic.collected, false);
  relic.update(1, new THREE.Vector3(0, -18, 75));
  assert.equal(relic.root.visible, false);
  relic.dispose();
});

test("Private altar geometry and materials are released once without disposing unrelated city resources", () => {
  const scene = new THREE.Scene(),
    relic = createAtlantisRelic(scene),
    resources = new Map();
  relic.root.traverse((n) => {
    for (const resource of [
      n.geometry,
      ...(Array.isArray(n.material) ? n.material : [n.material]),
    ].filter(Boolean))
      if (!resources.has(resource)) {
        resources.set(resource, 0);
        resource.addEventListener("dispose", () =>
          resources.set(resource, resources.get(resource) + 1),
        );
      }
  });
  const other = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshBasicMaterial(),
  );
  scene.add(other);
  let otherDisposed = false;
  other.geometry.addEventListener("dispose", () => (otherDisposed = true));
  relic.dispose();
  relic.dispose();
  assert.ok(resources.size > 10);
  assert.ok([...resources.values()].every((count) => count === 1));
  assert.deepEqual(scene.children, [other]);
  assert.equal(otherDisposed, false);
  other.geometry.dispose();
  other.material.dispose();
});

test("Conch keys use constructed public-gallery coordinates, not juvenile homes; reset removes clues and open-lid state", () => {
  const records = [
    {
      id: "harbor_sanctuary",
      x: -215,
      z: -240.5,
      y: -90,
      lowerY: -119,
      variant: "sanctuary",
    },
    {
      id: "agora_bridges",
      x: 215,
      z: -447.5,
      y: -190,
      lowerY: -219,
      variant: "bridges",
    },
    {
      id: "memorial_terrace",
      x: -215,
      z: -999.5,
      y: -490,
      lowerY: -519,
      variant: "terrace",
    },
  ];
  const scene = new THREE.Scene(),
    r = createAtlantisRelic(scene, { records });
  assert.equal(r.keyArt.locations.length, 3);
  assert.deepEqual(
    r.keyArt.getPoint("agora_bridges").toArray(),
    [237, -219, -447.5],
  );
  for (const s of records) {
    r.setState({
      keySiteId: s.id,
      keyCollected: false,
      relicUnlocked: false,
      relicCollected: false,
    });
    r.update(1, r.keyArt.getPoint(s.id));
    assert.equal(r.keyArt.key.visible, true);
    assert.equal(r.root.getObjectByName("sacred_pearl").visible, false);
  }
  r.setState({
    keySiteId: records[0].id,
    keyCollected: true,
    relicUnlocked: true,
    relicCollected: false,
  });
  r.update(2, r.keyArt.getPoint(records[0].id));
  assert.equal(r.keyArt.key.visible, false);
  const lid = r.root.getObjectByName("sacred_chest_lid"),
    a = lid.rotation.x;
  r.update(2, r.keyArt.getPoint(records[0].id));
  assert.equal(lid.rotation.x, a);
  r.reset();
  assert.equal(lid.rotation.x, 0);
  assert.equal(r.keyArt.key.visible, false);
  r.dispose();
  r.dispose();
  assert.equal(scene.children.length, 0);
});
