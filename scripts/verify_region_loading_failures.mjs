import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { getRegionSpecies } from "../src/region_ecology.js";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/region_loading_failures";
const expected = Object.fromEntries(
  ["hawaii", "atlantis"].map((region) => [
    region,
    Object.fromEntries(
      getRegionSpecies(region).map((species) => [
        species.kind,
        species.population ??
          (species.schoolSize ? 18 : species.category === "ancient" ? 2 : 4),
      ]),
    ),
  ]),
);
const report = {
  baseUrl,
  checks: [],
  expectedErrors: [],
  errors: [],
  limits: [
    "Desktop Chrome at 1440×900; controlled one-shot failures and normal UI region selection.",
    "Population failure targets the twelfth ordinary Atlantis creature after region swap; surface seagulls and guardians are excluded.",
    "Checks population completeness, identity reuse, rollback, scene attachment and UI recovery; not a GPU allocation or physical-device performance test.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const scenario of ["partial_population", "effects_reset"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(30000);
    page.on("pageerror", (error) => report.errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const text = message.text();
      if (text.includes(`Injected ${scenario} failure`))
        report.expectedErrors.push({ scenario, text });
      else report.errors.push(text);
    });
    if (scenario === "partial_population") {
      // 只改本次浏览器收到的模块响应，不写运行源码；启动完成后再设定一次性故障开关。
      await page.route(/\/src\/creatures\.js(?:\?.*)?$/, async (route) => {
        const response = await route.fetch();
        const source = await response.text();
        const signature = /function createCreature\([^)]*\)\s*\{/;
        assert.ok(
          signature.test(source),
          "Creature constructor injection point exists",
        );
        const body = source.replace(
          signature,
          (match) => `${match}
          const probe = globalThis.__regionFailureProbe;
          const game = globalThis.__ABYSSAL__;
          if (probe?.armed && game?.expedition.region.id === "atlantis" && probe.kinds.includes(kind)) {
            probe.count++;
            if (probe.count === 12) {
              probe.armed = false;
              probe.fired = true;
              probe.partialIds = game.entities.map(entity => entity.mesh.uuid);
              probe.failedOcean = game.ocean.root;
              throw new Error("Injected partial_population failure");
            }
          }
        `,
        );
        await route.fulfill({ response, body });
      });
    }
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__ABYSSAL__);
    const before = await snapshot(page);
    assertPopulation(before, "hawaii");
    await page.evaluate(
      ({ scenario, kinds }) => {
        const game = window.__ABYSSAL__;
        window.__regionFailureProbe = {
          armed: true,
          count: 0,
          fired: false,
          partialIds: [],
          kinds,
          oldOcean: game.ocean.root,
        };
        if (scenario === "effects_reset") {
          const original = game.effects.reset;
          game.effects.reset = function (...args) {
            game.effects.reset = original;
            window.__regionFailureProbe.fired = true;
            window.__regionFailureProbe.armed = false;
            throw new Error("Injected effects_reset failure");
          };
        }
      },
      { scenario, kinds: Object.keys(expected.atlantis) },
    );
    await selectRegion(page, "atlantis");
    await page.locator("#region-loading button").waitFor({ state: "visible" });
    const failed = await snapshot(page);
    assertPopulation(failed, "hawaii");
    assert.deepEqual(
      failed.ids,
      before.ids,
      "Rollback restores the original Hawaii population",
    );
    assert.equal(failed.regionLoading, true);
    assert.equal(failed.menuInert, true);
    assert.equal(failed.languageDisabled, true);
    assert.equal(failed.fired, true);
    assert.equal(failed.oldOceanAttached, true);
    assert.equal(failed.failedOceanAttached, false);
    assert.equal(failed.environments, 1);
    assert.equal(failed.surfaceEnvironments, 1);
    if (scenario === "partial_population") {
      assert.equal(failed.failureCount, 12);
      assert.equal(failed.partialIds.length, 11);
    }
    await page.screenshot({ path: `${directory}/${scenario}_failure.png` });
    await page.locator("#region-loading button").click();
    await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
    const home = await snapshot(page);
    assertHomeReady(home, "hawaii");
    assert.equal(home.focus, "region-select");
    await selectRegion(page, "atlantis");
    await page.waitForFunction(
      () =>
        !window.__ABYSSAL__.regionLoading &&
        window.__ABYSSAL__.expedition.region.id === "atlantis",
    );
    const retried = await snapshot(page);
    assertHomeReady(retried, "atlantis");
    assertPopulation(retried, "atlantis");
    assert.equal(retried.total, 390);
    assert.equal(Object.keys(retried.populations).length, 17);
    assert.equal(retried.environments, 1);
    assert.equal(retried.surfaceEnvironments, 1);
    assert.equal(retried.oldOceanAttached, false);
    assert.equal(
      retried.ids.some((id) => before.ids.includes(id)),
      false,
      "Hawaii entities must not contaminate the Atlantis cache",
    );
    for (const id of failed.partialIds)
      assert.ok(
        retried.ids.includes(id),
        "Retry reuses every successfully created partial entity",
      );
    await page.screenshot({ path: `${directory}/${scenario}_retry.png` });
    assert.equal(
      report.expectedErrors.filter((entry) => entry.scenario === scenario)
        .length,
      1,
    );
    report.checks.push({ scenario, before, failed, home, retried });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await browser.close();
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify({
    checks: report.checks.length,
    expectedErrors: report.expectedErrors.length,
    errors: report.errors,
  }),
);

async function selectRegion(page, region) {
  await page.click("#region-select");
  await page.click(`[data-choice-value="${region}"]`);
}

async function snapshot(page) {
  return page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const probe = window.__regionFailureProbe;
    const populations = {};
    for (const entity of game.entities)
      populations[entity.species.kind] =
        (populations[entity.species.kind] || 0) + 1;
    return {
      region: game.expedition.region.id,
      selection: document.querySelector("#region-select").value,
      mode: game.mode,
      regionLoading: game.regionLoading,
      menuInert: document.querySelector("#menu").inert,
      languageDisabled: document.querySelector("[data-language-select]")
        .disabled,
      focus: document.activeElement.id,
      total: game.entities.length,
      populations,
      ids: game.entities.map((entity) => entity.mesh.uuid).sort(),
      allAttached: game.entities.every(
        (entity) => entity.mesh.parent === game.scene,
      ),
      environments: game.scene.getObjectsByProperty("name", "ocean_environment")
        .length,
      surfaceEnvironments: game.scene.getObjectsByProperty(
        "name",
        "surface_environment",
      ).length,
      fired: probe?.fired || false,
      failureCount: probe?.count || 0,
      partialIds: probe?.partialIds || [],
      oldOceanAttached: Boolean(probe?.oldOcean?.parent),
      failedOceanAttached: Boolean(probe?.failedOcean?.parent),
    };
  });
}

function assertPopulation(state, region) {
  assert.equal(state.region, region);
  assert.deepEqual(state.populations, expected[region]);
  assert.equal(
    state.total,
    Object.values(expected[region]).reduce((sum, value) => sum + value, 0),
  );
  assert.equal(new Set(state.ids).size, state.total);
  assert.equal(state.allAttached, true);
}

function assertHomeReady(state, region) {
  assert.equal(state.mode, "menu");
  assert.equal(state.region, region);
  assert.equal(state.selection, region);
  assert.equal(state.regionLoading, false);
  assert.equal(state.menuInert, false);
  assert.equal(state.languageDisabled, false);
}
