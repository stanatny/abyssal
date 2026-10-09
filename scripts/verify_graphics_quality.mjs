import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/";
const out = process.env.ABYSSAL_PERF_DIRECTORY || ".local/graphics_quality";
await mkdir(out, { recursive: true });
const report = { url, at: new Date().toISOString(), checks: [], errors: [] };
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--no-proxy-server"],
});
try {
  for (const fixture of [
    {
      name: "desktop_en",
      width: 1440,
      height: 900,
      language: "en",
      high: true,
    },
    {
      name: "phone_zh",
      width: 390,
      height: 844,
      language: "zh-CN",
      high: false,
      touch: true,
    },
    {
      name: "phone_en_320",
      width: 320,
      height: 740,
      language: "en",
      high: false,
      touch: true,
    },
    {
      name: "invalid_saved",
      width: 390,
      height: 844,
      language: "en",
      high: false,
      touch: true,
      invalid: true,
    },
    {
      name: "blocked_storage",
      width: 390,
      height: 844,
      language: "en",
      high: false,
      touch: true,
      blocked: true,
    },
  ]) {
    const page = await browser.newPage({
      viewport: { width: fixture.width, height: fixture.height },
      deviceScaleFactor: 3,
      hasTouch: !!fixture.touch,
      isMobile: !!fixture.touch,
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    if (fixture.invalid)
      await page.addInitScript(() => {
        if (!sessionStorage.getItem("quality_fixture")) {
          localStorage.setItem("abyssal_quality", "obsolete");
          sessionStorage.setItem("quality_fixture", "1");
        }
      });
    if (fixture.blocked)
      await page.addInitScript(() => {
        Storage.prototype.getItem = Storage.prototype.setItem = () => {
          throw new Error("Injected unavailable storage");
        };
      });
    const ready = async () => {
      await page.waitForFunction(
        () =>
          document.querySelector("#region-loading").hidden &&
          document.querySelector("#ocean").width > 0,
      );
      await page
        .locator("[data-language-select]")
        .selectOption(fixture.language);
    };
    const expectQuality = async (high) => {
      const label =
        fixture.language === "en"
          ? high
            ? "Quality · High"
            : "Quality · Low"
          : high
            ? "画质 · 高"
            : "画质 · 流畅";
      await page.waitForFunction(
        ({ label, width }) =>
          document.querySelector("#quality").textContent === label &&
          document.querySelector("#ocean").width === width,
        { label, width: Math.floor(fixture.width * (high ? 1.5 : 0.8)) },
      );
    };
    await page.goto(url);
    await ready();
    await expectQuality(fixture.high);
    await page.screenshot({ path: `${out}/${fixture.name}_default.png` });
    await page.click("#start");
    await page.locator("#pause").waitFor({ state: "visible" });
    await page.screenshot({
      path: `${out}/${fixture.name}_default_playing.png`,
    });
    await page.click("#pause");
    await page.click("#return-menu");
    await page.click("#quality");
    await expectQuality(!fixture.high);
    await page.reload();
    await ready();
    await expectQuality(fixture.blocked ? fixture.high : !fixture.high);
    await page.click("#start");
    await page.locator("#pause").waitFor({ state: "visible" });
    await page.screenshot({ path: `${out}/${fixture.name}_playing.png` });
    await page.click("#pause");
    await page.locator("#resume").waitFor({ state: "visible" });
    await page.click("#quality");
    await expectQuality(fixture.blocked ? !fixture.high : fixture.high);
    await page.click("#resume");
    await page.click("#pause");
    await page.click("#return-menu");
    await page.locator("#start").waitFor({ state: "visible" });
    report.checks.push({
      name: fixture.name,
      defaultHigh: fixture.high,
      savedReload: !fixture.blocked,
      storageFallback: !!fixture.blocked,
      nativePauseResumeHome: true,
      debugHook: await page.evaluate(() => typeof window.__ABYSSAL__),
    });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
