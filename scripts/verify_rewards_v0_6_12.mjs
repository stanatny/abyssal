import { selectCharacter } from "./menu_picker_helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import {
  RANDOM_REWARD_COUNT,
  REWARD_KINDS,
  STARTER_REWARDS,
} from "../src/reward_config.js";

// 受控玩家状态与奖励位置隔离拾取结算；实际主循环仍负责触碰、提示、暂停和刷新。
const directory = ".local/rewards_verification";
await mkdir(directory, { recursive: true });
const report = { checks: [], errors: [], at: new Date().toISOString() };
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const [width, height, locale, character] of [
    [1440, 900, "en", "orca"],
    [390, 667, "zh-CN", "squid"],
    [320, 568, "en", "orca"],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale,
      isMobile: width < 700,
      hasTouch: width < 700,
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(20000);
    page.on("pageerror", (error) => report.errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") report.errors.push(message.text());
    });
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await page.waitForFunction(() => window.__ABYSSAL__);
    await selectCharacter(page, character);
    const pool = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      const snapshot = () =>
        g.pickups.map((p) => ({
          kind: p.kind,
          id: p.id,
          xyz: [p.mesh.position.x, p.baseY, p.mesh.position.z],
          uuid: p.mesh.uuid,
          cooldown: p.cooldown,
          disabled: p.disabled,
        }));
      const before = snapshot();
      g.startGame();
      const after = snapshot();
      g.startGame();
      return { before, after, restart: snapshot() };
    });
    for (const items of Object.values(pool)) {
      assert.equal(items.length, STARTER_REWARDS.length + RANDOM_REWARD_COUNT);
      assert.equal(
        items.some((p) => p.id === "nursery_frenzy"),
        false,
      );
      assert.deepEqual(
        items.slice(0, STARTER_REWARDS.length).map((p) => [p.kind, p.xyz]),
        STARTER_REWARDS.map((p) => [p.kind, p.position]),
      );
      assert.deepEqual(
        items.map((p) => p.uuid),
        pool.before.map((p) => p.uuid),
      );
      assert.ok(items.every((p) => p.cooldown === 0));
      assert.ok(items.every((p) => !p.disabled));
      const randomItems = items.slice(STARTER_REWARDS.length);
      for (const kind of REWARD_KINDS)
        assert.equal(
          randomItems.filter((p) => p.kind === kind).length,
          RANDOM_REWARD_COUNT / REWARD_KINDS.length,
        );
    }
    assert.notDeepEqual(
      pool.after.slice(STARTER_REWARDS.length).map((p) => p.xyz),
      pool.restart.slice(STARTER_REWARDS.length).map((p) => p.xyz),
    );
    const pickups = [];
    for (const kind of ["stamina", "flow", "frenzy"]) {
      const values = await page.evaluate(async (kind) => {
        const g = window.__ABYSSAL__;
        g.startGame();
        g.entities.forEach((e) => (e.hiddenFor = 999));
        g.encounters.bosses.forEach((b) => (b.enabled = false));
        g.setPosition(180, -18, -20);
        g.setFacing(0, 0);
        Object.assign(g.player, {
          health: 20,
          stamina: 0,
          hunger: 10,
          exhausted: true,
        });
        const p = g.pickups.find((p) => p.kind === kind);
        p.mesh.position.copy(g.position);
        p.baseY = g.position.y;
        // 当前游戏帧先完成拾取，再观察状态；不直接调用 collectPickup。
        await new Promise(requestAnimationFrame);
        document.querySelector("#pause").click();
        return {
          kind,
          health: g.player.health,
          stamina: g.player.stamina,
          hunger: g.player.hunger,
          exhausted: g.player.exhausted,
          length: g.player.length,
          mass: g.player.mass,
          buffs: { ...g.player.buffs },
          cooldown: p.cooldown,
          visible: p.mesh.visible,
          notification: document.querySelector("#notification").textContent,
        };
      }, kind);
      assert.equal(values.cooldown, 45);
      assert.equal(values.visible, false);
      assert.equal(values.length, 3);
      assert.equal(values.mass, 0.125);
      if (kind === "stamina") {
        assert.equal(values.health, 70);
        assert.ok(values.stamina >= 50 && values.stamina < 51);
        assert.ok(values.hunger <= 60 && values.hunger > 59);
        assert.equal(values.exhausted, false);
        assert.match(values.notification, /50/);
      } else if (kind === "flow") {
        assert.equal(values.stamina, 100);
        assert.equal(values.exhausted, false);
        assert.equal(values.health, 20);
        assert.ok(values.hunger <= 10 && values.hunger > 9);
        assert.equal(values.buffs.flow, 30);
      } else {
        assert.equal(values.health, 20);
        assert.equal(values.buffs.frenzy, 20);
      }
      await page.waitForTimeout(100);
      assert.deepEqual(
        await page.evaluate(() => ({ ...window.__ABYSSAL__.player.buffs })),
        values.buffs,
      );
      pickups.push(values);
    }
    // 图鉴从首页打开，覆盖两种语言及窄屏新增文案。
    await page.reload();
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.click("#open-guide");
    await page.locator('[data-category="reward"]').click();
    const guide = {};
    for (const kind of ["stamina", "flow", "frenzy"]) {
      await page.locator(`[data-catalog-id="reward_${kind}"]`).click();
      guide[kind] = await page.locator(".guide-info").innerText();
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (kind === "stamina") assert.match(guide[kind], /50/);
      else assert.match(guide[kind], kind === "flow" ? /30/ : /20/);
      if (locale === "en") assert.doesNotMatch(guide[kind], /[\u3400-\u9fff]/);
      await page.locator(".guide-info h3").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${directory}/${width}_${kind}.png` });
    }
    assert.match(
      guide.stamina,
      locale === "en" ? /Vitality Supply/ : /生命补给/,
    );
    assert.match(
      guide.flow,
      locale === "en" ? /refill.*stamina|stamina.*full/i : /回满体力/,
    );
    assert.match(guide.frenzy, /18/);
    assert.match(
      guide.frenzy,
      locale === "en"
        ? /One Vitality Supply and one Ocean Current/
        : /固定放置生命补给与洋流之息各一枚/,
    );
    assert.match(
      guide.frenzy,
      locale === "en"
        ? /Bermuda also has one fixed Frenzy pickup at spawn/
        : /百慕大出生点另有一枚固定狂食/,
    );
    report.checks.push({
      width,
      locale,
      character,
      pool: "20; two starters; 18 balanced random; no guaranteed starter Frenzy; meshes reused",
      pickups,
      guide,
    });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = String(error.stack || error);
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    `${directory}/report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report, null, 2));
