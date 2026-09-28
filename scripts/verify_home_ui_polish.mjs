import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

// 首页视觉验证：截取桌面与移动、中英界面，并断言语言箭头徽标与更换胶囊的几何位置。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { checks: [], errors: [] };
try {
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [390, 667, true],
    [320, 568, true],
  ]) {
    for (const language of ["zh-CN", "en"]) {
      const tag = `${width}_${language}`;
      const context = await browser.newContext({
        viewport: { width, height },
        locale: language,
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      try {
        await page.goto("http://127.0.0.1:5178/", { timeout: 30000 });
        await page.locator("#character-select").waitFor();
        await page
          .locator("header [data-language-select]")
          .selectOption(language);
        await page.evaluate(() => document.fonts.ready);
        const ui = await page.evaluate(() => {
          const select = document.querySelector(
            "header [data-language-select]",
          );
          const selectBox = select.getBoundingClientRect();
          const control = select.closest(".language-control");
          const after = getComputedStyle(control, "::after");
          const region = document
            .querySelector("#region-select")
            .getBoundingClientRect();
          const cta = document.querySelector("#region-select .choice-cta");
          const ctaBox = cta.getBoundingClientRect();
          const ctaStyle = getComputedStyle(cta);
          return {
            language: document.documentElement.lang,
            selectRightPad: getComputedStyle(select).paddingRight,
            afterRight: after.right,
            afterWidth: after.width,
            afterBg: after.backgroundImage.slice(0, 40),
            ctaText: cta.innerText.trim(),
            ctaVisible: ctaStyle.display !== "none" && ctaBox.width > 0,
            ctaInside:
              ctaBox.right <= region.right + 1 &&
              ctaBox.left >= region.left - 1,
            cardHeight: region.height,
          };
        });
        report.checks.push({ tag, ...ui });
        if (width === 1440)
          await page.screenshot({ path: `.local/home_ui_${language}.png` });
        else
          await page.screenshot({
            path: `.local/home_ui_mobile_${language}.png`,
          });
        // 打开选择面板截图
        await page.locator("#character-select").click();
        await page.locator("#expedition-picker").waitFor({ state: "visible" });
        if (width === 1440)
          await page.screenshot({ path: `.local/home_picker_${language}.png` });
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
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
