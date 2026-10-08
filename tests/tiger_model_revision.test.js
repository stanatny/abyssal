import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildPenglaiTiger,
  disposePenglaiTigerMotion,
} from "../src/creature_penglai_tiger.js";
import { createCreature } from "../src/creatures.js";

function tiger() {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    motions = [];
  root.add(body);
  buildPenglaiTiger(body, motions, root);
  return { root, body, animate: motions[0] };
}
function named(root, name) {
  const result = [];
  root.traverse((node) => {
    if (node.name === name) result.push(node);
  });
  return result;
}
function resources(root) {
  const values = [];
  root.traverse((node) => {
    if (node.isMesh) values.push([node.geometry, node.material]);
  });
  return values;
}

test("Tiger walk plants level paws through support and lifts one paw at a time", () => {
  const { root, animate } = tiger();
  const paws = named(root, "level_feline_paw");
  const point = new THREE.Vector3(),
    up = new THREE.Vector3();
  let highest = -Infinity,
    lowest = Infinity,
    supportFrames = 0;
  const plantedZ = [];
  for (let frame = 0; frame < 240; frame++) {
    animate(frame / 30, 1);
    root.updateMatrixWorld(true);
    let planted = 0;
    for (const paw of paws) {
      paw.getWorldPosition(point);
      highest = Math.max(highest, point.y);
      lowest = Math.min(lowest, point.y);
      assert.ok(
        point.y >= -0.393000001,
        "a support sole cannot sink below the floor",
      );
      up.set(0, 1, 0).transformDirection(paw.matrixWorld);
      assert.ok(up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-10);
      if (Math.abs(point.y + 0.393) < 1e-8) {
        planted++;
        if (paw === paws[0]) plantedZ.push(point.z);
      }
    }
    assert.ok(
      planted >= 2,
      "walk must retain a supporting pair at swing overlap",
    );
    if (planted >= 3) supportFrames++;
  }
  assert.ok(highest - lowest > 0.045);
  assert.ok(supportFrames > 210);
  assert.ok(Math.max(...plantedZ) - Math.min(...plantedZ) > 0.14);
});

test("Tiger fore elbows and hind knees bend oppositely, with raised hind hocks", () => {
  const { root } = tiger();
  root.updateMatrixWorld(true);
  for (const forearm of named(root, "feline_forearm"))
    assert.ok(forearm.position.z > 0.015);
  for (const shin of named(root, "feline_hind_shin"))
    assert.ok(shin.position.z < -0.04);
  for (const hock of named(root, "raised_hock_to_metatarsal")) {
    const paw = hock.parent.getObjectByName("level_feline_paw");
    assert.ok(hock.position.y > paw.position.y + 0.06);
    assert.ok(hock.position.z > paw.position.z + 0.03);
  }
});

test("Tiger phase transitions keep anatomy finite, shared buffers immutable and instances independent", () => {
  const first = tiger(),
    second = tiger();
  const buffers = resources(first.root),
    neighbour = resources(second.root);
  buffers.forEach(([geometry, material], i) => {
    assert.equal(geometry, neighbour[i][0]);
    assert.equal(material, neighbour[i][1]);
  });
  const original = named(second.root, "level_feline_paw").map((p) =>
    p.position.toArray(),
  );
  let time = 0;
  for (const phase of ["dormant", "windup", "attack", "recover", "dormant"]) {
    first.root.userData.setBossPhase(phase);
    for (let i = 0; i < 40; i++) {
      first.animate((time += 1 / 30), 1.2);
      first.root.updateMatrixWorld(true);
      first.root.traverse((node) => {
        assert.ok(node.matrixWorld.elements.every(Number.isFinite));
        if (node.isMesh)
          assert.ok(node.scale.x > 0 && node.scale.y > 0 && node.scale.z > 0);
      });
    }
  }
  const snapshot = named(first.root, "level_feline_paw").map((p) =>
    p.matrixWorld.toArray(),
  );
  first.animate(time, 1.2);
  first.root.updateMatrixWorld(true);
  assert.deepEqual(
    named(first.root, "level_feline_paw").map((p) => p.matrixWorld.toArray()),
    snapshot,
  );
  assert.deepEqual(
    named(second.root, "level_feline_paw").map((p) => p.position.toArray()),
    original,
  );
  assert.deepEqual(resources(first.root), buffers);
  assert.deepEqual(first.root.position.toArray(), [0, 0, 0]);
  assert.deepEqual(first.root.quaternion.toArray(), [0, 0, 0, 1]);
});

test("Tiger shared factory keeps 48 m normalization, head and ground support contracts", () => {
  const model = createCreature("white_tiger", 48);
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  assert.ok(Math.abs(bounds.max.z - bounds.min.z - 48) < 1e-5);
  assert.equal(model.userData.normalizedLength, 1);
  assert.ok(Math.abs(bounds.min.y + 48 * model.userData.groundSupport) < 1e-5);
  const head = model.userData.getHeadWorldPositions()[0];
  assert.ok(head.z < bounds.min.z + 3);
  assert.ok(head.y > bounds.min.y + 8);
});

test("Tiger limb skin bends continuously and retirement frees only its private bone textures", () => {
  const first = tiger(),
    second = tiger();
  const skins = named(first.root, "continuous_feline_limb_skin");
  const neighbours = named(second.root, "continuous_feline_limb_skin");
  assert.equal(skins.length, 4);
  const original = skins.map((skin) =>
    Array.from(skin.geometry.attributes.position.array),
  );
  skins.forEach((skin, i) => {
    assert.notEqual(skin.skeleton, neighbours[i].skeleton);
    skin.skeleton.computeBoneTexture();
    neighbours[i].skeleton.computeBoneTexture();
  });
  const a = new THREE.Vector3(),
    b = new THREE.Vector3();
  let time = 0,
    moved = false;
  for (const phase of ["windup", "attack", "recover"]) {
    first.root.userData.setBossPhase(phase);
    for (let frame = 0; frame < 35; frame++) {
      first.animate((time += 1 / 30), 1.2);
      first.root.updateMatrixWorld(true);
      for (const skin of skins) {
        const positions = skin.geometry.attributes.position;
        for (let row = 0; row < 52; row++) {
          for (let col = 0; col < 16; col += 4) {
            const index = row * 17 + col;
            skin.getVertexPosition(index, a);
            skin.getVertexPosition(index + 17, b);
            assert.ok(a.toArray().every(Number.isFinite));
            assert.ok(
              skin.boundingSphere.containsPoint(a),
              "broad-phase bounds must retain the posed skin",
            );
            assert.ok(
              a.distanceTo(b) < 0.045,
              "adjacent skin rings cannot tear apart at a joint",
            );
            b.fromBufferAttribute(positions, index);
            if (a.distanceTo(b) > 0.03) moved = true;
          }
        }
      }
    }
  }
  assert.ok(moved, "actual skin vertices must follow the articulated joints");
  skins.forEach((skin, i) =>
    assert.deepEqual(
      Array.from(skin.geometry.attributes.position.array),
      original[i],
    ),
  );
  let sharedDisposals = 0;
  for (const skin of skins)
    skin.geometry.addEventListener("dispose", () => sharedDisposals++);
  disposePenglaiTigerMotion(first.root);
  disposePenglaiTigerMotion(first.root);
  assert.equal(sharedDisposals, 0);
  skins.forEach((skin, i) => {
    assert.equal(skin.skeleton.boneTexture, null);
    assert.ok(neighbours[i].skeleton.boneTexture);
  });
  disposePenglaiTigerMotion(second.root);
});

test("Tiger measured 44 m/s travel plants stance feet, lengthens its trot, freezes when blocked and resets", () => {
  const model = createCreature("white_tiger", 48);
  const paws = named(model, "level_feline_paw");
  const previous = paws.map(() => new THREE.Vector3());
  const point = new THREE.Vector3();
  let samples = 0,
    maxSlip = 0;
  for (let frame = 0; frame < 300; frame++) {
    const distance = 44 / 60;
    model.position.z -= distance;
    model.userData.setGroundTravel(distance, 1 / 60);
    model.userData.animate(frame / 60, 1.2);
    model.updateMatrixWorld(true);
    const floor = Math.min(...paws.map((paw) => paw.getWorldPosition(point).y));
    for (let i = 0; i < paws.length; i++) {
      paws[i].getWorldPosition(point);
      if (
        frame > 180 &&
        Math.abs(point.y - floor) < 1e-7 &&
        Math.abs(previous[i].y - point.y) < 1e-7
      ) {
        maxSlip = Math.max(maxSlip, Math.abs(point.z - previous[i].z));
        samples++;
      }
      previous[i].copy(point);
    }
    model.traverse((node) => {
      if (node.isBone)
        assert.ok(
          Math.abs(node.scale.y - 1) < 0.001,
          "running stride must stay inside the joint reach",
        );
    });
  }
  const gait = model.userData.groundGaitState;
  const cadence =
    ((gait.speed / (model.children[0].scale.x * model.scale.x)) * gait.duty) /
    (2 * gait.stride);
  assert.ok(samples > 200);
  assert.ok(maxSlip < 0.005, `world support slip was ${maxSlip}`);
  assert.ok(
    cadence > 2 && cadence < 3,
    "full-speed chase needs longer diagonal strides instead of tiny rapid steps",
  );
  const frozen = paws.map((paw) => paw.matrixWorld.toArray());
  const phase = gait.phase;
  for (let frame = 300; frame < 330; frame++) {
    model.userData.setGroundTravel(0, 1 / 60);
    model.userData.animate(frame / 60, 1.2);
    model.updateMatrixWorld(true);
  }
  assert.equal(gait.phase, phase);
  assert.deepEqual(
    paws.map((paw) => paw.matrixWorld.toArray()),
    frozen,
  );
  model.userData.resetGroundTravel();
  assert.equal(gait.active, false);
  assert.equal(gait.phase, 0);
  assert.equal(gait.distance, 0);
  assert.equal(gait.speed, 0);
  assert.equal(gait.running, 0);
});

test("Tiger recovery eases all four airborne paws onto the support plane without advancing blocked gait", () => {
  const { root, animate } = tiger();
  const paws = named(root, "level_feline_paw");
  const point = new THREE.Vector3();
  let time = 0;
  root.userData.setBossPhase("attack");
  for (let frame = 0; frame < 60; frame++) {
    root.userData.setGroundTravel(0.017, 1 / 60);
    animate((time += 1 / 30), 2.5);
  }
  root.updateMatrixWorld(true);
  assert.ok(paws.every((paw) => paw.getWorldPosition(point).y > -0.26));
  const gaitPhase = root.userData.groundGaitState.phase;
  root.userData.setBossPhase("recover");
  root.userData.setGroundTravel(0, 1 / 60);
  animate((time += 1 / 30), 0.35);
  root.updateMatrixWorld(true);
  assert.ok(
    paws.some((paw) => paw.getWorldPosition(point).y > -0.36),
    "landing must ease rather than snap directly onto the floor",
  );
  for (let frame = 0; frame < 90; frame++) {
    root.userData.setGroundTravel(0, 1 / 60);
    animate((time += 1 / 30), 0.35);
  }
  root.updateMatrixWorld(true);
  for (const paw of paws) {
    paw.getWorldPosition(point);
    assert.ok(
      Math.abs(point.y + 0.393) < 1e-8,
      "every recovery paw must settle on the same floor",
    );
    const isFront = paw.parent.name.startsWith("fore");
    assert.ok(
      Math.abs(point.z - (isFront ? -0.277 : 0.28)) < 1e-8,
      "recovery must settle into a stable neutral stance",
    );
  }
  assert.equal(root.userData.groundGaitState.phase, gaitPhase);
  const frozen = paws.map((paw) => paw.matrixWorld.toArray());
  animate(time, 0.35);
  root.updateMatrixWorld(true);
  assert.deepEqual(
    paws.map((paw) => paw.matrixWorld.toArray()),
    frozen,
  );
});
