import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// 初始位置与耐久隔离为受控夹具；实际移动、吞食、刷新和终局均走游戏主循环。
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/amazon_review",
  base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5260";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    reducedMotion: "reduce",
  });
page.setDefaultTimeout(45000);
const report = {
  checks: [],
  errors: [],
  routes: [],
  stock: [],
  at: new Date().toISOString(),
  method:
    "Controlled real-loop review, not a natural whole expedition or physical phone test",
};
page.on("pageerror", (e) => report.errors.push(e.message));
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
    "europa",
    "amazon",
  ]) {
    await select(id);
    const stock = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        id: g.expedition.region.id,
        count: g.entities.length,
        kinds: [...new Set(g.entities.map((e) => e.species.kind))],
        freshwater: g.entities.filter((e) => e.species.freshwater).length,
        bosses: g.encounters.bosses
          .filter((b) => b.enabled)
          .map((b) => b.state.species.kind),
      };
    });
    if (id !== "amazon") assert.equal(stock.freshwater, 0);
    else {
      assert.equal(stock.count, 411);
      assert.equal(stock.kinds.length, 20);
      assert.deepEqual(stock.bosses.sort(), ["rootjaw", "yacumama"]);
    }
    report.stock.push(stock);
  }
  report.checks.push(
    "Six actual populations remain isolated; Amazon has 20 kinds / 411 residents / two local lords",
  );
  await start();
  await page.waitForTimeout(1000);
  const positions = await page.evaluate(async () => {
    const g = window.__ABYSSAL__,
      { isPositionBlocked } = await import("/src/collision.js");
    return g.entities
      .filter(
        (e) =>
          e.mesh.position.y <
            g.ocean.heightAt(e.mesh.position.x, e.mesh.position.z) ||
          isPositionBlocked(e.mesh.position, {
            radius: e.species.length * 0.1,
            colliders: g.ocean.colliders,
          }),
      )
      .map((e) => e.species.kind);
  });
  assert.deepEqual(positions, []);
  report.checks.push(
    "Live spawned residents sit above the riverbed outside solid rainforest",
  );
  const radar = await page.locator(".minimap-rivers path").count();
  assert.equal(radar, 5);
  for (const character of [
    "orca",
    "squid",
    "zombie_shark",
    "mechanical_shark",
  ]) {
    await start(character, 30);
    for (const side of [-1, 1]) {
      await page.evaluate(async (side) => {
        const g = window.__ABYSSAL__,
          { amazonChannels } = await import("/src/amazon_config.js");
        const c = amazonChannels(-300).find((c) => c.side === side);
        g.setPosition(c.center, -28, -300);
        g.setFacing(0, 0);
        window.__routeZ = g.position.z;
        window.__routeStart = g.player.elapsed;
      }, side);
      await page.waitForFunction(
        () => window.__routeZ - window.__ABYSSAL__.position.z >= 20,
      );
      const r = await page.evaluate(async (side) => {
        const g = window.__ABYSSAL__,
          { amazonChannels } = await import("/src/amazon_config.js");
        const c = amazonChannels(g.position.z).find((c) => c.side === side);
        return {
          character: g.player.characterId,
          side,
          moved: window.__routeZ - g.position.z,
          elapsed: g.player.elapsed - window.__routeStart,
          bankGap: c.halfWidth - Math.abs(g.position.x - c.center),
          mode: g.mode,
        };
      }, side);
      report.routes.push(r);
      assert.ok(r.moved >= 20, JSON.stringify(r));
      assert.ok(r.bankGap > 15);
      assert.equal(r.mode, "playing");
    }
    // 单个真实捕食事件；不调用奖励函数，目标走已有迷失分支避免夹具游离。
    const before = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.player.health = 75;
      g.player.hunger = 70;
      const e = g.entities.find(
        (e) => e.species.kind === "amazon_pacu" && e.hiddenFor <= 0,
      );
      window.__prey = e;
      e.mesh.position.copy(g.getCapturePoint());
      e.disorientedUntil = g.player.elapsed + 10;
      return g.player.eaten;
    });
    await page.waitForFunction(
      (n) => window.__ABYSSAL__.player.eaten > n,
      before,
    );
    await page.waitForFunction(() => window.__prey.hiddenFor > 0);
    const respawn = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      window.__prey.hiddenFor = 0.05;
      window.__prey.disorientedUntil = 0;
      return { health: g.player.health, kind: window.__prey.species.kind };
    });
    assert.ok(respawn.health > 75);
    await page.waitForFunction(() => window.__prey.hiddenFor <= 0);
    const legal = await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        p = window.__prey.mesh.position;
      return p.y > g.ocean.heightAt(p.x, p.z) && p.z < -150;
    });
    assert.equal(legal, true);
  }
  report.checks.push(
    "Four grown characters move in both channels, feed through native contact, heal and return prey to a legal habitat",
  );
  await start("orca", 30);
  await page.keyboard.down("KeyK");
  for (const id of ["amazon_serpent", "amazon_rootjaw"]) {
    await page.evaluate(async (id) => {
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find((b) => b.id === id);
      window.__boss = b;
      const { findBossContact } = await import("/src/encounters.js");
      b.mesh.position.copy(b.home);
      b.heading.set(0, 0, -1);
      b.mesh.quaternion.identity();
      window.__contact = () => {
        g.setFacing(Math.PI / 2, 0);
        b.heading.set(0, 0, -1);
        b.mesh.quaternion.identity();
        const p = b.mesh.position.clone(),
          offset = g.forward.clone().multiplyScalar(g.player.length * 0.36);
        for (let x = b.state.species.length * 0.8; x >= 0; x -= 0.1) {
          p.copy(b.mesh.position);
          p.x += x;
          p.z += b.state.species.length * 0.12;
          if (findBossContact(b.mesh, p, g.player.length * 0.08)) {
            p.sub(offset);
            g.setPosition(p.x, p.y, p.z);
            return;
          }
        }
        throw Error("No native flank contact");
      };
    }, id);
    for (let hit = 0; hit < 3; hit++) {
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          b = window.__boss;
        g.setPosition(b.home.x + 60, b.home.y, b.home.z);
        b.state.phase = "recover";
        b.state.timer = 0;
        b.state.phaseDuration = 999;
        b.state.biteCooldown = 0;
      });
      await page.waitForFunction(
        () =>
          window.__boss.state.contactArmed &&
          window.__ABYSSAL__.player.biteCooldown === 0,
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
      id === "amazon_rootjaw" ? "won" : "playing",
    );
  }
  report.checks.push(
    "Native separated flank contacts defeat each lord exactly once; first defeat does not win, second at 30 m does",
  );
  await page.screenshot({ path: `${out}/victory.png` });
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(
    `${out}/browser_report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
