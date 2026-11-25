import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 as V } from "three";
import { createTideContacts } from "../src/odyssey_tide_contacts.js";
import {
  boulderFlight,
  boulderPoint,
  BOULDER,
} from "../src/polyphemus_boulder.js";
const front = new V(0, 0, 10),
  normal = new V(0, 0, -1),
  target = new V();
const options = { front, normal };
function contact() {
  const c = createTideContacts([target, new V(48, 0, 0)]);
  c.sample(front, front, options);
  return c;
}
test("nose contact turns once; holding, jitter and ending a cooldown cannot repeat", () => {
  const c = contact();
  assert.equal(c.sample(front, target, options), 0);
  for (let i = 0; i < 30; i++)
    assert.equal(c.sample(target, new V(0.01, 0, 0), options), -1);
  c.sample(target, front, options);
  assert.equal(c.sample(front, target, options), 0);
});
test("inactive, discontinuous and backface contacts consume approach without delayed interaction", () => {
  for (const extra of [
    { active: false },
    { continuous: false },
    { front: new V(0, 0, -10) },
  ]) {
    const c = contact();
    assert.equal(c.sample(front, target, { ...options, ...extra }), -1);
    assert.equal(c.sample(target, target, options), -1);
    c.sample(target, front, options);
    assert.equal(c.sample(front, target, options), 0);
  }
});
test("fixed visible control margin cannot turn an adjacent wheel or operate through solid backing", () => {
  const c = contact();
  assert.equal(c.sample(front, new V(4, 0, 0), options), -1);
  assert.equal(
    c.sample(front, target, { ...options, blocked: () => true }),
    -1,
  );
  assert.equal(c.sample(target, target, options), -1);
});
test("finite boulder trajectory reaches its locked target and remains frozen without time", () => {
  const a = new V(-10, 15, 0),
    b = new V(20, 5, -90),
    f = boulderFlight(a, b);
  assert.ok(boulderPoint(f, 0).distanceTo(a) < 1e-8);
  assert.ok(boulderPoint(f, f.duration).distanceTo(b) < 1e-8);
  assert.ok(boulderPoint(f, f.duration / 2).y > (a.y + b.y) / 2);
  assert.equal(BOULDER.release, 0.42);
  assert.ok(f.duration <= 3);
});
