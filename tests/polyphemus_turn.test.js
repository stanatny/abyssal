import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildPolyphemusHF } from "../src/polyphemus_hf_asset.js";
import { createPolyphemusTurn } from "../src/polyphemus_turn.js";
import { POLYPHEMUS_SITE as SITE } from "../src/odyssey_polyphemus_site.js";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { createBossState, tickBoss } from "../src/boss_rules.js";
import { preparedCreatureExterior } from "../src/creature_interior.js";

function fixture() {
  const root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.position.fromArray(SITE.home);
  root.scale.setScalar(90);
  root.updateMatrixWorld(true);
  const { mesh, bones } = root.userData.hfRig,
    source = mesh.geometry;
  const controller = createPolyphemusTurn(root);
  return {
    root,
    mesh,
    bones,
    source,
    controller,
    animate: motions[0],
    dispose() {
      controller.dispose();
      root.userData.disposeLocalMotion();
    },
  };
}
const point = (f, i) =>
  f.mesh.getVertexPosition(i, new T.Vector3()).applyMatrix4(f.mesh.matrixWorld);
function geometrySamples(g) {
  const p = g.attributes.position,
    rest = Array.from({ length: p.count }, (_, i) =>
      new T.Vector3().fromBufferAttribute(p, i),
    );
  const ix = g.index.array,
    edges = [],
    seen = new Set();
  for (let i = 0; i < ix.length; i += 3)
    for (let q = 0; q < 3; q++) {
      const a = Math.min(ix[i + q], ix[i + ((q + 1) % 3)]),
        b = Math.max(ix[i + q], ix[i + ((q + 1) % 3)]),
        key = a * rest.length + b;
      if (seen.has(key)) continue;
      seen.add(key);
      const length = rest[a].distanceTo(rest[b]);
      if (length > 0.002) edges.push([a, b, length]);
    }
  return { rest, edges };
}

test("Turning owns its lower weights and contact chunks while preserving the complete original neutral surface and shared assets", () => {
  const f = fixture(),
    second = fixture(),
    originalPositions = Array.from(f.source.attributes.position.array),
    originalIndices = Array.from(f.source.index.array),
    originalWeights = Array.from(f.source.attributes.skinWeight.array);
  try {
    assert.notEqual(f.mesh.geometry, f.source);
    assert.notEqual(f.mesh.geometry, second.mesh.geometry);
    assert.notEqual(
      f.mesh.geometry.userData.lordSkinChunks,
      f.source.userData.lordSkinChunks,
    );
    assert.equal(
      f.mesh.userData.tentacleChunks,
      f.mesh.geometry.userData.lordSkinChunks,
    );
    assert.deepEqual(
      Array.from(f.mesh.geometry.attributes.position.array),
      originalPositions,
    );
    assert.deepEqual(Array.from(f.mesh.geometry.index.array), originalIndices);
    f.root.updateMatrixWorld(true);
    f.mesh.skeleton.update();
    for (let i = 0; i < f.mesh.geometry.attributes.position.count; i++)
      assert.ok(
        f.mesh
          .getVertexPosition(i, new T.Vector3())
          .distanceTo(
            new T.Vector3().fromBufferAttribute(
              f.mesh.geometry.attributes.position,
              i,
            ),
          ) < 1e-6,
        `Neutral vertex ${i}`,
      );
    const cap = preparedCreatureExterior(f.mesh.geometry);
    assert.ok(cap);
    assert.ok(
      Array.from(cap.attributes.skinIndex.array).some((id) => id >= 14),
      "Actual interior must copy the new live leg/foot weights",
    );
    cap.dispose();
    let disposals = 0;
    f.mesh.geometry.addEventListener("dispose", () => disposals++);
    f.controller.dispose();
    f.controller.dispose();
    assert.equal(disposals, 1);
    assert.equal(f.mesh.geometry, f.source);
    assert.deepEqual(
      Array.from(f.source.attributes.position.array),
      originalPositions,
    );
    assert.deepEqual(Array.from(f.source.index.array), originalIndices);
    assert.deepEqual(
      Array.from(f.source.attributes.skinWeight.array),
      originalWeights,
    );
    assert.ok(second.mesh.geometry !== second.source);
  } finally {
    f.dispose();
    second.dispose();
  }
});

test("A full turn in either direction uses alternating real planted soles without moving the sentinel or crossing the grounded dais", (t) => {
  for (const sign of [-1, 1]) {
    const f = fixture(),
      { rest, edges } = geometrySamples(f.mesh.geometry),
      now = rest.map((v) => v.clone());
    const soleIds = [-1, 1].map((side) =>
      rest.findIndex(
        (p, i) =>
          p.y < -0.487 &&
          p.x * side > 0.1 &&
          f.mesh.geometry.attributes.skinWeight.array[i * 4] > 0.999 &&
          [17, 21].includes(f.mesh.geometry.attributes.skinIndex.array[i * 4]),
      ),
    );
    assert.ok(soleIds.every((i) => i >= 0));
    const originalRoot = f.root.position.clone(),
      target = new T.Vector3(
        SITE.home[0] + sign * 0.001,
        SITE.home[1],
        SITE.home[2] + 500,
      );
    let previousSoles,
      previousQ = f.root.quaternion.clone(),
      worst = 0,
      minimumY = Infinity,
      maximumRadius = 0,
      maximumYawSpeed = 0;
    const travel = [0, 0],
      height = [0, 0];
    try {
      for (let frame = 0; frame <= 720; frame++) {
        const status = f.controller.update(1 / 60, target);
        f.animate(frame / 60);
        f.controller.applyPose();
        f.mesh.skeleton.update();
        assert.ok(f.root.position.equals(originalRoot));
        maximumYawSpeed = Math.max(
          maximumYawSpeed,
          previousQ.angleTo(f.root.quaternion) * 60,
        );
        previousQ.copy(f.root.quaternion);
        const soles = soleIds.map((i) => point(f, i));
        if (previousSoles) {
          const movements = soles.map((p, i) => p.distanceTo(previousSoles[i]));
          assert.ok(
            Math.min(...movements) < 1e-6,
            `At least one actual sole must stay planted at frame ${frame}: ${movements}`,
          );
          movements.forEach((d, i) => (travel[i] += d));
        }
        previousSoles = soles;
        soles.forEach(
          (p, i) => (height[i] = Math.max(height[i], p.y - SITE.top)),
        );
        if (frame % 4) continue;
        for (let i = 0; i < rest.length; i++) {
          f.mesh.getVertexPosition(i, now[i]);
          assert.ok(
            Number.isFinite(now[i].x) &&
              Number.isFinite(now[i].y) &&
              Number.isFinite(now[i].z),
          );
          if (rest[i].y <= -0.3) {
            const w = now[i].clone().applyMatrix4(f.mesh.matrixWorld);
            minimumY = Math.min(minimumY, w.y - SITE.top);
            maximumRadius = Math.max(
              maximumRadius,
              Math.hypot(w.x - SITE.home[0], w.z - SITE.home[2]),
            );
            assert.ok(
              Math.abs(w.x - SITE.home[0]) < SITE.width / 2 &&
                Math.abs(w.z - SITE.home[2]) < SITE.depth / 2,
            );
          }
        }
        for (const [a, b, length] of edges)
          worst = Math.max(worst, now[a].distanceTo(now[b]) / length);
        if (frame === 720) assert.equal(status.aligned, true);
      }
      assert.ok(maximumYawSpeed <= 0.521, `Yaw speed ${maximumYawSpeed}`);
      assert.ok(
        travel.every((d) => d > 20),
        `Both true soles must step: ${travel}`,
      );
      assert.ok(
        height.every((h) => h > 1),
        `Both soles must visibly lift: ${height}`,
      );
      assert.ok(minimumY > -0.0001, `Floor penetration ${minimumY}`);
      assert.ok(worst < 2, `Actual waist/calf/foot skin stretch ${worst}`);
      assert.ok(
        maximumRadius < 40,
        "Stepping must remain in the accepted grounded support footprint",
      );
      t.diagnostic(
        `direction ${sign}: skin stretch ${worst}, swept lower radius ${maximumRadius}m, minimum support clearance ${minimumY}m, peak yaw ${maximumYawSpeed}rad/s`,
      );
    } finally {
      f.dispose();
    }
  }
});

test("Locked attacks preserve the real heading while a raised sole settles; pause and reset never advance or leak a pose", () => {
  const f = fixture(),
    target = new T.Vector3(SITE.home[0] - 500, SITE.home[1], SITE.home[2]);
  try {
    for (let i = 0; i < 8; i++) f.controller.update(1 / 60, target);
    const locked = f.root.quaternion.clone();
    for (let i = 0; i < 50; i++) {
      f.controller.update(1 / 60, target, { phase: "windup", locked: true });
      assert.ok(f.root.quaternion.angleTo(locked) < 1e-7);
    }
    assert.equal(f.controller.status.stepping, false);
    const frozen = f.bones.map((b) => b.quaternion.toArray());
    for (const dt of [0, -1, NaN, Infinity]) f.controller.update(dt, target);
    f.controller.update(10, target, { active: false });
    assert.deepEqual(
      f.bones.map((b) => b.quaternion.toArray()),
      frozen,
    );
    f.root.quaternion.identity();
    f.controller.reset();
    assert.ok(f.root.quaternion.equals(new T.Quaternion()));
    assert.equal(f.controller.status.stepping, false);
    f.root.updateMatrixWorld(true);
    f.mesh.skeleton.update();
    for (let i = 0; i < f.mesh.geometry.attributes.position.count; i++)
      assert.ok(
        f.mesh
          .getVertexPosition(i, new T.Vector3())
          .distanceTo(
            new T.Vector3().fromBufferAttribute(
              f.mesh.geometry.attributes.position,
              i,
            ),
          ) < 1e-6,
      );
  } finally {
    f.dispose();
  }
});

test("The real shortened combat phases compose with turning and locked-palm release without opening a new skin seam", (t) => {
  const f = fixture(),
    { rest, edges } = geometrySamples(f.mesh.geometry),
    now = rest.map((v) => v.clone());
  const species = ODYSSEY_LORDS.find((s) => s.kind === "polyphemus"),
    state = createBossState(species);
  let worst = 0,
    attackSeen = false,
    lockedQ;
  try {
    for (let frame = 0; frame <= 1200; frame++) {
      const time = frame / 60,
        target = new T.Vector3(
          SITE.home[0] + Math.sin(time * 0.08) * 500,
          SITE.home[1] + 50,
          SITE.home[2] + Math.cos(time * 0.08) * 500,
        );
      const locked =
        state.phase === "attack" ||
        (state.phase === "windup" &&
          state.timer >= state.phaseDuration - species.lockWindow);
      const status = f.controller.update(1 / 60, target, {
        phase: state.phase,
        locked,
      });
      tickBoss(state, 1 / 60, {
        inTerritory: true,
        distance: 100,
        lineOfSight: status.aligned,
      });
      f.root.userData.setPolyphemusTarget(target);
      f.root.userData.setPolyphemusCombat({
        phase: state.phase,
        ability: state.ability,
        progress: state.timer / state.phaseDuration,
      });
      f.animate(time);
      f.controller.applyPose();
      f.mesh.skeleton.update();
      if (locked) {
        if (!lockedQ) lockedQ = f.root.quaternion.clone();
        assert.ok(f.root.quaternion.angleTo(lockedQ) < 1e-7);
      } else lockedQ = null;
      if (state.phase === "attack") attackSeen = true;
      if (frame % 6) continue;
      for (let i = 0; i < rest.length; i++) f.mesh.getVertexPosition(i, now[i]);
      for (const [a, b, length] of edges)
        worst = Math.max(worst, now[a].distanceTo(now[b]) / length);
    }
    assert.equal(attackSeen, true);
    assert.ok(worst < 2, `Composed actual skin stretch ${worst}`);
    t.diagnostic(`composed complete combat skin stretch ${worst}`);
  } finally {
    f.dispose();
  }
});
