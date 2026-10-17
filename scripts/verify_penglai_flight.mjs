import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const out =
  process.env.ABYSSAL_FLIGHT_OUT || ".local/penglai_flight_20261017/native";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false }),
  report = {
    browser: browser.version(),
    keyboard: [],
    touch: [],
    errors: [],
    method:
      "Native headed Chrome with real keyboard/CDP touch input and original populated world. Initial clear-route placement only; no stamina, speed, time, weather, NPC or collision override. Desktop touch emulation is not physical-phone evidence.",
  };
let context, page;
const snapshot = () =>
  page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      y: g.position.y,
      position: g.position.toArray(),
      elapsed: g.elapsed,
      stamina: g.player.stamina,
      speed: g.controls.speed,
      pitch: g.controls.pitch,
      forward: g.forward.toArray(),
      mode: document.querySelector("#movement-mode").textContent,
      airborne: g.surface.airborne,
    };
  });
const choose = async (selector, value) => {
  if ((await page.$eval(selector, (e) => e.value)) === value) return;
  await page.click(selector);
  await page.click(`[data-choice-value="${value}"]`);
  await page.waitForFunction(
    ({ selector, value }) =>
      document.querySelector(selector).value === value &&
      !window.__ABYSSAL__.regionLoading,
    { selector, value },
  );
};
const open = async (touch = false) => {
  context = await browser.newContext(
    touch
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
        }
      : { viewport: { width: 1280, height: 800 } },
  );
  page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await page.selectOption("[data-language-select]", "en");
  await choose("#region-select", "penglai");
};
const start = async (character) => {
  await choose("#character-select", character);
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.click("#pause");
};
const place = async (y = 150, pitch = Math.PI / 6) =>
  page.evaluate(
    ({ y, pitch }) => {
      const g = window.__ABYSSAL__;
      g.setPosition(-520, y, 100);
      g.setFacing(0, pitch);
    },
    { y, pitch },
  );
const measure = async (name, duration, key) => {
  const before = await snapshot();
  if (key) await page.keyboard.down(key);
  await page.waitForTimeout(duration);
  if (key) await page.keyboard.up(key);
  const after = await snapshot();
  return {
    name,
    before,
    after,
    activeSeconds: after.elapsed - before.elapsed,
    deltaY: after.y - before.y,
  };
};
try {
  await open();
  assert.match(await page.locator(".intro").innerText(), /sprint to climb/i);
  for (const character of [
    "orca",
    "squid",
    "zombie_shark",
    "mechanical_shark",
  ]) {
    await start(character);
    await place();
    await page.keyboard.press("KeyP");
    const cruise = await measure("cruise", 1600);
    assert.ok(cruise.deltaY < 0);
    assert.ok(
      Math.abs(cruise.deltaY / cruise.activeSeconds + 1.0458689) < 0.03,
    );
    assert.equal(cruise.after.mode, "Cloud glide");
    const slow = await measure("slow", 1600, "KeyK");
    assert.ok(slow.deltaY / slow.activeSeconds < -3);
    assert.equal(slow.after.mode, "Fast descent");
    const onlySprint = await measure(
      "sprint without upward input",
      500,
      "Space",
    );
    assert.ok(onlySprint.deltaY <= 0);
    assert.ok(onlySprint.after.forward[1] <= 0);
    await page.keyboard.down("KeyW");
    const sprint = await measure("sprint with upward input", 3000, "Space");
    await page.keyboard.up("KeyW");
    assert.ok(sprint.deltaY > 35);
    assert.ok(sprint.after.stamina < sprint.before.stamina - 35);
    const beforeRecovery = await snapshot();
    await page.waitForFunction(() => window.__ABYSSAL__.player.stamina >= 100);
    const afterRecovery = await snapshot();
    assert.ok(afterRecovery.y < beforeRecovery.y);
    assert.ok(afterRecovery.y > cruise.before.y + 25);
    const repeatedOnlySprint = await measure(
      "repeat sprint without upward input",
      500,
      "Space",
    );
    assert.ok(repeatedOnlySprint.deltaY <= 0);
    assert.ok(repeatedOnlySprint.after.forward[1] <= 0);
    await page.keyboard.down("KeyW");
    const second = await measure("second directed sprint", 1500, "Space");
    await page.keyboard.up("KeyW");
    assert.ok(second.deltaY > 17);
    await page.keyboard.press("KeyP");
    const frozen = await snapshot();
    await page.waitForTimeout(250);
    assert.deepEqual(await snapshot(), frozen);
    await page.click("#overlay-help summary");
    assert.match(
      await page.locator("#overlay-flight").innerText(),
      /Only sprinting can climb/,
    );
    await page.screenshot({ path: `${out}/${character}_help.png` });
    report.keyboard.push({
      character,
      cruise,
      slow,
      onlySprint,
      repeatedOnlySprint,
      sprint,
      recovery: { before: beforeRecovery, after: afterRecovery },
      second,
      pause: true,
    });
    await page.click("#return-menu");
    console.log(
      `${character}: glide, Slow, two resource-paid climbs and pause passed`,
    );
  }
  // 最大体型的真实天空边界，不扩大天花板或关掉地形。
  await start("mechanical_shark");
  await page.evaluate(() => window.__ABYSSAL__.setLength(30));
  await place(590, Math.PI / 3);
  await page.keyboard.press("KeyP");
  await page.keyboard.down("Space");
  await page.waitForTimeout(1600);
  await page.keyboard.up("Space");
  const ceiling = await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      y: g.position.y,
      maximum: g.surface.ceilingHeight(g.player.length, g.forward),
      health: g.player.health,
    };
  });
  assert.ok(ceiling.y <= ceiling.maximum + 1e-6);
  report.ceiling = ceiling;
  await page.keyboard.press("KeyP");
  await page.click("#return-menu");
  await choose("#region-select", "hawaii");
  await start("mechanical_shark");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(180, -90, -320);
    g.setFacing(0, Math.PI / 6);
  });
  assert.equal(await page.locator("#overlay-flight").isHidden(), true);
  await page.keyboard.press("KeyP");
  const otherWater = await measure("Hawaii unchanged water ascent", 1200);
  assert.ok(otherWater.deltaY > 6);
  report.otherWater = otherWater;
  await context.close();

  await open(true);
  await start("mechanical_shark");
  await place(-18, 0);
  await page.keyboard.press("KeyP");
  const cdp = await context.newCDPSession(page),
    center = async (selector) => {
      const b = await page.locator(selector).boundingBox();
      assert.ok(b);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 };
    },
    down = async (...points) =>
      cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: points,
      }),
    up = async () =>
      cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
  const stick = await center("#joystick");
  await down({ ...stick, y: stick.y - 30 });
  await page.waitForTimeout(900);
  await up();
  assert.ok((await snapshot()).pitch > 0.5);
  await page.waitForFunction(() => window.__ABYSSAL__.position.y >= 3.99);
  const gate = await snapshot();
  await page.waitForTimeout(450);
  assert.ok((await snapshot()).y <= 4 + 1e-6);
  report.touch.push({ name: "unpowered waterline blocks ascent", gate });
  const boost = await center("#touch-boost");
  await down(boost);
  await page.waitForTimeout(2100);
  await up();
  const climbed = await snapshot();
  assert.ok(climbed.y > 45 && climbed.stamina < 80);
  const glide = await measure("touch release glide", 1500);
  assert.ok(glide.deltaY < -1.4 && glide.after.stamina > climbed.stamina);
  await down(await center("#touch-slow"));
  const falling = await measure("touch Slow fall", 1200);
  assert.ok(falling.deltaY < -3.4);
  await up();
  // 释放到按钮外仍清除 Slow，不能把快速下坠锁进下一次冲刺。
  await page.waitForFunction(
    () =>
      document.querySelector("#touch-slow").getAttribute("aria-pressed") ===
      "false",
  );
  await down(await center("#touch-boost"));
  const onlyBoost = await measure("touch boost without direction", 600);
  assert.ok(onlyBoost.deltaY <= 0 && onlyBoost.after.forward[1] <= 0);
  await up();
  await down(
    { ...stick, y: stick.y - 40, id: 2 },
    await center("#touch-boost"),
  );
  const reclimb = await measure("touch upward stick plus boost", 1800);
  assert.ok(reclimb.deltaY > 20);
  await up();
  report.touch.push({
    name: "native touch climb/glide/Slow/reclimb",
    climbed,
    glide,
    falling,
    onlyBoost,
    reclimb,
  });
  await page.screenshot({ path: `${out}/touch_glide.png` });
  await page.click("#pause");
  const frozen = await snapshot();
  await page.waitForTimeout(200);
  assert.deepEqual(await snapshot(), frozen);
  await page.click("#return-menu");
  await page.selectOption("[data-language-select]", "zh-CN");
  await start("mechanical_shark");
  assert.equal((await snapshot()).stamina, 100);
  assert.ok((await snapshot()).y < 0);
  await page.click("#overlay-help summary");
  assert.match(
    await page.locator("#overlay-flight").innerText(),
    /只有冲刺能向上爬升/,
  );
  await page.screenshot({ path: `${out}/touch_zh_help.png` });
  await page.click("#return-menu");
  await start("mechanical_shark");
  assert.equal((await snapshot()).stamina, 100);
  assert.ok((await snapshot()).y < 0);
  report.restart = true;
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
  if (page && !page.isClosed())
    await page.screenshot({ path: `${out}/failed.png` });
  console.error(e);
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      keyboard: report.keyboard.length,
      touch: report.touch.length,
      error: report.error,
    }),
  );
}
