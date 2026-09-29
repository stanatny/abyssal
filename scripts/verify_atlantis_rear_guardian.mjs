import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { getExpedition } from "../src/expedition_config.js";

const directory = ".local/atlantis_rear_guardian";
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const expected = getExpedition("atlantis").region.bossInstances.find(
  (entry) => entry.id === "atlantis_rear",
);
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  expected,
  checks: [],
  screenshots: [],
  errors: [],
  limits: [
    "Staged positions use the real game loop, renderer and collision world; this is not a natural full-round or physical-phone playtest.",
    "This focused check verifies the final rear-home change. Earlier full-pool resource evidence used the previous home; the home move does not allocate new resources.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 667 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.locator("header [data-language-select]").selectOption("en");
    await page.locator("#region-select").click();
    await page.locator('[data-choice-value="atlantis"]').click();
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    const setup = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      const rear = g.encounters.bosses.find(
        (entry) => entry.id === "atlantis_rear",
      );
      g.setLength(25);
      g.setPosition(rear.home.x, rear.home.y, rear.home.z + 48);
      g.setFacing(0, 0);
      return {
        home: rear.home.toArray(),
        radius: rear.radius,
        meshes: g.encounters.bosses.map((entry) => entry.mesh.uuid),
      };
    });
    assert.deepEqual(setup.home, expected.home);
    assert.equal(setup.radius, expected.radius);
    const state = () =>
      page.evaluate(() =>
        window.__ABYSSAL__.encounters.bosses
          .filter((entry) => entry.enabled)
          .map((entry) => ({
            id: entry.id,
            phase: entry.state.phase,
            health: entry.state.health,
            defeated: entry.state.defeated,
            ring: entry.ring.visible,
          })),
      );
    await page.waitForFunction(
      () =>
        window.__ABYSSAL__.encounters.bosses.find(
          (entry) => entry.id === "atlantis_rear",
        ).state.phase === "windup",
    );
    const windup = await state();
    assert.deepEqual(
      windup.filter((entry) => entry.ring).map((entry) => entry.id),
      [expected.id],
    );
    const screenshot = `${directory}/${viewport.width}_rear_final_windup.png`;
    await page.screenshot({ path: screenshot });
    report.screenshots.push(screenshot);
    await page.waitForFunction(
      () =>
        window.__ABYSSAL__.encounters.bosses.find(
          (entry) => entry.id === "atlantis_rear",
        ).state.phase === "attack",
    );
    const attack = await state();
    assert.deepEqual(
      attack
        .filter((entry) => entry.phase === "attack")
        .map((entry) => entry.id),
      [expected.id],
    );
    assert.ok(
      attack
        .filter((entry) => entry.id !== expected.id)
        .every(
          (entry) =>
            entry.health === 180 && entry.phase === "dormant" && !entry.ring,
        ),
    );
    await page.evaluate(() => {
      const rear = window.__ABYSSAL__.encounters.bosses.find(
        (entry) => entry.id === "atlantis_rear",
      );
      rear.state.defeated = true;
      rear.state.health = 0;
    });
    await page.keyboard.press("Escape");
    await page.locator("#return-menu").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    const restarted = await state();
    assert.ok(
      restarted.every(
        (entry) => !entry.defeated && entry.health === 180 && !entry.ring,
      ),
    );
    assert.deepEqual(
      await page.evaluate(() =>
        window.__ABYSSAL__.encounters.bosses.map((entry) => entry.mesh.uuid),
      ),
      setup.meshes,
    );
    report.checks.push({ viewport, windup, attack, restarted });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.success = true;
} catch (error) {
  report.success = false;
  report.failure = error.stack || String(error);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
