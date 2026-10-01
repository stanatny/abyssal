import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { wreckWorldPoint } from "../src/bermuda_sites.js";

// 使用原生菜单、完整移动/碰撞/生态循环；仅通过开发接口布置测试起点。
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5220";
const out = process.env.ABYSSAL_BERMUDA_OUT || ".local/bermuda_runtime";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
const report = {
  base,
  errors: [],
  cycles: [],
  routes: [],
  discoveries: [],
  views: [],
  limits:
    "Controlled placements and heading, real subsequent simulation; viewport emulation is not physical-phone acceptance or a natural full-round playtest.",
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error" && !e.text().includes("injected review failure"))
    report.errors.push(e.text());
});
async function select(region) {
  await page.click("#region-select");
  await page.click(`[data-choice-value="${region}"]`);
  await page.waitForFunction(
    (id) =>
      !window.__ABYSSAL__.regionLoading &&
      window.__ABYSSAL__.expedition.region.id === id,
    region,
  );
}
async function start() {
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
}
async function menu() {
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
}
async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
}
async function snapshot() {
  return page.evaluate(async () => {
    const g = window.__ABYSSAL__,
      { isPositionBlocked } = await import("/src/collision.js"),
      { seabedHeight } = await import("/src/ocean.js");
    const heightAt = g.ocean.heightAt || seabedHeight;
    const violations = g.entities.filter(
      (e) =>
        e.hiddenFor <= 0 &&
        (e.mesh.position.y < heightAt(e.mesh.position.x, e.mesh.position.z) ||
          isPositionBlocked(e.mesh.position, {
            colliders: g.ocean.colliders,
            radius: Math.max(0.65, e.species.length * 0.16),
          })),
    );
    return {
      region: g.expedition.region.id,
      count: g.entities.length,
      kinds: [...new Set(g.entities.map((e) => e.species.kind))],
      violations: violations.map((e) => e.species.kind),
      humans: g.humans.entities.filter((e) => e.alive).length,
      memory: { ...g.renderer.info.memory },
      children: g.scene.children.length,
      audio: g.audio.regionId,
    };
  });
}
try {
  await page.goto(base);
  await page.waitForFunction(() => window.__ABYSSAL__);
  // 编译失败必须恢复已接受海域的地形、碰撞、生态和声音。
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    window.rollbackBaseline = {
      ocean: g.ocean,
      surface: g.surface,
      entities: [...g.entities],
    };
    const original = g.renderer.compileAsync;
    g.renderer.compileAsync = async () => {
      g.renderer.compileAsync = original;
      throw new Error("injected review failure");
    };
  });
  await page.click("#region-select");
  await page.click('[data-choice-value="bermuda"]');
  await page.locator("#region-loading button").click();
  await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
  report.rollback = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = window.rollbackBaseline;
    return {
      region: g.expedition.region.id,
      audio: g.audio.regionId,
      sameOcean: g.ocean === b.ocean,
      sameSurface: g.surface === b.surface,
      sameEntities: g.entities.every((e, i) => e === b.entities[i]),
    };
  });
  assert.equal(report.rollback.region, "hawaii");
  assert.equal(report.rollback.audio, "hawaii");
  assert.ok(
    report.rollback.sameOcean &&
      report.rollback.sameSurface &&
      report.rollback.sameEntities,
  );
  for (let i = 0; i < 6; i++) {
    for (const region of ["bermuda", "atlantis", "hawaii"]) {
      await select(region);
      await page.waitForTimeout(250);
      const row = await snapshot();
      report.cycles.push(row);
      assert.equal(row.audio, region);
      if (region === "bermuda") assert.deepEqual(row.violations, []);
      if (region === "bermuda") {
        assert.equal(row.count, 321);
        assert.equal(row.humans, 0);
      }
    }
  }
  const warm = report.cycles.filter((r) => r.region === "bermuda").slice(-3);
  assert.equal(new Set(warm.map((r) => r.memory.geometries)).size, 1);
  assert.equal(new Set(warm.map((r) => r.memory.textures)).size, 1);
  assert.equal(new Set(warm.map((r) => r.children)).size, 1);
  console.log("PASS rollback and six regional cycles");
  await select("bermuda");
  await shot("menu_en");
  await start();
  await page.keyboard.down("KeyK");
  // 生物仍保持真实大小，在普通追尾相机和声呐中逐一观察。
  for (const kind of [
    "queen_angelfish",
    "triggerfish",
    "needlefish",
    "barracuda",
    "tiger_shark",
    "cameroceras",
    "livyatan",
  ]) {
    const row = await page.evaluate((kind) => {
      const g = window.__ABYSSAL__,
        e = g.entities.find((e) => e.species.kind === kind && e.hiddenFor <= 0);
      const p = e.mesh.position;
      g.setLength(3);
      g.setPosition(p.x, p.y, p.z + Math.max(6, e.species.length * 2));
      g.setFacing(0);
      return {
        kind,
        length: e.species.length,
        model: e.mesh.userData.bermudaAnatomy,
        position: p.toArray(),
      };
    }, kind);
    assert.equal(row.model, kind);
    await page.waitForTimeout(250);
    await shot(`discovery_${kind}`);
    report.discoveries.push(row);
  }
  await menu();
  await start();
  await page.keyboard.up("KeyK");
  const approach = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find(
        (e) => e.species.kind === "queen_angelfish" && e.populationIndex === 0,
      );
    window.foodTarget = e;
    g.setLength(3);
    g.setPosition(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z + 4);
    g.setFacing(0);
    g.player.hunger = 50;
    return { eaten: g.player.eaten, simulation: g.elapsed };
  });
  await page.waitForFunction(() => window.foodTarget.hiddenFor > 0, null, {
    timeout: 12000,
  });
  report.feeding = await page.evaluate(() => ({
    hiddenFor: window.foodTarget.hiddenFor,
    eaten: window.__ABYSSAL__.player.eaten,
    simulation: window.__ABYSSAL__.elapsed,
  }));
  assert.ok(report.feeding.eaten > approach.eaten);
  assert.ok(report.feeding.hiddenFor > 27);
  await page.keyboard.down("KeyK");
  await page.evaluate(() => {
    window.__ABYSSAL__.setPosition(0, -18, 75);
    window.__ABYSSAL__.setFacing(0);
  });
  await page.waitForFunction(() => window.foodTarget.hiddenFor <= 0, null, {
    timeout: 120000,
  });
  report.respawn = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = window.foodTarget,
      a = e.species.spawnAnchors[0];
    return {
      simulation: g.elapsed,
      position: e.mesh.position.toArray(),
      drift: Math.hypot(
        e.mesh.position.x - a[0],
        e.mesh.position.y - a[1],
        e.mesh.position.z - a[2],
      ),
    };
  });
  assert.ok(report.respawn.simulation - report.feeding.simulation >= 27.9);
  assert.ok(report.respawn.drift < 2);
  // 两角色以真实速度、身体碰撞和真实朝向推进，沿沉船的两条长通道双向通行。
  for (const character of ["orca", "squid"]) {
    await menu();
    await page.click("#character-select");
    await page.click(`[data-choice-value="${character}"]`);
    await start();
    for (const [name, points] of [
      [
        "stern",
        [
          wreckWorldPoint([-65, -451, -511]),
          wreckWorldPoint([-65, -451, -635]),
        ],
      ],
      [
        "hold",
        [
          wreckWorldPoint([-65, -468, -635]),
          wreckWorldPoint([-65, -468, -776]),
        ],
      ],
    ]) {
      for (const reverse of [false, true]) {
        const route = reverse ? [...points].reverse() : points;
        await page.keyboard.up("KeyK");
        await page.keyboard.down("Space");
        const row = await page.evaluate(
          async ({ route, name, character, reverse }) => {
            const g = window.__ABYSSAL__;
            g.setLength(30);
            g.player.health = 100;
            g.player.hunger = 100;
            g.player.stamina = 100;
            g.setPosition(...route[0]);
            g.setFacing(reverse ? Math.PI : 0);
            const start = performance.now(),
              target = route[1],
              initial = g.position.clone();
            let samples = 0,
              maxDeviation = 0,
              contacts = 0;
            while (performance.now() - start < 22000) {
              await new Promise(requestAnimationFrame);
              samples++;
              const dx = target[0] - g.position.x,
                dy = target[1] - g.position.y,
                dz = target[2] - g.position.z;
              maxDeviation = Math.max(
                maxDeviation,
                Math.abs(g.position.x - initial.x),
                Math.abs(g.position.y - initial.y),
              );
              if (g.lastCollision?.blocked) contacts++;
              if (Math.hypot(dx, dy, dz) < 4) break;
              g.setFacing(
                Math.atan2(-dx, -dz),
                Math.atan2(dy, Math.hypot(dx, dz)),
              );
            }
            return {
              character,
              name,
              reverse,
              samples,
              ms: performance.now() - start,
              position: g.position.toArray(),
              distance: g.position.distanceTo({
                x: target[0],
                y: target[1],
                z: target[2],
              }),
              maxDeviation,
              contacts,
              health: g.player.health,
            };
          },
          { route, name, character, reverse },
        );
        report.routes.push(row);
        assert.ok(row.distance < 4, JSON.stringify(row));
        assert.ok(row.maxDeviation < 3, JSON.stringify(row));
      }
      await shot(`${character}_${name}`);
    }
    await page.keyboard.up("Space");
    await page.keyboard.down("KeyK");
  }
  await menu();
  await start();
  await page.keyboard.down("KeyK");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setLength(6);
    const spout = g.ocean.weather.spouts[1];
    g.setPosition(spout.x, -2, spout.z);
    g.setFacing(0);
    g.player.health = 100;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.surface.airborne, null, {
    timeout: 5000,
  });
  report.spout = await page.evaluate(() => ({
    health: window.__ABYSSAL__.player.health,
    position: window.__ABYSSAL__.position.toArray(),
  }));
  assert.equal(report.spout.health, 84);
  await shot("waterspout_lift");
  await page.keyboard.press("Escape");
  const frozen = await page.evaluate(() =>
    window.__ABYSSAL__.position.toArray(),
  );
  await page.waitForTimeout(500);
  assert.deepEqual(
    await page.evaluate(() => window.__ABYSSAL__.position.toArray()),
    frozen,
  );
  await page.click("#resume");
  await page.waitForFunction(() => !window.__ABYSSAL__.surface.airborne, null, {
    timeout: 10000,
  });
  report.landing = await page.evaluate(() => ({
    health: window.__ABYSSAL__.player.health,
    y: window.__ABYSSAL__.position.y,
  }));
  assert.ok(report.landing.y <= 4);
  await menu();
  await start();
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.ocean.weather.lifted),
    false,
  );
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      p = g.surface.ghost.root.position;
    g.setLength(6);
    g.setPosition(p.x + 42, -8, p.z);
    g.setFacing(0);
    g.player.health = 100;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.surface.danger);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.audio.pursuing),
    true,
  );
  await shot("ghost_warning");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(g.position.x, -80, g.position.z);
  });
  await page.waitForTimeout(2500);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.player.health),
    100,
  );
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.surface.danger),
    false,
  );
  for (const [width, height] of [
    [1440, 900],
    [390, 667],
    [320, 568],
  ]) {
    await menu();
    await page.setViewportSize({ width, height });
    for (const language of ["en", "zh-CN"]) {
      await page
        .locator("[data-language-select]")
        .first()
        .selectOption(language);
      await shot(`menu_${language}_${width}`);
      await page.click("#open-guide");
      await page.click('[data-catalog-id="bermuda_ghost"]');
      await shot(`guide_${language}_${width}`);
      const row = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        guideOverflow:
          document.querySelector("#ocean-guide").scrollWidth > innerWidth + 1,
      }));
      report.views.push({ width, height, language, ...row });
      assert.equal(row.overflow, false);
      assert.equal(row.guideOverflow, false);
      await page.click(".guide-close");
    }
    await start();
    await shot(`hud_${width}`);
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.failure = e.stack;
  await shot("failure").catch(() => {});
  throw e;
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
