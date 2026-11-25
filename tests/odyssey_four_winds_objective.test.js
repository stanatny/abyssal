import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  REGION_OBJECTIVES,
  createExpeditionObjective,
  advanceExpeditionObjective,
  expeditionObjectiveHint,
} from "../src/expedition_objectives.js";
import { createPlayer } from "../src/simulation.js";
import { visibleWindBody } from "../src/odyssey_wind_trial.js";

const kinds = ["polyphemus", "karkinos", "scylla", "charybdis"];
function fixture(regionId = "odyssey", bossKinds = kinds) {
  const region = {
    id: regionId,
    bossInstances: bossKinds.map((kind) => ({ id: `odyssey_${kind}` })),
  };
  const objective = createExpeditionObjective(region);
  const player = createPlayer();
  player.length = 30;
  player.expeditionComplete = false;
  const bosses = region.bossInstances.map((b) => ({
    id: b.id,
    enabled: true,
    state: { defeated: false },
  }));
  return {
    objective,
    player,
    bosses,
    step: (windTrial) =>
      advanceExpeditionObjective(objective, player, bosses, { windTrial }),
  };
}
const complete = {
  stabilized: 4,
  homewardAvailable: true,
  arrived: true,
};

function defeatAll(f) {
  for (const boss of f.bosses) boss.state.defeated = true;
}

test("Odyssey uses the Four Winds rule and never settles on the previous three-lord milestone", () => {
  assert.equal(REGION_OBJECTIVES.odyssey.kind, "four_winds");
  assert.equal(REGION_OBJECTIVES.odyssey.minimumLength, 30);
  const f = fixture();
  assert.equal(f.objective.required, 4);
  for (const b of f.bosses.slice(0, 3)) b.state.defeated = true;
  assert.equal(f.step(complete).won, false);
  assert.equal(f.player.expeditionComplete, false);
});

test("each of four real local lord defeats is required; duplicates, disabled or foreign bosses cannot substitute", () => {
  const f = fixture();
  for (const b of f.bosses.slice(0, 3)) b.state.defeated = true;
  f.bosses.push({ id: "foreign", enabled: true, state: { defeated: true } });
  f.bosses.push({
    id: f.bosses[3].id,
    enabled: false,
    state: { defeated: true },
  });
  f.bosses.push({ ...f.bosses[0], state: { defeated: true } });
  assert.equal(f.step(complete).won, false);
  assert.equal(f.objective.defeated.size, 3);
  f.bosses[3].state.defeated = true;
  assert.equal(f.step(complete).won, true);
  assert.equal(f.objective.defeated.size, 4);
});

test("stabilized gates, growth, available route and physical arrival are all independent requirements", () => {
  for (const change of [
    { stabilized: 0 },
    { stabilized: 3 },
    { stabilized: 5 },
    { homewardAvailable: false },
    { arrived: false },
  ]) {
    const f = fixture();
    defeatAll(f);
    assert.equal(
      f.step({ ...complete, ...change }).won,
      false,
      JSON.stringify(change),
    );
  }
  const f = fixture();
  defeatAll(f);
  f.player.length = 29.99;
  assert.equal(f.step(complete).won, false);
  f.player.length = 30;
  assert.equal(f.step(complete).won, true);
});

test("four defeats and four stabilized gates expose the destination without granting an early win", () => {
  const f = fixture();
  defeatAll(f);
  assert.equal(f.step({ ...complete, arrived: false }).won, false);
  assert.equal(f.objective.homewardAvailable, true);
  assert.equal(f.objective.homewardArrived, false);
  assert.match(expeditionObjectiveHint(f.objective, f.player), /归航|home/i);
  assert.equal(f.step(complete).won, true);
});

test("death and timeout reject a completed trial and do not accept newly reported arrival", () => {
  for (const flag of ["dead", "timedOut"]) {
    const f = fixture();
    defeatAll(f);
    f.player[flag] = true;
    assert.equal(f.step(complete).won, false, flag);
    assert.notEqual(f.objective.homewardArrived, true, flag);
  }
});

test("missing trial input never substitutes food, length or other regional treasure for gate arrival", () => {
  const f = fixture();
  defeatAll(f);
  assert.equal(f.step().won, false);
  assert.equal(
    advanceExpeditionObjective(f.objective, f.player, f.bosses, {
      relicContact: true,
      titanRelicCollected: true,
      trenchArrived: true,
      mechanismSolved: true,
    }).won,
    false,
  );
  assert.equal(f.objective.titanRelicCollected, false);
});

test("new objectives and other regions do not inherit a previous Four Winds completion", () => {
  const first = fixture();
  defeatAll(first);
  assert.equal(first.step(complete).won, true);
  const fresh = fixture();
  assert.equal(fresh.step().won, false);
  assert.notEqual(fresh.objective.homewardArrived, true);
  const amazon = fixture("amazon", ["a", "b", "c"]);
  assert.equal(amazon.step(complete).won, false);
  assert.equal(amazon.objective.windGates, undefined);
  defeatAll(amazon);
  assert.equal(amazon.step().won, true);
});

function actualWorldVertices(root) {
  const point = new THREE.Vector3();
  const vertices = [];
  root.traverseVisible((part) => {
    if (!part.isMesh || !part.geometry?.attributes.position) return;
    part.skeleton?.update();
    for (
      let index = 0;
      index < part.geometry.attributes.position.count;
      index++
    ) {
      part.getVertexPosition(index, point);
      point.applyMatrix4(part.matrixWorld);
      vertices.push(point.clone());
    }
  });
  return vertices;
}

test("all four supported 25/30 m bodies provide a finite conservative envelope of the real animated meshes", async () => {
  const { createCreature } = await import("../src/creatures.js");
  const actualPosition = new THREE.Vector3(31, -220, -980);
  for (const kind of ["orca", "squid", "zombie_shark", "mechanical_shark"])
    for (const length of [25, 30]) {
      const avatar = createCreature(kind, length, 17);
      avatar.position.copy(actualPosition);
      avatar.rotation.set(0.24, 0.7, -0.13);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        avatar.quaternion,
      );
      for (const [frame, effort] of [
        [0.2, 0.8],
        [0.5, 2.2],
        [0.8, 1.1],
      ]) {
        avatar.userData.animate(frame, effort, {
          dt: 0.1,
          speed: effort * 12,
          boosting: effort > 2,
          turn: 0.8,
          pitchInput: 0.3,
        });
        const result = visibleWindBody(avatar, actualPosition, forward, length);
        assert.ok(
          result.points.length >= 4 && result.points.length <= 128,
          kind,
        );
        assert.ok(result.points.flat().every(Number.isFinite), kind);
        assert.deepEqual(result.position, actualPosition.toArray());
        assert.equal(result.length, length);
        const worldToAvatar = avatar.matrixWorld.clone().invert();
        const localHull = new THREE.Box3().setFromPoints(
          result.points.map((p) =>
            new THREE.Vector3(...p).applyMatrix4(worldToAvatar),
          ),
        );
        let count = 0;
        for (const vertex of actualWorldVertices(avatar)) {
          vertex.applyMatrix4(worldToAvatar);
          assert.ok(
            localHull.clone().expandByScalar(1e-5).containsPoint(vertex),
            `${kind} ${length}: posed vertex ${count}`,
          );
          count++;
        }
        assert.ok(count > 100, kind);
      }
    }
});
