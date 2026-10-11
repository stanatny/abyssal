import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const url =
  process.env.ABYSSAL_PREVIEW_URL ||
  process.env.ABYSSAL_DEV_URL ||
  "http://127.0.0.1:5188/";
const engine = process.env.ABYSSAL_BROWSER_ENGINE || "chrome";
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/mobile_touch_review";
await mkdir(out, { recursive: true });
const report = {
  at: new Date().toISOString(),
  url,
  engine,
  cases: [],
  errors: [],
  limits: [
    "Desktop Chrome/WebKit touch emulation does not display an iOS/Android system keyboard or prove physical-device zoom behavior.",
    "DEV-only victory is staged through existing game state; result controls then use native input. Compiled builds expose no fixture API.",
    "Chrome swipes use trusted CDP touch events; WebKit covers taps, focus, forms and layout without claiming native iOS gestures.",
  ],
};
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  ...(engine === "webkit" ? {} : { channel: "chrome" }),
  headless: process.env.ABYSSAL_BROWSER_HEADLESS === "1",
});
let currentPage;
async function tap(page, selector, touch) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await locator[touch ? "tap" : "click"]();
}
async function viewport(page) {
  const result = await page.evaluate(() => ({
    scale: visualViewport.scale,
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    focus: document.activeElement.id || document.activeElement.tagName,
  }));
  assert.ok(Math.abs(result.scale - 1) < 0.01, JSON.stringify(result));
  assert.ok(result.documentWidth <= result.width + 1, JSON.stringify(result));
  return result;
}
async function doubleTap(page, selector) {
  await tap(page, selector, true);
  await page.waitForTimeout(70);
  await tap(page, selector, true);
  await page.waitForTimeout(400);
  return viewport(page);
}
async function swipe(page, selector, axis) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width * 0.75,
    y = Math.max(0, box.y) + Math.min(box.height, 220) * 0.8;
  const distance = Math.min(axis === "x" ? box.width * 0.5 : 130, 180);
  const before = await locator.evaluate((e) => [e.scrollLeft, e.scrollTop]);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 8; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: x - (axis === "x" ? (distance * step) / 8 : 0),
          y: y - (axis === "y" ? (distance * step) / 8 : 0),
        },
      ],
    });
    await page.waitForTimeout(25);
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(200);
  await session.detach();
  const after = await locator.evaluate((e) => [e.scrollLeft, e.scrollTop]);
  return { before, after };
}
try {
  const fixtures = [
    [390, 844, "zh-CN", true],
    [320, 568, "en", true],
    [844, 390, "en", true],
    ...(engine === "webkit"
      ? []
      : [
          [1440, 900, "en", false],
          [390, 844, "zh-CN", false],
        ]),
  ];
  for (const [width, height, language, touch] of fixtures) {
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: "reduce",
    });
    currentPage = page;
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.addInitScript(() => {
      window.touchReviewFocus = [];
      document.addEventListener("focusin", (event) => {
        const element = event.target;
        if (
          element.matches(
            'input:not([type="checkbox"]),textarea,[contenteditable="true"]',
          )
        )
          window.touchReviewFocus.push(element.id || element.tagName);
      });
    });
    await page.goto(url);
    await page.waitForFunction(
      () => document.querySelector("#region-loading").hidden,
    );
    await page.selectOption("[data-language-select]", language);
    const dev = await page.evaluate(() => !!window.__ABYSSAL__);
    if (process.env.ABYSSAL_PREVIEW_URL) assert.equal(dev, false);
    const row = { width, height, language, touch, dev, checks: [] };
    report.cases.push(row);
    assert.equal(
      await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
      touch,
    );
    if (touch) {
      row.home = await doubleTap(page, "#menu h1");
      // 首次声音点击只激活音频图；先完成该既有初始化，再检验连续两次切换。
      await tap(page, "#sound", true);
      const sound = await page.locator("#sound").textContent();
      await doubleTap(page, "#sound");
      assert.equal(await page.locator("#sound").textContent(), sound);
      row.checks.push(
        "Double taps retain scale; both sound-button taps activate",
      );
    }
    await page.screenshot({
      path: `${out}/home_${width}_${height}_${language}_${touch}.png`,
    });
    for (const selector of ["#region-select", "#character-select"]) {
      await tap(page, selector, touch);
      if (touch) await doubleTap(page, "#expedition-picker h2");
      await tap(page, ".picker-close", touch);
    }
    await tap(page, "#open-guide", touch);
    const input = page.locator("#guide-search");
    if (touch) {
      assert.equal(await input.isVisible(), false);
      assert.equal(await input.isDisabled(), true);
      await input.evaluate((e) => e.focus());
      assert.notEqual(
        await page.evaluate(() => document.activeElement.id),
        "guide-search",
      );
      row.guide = await doubleTap(page, "#guide-title");
      row.checks.push("Touch Guide has no editable search or search focus");
    } else {
      await input.fill(language === "en" ? "Orca" : "虎鲸");
      assert.ok((await page.locator(".guide-entry").count()) > 0);
      await input.fill("");
      row.checks.push(
        "Desktop search remains editable, including narrow windows",
      );
    }
    await page.selectOption("#guide-region", "mariana");
    await tap(page, '[data-category="player"]', touch);
    await tap(page, '.guide-entry[data-kind="zombie_shark"]', touch);
    assert.match(
      await page.locator(".guide-info").textContent(),
      language === "en" ? /Zombie Shark/ : /丧尸鲨鱼/,
    );
    if (touch) {
      const textFields = await page.evaluate(() =>
        [...document.querySelectorAll('input:not([type="checkbox"]),textarea')]
          .filter((e) => !e.disabled && e.getClientRects().length)
          .map((e) => e.id),
      );
      assert.deepEqual(textFields, []);
      assert.ok(
        Number.parseFloat(
          await page
            .locator("#guide-region")
            .evaluate((e) => getComputedStyle(e).fontSize),
        ) >= 16,
      );
      if (engine === "chrome" && width < 500) {
        row.filterSwipe = await swipe(page, ".guide-filters", "x");
        assert.ok(row.filterSwipe.after[0] > row.filterSwipe.before[0] + 5);
        row.detailSwipe = await swipe(page, ".guide-content", "y");
        assert.ok(row.detailSwipe.after[1] > row.detailSwipe.before[1] + 5);
        row.checks.push(
          "Trusted touch swipes retain horizontal filters and vertical details",
        );
      }
    }
    await viewport(page);
    await page.screenshot({
      path: `${out}/guide_${width}_${height}_${language}_${touch}.png`,
    });
    await tap(page, ".guide-close", touch);
    await tap(page, "#start", touch);
    await page.locator("#pause").waitFor({ state: "visible" });
    if (touch) {
      await doubleTap(page, "#ocean");
      if (engine === "chrome") {
        await swipe(page, "#joystick", "x");
        if (dev)
          assert.deepEqual(
            await page.evaluate(() => window.__ABYSSAL__.controls.pointer),
            { x: 0, y: 0 },
          );
      }
    }
    await tap(page, "#pause", touch);
    await tap(page, "#overlay-help summary", touch);
    if (touch) await doubleTap(page, "#overlay-title");
    await tap(page, "#resume", touch);
    if (dev) {
      // 仅隔离结果界面：设置夏威夷通关条件，仍由实际终局状态机和原生控件接续。
      await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        g.player.invulnerable = 999;
        g.setLength(30);
        for (const boss of g.encounters.bosses)
          if (boss.enabled) boss.state.defeated = true;
      });
      await page.locator("#run-name").waitFor({ state: "visible" });
      assert.notEqual(
        await page.evaluate(() => document.activeElement.id),
        "run-name",
      );
      await tap(page, "#run-name", touch);
      await page.keyboard.insertText(
        language === "en" ? "Touch Explorer" : "触屏探索者",
      );
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "run-name",
      );
      assert.ok(
        Number.parseFloat(
          await page
            .locator("#run-name")
            .evaluate((e) => getComputedStyle(e).fontSize),
        ) >= 16,
      );
      await tap(page, '.run-name-form button[type="submit"]', touch);
      assert.notEqual(
        await page.evaluate(() => document.activeElement.id),
        "run-name",
      );
      row.checks.push(
        "Staged victory does not autofocus name; manual name entry saves and blurs",
      );
      await page.screenshot({
        path: `${out}/name_saved_${width}_${height}_${language}_${touch}.png`,
      });
      await tap(page, ".run-result-board", touch);
      assert.match(
        await page.locator("#run-board tbody").textContent(),
        language === "en" ? /Touch Explorer/ : /触屏探索者/,
      );
      await tap(page, ".run-board-close", touch);
    } else await tap(page, "#pause", touch);
    await tap(page, "#return-menu", touch);
    await tap(page, "#open-records", touch);
    if (touch) await doubleTap(page, "#run-board-title");
    await tap(page, ".run-board-close", touch);
    row.focusedInputs = await page.evaluate(() => window.touchReviewFocus);
    if (touch) assert.ok(row.focusedInputs.every((id) => id === "run-name"));
    row.checks.push(
      "Play, pause/help, resume, Home and board retain native controls and focus",
    );
    row.final = await viewport(page);
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("#region-loading").hidden,
    );
    await tap(page, "#open-guide", touch);
    assert.equal(await page.locator("#guide-search").isDisabled(), touch);
    await tap(page, ".guide-close", touch);
    row.checks.push("Same-address refresh retains input policy");
    await page.close();
    console.log(`PASS ${engine} ${width}x${height} ${language} touch=${touch}`);
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  }
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (error) {
  report.failure = error.stack;
  await currentPage?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
