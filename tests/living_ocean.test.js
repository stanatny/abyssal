import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { NONFISH_SPECIES } from "../src/nonfish_ecology.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import {
  SURFACE_BIRDS,
  regionalBirds,
  sampleBirdFlight,
} from "../src/surface_birds.js";
import { createCreature } from "../src/creatures.js";
import {
  habitatPosition,
  steerResidentHabitat,
} from "../src/ecosystem_population.js";
import { WORLD } from "../src/world_config.js";
import { createPlayer } from "../src/simulation.js";
import { createSubmarineDefense } from "../src/submarine_defense.js";
import { castSegment } from "../src/collision.js";

function weapon() {
  const scene = new THREE.Scene(),
    s = {
      id: "test_sub",
      mesh: new THREE.Group(),
      state: { destroyed: false },
    };
  s.mesh.position.set(0, -200, -400);
  scene.add(s.mesh);
  let walls = [];
  const events = [];
  const defense = createSubmarineDefense(scene, {
    submarines: [s],
    castWorld: (a, b, r) => castSegment(a, b, walls, r),
    onDamage: (n) => events.push(n),
  });
  const player = createPlayer("orca", 10),
    position = new THREE.Vector3(0, -200, -440),
    forward = new THREE.Vector3(1, 0, 0);
  const step = (dt = 0.1, now = 10) =>
    defense.update(dt, now, player, position, forward);
  const launch = () => {
    for (let i = 0; i < 25 && !defense.projectiles.some((p) => p.active); i++)
      step(0.1, 10 + i * 0.1);
    assert.ok(defense.projectiles.some((p) => p.active));
  };
  return {
    scene,
    s,
    defense,
    player,
    position,
    forward,
    events,
    step,
    launch,
    setWalls: (w) => (walls = w),
  };
}
test("Submarine warning freezes at pause, fires straight after 2.2 s, hits only once, and observes cooldown", () => {
  const w = weapon();
  w.step();
  assert.equal(w.defense.threat.phase, "windup");
  const remaining = w.defense.threat.remaining;
  w.step(0, 100);
  assert.equal(w.defense.threat.remaining, remaining);
  w.launch();
  const p = w.defense.projectiles.find((p) => p.active),
    heading = p.direction.clone();
  w.position.x = 10;
  w.step(0.1, 13);
  assert.ok(p.direction.equals(heading));
  w.position.x = 0;
  for (let i = 0; i < 15; i++) w.step(0.1, 13 + i * 0.1);
  assert.deepEqual(w.events, [20]);
  assert.equal(w.player.health, 80);
  assert.equal(w.defense.projectiles.filter((p) => p.active).length, 0);
  assert.equal(w.defense.states.get(w.s.id).phase, "idle");
  w.defense.dispose();
});
test("A sidestep avoids a shot; intervening solid cover detonates it before player contact", () => {
  for (const cover of [false, true]) {
    const w = weapon();
    w.launch();
    if (cover)
      w.setWalls([
        {
          type: "box",
          x: 0,
          y: -200,
          z: -425,
          halfSize: { x: 8, y: 5, z: 1 },
        },
      ]);
    else w.position.x = 16;
    for (let i = 0; i < 20; i++) w.step(0.1, 13 + i * 0.1);
    assert.deepEqual(w.events, []);
    assert.equal(w.player.health, 100);
    if (cover)
      assert.equal(
        w.defense.projectiles.some((p) => p.active),
        false,
      );
    w.defense.dispose();
  }
});
test("Juveniles, nursery positions, disabled or destroyed submarines cannot lock on", () => {
  for (const mode of [
    "juvenile",
    "nursery",
    "destroyed",
    "disabled",
    "blocked",
  ]) {
    const w = weapon();
    if (mode === "juvenile") w.player.length = 7.99;
    if (mode === "nursery") {
      w.position.set(0, -18, 70);
      w.s.mesh.position.set(0, -18, 95);
    }
    if (mode === "destroyed") w.s.state.destroyed = true;
    if (mode === "blocked")
      w.setWalls([
        {
          type: "box",
          x: 0,
          y: -200,
          z: -425,
          halfSize: { x: 8, y: 5, z: 1 },
        },
      ]);
    w.defense.update(
      0.1,
      100,
      w.player,
      w.position,
      w.forward,
      mode !== "disabled",
    );
    assert.equal(w.defense.threat, null, mode);
    assert.equal(
      w.defense.projectiles.some((p) => p.active),
      false,
      mode,
    );
    w.defense.dispose();
  }
});
test("Relative sweep detects a character crossing a fast shot, without repeat settlement; reset clears pools", () => {
  const w = weapon();
  w.s.state.destroyed = true;
  const p = w.defense.projectiles[0];
  p.active = true;
  p.mesh.position.set(0, -200, -430);
  p.direction.set(0, 0, -1);
  p.age = 0;
  const previous = new THREE.Vector3(20, -200, -436);
  w.position.set(-20, -200, -436);
  w.forward.set(0, 0, -1);
  w.defense.recordMovement(previous, w.position);
  w.step(0.4, 12);
  assert.deepEqual(w.events, [20]);
  assert.equal(p.active, false);
  w.step(0.4, 13);
  assert.deepEqual(w.events, [20]);
  w.defense.reset();
  assert.equal(w.defense.threat, null);
  assert.ok(w.defense.projectiles.every((p) => !p.active && !p.mesh.visible));
  w.defense.dispose();
  w.defense.dispose();
  assert.equal(w.scene.children.length, 1);
});
test("Benthic residents spawn on sampled floors and ignore vertical slope when returning to habitat", () => {
  for (const region of ["hawaii", "atlantis", "bermuda", "mariana"]) {
    const species = getRegionSpecies(region).find(
        (s) => s.kind === "spiny_lobster",
      ),
      heightAt = (x, z) => -25 + x * 0.2 - z * 0.1;
    for (let i = 0; i < species.population; i++) {
      const p = habitatPosition(species, {
        heightAt,
        populationIndex: i,
        near: true,
        playerPosition: new THREE.Vector3(150, -40, -500),
      });
      assert.ok(p, region);
      assert.ok(
        Math.abs(p.y - heightAt(p.x, p.z) - species.floorOffset) < 1e-8,
      );
    }
    const a = species.spawnAnchors[0],
      d = { x: 1, y: 0, z: 0 };
    assert.deepEqual(
      steerResidentHabitat(species, 0, { x: a[0], y: -70, z: a[2] }, d),
      d,
    );
    assert.equal(
      habitatPosition(species, { heightAt: () => -150, populationIndex: 0 }),
      null,
    );
  }
  assert.equal(
    NONFISH_SPECIES.every((s) => s.category === "invertebrate" && !s.predator),
    true,
  );
});
test("Bird flight remains continuous within bounds and model forward agrees with the flight tangent", () => {
  for (const species of SURFACE_BIRDS) {
    const bird = {
        anchor: new THREE.Vector3(WORLD.maxX + 100, 8, 60),
        phase: 1.7,
        species,
      },
      r = { point: new THREE.Vector3(), velocity: new THREE.Vector3() };
    for (let time = 0; time < 30; time += 0.25) {
      sampleBirdFlight(bird, time, WORLD, r);
      assert.ok(r.point.x < WORLD.maxX && r.point.x > WORLD.minX);
      const previous = r.point.clone();
      sampleBirdFlight(bird, time + 0.01, WORLD, r);
      const displacement = r.point.clone().sub(previous);
      assert.ok(displacement.length() > 0.03);
      const orientation = new THREE.Euler(r.pitch, r.yaw, r.bank, "YXZ"),
        forward = new THREE.Vector3(0, 0, -1).applyEuler(orientation);
      assert.ok(forward.dot(r.velocity.clone().normalize()) > 0.999);
    }
  }
  assert.deepEqual(
    regionalBirds("hawaii").map((s) => s.kind),
    ["seagull", "tropicbird"],
  );
  assert.deepEqual(
    regionalBirds("bermuda").map((s) => s.kind),
    ["seagull", "pelican"],
  );
});
test("New wildlife has finite detailed geometry, shared resources, independent motion and correctly labeled extents", () => {
  for (const kind of ["moon_jelly", "spiny_lobster", "pelican", "tropicbird"]) {
    const a = createCreature(kind, 1, 1),
      b = createCreature(kind, 1, 2);
    a.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(a),
      size = box.getSize(new THREE.Vector3());
    assert.ok(Math.abs((kind === "moon_jelly" ? size.x : size.z) - 1) < 1e-5);
    const ga = [],
      gb = [];
    a.traverse((n) => {
      if (n.isMesh) {
        ga.push(n.geometry);
        assert.ok(
          [
            ...n.geometry.attributes.position.array,
            ...n.geometry.attributes.normal.array,
          ].every(Number.isFinite),
        );
      }
    });
    b.traverse((n) => {
      if (n.isMesh) gb.push(n.geometry);
    });
    assert.deepEqual(
      ga.map((g) => g.uuid),
      gb.map((g) => g.uuid),
    );
    assert.ok(
      ga.reduce(
        (n, g) => n + (g.index?.count || g.attributes.position.count) / 3,
        0,
      ) > 3000,
    );
    const nodes = [];
    a.traverse((n) => {
      if (n.isGroup) nodes.push(n);
    });
    a.userData.animate(0);
    const before = nodes.map((n) => n.rotation.toArray().join());
    for (let i = 1; i < 20; i++) a.userData.animate(i * 0.1);
    assert.ok(nodes.some((n, i) => n.rotation.toArray().join() !== before[i]));
    const frozen = nodes.map((n) => n.rotation.toArray().join());
    a.userData.animate(1.9);
    assert.deepEqual(
      nodes.map((n) => n.rotation.toArray().join()),
      frozen,
    );
    assert.notDeepEqual(
      a.getObjectByName(`${kind}_anatomy`).uuid,
      b.getObjectByName(`${kind}_anatomy`).uuid,
    );
  }
});
