import test from "node:test";
import assert from "node:assert/strict";
import {
  createRareDiscovery,
  getRareClueDirection,
  RARE_DISCOVERY_RULES,
} from "../src/regional_rare_discovery.js";
import { chooseRareHabitat, REGIONAL_RARES } from "../src/regional_rare.js";
import { canEat, consumePrey, createPlayer } from "../src/simulation.js";

function fixture(regionId = "hawaii") {
  const species = chooseRareHabitat(
    REGIONAL_RARES.find((s) => s.regionId === regionId),
    () => 0.5,
  );
  const [x, y, z] = species.spawnAnchors[0];
  const entity = {
    species,
    hiddenFor: 0,
    mesh: { position: { x, y, z }, visible: false },
  };
  return { active: true, now: 0, regionId, entity, position: { x, y, z } };
}

test("first crossing reveals only the selected horizontal circle, at any depth", () => {
  for (const depthOffset of [-1200, 0, 1200]) {
    const state = createRareDiscovery(),
      args = fixture();
    const home = { ...args.position };
    args.position.y += depthOffset;
    args.position.x += 90.01;
    assert.equal(state.update(args), null);
    args.position.x -= 0.01;
    const found = state.update(args);
    assert.deepEqual(found, { ...home, radius: 90, phase: "discovered" });
    assert.ok(Object.isFrozen(found));
    args.now = RARE_DISCOVERY_RULES.discoveryNoticeDuration;
    args.position.x += 600;
    const known = state.update(args);
    assert.equal(known.phase, "search");
    args.entity.mesh.position.z -= 30;
    assert.equal(state.update(args), known);
    assert.equal(known.z, home.z);
  }
});

test("a nearby moving resident outside the unknown circle cannot reveal it early", () => {
  const state = createRareDiscovery(),
    args = fixture();
  args.position.x += 91;
  assert.ok(
    Math.hypot(args.position.x - args.entity.mesh.position.x) <
      RARE_DISCOVERY_RULES.enterDistance,
  );
  assert.equal(state.update(args), null);
  args.entity.mesh.position.x += 30;
  assert.equal(state.update(args), null);
});

test("discovery notice is once per round, freezes with play time and persists after departure", () => {
  const state = createRareDiscovery(),
    args = fixture();
  const found = state.update(args);
  args.now = 2;
  assert.equal(state.update(args), found);
  assert.equal(state.update({ ...args, active: false }), null);
  assert.equal(state.update(args), found);
  args.now = 6;
  assert.equal(state.update(args).phase, "nearby");
  args.position.x += 1000;
  assert.equal(state.update(args).phase, "search");
  args.position.x -= 1000;
  args.now = 7;
  assert.equal(state.update(args).phase, "nearby");
  state.reset();
  assert.equal(state.update(args).phase, "discovered");
});

test("after discovery, nearby emphasis uses actual 3D proximity and hysteresis", () => {
  const state = createRareDiscovery(),
    args = fixture();
  args.position.y += RARE_DISCOVERY_RULES.enterDistance + 1;
  assert.equal(state.update(args).phase, "discovered");
  args.now = 6;
  assert.equal(state.update(args).phase, "search");
  args.position.y--;
  const near = state.update(args);
  assert.equal(near.phase, "nearby");
  args.position.y += 50;
  assert.equal(state.update(args), near);
  args.position.y += 20;
  const search = state.update(args);
  assert.equal(search.phase, "search");
  args.position.y -= 40;
  assert.equal(state.update(args), search);
});

test("a known circle remains visible on returning to the nursery", () => {
  const state = createRareDiscovery(),
    args = fixture("atlantis");
  const known = state.update(args);
  args.now = 6;
  args.position = { x: 0, y: -10, z: -50 };
  const restored = state.update(args);
  assert.equal(restored.phase, "search");
  assert.equal(restored.x, known.x);
});

test("retirement, region mismatch and reset forget the previous discovery", () => {
  const state = createRareDiscovery(),
    args = fixture();
  assert.ok(state.update(args));
  args.entity.hiddenFor = Infinity;
  assert.equal(state.update(args), null);
  args.entity.hiddenFor = 0;
  args.position.x += 91;
  assert.equal(state.update(args), null);
  args.position.x -= 91;
  assert.ok(state.update(args));
  assert.equal(state.update({ ...args, regionId: "bermuda" }), null);
  args.position.x += 91;
  assert.equal(state.update(args), null);
  args.position.x -= 91;
  assert.ok(state.update(args));
  state.reset();
  args.position.x += 91;
  assert.equal(state.update(args), null);
});

test("invalid inputs and ordinary prey never disclose a search area", () => {
  for (const transform of [
    (a) => ({ ...a, entity: undefined }),
    (a) => ({ ...a, position: { x: NaN, y: 0, z: 0 } }),
    (a) => ({
      ...a,
      entity: {
        ...a.entity,
        species: { ...a.entity.species, kind: "ordinary" },
      },
    }),
    (a) => ({
      ...a,
      entity: {
        ...a.entity,
        species: { ...a.entity.species, spawnAnchors: [[]] },
      },
    }),
  ])
    assert.equal(createRareDiscovery().update(transform(fixture())), null);
});

test("all eight secluded habitats and all 24 circle choices disclose only the chosen area", () => {
  for (const species of REGIONAL_RARES)
    for (let i = 0; i < species.spawnAnchors.length; i++) {
      const values = [i / species.spawnAnchors.length + 0.01, 0.5, 0.5];
      const chosen = chooseRareHabitat(species, () => values.shift());
      assert.equal(chosen.spawnAnchors.length, 1);
      const [x, y, z] = chosen.spawnAnchors[0];
      assert.ok(z + chosen.residentRadius < -120 || chosen.depthMin > 72);
      const entity = {
        species: chosen,
        hiddenFor: 0,
        mesh: { position: { x, y, z } },
      };
      const area = createRareDiscovery().update({
        active: true,
        regionId: species.regionId,
        entity,
        position: { x, y, z },
      });
      assert.deepEqual(area, { x, y, z, radius: 90, phase: "discovered" });
      assert.equal(chosen.population, 1);
    }
});

test("initial 3 m players can capture every regional rare without a 30 m, objective or sonar gate", () => {
  for (const species of REGIONAL_RARES) {
    const player = createPlayer();
    assert.equal(player.length, 3);
    assert.equal(canEat(player, species.length), true);
    assert.equal(consumePrey(player, species), true);
    assert.equal(player.vitalCap, 150);
    assert.equal(player.length, 3);
  }
});

test("habitat arrows follow the player's heading while elevation remains approximate", () => {
  const area = { x: 0, y: -300, z: -500, radius: 90 };
  const position = { x: 0, y: -100, z: -200 };
  assert.deepEqual(getRareClueDirection(area, position, 0), {
    arrow: "↑",
    elevation: "更深",
  });
  assert.deepEqual(getRareClueDirection(area, position, Math.PI / 2), {
    arrow: "←",
    elevation: "更深",
  });
  assert.equal(getRareClueDirection(area, position, Math.PI).arrow, "↓");
  assert.deepEqual(getRareClueDirection(area, { x: 0, y: -600, z: -500 }), {
    arrow: "",
    elevation: "更高",
  });
  assert.deepEqual(getRareClueDirection(area, { x: 10, y: -320, z: -500 }), {
    arrow: "",
    elevation: "同一层",
  });
});

test("a new resident cannot inherit a previously discovered habitat", () => {
  const state = createRareDiscovery(),
    first = fixture("hawaii"),
    next = fixture("penglai");
  assert.ok(state.update(first));
  next.position.x += 600;
  assert.equal(state.update(next), null);
});
