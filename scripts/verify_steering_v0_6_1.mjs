import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";

// 仅设置安全起点与隔离遭遇；转向、松手、冲刺和暂停全部由真实输入推进。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [],
  measurements = [];
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 667 },
  ]) {
    const mobile = viewport.width < 700;
    const context = await browser.newContext({
      viewport,
      hasTouch: mobile,
      isMobile: mobile,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
    await page.waitForFunction(() => !!window.__ABYSSAL__);
    await page.click("#quality");
    await page.click("#start");
    await resetFixture(page);
    const steering = await createInput(page, mobile);
    const samples = [];

    for (const direction of [1, -1]) {
      await steering.start(0, direction);
      await page.waitForFunction(
        (sign) => window.__ABYSSAL__.controls.pitch * sign > 0.5,
        direction,
      );
      await steering.end();
      const before = await readState(page);
      await page.waitForTimeout(550);
      const after = await readState(page);
      assertHeld(before, after);
      assert.ok(
        (after.position.y - before.position.y) * direction > 0.8,
        "After release the swimmer must keep moving along the chosen vertical direction",
      );
      assert.equal(after.pointer.x, 0);
      assert.equal(after.pointer.y, 0);
      assert.equal(
        after.indicator.pitch,
        Math.round((Math.asin(after.forward.y) * 180) / Math.PI),
      );
      assert.match(after.indicator.label, direction > 0 ? /上仰/ : /下俯/);
      samples.push({ direction, before, after });
    }
    checks.push(
      `${mobile ? "Touch release" : "W/S release"} retains ascent and descent, and the radar attitude matches the live direction`,
    );

    await resetFixture(page);
    await steering.start(1, 1);
    await page.waitForFunction(() => {
      const { yaw, pitch } = window.__ABYSSAL__.controls;
      return yaw < -0.35 && pitch > 0.35;
    });
    await steering.end(mobile);
    const combined = await readState(page);
    await page.waitForTimeout(450);
    const combinedHeld = await readState(page);
    assertHeld(combined, combinedHeld);
    assert.equal(combinedHeld.pointer.x, 0);
    assert.equal(combinedHeld.pointer.y, 0);
    samples.push({ combined, combinedHeld });
    checks.push(
      `${mobile ? "Touch cancellation" : "Combined WASD release"} stops angular input without flattening the compound heading`,
    );

    await page.click("#pause");
    const paused = await readState(page);
    await page.waitForTimeout(250);
    assertHeld(paused, await readState(page));
    await page.click("#resume");
    await page.waitForTimeout(350);
    assertHeld(paused, await readState(page));
    checks.push(
      `${viewport.width}px pause/resume retains the swimming attitude`,
    );

    if (!mobile) {
      await resetFixture(page);
      await steering.start(0, -1);
      await page.waitForFunction(
        () => window.__ABYSSAL__.controls.pitch < -1.48,
      );
      await steering.end();
      const steep = await readState(page);
      assert.ok(steep.pitch >= (-85 * Math.PI) / 180 - 1e-7);
      await page.keyboard.down("Space");
      await page.waitForFunction(() => window.__ABYSSAL__.controls.speed > 35);
      const sprint = await readState(page);
      assertHeld(steep, sprint);
      await page.keyboard.up("Space");
      samples.push({ steep, sprint });
      checks.push(
        "Orca can hold an 85-degree dive while accelerating without resetting to 49 degrees",
      );
    }

    const bounds = await page.locator("#minimap").evaluate((element) => {
      const map = element.getBoundingClientRect();
      const label = element
        .querySelector(".minimap-pitch-label")
        .getBoundingClientRect();
      return {
        labelInside:
          label.left >= map.left &&
          label.right <= map.right &&
          label.top >= map.top &&
          label.bottom <= map.bottom,
        fontSize: parseFloat(
          getComputedStyle(element.querySelector(".minimap-pitch-label"))
            .fontSize,
        ),
      };
    });
    assert.equal(bounds.labelInside, true);
    assert.ok(bounds.fontSize >= 9);
    measurements.push({ viewport, samples, bounds });
    await page.screenshot({
      path: `.local/v6_1_steering_${viewport.width}.png`,
    });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await writeFile(
    ".local/v6_1_steering_results.json",
    JSON.stringify({ checks, errors, measurements }, null, 2),
  );
  await browser.close();
}

async function resetFixture(page) {
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.setLength(6);
    g.setFacing(0);
    g.setPosition(180, -180, -700);
    g.player.invulnerable = 999;
    g.entities.forEach((entity) => (entity.hiddenFor = 999));
    g.encounters.bosses.forEach((boss) => (boss.enabled = false));
    g.pickups.forEach((pickup) => (pickup.cooldown = 999));
  });
}

async function readState(page) {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__;
    const minimap = document.querySelector("#minimap");
    return {
      ...g.controls,
      position: { x: g.position.x, y: g.position.y, z: g.position.z },
      forward: { x: g.forward.x, y: g.forward.y, z: g.forward.z },
      indicator: {
        pitch: Number(minimap.dataset.pitch),
        label: minimap.querySelector(".minimap-pitch-label").textContent,
      },
    };
  });
}

function assertHeld(before, after) {
  assert.ok(
    Math.abs(before.pitch - after.pitch) < 1e-7,
    "Pitch must stay fixed without vertical input",
  );
  assert.ok(
    Math.abs(before.yaw - after.yaw) < 1e-7,
    "Heading must stay fixed without horizontal input",
  );
}

async function createInput(page, mobile) {
  const heldKeys = [];
  const cdp = mobile ? await page.context().newCDPSession(page) : null;
  return {
    async start(x, y) {
      if (!mobile) {
        if (x) heldKeys.push(x > 0 ? "KeyD" : "KeyA");
        if (y) heldKeys.push(y > 0 ? "KeyW" : "KeyS");
        for (const key of heldKeys) await page.keyboard.down(key);
        return;
      }
      const box = await page.locator("#joystick").boundingBox();
      assert.ok(box, "Touch joystick must be visible");
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ ...center, id: 1 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: center.x + x * 34, y: center.y - y * 34, id: 1 }],
      });
    },
    async end(cancel = false) {
      if (mobile) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: cancel ? "touchCancel" : "touchEnd",
          touchPoints: [],
        });
      } else {
        for (const key of heldKeys) await page.keyboard.up(key);
        heldKeys.length = 0;
      }
    },
  };
}
