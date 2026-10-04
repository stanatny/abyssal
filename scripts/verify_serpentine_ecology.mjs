import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const out =
    process.env.ABYSSAL_ECOLOGY_OUT ||
    ".local/locomotion_density_review/native_final",
  url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5274/";
await mkdir(out, { recursive: true });
const b = await chromium.launch({ channel: "chrome", headless: false });
const p = await b.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
p.setDefaultTimeout(60000);
const report = { url, regions: [], errors: [] };
p.on("pageerror", (e) => report.errors.push(e.message));
await p.addInitScript(() => {
  let s = 71523;
  Math.random = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
});
try {
  await p.goto(url);
  await p.waitForFunction(() => window.__ABYSSAL__);
  await p.selectOption("[data-language-select]", "en");
  for (const region of (
    process.env.ABYSSAL_ECOLOGY_REGIONS ||
    "hawaii,atlantis,bermuda,mariana,amazon,europa,penglai"
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
    await p.waitForFunction(
      () =>
        window.__ABYSSAL__.mode === "playing" &&
        !document.body.classList.contains("launching"),
    );
    await p.keyboard.down("KeyK");
    const result = await p.evaluate(async () => {
      const g = window.__ABYSSAL__,
        { getRegionSpecies } = await import("/src/region_ecology.js");
      function stock() {
        return g.entities
          .filter((e) => e.species.category !== "rare")
          .map((e) => ({
            kind: e.species.kind,
            length: e.species.length,
            position: e.mesh.position.toArray(),
            population: e.species.population,
            hidden: e.hiddenFor,
            school: !!e.school,
            resident: e.species.residentRadius,
            nutrition: e.species.nutrition,
            growth: e.species.growth,
            large: e.species.largePreyDispersed,
            ground: e.species.groundbound,
            flying: e.species.flying,
          }));
      }
      function density(list) {
        const large = list.filter(
          (e) => e.length >= 10 && e.length < 25 && !e.ground && !e.flying,
        );
        let maximum = 0,
          minDistance = Infinity;
        for (const e of large) {
          const d = list
            .filter(
              (a) =>
                a !== e &&
                a.length >= 10 &&
                a.length < 25 &&
                !a.ground &&
                !a.flying,
            )
            .map((a) =>
              Math.hypot(...a.position.map((x, i) => x - e.position[i])),
            );
          maximum = Math.max(maximum, 1 + d.filter((n) => n < 25).length);
          minDistance = Math.min(minDistance, ...d);
        }
        return {
          count: large.length,
          maxIn25m: maximum,
          minDistance: Number.isFinite(minDistance) ? minDistance : null,
        };
      }
      window._ecologySnapshot = { stock, density };
      return {
        region: g.expedition.region.id,
        expected: getRegionSpecies(g.expedition.region.id).reduce(
          (n, s) => n + s.population,
          0,
        ),
        initial: stock(),
        density: density(stock()),
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
    assert.equal(result.initial.length, result.expected);
    result.supply = [];
    for (const lord of result.bosses) {
      await p.evaluate((home) => {
        const g = window.__ABYSSAL__;
        g.setLength(25);
        g.player.health = g.player.hunger = g.player.stamina = 100;
        g.player.invulnerable = 90;
        g.setPosition(home[0] + 70, home[1] + 20, home[2] + 65);
        g.setFacing(0.8, 0);
      }, lord.home);
      await p.waitForTimeout(1700);
      const supply = await p.evaluate((lord) => {
        const g = window.__ABYSSAL__,
          s = window._ecologySnapshot
            .stock()
            .filter((e) => e.hidden <= 0 && e.length >= 6 && e.length < 25);
        const list = s
          .map((e) => ({
            ...e,
            distance: Math.hypot(...e.position.map((x, i) => x - lord.home[i])),
          }))
          .filter((e) => e.distance < Math.max(190, lord.radius + 70));
        return { lord: lord.id, nearby: list };
      }, lord);
      result.supply.push(supply);
      await writeFile(
        `${out}/in_progress.json`,
        JSON.stringify({ ...report, current: result }, null, 2),
      );
      assert.ok(
        supply.nearby.length >= 2,
        `${region}:${lord.id}: adult recovery stock`,
      );
    }
    if (region === "europa") {
      const stations = [
        [0, -18, 57],
        [-85, -115, -170],
        [90, -265, -360],
        [-90, -470, -580],
        [0, -730, -745],
      ];
      result.stations = [];
      for (const point of stations) {
        await p.evaluate((point) => {
          const g = window.__ABYSSAL__;
          g.setLength(25);
          g.player.invulnerable = 90;
          g.player.health = g.player.hunger = 100;
          g.setPosition(...point);
        }, point);
        await p.waitForTimeout(2000);
        result.stations.push(
          await p.evaluate(
            (point) => ({
              point,
              nearby: window._ecologySnapshot
                .stock()
                .filter(
                  (e) =>
                    e.hidden <= 0 &&
                    Math.hypot(...e.position.map((x, i) => x - point[i])) < 150,
                ),
              density: window._ecologySnapshot.density(
                window._ecologySnapshot.stock(),
              ),
            }),
            point,
          ),
        );
      }
      await p.screenshot({ path: `${out}/europa_deep.png` });
    }
    if (region === "europa") {
      await p.evaluate(() => {
        const g = window.__ABYSSAL__,
          e = g.entities.find(
            (e) => e.species.kind === "siphon_colossus" && e.hiddenFor <= 0,
          );
        window._meal = e;
        g.setLength(25);
        g.player.health = 40;
        g.player.hunger = 30;
        g.player.invulnerable = 90;
        g.setPosition(
          e.mesh.position.x,
          e.mesh.position.y,
          e.mesh.position.z + 25,
        );
        g.setFacing(0, 0);
        e.mesh.position.copy(g.getFeedingMouth());
      });
      await p.waitForFunction(() => window._meal.hiddenFor > 0);
      result.meal = await p.evaluate(() => ({
        health: window.__ABYSSAL__.player.health,
        length: window.__ABYSSAL__.player.length,
        delay: window._meal.hiddenFor,
      }));
      assert.ok(result.meal.health > 90 && result.meal.length > 25);
      await p.waitForTimeout(900);
      await p.evaluate(() => (window._meal.hiddenFor = 0.01));
      await p.waitForFunction(() => window._meal.hiddenFor <= 0);
      result.replacement = await p.evaluate(() => {
        const e = window._meal,
          a =
            e.species.spawnAnchors[
              e.populationIndex % e.species.spawnAnchors.length
            ];
        return {
          point: e.mesh.position.toArray(),
          home: a,
          radius: e.species.residentRadius,
          distance: Math.hypot(
            ...e.mesh.position.toArray().map((x, i) => x - a[i]),
          ),
          hidden: e.hiddenFor,
        };
      });
      assert.ok(result.replacement.distance <= result.replacement.radius + 2);
    }
    result.final = await p.evaluate(() => window._ecologySnapshot.stock());
    await p.keyboard.up("KeyK");
    await p.click("#pause");
    const paused = await p.evaluate(() => ({
      elapsed: window.__ABYSSAL__.elapsed,
      bones: window.__ABYSSAL__.entities
        .filter((e) =>
          [
            "green_anaconda",
            "titanoboa",
            "bashe",
            "hujiao",
            "rift_reaver",
          ].includes(e.species.kind),
        )
        .map((e) => {
          const a = [];
          e.mesh.traverse((n) => {
            if (n.isBone) a.push(...n.quaternion.toArray());
            if (n.name === "continuous_scaled_body_joint")
              a.push(...n.position.toArray());
          });
          return a;
        }),
    }));
    await p.waitForTimeout(400);
    assert.deepEqual(
      await p.evaluate(() => ({
        elapsed: window.__ABYSSAL__.elapsed,
        bones: window.__ABYSSAL__.entities
          .filter((e) =>
            [
              "green_anaconda",
              "titanoboa",
              "bashe",
              "hujiao",
              "rift_reaver",
            ].includes(e.species.kind),
          )
          .map((e) => {
            const a = [];
            e.mesh.traverse((n) => {
              if (n.isBone) a.push(...n.quaternion.toArray());
              if (n.name === "continuous_scaled_body_joint")
                a.push(...n.position.toArray());
            });
            return a;
          }),
      })),
      paused,
    );
    await p.click("#return-menu");
    await p.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    report.regions.push(result);
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
    console.log(
      region,
      result.initial.length,
      result.density,
      "supply",
      result.supply.map((s) => `${s.lord}:${s.nearby.length}`).join(","),
    );
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
} finally {
  await b.close();
}
