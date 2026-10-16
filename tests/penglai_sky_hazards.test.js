import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPenglaiSkyHazards } from "../src/penglai_sky_hazards.js";
import { attachDeepHazards } from "../src/deep_hazards.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import {
  createPenglaiWeather,
  stepPenglaiWeather,
  weatherDischarge,
  weatherOpacity,
  penglaiWeatherContact,
} from "../src/penglai_sky_hazard_rules.js";
import { penglaiSkyHazardGuideEntries } from "../src/penglai_sky_hazard_catalog.js";
import { penglaiHeightAt } from "../src/penglai_config.js";
import { setLanguage, t } from "../src/i18n.js";
const player = { x: 0, y: 300, z: -600 };
function random(seed = 1) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const make = () =>
  createPenglaiSkyHazards(new T.Group(), {
    heightAt: () => -60,
    random: random(),
  });
function stage(pool, kind) {
  const e = pool.events.find((e) => e.kind === kind);
  Object.assign(e, {
    phase: "active",
    age: kind === "thunder" ? 3.1 : 1,
    remaining: 10,
    x: 0,
    y: 300,
    z: -600,
    yaw: 0,
    vx: 0,
    vz: 0,
    previous: { ...player },
    announced: true,
    hitPulse: -1,
  });
  return e;
}
test("Seeded weather replays and distinct seeds choose new sky locations and headings", () => {
  const positions = [];
  for (let seed = 1; seed <= 80; seed++) {
    const pool = createPenglaiWeather(random(seed), penglaiHeightAt),
      copy = createPenglaiWeather(random(seed), penglaiHeightAt);
    stepPenglaiWeather(pool, 30, { x: 0, y: 0, z: 0 });
    stepPenglaiWeather(copy, 30, { x: 0, y: 0, z: 0 });
    assert.deepEqual(pool.slots, copy.slots);
    for (const e of pool.slots) {
      assert.equal(e.phase, "forming");
      assert.ok(e.x >= -485 && e.x <= 485 && e.z >= -1285 && e.z <= 45);
      assert.ok(e.y - e.profile.axes.y >= 60);
      assert.ok(e.y + e.profile.axes.y < 620);
      assert.ok(e.y - e.profile.axes.y >= penglaiHeightAt(e.x, e.z) + 25);
      positions.push([e.x, e.y, e.z, e.yaw]);
    }
  }
  assert.equal(new Set(positions.map(JSON.stringify)).size, 160);
  assert.ok(
    positions.some((p) => p[0] < -300) && positions.some((p) => p[0] > 300),
  );
  assert.ok(
    positions.some((p) => p[2] < -1100) && positions.some((p) => p[2] > -200),
  );
  assert.ok(
    positions.some((p) => p[1] < 250) && positions.some((p) => p[1] > 450),
  );
});
test("Large frame steps preserve complete forming time, then drift, fade and rest", () => {
  const pool = createPenglaiWeather(random());
  stepPenglaiWeather(pool, 100, player);
  const e = pool.slots[0],
    x = e.x,
    z = e.z;
  assert.equal(e.phase, "forming");
  assert.equal(e.remaining, 6);
  assert.equal(weatherOpacity(e), 0);
  stepPenglaiWeather(pool, 2, player);
  assert.ok(Math.hypot(e.x - x, e.z - z) > 5);
  assert.equal(e.phase, "forming");
  stepPenglaiWeather(pool, 4, player);
  assert.equal(e.phase, "active");
  assert.equal(e.remaining, 18);
  stepPenglaiWeather(pool, 18, player);
  assert.equal(e.phase, "fading");
  assert.equal(weatherOpacity(e), 1);
  stepPenglaiWeather(pool, 2.5, player);
  assert.equal(weatherOpacity(e), 0.5);
  stepPenglaiWeather(pool, 2.5, player);
  assert.equal(e.phase, "quiet");
  assert.ok(e.remaining >= 22 && e.remaining <= 36);
  assert.equal(weatherOpacity(e), 0);
  stepPenglaiWeather(pool, 40, player);
  assert.equal(e.serial, 2);
  assert.equal(e.phase, "forming");
});
test("Every sampled course keeps drifting throughout its whole lifetime, including boundary starts", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const pool = createPenglaiWeather(random(seed));
    stepPenglaiWeather(pool, 30, { x: 485, y: 350, z: 45 });
    for (const e of pool.slots) {
      const total = e.profile.forming + e.profile.active + e.profile.fading;
      assert.ok(e.x + e.vx * total >= -485 && e.x + e.vx * total <= 485);
      assert.ok(e.z + e.vz * total >= -1285 && e.z + e.vz * total <= 45);
      assert.ok(Math.abs(Math.hypot(e.vx, e.vz) - e.profile.speed) < 1e-8);
    }
  }
});
test("Moving weather has fixed courses and does not home toward a changing player", () => {
  const a = createPenglaiWeather(random()),
    b = createPenglaiWeather(random());
  stepPenglaiWeather(a, 30, player);
  stepPenglaiWeather(b, 30, player);
  stepPenglaiWeather(a, 1, { x: -500, y: 100, z: 0 });
  stepPenglaiWeather(b, 1, { x: 500, y: 600, z: -1300 });
  assert.deepEqual(a.slots, b.slots);
  for (const dt of [-1, NaN, Infinity]) {
    const old = a.time;
    stepPenglaiWeather(a, dt, player);
    assert.equal(a.time, old);
  }
});
test("Storm charging separates brief discharges; wind permits one pulse per event", () => {
  const p = createPenglaiWeather(random());
  for (const e of p.slots) {
    e.phase = "forming";
    assert.equal(weatherDischarge(e), -1);
    e.phase = "active";
  }
  const e = p.slots[0];
  for (const age of [0, 2.99, 3.85, 5, 7.99]) {
    e.age = age;
    assert.equal(weatherDischarge(e), -1);
  }
  for (const [age, pulse] of [
    [3, 0],
    [3.84, 0],
    [8, 1],
    [13.1, 2],
  ]) {
    e.age = age;
    assert.equal(weatherDischarge(e), pulse);
  }
  assert.equal(weatherDischarge(p.slots[1]), 0);
});
test("Broad three-dimensional storm and wind volumes allow safe altitude and side bypasses", () => {
  const p = make();
  try {
    for (const kind of ["thunder", "wind"]) {
      const e = stage(p, kind);
      assert.ok(
        penglaiWeatherContact({ ...player, x: -130 }, { ...player, x: 130 }, e),
      );
      assert.ok(
        penglaiWeatherContact({ ...player, x: 70 }, { ...player, x: 70 }, e),
      );
      assert.equal(
        penglaiWeatherContact({ ...player, y: 390 }, { ...player, y: 390 }, e),
        null,
      );
      assert.equal(
        penglaiWeatherContact({ ...player, x: 130 }, { ...player, x: 130 }, e),
        null,
      );
      assert.equal(
        penglaiWeatherContact({ ...player, y: 59 }, { ...player, y: 59 }, e),
        null,
      );
    }
  } finally {
    p.dispose();
  }
});
test("Sweeps use relative simultaneous motion, including weather crossing a stationary player", () => {
  const p = make();
  try {
    const e = stage(p, "wind");
    e.previous = { x: -150, y: 300, z: -600 };
    e.x = 150;
    assert.ok(penglaiWeatherContact(player, player, e));
    e.previous = { ...player };
    e.x = 150;
    assert.equal(
      penglaiWeatherContact({ ...player, x: 150 }, { ...player, x: 300 }, e),
      null,
    );
    e.previous = { ...player };
    e.x = 0;
    e.yaw = Math.PI / 2;
    assert.equal(
      penglaiWeatherContact({ ...player, x: 70 }, { ...player, x: 70 }, e),
      null,
    );
    assert.ok(
      penglaiWeatherContact({ ...player, z: -530 }, { ...player, z: -530 }, e),
    );
  } finally {
    p.dispose();
  }
});
test("Normal settlement charges each storm discharge once and each wind event once", () => {
  const p = make();
  try {
    const e = stage(p, "thunder");
    assert.equal(p.onMovement(player, player, 0, { length: 30 })[0].damage, 18);
    assert.deepEqual(p.onMovement(player, player, 0), []);
    e.age = 8.1;
    assert.equal(p.onMovement(player, player, 0)[0].damage, 18);
    e.phase = "fading";
    assert.deepEqual(p.onMovement(player, player, 0), []);
    const w = stage(p, "wind");
    assert.equal(p.onMovement(player, player, 0)[0].damage, 18);
    assert.deepEqual(p.onMovement(player, player, 0), []);
    assert.equal(w.hitPulse, 0);
  } finally {
    p.dispose();
  }
});
test("Solid cover preserves an unspent pulse, and low lotus air has neither warning nor damage", () => {
  const p = make();
  try {
    const e = stage(p, "thunder");
    assert.deepEqual(
      p.onMovement(player, player, 0, { blocked: () => true }),
      [],
    );
    assert.equal(e.hitPulse, -1);
    assert.equal(p.onMovement(player, player, 0)[0].damage, 18);
    Object.assign(e, { announced: false, hitPulse: -1 });
    assert.deepEqual(
      p.onMovement({ ...player, y: 0 }, { ...player, y: 0 }, 0),
      [],
    );
    assert.equal(e.announced, false);
  } finally {
    p.dispose();
  }
});
test("Terrain roofs shield lightning independently of the collider callback", () => {
  const p = createPenglaiSkyHazards(new T.Group(), {
    heightAt: () => 350,
    random: random(),
  });
  try {
    const e = stage(p, "thunder");
    assert.deepEqual(p.onMovement(player, player, 0), []);
    assert.equal(e.hitPulse, -1);
  } finally {
    p.dispose();
  }
});
test("Render-only pause cannot advance time, position, lifecycle or damage; reset reuses resources", () => {
  const p = make();
  try {
    const e = stage(p, "thunder");
    p.update(0, player);
    const initial = JSON.stringify([
      e.phase,
      e.remaining,
      e.x,
      e.y,
      e.z,
      p.pool.time,
      e.hitPulse,
    ]);
    for (let i = 0; i < 20; i++) p.update(i, player, true, false);
    assert.equal(
      JSON.stringify([
        e.phase,
        e.remaining,
        e.x,
        e.y,
        e.z,
        p.pool.time,
        e.hitPulse,
      ]),
      initial,
    );
    assert.equal(e.art.cloud.count, 18);
    assert.equal(e.art.cloud.material.uniforms.weatherTime.value, 0);
    const cloud = e.art.cloud;
    for (let i = 0; i < 20; i++) {
      p.reset();
      assert.equal(e.phase, "quiet");
      assert.equal(e.art.group.visible, false);
      assert.equal(e.art.cloud, cloud);
    }
    assert.equal(p.pool.time, 0);
  } finally {
    p.dispose();
  }
});
test("Weather geometry and materials remain bounded and are disposed exactly once", () => {
  const p = make(),
    resources = new Set(),
    counts = new Map();
  p.root.traverse((n) => {
    if (n.geometry) resources.add(n.geometry);
    if (n.material) resources.add(n.material);
  });
  for (const r of resources)
    r.addEventListener("dispose", () =>
      counts.set(r, (counts.get(r) || 0) + 1),
    );
  for (let i = 0; i < 200; i++) {
    p.onMovement(player, player, i, { dt: 1 });
    p.update(i, player);
  }
  const after = new Set();
  p.root.traverse((n) => {
    if (n.geometry) after.add(n.geometry);
    if (n.material) after.add(n.material);
  });
  assert.deepEqual(after, resources);
  assert.ok(resources.size <= 12);
  p.dispose();
  p.dispose();
  p.reset();
  assert.equal(p.root.parent, null);
  assert.equal(p.events.length, 0);
  assert.equal(counts.size, resources.size);
  assert.ok([...counts.values()].every((n) => n === 1));
  assert.deepEqual(p.onMovement(player, player, 0, { dt: 1 }), []);
});
test("Real ocean owns exactly two reusable weather slots, preserves underwater stones and retires weather", () => {
  const ocean = attachDeepHazards(createPenglaiOcean(new T.Scene()), "penglai");
  const sky = ocean.skyHazards;
  try {
    assert.equal(sky.events.length, 2);
    assert.equal(
      ocean.deepHazards.sites.filter(
        (e) => e.profile.id === "submerged_resonance",
      ).length,
      2,
    );
    assert.equal(
      ocean.root.getObjectsByProperty("name", "penglai_sky_hazards").length,
      1,
    );
    ocean.update(0, player, 0, false, player, false);
    ocean.reset();
    assert.ok(sky.events.every((e) => e.phase === "quiet"));
  } finally {
    ocean.dispose();
  }
  assert.equal(sky.events.length, 0);
});
test("Both Guide entries and runtime warnings describe moving weather in English and Chinese", () => {
  const cards = penglaiSkyHazardGuideEntries();
  assert.equal(cards.length, 2);
  for (const language of ["zh-CN", "en"]) {
    setLanguage(language);
    for (const card of cards) {
      const text = [
        card.name,
        card.role,
        card.size,
        card.habitat,
        card.ability,
        card.text,
        card.counter,
      ]
        .map((value) => t(value))
        .join(" ");
      assert.match(text, /18/);
      if (language === "en") {
        assert.equal(/[\u3400-\u9fff]/u.test(text), false);
        assert.match(text, /random/i);
      } else assert.match(text, /随机/);
    }
    const p = make();
    try {
      for (const e of p.events) {
        assert.equal(
          /[\u3400-\u9fff]/u.test(t(e.profile.warning)),
          language !== "en",
        );
        assert.equal(
          /[\u3400-\u9fff]/u.test(t(e.profile.hit)),
          language !== "en",
        );
      }
    } finally {
      p.dispose();
    }
  }
  setLanguage("zh-CN");
});
