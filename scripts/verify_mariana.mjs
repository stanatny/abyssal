import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/mariana_review";
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
  cycles: [],
  errors: [],
  at: new Date().toISOString(),
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
const state = () =>
  page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      mode: g.mode,
      progress: g.ocean.progress,
      position: g.position,
      player: g.player,
    };
  });
async function select(id) {
  await page.click("#region-select");
  await page.click(`[data-choice-value="${id}"]`);
  await page.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    id,
  );
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5240");
  await page.waitForFunction(() => window.__ABYSSAL__);
  for (const id of ["mariana", "hawaii", "atlantis", "bermuda", "mariana"]) {
    await select(id);
    await page.waitForTimeout(300);
    const result = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        region: g.expedition.region.id,
        count: g.entities.length,
        kinds: [...new Set(g.entities.map((e) => e.species.kind))],
        memory: { ...g.renderer.info.memory },
        audioRegion: g.audio.regionId,
        barriers: g.ocean.barriers?.length,
      };
    });
    assert.equal(
      result.count,
      { mariana: 333, hawaii: 313, atlantis: 412, bermuda: 341 }[id],
    );
    assert.equal(result.audioRegion, id);
    assert.equal(result.kinds.includes("snailfish"), id === "mariana");
    report.cycles.push(result);
  }
  report.checks.push(
    "All four destinations switch with isolated rosters, correct music routing and no accumulated population",
  );
  await page.click("#open-guide");
  for (const kind of [
    "moorish_idol",
    "lanternfish",
    "barreleye",
    "dragonfish",
    "snailfish",
    "goblin_shark",
    "shonisaurus",
  ]) {
    await page.click(`[data-kind="${kind}"]`);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${out}/guide_${kind}.png` });
    assert.ok(
      !/[\u3400-\u9fff]/.test(await page.locator(".guide-info").innerText()),
    );
  }
  await page.selectOption("#guide-region", "hawaii");
  assert.equal(await page.locator('[data-kind="snailfish"]').count(), 0);
  await page.selectOption("#guide-region", "mariana");
  assert.equal(await page.locator('[data-kind="snailfish"]').count(), 1);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.expedition.region.id),
    "mariana",
  );
  await page.click(".guide-close");
  report.checks.push(
    "Seven model previews and English Guide copy; independent regional filtering",
  );
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.keyboard.down("KeyK");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.player.invulnerable = 999;
    g.player.hunger = 100;
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.setLength(30);
    g.setPosition(-95, -625, -350);
    g.setFacing(0, -1.48);
  });
  await page.keyboard.up("KeyK");
  await page.keyboard.down("Space");
  await page.waitForTimeout(1900);
  await page.keyboard.up("Space");
  await page.keyboard.down("KeyK");
  assert.ok((await state()).position.y > -650);
  report.checks.push(
    "Closed first pressure seal blocks real sprint descent at adult length",
  );
  for (let index = 0; index < 4; index++) {
    await page.evaluate(async (index) => {
      const { findBossContact } = await import("/src/encounters.js");
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find(
          (e) =>
            e.id ===
            [
              "mariana_hydra",
              "mariana_kraken",
              "mariana_maja",
              "mariana_leviathan",
            ][index],
        );
      window.__boss = b;
      g.setLength(30);
      g.player.invulnerable = 999;
      g.player.health = g.player.hunger = 100;
      b.mesh.position.copy(b.home);
      b.heading.set(0, 0, -1);
      b.mesh.quaternion.identity();
      b.state.phase = "recover";
      b.state.timer = 0;
      b.state.phaseDuration = 999;
      b.state.biteCooldown = 0;
      window.__contact = () => {
        g.setFacing(Math.PI / 2, 0);
        b.heading.set(0, 0, -1);
        b.mesh.quaternion.identity();
        const mouth = b.mesh.position.clone();
        for (let side = b.state.species.length * 0.8; side >= 0; side -= 0.1) {
          mouth.copy(b.mesh.position);
          mouth.x += side;
          mouth.z += b.state.species.length * 0.15;
          if (!findBossContact(b.mesh, mouth, g.player.length * 0.06)) continue;
          mouth.addScaledVector(g.forward, -g.player.length * 0.38);
          g.setPosition(mouth.x, mouth.y, mouth.z);
          return;
        }
        throw new Error("Missing native lord contact");
      };
      g.setPosition(b.home.x + 80, b.home.y, b.home.z);
    }, index);
    for (let hit = 0; hit < 3; hit++) {
      await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          b = window.__boss;
        g.setPosition(
          b.mesh.position.x + 85,
          b.mesh.position.y,
          b.mesh.position.z,
        );
      });
      await page.waitForFunction(
        () =>
          window.__boss.state.contactArmed &&
          window.__ABYSSAL__.player.biteCooldown === 0,
      );
      const before = await page.evaluate(() => {
        const b = window.__boss;
        b.state.phase = "recover";
        b.state.timer = 0;
        b.state.phaseDuration = 999;
        b.state.biteCooldown = 0;
        window.__contact();
        return b.state.health;
      });
      await page.waitForFunction((h) => window.__boss.state.health < h, before);
    }
    assert.equal((await state()).player.bossesDefeated, index + 1);
    await page.evaluate(() => {});
    await page.waitForTimeout(100);
    assert.ok(await page.evaluate(() => window.__boss.state.defeated));
    await page.waitForFunction(
      (n) => window.__ABYSSAL__.ocean.progress.opened === n,
      index + 1,
    );
    assert.equal((await state()).mode, "playing");
    const gate = await page.evaluate(
      async (index) =>
        (await import("/src/mariana_config.js")).MARIANA_GATES[index],
      index,
    );
    await page.evaluate((gate) => {
      const g = window.__ABYSSAL__;
      g.setPosition(gate.x, -gate.depth + 28, gate.z);
      g.setFacing(0, -1.48);
    }, gate);
    await page.keyboard.up("KeyK");
    await page.keyboard.down("Space");
    await page.waitForFunction(
      (depth) => window.__ABYSSAL__.position.y < -depth - 35,
      gate.depth,
      { timeout: 25000 },
    );
    await page.keyboard.up("Space");
    await page.keyboard.down("KeyK");
    assert.ok(
      (await state()).position.y < -gate.depth - 26,
      `Open gate ${index} passage ${JSON.stringify(await state())}`,
    );
    await page.screenshot({ path: `${out}/passed_gate_${index + 1}.png` });
    report.checks.push(
      `Guardian ${index + 1}: exactly three real flank contacts, persistent defeat, opened seal and native adult passage; no premature victory`,
    );
  }
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(0, -2735, -430);
    g.setFacing(0, 0);
  });
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "won");
  await page.screenshot({ path: `${out}/victory.png` });
  report.checks.push(
    "30 m plus all four guardians wins only at the bottom refuge",
  );
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  const reset = await page.evaluate(() => {
    document.querySelector("#start").click();
    const g = window.__ABYSSAL__;
    return { player: g.player, progress: g.ocean.progress };
  });
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  assert.equal(reset.progress.opened, 0);
  assert.equal(reset.player.length, 15);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.ocean.barriers.length),
    4,
  );
  report.checks.push(
    "Restart restores all seals, guardians and 15 m starting state",
  );
  // 真实捕食之后等待既有28秒居民刷新；不跳过倒计时。
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    const e = g.entities.find((e) => e.species.kind === "barreleye");
    window.__prey = e;
    g.player.invulnerable = 999;
    g.setFacing(0, 0);
    g.setPosition(
      e.mesh.position.x,
      e.mesh.position.y,
      e.mesh.position.z + g.player.length * 0.38,
    );
  });
  await page.waitForFunction(() => window.__prey.hiddenFor > 0);
  const home = await page.evaluate(() => ({
    remaining: window.__prey.hiddenFor,
    position: window.__prey.mesh.position,
  }));
  await page.evaluate(() => window.__ABYSSAL__.setPosition(0, -18, 75));
  await page.waitForFunction(() => window.__prey.hiddenFor <= 0, null, {
    timeout: 100000,
  });
  report.respawn = {
    before: home,
    after: await page.evaluate(() => ({
      position: window.__prey.mesh.position,
      remaining: window.__prey.hiddenFor,
    })),
  };
  report.checks.push(
    "Exclusive resident is caught through real contact and respawns after its ordinary 28-second timer",
  );
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({ path: `${out}/home_${width}.png` });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.click("#open-guide");
    await page.click('[data-kind="goblin_shark"]');
    await page.screenshot({ path: `${out}/guide_${width}.png` });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.click(".guide-close");
  }
  report.checks.push(
    "English home/Guide remain within 320 and 390 px viewports",
  );
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    `${out}/browser_report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
}
