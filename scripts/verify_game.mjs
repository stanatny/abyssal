import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  checks = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const state = () =>
  page.evaluate(() => ({
    player: window.__ABYSSAL__.player,
    mode: window.__ABYSSAL__.mode,
    position: window.__ABYSSAL__.position,
  }));
const center = () => page.mouse.move(720, 450);
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.screenshot({ path: ".local/v2_menu.png" });
  await page.click("#quality");
  await page.click("#start");
  await center();
  assert.equal((await state()).mode, "playing");
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.audio.context.state),
    "running",
  );
  checks.push("开始游戏，配乐由用户手势激活");
  await page.keyboard.down("Space");
  await page.waitForTimeout(1100);
  await page.keyboard.up("Space");
  assert.ok((await state()).player.stamina < 95);
  checks.push("冲刺消耗体力");
  await page.keyboard.press("Escape");
  const paused = await state();
  await page.waitForTimeout(300);
  assert.deepEqual((await state()).position, paused.position);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.audio.context.state),
    "suspended",
  );
  await page.click("#resume");
  await center();
  checks.push("暂停同步冻结世界与音乐并可恢复");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.player.health = 50;
    const fish = g.entities.find((e) => e.species.kind === "fish");
    fish.hiddenFor = 0;
    fish.mesh.position.copy(g.position);
    fish.mesh.position.z -= 2.3;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.player.eaten > 0);
  const meal = (await state()).player;
  assert.ok(meal.health > 50);
  assert.ok(meal.lastMeal.healed > 0);
  assert.ok(meal.length > 6);
  checks.push("吃鱼优先回血，同时保留部分成长");
  assert.ok(
    await page.evaluate(
      () => window.__ABYSSAL__.entities.filter((e) => e.school).length >= 90,
    ),
  );
  checks.push("初级鱼按群体编组");
  const rewardInfo = await page.evaluate(() =>
    window.__ABYSSAL__.pickups.slice(0, 3).map((p) => ({
      kind: p.kind,
      label: !!p.mesh.userData.label,
      parts: p.mesh.userData.core.children.length,
    })),
  );
  assert.equal(new Set(rewardInfo.map((p) => p.kind)).size, 3);
  assert.ok(rewardInfo.every((p) => p.label));
  assert.match(await page.locator("#reward-legend").innerText(), /回满体力/);
  checks.push("三类奖励带独立图形、名称和用途");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.collectPickup("flow");
    g.collectPickup("frenzy");
  });
  await page.waitForFunction(() =>
    document.querySelector("#buffs").textContent.includes("深渊狂食"),
  );
  assert.match(await page.locator("#buffs").innerText(), /深渊狂食/);
  checks.push("限时奖励生效");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.setPosition(0, -1, 55);
  });
  await center();
  await page.keyboard.down("KeyW");
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () => window.__ABYSSAL__.surface.airborne,
    {},
    { timeout: 12000 },
  );
  await page.waitForFunction(() => window.__ABYSSAL__.position.y > 7);
  await page.screenshot({ path: ".local/v2_breach.png" });
  checks.push("向上冲刺触发实际破水抛物线与天空");
  const beforeBird = (await state()).player.eaten;
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = g.surface.birds[0],
      t = g.elapsed;
    b.cooldown = 0;
    b.anchor.set(
      g.position.x - Math.sin(t * 0.16 + b.phase) * 8,
      g.position.y - Math.sin(t * 0.65 + b.phase) * 0.8,
      g.position.z - Math.cos(t * 0.16 + b.phase) * 9,
    );
  });
  await page.waitForFunction(
    (n) => window.__ABYSSAL__.player.eaten > n,
    beforeBird,
  );
  checks.push("腾空时捕食海鸥");
  await page.keyboard.up("KeyW");
  await page.keyboard.up("Space");
  await page.waitForFunction(
    () => !window.__ABYSSAL__.surface.airborne,
    {},
    { timeout: 12000 },
  );
  checks.push("重力落水并恢复游泳");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.setPosition(0, -100, -260);
    const shark = g.entities.find((e) => e.species.kind === "shark");
    shark.hiddenFor = 0;
    shark.mesh.position.set(0, -100, -248);
  });
  await page.waitForFunction(() => !document.querySelector("#threat").hidden);
  checks.push("中级猎手追击与警报");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    const shark = g.entities.find((e) => e.species.kind === "shark");
    shark.mesh.position.copy(g.position);
    shark.mesh.position.z += 2;
    shark.cooldown = 0;
    g.player.invulnerable = 0;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.player.health < 100);
  checks.push("捕食者咬伤反馈");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.player.invulnerable = 0;
    g.takeDamage(200);
  });
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "dead");
  await page.click("#resume");
  await center();
  checks.push("死亡结算可重新开始");
  assert.equal(
    await page.evaluate(
      () =>
        window.__ABYSSAL__.encounters.bosses.filter((b) => b.enabled).length,
    ),
    2,
  );
  checks.push("四种主宰随机启用两片领地");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.entities.forEach((e) => (e.hiddenFor = 999));
    const b = g.encounters.bosses.find((e) => e.enabled);
    g.setLength(30);
    g.player.invulnerable = 999;
    g.setPosition(b.home.x, b.home.y, b.home.z + 50);
  });
  await page.waitForFunction(() => !!window.__ABYSSAL__.activeBoss);
  await page.waitForFunction(
    () => window.__ABYSSAL__.activeBoss?.state.phase === "windup",
    {},
    { timeout: 12000 },
  );
  await page.screenshot({ path: ".local/v2_boss.png" });
  checks.push("进入领地触发主宰血条与技能前摇");
  await page.waitForFunction(
    () => window.__ABYSSAL__.activeBoss?.state.phase === "recover",
    {},
    { timeout: 12000 },
  );
  checks.push("主宰技能结束产生3秒弱点窗口");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = g.encounters.bosses.find((e) => e.enabled && !e.state.defeated);
    window.__testBoss = b;
    b.state.phase = "recover";
    b.state.timer = 0;
    b.state.phaseDuration = 99;
    b.state.biteCooldown = 0;
    g.player.biteCooldown = 0;
    g.setPosition(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z + 20);
  });
  await center();
  await page.mouse.down();
  await page.waitForFunction(
    () =>
      window.__testBoss.state.health < window.__testBoss.state.maxHealth * 0.7,
    {},
    { timeout: 12000 },
  );
  await page.mouse.up();
  checks.push("鼠标长按咬击跨越HUD刷新并连续命中");
  await page.evaluate(() => {
    const b = window.__testBoss;
    b.state.health = b.state.maxHealth;
  });
  // 固定遭遇位置验证真实按键咬击，终局不宣称自然通关。
  let hits = 0;
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        b = g.encounters.bosses.find((e) => e.enabled && !e.state.defeated);
      window.__testBoss = b;
      b.state.phase = "recover";
      b.state.timer = 0;
      b.state.phaseDuration = 3;
      b.state.biteCooldown = 0;
      g.player.biteCooldown = 0;
      g.player.invulnerable = 999;
      g.setPosition(
        b.mesh.position.x,
        b.mesh.position.y,
        b.mesh.position.z + 20,
      );
    });
    const old = await page.evaluate(() => window.__testBoss.state.health);
    await page.keyboard.down("KeyF");
    await page.waitForFunction((h) => window.__testBoss.state.health < h, old);
    await page.keyboard.up("KeyF");
    hits++;
    if (i === 0) {
      assert.ok(await page.evaluate(() => !window.__testBoss.state.defeated));
      checks.push("最大体长也不能一口吞掉主宰");
    }
    if ((await state()).mode === "won") break;
  }
  assert.ok(hits >= 5);
  assert.equal((await state()).mode, "won");
  assert.ok((await state()).player.bossesDefeated >= 1);
  checks.push("多次F咬击击败主宰，30米加战绩触发胜利");
  await page.click("#resume");
  await center();
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(50, -680, -1090);
    g.player.invulnerable = 999;
  });
  await page.waitForTimeout(1400);
  assert.ok(Number(await page.locator("#depth").innerText()) > 2500);
  await page.screenshot({ path: ".local/v2_deep.png" });
  checks.push("可到达2500米以下的新深海区域");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: ".local/v2_mobile.png" });
  assert.ok(await page.locator("#resume").isVisible());
  checks.push("窄屏暂停与恢复操作可见");
  assert.deepEqual(errors, []);
  await writeFile(
    ".local/verification_v0_2.json",
    JSON.stringify(
      { checks, errors, hits, verifiedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ checks, errors, hits }, null, 2));
} finally {
  await browser.close();
}
