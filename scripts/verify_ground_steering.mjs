import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const out = process.env.ABYSSAL_REVIEW_OUT || ".local/ground_steering_review";
await mkdir(out, { recursive: true });
const report = { at: new Date().toISOString(), cases: [], errors: [] };
const browser = await chromium.launch({ channel: "chrome", headless: true });
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5240";
async function choose(page, id, value) {
  await page.click(id);
  await page.click(`[data-choice-value="${value}"]`);
  await page.locator("#region-loading").waitFor({ state: "hidden" });
}
try {
  for (const [character, touch, locale] of [
    ["orca", false, "en"],
    ["squid", true, "zh-CN"],
  ]) {
    const page = await browser.newPage({
      viewport: touch
        ? { width: 390, height: 667 }
        : { width: 1440, height: 900 },
      isMobile: touch,
      hasTouch: touch,
      locale,
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.locator("#region-loading").waitFor({ state: "hidden" });
    await choose(page, "#character-select", character);
    for (const region of ["hawaii", "atlantis", "bermuda", "mariana"].filter(
      (r) => !process.env.ABYSSAL_REGION || r === process.env.ABYSSAL_REGION,
    )) {
      await choose(page, "#region-select", region);
      await page.click("#start");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
      for (const length of [3.2, 30]) {
        const start = await page.evaluate(async (length) => {
          const g = window.__ABYSSAL__,
            { bodyRadius, isPositionBlocked } = await import(
              "/src/collision.js"
            );
          g.entities.forEach((e) => (e.hiddenFor = 999));
          g.encounters.bosses.forEach((b) => (b.enabled = false));
          g.player.health = g.player.hunger = 100;
          g.setLength(length);
          const r = bodyRadius(length),
            extent = Math.max(0, length * 0.42 - r),
            all = [...g.ocean.colliders, ...(g.ocean.barriers || [])];
          const { seabedHeight } = await import("/src/ocean.js");
          const height = g.ocean.heightAt || seabedHeight;
          // 受控触底场景使用真实海床和碰撞；不更改实际建筑或门禁。
          let found;
          for (const z of [20, -50, -120, -220, -320, -500]) {
            for (const x of [-120, 80, 140, -80, 0, 40, -40]) {
              if (
                z < g.expedition.region.world?.minZ ||
                x > g.expedition.region.world?.maxX
              )
                continue;
              const floor = height(x, z),
                p = { x, y: floor + r + extent + 1, z };
              if (floor > -20 || Math.abs(height(x, z - 6) - floor) > 3)
                continue;
              const clear = [p, { x, y: p.y, z: z - 18 }].every((at) =>
                [
                  { x: 0, y: -1, z: 0 },
                  { x: 0, y: 0, z: -1 },
                ].every(
                  (forward) =>
                    !isPositionBlocked(at, {
                      colliders: all,
                      radius: r,
                      length,
                      forward,
                    }),
                ),
              );
              if (clear) {
                found = p;
                break;
              }
            }
            if (found) break;
          }
          if (!found) throw new Error("No legal floor staging point");
          g.setPosition(found.x, found.y, found.z);
          g.setFacing(0, (-85 * Math.PI) / 180);
          return found;
        }, length);
        console.log(JSON.stringify({ region, character, length, start }));
        await page
          .waitForFunction(
            () => window.__ABYSSAL__.controls.pitch > -0.04,
            null,
            { timeout: 10000 },
          )
          .catch(async (e) => {
            console.log(
              await page.evaluate(() => {
                const g = window.__ABYSSAL__;
                return {
                  position: g.position,
                  controls: g.controls,
                  collision: g.lastCollision,
                  mode: g.mode,
                  floor: g.ocean.heightAt?.(g.position.x, g.position.z),
                };
              }),
            );
            await page.screenshot({ path: `${out}/failure.png` });
            throw e;
          });
        await page.waitForTimeout(350);
        const end = await page.evaluate(() => ({
          position: window.__ABYSSAL__.position.toArray(),
          ...window.__ABYSSAL__.controls,
          stuck: window.__ABYSSAL__.lastCollision.stuck,
        }));
        assert.equal(end.stuck, false);
        assert.ok(end.position[2] < start.z - 1);
        assert.ok(end.pitch >= -0.04);
        report.cases.push({ region, character, length, start, end });
      }
      if (region === "atlantis") {
        await page.evaluate(() => {
          const g = window.__ABYSSAL__;
          g.setLength(3.2);
          const c = g.ocean.colliders.find(
            (c) => c.kind === "harbor_ruin_deck",
          );
          g.setPosition(c.x, c.y + c.halfSize.y + 2.4, c.z);
          g.setFacing(0, (-85 * Math.PI) / 180);
        });
        await page.waitForFunction(
          () => window.__ABYSSAL__.controls.groundRecovering,
        );
        await page.waitForFunction(
          () => window.__ABYSSAL__.controls.pitch > -0.03,
        );
        await page.screenshot({
          path: `${out}/atlantis_floor_${character}.png`,
        });
        report.cases.push({
          region,
          character,
          case: "actual harbor stone deck recovery",
        });
        // 原生输入可以立即抬头和转向；触屏由 CDP 真实手势经过摇杆监听。
        const before = await page.evaluate(() => ({
          ...window.__ABYSSAL__.controls,
        }));
        if (touch) {
          const b = await page.locator("#joystick").boundingBox(),
            c = await page.context().newCDPSession(page),
            x = b.x + b.width / 2,
            y = b.y + b.height / 2;
          await c.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x, y }],
          });
          await c.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + 20, y: y - 25 }],
          });
          await page.waitForTimeout(350);
          await c.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          });
          await c.detach();
        } else {
          await page.keyboard.down("KeyW");
          await page.keyboard.down("KeyD");
          await page.waitForTimeout(350);
          await page.keyboard.up("KeyW");
          await page.keyboard.up("KeyD");
        }
        const after = await page.evaluate(() => ({
          ...window.__ABYSSAL__.controls,
        }));
        assert.ok(after.pitch > before.pitch + 0.1);
        assert.ok(after.yaw < before.yaw - 0.1);
        report.cases.push({
          region,
          character,
          case: touch ? "native touch escape" : "native keyboard escape",
          before,
          after,
        });
        await page.evaluate(() => {
          const g = window.__ABYSSAL__;
          g.setPosition(150, -40, -320);
          g.setFacing(0, -1.4);
        });
        await page.waitForTimeout(400);
        assert.equal(
          await page.evaluate(() => window.__ABYSSAL__.controls.pitch),
          -1.4,
        );
        report.cases.push({
          region,
          character,
          case: "released underwater heading preserved",
        });
      }
      await page.keyboard.press("Escape");
      await page.click("#return-menu");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.controls.groundRecovering),
        false,
      );
    }
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(
    `${out}/browser_report.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
console.log(`Passed ${report.cases.length} ground steering browser cases`);
