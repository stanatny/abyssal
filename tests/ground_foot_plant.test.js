import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { groundGaitState } from "../src/ground_creatures.js";

const V = T.Vector3;
function paws(root) {
  const { mesh, legs } = root.userData.hfRig,
    a = mesh.geometry.attributes;
  return legs.map((c) => {
    let id = -1,
      y = Infinity;
    for (let i = 0; i < a.position.count; i++) {
      let w = 0;
      for (let j = 0; j < 4; j++)
        if (c.ids.includes(a.skinIndex.array[i * 4 + j]))
          w += a.skinWeight.array[i * 4 + j];
      if (w > 0.99 && a.position.getY(i) < y) {
        id = i;
        y = a.position.getY(i);
      }
    }
    assert.ok(id >= 0);
    return id;
  });
}

test("Taotie plants actual paw surfaces during travel and takes recovery steps during turns", () => {
  const root = createCreature("taotie", 32),
    { mesh } = root.userData.hfRig,
    ids = paws(root),
    state = { phase: "walk" };
  const a = mesh.geometry.attributes,
    index = mesh.geometry.index.array;
  const rest = Array.from({ length: a.position.count }, (_, i) =>
    new V().fromBufferAttribute(a.position, i),
  );
  const edges = [];
  for (let i = 0; i < index.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const x = index[i + j],
        y = index[i + ((j + 1) % 3)],
        d = rest[x].distanceTo(rest[y]);
      if (d > 0.0001) edges.push([x, y, d]);
    }
  let previous,
    previousContacts,
    recovery = 0;
  const speeds = [];
  for (let frame = 0; frame < 360; frame++) {
    const dt = 1 / 60,
      yaw = frame < 120 ? 0 : (frame - 120) * dt * 0.65,
      distance = 32 * 0.24 * dt;
    root.quaternion.setFromAxisAngle(new V(0, 1, 0), yaw);
    root.position.add(
      new V(-Math.sin(yaw) * distance, 0, -Math.cos(yaw) * distance),
    );
    root.userData.animate(
      frame * dt,
      1,
      groundGaitState(state, distance, 32, dt),
    );
    root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const contacts = root.userData.groundFootContacts;
    const world = ids.map((id) =>
      mesh.localToWorld(mesh.getVertexPosition(id, new V())),
    );
    contacts.forEach((c, i) => {
      if (c.recovering) recovery++;
      if (previous && c.planted && previousContacts[i] && frame > 15)
        speeds.push(world[i].distanceTo(previous[i]) / dt);
    });
    if (frame % 5 === 0) {
      const skin = rest.map((_, i) => mesh.getVertexPosition(i, new V()));
      for (const [x, y, d] of edges)
        assert.ok(
          skin[x].distanceTo(skin[y]) / d < 2.5,
          "contact correction must not tear knees/belly",
        );
    }
    previous = world;
    previousContacts = contacts.map((c) => c.planted);
  }
  speeds.sort((a, b) => a - b);
  assert.ok(speeds.length > 300);
  assert.ok(
    speeds[Math.floor(speeds.length * 0.5)] < 0.02,
    "median planted surface slip",
  );
  assert.ok(
    speeds[Math.floor(speeds.length * 0.95)] < 1,
    "95th percentile planted surface slip",
  );
  assert.ok(
    recovery > 0,
    "tight turn needs extra steps, not a twisted planted leg",
  );
  const frozen = root.userData.hfRig.bones.map((b) => b.quaternion.toArray());
  root.userData.animate(6, 1, groundGaitState(state, 0, 32, 1 / 60));
  assert.deepEqual(
    root.userData.hfRig.bones.map((b) => b.quaternion.toArray()),
    frozen,
  );
  for (const phase of ["windup", "leap"]) {
    root.userData.animate(6.1, 1, {
      ...groundGaitState(state, 0, 32, 1 / 60),
      phase,
    });
    assert.ok(root.userData.groundFootContacts.every((c) => !c.planted));
  }
  root.userData.disposeLocalMotion();
});

test("world foot contacts are instance-owned and do not replace Guide motion", () => {
  const a = createCreature("taotie", 32),
    b = createCreature("taotie", 32);
  a.position.z = -0.1;
  a.userData.animate(0, 1, groundGaitState({ phase: "walk" }, 0.1, 32, 1 / 60));
  assert.notEqual(a.userData.groundFootContacts, b.userData.groundFootContacts);
  assert.ok(b.userData.groundFootContacts.every((c) => !c.planted));
  a.userData.animate(0.1, 1);
  assert.ok(a.userData.groundFootContacts.every((c) => !c.planted));
  a.userData.disposeLocalMotion();
  b.userData.disposeLocalMotion();
});

test("Taotie's attack anchor follows its grounded body without changing the Guide anchor", () => {
  const root = createCreature("taotie", 32);
  const original = root.userData.getHeadWorldPositions()[0];
  root.userData.animate(
    0,
    1,
    groundGaitState({ phase: "walk" }, 0.1, 32, 1 / 60),
  );
  const grounded = root.userData.getHeadWorldPositions()[0];
  const offset = root.userData.hfRig.bones[0].position.y * root.scale.y;
  assert.ok(offset < 0);
  assert.ok(Math.abs(grounded.y - original.y - offset) < 1e-8);
  assert.equal(grounded.x, original.x);
  assert.equal(grounded.z, original.z);
  root.userData.animate(0.1, 1);
  assert.ok(
    root.userData.getHeadWorldPositions()[0].distanceTo(original) < 1e-8,
  );
  root.userData.disposeLocalMotion();
});
