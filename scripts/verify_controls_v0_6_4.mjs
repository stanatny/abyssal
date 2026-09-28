import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 使用真实键盘/触屏验证设置与水面操控；只在指定测试段隔离出生和奖励接触点。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  measurements = [],
  errors = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 667 },
    { width: 320, height: 568 },
  ]) {
    const mobile = viewport.width < 700;
    const page = await browser.newPage({
      viewport,
      isMobile: mobile,
      hasTouch: mobile,
    });
    page.setDefaultTimeout(90000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    await page.click(".expedition-settings summary");
    assert.equal(await page.locator("#menu-invert-y").isChecked(), false);
    await page.check("#menu-invert-y");
    assert.equal(
      await page.evaluate(() => localStorage.getItem("abyssal_invert_y")),
      "on",
    );
    await page.reload();
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    await page.click(".expedition-settings summary");
    assert.equal(await page.locator("#menu-invert-y").isChecked(), true);
    await page.locator("#menu-invert-y").scrollIntoViewIfNeeded();
    const bounds = await page.locator("#menu-invert-y").boundingBox();
    assert.ok(
      bounds.x >= 0 &&
        bounds.x + bounds.width <= viewport.width &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= viewport.height,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: `.local/v6_4_settings_${viewport.width}.png`,
    });
    await page.click("#quality");
    await page.click("#start");
    await clearWater(page);
    const input = await inputDriver(page, mobile);
    for (const [up, sign] of [
      [true, -1],
      [false, 1],
    ]) {
      await page.evaluate(() => {
        window.__ABYSSAL__.setPosition(180, -90, -320);
        window.__ABYSSAL__.setFacing(0, 0);
      });
      await input.start(up);
      await page.waitForFunction(
        (sign) => window.__ABYSSAL__.controls.pitch * sign > 0.3,
        sign,
      );
      await input.end();
      const state = await read(page);
      assert.ok(state.pitch * sign > 0.3);
      measurements.push({ viewport, inverted: true, inputUp: up, ...state });
    }
    checks.push(
      `${viewport.width}px inverted vertical keyboard/touch input, menu bounds and persisted reload`,
    );
    // 通过真实首页控件关闭反转，再检查正常方向与水面姿态；没有直接修改设置变量。
    await page.reload();
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    await page.click(".expedition-settings summary");
    await page.uncheck("#menu-invert-y");
    await page.click("#quality");
    await page.click("#start");
    await clearWater(page);
    await input.start(true);
    await page.waitForFunction(() => window.__ABYSSAL__.controls.pitch > 0.3);
    await input.end();
    const held = await read(page);
    await page.waitForTimeout(200);
    assert.ok(Math.abs((await read(page)).pitch - held.pitch) < 1e-9);
    checks.push(
      `${viewport.width}px default upward input and underwater release preserve free heading`,
    );
    // 起点在水线下，持续真实上仰输入进入水面；未注入水面状态或直接调用约束函数。
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.surface.reset();
      g.setPosition(180, -5, -320);
      g.setFacing(0, (Math.PI * 70) / 180);
    });
    await input.start(true);
    await page.waitForFunction(() => {
      const g = window.__ABYSSAL__;
      return g.position.y > 3.5 && g.controls.pitch < (21 * Math.PI) / 180;
    });
    const atSurface = await read(page);
    assert.ok(
      atSurface.pitch > (19 * Math.PI) / 180 &&
        atSurface.pitch < (21 * Math.PI) / 180,
    );
    assert.equal(atSurface.airborne, false);
    await page.screenshot({
      path: `.local/v6_4_surface_${viewport.width}.png`,
    });
    await input.end();
    await page.click("#pause");
    const paused = await read(page);
    await page.waitForTimeout(200);
    assert.deepEqual(await read(page), paused);
    await page.click("#resume");
    await input.start(false);
    await page.waitForFunction(() => window.__ABYSSAL__.controls.pitch < -0.2);
    await input.end();
    const dive = await read(page);
    assert.ok(dive.y < 3.4);
    measurements.push({ viewport, atSurface, dive });
    checks.push(
      `${viewport.width}px held upward input settles at 20 degrees on waterline; pause and immediate dive work`,
    );
    if (!mobile) await fixedReward(page);
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await writeFile(
    ".local/v6_4_controls_results.json",
    JSON.stringify({ checks, measurements, errors }, null, 2),
  );
  await browser.close();
}
async function read(page) {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      pitch: g.controls.pitch,
      y: g.position.y,
      airborne: g.surface.airborne,
      elapsed: g.elapsed,
    };
  });
}
async function clearWater(page) {
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.entities.forEach((e) => (e.hiddenFor = 999));
    g.encounters.bosses.forEach((b) => (b.enabled = false));
    g.pickups.forEach((p) => (p.cooldown = 999));
    g.setPosition(180, -90, -320);
    g.setFacing(0, 0);
  });
}
async function inputDriver(page, mobile) {
  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  let key;
  return {
    async start(up) {
      if (!mobile) {
        key = up ? "KeyW" : "KeyS";
        await page.keyboard.down(key);
        return;
      }
      const b = await page.locator("#joystick").boundingBox(),
        c = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...c, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: c.x, y: c.y + (up ? -34 : 34), id: 1 }],
      });
    },
    async end() {
      if (mobile)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      else await page.keyboard.up(key);
    },
  };
}
async function fixedReward(page) {
  const start = await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    const p = g.pickups.find((p) => p.id === "nursery_frenzy");
    window.__FIXED_PICKUP__ = p;
    return {
      total: g.pickups.length,
      kind: p.kind,
      id: p.id,
      xyz: p.mesh.position.toArray(),
      baseY: p.baseY,
      cooldown: p.cooldown,
      uuid: p.mesh.uuid,
      visible: p.mesh.visible,
      duplicates: g.pickups.filter((p) => p.id === "nursery_frenzy").length,
    };
  });
  assert.equal(start.total, 35);
  assert.equal(start.kind, "frenzy");
  assert.equal(start.duplicates, 1);
  assert.equal(start.visible, true);
  assert.equal(start.cooldown, 0);
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      p = window.__FIXED_PICKUP__;
    g.setPosition(p.mesh.position.x, p.baseY, p.mesh.position.z + 7);
    g.setFacing(0, 0);
  });
  await page.waitForFunction(() => window.__FIXED_PICKUP__.cooldown > 0);
  const collected = await page.evaluate(() => ({
    buff: window.__ABYSSAL__.player.buffs.frenzy,
    cooldown: window.__FIXED_PICKUP__.cooldown,
    visible: window.__FIXED_PICKUP__.mesh.visible,
  }));
  assert.ok(collected.buff > 29 && collected.buff <= 30);
  assert.ok(collected.cooldown > 44 && collected.cooldown <= 45);
  assert.equal(collected.visible, false);
  await page.click("#pause");
  const cooldown = await page.evaluate(() => window.__FIXED_PICKUP__.cooldown);
  await page.waitForTimeout(250);
  assert.equal(
    await page.evaluate(() => window.__FIXED_PICKUP__.cooldown),
    cooldown,
  );
  await page.click("#resume");
  // 跳至计时末段只验证到期路径；45秒初值和暂停单独通过真实拾取验证。
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(-30, -18, 75);
    g.setFacing(0, 0);
    window.__FIXED_PICKUP__.cooldown = 0.1;
  });
  await page.waitForFunction(
    () =>
      window.__FIXED_PICKUP__.cooldown <= 0 &&
      window.__FIXED_PICKUP__.mesh.visible,
  );
  const respawn = await page.evaluate(() => {
    const p = window.__FIXED_PICKUP__;
    return {
      xyz: p.mesh.position.toArray(),
      baseY: p.baseY,
      uuid: p.mesh.uuid,
    };
  });
  assert.equal(respawn.xyz[0], start.xyz[0]);
  assert.equal(respawn.xyz[2], start.xyz[2]);
  assert.equal(respawn.baseY, start.baseY);
  assert.equal(respawn.uuid, start.uuid);
  for (let attempt = 0; attempt < 3; attempt++) {
    const reset = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.startGame();
      const p = g.pickups.find((p) => p.id === "nursery_frenzy");
      return {
        count: g.pickups.length,
        xyz: p.mesh.position.toArray(),
        baseY: p.baseY,
        uuid: p.mesh.uuid,
        cooldown: p.cooldown,
      };
    });
    assert.equal(reset.count, 35);
    assert.deepEqual(reset.xyz, start.xyz);
    assert.equal(reset.uuid, start.uuid);
    assert.equal(reset.cooldown, 0);
  }
  measurements.push({ start, collected, respawn });
  checks.push(
    "Fixed frenzy pickup grants 30s, starts 45s cooldown, freezes on pause and respawns/restarts on same mesh and anchor",
  );
}
