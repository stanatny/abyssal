import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBossState, tickBoss } from "../src/boss_rules.js";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { POLYPHEMUS_COMBAT } from "../src/polyphemus_combat.js";
import { BOULDER } from "../src/polyphemus_boulder.js";
import {
  buildPolyphemusHF,
  POLYPHEMUS_HF_DATA,
} from "../src/polyphemus_hf_asset.js";

const species = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus");
const timings = species.abilityTimings.boulder;
const attackStart = POLYPHEMUS_COMBAT.hunt + timings.windup;
const releaseTime = attackStart + timings.attack * BOULDER.release;
const recoverStart = attackStart + timings.attack;
const cycleEnd = recoverStart + timings.recover;
const context = { inTerritory: true, distance: 100, lineOfSight: true };

function fixture(target) {
  const root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.userData.setPolyphemusTarget(new T.Vector3(...target));
  const state = createBossState(species);
  let previousTime = 0;
  return {
    root,
    state,
    ...root.userData.hfRig,
    pose(time) {
      tickBoss(state, time - previousTime, context);
      root.userData.setPolyphemusCombat({
        phase: state.phase,
        ability: state.ability,
        progress: state.timer / state.phaseDuration,
      });
      motions[0](time);
      root.updateMatrixWorld(true);
      root.userData.hfRig.mesh.skeleton.update();
      previousTime = time;
    },
  };
}

function meshRest(mesh) {
  const position = mesh.geometry.attributes.position;
  const vertices = Array.from({ length: position.count }, (_, i) =>
    new T.Vector3().fromBufferAttribute(position, i),
  );
  const edges = [],
    seen = new Set(),
    index = mesh.geometry.index.array;
  for (let i = 0; i < index.length; i += 3)
    for (let q = 0; q < 3; q++) {
      const a = Math.min(index[i + q], index[i + ((q + 1) % 3)]);
      const b = Math.max(index[i + q], index[i + ((q + 1) % 3)]);
      const key = a * vertices.length + b;
      if (seen.has(key)) continue;
      seen.add(key);
      const length = vertices[a].distanceTo(vertices[b]);
      if (length > 0.002) edges.push([a, b, length]);
    }
  return { vertices, edges };
}
const palmPosition = (f) =>
  f.root.userData.rightPalmAnchor.getWorldPosition(new T.Vector3());

// This uses the authoritative faster combat clock, not the rig's 9.5-second
// canonical art timeline. Every actual skin vertex and nontrivial edge is
// checked at every 60-fps step, with the exact release and recovery boundaries added.
test("The faster real combat clock retains fixed support, coherent skin and continuous complete HF throws", (t) => {
  assert.equal(species.huntDuration, POLYPHEMUS_COMBAT.hunt);
  for (const phase of ["windup", "attack", "recover"])
    assert.equal(timings[phase], POLYPHEMUS_COMBAT[phase]);
  assert.ok(cycleEnd < 7 && timings.recover >= 2.8);
  const sampleTimes = [
    ...new Set([
      ...Array.from(
        { length: Math.ceil((cycleEnd + 1 / 60) * 60) + 1 },
        (_, i) => Math.min(i / 60, cycleEnd + 1 / 60),
      ),
      attackStart,
      releaseTime - 0.00001,
      releaseTime,
      releaseTime + 0.00001,
      recoverStart - 0.00001,
      recoverStart,
      recoverStart + 0.00001,
      cycleEnd - 0.00001,
      cycleEnd,
      cycleEnd + 0.00001,
    ]),
  ].sort((a, b) => a - b);
  for (const target of [
    [1, 1, -1],
    [-1, 1, -1],
    [1, -1, -1],
    [-1, -1, -1],
  ]) {
    const f = fixture(target),
      { vertices: rest, edges } = meshRest(f.mesh),
      now = rest.map((v) => v.clone());
    const palmRest = new T.Vector3(...POLYPHEMUS_HF_DATA.rig.anchors.rightPalm);
    let closestPalm = 0,
      nearestDistance = Infinity;
    for (let i = 0; i < rest.length; i++) {
      const distance = rest[i].distanceTo(palmRest);
      if (distance < nearestDistance) {
        closestPalm = i;
        nearestDistance = distance;
      }
    }
    let maximumStep = 0,
      worstStretch = 0,
      excursion = 0,
      previousHand,
      beforeEnd,
      atEnd,
      releaseObserved = false;
    for (const time of sampleTimes) {
      f.pose(time);
      const hand = palmPosition(f);
      if (previousHand)
        maximumStep = Math.max(maximumStep, hand.distanceTo(previousHand));
      previousHand = hand;
      excursion = Math.max(excursion, hand.distanceTo(palmRest));
      assert.deepEqual(f.root.position.toArray(), [0, 0, 0]);
      assert.ok(f.root.quaternion.equals(new T.Quaternion()));
      for (const id of [0, 1, 14, 15, 16, 17, 18, 19, 20, 21])
        assert.ok(f.bones[id].quaternion.equals(new T.Quaternion()));
      for (let i = 0; i < rest.length; i++) {
        f.mesh.getVertexPosition(i, now[i]);
        assert.ok(
          Number.isFinite(now[i].x) &&
            Number.isFinite(now[i].y) &&
            Number.isFinite(now[i].z),
        );
        if (rest[i].y < -0.3)
          assert.ok(
            now[i].distanceToSquared(rest[i]) < 1e-12,
            `Planted skin vertex ${i} moved at ${time}`,
          );
      }
      for (const [a, b, length] of edges)
        worstStretch = Math.max(
          worstStretch,
          now[a].distanceTo(now[b]) / length,
        );
      if (time === releaseTime) {
        releaseObserved = true;
        assert.equal(f.state.phase, "attack");
        assert.ok(
          Math.abs(f.state.timer / f.state.phaseDuration - 0.42) < 1e-8,
        );
        assert.equal(f.root.userData.throwReleaseProgress, 0.42);
        assert.equal(
          f.root.userData.throwAnchor.parent,
          f.root.userData.rightPalmAnchor,
        );
        assert.ok(
          Math.abs(now[closestPalm].distanceTo(hand) - nearestDistance) < 1e-6,
          "Release anchor must stay on the actual moving palm skin",
        );
        assert.ok(
          f.root.userData
            .getThrowAnchorWorldPosition(new T.Vector3())
            .distanceTo(
              f.root.userData.throwAnchor.getWorldPosition(new T.Vector3()),
            ) < 1e-9,
        );
      }
      if (time === recoverStart)
        assert.ok(
          hand.distanceTo(palmRest) > 0.16,
          "Faster recovery must start with real followthrough",
        );
      if (time === cycleEnd - 0.00001) beforeEnd = hand;
      if (time === cycleEnd) atEnd = hand;
    }
    assert.equal(releaseObserved, true);
    assert.ok(excursion > 0.3, `Complete throwing excursion ${excursion}`);
    assert.ok(maximumStep < 0.025, `Faster per-frame palm step ${maximumStep}`);
    assert.ok(
      worstStretch < 2,
      `Faster real skin stretch ${worstStretch} for ${target}`,
    );
    assert.ok(
      beforeEnd.distanceTo(atEnd) < 0.0001,
      "Recovery-to-hunt transition must not snap",
    );
    assert.ok(
      atEnd.distanceTo(palmRest) < 0.003,
      "Complete recovery returns the actual hand to rest",
    );
    t.diagnostic(
      `target ${target}: ${sampleTimes.length} actual skin frames, maximum palm step ${maximumStep}, maximum edge stretch ${worstStretch}`,
    );
    f.root.userData.disposeLocalMotion();
  }
});
