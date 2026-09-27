// 在真实游戏状态中检查 HUD；双技能按钮仅为未来布局压力夹具，不改变游戏规则。
// 只检测独立面板，round-clock 等父子包含不计为面板之间的重叠。
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { errors: [], viewports: {} };
const selectors = [
  "header",
  ".location",
  ".mission",
  "#threat",
  "#boss-panel",
  "#notification",
  "#ink-status",
  "#breach-hint",
  "#buffs > span",
  ".vitals",
  ".speed",
  "#minimap",
  "#sonar-panel",
  "#touch-sonar",
  "#test-second-skill",
  "#touch-boost",
  "#joystick",
  "#sonar-control",
];
async function measure(page) {
  // 给一次布局/采样更新留出时间，固定等待而不是轮询直到重叠消失。
  await page.waitForTimeout(100);
  return page.evaluate((sels) => {
    function readRect(element) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) < 0.1 ||
        rect.width < 2 ||
        rect.height < 2 ||
        !element.getClientRects().length
      )
        return null;
      return {
        x: rect.x,
        y: rect.y,
        w: rect.width,
        h: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    }
    function intersection(a, b) {
      const width = Math.min(a.right, b.right) - Math.max(a.x, b.x);
      const height = Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y);
      return width > 1 && height > 1
        ? [+width.toFixed(1), +height.toFixed(1)]
        : null;
    }
    function isOutside(rect) {
      return (
        rect.x < -0.5 ||
        rect.y < -0.5 ||
        rect.right > innerWidth + 0.5 ||
        rect.bottom > innerHeight + 0.5
      );
    }
    const rects = {};
    for (const selector of sels) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element, index) => {
        const rect = readRect(element);
        if (!rect) return;
        // Buff 测真实可见胶囊，容器剩余的透明宽度不是 HUD 遮挡。
        const key = elements.length > 1 ? `${selector}[${index}]` : selector;
        rects[key] = rect;
      });
    }
    const overlaps = [];
    const outside = [];
    const entries = Object.entries(rects);
    for (let i = 0; i < entries.length; i++) {
      const [key, rect] = entries[i];
      if (isOutside(rect)) outside.push(key);
      for (let j = i + 1; j < entries.length; j++) {
        const [otherKey, otherRect] = entries[j];
        const size = intersection(rect, otherRect);
        if (size) overlaps.push([key, otherKey, ...size]);
      }
    }
    // 读取浏览器最终文字框，不能用模块估算坐标替代实际渲染尺寸。
    const labels = [...document.querySelectorAll(".sonar-world-label")]
      .map((element, index) => {
        const rect = readRect(element);
        return (
          rect && {
            key: `sonar-label[${index}]`,
            text: element.textContent,
            contactIds: element.dataset.contactIds,
            ...rect,
          }
        );
      })
      .filter(Boolean);
    const labelOverlaps = [];
    const labelHudOverlaps = [];
    const labelsOutside = [];
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (isOutside(label)) labelsOutside.push(label.key);
      for (let j = i + 1; j < labels.length; j++) {
        const other = labels[j];
        const size = intersection(label, other);
        if (size) labelOverlaps.push([label.key, other.key, ...size]);
      }
      for (const [key, rect] of entries) {
        const size = intersection(label, rect);
        if (size) labelHudOverlaps.push([label.key, key, ...size]);
      }
    }
    return {
      rects,
      overlaps,
      outside,
      labels,
      labelOverlaps,
      labelHudOverlaps,
      labelsOutside,
      sonarActive: window.__ABYSSAL__.sonar.snapshot.active,
      sonarContacts: window.__ABYSSAL__.sonar.snapshot.total,
      sonarShownGroups:
        window.__ABYSSAL__.sonarMarkers.snapshot.shownGroups ?? 0,
      docWidth: document.documentElement.scrollWidth,
    };
  }, selectors);
}

try {
  for (const [w, h, mobile] of [
    [320, 568, true],
    [390, 667, true],
    [430, 932, true],
    [844, 390, true],
    [1440, 900, false],
    [1920, 1080, false],
  ]) {
    const tag = `${w}x${h}`;
    const page = await browser.newPage({
      viewport: { width: w, height: h },
      hasTouch: mobile,
      isMobile: mobile,
    });
    page.on("pageerror", (e) => report.errors.push(`${tag}: ${e.message}`));
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.screenshot({ path: `.local/hud42_${tag}_menu.png` });
    await page.locator("#start").click();
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.player.invulnerable = 999;
      g.collectPickup("flow");
    });
    report.viewports[tag] = { calm: await measure(page) };
    await page.screenshot({ path: `.local/hud42_${tag}_calm.png` });
    await page.evaluate(() => window.__ABYSSAL__.activateSonar());
    await page.waitForTimeout(300);
    report.viewports[tag].sonar = await measure(page);
    await page.screenshot({ path: `.local/hud42_${tag}_sonar.png` });
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.entities.forEach((e) => (e.hiddenFor = 999));
      g.setLength(18);
      const b = g.encounters.bosses.find((e) => e.enabled);
      g.setPosition(b.home.x, b.home.y, b.home.z + 50);
      const e = g.entities.find((e) => e.species.kind === "megalodon");
      e.hiddenFor = 0;
      e.chase = 4;
      e.hunter.cooldown = 0;
    });
    await page.waitForFunction(
      () => {
        const g = window.__ABYSSAL__,
          e = g.entities.find((e) => e.species.kind === "megalodon");
        e.mesh.position.copy(g.position);
        e.mesh.position.z -= 42;
        return (
          !!g.activeBoss &&
          !document.querySelector("#threat").hidden &&
          !document.querySelector("#boss-panel").hidden
        );
      },
      {},
      { timeout: 15000 },
    );
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.effects.spawnInk(g.position.clone(), 32, 20);
    });
    await page.waitForTimeout(400);
    report.viewports[tag].combat = await measure(page);
    await page.screenshot({ path: `.local/hud42_${tag}_combat.png` });
    if (mobile) {
      await page.evaluate(() => {
        const b = document.createElement("button");
        b.id = "test-second-skill";
        b.className = "skill-button";
        b.innerHTML = "<span>技能二</span><small>布局测试</small>";
        document.querySelector("#touch-skills").append(b);
      });
      await page.waitForTimeout(250);
      report.viewports[tag].twoSkills = await measure(page);
      await page.screenshot({ path: `.local/hud42_${tag}_two_skills.png` });
      await page.evaluate(() => window.__ABYSSAL__.startGame());
      await page.waitForTimeout(250);
      report.viewports[tag].twoSkillsCalm = await measure(page);
      await page.screenshot({
        path: `.local/hud42_${tag}_two_skills_calm.png`,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(".local/hud42_report.json", JSON.stringify(report, null, 2));
}
for (const [viewport, states] of Object.entries(report.viewports)) {
  for (const [state, data] of Object.entries(states)) {
    assert.deepEqual(
      data.outside,
      [],
      `${viewport} ${state}: HUD extends beyond viewport`,
    );
    assert.deepEqual(
      data.overlaps,
      [],
      `${viewport} ${state}: HUD panels overlap`,
    );
    assert.deepEqual(
      data.labelsOutside,
      [],
      `${viewport} ${state}: Sonar labels extend beyond viewport`,
    );
    assert.deepEqual(
      data.labelOverlaps,
      [],
      `${viewport} ${state}: Rendered sonar labels overlap each other`,
    );
    assert.deepEqual(
      data.labelHudOverlaps,
      [],
      `${viewport} ${state}: Rendered sonar labels overlap HUD`,
    );
    if (data.sonarActive && data.sonarShownGroups > 0) {
      assert.ok(
        data.labels.length > 0,
        `${viewport} ${state}: Active sonar has no visible labels`,
      );
    }
  }
}
assert.deepEqual(report.errors, [], "Browser console errors");
console.log(
  JSON.stringify({
    viewports: Object.keys(report.viewports),
    states: Object.values(report.viewports).reduce(
      (n, v) => n + Object.keys(v).length,
      0,
    ),
    errors: report.errors,
    status: "passed",
  }),
);
