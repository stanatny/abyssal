import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { MARIANA_REFUGE } from "../src/mariana_config.js";

// 页面操作走真实事件；死亡/超时/胜利仅隔离结算展示，不代替自然整局验收。
const out = process.env.ABYSSAL_UI_OUTPUT || ".local/ui_overall_review/final";
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5240";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { cases: [], errors: [], outcomeStaging: true };
const regions = ["hawaii", "atlantis", "bermuda", "mariana"];
const views = [
  [1440, 900, "en", false, regions],
  [390, 667, "zh-CN", true, regions],
  [320, 568, "en", true, ["atlantis", "mariana"]],
  [844, 390, "en", true, ["atlantis", "bermuda"]],
  [768, 1024, "en", true, ["mariana"]],
  [1024, 600, "en", false, ["hawaii"]],
  [667, 375, "en", true, ["bermuda"]],
  [568, 320, "en", true, ["mariana"]],
];
async function fullTarget(page, selector) {
  const target = await page.locator(selector).evaluate((e) => {
    const r = e.getBoundingClientRect();
    const center = document.elementFromPoint(
      r.x + r.width / 2,
      r.y + r.height / 2,
    );
    return {
      x: r.x,
      y: r.y,
      w: r.width,
      h: r.height,
      inside:
        r.x >= 0 &&
        r.y >= 0 &&
        r.right <= innerWidth &&
        r.bottom <= innerHeight,
      hit: e.contains(center),
    };
  });
  assert.ok(
    target.inside && target.hit,
    `${selector} is not fully reachable: ${JSON.stringify(target)}`,
  );
  assert.ok(target.h >= 44 && target.w >= 44, `${selector} target too small`);
  return target;
}
async function shot(page, tag, state) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({ path: `${out}/${tag}_${state}.png` });
}
try {
  for (const [width, height, locale, touch, destinations] of views.filter(
    ([width]) =>
      !process.env.ABYSSAL_UI_WIDTHS ||
      process.env.ABYSSAL_UI_WIDTHS.split(",").includes(String(width)),
  )) {
    const page = await browser.newPage({
      viewport: { width, height },
      locale,
      hasTouch: touch,
      isMobile: touch,
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(
      () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
    );
    await page.locator("[data-language-select]").first().selectOption(locale);
    for (const region of destinations) {
      await page.click("#region-select");
      await page.click(`[data-choice-value="${region}"]`);
      await page.waitForFunction(
        (r) =>
          window.__ABYSSAL__.expedition.region.id === r &&
          !window.__ABYSSAL__.regionLoading,
        region,
      );
      for (const character of ["orca", "squid"]) {
        const tag = `${width}_${height}_${locale}_${region}_${character}`;
        await page.click("#character-select");
        await page.click(`[data-choice-value="${character}"]`);
        await page.click("#region-select");
        const choiceVisible = await page
          .locator(`[data-choice-value="${region}"]`)
          .evaluate((e) => {
            const r = e.getBoundingClientRect(),
              p = e.closest("dialog").getBoundingClientRect();
            return r.top >= p.top && r.bottom <= p.bottom;
          });
        assert.ok(choiceVisible, `${tag}: selected destination outside picker`);
        await page.keyboard.press("Escape");
        assert.equal(
          await page.locator("#region-select").getAttribute("aria-expanded"),
          "false",
        );
        await shot(page, tag, "home");
        await page.click("#open-guide");
        await page.click('[data-category="player"]');
        await page.locator(`[data-catalog-id="player_${character}"]`).click();
        await page.locator(`[data-catalog-id="player_${character}"]`).focus();
        await page.keyboard.press("ArrowRight");
        const listBounds = await page
          .locator('.guide-entry[aria-pressed="true"]')
          .evaluate((e) => {
            const r = e.getBoundingClientRect(),
              p = e.closest(".guide-list").getBoundingClientRect();
            return (
              r.left >= p.left - 1 &&
              r.right <= p.right + 1 &&
              r.top >= p.top - 1 &&
              r.bottom <= p.bottom + 1
            );
          });
        assert.ok(
          listBounds,
          `${tag}: keyboard-selected archive row outside list`,
        );
        if (locale === "en")
          assert.equal(
            /[\u3400-\u9fff]/u.test(
              await page.locator(".ocean-guide").innerText(),
            ),
            false,
          );
        await shot(page, tag, "guide_dark");
        if (region === "hawaii" && character === "orca") {
          await page.emulateMedia({ colorScheme: "light" });
          await page.waitForFunction(
            () =>
              document.querySelector(".ocean-guide").dataset.theme === "light",
          );
          await shot(page, tag, "guide_light");
          await page.emulateMedia({ colorScheme: "dark" });
        }
        await page.keyboard.press("Escape");
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "open-guide",
        );
        await page.click("#start");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
        await page.evaluate(() => {
          window.__ABYSSAL__.player.invulnerable = 999;
        });
        assert.equal(
          await page.locator("header .language-control").isVisible(),
          false,
        );
        if (touch)
          for (const s of [
            "#quality",
            "#sound",
            "#pause",
            "#touch-sonar",
            "#touch-boost",
          ])
            await fullTarget(page, s);
        if (touch) await page.locator("#touch-sonar").tap();
        else await page.keyboard.press("KeyJ");
        await shot(page, tag, "playing_skill");
        if (touch) {
          const bars = await page
            .locator(".vitals .meter")
            .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().y));
          assert.ok(
            Math.max(...bars) - Math.min(...bars) < 1,
            `${tag}: survival bars not aligned`,
          );
        }
        await page.click("#pause");
        assert.equal(
          await page.locator("#pause").innerText(),
          locale === "en" ? "Continue" : "继续探索",
        );
        const elapsed = await page.evaluate(
          () => window.__ABYSSAL__.player.elapsed,
        );
        const task = await page.locator("#objective").textContent();
        assert.equal(await page.locator("#overlay-step").innerText(), task);
        assert.equal(await page.locator("#hud").isVisible(), false);
        const targets = {
          resume: await fullTarget(page, "#resume"),
          home: await fullTarget(page, "#return-menu"),
        };
        await shot(page, tag, "paused");
        const focus = [];
        for (let i = 0; i < 4; i++) {
          await page.keyboard.press("Tab");
          focus.push(
            await page.evaluate(() => ({
              inside: !!document.activeElement.closest("#overlay"),
              summary: document.activeElement.matches("summary"),
            })),
          );
        }
        assert.ok(focus.every((x) => x.inside) && focus.some((x) => x.summary));
        await page.click("#overlay-help summary");
        assert.equal(
          await page
            .locator(touch ? ".touch-help" : ".keyboard-help")
            .isVisible(),
          true,
        );
        assert.equal(
          await page
            .locator(touch ? ".keyboard-help" : ".touch-help")
            .isVisible(),
          false,
        );
        if (locale === "en")
          assert.equal(
            /[\u3400-\u9fff]/u.test(await page.locator("#overlay").innerText()),
            false,
          );
        await fullTarget(page, "#resume");
        await fullTarget(page, "#return-menu");
        await shot(page, tag, "help_expanded");
        assert.equal(
          await page.evaluate(() => window.__ABYSSAL__.player.elapsed),
          elapsed,
        );
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
        assert.equal(await page.locator("#hud").isVisible(), true);
        assert.equal(
          await page.locator("#pause").innerText(),
          locale === "en" ? "Pause" : "暂停",
        );
        await page.evaluate(() => {
          const g = window.__ABYSSAL__;
          g.player.invulnerable = 0;
          g.takeDamage(999);
        });
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "dead");
        assert.equal(await page.locator("#pause").isVisible(), false);
        await fullTarget(page, "#resume");
        await fullTarget(page, "#return-menu");
        await shot(page, tag, "dead");
        await page.click("#resume");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
        await page.evaluate(() => {
          const g = window.__ABYSSAL__;
          g.player.invulnerable = 999;
          g.player.elapsed = 1799.999;
        });
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "timeup");
        assert.equal(await page.locator("#pause").isVisible(), false);
        await fullTarget(page, "#return-menu");
        await shot(page, tag, "timeup");
        await page.click("#resume");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
        await page.evaluate(
          ({ r, refuge }) => {
            const g = window.__ABYSSAL__;
            g.setLength(r === "bermuda" ? 25 : 30);
            g.player.invulnerable = 999;
            for (const boss of g.encounters.bosses)
              if (boss.enabled) boss.state.defeated = true;
            g.player.bossesDefeated = g.encounters.bosses.filter(
              (boss) => boss.enabled,
            ).length;
            g.objective.keyCollected = true;
            g.objective.relicCollected = true;
            if (r === "mariana") g.setPosition(refuge.x, refuge.y, refuge.z);
          },
          { r: region, refuge: MARIANA_REFUGE },
        );
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "won");
        assert.equal(await page.locator("#pause").isVisible(), false);
        await fullTarget(page, "#resume");
        await fullTarget(page, "#return-menu");
        assert.equal(
          await page.locator("#overlay-progress").isVisible(),
          false,
        );
        await shot(page, tag, "won");
        await page.click("#return-menu");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
        assert.equal(
          await page.locator("header .language-control").isVisible(),
          true,
        );
        assert.equal(
          await page.locator("header [data-language-select]").isEnabled(),
          true,
        );
        report.cases.push({ tag, targets, passed: true });
        console.log(`PASS ${tag}`);
      }
    }
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2) + "\n");
  await browser.close();
}
