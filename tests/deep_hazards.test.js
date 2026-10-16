import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  DEEP_HAZARD_RULES as R,
  DEEP_HAZARD_PROFILES as P,
  createDeepHazardState,
  stepDeepHazard,
  deepHazardContact,
  deepHazardTerrainBlocked,
} from "../src/deep_hazard_rules.js";
import { attachDeepHazards } from "../src/deep_hazards.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { createPlayer, takeDamage } from "../src/simulation.js";
import { deepHazardGuideEntries } from "../src/deep_hazard_catalog.js";
import { setLanguage, t } from "../src/i18n.js";

const point = (x = 0, y = -485, z = 0) => ({ x, y, z });
test("Mechanisms require a complete warning, release, quiet interval and a fresh charge", () => {
  const s = createDeepHazardState();
  assert.equal(stepDeepHazard(s, 100, false), null);
  assert.equal(stepDeepHazard(s, 100, true), "warning");
  assert.equal(s.remaining, 3);
  stepDeepHazard(s, 2.99, false);
  assert.equal(s.phase, "warning");
  stepDeepHazard(s, 0.01, false);
  assert.equal(s.phase, "active");
  assert.equal(s.remaining, 2);
  stepDeepHazard(s, 2, true);
  assert.equal(s.phase, "cooldown");
  stepDeepHazard(s, 9.99, true);
  assert.equal(s.phase, "cooldown");
  stepDeepHazard(s, 0.01, true);
  assert.equal(s.phase, "idle");
  stepDeepHazard(s, 0, true);
  assert.equal(s.phase, "warning");
  assert.equal(s.activations, 2);
  for (const dt of [-1, NaN, Infinity]) {
    const before = structuredClone(s);
    stepDeepHazard(s, dt, true);
    assert.deepEqual(s, before);
  }
});
test("Swept fixed lanes and round pockets reject altitude, lateral bypass and rotated misses", () => {
  const site = { x: 0, y: -500, z: 0, yaw: 0, profile: P.atlantis };
  assert.ok(deepHazardContact(point(-50), point(50), site));
  assert.equal(
    deepHazardContact(point(-50, -460), point(50, -460), site),
    null,
  );
  assert.equal(
    deepHazardContact(point(-50, -485, 9), point(50, -485, 9), site),
    null,
  );
  site.yaw = Math.PI / 2;
  assert.ok(deepHazardContact(point(0, -485, -50), point(0, -485, 50), site));
  assert.equal(
    deepHazardContact(point(9, -485, -50), point(9, -485, 50), site),
    null,
  );
  site.profile = P.amazon;
  site.yaw = 0;
  assert.ok(deepHazardContact(point(-50), point(50), site));
  assert.equal(
    deepHazardContact(point(-50, -485, 16), point(50, -485, 16), site),
    null,
  );
  assert.equal(deepHazardContact(point(0, -510), point(0, -502), site), null);
});
function make(region = "odyssey") {
  let updates = 0,
    resets = 0,
    disposes = 0;
  const o = attachDeepHazards(
    {
      root: new THREE.Group(),
      heightAt: () => -500,
      colliders: [],
      update() {
        updates++;
      },
      reset() {
        resets++;
      },
      dispose() {
        disposes++;
      },
    },
    region,
  );
  return { o, counts: () => ({ updates, resets, disposes }) };
}
test("Activation is same-level, size-independent, once-only, and solid cover suppresses trigger and hit", () => {
  const { o } = make();
  const s = o.deepHazards.sites[0];
  const p = point(s.x, s.y + 15, s.z);
  assert.equal(
    o.deepHazards.onMovement(
      { ...p, y: p.y + 100 },
      { ...p, y: p.y + 100 },
      0,
      { dt: 0.1 },
    ).length,
    0,
  );
  assert.equal(
    o.deepHazards.onMovement(p, p, 0, { dt: 0.1, blocked: () => true }).length,
    0,
  );
  assert.ok(
    o.deepHazards.onMovement(p, p, 0, { dt: 0.1, length: 30 })[0].warning,
  );
  assert.equal(o.deepHazards.onMovement(p, p, 2.99, { dt: 2.99 }).length, 0);
  assert.equal(
    o.deepHazards.onMovement(p, p, 3, { dt: 0.01, blocked: () => true }).length,
    0,
  );
  assert.equal(s.state.spent, false);
  const hit = o.deepHazards.onMovement(p, p, 3.1, { dt: 0.1, length: 30 })[0];
  assert.equal(hit.damage, R.damage);
  assert.equal(o.deepHazards.onMovement(p, p, 3.2, { dt: 0.1 }).length, 0);
  o.dispose();
  assert.deepEqual(o.deepHazards.onMovement(p, p, 4, { dt: 1 }), []);
});
test("Reset preserves owned pools; disposal is idempotent and forwards all lifecycle methods", () => {
  const { o, counts } = make();
  const s = o.deepHazards.sites[0],
    p = point(s.x, s.y + 10, s.z);
  const ids = [];
  o.root.traverse((n) => {
    if (n.geometry) ids.push(n.geometry.uuid);
  });
  for (let i = 0; i < 10; i++) {
    o.deepHazards.onMovement(p, p, i, { dt: 0 });
    o.update(i, p, 0, true, null, true);
    o.reset();
    assert.equal(s.state.phase, "idle");
    assert.equal(s.art.plume.visible, false);
  }
  const after = [];
  o.root.traverse((n) => {
    if (n.geometry) after.push(n.geometry.uuid);
  });
  assert.deepEqual(after, ids);
  o.update(12, p, 0, true, null, true);
  assert.equal(s.art.material.uniforms.hazardTime.value, 0);
  o.dispose();
  o.dispose();
  assert.deepEqual(counts(), { updates: 11, resets: 10, disposes: 1 });
  assert.equal(o.root.children.length, 0);
});
test("Shared damage keeps Steel Body and existing 30m retaliating giants", () => {
  const player = createPlayer("orca"),
    steel = createPlayer("mechanical_shark");
  takeDamage(player, R.damage);
  takeDamage(steel, R.damage);
  assert.equal(player.health, 82);
  assert.equal(steel.health, 88);
  assert.equal(canPredatorRetaliate(30, 28), true);
  assert.equal(canPredatorRetaliate(30, 25), false);
});
test("Every registered regional hazard has bilingual discoverable rules and response copy", () => {
  try {
    for (const language of ["en", "zh-CN"]) {
      setLanguage(language);
      const entries = deepHazardGuideEntries();
      assert.equal(entries.length, 8);
      for (const entry of entries) {
        const text = [
          t(entry.name),
          t(entry.role),
          t(entry.habitat),
          t(entry.ability),
          String(entry.text),
          String(entry.counter),
        ].join(" ");
        if (language === "en")
          assert.equal(/[\u3400-\u9fff]/u.test(text), false, text);
        assert.match(text, /18/);
        assert.ok(entry.regionIds.length === 1);
      }
    }
  } finally {
    setLanguage("zh-CN");
  }
});

test("A raised final seabed blocks a pressure pulse even without a box proxy", () => {
  const a = { x: -10, y: -485, z: 0 },
    b = { x: 10, y: -485, z: 0 };
  assert.equal(
    deepHazardTerrainBlocked(a, b, () => -500),
    false,
  );
  assert.equal(
    deepHazardTerrainBlocked(a, b, (x) => (Math.abs(x) < 2 ? -480 : -500)),
    true,
  );
  assert.equal(deepHazardTerrainBlocked(a, b), false);
});
