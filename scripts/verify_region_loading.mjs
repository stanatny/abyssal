import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/region_loading";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { baseUrl, checks: [], errors: [] };
try {
  for (const [width, height, locale] of [
    [1440, 900, "en-US"],
    [390, 844, "zh-CN"],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale,
      reducedMotion: "reduce",
    });
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.evaluate(() => {
      window.__loads = [];
      new MutationObserver(() => {
        if (document.body.dataset.regionLoading !== "true") return;
        const entry = {
          paintFrames: 0,
          inert: document.querySelector("#menu").inert,
          start: performance.now(),
        };
        window.__loads.push(entry);
        const tick = () => {
          if (document.body.dataset.regionLoading === "true") {
            entry.paintFrames++;
            requestAnimationFrame(tick);
          } else entry.end = performance.now();
        };
        requestAnimationFrame(tick);
        window.__ABYSSAL__.startGame();
        entry.modeAfterStart = window.__ABYSSAL__.mode;
      }).observe(document.body, {
        attributes: true,
        attributeFilter: ["data-region-loading"],
      });
    });
    for (const region of ["atlantis", "hawaii", "atlantis"]) {
      await page.click("#region-select");
      await page.click(`[data-choice-value="${region}"]`);
      await page.locator("#region-loading").waitFor({ state: "visible" });
      if (
        region === "atlantis" &&
        (await page.evaluate(() => window.__loads.length)) === 1
      )
        await page.screenshot({ path: `${directory}/${width}_loading.png` });
      await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
      const state = await page.evaluate(() => ({
        region: window.__ABYSSAL__.expedition.region.id,
        menu: document.querySelector("#menu").inert,
        focus: document.activeElement.id,
        language: document.querySelector("[data-language-select]").disabled,
        entities: window.__ABYSSAL__.entities.length,
        environments: window.__ABYSSAL__.scene.getObjectsByProperty(
          "name",
          "ocean_environment",
        ).length,
      }));
      assert.equal(state.region, region);
      assert.equal(state.menu, false);
      assert.equal(state.focus, "region-select");
      assert.equal(state.language, false);
      assert.equal(state.entities, region === "atlantis" ? 392 : 293);
      assert.equal(state.environments, 1);
    }
    const loads = await page.evaluate(() => window.__loads);
    assert.ok(
      loads.every(
        (load) =>
          load.inert && load.modeAfterStart === "menu" && load.paintFrames >= 3,
      ),
    );
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.equal(
      await page.locator("[data-language-select]").isDisabled(),
      true,
    );
    await page.keyboard.press("Escape");
    await page.click("#return-menu");
    // 注入一次可恢复的材质准备失败，核实旧环境仍可继续使用。
    await page.evaluate(() => {
      const r = window.__ABYSSAL__.renderer,
        original = r.compileAsync;
      r.compileAsync = function (...args) {
        r.compileAsync = original;
        throw new Error("Injected region compilation failure");
      };
    });
    await page.click("#region-select");
    await page.click('[data-choice-value="hawaii"]');
    await page.locator("#region-loading button").waitFor();
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.expedition.region.id),
      "atlantis",
    );
    await page.locator("#region-loading button").click();
    await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
    assert.equal(
      await page.locator("#region-select").evaluate((n) => n.value),
      "atlantis",
    );
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    report.checks.push({
      width,
      height,
      locale,
      loads,
      rollback: "passed",
      reentry: "passed",
    });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
