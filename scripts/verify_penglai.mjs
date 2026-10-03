import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
// 位置、体长与耐久是受控夹具；飞行、捕食、刷新、技能及结算均由真实游戏循环推进。
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/penglai_review",
  base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5270";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
page.setDefaultTimeout(45000);
const report = {
  checks: [],
  errors: [],
  stock: [],
  at: new Date().toISOString(),
  method:
    "Controlled native real-loop checks; viewport simulation, not physical phone or natural full expedition",
};
page.on("pageerror", (e) => report.errors.push(e.stack));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
async function select(region) {
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  await page.click("#region-select");
  await page.click(`[data-choice-value="${region}"]`);
  await page.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    region,
  );
}
async function start(character = "orca", length = 3) {
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  await page.click("#character-select");
  await page.click(`[data-choice-value="${character}"]`);
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  assert.equal(await page.evaluate(() => window.__ABYSSAL__.player.length), 15);
  await page.evaluate((length) => {
    const g = window.__ABYSSAL__;
    g.setLength(length);
    g.player.invulnerable = 999;
  }, length);
}
try {
  await page.goto(base);
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
    await select(id);
    const s = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        id: g.expedition.region.id,
        stock: g.entities.length,
        kinds: [...new Set(g.entities.map((e) => e.species.kind))],
        mythic: g.entities.filter((e) => e.species.mythic).length,
        bosses: g.encounters.bosses
          .filter((b) => b.enabled)
          .map((b) => b.state.species.kind),
        allowedBosses: g.expedition.region.bossKinds,
        surface: g.surface.mode,
      };
    });
    if (id === "penglai") {
      assert.equal(s.stock, 441);
      assert.equal(s.kinds.length, 18);
      assert.equal(s.bosses.length, 5);
      assert.equal(s.surface, "aether");
    } else {
      assert.equal(s.mythic, 0);
      assert.notEqual(s.surface, "aether");
    }
    assert.ok(
      s.bosses.every((kind) => s.allowedBosses.includes(kind)),
      `${id} lord leaked from another region`,
    );
    report.stock.push(s);
  }
  report.checks.push(
    "Seven real map populations and surface capabilities remain isolated",
  );
  for (const character of [
    "orca",
    "squid",
    "zombie_shark",
    "mechanical_shark",
  ]) {
    console.log("Character " + character);
    await start(character, 16);
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.setPosition(0, -10, 40);
      g.setFacing(0, 0.85);
    });
    await page.keyboard.down("Space");
    await page.waitForFunction(() => window.__ABYSSAL__.position.y > 22);
    await page.keyboard.up("Space");
    const air = await page.evaluate(() => ({
      y: window.__ABYSSAL__.position.y,
      pitch: window.__ABYSSAL__.controls.pitch,
      airborne: window.__ABYSSAL__.surface.airborne,
    }));
    assert.ok(air.pitch > 0.7);
    assert.equal(air.airborne, false);
    if (character === "squid") {
      await page.keyboard.press("KeyJ");
      assert.ok(
        await page.evaluate(
          () =>
            window.__ABYSSAL__.inkAbility.readyAt >
            window.__ABYSSAL__.player.elapsed,
        ),
      );
    }
    if (character === "mechanical_shark") {
      await page.keyboard.press("KeyJ");
      assert.ok(
        await page.evaluate(
          () =>
            window.__ABYSSAL__.torpedoes.state.readyAt >
            window.__ABYSSAL__.player.elapsed,
        ),
      );
    }
    await page.evaluate(() => window.__ABYSSAL__.setFacing(0, -0.85));
    await page.keyboard.down("Space");
    await page.waitForFunction(() => window.__ABYSSAL__.position.y < -6);
    await page.keyboard.up("Space");
    // 偏离其他鱼群，只保留一条相同合法配置的目标作一次真实接触，并观察该居民的正常重生。
    const before = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.setPosition(0, -22, 50);
      g.setFacing(0, 0);
      const e = g.entities.find((e) => e.species.kind === "jade_minnow");
      window.__prey = e;
      for (const other of g.entities)
        if (other !== e) other.mesh.position.x += 180;
      const mouth = g.getCapturePoint();
      e.mesh.position.copy(mouth).addScaledVector(g.forward, 0.3);
      e.velocity.set(0, 0, 0);
      e.chase = 0;
      e.disorientedUntil = g.player.elapsed + 10;
      return g.player.eaten;
    });
    await page.waitForFunction(
      (n) => window.__ABYSSAL__.player.eaten > n,
      before,
    );
    assert.ok(await page.evaluate(() => window.__prey.hiddenFor > 0));
    await page.evaluate(() => (window.__prey.hiddenFor = 0.02));
    await page.waitForFunction(
      () => window.__prey.mesh.visible && window.__prey.hiddenFor <= 0,
    );
    const p = await page.evaluate(() => ({ ...window.__prey.mesh.position }));
    assert.ok(p.y < 0);
    assert.ok(Number.isFinite(p.x));
  }
  report.checks.push(
    "Four characters fly through the water surface, retain pitch, return to water, use aerial skills and feed/respawn through native contact",
  );
  await start("orca", 25);
  await page.keyboard.down("KeyK");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      s = g.encounters.bosses.find((b) => b.id === "penglai_sage");
    window.__sage = s;
    g.setPosition(100, 265, -600);
  });
  assert.equal(await page.evaluate(() => window.__sage.state.locked), true);
  // 各阶段夹具只冻结恢复窗口和起始朝向；咬击不得直接调用规则或写 defeated。
  for (const id of [
    "penglai_azure",
    "penglai_tiger",
    "penglai_bird",
    "penglai_tortoise",
    "penglai_sage",
  ]) {
    console.log("Guardian " + id);
    await page.evaluate(async (id) => {
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find((b) => b.id === id),
        { findBossContact } = await import("/src/encounters.js");
      window.__boss = b;
      // 起始位置放在各自领地内真实地面上方，避免受控接触被柱子挡住。
      const floor = g.ocean.heightAt(b.home.x, b.home.z);
      b.mesh.position.set(
        b.home.x,
        Math.max(b.home.y, floor + b.state.species.length * 0.28 + 6),
        b.home.z,
      );
      b.heading.set(0, 0, -1);
      b.mesh.quaternion.identity();
      window.__contact = () => {
        g.setFacing(Math.PI / 2, 0);
        b.heading.set(0, 0, -1);
        b.mesh.quaternion.identity();
        b.mesh.updateMatrixWorld(true);
        const offset = g.forward.clone().multiplyScalar(g.player.length * 0.38),
          candidates = [],
          v = b.mesh.position.clone();
        // 从当前变形后的实体顶点选侧翼；展翼、盘蛇与直立人物没有共同的固定体心截面。
        b.mesh.traverse((part) => {
          if (!part.isMesh || !part.visible) return;
          const points = part.geometry.attributes.position;
          for (
            let i = 0;
            i < points.count;
            i += Math.max(1, Math.floor(points.count / 100))
          ) {
            v.fromBufferAttribute(points, i).applyMatrix4(part.matrixWorld);
            const dx = v.x - b.mesh.position.x,
              dy = v.y - b.mesh.position.y,
              dz = v.z - b.mesh.position.z;
            if (
              dx >= 0 &&
              Math.abs(dz) < b.state.species.length * 0.3 &&
              Math.abs(dy) < b.state.species.length * 0.3
            )
              candidates.push({
                p: v.clone(),
                score: Math.abs(dy) + Math.abs(dz) - dx * 0.15,
              });
          }
        });
        candidates.sort((a, b) => a.score - b.score);
        for (const candidate of candidates) {
          const p = candidate.p.clone();
          p.x += g.player.length * 0.06 * 0.25;
          if (findBossContact(b.mesh, p, g.player.length * 0.06)) {
            p.sub(offset);
            const floor = g.ocean.heightAt(p.x, p.z);
            if (p.y < floor + g.player.length * 0.18 + 0.5) continue;
            g.setPosition(p.x, p.y, p.z);
            return;
          }
        }
        throw Error("No actual flank mesh contact: " + id);
      };
    }, id);
    if (id === "penglai_sage")
      assert.equal(
        await page.evaluate(() => window.__boss.state.locked),
        false,
      );
    for (let hit = 0; hit < 3; hit++) {
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          b = window.__boss;
        g.setPosition(b.home.x + 80, b.mesh.position.y + 15, b.home.z);
        b.state.phase = "recover";
        b.state.timer = 0;
        b.state.phaseDuration = 999;
      });
      await page.waitForFunction(
        () =>
          window.__boss.state.contactArmed &&
          window.__ABYSSAL__.player.biteCooldown === 0 &&
          window.__boss.state.biteCooldown === 0,
      );
      const health = await page.evaluate(() => {
        window.__contact();
        return window.__boss.state.health;
      });
      await page.waitForFunction((h) => window.__boss.state.health < h, health);
      assert.equal(
        await page.evaluate(() => window.__boss.state.defeated),
        hit === 2,
      );
    }
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.mode),
      id === "penglai_sage" ? "won" : "playing",
    );
  }
  await page.keyboard.up("KeyK");
  await page.screenshot({ path: `${out}/victory.png` });
  report.checks.push(
    "Four real guardian victories unlock the sage; fifteen separated flank contacts complete the once-only five-lord ending",
  );
  await start("orca", 25);
  assert.equal(
    await page.evaluate(
      () =>
        window.__ABYSSAL__.encounters.bosses.filter(
          (b) => b.enabled && b.state.defeated,
        ).length,
    ),
    0,
  );
  assert.equal(
    await page.evaluate(
      () =>
        window.__ABYSSAL__.encounters.bosses.find(
          (b) => b.id === "penglai_sage",
        ).state.locked,
    ),
    true,
  );
  report.checks.push("Restart restores four guardians and sage ward");
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  await page.locator("[data-language-select]").first().selectOption("en");
  await page.click("#open-guide");
  await page.waitForSelector("#guide-region");
  await page.selectOption("#guide-region", "penglai");
  assert.equal(
    await page.locator('[data-category="mythic"]').isVisible(),
    true,
  );
  await page.click('[data-category="mythic"]');
  assert.equal(await page.locator(".guide-list button").count(), 18);
  await page.screenshot({ path: `${out}/guide_en.png` });
  await page.locator(".guide-close").click();
  report.checks.push(
    "Actual English Guide offers all eighteen mythic kinds in the independent region filter",
  );
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  report.last = await page.evaluate(() => ({
    boss: window.__boss?.id,
    position: window.__ABYSSAL__?.position,
    bossPosition: window.__boss?.mesh.position,
    result: window.__boss?.lastBiteResult,
    health: window.__boss?.state.health,
    locked: window.__boss?.state.locked,
  }));
  throw error;
} finally {
  await writeFile(
    `${out}/browser_report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
