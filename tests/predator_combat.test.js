import test from "node:test";
import assert from "node:assert/strict";
import {
  canPredatorRetaliate,
  predatorBiteContact,
} from "../src/predator_combat.js";
const point = (x, y, z) => ({ x, y, z });
const bite = (overrides = {}) =>
  predatorBiteContact({
    previousPredator: point(-13, 0, 0),
    predator: point(-10, 0, 0),
    predatorForward: point(1, 0, 0),
    predatorLength: 20,
    previousPlayer: point(0, 0, 0),
    player: point(0, 0, 0),
    playerForward: point(0, 0, -1),
    playerLength: 23,
    edible: true,
    ...overrides,
  });
test("Near-sized edible predators remain dangerous until an absolute five-metre advantage", () => {
  assert.ok(canPredatorRetaliate(23, 20));
  assert.ok(canPredatorRetaliate(24.99, 20));
  assert.equal(canPredatorRetaliate(25, 20), false);
  assert.ok(canPredatorRetaliate(15, 20));
  assert.equal(canPredatorRetaliate(NaN, 20), false);
});
test("A directed swept mouth can bite the flank, including a high-speed crossing", () => {
  assert.ok(bite());
  assert.ok(
    bite({ previousPredator: point(-30, 0, 0), predator: point(-8, 0, 0) }),
  );
});
test("Frontal edible contact is reserved for player capture and a turned-away hunter cannot bite", () => {
  assert.equal(bite({ playerForward: point(-1, 0, 0) }), false);
  assert.equal(bite({ predatorForward: point(-1, 0, 0) }), false);
  assert.equal(
    bite({ predator: point(-10, 20, 0), previousPredator: point(-13, 20, 0) }),
    false,
  );
});
test("A larger predator retains a legal frontal bite and distant bodies cannot damage", () => {
  assert.ok(bite({ edible: false, playerForward: point(-1, 0, 0) }));
  assert.equal(
    bite({ previousPredator: point(-50, 0, 0), predator: point(-40, 0, 0) }),
    false,
  );
});
