import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

// 只安排玩家起点及朝向；真实随机天气、原生飞行、暂停和共享伤害路径不改写。
const out =
  process.env.ABYSSAL_REVIEW_OUT || ".local/penglai_weather_20261016/native";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.setDefaultTimeout(60000);
const report = {
  browser: browser.version(),
  cases: [],
  guide: [],
  lifecycle: [],
  errors: [],
  limits:
    "Controlled adult starts and observed random events in populated headed Chrome; no physical-phone or blind-expedition claim",
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
async function region(id) {
  if ((await page.$eval("#region-select", (n) => n.value)) !== id) {
    await page.click("#region-select");
    await page.click(`[data-choice-value="${id}"]`);
  }
  await page.waitForFunction(
    (id) =>
      !window.__ABYSSAL__.regionLoading &&
      document.querySelector("#region-select").value === id,
    id,
  );
}
async function state() {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__,
      pool = g.ocean.skyHazards;
    return {
      elapsed: g.elapsed,
      time: pool.pool.time,
      health: g.player.health,
      events: pool.events.map((e) => ({
        kind: e.kind,
        x: e.x,
        y: e.y,
        z: e.z,
        age: e.age,
        phase: e.phase,
        remaining: e.remaining,
        serial: e.serial,
        hitPulse: e.hitPulse,
      })),
      hits: window.weatherHits,
    };
  });
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await region("penglai");
  for (const language of ["en", "zh-CN"]) {
    await page.selectOption("[data-language-select]", language);
    await page.click("#open-guide");
    await page.selectOption("#guide-region", "penglai");
    for (const kind of [
      "celestial_thundercloud",
      "aetherwind_corridor",
      "submerged_resonance",
    ]) {
      await page.click(`.guide-entry[data-kind="${kind}"]`);
      const text = await page.locator(".guide-info").innerText();
      assert.match(text, /18/);
      if (language === "en")
        assert.equal(/[\u3400-\u9fff]/u.test(text), false, text);
      await page.screenshot({ path: `${out}/guide_${language}_${kind}.png` });
      report.guide.push({ language, kind, text });
    }
    await page.click(".guide-close");
  }
  for (const [kind, safe, character] of [
    ["thunder", false, "orca"],
    ["wind", false, "mechanical_shark"],
    ["thunder", true, "orca"],
    ["wind", true, "orca"],
  ]) {
    await selectCharacter(page, character);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.click("#pause");
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.setLength(30);
      g.setPosition(0, 330, -400);
      g.setFacing(0, 0);
      window.weatherHits = [];
      const pool = g.ocean.skyHazards,
        original = pool.onMovement.bind(pool);
      pool.onMovement = (...args) => {
        const es = original(...args);
        for (const e of es)
          window.weatherHits.push({
            kind: e.site.kind,
            warning: e.warning,
            damage: e.damage,
            phase: e.site.phase,
            time: pool.pool.time,
            health: g.player.health,
          });
        return es;
      };
      window.restoreWeather = () => (pool.onMovement = original);
    });
    await page.keyboard.press("KeyP");
    await page.keyboard.down("KeyK");
    await page.waitForFunction(
      (kind) =>
        window.__ABYSSAL__.ocean.skyHazards.events.find((e) => e.kind === kind)
          .phase === "forming",
      kind,
    );
    await page.keyboard.press("KeyP");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "paused");
    const start = await page.evaluate(
      ({ kind, safe }) => {
        const g = window.__ABYSSAL__,
          e = g.ocean.skyHazards.events.find((e) => e.kind === kind);
        g.setPosition(e.x, safe ? e.y + 100 : e.y, e.z);
        g.setFacing(e.yaw + Math.PI, 0);
        return {
          kind,
          safe,
          character: g.player.character,
          x: e.x,
          y: e.y,
          z: e.z,
          vx: e.vx,
          vz: e.vz,
          phase: e.phase,
          remaining: e.remaining,
          health: g.player.health,
        };
      },
      { kind, safe },
    );
    console.log("Weather starting fixture", JSON.stringify(start));
    const paused = await state();
    await page.waitForTimeout(300);
    assert.deepEqual(await state(), paused);
    await page.keyboard.press("KeyP");
    await page.keyboard.down("KeyK");
    if (safe)
      await page.waitForFunction(
        (kind) =>
          window.__ABYSSAL__.ocean.skyHazards.events.find(
            (e) => e.kind === kind,
          ).phase === "fading",
        kind,
      );
    else
      await page.waitForFunction(
        (kind) => window.weatherHits.some((e) => e.kind === kind && e.damage),
        kind,
      );
    await page.keyboard.press("KeyP");
    await page.keyboard.up("KeyK");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "paused");
    const result = await state(),
      hits = result.hits.filter((e) => e.kind === kind && e.damage);
    assert.equal(hits.length, safe ? 0 : 1);
    if (!safe) {
      assert.equal(hits[0].damage, 18);
      assert.ok(result.health < start.health - 8);
    }
    await page.screenshot({
      path: `${out}/${kind}_${safe ? "bypass" : "contact"}.png`,
    });
    report.cases.push({ ...start, result, pauseFrozen: true });
    await page.evaluate(() => window.restoreWeather());
    await page.click("#return-menu");
    const reset = await state();
    assert.ok(reset.events.every((e) => e.phase === "quiet"));
  }
  for (let i = 0; i < 3; i++) {
    await page.evaluate(
      () => (window.oldWeather = window.__ABYSSAL__.ocean.skyHazards),
    );
    await region("hawaii");
    assert.equal(
      await page.evaluate(
        () =>
          window.oldWeather.root.parent === null &&
          window.oldWeather.events.length === 0 &&
          !window.__ABYSSAL__.ocean.skyHazards,
      ),
      true,
    );
    await region("penglai");
    report.lifecycle.push(
      await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        return {
          slots: g.ocean.skyHazards.events.length,
          states: g.ocean.skyHazards.events.map((e) => e.phase),
          memory: { ...g.renderer.info.memory },
        };
      }),
    );
    assert.equal(report.lifecycle.at(-1).slots, 2);
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.error = e.stack;
  report.failureState = await state();
  process.exitCode = 1;
  console.error(e);
  await page.screenshot({ path: `${out}/failed.png` });
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      cases: report.cases.length,
      guides: report.guide.length,
      error: report.error,
    }),
  );
}
