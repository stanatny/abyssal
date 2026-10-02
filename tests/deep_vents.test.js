import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  deepVentPhase,
  intersectsDeepVent,
  attachDeepVents,
} from "../src/deep_vents.js";
test("Heat jets telegraph before a bounded active interval and allow horizontal bypass", () => {
  assert.equal(deepVentPhase(16.99), "quiet");
  assert.equal(deepVentPhase(17), "warning");
  assert.equal(deepVentPhase(19.99), "warning");
  assert.equal(deepVentPhase(20), "active");
  assert.equal(deepVentPhase(24), "quiet");
  const site = { x: 0, y: -500, z: 0 };
  assert.ok(
    intersectsDeepVent(
      { x: -50, y: -480, z: 0 },
      { x: 50, y: -480, z: 0 },
      site,
    ),
  );
  assert.equal(
    intersectsDeepVent(
      { x: -50, y: -440, z: 0 },
      { x: 50, y: -440, z: 0 },
      site,
    ),
    false,
  );
  assert.equal(
    intersectsDeepVent(
      { x: 30, y: -480, z: -50 },
      { x: 30, y: -480, z: 50 },
      site,
    ),
    false,
  );
});
test("Regional capability forwards lifecycle and bounds repeated damage, with idempotent cleanup", () => {
  let updates = 0,
    resets = 0,
    disposals = 0;
  const o = attachDeepVents(
    {
      root: new THREE.Group(),
      heightAt: () => -600,
      update() {
        updates++;
      },
      reset() {
        resets++;
      },
      dispose() {
        disposals++;
      },
    },
    "hawaii",
  );
  const s = o.deepVents.sites[0],
    p = { x: s.x, y: s.y + 20, z: s.z };
  const warning = o.deepVents.onMovement(p, p, 17);
  assert.ok(warning.warning);
  assert.equal(o.deepVents.onMovement(p, p, 18), null);
  assert.equal(o.deepVents.onMovement(p, p, 20).damage, 12);
  assert.equal(o.deepVents.onMovement(p, p, 21), null);
  assert.equal(o.deepVents.onMovement(p, p, 22.6).damage, 12);
  o.update(22, p);
  assert.equal(updates, 1);
  o.reset();
  assert.equal(resets, 1);
  o.dispose();
  o.dispose();
  assert.equal(disposals, 1);
  assert.equal(o.root.children.length, 0);
});

test("Thermal sites require the caller's real terrain rather than an invented flat floor", () => {
  const make = () => ({ root: new THREE.Group(), update() {}, dispose() {} });
  const missing = attachDeepVents(make(), "hawaii");
  assert.equal(missing.deepVents.sites.length, 0);
  missing.dispose();
  const provided = attachDeepVents(make(), "hawaii", { heightAt: () => -443 });
  assert.equal(provided.deepVents.sites[0].y, -442.7);
  provided.dispose();
});
