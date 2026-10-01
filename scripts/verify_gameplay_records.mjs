import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const out = process.env.ABYSSAL_REVIEW_OUT || ".local/gameplay_review";
await mkdir(out, { recursive: true });
const report = {
  at: new Date().toISOString(),
  checks: [],
  ecology: [],
  errors: [],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5240/";
async function choose(page, control, value) {
  await page.click(control);
  await page.click(`[data-choice-value="${value}"]`);
  await page.locator("#region-loading").waitFor({ state: "hidden" });
}
async function settle(page) {
  // 明确设置完成前提，再让正式目标状态机结算；此处验证界面，不冒充自然通关。
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.player.elapsed = 753.42;
    g.setLength(30);
    for (const boss of g.encounters.bosses) {
      if (!boss.enabled) continue;
      boss.state.defeated = true;
      boss.mesh.visible = false;
    }
    g.player.bossesDefeated = 4;
    g.setPosition(0, -2735, -430);
    g.setFacing(0, -0.25);
  });
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "won");
}
try {
  for (const [width, height, locale, character, touch] of [
    [1440, 900, "en", "orca", false],
    [390, 667, "zh-CN", "squid", true],
    [568, 320, "en", "squid", true],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale,
      hasTouch: touch,
      isMobile: touch,
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") report.errors.push(e.text());
    });
    await page.goto(url);
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    await page.locator("#region-loading").waitFor({ state: "hidden" });
    if (!touch) {
      for (const region of ["hawaii", "atlantis", "bermuda", "mariana"]) {
        await choose(page, "#region-select", region);
        const ecology = await page.evaluate(async () => {
          const g = window.__ABYSSAL__,
            { hungerDrainRate, createPlayer, consumePrey } = await import(
              "/src/simulation.js"
            );
          const living = g.entities.filter((e) => !e.hiddenFor);
          return {
            region: g.expedition.region.id,
            count: living.length,
            nurseryFood: living.filter(
              (e) =>
                e.species.length < 3 &&
                e.mesh.position.distanceTo(g.position) < 65,
            ).length,
            levels: [3, 6, 10, 16, 25, 30].map((length) => {
              const prey = living.filter(
                (e) =>
                  e.species.length < length &&
                  (length < 6
                    ? -e.mesh.position.y < 100
                    : length < 16
                      ? -e.mesh.position.y < 400
                      : -e.mesh.position.y > 150),
              );
              const foods = prey
                .map((e) => {
                  const p = createPlayer();
                  p.length = length;
                  p.mass = (length / 6) ** 3;
                  p.hunger = 0;
                  consumePrey(p, e.species);
                  return {
                    kind: e.species.kind,
                    nutrition: p.lastMeal.nutrition,
                    reserve:
                      p.lastMeal.nutrition /
                      hungerDrainRate(length, -e.mesh.position.y),
                    x: e.mesh.position.x,
                    y: e.mesh.position.y,
                    z: e.mesh.position.z,
                  };
                })
                .sort((a, b) => b.reserve - a.reserve);
              return {
                length,
                preyCount: prey.length,
                substantialCount: foods.filter((f) => f.reserve >= 15).length,
                examples: foods.slice(0, 6),
              };
            }),
          };
        });
        assert.equal(
          ecology.count,
          { hawaii: 313, atlantis: 412, bermuda: 341, mariana: 333 }[region],
        );
        assert.ok(ecology.nurseryFood >= 20, JSON.stringify(ecology));
        for (const stage of ecology.levels)
          assert.ok(stage.substantialCount >= 3, JSON.stringify(stage));
        report.ecology.push(ecology);
      }
    } else await choose(page, "#region-select", "mariana");
    await choose(page, "#character-select", character);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.click("#pause");
    assert.equal(await page.locator("#run-record").isVisible(), false);
    await page.click("#resume");
    await settle(page);
    const record = await page.evaluate(
      () => JSON.parse(localStorage.getItem("abyssal-runs-v1")).rows[0],
    );
    assert.equal(record.character, character);
    assert.equal(record.region, "mariana");
    await page
      .locator("#run-name")
      .fill(locale === "en" ? "Ocean Explorer" : "海底探索者");
    await page.locator(".run-name-form button").click();
    await page.screenshot({ path: `${out}/mariana_result_${width}.png` });
    await page.click(".run-result-board");
    assert.match(
      await page.locator("#run-board tbody").innerText(),
      character === "orca"
        ? /Orca/
        : locale === "en"
          ? /Giant Squid/
          : /大王乌贼/,
    );
    await page.locator("#run-board tbody").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/mariana_board_${width}.png` });
    const close = await page.locator(".run-board-close").boundingBox();
    assert.ok(close.y >= 0 && close.y + close.height <= height);
    await page.click(".run-board-close");
    for (const selector of ["#visit-refuge", "#resume", "#return-menu"]) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(
        box && box.y >= 0 && box.y + box.height <= height && box.height >= 44,
        selector + JSON.stringify(box),
      );
    }
    await page.click("#visit-refuge");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "epilogue");
    const before = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        time: g.player.elapsed,
        health: g.player.health,
        hunger: g.player.hunger,
        eaten: g.player.eaten,
        position: g.position.toArray(),
        yaw: g.controls.yaw,
        frame: g.renderer.info.render.frame,
      };
    });
    if (touch) {
      const stick = await page.locator("#joystick").boundingBox(),
        session = await page.context().newCDPSession(page);
      const x = stick.x + stick.width / 2,
        y = stick.y + stick.height / 2;
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + 30, y: y - 16 }],
      });
      await page.waitForTimeout(1200);
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await session.detach();
    } else {
      await page.keyboard.down("KeyD");
      await page.waitForTimeout(1100);
      await page.keyboard.up("KeyD");
    }
    const after = await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return {
        time: g.player.elapsed,
        health: g.player.health,
        hunger: g.player.hunger,
        eaten: g.player.eaten,
        position: g.position.toArray(),
        yaw: g.controls.yaw,
        frame: g.renderer.info.render.frame,
        egg: g.scene.getObjectByName("yellow_sponge_easter_egg")?.visible,
        refuge: g.scene.getObjectByName("mariana_bottom_refuge")?.visible,
      };
    });
    for (const k of ["time", "health", "hunger", "eaten"])
      assert.equal(after[k], before[k], k);
    assert.ok(Math.abs(after.yaw - before.yaw) > 0.1);
    assert.ok(
      Math.hypot(...after.position.map((v, i) => v - before.position[i])) > 1,
    );
    assert.ok(after.frame > before.frame + 5);
    assert.equal(after.egg, true);
    assert.equal(after.refuge, true);
    await page.screenshot({ path: `${out}/refuge_native_${width}.png` });
    if (!touch) {
      // 近景构图只作为原始彩蛋的渲染检查，真实操控通过性由上面的按键测试单独证明。
      await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        g.setPosition(20, -2755, -411);
        g.setFacing(0.4, -0.2);
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${out}/refuge_close_${width}.png` });
    }
    await page.click("#pause");
    assert.equal(await page.evaluate(() => window.__ABYSSAL__.mode), "won");
    await page.waitForTimeout(200);
    const paused = await page.evaluate(
      () => window.__ABYSSAL__.renderer.info.render.frame,
    );
    await page.waitForTimeout(350);
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.renderer.info.render.frame),
      paused,
    );
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("abyssal-runs-v1")).rows.length,
      ),
      1,
    );
    await page.click("#return-menu");
    await page.reload();
    await page.locator("#region-loading").waitFor({ state: "hidden" });
    await page.click("#open-records");
    await page.click('[data-run-region="mariana"]');
    assert.equal(await page.locator("#run-board tbody tr").count(), 1);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    report.checks.push(
      `${width}x${height} ${locale} ${character}: native record name, character, reload, board scroll/close, reachable actions, real ${touch ? "touch" : "keyboard"} refuge movement, frozen results and idle rendering; victory prerequisite staged`,
    );
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    `${out}/gameplay_report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
  console.log(
    JSON.stringify({ checks: report.checks, errors: report.errors }, null, 2),
  );
}
