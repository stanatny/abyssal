import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = ".local/ecosystem_review";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "zh-CN",
});
page.setDefaultTimeout(30000);
const errors = [],
  report = { maps: [], checks: [], guide: [] };
page.on("pageerror", (e) => errors.push(e.message));
async function region(id) {
  await page.click("#region-select");
  await page.locator(`#expedition-picker [data-choice-value="${id}"]`).click();
  await page.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    id,
    { timeout: 60000 },
  );
}
async function clear() {
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.entities.forEach((e) => {
      if (e.species.category !== "rare") e.hiddenFor = 999;
    });
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    g.setPosition(180, -90, -296);
    g.setFacing(0);
    const e = g.entities.find((e) => e.species.category === "rare");
    e.mesh.position.set(180, -90, -320);
    e.species = {
      ...e.species,
      spawnAnchors: [[180, -90, -320]],
      depthMin: 60,
      depthMax: 120,
    };
    e.velocity.set(0, 0, -1);
    e.elusiveState = {};
    e.hiddenFor = 0;
  });
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5274/");
  await page.waitForFunction(() => window.__ABYSSAL__);
  for (const id of [
    "hawaii",
    "atlantis",
    "bermuda",
    "mariana",
    "amazon",
    "europa",
    "penglai",
  ]) {
    await region(id);
    const sample = await page.evaluate(async () => {
      const g = window.__ABYSSAL__,
        { getRegionalRare, chooseRareHabitat } = await import(
          "/src/regional_rare.js"
        ),
        { habitatPosition } = await import("/src/ecosystem_population.js"),
        { seabedHeight } = await import("/src/ocean.js");
      const spec = getRegionalRare(g.expedition.region.id),
        actual = g.entities.filter((e) => e.species.category === "rare");
      return {
        id: spec.regionId,
        count: actual.length,
        kind: actual[0]?.species.kind,
        stock: g.entities.length,
        marker: !!actual[0]?.mesh.getObjectByName("regional_rare_marker"),
        homes: [0, 0.4, 0.8].map((n) => {
          const s = chooseRareHabitat(spec, () => n),
            p = habitatPosition(s, {
              heightAt: g.ocean.heightAt || seabedHeight,
              colliders: g.ocean.colliders,
            });
          return { home: s.spawnAnchors[0], point: p?.toArray() };
        }),
      };
    });
    assert.equal(sample.count, 1);
    assert.ok(sample.marker);
    assert.ok(
      sample.homes.every((h) => h.point),
      JSON.stringify(sample),
    );
    report.maps.push(sample);
  }
  await region("hawaii");
  await clear();
  const initial = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.category === "rare");
    return e.mesh.position.distanceTo(g.position);
  });
  await page.waitForTimeout(3500);
  const cruise = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.category === "rare");
    return {
      distance: e.mesh.position.distanceTo(g.position),
      cap: g.player.vitalCap,
    };
  });
  assert.ok(cruise.distance > initial + 15);
  assert.equal(cruise.cap, 100);
  report.cruise = { initial, ...cruise };
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.category === "rare");
    g.setPosition(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z + 18);
  });
  await page.keyboard.down("Space");
  for (let i = 0; i < 100; i++) {
    const caught = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      if (g.player.rareRewardClaimed) return true;
      const e = g.entities.find((e) => e.species.category === "rare"),
        d = e.mesh.position.clone().sub(g.position);
      g.setFacing(
        Math.atan2(-d.x, -d.z),
        Math.atan2(d.y, Math.hypot(d.x, d.z)),
      );
      return false;
    });
    if (caught) break;
    await page.waitForTimeout(100);
  }
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  const award = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.category === "rare");
    return {
      cap: g.player.vitalCap,
      claim: g.player.rareRewardClaimed,
      health: g.player.health,
      hunger: g.player.hunger,
      stamina: g.player.stamina,
      retired: e.hiddenFor === Infinity,
      mode: g.mode,
    };
  });
  assert.equal(award.cap, 150);
  assert.ok(award.claim && award.retired);
  assert.equal(award.mode, "paused");
  assert.ok(award.health > 149 && award.stamina > 140 && award.hunger > 149);
  report.award = award;
  const paused = await page.evaluate(() => window.__ABYSSAL__.player.elapsed);
  await page.waitForTimeout(400);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.player.elapsed),
    paused,
  );
  // 捕获后恢复游戏，检查数值/血条在最窄布局不会挤出；实际暂停已另验。
  await page.keyboard.press("Escape");
  for (const [width, height] of [
    [320, 667],
    [390, 844],
    [844, 390],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(120);
    const hud = await page.evaluate(() =>
      [...document.querySelectorAll(".vital-head")].map((e) => {
        const value = e.querySelector("b"),
          a = e.getBoundingClientRect(),
          b = value.getBoundingClientRect();
        return {
          text: value.textContent,
          fits: b.left >= a.left - 1 && b.right <= a.right + 1,
        };
      }),
    );
    assert.ok(
      hud.every((e) => e.text.includes("/150") && e.fits),
      JSON.stringify({ width, hud }),
    );
    await page.screenshot({ path: `${out}/hud_${width}.png` });
  }
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.click("#open-guide");
  await page.selectOption("#guide-region", "all");
  await page.locator('[data-category="all"]').click();
  const kinds = await page.evaluate(async () => {
    const { BACKGROUND_KINDS } = await import("/src/creature_backgrounds.js");
    return BACKGROUND_KINDS;
  });
  for (const language of ["zh-CN", "en"]) {
    if (language === "en") {
      await page.locator(".guide-close").click();
      await page.locator("header [data-language-select]").selectOption("en");
      await page.click("#open-guide");
      await page.selectOption("#guide-region", "all");
      await page.locator('[data-category="all"]').click();
    }
    for (const kind of kinds) {
      const button = page.locator(`.guide-entry[data-kind="${kind}"]`).first();
      assert.ok(await button.count(), kind);
      await button.click();
      const text = await page.locator(".guide-background").innerText();
      assert.ok(text.length > 35, kind);
      if (language === "en")
        assert.ok(!/[\u3400-\u9fff]/.test(text), `${kind}:${text}`);
      report.guide.push({ language, kind });
    }
  }
  await page.locator('[data-category="rare"]').click();
  assert.equal(await page.locator(".guide-entry").count(), 7);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${out}/guide_rare_mobile.png` });
  await page.locator(".guide-close").click();
  await page.evaluate(() => window.__ABYSSAL__.startGame());
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.player.vitalCap),
    100,
  );
  report.checks.push(
    "one map-exclusive resident; all three randomized habitats legal",
    "ordinary cruise cannot catch; actual sprint and contact award 150",
    "pause freezes timers; 150 HUD fits four viewports",
    "132 creature introductions render in both languages",
    "new expedition resets cap100",
  );
  assert.deepEqual(errors, []);
  report.errors = errors;
  console.log({ checks: report.checks, guide: report.guide.length });
} finally {
  await writeFile(
    `${out}/browser.json`,
    JSON.stringify({ ...report, errors }, null, 2),
  );
  await browser.close();
}
