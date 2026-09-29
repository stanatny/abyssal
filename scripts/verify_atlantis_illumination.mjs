import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const out = ".local/atlantis_illumination";
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
await mkdir(out, { recursive: true });
const report = {
  base,
  views: [],
  checks: [],
  errors: [],
  limits: [
    "Positions and close-up cameras are staged; illumination, fog, materials and normal gameplay remain unchanged.",
    "390px touch emulation is not physical-phone performance verification.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 1440 ? 900 : 667 },
      locale: "en-US",
      reducedMotion: "reduce",
      hasTouch: width === 390,
      isMobile: width === 390,
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") report.errors.push(e.text());
    });
    await page.goto(base);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.locator("#region-select").click();
    await page.locator('[data-choice-value="atlantis"]').click();
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.keyboard.down("KeyK");
    const samples = [];
    for (const view of [
      { name: "avenue", p: [0, -340, -500], target: [0, -390, -575] },
      { name: "temple", p: [70, -455, -782], target: [0, -535, -885] },
      { name: "outer_street", p: [265, -353, -565], target: [285, -408, -637] },
    ]) {
      await page.evaluate((view) => {
        const g = window.__ABYSSAL__;
        g.setLength(12);
        g.player.health = 100;
        g.setPosition(...view.p);
        g.setFacing(0, -0.28);
      }, view);
      await page.waitForTimeout(1100);
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.mode),
        "playing",
      );
      await page.screenshot({ path: `${out}/${width}_${view.name}_play.png` });
      const measurement = await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        return {
          position: g.position.toArray(),
          fog: g.scene.fog.density,
          ambient: g.scene.children.find((n) => n.isHemisphereLight).intensity,
          city: g.ocean.city.stats,
          outskirts: g.ocean.outskirts.stats,
          lamps: g.ocean.city.root.children.filter(
            (n) => n.isPointLight && n.visible,
          ).length,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
        };
      });
      assert.ok(measurement.city.pearlHabitats >= 40);
      assert.ok(measurement.outskirts.clusters >= 15);
      assert.equal(measurement.lamps, 5);
      assert.equal(measurement.overflow, false);
      samples.push(measurement);
      report.views.push({ width, view: view.name, ...measurement });
      if (width === 1440) {
        await page.keyboard.press("Escape");
        await page.evaluate((view) => {
          const g = window.__ABYSSAL__;
          g.camera.position.set(...view.p);
          g.camera.up.set(0, 1, 0);
          g.camera.lookAt(...view.target);
          g.avatar.visible = false;
          document
            .querySelectorAll(
              "header,#hud,#overlay,#target,#notification,#touch-controls,#sonar-markers",
            )
            .forEach((n) => (n.style.visibility = "hidden"));
          g.visuals.render();
        }, view);
        await page.screenshot({
          path: `${out}/${width}_${view.name}_detail.png`,
        });
        await page.evaluate(() => {
          window.__ABYSSAL__.avatar.visible = true;
          document
            .querySelectorAll(
              "header,#hud,#overlay,#target,#notification,#touch-controls,#sonar-markers",
            )
            .forEach((n) => (n.style.visibility = ""));
        });
        await page.keyboard.press("Escape");
      }
    }
    assert.ok(samples[0].ambient > samples[2].ambient * 2);
    assert.ok(samples[1].ambient > samples[2].ambient * 2);
    assert.ok(samples[0].fog < samples[2].fog * 0.7);
    report.checks.push(
      `${width}px: city route and temple illumination stay distinct from dark outskirts during normal play; bounded light pool, real scenery, no overflow`,
    );
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    passed: report.passed,
    checks: report.checks,
    errors: report.errors,
  }),
);
