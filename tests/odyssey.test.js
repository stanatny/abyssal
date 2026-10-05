import {
  habitatPosition,
  schoolPopulationGroups,
  schoolHabitat,
  initialSchoolAnchor,
} from "../src/ecosystem_population.js";
import test from "node:test";
import assert from "node:assert/strict";
import { getRegionSpecies } from "../src/region_ecology.js";
import { REGIONS, getExpedition } from "../src/expedition_config.js";
import { ODYSSEY_SPECIES } from "../src/odyssey_species.js";
import { ODYSSEY_LORDS } from "../src/odyssey_lords.js";
import { odysseySeabedHeight } from "../src/odyssey_config.js";
import { REGIONAL_RARES } from "../src/regional_rare.js";
import { t } from "../src/i18n.js";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
} from "../src/expedition_objectives.js";
import { createBossState, hitBoss } from "../src/boss_rules.js";
import { createPlayer } from "../src/simulation.js";
import { creatureGuideSkills } from "../src/creature_guide_skills.js";
import { ODYSSEY_LORD_DESCRIPTIONS } from "../src/odyssey_lords.js";

test("the eighth underwater region has exclusive actual ecology and no modern human activity", () => {
  const r = getExpedition("odyssey").region;
  assert.equal(REGIONS.at(-1).id, "odyssey");
  assert.equal(r.surfaceMode, undefined);
  assert.equal(r.speciesKinds.length, 21);
  assert.equal(r.bossInstances.length, 3);
  assert.ok(Object.values(r.humanActivity).every((x) => x === false));
  const kinds = new Set(r.speciesKinds);
  for (const other of REGIONS.filter((x) => x.id !== r.id)) {
    assert.ok(
      other.speciesKinds.every((x) => !kinds.has(x)),
      other.id,
    );
    assert.ok(
      other.bossKinds.every((x) => !r.bossKinds.includes(x)),
      other.id,
    );
  }
  const spec = getRegionSpecies(r.id);
  assert.ok(spec.reduce((n, s) => n + s.population, 0) > 250);
  assert.ok(
    spec.every((s) => s.mythic && !s.flying && !s.groundbound && !s.alien),
  );
  for (const s of spec) {
    assert.equal(
      schoolPopulationGroups(s).reduce((n, p) => n + p.count, 0),
      s.population,
    );
    for (const [x, y, z] of s.spawnAnchors)
      assert.ok(
        y > odysseySeabedHeight(x, z) + s.length * 0.15,
        `${s.kind}:${x},${y},${z}`,
      );
  }
  assert.equal(REGIONAL_RARES.filter((s) => s.regionId === r.id).length, 1);
});

test("food covers growing bodies and all three guardians without replacing late threats", () => {
  const spec = getRegionSpecies("odyssey");
  for (const length of [3, 6, 10, 16, 25, 30]) {
    assert.ok(
      spec.some(
        (s) => s.length < length && s.length >= Math.min(length * 0.4, 18),
      ),
      `food:${length}`,
    );
    if (length < 25)
      assert.ok(
        spec.some((s) => s.predator && s.length > length),
        `predator:${length}`,
      );
  }
  for (const lord of getExpedition("odyssey").region.bossInstances) {
    const meals = spec
      .filter((s) => !s.predator && s.length >= 18 && s.length <= 24)
      .flatMap((s) => s.spawnAnchors);
    assert.ok(
      meals.some((a) => Math.hypot(...a.map((n, i) => n - lord.home[i])) < 180),
      lord.id,
    );
  }
});

test("mythic victory requires all three once-only guardians and 30 metres", () => {
  const r = getExpedition("odyssey").region;
  const o = createExpeditionObjective(r),
    p = createPlayer();
  p.length = 30;
  const bosses = r.bossInstances.map((s, i) => ({
    id: s.id,
    enabled: true,
    state: { defeated: i === 0 },
  }));
  advanceExpeditionObjective(o, p, bosses);
  assert.equal(p.won, false);
  bosses[1].state.defeated = true;
  advanceExpeditionObjective(o, p, bosses);
  assert.equal(p.won, false);
  bosses[2].state.defeated = true;
  p.length = 29;
  advanceExpeditionObjective(o, p, bosses);
  assert.equal(p.won, false);
  p.length = 30;
  advanceExpeditionObjective(o, p, bosses);
  assert.equal(p.won, true);
  advanceExpeditionObjective(o, p, bosses);
  assert.equal(o.defeated.size, 3);
});

test("all three new lords preserve eligibility and three separate valid attacks", () => {
  for (const s of ODYSSEY_LORDS) {
    const b = createBossState(s),
      p = createPlayer();
    p.length = 24;
    assert.equal(hitBoss(p, b, { inRange: true, isFlank: true }).hit, false);
    p.length = 25;
    for (let i = 0; i < 3; i++) {
      p.biteCooldown = 0;
      b.biteCooldown = 0;
      b.contactArmed = true;
      const hit = hitBoss(p, b, { inRange: true, isFlank: true });
      assert.equal(hit.defeated, i === 2);
    }
    assert.equal(b.validatedHits, 3);
    const cards = creatureGuideSkills(s, ODYSSEY_LORD_DESCRIPTIONS[s.kind]);
    assert.equal(cards.length, s.kind === "scylla" ? 1 : 2);
    for (const card of cards) {
      assert.ok(!/\p{Script=Han}/u.test(t(card.description, [], "en")));
      assert.ok(!/\p{Script=Han}/u.test(t(card.counter, [], "en")));
    }
  }
});

// 实际生成范围与学校水层同验，避免目录通过而切图在分组生成时失败。
test("every Odyssean resident and school has a legal actual habitat", () => {
  for (const species of getRegionSpecies("odyssey")) {
    for (let i = 0; i < species.population; i++) {
      assert.ok(
        habitatPosition(species, {
          heightAt: odysseySeabedHeight,
          populationIndex: i,
        }),
        `${species.kind} resident ${i}`,
      );
    }
    if (species.schoolSize > 1)
      for (const group of schoolPopulationGroups(species)) {
        const habitat = schoolHabitat(species, group.index);
        assert.ok(
          habitatPosition(habitat, {
            heightAt: odysseySeabedHeight,
            anchor: initialSchoolAnchor(species, group.index),
          }),
          `${species.kind} school ${group.index}`,
        );
      }
  }
});
