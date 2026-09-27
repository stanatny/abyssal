import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 真实触摸与键盘操作覆盖菜单、标记设置和长按；iOS系统菜单仍需真机验证。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178";
const checks = [],
  errors = [],
  measurements = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 390, height: 667 },
  ]) {
    const mobile = viewport.width < 700;
    const context = await browser.newContext({
      viewport,
      hasTouch: mobile,
      isMobile: mobile,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    assert.equal(await page.locator("#region-select").inputValue(), "hawaii");
    assert.equal(
      await page.locator("#region-select option:disabled").count(),
      3,
    );
    assert.equal(await page.locator("#character-select").inputValue(), "orca");
    const menuBounds = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      menu: document.querySelector("#menu").scrollWidth,
      viewport: innerWidth,
      copyLeft: document.querySelector(".menu-copy").getBoundingClientRect()
        .left,
    }));
    assert.ok(
      menuBounds.document <= viewport.width &&
        menuBounds.menu <= viewport.width,
    );
    assert.ok(
      menuBounds.copyLeft >= 19,
      "Menu copy must stay within the left inset",
    );
    measurements.push({ viewport, menuBounds });
    await page.screenshot({
      path: `.local/v4_menu_${viewport.width}_${viewport.height}.png`,
    });
    await page.locator(".expedition-settings summary").click();
    await page.locator("#menu-markers").uncheck();
    await page.reload();
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    assert.equal(await page.locator("#menu-markers").isChecked(), false);
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.markersEnabled),
      false,
    );
    await page.locator(".expedition-settings summary").click();
    await page.locator("#menu-markers").check();
    await page.click("#open-guide");
    await page.click('.guide-filters [data-category="player"]');
    assert.equal(await page.locator(".guide-entry").count(), 2);
    assert.match(
      await page.locator('.guide-filters [data-category="player"]').innerText(),
      /可选角色/,
    );
    assert.match(await page.locator(".guide-info").innerText(), /虎鲸/);
    await page.locator("#guide-search").fill("虎鲸");
    assert.equal(await page.locator("#guide-search").inputValue(), "虎鲸");
    // 图鉴检索框保留正常编辑，不被全站长按拦截影响。
    assert.equal(
      await page
        .locator("#guide-search")
        .evaluate((input) =>
          input.dispatchEvent(
            new Event("selectstart", { bubbles: true, cancelable: true }),
          ),
        ),
      true,
    );
    await page.click(".guide-close");
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.equal(await page.locator("#touch-bite").count(), 0);
    assert.equal(await page.locator("#touch-sonar").count(), 1);
    await page.evaluate(() => {
      const game = window.__ABYSSAL__;
      game.player.invulnerable = 999;
      game.entities.forEach((entry) => (entry.hiddenFor = 999));
      game.pickups.forEach((entry) => (entry.cooldown = 999));
    });
    if (mobile) {
      const target = page.locator("#touch-boost");
      const box = await target.boundingBox();
      assert.ok(box && box.x >= 0 && box.y + box.height <= viewport.height);
      const session = await context.newCDPSession(page);
      const stamina = await page.evaluate(
        () => window.__ABYSSAL__.player.stamina,
      );
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 },
        ],
      });
      await page.waitForTimeout(1300);
      const whileHeld = await page.evaluate(() => ({
        stamina: window.__ABYSSAL__.player.stamina,
        selection: getSelection().toString(),
        selected: document.querySelector("#touch-boost").matches(":active"),
        blocked: ["contextmenu", "selectstart", "copy", "paste"].every(
          (name) =>
            !document
              .querySelector("#touch-boost")
              .dispatchEvent(
                new Event(name, { bubbles: true, cancelable: true }),
              ),
        ),
        style: getComputedStyle(document.querySelector("#touch-boost"))
          .userSelect,
      }));
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      assert.ok(
        whileHeld.stamina < stamina - 3,
        "Holding the touch button must sprint",
      );
      assert.equal(whileHeld.selection, "");
      assert.equal(whileHeld.style, "none");
      assert.equal(whileHeld.blocked, true);
      const afterRelease = await page.evaluate(
        () => window.__ABYSSAL__.player.stamina,
      );
      await page.waitForTimeout(400);
      assert.ok(
        (await page.evaluate(() => window.__ABYSSAL__.player.stamina)) >
          afterRelease,
      );
      assert.equal(await page.locator("#touch-markers").count(), 0);
      await page.tap("#touch-sonar");
      await page.waitForFunction(
        () => window.__ABYSSAL__.sonar.snapshot.active,
      );
      assert.equal(
        await page.locator("#touch-sonar").getAttribute("aria-disabled"),
        "true",
      );
      assert.equal(
        await page.locator("#touch-sonar").getAttribute("data-state"),
        "active",
      );
      assert.match(await page.locator("#touch-sonar").innerText(), /声呐/);
      assert.equal(await page.locator("#touch-sonar").isDisabled(), true);
      const activatedAt = await page.evaluate(
        () => window.__ABYSSAL__.sonar.state.activatedAt,
      );
      const skill = await page.locator("#touch-sonar").boundingBox();
      await page.touchscreen.tap(
        skill.x + skill.width / 2,
        skill.y + skill.height / 2,
      );
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.sonar.state.activatedAt),
        activatedAt,
      );
      assert.ok(
        Number(
          await page.locator("#touch-sonar").getAttribute("data-remaining"),
        ) > 50,
      );
      measurements.push({ viewport, whileHeld });
      checks.push(
        `${viewport.width}x${viewport.height}: touch hold/release works without selection; sonar visibly disables with countdown and rejects repeated taps`,
      );
    } else {
      // 故意制造一帧250ms阻塞：远征计时仍走真实活跃时间，物理步长仍保持安全上限。
      const before = await page.evaluate(() => {
        const elapsed = window.__ABYSSAL__.player.elapsed;
        const until = performance.now() + 250;
        while (performance.now() < until) {
          /* 模拟低帧率。 */
        }
        return elapsed;
      });
      await page.waitForTimeout(100);
      assert.ok(
        (await page.evaluate(() => window.__ABYSSAL__.player.elapsed)) -
          before >=
          0.25,
      );
      checks.push(
        "A stalled frame advances the real expedition clock without extending the 30-minute cap",
      );
    }
    await page.click("#pause");
    assert.equal(await page.locator("#pause-markers").count(), 0);
    await page.click("#resume");
    const hudBounds = await page.evaluate(() => {
      const timer = document
        .querySelector("#round-clock")
        .getBoundingClientRect();
      const mission = document
        .querySelector(".mission")
        .getBoundingClientRect();
      const hint = document
        .querySelector("#breach-hint")
        .getBoundingClientRect();
      const overlaps = (a, b) =>
        a.left < b.right &&
        a.right > b.left &&
        a.top < b.bottom &&
        a.bottom > b.top;
      return {
        timerInsideMission:
          timer.left >= mission.left &&
          timer.right <= mission.right &&
          timer.top >= mission.top &&
          timer.bottom <= mission.bottom,
        timerHintOverlap: overlaps(timer, hint),
      };
    });
    assert.equal(hudBounds.timerInsideMission, true);
    assert.equal(hudBounds.timerHintOverlap, false);
    measurements.push({ viewport, hudBounds });
    await page.screenshot({
      path: `.local/v4_hud_${viewport.width}_${viewport.height}.png`,
    });
    checks.push(
      `${viewport.width}x${viewport.height}: region/character menu, editable guide and persistent marker settings pass`,
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await writeFile(
    ".local/v4_controls_verification.json",
    JSON.stringify({ checks, errors, measurements }, null, 2),
  );
  await browser.close();
}
