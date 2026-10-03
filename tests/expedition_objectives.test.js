import assert from "node:assert/strict";
import test from "node:test";
import {
  createExpeditionObjective,
  advanceExpeditionObjective,
  REGION_OBJECTIVES,
} from "../src/expedition_objectives.js";
import { REGIONS } from "../src/expedition_config.js";
import {
  createPlayer,
  applyNutrition,
  canEat,
  consumePrey,
} from "../src/simulation.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";

function fixture(id, random = () => 0.5) {
  const region = REGIONS.find((r) => r.id === id);
  const state = createExpeditionObjective(region, random);
  const player = createPlayer();
  player.expeditionComplete = false;
  player.length = 30;
  player.mass = 125;
  const bosses = (
    region.bossInstances || [{ id: "kraken_0" }, { id: "hydra_0" }]
  ).map((b) => ({
    id: b.id,
    enabled: true,
    state: { defeated: false },
  }));
  return {
    state,
    player,
    bosses,
    step: (options) =>
      advanceExpeditionObjective(state, player, bosses, options),
  };
}

test("Hawaii requires maximum growth and a real local defeat, without duplicate-count farming", () => {
  const f = fixture("hawaii");
  assert.equal(f.step().won, false);
  f.bosses[0].state.defeated = true;
  f.player.length = 29.99;
  assert.equal(f.step().won, false);
  f.player.length = 30;
  assert.equal(f.step().won, true);
  f.step();
  assert.equal(f.state.defeated.size, 1);
});

test("Atlantis conceals a fresh guardian selection, and other victories or meals cannot complete the treasure quest", () => {
  for (const random of [0, 0.34, 0.99]) {
    const f = fixture("atlantis", () => random);
    const guardian = f.bosses.find((b) => b.id === f.state.guardianId);
    const other = f.bosses.find((b) => b !== guardian);
    other.state.defeated = true;
    assert.equal(f.step({ relicContact: true }).unlocked, false);
    assert.equal(f.player.won, false);
    applyNutrition(f.player, { nutrition: 100, growth: 40 });
    assert.equal(f.player.won, false);
    guardian.state.defeated = true;
    assert.equal(f.step().unlocked, false);
    assert.equal(f.state.guardianDefeated, true);
    assert.equal(f.step({ keyContact: true }).unlocked, true);
    assert.equal(f.player.won, false);
    f.player.length = 29.9;
    assert.equal(f.step({ relicContact: true }).collected, false);
    f.player.length = 30;
    assert.equal(f.step({ relicContact: true }).collected, true);
    assert.equal(f.player.won, true);
    assert.equal(f.step({ relicContact: true }).collected, false);
  }
  assert.notEqual(
    fixture("atlantis", () => 0).state.guardianId,
    fixture("atlantis", () => 0.99).state.guardianId,
  );
});

test("Bermuda needs every distinct local lord and ignores disabled or foreign encounters", () => {
  const f = fixture("bermuda");
  f.player.length = 25;
  for (const b of f.bosses.slice(0, 3)) b.state.defeated = true;
  assert.equal(f.step().won, false);
  // 非当前地图的领主不能冒充第四枚印记。
  f.bosses.push({ id: "foreign", enabled: true, state: { defeated: true } });
  assert.equal(f.step().won, false);
  f.bosses.push({
    id: f.bosses[3].id,
    enabled: false,
    state: { defeated: true },
  });
  assert.equal(f.step().won, false);
  f.bosses[3].state.defeated = true;
  assert.equal(f.step().won, true);
});

test("Mariana retains the bottom-arrival exception and rejects premature growth victory", () => {
  const f = fixture("mariana");
  assert.equal(f.step({ trenchArrived: true }).won, false);
  for (const b of f.bosses) b.state.defeated = true;
  assert.equal(f.step().won, false);
  assert.equal(f.step({ trenchArrived: true }).won, true);
  for (const key of ["dead", "timedOut"]) {
    f.player[key] = true;
    assert.equal(f.step({ trenchArrived: true }).won, false);
    f.player[key] = false;
  }
});

test("All destinations have substantial and exclusive content in each ecological category", () => {
  for (const region of REGIONS) {
    const species = getRegionSpecies(region.id);
    if (region.ecologyKind === "alien") {
      assert.equal(species.length, 16);
      assert.ok(species.every((s) => s.category === "alien"));
    }
    const roles =
      region.ecologyKind === "mythic"
        ? ["mythic"]
        : region.ecologyKind === "alien"
          ? ["grazer", "hunter", "giant"]
          : ["shoal", "hunter", "ancient"];
    for (const category of roles) {
      const entries = species.filter(
        (s) =>
          (region.ecologyKind === "alien" ? s.trophicRole : s.category) ===
          category,
      );
      assert.ok(entries.length >= 3, `${region.id}: ${category}`);
      assert.ok(
        entries.some(
          (s) =>
            REGIONS.filter((r) => r.speciesKinds.includes(s.kind)).length === 1,
        ),
        `${region.id}: exclusive ${category}`,
      );
    }
    for (const length of [3, 6, 10, 16, 20, 25, 30].filter(
      (l) => l >= (region.startLength || 3),
    )) {
      const player = createPlayer();
      player.length = length;
      player.mass = (length / 6) ** 3;
      const meals = species.filter((s) => canEat(player, s.length));
      assert.ok(meals.length >= 3, `${region.id}: food variety at ${length}`);
      player.hunger = 0;
      assert.ok(consumePrey(player, meals.at(-1)));
      assert.ok(
        player.lastMeal.nutrition > 0,
        `${region.id}: nutrition at ${length}`,
      );
      assert.ok(
        species.some((s) => s.predator && s.length > length) ||
          region.bossKinds.some(
            (kind) => BOSS_SPECIES.find((b) => b.kind === kind).length > length,
          ),
        `${region.id}: threat at ${length}`,
      );
    }
    assert.equal(region.objective, REGION_OBJECTIVES[region.id]);
  }
});

// 新地图目标与说明不能只翻译标题，动态完成提示也需要两种语言。
test("Every regional introduction, objective and completion message is translated", async () => {
  const { t } = await import("../src/i18n.js");
  for (const region of REGIONS)
    for (const text of [
      region.description,
      ...Object.values(region.objective).filter(
        (v) => typeof v === "string" && /[\u3400-\u9fff]/u.test(v),
      ),
    ]) {
      assert.equal(
        /[\u3400-\u9fff]/u.test(t(text, [], "en")),
        false,
        region.id + ": " + text,
      );
      assert.equal(t(text, [], "zh-CN"), text);
    }
});

test("Atlantis key and guardian are independent, order-free requirements; optional clues never grant treasure", () => {
  for (const keyFirst of [true, false]) {
    const f = fixture("atlantis", () => 0);
    const guard = f.bosses.find((b) => b.id === f.state.guardianId);
    assert.equal(
      f.step({ clueContact: true, relicContact: true }).clueFound,
      true,
    );
    assert.equal(f.state.keyCollected, false);
    assert.equal(f.step({ clueContact: true }).clueFound, false);
    if (keyFirst) {
      assert.equal(f.step({ keyContact: true }).keyFound, true);
      assert.equal(f.state.relicUnlocked, false);
      guard.state.defeated = true;
    } else {
      guard.state.defeated = true;
      assert.equal(f.step().unlocked, false);
    }
    assert.equal(f.step({ keyContact: true }).unlocked, true);
    assert.equal(f.player.won, false);
    assert.equal(f.step({ relicContact: true }).won, true);
  }
  for (const flag of ["dead", "timedOut"]) {
    const f = fixture("atlantis");
    f.player[flag] = true;
    f.step({ keyContact: true, clueContact: true, relicContact: true });
    assert.equal(f.state.keyCollected, false);
    assert.equal(f.state.clueRead, false);
    assert.equal(f.player.won, false);
  }
  let n = 0;
  const f = fixture("atlantis", () => [0, 0.99][n++]);
  assert.equal(f.state.guardianId, f.bosses[0].id);
  assert.equal(f.state.keySiteId, "memorial_terrace");
});
