// 受控玩家站位检查实际移动生态；目录覆盖与原生供给是独立证据，不能当作自然通关时间。
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const out = process.env.OUT || ".local/progression_verification",
  url = process.env.URL || "http://127.0.0.1:5178";
await mkdir(out, { recursive: true });
const report = {
  url,
  conditions: {
    seed: 71523,
    viewport: [1440, 900],
    character: "orca",
    quality: "Captured from native quality control after initialization",
    nativeActiveSampling: true,
    controlledPlayerStations: true,
  },
  regions: [],
  errors: [],
};
const b = await chromium.launch({ channel: "chrome", headless: true });
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
p.setDefaultTimeout(90000);
p.on("pageerror", (e) => report.errors.push(e.message));
await p.addInitScript(() => {
  let s = 71523;
  Math.random = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
});
try {
  await p.goto(url);
  await p.waitForFunction(() => window.__ABYSSAL__);
  await p.selectOption("[data-language-select]", "en");
  report.conditions.quality = await p.locator("#quality").innerText();
  for (const region of (
    process.env.REGIONS ||
    "hawaii,atlantis,bermuda,mariana,amazon,europa,penglai,odyssey"
  ).split(",")) {
    if (
      (await p.evaluate(() => window.__ABYSSAL__.expedition.region.id)) !==
      region
    ) {
      await p.click("#region-select");
      await p.click(`[data-choice-value="${region}"]`);
      await p.waitForFunction(
        (id) =>
          window.__ABYSSAL__.expedition.region.id === id &&
          !window.__ABYSSAL__.regionLoading,
        region,
      );
    }
    await p.click("#start");
    await p.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await p.keyboard.down("KeyK");
    const result = await p.evaluate(async () => {
      const g = window.__ABYSSAL__,
        { preyMealReward, createPlayer, consumePrey } = await import(
          "/src/simulation.js"
        ),
        { isNursery } = await import("/src/nursery_rules.js");
      const stock = () =>
        g.entities
          .filter((e) => e.species.category !== "rare" && e.hiddenFor <= 0)
          .map((e) => ({
            kind: e.species.kind,
            length: e.species.length,
            position: e.mesh.position.toArray(),
            predator: !!e.species.predator,
            nutrition: e.species.nutrition,
            growth: e.species.growth,
            school: !!e.school,
            visible: e.mesh.visible,
            home: e.species.spawnAnchors?.[
              e.populationIndex % e.species.spawnAnchors?.length
            ],
            depthMin: e.species.depthMin,
            depthMax: e.species.depthMax,
          }));
      window._progressionStock = stock;
      const meals = (length, list) =>
        list
          .filter((e) => e.length < length)
          .map((e) => {
            const q = createPlayer("orca", Math.min(length, 29));
            q.length = length;
            q.mass = (length / 6) ** 3;
            q.health = 55;
            consumePrey(q, e);
            return {
              ...e,
              effective: preyMealReward(length, e),
              heal: q.health - 55,
              lengthAfter: q.length,
            };
          });
      window._progressionMeals = meals;
      const a = stock(),
        start = g.player.length,
        origin = g.expedition.region.spawn;
      return {
        inventory: g.entities.filter((e) => e.species.category !== "rare")
          .length,
        schools: [
          ...new Set(g.entities.map((e) => e.school).filter(Boolean)),
        ].map((s) => ({
          kind: s.kind,
          center: s.center.toArray(),
          nursery: !!s.habitat.nurseryResident,
        })),
        region: g.expedition.region.id,
        startLength: start,
        stock: a,
        nursery: a.filter((e) =>
          isNursery({ x: e.position[0], y: e.position[1], z: e.position[2] }),
        ),
        initialPickups: g.pickups.map((i) => ({
          kind: i.kind,
          position: i.mesh.position.toArray(),
          nursery: isNursery(i.mesh.position),
          distance: Math.hypot(
            ...i.mesh.position.toArray().map((x, j) => x - origin[j]),
          ),
          disabled: i.disabled,
          visible: i.mesh.visible,
        })),
        startFood: meals(start, a).filter(
          (e) =>
            !e.predator &&
            Math.hypot(...e.position.map((x, i) => x - origin[i])) < 150,
        ),
        bosses: g.encounters.bosses
          .filter((e) => e.enabled)
          .map((e) => ({
            id: e.id,
            kind: e.state.species.kind,
            home: e.home.toArray(),
            radius: e.radius,
          })),
      };
    });
    result.stages = [];
    for (const length of [3, 6, 10, 16, 25, 30].filter(
      (l) => l >= result.startLength,
    )) {
      const station = await p.evaluate((length) => {
        const g = window.__ABYSSAL__;
        const e =
          g.entities
            .filter(
              (e) =>
                e.hiddenFor <= 0 &&
                e.species.category !== "rare" &&
                e.species.length < length &&
                e.species.length >= Math.max(1, length * 0.3) &&
                !e.species.predator,
            )
            .sort(
              (a, b) =>
                b.species.length - a.species.length ||
                a.mesh.position.distanceTo(g.position) -
                  b.mesh.position.distanceTo(g.position),
            )[0] ||
          g.entities
            .filter(
              (e) =>
                e.hiddenFor <= 0 &&
                e.species.length < length &&
                e.species.category !== "rare",
            )
            .sort((a, b) => b.species.length - a.species.length)[0];
        if (!e) return null;
        const point = e.mesh.position.clone();
        point.x += 45;
        g.setLength(length);
        g.setPosition(...point.toArray());
        g.setFacing(0, 0);
        g.player.health = 55;
        g.player.stamina = g.player.hunger = 100;
        g.player.invulnerable = 90;
        return { kind: e.species.kind, point: point.toArray() };
      }, length);
      if (!station) {
        result.stages.push({ length, missing: true });
        continue;
      }
      await p.waitForTimeout(2200);
      const nearby = await p.evaluate(
        ({ length, point }) => {
          const g = window.__ABYSSAL__;
          const list = window
            ._progressionMeals(length, window._progressionStock())
            .map((e) => ({
              ...e,
              distance: Math.hypot(...e.position.map((x, i) => x - point[i])),
            }))
            .filter((e) => e.distance < 150);
          return {
            meals: list,
            actualPlayerLength: g.player.length,
            health: g.player.health,
            mode: g.mode,
          };
        },
        { length, point: station.point },
      );
      result.stages.push({ length, station, ...nearby });
    }
    result.supply = [];
    for (const boss of result.bosses) {
      await p.evaluate((boss) => {
        const g = window.__ABYSSAL__;
        g.setLength(25);
        g.setPosition(
          boss.home[0] + boss.radius * 0.7,
          boss.home[1] + 20,
          boss.home[2] + 55,
        );
        g.setFacing(0, 0);
        g.player.health = 55;
        g.player.stamina = g.player.hunger = 100;
        g.player.invulnerable = 90;
      }, boss);
      await p.waitForTimeout(2200);
      const nearby = await p.evaluate(
        (boss) =>
          window
            ._progressionMeals(25, window._progressionStock())
            .map((e) => ({
              ...e,
              distance: Math.hypot(
                ...e.position.map((x, i) => x - boss.home[i]),
              ),
            }))
            .filter(
              (e) =>
                e.distance < Math.max(190, boss.radius + 110) && e.heal >= 15,
            ),
        boss,
      );
      result.supply.push({ ...boss, meals: nearby });
    }
    const inventory = {
      hawaii: 516,
      atlantis: 560,
      bermuda: 467,
      mariana: 453,
      amazon: 409,
      europa: 352,
      penglai: 437,
      odyssey: 269,
    };
    assert.equal(
      result.inventory,
      inventory[region],
      region + ": pool inventory",
    );
    assert.equal(result.initialPickups.length, 20, region + ": reward pool");
    assert.deepEqual(
      result.initialPickups.slice(0, 2).map((p) => p.kind),
      ["stamina", "flow"],
    );
    for (const kind of ["stamina", "flow", "frenzy"])
      assert.equal(
        result.initialPickups.slice(2).filter((p) => p.kind === kind).length,
        6,
      );
    for (const s of result.stages) {
      assert.ok(s.meals?.length > 0, region + ": reachable food " + s.length);
      if (s.length >= 16)
        assert.ok(
          s.meals.some((e) => e.heal >= 15),
          region + ": substantial adult food " + s.length,
        );
    }
    for (const s of result.supply)
      assert.ok(s.meals.length >= 2, region + ": recovery reserve " + s.id);
    for (const kind of region === "europa"
      ? ["glass_seed", "ribbon_spore", "tripod_bloom"]
      : region === "bermuda"
        ? ["sardine"]
        : []) {
      const homes = result.schools
        .filter((s) => s.kind === kind && s.nursery)
        .map((s) => s.center.join(","));
      assert.equal(
        new Set(homes).size,
        homes.length,
        region + ": actual nursery homes " + kind,
      );
    }
    report.regions.push(result);
    await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
    console.log(
      region,
      JSON.stringify({
        stock: result.stock.length,
        startFood: result.startFood.length,
        stages: result.stages.map((s) => [
          s.length,
          s.meals?.filter((e) => e.heal >= 15).length,
          s.meals?.length,
        ]),
        lords: result.supply.map((s) => [s.id, s.meals.length]),
      }),
    );
    await p.keyboard.up("KeyK");
    await p.evaluate(() => window.__ABYSSAL__.returnToMenu());
    await p.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.failure = String(e.stack || e);
  process.exitCode = 1;
} finally {
  await b.close();
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2));
}
