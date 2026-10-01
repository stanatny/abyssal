import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 受控原生接触：固定恢复相位与无敌用于隔离终局规则，不代表自然整局难度。
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/four_regions_review";
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
  fights: [],
  at: new Date().toISOString(),
};
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (e) => {
  if (e.type() === "error") report.errors.push(e.text());
});
async function start(id, character = "orca", length = 30) {
  await page.evaluate(() => window.__ABYSSAL__.returnToMenu());
  await page.click("#region-select");
  await page.click(`[data-choice-value="${id}"]`);
  await page.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    id,
  );
  await page.click("#character-select");
  await page.click(`[data-choice-value="${character}"]`);
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.keyboard.down("KeyK");
  await page.evaluate((length) => {
    const g = window.__ABYSSAL__;
    g.player.invulnerable = 9999;
    g.entities.forEach((e) => (e.hiddenFor = 9999));
    g.setLength(length);
    g.setPosition(0, -30, 75);
  }, length);
}
async function fight(id, winning = false) {
  await page.evaluate(async (id) => {
    const g = window.__ABYSSAL__,
      b = g.encounters.bosses.find((b) => b.id === id);
    assertLocal(b?.enabled, "Missing active boss");
    window.__boss = b;
    b.mesh.position.copy(b.home);
    b.heading.set(0, 0, -1);
    b.mesh.quaternion.identity();
    b.state.phase = "recover";
    b.state.timer = 0;
    b.state.phaseDuration = 999;
    const { findBossContact } = await import("/src/encounters.js");
    window.__contact = () => {
      g.setFacing(Math.PI / 2, 0);
      b.heading.set(0, 0, -1);
      b.mesh.quaternion.identity();
      const offset = g.forward.clone().multiplyScalar(g.player.length * 0.38),
        m = b.mesh.position.clone();
      for (let side = b.state.species.length * 0.8; side >= 0; side -= 0.1) {
        m.copy(b.mesh.position);
        m.x += side;
        m.z += b.state.species.length * 0.15;
        if (!findBossContact(b.mesh, m, g.player.length * 0.06)) continue;
        m.sub(offset);
        g.setPosition(m.x, m.y, m.z);
        return;
      }
      throw Error("No valid flank geometry");
    };
    function assertLocal(ok, message) {
      if (!ok) throw Error(message);
    }
  }, id);
  for (let hit = 0; hit < 3; hit++) {
    await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        b = window.__boss;
      g.setPosition(b.home.x + 75, b.home.y, b.home.z);
    });
    await page.waitForFunction(
      () =>
        window.__boss.state.contactArmed &&
        window.__ABYSSAL__.player.biteCooldown === 0,
    );
    const health = await page.evaluate(() => {
      const b = window.__boss;
      b.state.phase = "recover";
      b.state.timer = 0;
      b.state.phaseDuration = 999;
      b.state.biteCooldown = 0;
      window.__contact();
      return b.state.health;
    });
    await page.waitForFunction(
      (health) => window.__boss.state.health < health,
      health,
    );
    assert.equal(
      await page.evaluate(() => window.__boss.state.defeated),
      hit === 2,
    );
    if (hit < 2)
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.mode),
        "playing",
      );
  }
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.mode),
    winning ? "won" : "playing",
  );
  report.fights.push({
    id,
    validatedHits: await page.evaluate(() => window.__boss.state.validatedHits),
  });
}
async function placeAtPearl() {
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setFacing(0, 0);
    const offset = g.getCapturePoint().sub(g.position);
    g.setPosition(-offset.x, -699 - offset.y, -922 - offset.z);
  });
  await page.waitForTimeout(200);
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5240");
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.locator("[data-language-select]").first().selectOption("en");
  await start("hawaii", "orca", 25);
  const h = await page.evaluate(
    () => window.__ABYSSAL__.encounters.bosses.find((b) => b.enabled).id,
  );
  await fight(h);
  assert.equal(await page.evaluate(() => window.__ABYSSAL__.player.won), false);
  await page.evaluate(() => window.__ABYSSAL__.setLength(30));
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "won");
  report.checks.push(
    "Hawaii: one native three-bite defeat at 25 m does not finish; 30 m then wins",
  );
  for (const character of ["orca", "squid"]) {
    await start("atlantis", character);
    await placeAtPearl();
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.objective.relicCollected),
      false,
    );
    await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        point = g.ocean.relic.keyArt.getPoint(g.objective.keySiteId);
      // 只定位接近真实钥匙，拾取仍走主循环接触/遮挡；通行性另由实际游行脚本验证。
      g.setFacing(Math.PI / 2, 0);
      const offset = g.getCapturePoint().sub(g.position);
      g.setPosition(point.x - offset.x, point.y - offset.y, point.z - offset.z);
    });
    await page.waitForFunction(() => window.__ABYSSAL__.objective.keyCollected);
    const selection = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        guardian: g.objective.guardianId,
        other: g.encounters.bosses.find(
          (b) => b.enabled && b.id !== g.objective.guardianId,
        ).id,
      };
    });
    await fight(selection.other);
    await placeAtPearl();
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.objective.relicUnlocked),
      false,
    );
    await fight(selection.guardian);
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.objective.relicUnlocked),
      true,
    );
    await page.evaluate(() => window.__ABYSSAL__.setLength(29));
    await placeAtPearl();
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.objective.relicCollected),
      false,
    );
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.setLength(30);
      g.setPosition(0, -688, -896);
      g.setFacing(0, -0.2);
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/pearl_${character}.png` });
    await placeAtPearl();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "won");
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.objective.relicCollected),
      true,
    );
    report.checks.push(
      `${character}: locked pearl, wrong guardian, key, true guardian, sub-30 rejection and native crypt capture victory`,
    );
  }
  await start("bermuda", "squid", 25);
  for (const [i, id] of [
    "bermuda_hydra",
    "bermuda_kraken",
    "bermuda_maja",
    "bermuda_leviathan",
  ].entries())
    await fight(id, i === 3);
  report.checks.push(
    "Bermuda: all four distinct native three-bite defeats required; victory at shared 25 m combat eligibility",
  );
  // 只推进遭遇系统以验证旧150–210秒重生窗口已移除，不绕过真实战斗结算。
  const persisted = await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.encounters.update(400, 1000, g.player, g.position, g.forward, {
      blockedBetween: () => false,
    });
    return g.encounters.bosses
      .filter((b) => b.enabled)
      .map((b) => ({
        id: b.id,
        defeated: b.state.defeated,
        visible: b.mesh.visible,
      }));
  });
  assert.ok(persisted.every((b) => b.defeated && !b.visible));
  report.checks.push(
    "All four defeated Bermuda lords remain absent after 400 seconds of encounter advancement",
  );
  await start("bermuda");
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.objective.defeated.size),
    0,
  );
  assert.ok(
    await page.evaluate(() =>
      window.__ABYSSAL__.encounters.bosses
        .filter((b) => b.enabled)
        .every((b) => !b.state.defeated),
    ),
  );
  report.checks.push(
    "Returning home resets objective, guardian health and persistent defeat records for a fresh round",
  );
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    `${out}/objectives_browser.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
