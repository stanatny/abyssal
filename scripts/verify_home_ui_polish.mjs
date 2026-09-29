import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 首页视觉验证：截取桌面与移动、中英界面，并断言语言箭头徽标与更换胶囊的几何位置。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { checks: [], errors: [] };
async function assertLanguageGeometry(page, selector) {
  const geometry = await page.locator(selector).evaluate((select) => {
    const selectBox = select.getBoundingClientRect();
    const control = select.closest(".language-control");
    const controlBox = control.getBoundingClientRect();
    const after = getComputedStyle(control, "::after");
    const width = parseFloat(after.width);
    const height = parseFloat(after.height);
    const right = controlBox.right - parseFloat(after.right);
    const top = controlBox.top + controlBox.height / 2 - height / 2;
    return {
      select: {
        left: selectBox.left,
        right: selectBox.right,
        top: selectBox.top,
        bottom: selectBox.bottom,
        height: selectBox.height,
      },
      arrow: { left: right - width, right, top, bottom: top + height, width },
      inset: selectBox.right - right,
      paddingRight: parseFloat(getComputedStyle(select).paddingRight),
      backgroundImage: after.backgroundImage,
      appearance: getComputedStyle(select).appearance,
      language: document.documentElement.lang,
      title: select.title,
    };
  });
  const { select, arrow, inset, paddingRight } = geometry;
  assert.ok(select.height >= 44, `${selector}: language target is too short`);
  assert.equal(geometry.appearance, "none");
  if (geometry.title)
    assert.equal(
      geometry.title,
      geometry.language === "en" ? "Language" : "语言",
    );
  assert.match(geometry.backgroundImage, /svg/);
  assert.ok(arrow.left >= select.left && arrow.right <= select.right);
  assert.ok(arrow.top >= select.top && arrow.bottom <= select.bottom);
  assert.ok(inset >= 4 && inset <= 14, `${selector}: arrow inset is ${inset}`);
  assert.ok(paddingRight >= arrow.width + inset + 5);
  return geometry;
}
try {
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [390, 667, true],
    [320, 568, true],
  ]) {
    for (const language of ["zh-CN", "en"]) {
      const tag = `${width}_${height}_${language}`;
      const context = await browser.newContext({
        viewport: { width, height },
        locale: language,
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      page.on("pageerror", (error) =>
        report.errors.push({ tag, error: error.message }),
      );
      const activate = async (selector) => {
        if (mobile) await page.locator(selector).tap();
        else await page.locator(selector).click();
      };
      try {
        await page.goto(
          process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/",
          { timeout: 30000 },
        );
        await page.locator("#character-select").waitFor();
        await page
          .locator("header [data-language-select]")
          .selectOption(language);
        await page.evaluate(() => document.fonts.ready);
        const ui = await page.evaluate(() => {
          return {
            language: document.documentElement.lang,
            cards: ["region-select", "character-select"].map((id) => {
              const card = document.getElementById(id);
              const box = card.getBoundingClientRect();
              const cta = card.querySelector(".choice-cta");
              const ctaBox = cta.getBoundingClientRect();
              const ctaStyle = getComputedStyle(cta);
              return {
                id,
                ctaText: cta.innerText.trim(),
                ctaVisible:
                  ctaStyle.display !== "none" &&
                  ctaStyle.visibility !== "hidden" &&
                  ctaBox.width > 0,
                ctaInside:
                  ctaBox.right <= box.right + 1 &&
                  ctaBox.left >= box.left - 1 &&
                  ctaBox.top >= box.top - 1 &&
                  ctaBox.bottom <= box.bottom + 1,
                cardHeight: box.height,
              };
            }),
          };
        });
        assert.equal(ui.language, language);
        for (const card of ui.cards) {
          assert.ok(card.ctaVisible, `${card.id}: change hint is hidden`);
          assert.ok(card.ctaInside, `${card.id}: change hint overflows`);
          assert.ok(card.cardHeight >= 44);
          assert.equal(
            card.ctaText,
            language === "en" ? "Tap to change" : "点击更换",
          );
        }
        const header = await assertLanguageGeometry(
          page,
          "header [data-language-select]",
        );
        await page.screenshot({ path: `.local/home_ui_${tag}.png` });
        // 打开选择面板截图
        await activate("#character-select");
        await page.locator("#expedition-picker").waitFor({ state: "visible" });
        await page.screenshot({ path: `.local/home_picker_${tag}.png` });
        await activate(".picker-close");
        await activate("#start");
        await page.waitForFunction(
          () => document.querySelector("#menu").hidden,
        );
        await activate("#pause");
        await page.locator("#overlay").waitFor({ state: "visible" });
        const pause = {
          languageControls: await page
            .locator("#overlay [data-language-select]")
            .count(),
          headerDisabled: await page
            .locator("header [data-language-select]")
            .isDisabled(),
          language: await page.locator("html").getAttribute("lang"),
        };
        assert.equal(pause.languageControls, 0);
        assert.equal(pause.headerDisabled, true);
        assert.equal(pause.language, language);
        await page.screenshot({ path: `.local/home_pause_${tag}.png` });
        await activate("#resume");
        await page.locator("#overlay").waitFor({ state: "hidden" });
        await activate("#pause");
        await activate("#return-menu");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
        assert.equal(
          await page.locator("header [data-language-select]").isEnabled(),
          true,
        );
        // 必须回首页才允许切换；在两个真实语言状态检查同一个首页箭头位置。
        const otherLanguage = language === "en" ? "zh-CN" : "en";
        await page
          .locator("header [data-language-select]")
          .selectOption(otherLanguage);
        const homeSwitched = await assertLanguageGeometry(
          page,
          "header [data-language-select]",
        );
        assert.equal(
          await page.locator("html").getAttribute("lang"),
          otherLanguage,
        );
        await page.screenshot({ path: `.local/home_return_${tag}.png` });
        await activate("#start");
        await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
        assert.equal(
          await page.locator("header [data-language-select]").isDisabled(),
          true,
        );
        report.checks.push({ tag, ...ui, header, pause, homeSwitched });
        console.log("PASS " + tag);
      } catch (error) {
        report.errors.push({ tag, error: error.message });
        console.error("FAIL " + tag + ": " + error.message);
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await writeFile(
    ".local/home_ui_report.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
