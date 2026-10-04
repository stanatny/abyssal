import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "zh-CN",
});
page.setDefaultTimeout(30000);
const errors = [],
  checks = [],
  measurements = {};
let hits = 0;
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
const clearWater = () =>
  page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    // 在海床、岩柱和船只之外验证输入，仍由实际移动与碰撞循环推进。
    g.setPosition(180, -90, -320);
  });
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.screenshot({ path: ".local/v3_menu.png" });
  await page.click("#quality");
  await page.locator("#start").focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  assert.equal((await state()).mode, "playing");
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    "CANVAS",
  );
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.audio.context.state),
    "running",
  );
  checks.push(
    "Space starts the game, activates audio, and returns focus to the canvas",
  );
  await clearWater();
  const beforeMouse = await page.evaluate(() => window.__ABYSSAL__.controls);
  await page.mouse.move(80, 80);
  await page.waitForTimeout(200);
  await page.mouse.move(1350, 810);
  await page.waitForTimeout(200);
  const afterMouse = await page.evaluate(() => window.__ABYSSAL__.controls);
  assert.ok(Math.abs(afterMouse.yaw - beforeMouse.yaw) < 0.001);
  assert.ok(Math.abs(afterMouse.pitch - beforeMouse.pitch) < 0.001);
  checks.push("Mouse movement does not steer the keyboard-controlled orca");
  for (const [key, axis, sign] of [
    ["KeyD", "yaw", -1],
    ["KeyA", "yaw", 1],
    ["KeyW", "pitch", 1],
    ["KeyS", "pitch", -1],
  ]) {
    const initial = await page.evaluate(
      (axis) => window.__ABYSSAL__.controls[axis],
      axis,
    );
    await page.keyboard.down(key);
    await page.waitForFunction(
      ({ axis, sign, initial }) =>
        (window.__ABYSSAL__.controls[axis] - initial) * sign > 0.15,
      { axis, sign, initial },
    );
    await page.keyboard.up(key);
  }
  checks.push("WASD independently changes vertical and horizontal heading");
  await clearWater();
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.controls.speed > 40 &&
      window.__ABYSSAL__.player.stamina < 95,
  );
  measurements.sprint = await page.evaluate(() => ({
    speed: window.__ABYSSAL__.controls.speed,
    stamina: window.__ABYSSAL__.player.stamina,
  }));
  await page.keyboard.up("Space");
  checks.push(
    "Orca sprint reaches above 40 m/s toward 41.6 (+30%) and consumes stamina",
  );
  await page.keyboard.down("KeyK");
  await page.waitForFunction(() => window.__ABYSSAL__.controls.speed < 6);
  measurements.slowSpeed = await page.evaluate(
    () => window.__ABYSSAL__.controls.speed,
  );
  await page.keyboard.up("KeyK");
  checks.push("K slows swimming toward 5 m/s");
  await page.keyboard.press("Escape");
  const paused = await state();
  await page.waitForTimeout(300);
  assert.deepEqual((await state()).position, paused.position);
  assert.equal((await state()).player.elapsed, paused.player.elapsed);
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.audio.context.state),
    "suspended",
  );
  await page.keyboard.press("Space");
  assert.equal((await state()).mode, "playing");
  assert.equal(
    await page.evaluate(() => document.activeElement.tagName),
    "CANVAS",
  );
  checks.push("Pause freezes the world, round clock, and audio; Space resumes");
  await clearWater();
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.markersEnabled),
    true,
  );
  assert.equal(
    await page.evaluate(() => typeof window.__ABYSSAL__.activateSonar),
    "function",
  );
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    const fish = g.entities.find(
      (e) =>
        e.species.kind === "tuna" &&
        e.school.habitat.depthMin <= -g.position.y &&
        e.school.habitat.depthMax >= -g.position.y,
    );
    fish.hiddenFor = 0;
    fish.mesh.position.copy(g.position);
    fish.mesh.position.z -= 35;
    fish.velocity.set(0, 0, -1);
  });
  await page.waitForFunction(() => !document.querySelector("#target").hidden);
  measurements.defaultTarget = await page.locator("#target").innerText();
  assert.ok(
    (measurements.defaultTarget.match(/\d+(?:\.\d+)?\s*m/g) || []).length >= 2,
  );
  await page.keyboard.press("KeyL");
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.markersEnabled),
    true,
  );
  assert.equal(await page.locator("#touch-markers, #pause-markers").count(), 0);
  checks.push(
    "Visible prey markers include distance; marker settings are outside gameplay and L has no effect",
  );
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
  assert.ok(meal.length > 3 && meal.length < 3.2);
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
  assert.equal(await page.locator("#reward-legend").count(), 0);
  checks.push("三类奖励带独立图形和名称，HUD不再常驻奖励说明");
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
    // 使用实际表层鸟类体长，已成长个体验证空中捕食。
    g.setLength(6);
    // 从足够深的无遮挡水域起跳，避开新增海床和船体碰撞。
    g.setPosition(200, -35, -100);
  });
  await page.keyboard.down("KeyW");
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () => window.__ABYSSAL__.surface.airborne,
    {},
    { timeout: 12000 },
  );
  await page.waitForFunction(() => window.__ABYSSAL__.position.y > 7);
  await page.screenshot({ path: ".local/v3_breach.png" });
  checks.push("水下连续蓄势后向上冲刺，触发实际破水抛物线与天空");
  const beforeBird = (await state()).player.eaten;
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = g.surface.birds[0],
      t = g.elapsed,
      radius = 22 + (b.phase % 7),
      angle = (t * b.species.speed) / radius + b.phase;
    b.cooldown = 0;
    b.anchor.set(
      g.position.x - Math.sin(angle) * radius,
      g.position.y - Math.sin(t * 0.65 + b.phase) * 0.8,
      g.position.z - Math.cos(angle) * radius * 0.72,
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
  await page.evaluate(() => window.__ABYSSAL__.setMarkers(false));
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.markersEnabled),
    false,
  );
  assert.equal(await page.locator("#threat").isVisible(), true);
  await page.evaluate(() => window.__ABYSSAL__.setMarkers(true));
  checks.push("海洋霸主追击与警报");
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
  await page.keyboard.press("Space");
  assert.equal((await state()).mode, "playing");
  assert.equal((await state()).player.timedOut, false);
  assert.ok((await state()).player.elapsed < 1);
  checks.push(
    "Death settlement restarts through Space and resets the round clock",
  );
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
    g.setLength(6);
    g.player.invulnerable = 999;
    g.setPosition(b.home.x, b.home.y, b.home.z + 50);
  });
  await page.waitForFunction(() => !!window.__ABYSSAL__.activeBoss);
  await page.waitForFunction(
    () => window.__ABYSSAL__.activeBoss?.state.phase === "windup",
    {},
    { timeout: 12000 },
  );
  await page.screenshot({ path: ".local/v3_boss.png" });
  await page.evaluate(() => window.__ABYSSAL__.setMarkers(false));
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.markersEnabled),
    false,
  );
  assert.equal(await page.locator("#boss-panel").isVisible(), true);
  await page.evaluate(() => window.__ABYSSAL__.setMarkers(true));
  checks.push("进入领地触发主宰血条与技能前摇");
  checks.push(
    "Hiding passive markers keeps predator and boss warnings visible",
  );
  await page.waitForFunction(
    () => window.__ABYSSAL__.activeBoss?.state.phase === "recover",
    {},
    { timeout: 12000 },
  );
  checks.push("Lord attacks expose their configured recovery window");
  const untouchedHealth = await page.evaluate(async () => {
    const { findBossContact } = await import("/src/encounters.js");
    const g = window.__ABYSSAL__,
      b = g.encounters.bosses.find((e) => e.state.species.kind === "kraken");
    // 固定种类与无遮挡位置，避免随机领地、巨兽朝向和岩石改变接触夹具。
    g.encounters.bosses.forEach((entry) => (entry.enabled = entry === b));
    window.__testBoss = b;
    g.setLength(30);
    b.mesh.position.set(180, -90, -320);
    b.home.copy(b.mesh.position);
    b.heading.set(0, 0, -1);
    b.mesh.quaternion.identity();
    b.state.health = b.state.maxHealth;
    b.state.validatedHits = 0;
    b.state.phase = "recover";
    b.previousPhase = "recover";
    b.state.timer = 0;
    b.state.phaseDuration = 99;
    b.state.biteCooldown = 0;
    g.player.biteCooldown = 0;
    window.__placeTestBossContact = () => {
      const mouth = b.mesh.position.clone();
      // 只用几何助手寻找真实表面，实际伤害必须由游戏帧循环结算。
      g.setFacing(Math.PI / 2, 0);
      b.heading.set(0, 0, -1);
      b.mesh.quaternion.identity();
      for (let side = b.state.species.length * 0.8; side >= 0; side -= 0.1) {
        mouth.copy(b.mesh.position);
        mouth.x += side;
        mouth.z += b.state.species.length * 0.15;
        if (!findBossContact(b.mesh, mouth, g.player.length * 0.06)) continue;
        const point = mouth.addScaledVector(g.forward, -g.player.length * 0.38);
        g.setPosition(point.x, point.y, point.z);
        return true;
      }
      throw new Error("No actual boss surface contact fixture was found");
    };
    // 先停在领地内、接触范围外，验证旧咬击输入和声呐均不会隔空攻击。
    g.setPosition(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z + 85);
    return b.state.health;
  });
  await page.keyboard.down("KeyK");
  await page.keyboard.down("KeyF");
  await page.mouse.click(720, 450);
  await page.keyboard.press("KeyJ");
  await page.waitForFunction(() => window.__ABYSSAL__.sonar.snapshot.active);
  await page.waitForTimeout(400);
  await page.keyboard.up("KeyF");
  assert.equal(
    await page.evaluate(() => window.__testBoss.state.health),
    untouchedHealth,
  );
  checks.push("F, left click, and the J sonar key cannot bite a distant boss");
  // 接触才触发攻击：不按任何咬击键，K只用于低速保持近身。
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = window.__testBoss;
    b.state.phase = "recover";
    b.state.timer = 0;
    b.state.phaseDuration = 99;
    b.state.biteCooldown = 0;
    g.player.biteCooldown = 0;
    g.player.hunger = 40;
    g.player.health = 70;
    g.player.invulnerable = 999;
    window.__placeTestBossContact();
  });
  await page.waitForFunction(
    (health) => window.__testBoss.state.health < health,
    untouchedHealth,
    { timeout: 12000 },
  );
  const firstBite = await page.evaluate(() => ({
    health: window.__testBoss.state.health,
    maximum: window.__testBoss.state.maxHealth,
    cooldown: window.__ABYSSAL__.player.biteCooldown,
    defeated: window.__testBoss.state.defeated,
    hunger: window.__ABYSSAL__.player.hunger,
    playerHealth: window.__ABYSSAL__.player.health,
    mass: window.__ABYSSAL__.player.mass,
  }));
  assert.ok(Math.abs(firstBite.health - (firstBite.maximum * 2) / 3) < 1e-9);
  assert.ok(firstBite.cooldown > 0.5);
  assert.equal(firstBite.defeated, false);
  assert.ok(firstBite.hunger > 46.5 && firstBite.hunger <= 48);
  assert.equal(firstBite.playerHealth, 70);
  assert.equal(firstBite.mass, 125);
  assert.match(await page.locator("#notification").innerText(), /饱食 \+8/);
  // 冷却期持续重新接触表面，确认不是因游离目标而暂时停止掉血。
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.waitForTimeout(80);
    await page.evaluate(() => window.__placeTestBossContact());
  }
  assert.equal(
    await page.evaluate(() => window.__testBoss.state.health),
    firstBite.health,
  );
  assert.ok((await state()).player.hunger < firstBite.hunger);
  checks.push(
    "A real lord flank bite restores 8 hunger without healing/growth; continuous contact cannot farm hunger",
  );
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = window.__testBoss;
    g.setPosition(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z + 85);
  });
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.player.biteCooldown === 0 &&
      window.__testBoss.state.contactArmed,
  );
  await page.evaluate(() => window.__placeTestBossContact());
  await page.waitForFunction(
    (health) => window.__testBoss.state.health < health,
    firstBite.health,
  );
  await page.keyboard.up("KeyK");
  measurements.contactBite = firstBite;
  checks.push(
    "Flank contact bites once, requires disengaging, and respects the 1.2-second cooldown",
  );
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      b = window.__testBoss;
    b.state.health = b.state.maxHealth;
    b.state.validatedHits = 0;
    g.setPosition(b.mesh.position.x, b.mesh.position.y, b.mesh.position.z + 85);
  });
  // 固定遭遇位置验证多次真实接触咬击，终局不宣称自然通关。
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const b = window.__testBoss;
      window.__ABYSSAL__.setPosition(
        b.mesh.position.x + 85,
        b.mesh.position.y,
        b.mesh.position.z,
      );
    });
    await page.waitForFunction(
      () =>
        window.__testBoss.state.contactArmed &&
        window.__ABYSSAL__.player.biteCooldown === 0,
    );
    const old = await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        b = window.__testBoss;
      b.state.phase = "recover";
      b.state.timer = 0;
      b.state.phaseDuration = 3;
      b.state.biteCooldown = 0;
      g.player.biteCooldown = 0;
      g.player.invulnerable = 999;
      const health = b.state.health;
      window.__placeTestBossContact();
      return health;
    });
    await page.waitForFunction((h) => window.__testBoss.state.health < h, old);
    hits++;
    if (i === 0) {
      assert.ok(await page.evaluate(() => !window.__testBoss.state.defeated));
      checks.push("最大体长也不能一口吞掉主宰");
    }
    if ((await state()).mode === "won") break;
  }
  assert.equal(hits, 3);
  assert.equal((await state()).mode, "won");
  assert.ok((await state()).player.bossesDefeated >= 1);
  checks.push(
    "Repeated contact bites defeat a boss without an attack button; 30 m plus a boss victory wins the round",
  );
  await page.click("#resume");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(50, -680, -1090);
    g.player.invulnerable = 999;
  });
  await page.waitForTimeout(1400);
  assert.ok(Number(await page.locator("#depth").innerText()) > 2500);
  await page.screenshot({ path: ".local/v3_deep.png" });
  checks.push("可到达2500米以下的新深海区域");
  await clearWater();
  await page.evaluate(() => {
    window.__ABYSSAL__.player.elapsed = 1799.7;
  });
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "timeup");
  const expired = await state();
  assert.equal(expired.player.elapsed, 1800);
  assert.equal(expired.player.timedOut, true);
  assert.equal(expired.player.dead, false);
  assert.equal(expired.player.won, false);
  await page.waitForTimeout(300);
  assert.deepEqual((await state()).position, expired.position);
  assert.equal((await state()).player.elapsed, 1800);
  measurements.timeup = expired.player;
  await page.keyboard.press("Space");
  assert.equal((await state()).mode, "playing");
  assert.equal((await state()).player.timedOut, false);
  assert.ok((await state()).player.elapsed < 1);
  checks.push(
    "The actual loop ends the expedition at 30 minutes without granting victory; restart resets it",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: ".local/v3_mobile.png" });
  assert.ok(await page.locator("#resume").isVisible());
  checks.push("窄屏暂停与恢复操作可见");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors, hits, measurements }, null, 2));
} catch (error) {
  measurements.failure = { message: error.message, stack: error.stack };
  await page.screenshot({ path: ".local/v3_game_failure.png" }).catch(() => {});
  throw error;
} finally {
  await writeFile(
    ".local/verification_v0_3.json",
    JSON.stringify(
      {
        checks,
        errors,
        hits,
        measurements,
        verifiedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  await browser.close();
}
