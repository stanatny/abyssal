import { selectCharacter } from "./menu_picker_helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 原生开局先实测；随后隔离场景验证主循环消耗、鱼群迁移、重生与岩石边界。
await mkdir(".local", { recursive: true });
const report = { checks: [], measurements: [], errors: [] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [width, language, character] of [
    [1440, "en", "orca"],
    [390, "zh-CN", "squid"],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 1440 ? 900 : 667 },
      locale: language,
      isMobile: width < 700,
      hasTouch: width < 700,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await page.waitForFunction(() => !!window.__ABYSSAL__?.entities);
    await page.click("#quality");
    await page.locator(".expedition-settings summary").click();
    const tip = await page.locator(".survival-tip").innerText();
    assert.match(
      tip,
      language === "en" ? /Deeper water drains hunger/ : /越深越耗饱食/,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.locator(".expedition-settings summary").click();
    await page.click("#open-guide");
    await page.locator(`[data-catalog-id="player_${character}"]`).click();
    for (const locale of [language, language === "en" ? "zh-CN" : "en"]) {
      if ((await page.locator("html").getAttribute("lang")) !== locale) {
        await page.click(".guide-close");
        await page
          .locator("header [data-language-select]")
          .selectOption(locale);
        await page.click("#open-guide");
        await page.locator(`[data-catalog-id="player_${character}"]`).click();
      }
      const survival = await page.locator(".guide-survival").innerText();
      assert.match(survival, /180/);
      assert.match(survival, /2000/);
      assert.match(survival, /30%/);
      assert.equal(/[\u3400-\u9fff]/u.test(survival), locale === "zh-CN");
      assert.equal(
        await page.evaluate(
          () =>
            document.querySelector("#ocean-guide").scrollWidth >
            document.querySelector("#ocean-guide").clientWidth + 1,
        ),
        false,
      );
    }
    await page.screenshot({ path: `.local/survival_guide_${width}.png` });
    await page.click(".guide-close");
    await selectCharacter(page, character);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    const population = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        count: g.entities.length,
        rewards: g.pickups.length,
        ids: g.entities.map((e) => e.mesh.uuid),
      };
    });
    assert.equal(population.count, 285);
    assert.equal(population.rewards, 21);
    const native = await page.evaluate(
      () =>
        new Promise((resolve) => {
          const g = window.__ABYSSAL__,
            start = g.elapsed;
          const initialEaten = g.player.eaten;
          let minHealth = g.player.health;
          function sample() {
            minHealth = Math.min(minHealth, g.player.health);
            if (g.elapsed - start >= 7)
              resolve({
                seconds: g.elapsed - start,
                eaten: g.player.eaten - initialEaten,
                length: g.player.length,
                minHealth,
              });
            else requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }),
    );
    assert.ok(
      native.eaten >= 2,
      `${character}: native start needs accessible food`,
    );
    assert.equal(native.minHealth, 100);
    report.measurements.push({ character, native });
    await page.screenshot({ path: `.local/survival_native_${width}.png` });
    report.checks.push(
      `${width}px ${character}: bilingual guide/settings, 285 creatures, 21 rewards, native juvenile feeding and safety`,
    );

    for (const depth of [30, 550, 30]) {
      const sample = await page.evaluate(async (depth) => {
        const { hungerDrainRate } = await import("/src/simulation.js");
        const g = window.__ABYSSAL__;
        g.setLength(25);
        for (const e of g.entities) e.hiddenFor = 999;
        for (const b of g.encounters.bosses) b.enabled = false;
        for (const item of g.pickups) item.cooldown = 999;
        for (const h of g.humans.hazards) h.active = false;
        const point = [180, -depth, depth > 100 ? -1080 : -300];
        g.setPosition(...point);
        g.setFacing(0, 0);
        g.player.hunger = 80;
        g.player.health = 100;
        g.player.stamina = 100;
        const start = g.elapsed,
          hunger = g.player.hunger;
        return new Promise((resolve) => {
          function sample() {
            if (g.elapsed - start >= 2)
              resolve({
                depth,
                seconds: g.elapsed - start,
                loss: hunger - g.player.hunger,
                expected: hungerDrainRate(25, depth),
                health: g.player.health,
                stamina: g.player.stamina,
              });
            else {
              g.setPosition(...point);
              requestAnimationFrame(sample);
            }
          }
          requestAnimationFrame(sample);
        });
      }, depth);
      assert.ok(
        Math.abs(sample.loss / sample.seconds - sample.expected) < 0.002,
        JSON.stringify(sample),
      );
      assert.equal(sample.health, 100);
      assert.equal(sample.stamina, 100);
      report.measurements.push({ character, actualDrain: sample });
    }
    report.checks.push(
      `${character}: actual main loop increases deep hunger drain and reduces it again on ascent`,
    );
    await page.click("#pause");
    const paused = await page.evaluate(() => ({
      ...window.__ABYSSAL__.player,
    }));
    await page.waitForTimeout(250);
    assert.deepEqual(
      await page.evaluate(() => ({ ...window.__ABYSSAL__.player })),
      paused,
    );
    await page.click("#return-menu");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.deepEqual(
      await page.evaluate(() =>
        window.__ABYSSAL__.entities.map((e) => e.mesh.uuid),
      ),
      population.ids,
    );
    report.checks.push(
      `${character}: pause freezes vitals; restart reuses population`,
    );

    if (width === 1440) {
      const layers = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const g = window.__ABYSSAL__;
            const schools = [
              ...new Set(
                g.entities
                  .map((e) => e.school)
                  .filter((s) => s && s.habitat !== s.species),
              ),
            ];
            const original = schools.map((s) => ({
              kind: s.kind,
              min: s.habitat.depthMin,
              max: s.habitat.depthMax,
              center: s.center.toArray(),
            }));
            const deep = schools.find(
              (s) => s.kind === "ray" && s.habitat.depthMin >= 95,
            );
            const respawn = deep.members[0];
            respawn.hiddenFor = 0.05;
            // 向浅水迁移请求不得拖回深层鱼群；轮换深度触发同层迁移和实际导航。
            let frames = 0,
              minClearance = Infinity;
            const failures = [];
            const obstacle = g.ocean.obstacles.find(
              (r) => Math.abs(r.x + 212.338) < 0.02,
            );
            const boundary = schools.find((s) => s.kind === "sunfish")
              .members[0];
            if (!obstacle) throw new Error("Rock fixture missing");
            const radius = obstacle.radius + boundary.species.length * 0.12;
            const dy = -boundary.school.habitat.depthMin - obstacle.y;
            boundary.mesh.position.set(
              obstacle.x + Math.sqrt(radius ** 2 - dy ** 2) + 0.0001,
              -boundary.school.habitat.depthMin,
              obstacle.z,
            );
            function sample() {
              frames++;
              g.setPosition(180, frames < 90 ? -18 : -110, -520);
              g.player.invulnerable = 10;
              for (const school of schools) {
                school.nextMigration = 0;
                for (const e of school.members) {
                  const depth = -e.mesh.position.y;
                  if (
                    depth < school.habitat.depthMin - 1e-7 ||
                    depth > school.habitat.depthMax + 1e-7
                  )
                    failures.push({ kind: school.kind, depth });
                }
              }
              const p = boundary.mesh.position;
              const clearance =
                Math.hypot(
                  p.x - obstacle.x,
                  p.y - obstacle.y,
                  p.z - obstacle.z,
                ) - radius;
              minClearance = Math.min(minClearance, clearance);
              if (frames < 180) requestAnimationFrame(sample);
              else
                resolve({
                  original,
                  failures,
                  minClearance,
                  respawned: respawn.hiddenFor <= 0,
                  deepCenter: deep.center.toArray(),
                  deepDepth: -respawn.mesh.position.y,
                });
            }
            requestAnimationFrame(sample);
          }),
      );
      assert.deepEqual(layers.failures, []);
      assert.ok(layers.minClearance > -1e-7, JSON.stringify(layers));
      assert.equal(layers.respawned, true);
      assert.ok(layers.deepDepth >= 98 && layers.deepDepth <= 120);
      report.measurements.push({ layers });
      report.checks.push(
        "16 layered schools retain legal depth through migration/evasion/respawn; rock boundary does not re-penetrate",
      );
    }
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    ".local/survival_browser_report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
