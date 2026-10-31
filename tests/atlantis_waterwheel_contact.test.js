import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { createWaterwheelContact } from "../src/atlantis_waterwheel_contact.js";
const point = (z, x = 0) => new Vector3(x, 0, z);
const controls = Array.from({ length: 7 }, (_, i) => point(0, i * 10));
test("Contact is entry-triggered with exit hysteresis, no queued retry and swept fast crossings", () => {
  const c = createWaterwheelContact(controls);
  assert.equal(c.sample(point(5), point(1)), "valve0");
  for (const z of [1, 1.9, 2.1, 2.8, 1, 0])
    assert.equal(c.sample(point(z), point(z)), null);
  assert.equal(c.sample(point(1), point(5)), null);
  assert.equal(c.sample(point(5), point(1)), "valve0");
  c.reset();
  assert.equal(c.sample(point(4), point(-4)), "valve0");
  c.reset();
  assert.equal(c.sample(point(100), point(0)), null);
  assert.equal(c.sample(point(0), point(0)), null);
  c.reset();
  assert.equal(c.sample(point(4), point(0), { active: false }), null);
  assert.equal(c.sample(point(0), point(0), { active: true }), null);
  c.reset();
  assert.equal(c.sample(point(4), point(0), { front: point(-3) }), null);
  c.reset();
  assert.equal(c.sample(point(4, 60), point(0, 60)), "test");
  for (let n = 0; n < 100; n++)
    assert.equal(c.sample(point(0, 60), point(0, 60)), null);
});
test("One entry chooses one wheel; walls never queue a later action", () => {
  const c = createWaterwheelContact([point(0), point(0, 1)]);
  assert.equal(c.sample(point(4), point(0)), "valve0");
  assert.equal(c.sample(point(0), point(0, 1)), null);
  c.reset();
  assert.equal(c.sample(point(4), point(0), { blocked: () => true }), null);
  assert.equal(c.sample(point(0), point(0), { blocked: () => false }), null);
});
