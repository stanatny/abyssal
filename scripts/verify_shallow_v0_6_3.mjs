import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 图鉴真实交互与新增鱼种捕食；隔离场景只移动玩家，不移动、冻结或直接结算猎物。
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
    const page = await browser.newPage({
      viewport,
      colorScheme: "light",
      isMobile: viewport.width < 700,
      hasTouch: viewport.width < 700,
    });
    page.setDefaultTimeout(90000);
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.addInitScript(() => {
      window.__REEF_BUFFERS__ = 0;
      const original = WebGL2RenderingContext.prototype.createBuffer;
      WebGL2RenderingContext.prototype.createBuffer = function (...args) {
        window.__REEF_BUFFERS__++;
        return original.apply(this, args);
      };
    });
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await page.waitForFunction(() => !!window.__ABYSSAL__?.guide);
    await page.click("#open-guide");
    assert.equal(await page.locator(".guide-entry").count(), 35);
    await page.click('[data-category="shoal"]');
    assert.equal(await page.locator(".guide-entry").count(), 13);
    for (const kind of ["boxfish", "parrotfish", "wrasse"]) {
      await page.click(`.guide-entry[data-kind="${kind}"]`);
      await page.waitForTimeout(250);
      assert.match(
        await page.locator(".guide-info").innerText(),
        /浅滩|浅礁|浅海/,
      );
      if (viewport.width === 1440)
        await page.screenshot({ path: `.local/v6_3_guide_${kind}_light.png` });
    }
    await page.click('.guide-entry[data-kind="boxfish"]');
    await page.waitForTimeout(250);
    const bufferCount = await page.evaluate(() => window.__REEF_BUFFERS__);
    for (const colorScheme of ["dark", "light", "dark"]) {
      await page.emulateMedia({ colorScheme });
      await page.waitForFunction(
        (theme) =>
          document.querySelector("#ocean-guide").dataset.theme === theme,
        colorScheme,
      );
      const state = await page.evaluate(() => {
        const dialog = document.querySelector("#ocean-guide"),
          content = document.querySelector(".guide-content"),
          rect = dialog.getBoundingClientRect();
        return {
          theme: dialog.dataset.theme,
          background: getComputedStyle(dialog).backgroundColor,
          inputScheme: getComputedStyle(document.querySelector("#guide-search"))
            .colorScheme,
          canvas: dialog.querySelectorAll("canvas").length,
          selected: dialog.querySelector('.guide-entry[aria-pressed="true"]')
            .dataset.kind,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          clientWidth: content.clientWidth,
          scrollWidth: content.scrollWidth,
          buffers: window.__REEF_BUFFERS__,
        };
      });
      assert.equal(state.inputScheme, colorScheme);
      assert.equal(state.selected, "boxfish");
      assert.equal(state.canvas, 1);
      assert.equal(
        state.buffers,
        bufferCount,
        "Theme changes must reuse GPU buffers",
      );
      assert.ok(
        state.left >= 0 &&
          state.right <= viewport.width + 1 &&
          state.top >= 0 &&
          state.bottom <= viewport.height + 1,
      );
      assert.ok(state.scrollWidth <= state.clientWidth + 1);
      measurements.push({ viewport, ...state });
    }
    await page.screenshot({
      path: `.local/v6_3_guide_boxfish_dark_${viewport.width}.png`,
    });
    await page.fill("#guide-search", "苏眉");
    assert.equal(await page.locator(".guide-entry").count(), 1);
    await page.click('.guide-entry[data-kind="wrasse"]');
    await page.waitForTimeout(250);
    await page.screenshot({
      path: `.local/v6_3_guide_wrasse_dark_${viewport.width}.png`,
    });
    await page.fill("#guide-search", "不存在的生物");
    assert.equal(await page.locator(".guide-entry").count(), 0);
    await page.fill("#guide-search", "");
    await page.click('[data-category="reward"]');
    await page.locator(".guide-entry").filter({ hasText: "深渊狂食" }).click();
    assert.match(await page.locator(".guide-info").innerText(), /30/);
    await page.screenshot({
      path: `.local/v6_3_guide_reward_dark_${viewport.width}.png`,
    });
    await page.click(".guide-close");
    await page.emulateMedia({ colorScheme: "light" });
    await page.click("#open-guide");
    assert.equal(
      await page.locator("#ocean-guide").getAttribute("data-theme"),
      "light",
    );
    assert.equal(await page.locator(".guide-preview canvas").count(), 1);
    await page.click(".guide-close");
    checks.push(
      `${viewport.width}px catalog counts, live light/dark, GPU reuse, selection, search, rewards and bounds`,
    );
    if (viewport.width === 1440) {
      await page.click("#quality");
      await page.click("#start");
      const population = await page.evaluate(() => {
        const g = window.__ABYSSAL__;
        return {
          total: g.entities.length,
          kinds: new Set(g.entities.map((e) => e.species.kind)).size,
          length: g.player.length,
          residents: g.entities
            .filter((e) => e.species.nurseryResident)
            .map((e) => ({
              kind: e.species.kind,
              position: e.mesh.position.toArray(),
              center: e.school.center.toArray(),
              school: e.school.id,
              speed: e.species.speed,
              length: e.species.length,
            })),
        };
      });
      assert.equal(population.total, 285);
      assert.equal(population.kinds, 24);
      assert.equal(population.length, 3);
      for (const [kind, count] of [
        ["boxfish", 8],
        ["parrotfish", 12],
        ["wrasse", 4],
      ]) {
        assert.equal(
          population.residents.filter((e) => e.kind === kind).length,
          count,
        );
        assert.ok(
          population.residents
            .filter((e) => e.kind === kind)
            .every((e) => e.position[2] >= -120 && e.position[1] > -72),
        );
        await page.evaluate((kind) => {
          const g = window.__ABYSSAL__;
          g.startGame();
          const entity = g.entities.find((e) => e.species.kind === kind);
          const p = entity.mesh.position;
          g.setPosition(p.x, p.y, p.z + 6);
          g.setFacing(0, 0);
          window.__REEF_CATCH__ = {
            entity,
            start: g.elapsed,
            initial: p.toArray(),
            done: false,
          };
          const read = () => {
            const r = window.__REEF_CATCH__;
            if (entity.hiddenFor > 0 || g.elapsed - r.start > 5) {
              r.done = true;
              r.result = {
                kind,
                caught: entity.hiddenFor > 0,
                physicsSeconds: g.elapsed - r.start,
                health: g.player.health,
                length: g.player.length,
                stamina: g.player.stamina,
                initial: r.initial,
                final: entity.mesh.position.toArray(),
                speed: g.controls.speed,
              };
            } else requestAnimationFrame(read);
          };
          requestAnimationFrame(read);
        }, kind);
        await page.waitForFunction(() => window.__REEF_CATCH__.done);
        const caught = await page.evaluate(() => window.__REEF_CATCH__.result);
        measurements.push(caught);
        assert.ok(
          caught.caught,
          `${kind} must be catchable by straight cruise from 6 m`,
        );
        assert.equal(caught.health, 100);
        assert.ok(caught.length > 3);
        assert.ok(caught.speed < 13);
      }
      measurements.push({ population });
      checks.push(
        "All three slow species caught at 3 m by ordinary cruise with unmodified fish AI and full health",
      );
      const persistence = await page.evaluate(async () => {
        const g = window.__ABYSSAL__;
        g.startGame();
        const schools = [
          ...new Set(
            g.entities
              .filter((e) => e.species.nurseryResident)
              .map((e) => e.school),
          ),
        ];
        const before = schools.map((s) => s.center.toArray());
        for (const school of schools) school.nextMigration = 0;
        g.setPosition(300, -50, -300);
        await new Promise((resolve) => {
          let n = 0;
          const tick = () =>
            ++n === 10 ? resolve() : requestAnimationFrame(tick);
          requestAnimationFrame(tick);
        });
        return { before, after: schools.map((s) => s.center.toArray()) };
      });
      assert.deepEqual(persistence.after, persistence.before);
      checks.push(
        "Slow nursery shoals retain their home when player explores away",
      );
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await writeFile(
    ".local/v6_3_shallow_results.json",
    JSON.stringify({ checks, measurements, errors }, null, 2),
  );
  await browser.close();
}
