import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const out =
  process.env.ABYSSAL_GROUND_OUT || ".local/ground_navigation_review/native";
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5274/";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const report = { url, cases: [], errors: [] };
try {
  for (const [width, height, language, touch] of [
    [1440, 900, "en", false],
    [390, 677, "zh-CN", true],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale: language === "en" ? "en-US" : "zh-CN",
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    const seed = touch ? 96811 : 71523;
    await page.addInitScript((seed) => {
      let s = seed;
      Math.random = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
    }, seed);
    await page.goto(url);
    await page.locator("#start").waitFor({ state: "visible" });
    await page.selectOption("[data-language-select]", language);
    await page.click("#region-select");
    await page.click('[data-choice-value="penglai"]');
    await page.locator("#region-loading").waitFor({ state: "hidden" });
    await page.click("#start");
    await page.locator("#hud").waitFor({ state: "visible" });
    await page.waitForFunction(
      () => !document.body.classList.contains("launching"),
    );
    const record = { width, height, language, seed, samples: [] };
    record.fixture = await page.evaluate(async () => {
      const g = window.__ABYSSAL__,
        { penglaiHeightAt: configuredHeight } = await import(
          "/src/penglai_config.js"
        );
      const h = g.ocean.groundHeightAt || configuredHeight;
      const beasts = g.entities.filter((e) => e.species.groundbound);
      const e = beasts
        .filter((e) => e.species.kind === "zheng")
        .sort((a, b) => slope(b) - slope(a))[0];
      function slope(e) {
        let p = e.mesh.position;
        return (
          Math.hypot(
            h(p.x + 3, p.z) - h(p.x - 3, p.z),
            h(p.x, p.z + 3) - h(p.x, p.z - 3),
          ) / 6
        );
      }
      const p = e.mesh.position,
        dx = h(p.x + 3, p.z) - h(p.x - 3, p.z),
        dz = h(p.x, p.z + 3) - h(p.x, p.z - 3),
        n = Math.hypot(dx, dz) || 1;
      const x = p.x + (dz / n) * 26,
        z = p.z - (dx / n) * 26;
      g.setPosition(x, h(x, z) + 21, z);
      g.setFacing(Math.atan2(x - p.x, z - p.z), 0);
      g.player.invulnerable = 90;
      g.player.hunger = 100;
      window._groundTest = {
        entity: e,
        anchor: g.position.clone(),
        heightAt: h,
        beasts,
      };
      // 缓存真实网格的采样点，只用于观察，不替换导航、动画或地形。
      for (const beast of beasts) {
        const parts = [];
        beast.mesh.traverse((part) => {
          for (let a = part; a && a !== beast.mesh; a = a.parent)
            if (
              a.userData.terrainFlexible ||
              /weight_bearing_limb|kui_support_joint|independent_tail_root/.test(
                a.name,
              )
            )
              return;
          if (part.geometry?.attributes.position) parts.push(part);
        });
        beast._groundTestParts = parts;
      }
      return {
        kind: e.species.kind,
        index: e.populationIndex,
        length: e.species.length,
        position: p.toArray(),
        player: g.position.toArray(),
        count: beasts.length,
      };
    });
    report.cases.push(record);
    assert.equal(record.fixture.count, 38);
    for (let i = 0; i < 200; i++) {
      await page.waitForTimeout(100);
      const sample = await page.evaluate(
        (full) => {
          const g = window.__ABYSSAL__,
            f = window._groundTest,
            e = f.entity;
          g.position.copy(f.anchor);
          g.player.invulnerable = 90;
          g.player.hunger = 100;
          let worst = Infinity,
            points = 0;
          if (full)
            for (const beast of f.beasts) {
              if (beast.hiddenFor > 0) continue;
              beast.mesh.updateMatrixWorld(true);
              const v = beast.mesh.position.clone();
              for (const part of beast._groundTestParts) {
                const vertices = part.geometry.attributes.position;
                for (
                  let k = 0;
                  k < vertices.count;
                  k += Math.max(1, Math.floor(vertices.count / 180))
                ) {
                  v.fromBufferAttribute(vertices, k).applyMatrix4(
                    part.matrixWorld,
                  );
                  worst = Math.min(worst, v.y - f.heightAt(v.x, v.z));
                  points++;
                }
              }
            }
          return {
            t: g.elapsed,
            position: e.mesh.position.toArray(),
            state: JSON.parse(JSON.stringify(e.groundState)),
            heading: e.velocity.toArray(),
            phase: e.groundState.phase,
            chase: e.chase,
            points,
            worst: points ? worst : null,
            up: e.mesh.quaternion.x ** 2 + e.mesh.quaternion.z ** 2,
            all: f.beasts.map((b) => ({
              kind: b.species.kind,
              index: b.populationIndex,
              position: b.mesh.position.toArray(),
              hidden: b.hiddenFor,
              phase: b.groundState?.phase,
              staticBlocked: b.groundBlocked(b.mesh.position, b.velocity),
            })),
          };
        },
        i % 5 === 0,
      );
      record.samples.push(sample);
      if (i === 25)
        await page.screenshot({ path: `${out}/${width}_chase.png` });
    }
    const depths = record.samples.filter((s) => s.points > 0);
    assert.ok(
      depths.every((s) => s.worst >= -0.45),
      `buried body ${Math.min(...depths.map((s) => s.worst))}`,
    );
    assert.ok(record.samples.every((s) => s.up < 1e-8));
    assert.ok(
      record.samples.every((s) => s.all.every((e) => !e.staticBlocked)),
      "ground resident overlaps a solid",
    );
    let travel = 0,
      longest = 0,
      still = 0;
    for (let i = 1; i < record.samples.length; i++) {
      const a = record.samples[i - 1],
        b = record.samples[i];
      const d = Math.hypot(
        a.position[0] - b.position[0],
        a.position[2] - b.position[2],
      );
      travel += d;
      still = d < 0.015 && b.phase === "walk" ? still + 1 : 0;
      longest = Math.max(longest, still);
    }
    record.residentMotion = record.samples[0].all.map((beast, index) => {
      let travel = 0,
        still = 0,
        longest = 0;
      for (let i = 1; i < record.samples.length; i++) {
        const a = record.samples[i - 1].all[index],
          b = record.samples[i].all[index];
        const d = Math.hypot(
          a.position[0] - b.position[0],
          a.position[2] - b.position[2],
        );
        travel += d;
        still =
          d < 0.001 && b.phase === "walk" && b.hidden <= 0 ? still + 1 : 0;
        longest = Math.max(longest, still);
      }
      return {
        kind: beast.kind,
        index: beast.index,
        travel,
        longestStoppedSeconds: longest * 0.1,
      };
    });
    assert.ok(
      record.residentMotion.every((e) => e.longestStoppedSeconds < 3),
      `resident stuck ${JSON.stringify(record.residentMotion.filter((e) => e.longestStoppedSeconds >= 3))}`,
    );
    record.travel = travel;
    record.longestStoppedSeconds = longest * 0.1;
    assert.ok(travel > 20, `chase stopped ${travel}`);
    assert.ok(longest < 25, `stuck ${longest}`);
    assert.ok(record.samples.some((s) => s.chase > 0));
    // 实际暂停和复活入口必须保留同一份完整身体朝向约束。
    await page.click("#pause");
    const positions = () =>
      page.evaluate(() =>
        window._groundTest.beasts.map((e) => e.mesh.position.toArray()),
      );
    const frozen = await positions();
    await page.waitForTimeout(400);
    assert.deepEqual(await positions(), frozen);
    await page.click("#resume");
    await page.evaluate(() => {
      window._groundTest.entity.hiddenFor = 0.1;
    });
    await page.waitForTimeout(500);
    record.respawn = await page.evaluate(async () => {
      const g = window.__ABYSSAL__,
        e = window._groundTest.entity,
        { groundTerrainPose } = await import("/src/ground_navigation.js");
      return {
        visible: e.hiddenFor <= 0,
        count: g.entities.filter((e) => e.species.groundbound).length,
        staticClear: !e.groundBlocked(e.mesh.position, e.velocity),
        walkable: groundTerrainPose(
          e.mesh.position,
          e.velocity,
          e.species,
          window._groundTest.heightAt,
        ).walkable,
      };
    });
    assert.equal(record.respawn.visible, true);
    assert.equal(record.respawn.count, 38);
    assert.equal(record.respawn.walkable, true);
    assert.equal(record.respawn.staticClear, true);
    await page.screenshot({ path: `${out}/${width}_respawn.png` });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  console.log(
    JSON.stringify(
      report.cases.map((c) => ({
        width: c.width,
        travel: c.travel,
        stopped: c.longestStoppedSeconds,
        worst: Math.min(
          ...c.samples.filter((s) => s.points).map((s) => s.worst),
        ),
        respawn: c.respawn,
      })),
    ),
  );
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
