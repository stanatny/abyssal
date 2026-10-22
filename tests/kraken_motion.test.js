import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

test("Kraken uses actual travel and combat stages with continuous, bounded skin deformation", () => {
  const model = createCreature("kraken", 1),
    peer = createCreature("kraken", 1);
  const { mesh } = model.userData.hfRig,
    g = mesh.geometry,
    p = g.attributes.position;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    idx = g.index.array;
  const rest = Array.from(idx, (v, j) =>
    a
      .fromBufferAttribute(p, v)
      .distanceTo(
        b.fromBufferAttribute(p, idx[j - (j % 3) + (((j % 3) + 1) % 3)]),
      ),
  );
  const points = new Float32Array(p.count * 3),
    snapshots = {};
  let clock = 0,
    maxStretch = 0,
    maxJump = 0,
    previous;
  for (const [state, travel, held] of [
    ["dormant", 0, false],
    ["hunt", 12, false],
    ["windup", 0, false],
    ["attack", 0, false],
    ["grip", 0, true],
    ["recover", 0, false],
    ["blocked", 0, false],
  ]) {
    model.userData.setBossPhase(state === "grip" ? "attack" : state);
    model.userData.setKrakenGrip(held ? 1 : state === "windup" ? 0.2 : 0);
    for (let n = 0; n < 160; n++) {
      clock += 1 / 40;
      model.userData.setSwimTravel(travel / 40, 1 / 40);
      model.userData.updateKrakenIntake(1 / 40, {
        active: state === "attack" || held,
        held,
        bite: held && n === 100,
        target: new THREE.Vector3(0, -0.06, -0.3),
      });
      model.userData.animate(clock, 2.5, { gaitPhase: clock });
      model.updateMatrixWorld(true);
      mesh.skeleton.update();
      if (n % 4 === 0 || n === 159) {
        for (let i = 0; i < p.count; i++)
          mesh.getVertexPosition(i, a).toArray(points, i * 3);
        for (let i = 0; i < idx.length; i++) {
          if (rest[i] < 1e-5) continue;
          a.fromArray(points, idx[i] * 3);
          b.fromArray(points, idx[i - (i % 3) + (((i % 3) + 1) % 3)] * 3);
          maxStretch = Math.max(maxStretch, a.distanceTo(b) / rest[i]);
        }
      }
      const tip = mesh.getVertexPosition(100, a).clone();
      if (previous) maxJump = Math.max(maxJump, tip.distanceTo(previous));
      previous = tip;
    }
    snapshots[state] = {
      points: points.slice(),
      motion: { ...model.userData.krakenMotion },
    };
  }
  assert.ok(snapshots.hunt.motion.gather > 0.98);
  assert.ok(
    snapshots.blocked.motion.gather < 0.01,
    "blocked travel must not look like a sprint",
  );
  assert.ok(snapshots.windup.motion.spread > 0.98);
  assert.ok(snapshots.grip.motion.wrap > 0.98);
  let greatest = 0;
  for (let i = 0; i < p.count; i++)
    greatest = Math.max(
      greatest,
      a
        .fromArray(snapshots.hunt.points, i * 3)
        .distanceTo(b.fromArray(snapshots.grip.points, i * 3)),
    );
  assert.ok(
    greatest > 0.1,
    "actual skin must change silhouette between travel and capture",
  );
  assert.ok(maxStretch < 1.5, `skin stretch ${maxStretch}`);
  assert.ok(maxJump < 0.025);
  // Inspect actual skin around each distal arm, not bone-tip motion hidden by a morph.
  const nearest = (point) => {
    let best = 0,
      distance = Infinity;
    for (let i = 0; i < p.count; i++) {
      const d = a
        .fromBufferAttribute(p, i)
        .distanceToSquared(b.fromArray(point));
      if (d < distance) {
        distance = d;
        best = i;
      }
    }
    return best;
  };
  for (const chain of model.userData.hfRig.chains) {
    const tip = nearest(chain.points.at(-1)),
      base = nearest(chain.points.at(-4));
    a.fromArray(snapshots.grip.points, tip * 3)
      .sub(b.fromArray(snapshots.grip.points, base * 3))
      .normalize();
    assert.ok(
      a.z < -0.7,
      `every distal arm reaches forward: ${chain.name} ${a.z}`,
    );
  }
  assert.equal(mesh.geometry, peer.userData.hfRig.mesh.geometry);
  assert.notEqual(
    mesh.morphTargetInfluences,
    peer.userData.hfRig.mesh.morphTargetInfluences,
  );
  assert.equal(peer.userData.hfRig.mesh.morphTargetInfluences[0], 0);
  const frozen = mesh.skeleton.bones.map((b) => b.quaternion.toArray());
  model.userData.animate(clock, 0, { gaitPhase: clock });
  assert.deepEqual(
    mesh.skeleton.bones.map((b) => b.quaternion.toArray()),
    frozen,
  );
  assert.deepEqual(peer.userData.krakenMotion, {
    gather: 0,
    spread: 0,
    wrap: 0,
    reach: 0,
  });
  model.userData.resetKrakenGrip();
  assert.deepEqual(model.userData.krakenMotion, {
    gather: 0,
    spread: 0,
    wrap: 0,
    reach: 0,
  });
  model.userData.disposeLocalMotion();
  peer.userData.disposeLocalMotion();
});

test("capture morph remains inside collision chunk envelopes for every actual skin vertex", async () => {
  const { tentacleChunkBounds } = await import("../src/tentacle_motion.js");
  const model = createCreature("kraken", 48),
    { mesh } = model.userData.hfRig;
  const point = new THREE.Vector3(),
    bounds = new THREE.Box3(),
    index = mesh.geometry.index;
  for (let i = 0; i < 180; i++) {
    model.userData.setBossPhase("attack");
    model.userData.animate(i / 30, 1, { gaitPhase: i / 30 });
  }
  model.updateMatrixWorld(true);
  mesh.skeleton.update();
  let missed = 0;
  for (const chunk of mesh.userData.tentacleChunks) {
    tentacleChunkBounds(mesh, chunk, bounds);
    for (let j = chunk.start; j < chunk.end; j++) {
      mesh
        .getVertexPosition(index.getX(j), point)
        .applyMatrix4(mesh.matrixWorld);
      if (!bounds.containsPoint(point)) missed++;
    }
  }
  assert.equal(missed, 0, "broad phase must not reject newly reaching arms");
  model.userData.disposeLocalMotion();
});
