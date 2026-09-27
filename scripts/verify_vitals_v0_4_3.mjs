// 复现手机生命栏的二行副文案，验证三列等宽、进度条齐平且动态切换不跳动。
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { errors: [], viewports: {} };
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178";
const sizes = [
  [320, 568, true],
  [390, 667, true],
  [430, 932, true],
  [844, 390, true],
  [1440, 900, false],
];

async function measure(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const r = element.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        width: r.width,
        height: r.height,
        right: r.right,
        bottom: r.bottom,
      };
    };
    const vitals = [...document.querySelectorAll(".vitals > .vital")].map(
      (element) => ({
        kind: [...element.classList].find((name) => name !== "vital"),
        column: rect(element),
        head: rect(element.querySelector(".vital-head")),
        meter: rect(element.querySelector(".meter")),
      }),
    );
    const caption = document.querySelector("#feeding-mode");
    const textRange = document.createRange();
    textRange.selectNodeContents(caption);
    const r = textRange.getBoundingClientRect();
    return {
      vitals,
      caption: caption.textContent,
      captionText: { x: r.x, y: r.y, right: r.right, bottom: r.bottom },
      panel: rect(document.querySelector(".vitals")),
      width: innerWidth,
      height: innerHeight,
    };
  });
}

try {
  for (const [width, height, mobile] of sizes) {
    const tag = `${width}x${height}`;
    const page = await browser.newPage({
      viewport: { width, height },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (error) =>
      report.errors.push(`${tag}: ${error.message}`),
    );
    await page.goto(url);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.locator("#start").click();
    await page.evaluate(() => {
      const game = window.__ABYSSAL__;
      game.player.invulnerable = 999;
      // 排除附近捕食/受击，保留实际 HUD 更新来验证不同生命状态。
      game.entities.forEach((entity) => {
        entity.hiddenFor = 999;
      });
    });
    const states = {};
    for (const [state, health] of [
      ["healthy", 100],
      ["wounded", 48],
      ["critical", 8],
      ["restored", 100],
    ]) {
      await page.evaluate((value) => {
        const player = window.__ABYSSAL__.player;
        player.health = value;
        player.stamina = 63;
        player.hunger = 82;
      }, health);
      await page.waitForFunction(
        (value) =>
          document.querySelector("#feeding-mode").textContent ===
          (value < 100 ? "进食优先回血" : "健康成长"),
        health,
      );
      await page.waitForTimeout(120);
      states[state] = await measure(page);
      await page.screenshot({
        path: `.local/vitals43_${tag}_${state}.png`,
        animations: "disabled",
      });
      await page.locator(".vitals").screenshot({
        path: `.local/vitals43_${tag}_${state}_detail.png`,
        animations: "disabled",
      });
    }
    report.viewports[tag] = { mobile, states };
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(
    ".local/vitals43_report.json",
    JSON.stringify(report, null, 2),
  );
}

const spread = (values) => Math.max(...values) - Math.min(...values);
for (const [viewport, { mobile, states }] of Object.entries(report.viewports)) {
  for (const [state, data] of Object.entries(states)) {
    const label = `${viewport} ${state}`;
    assert.equal(
      data.vitals.length,
      3,
      `${label}: Expected three vital columns`,
    );
    assert.ok(
      spread(data.vitals.map((vital) => vital.meter.width)) <= 0.05,
      `${label}: Meter widths differ`,
    );
    if (mobile) {
      assert.ok(
        spread(data.vitals.map((vital) => vital.meter.y)) <= 0.05,
        `${label}: Meter top edges are not aligned`,
      );
      assert.ok(
        spread(data.vitals.map((vital) => vital.column.width)) <= 0.05,
        `${label}: Vital columns have different widths`,
      );
      const health = data.vitals.find((vital) => vital.kind === "health");
      assert.ok(
        data.captionText.right <= health.column.right + 0.5,
        `${label}: Feeding caption extends beyond health column`,
      );
      assert.ok(
        data.captionText.bottom < health.meter.y,
        `${label}: Feeding caption overlaps meter`,
      );
      for (const vital of data.vitals) {
        const baseline = states.healthy.vitals.find(
          (entry) => entry.kind === vital.kind,
        );
        assert.ok(
          Math.abs(vital.meter.y - baseline.meter.y) <= 0.05,
          `${label}: Dynamic feeding caption moved meter vertically`,
        );
      }
    } else {
      const meters = data.vitals.map((vital) => vital.meter);
      assert.ok(
        spread(meters.map((meter) => meter.x)) <= 0.05,
        `${label}: Desktop meters lost common left edge`,
      );
      assert.ok(
        meters[0].bottom < meters[1].y && meters[1].bottom < meters[2].y,
        `${label}: Desktop vertical layout changed`,
      );
    }
    assert.ok(
      data.panel.x >= 0 &&
        data.panel.y >= 0 &&
        data.panel.right <= data.width &&
        data.panel.bottom <= data.height,
      `${label}: Vitals panel exceeds viewport`,
    );
  }
}
assert.deepEqual(report.errors, [], "Browser console errors");
console.log(
  JSON.stringify({
    status: "passed",
    viewports: Object.keys(report.viewports),
    states: 20,
    errors: report.errors,
  }),
);
