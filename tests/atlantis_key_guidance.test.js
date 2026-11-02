import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  atlantisKeyGuide,
  atlantisKeyClue,
  nearAtlantisKeyEntrance,
  createAtlantisKeyArrival,
  atlantisKeyNavigation,
} from "../src/atlantis_key_guidance.js";
import {
  ATLANTIS_KEY_SITES,
  resolveAtlantisKeySites,
} from "../src/atlantis_key_sites.js";
import { createAtlantisUnderways } from "../src/atlantis_underways.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import { t } from "../src/i18n.js";

for (const site of ATLANTIS_KEY_SITES)
  test(`Key clue describes the real building without disclosing the hidden point: ${site.id}`, () => {
    const guide = atlantisKeyGuide(site.id);
    assert.equal(guide.name, site.name);
    for (const key of ["sector", "appearance", "entry"]) assert.ok(guide[key]);
    assert.equal(guide.point, undefined);
    for (const locale of ["en", "zh-CN"]) {
      const clue = t(atlantisKeyClue(site.id), [], locale);
      assert.ok(clue.includes(t(site.name, [], locale)));
      assert.ok(clue.includes(t(guide.appearance, [], locale)));
      if (locale === "en") assert.doesNotMatch(clue, /[\u3400-\u9fff]/u);
      for (const value of Object.values(guide))
        if (locale === "en")
          assert.doesNotMatch(t(value, [], locale), /[\u3400-\u9fff]/u);
    }
  });

test("Memorial upper and lower floors retain their different approach sides", () => {
  assert.match(atlantisKeyGuide("memorial_upper_rear").entry, /深水侧上层/);
  assert.match(atlantisKeyGuide("memorial_lower_east").entry, /浅水侧下层/);
});

test("Resolved public entrances remain separate from all ten actual hiding points", () => {
  const underways = createAtlantisUnderways(new THREE.Group(), {
    heightAt: atlantisSeabedHeight,
  });
  try {
    const sites = resolveAtlantisKeySites(underways.records);
    assert.equal(sites.length, 10);
    for (const site of sites) {
      assert.notDeepEqual(site.guidance, site.point);
      assert.equal(nearAtlantisKeyEntrance(site.guidance, site.guidance), true);
      assert.equal(
        nearAtlantisKeyEntrance(
          { ...site.guidance, y: site.guidance.y + 20 },
          site.guidance,
        ),
        false,
      );
      assert.equal(
        nearAtlantisKeyEntrance(site.guidance, site.guidance, () => true),
        false,
      );
    }
  } finally {
    underways.dispose();
  }
});

test("Entrance discovery respects clues, active play, collection and per-expedition lifecycle", () => {
  const tracker = createAtlantisKeyArrival(),
    entry = { x: 10, y: -50, z: -120 },
    pos = { ...entry };
  const objective = {
    regionId: "atlantis",
    keySiteId: "memorial_upper_rear",
    clueRead: false,
    keyCollected: false,
  };
  assert.equal(tracker.update(objective, entry, pos), null);
  objective.clueRead = true;
  assert.equal(tracker.update(objective, entry, pos, { active: false }), null);
  assert.equal(
    tracker.update(objective, entry, pos, { blockedBetween: () => true }),
    null,
  );
  assert.equal(tracker.update(objective, entry, { ...pos, y: -80 }), null);
  assert.match(t(tracker.update(objective, entry, pos)), /已到达纪念圣厅/);
  assert.equal(tracker.update(objective, entry, pos), null);
  assert.ok(tracker.update({ ...objective }, entry, pos));
  assert.equal(
    tracker.update({ ...objective, keyCollected: true }, entry, pos),
    null,
  );
  assert.equal(
    tracker.update({ ...objective, regionId: "hawaii" }, entry, pos),
    null,
  );
});

test("Navigation follows fixed north and the actual entrance level rather than the hidden key", () => {
  const pos = { x: 0, y: -50, z: 0 };
  for (const [x, z, name] of [
    [0, -100, "北"],
    [100, 0, "东"],
    [0, 100, "南"],
    [-100, 0, "西"],
    [-100, -100, "西北"],
  ]) {
    const nav = atlantisKeyNavigation({ x, y: -150, z }, pos, 4);
    assert.ok(t(nav.horizontal).startsWith(name));
    assert.ok(
      t(nav.horizontal).includes(String(Math.round(Math.hypot(x, z) * 4))),
    );
    assert.equal(t(nav.vertical), "入口 ↓ 400m");
    assert.doesNotMatch(t(nav.horizontal, [], "en"), /[\u3400-\u9fff]/u);
  }
  assert.equal(
    t(atlantisKeyNavigation({ x: 0, y: -25, z: 0 }, pos).vertical),
    "入口 ↑ 100m",
  );
  assert.equal(t(atlantisKeyNavigation(pos, pos).vertical), "入口 · 同层");
  assert.equal(t(atlantisKeyNavigation(pos, pos).horizontal), "入口就在附近");
});
