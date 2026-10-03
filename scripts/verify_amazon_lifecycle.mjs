import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/amazon_review",
  base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5260";
await mkdir(out, { recursive: true });
// 切图和电击走真实循环；受控站位隔离追击条件，不代表自然整局体验。
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  p = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    reducedMotion: "reduce",
  });
p.setDefaultTimeout(60000);
const report = { errors: [], resources: [], checks: [] };
p.on("pageerror", (e) => report.errors.push(e.message));
try {
  await p.goto(base);
  await p.waitForFunction(() => window.__ABYSSAL__);
  async function select(id) {
    await p.evaluate(() => window.__ABYSSAL__.returnToMenu());
    await p.click("#region-select");
    await p.click(`[data-choice-value="${id}"]`);
    await p.waitForFunction(
      (id) =>
        window.__ABYSSAL__.expedition.region.id === id &&
        !window.__ABYSSAL__.regionLoading,
      id,
    );
    await p.waitForTimeout(250);
  }
  for (let round = 0; round < 4; round++)
    for (const id of [
      "hawaii",
      "atlantis",
      "bermuda",
      "mariana",
      "europa",
      "amazon",
    ]) {
      await select(id);
      report.resources.push(
        await p.evaluate(() => {
          const g = window.__ABYSSAL__;
          return {
            id: g.expedition.region.id,
            geometries: g.renderer.info.memory.geometries,
            textures: g.renderer.info.memory.textures,
            programs: g.renderer.info.programs.length,
          };
        }),
      );
    }
  for (const id of [
    "hawaii",
    "atlantis",
    "bermuda",
    "mariana",
    "europa",
    "amazon",
  ]) {
    const rows = report.resources.filter((r) => r.id === id);
    assert.deepEqual(rows[3], rows[2]);
  }
  report.checks.push(
    "24 real switches: GPU resource/program counts plateau after warmup",
  );
  await p.click("#start");
  await p.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await p.evaluate(() => {
    const g = window.__ABYSSAL__;
    const e = g.entities.find((e) => e.species.kind === "electric_eel");
    window.__eel = e;
    g.player.invulnerable = 0;
    g.player.health = 100;
    g.entities.forEach((other) => {
      if (other !== e) other.hiddenFor = 999;
    });
    window.__eelTrace = [];
    window.__followEel = true;
    const loop = () => {
      if (!window.__followEel) return;
      const pos = e.mesh.position;
      g.setPosition(pos.x + 8, pos.y, pos.z + 2);
      g.player.hunger = 100;
      window.__eelTrace.push({
        chase: e.chase,
        phase: e.hunter.phase,
        trigger: e.hunter.triggerCount,
        pursuing: g.audio.pursuing,
        combat: g.audio.amazonMusic?.combatActive,
        health: g.player.health,
      });
      requestAnimationFrame(loop);
    };
    loop();
  });
  await p.waitForFunction(() => window.__eel.hunter.triggerCount > 0);
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${out}/eel_discharge.png` });
  const eel = await p.evaluate(() => {
    window.__followEel = false;
    return {
      trace: window.__eelTrace,
      particles: window.__ABYSSAL__.effects.group.children.filter(
        (n) => n.name === "river_electric_discharge" && n.visible,
      ).length,
    };
  });
  assert.ok(eel.trace.some((t) => t.pursuing && t.combat));
  assert.ok(eel.trace.some((t) => t.phase === "windup"));
  assert.ok(eel.trace.at(-1).health < 100);
  report.eel = eel;
  report.checks.push(
    "Real eel pursuit starts its combat score, warns, discharges and damages once",
  );
  await p.keyboard.press("Escape");
  const frozen = await p.evaluate(() => ({
    elapsed: window.__ABYSSAL__.player.elapsed,
    resources: window.__ABYSSAL__.renderer.info.memory.geometries,
  }));
  await p.waitForTimeout(500);
  assert.equal(
    await p.evaluate(() => window.__ABYSSAL__.player.elapsed),
    frozen.elapsed,
  );
  assert.equal(
    await p.evaluate(() => window.__ABYSSAL__.audio.context.state),
    "suspended",
  );
  report.checks.push("Pause freezes active time and native audio context");
  await p.click("#return-menu");
  assert.equal(await p.evaluate(() => window.__ABYSSAL__.audio.voices.size), 0);
  assert.equal(
    await p.evaluate(
      () =>
        window.__ABYSSAL__.effects.group.children.filter(
          (n) => n.name === "river_electric_discharge" && n.visible,
        ).length,
    ),
    0,
  );
  await writeFile(
    `${out}/lifecycle_report.json`,
    JSON.stringify(report, null, 2),
  );
  for (const [width, height, language] of [
    [1440, 900, "en"],
    [390, 844, "zh-CN"],
    [844, 390, "en"],
  ]) {
    await p.setViewportSize({ width, height });
    await p.selectOption("[data-language-select]", language);
    await p.click("#start");
    await p.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await p.waitForTimeout(500);
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await p.screenshot({ path: `${out}/ui_${width}_${height}.png` });
    await p.keyboard.press("Escape");
    await p.click("#return-menu");
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(
    `${out}/lifecycle_report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(report.checks);
}
