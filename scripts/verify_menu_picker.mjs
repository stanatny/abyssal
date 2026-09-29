import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 只使用真实点击、触摸和键盘；开发接口仅用于读取角色和后台运行状态。
const baseUrl =
  process.env.ABYSSAL_PREVIEW_URL ||
  process.env.ABYSSAL_DEV_URL ||
  "http://127.0.0.1:5178/";
const prefix = process.env.ABYSSAL_PREVIEW_URL ? "picker_public" : "picker";
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
  errors: [],
  screenshots: [],
  limits: [
    "Chrome desktop and touch viewport emulation are not physical-phone acceptance.",
    "Public builds without the debug API verify selected-character launch through visible ability labels, not internal avatar identity.",
  ],
};
await mkdir(".local", { recursive: true });
const launchOptions = { channel: "chrome", headless: true };
if (process.env.ABYSSAL_PREVIEW_PROXY)
  launchOptions.proxy = { server: process.env.ABYSSAL_PREVIEW_PROXY };
const browser = await chromium.launch(launchOptions);

async function snapshot(page) {
  return page.evaluate(() => ({
    character: document.querySelector("#character-select").value,
    region: document.querySelector("#region-select").value,
    avatar: window.__ABYSSAL__?.avatar.uuid ?? null,
    mode: window.__ABYSSAL__?.mode ?? null,
    playerCharacter: window.__ABYSSAL__?.player.characterId ?? null,
    menuHidden: document.querySelector("#menu").hidden,
    overlayHidden: document.querySelector("#overlay").hidden,
  }));
}
async function assertMenu(page) {
  const state = await snapshot(page);
  assert.equal(state.menuHidden, false);
  assert.equal(state.overlayHidden, true);
  if (state.mode) assert.equal(state.mode, "menu");
}
async function capture(page, name) {
  const path = `.local/${prefix}_${name}.png`;
  await page.screenshot({ path });
  report.screenshots.push(path);
}
async function assertClosed(page, trigger, pointer = false) {
  await page.locator("#expedition-picker").waitFor({ state: "hidden" });
  await page.locator("#region-loading").waitFor({ state: "hidden" });
  const state = await page.locator(trigger).evaluate((button) => ({
    expanded: button.getAttribute("aria-expanded"),
    active: button === document.activeElement,
    outline: getComputedStyle(button).outlineStyle,
    outlineWidth: getComputedStyle(button).outlineWidth,
  }));
  assert.equal(state.expanded, "false");
  assert.equal(state.active, true, "Closing restores the trigger focus");
  if (pointer)
    assert.ok(
      state.outline === "none" || state.outlineWidth === "0px",
      `Pointer close retained an outline: ${JSON.stringify(state)}`,
    );
  await assertMenu(page);
  return state;
}
async function measureDialog(page) {
  const geometry = await page
    .locator("#expedition-picker")
    .evaluate((panel) => {
      const box = panel.getBoundingClientRect();
      const rect = (element) => {
        const bounds = element.getBoundingClientRect();
        return {
          left: bounds.left,
          right: bounds.right,
          width: bounds.width,
          height: bounds.height,
        };
      };
      return {
        x: box.x,
        y: box.y,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
        clientWidth: panel.clientWidth,
        scrollWidth: panel.scrollWidth,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        choices: [...panel.querySelectorAll("button")].map(rect),
      };
    });
  assert.ok(geometry.x >= 0 && geometry.y >= 0);
  assert.ok(geometry.right <= geometry.viewportWidth + 1);
  assert.ok(geometry.bottom <= geometry.viewportHeight + 1);
  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1);
  for (const choice of geometry.choices) {
    assert.ok(choice.left >= geometry.x && choice.right <= geometry.right + 1);
    assert.ok(choice.width >= 44 && choice.height >= 44);
  }
  return geometry;
}

try {
  for (const [width, height] of [
    [1440, 900],
    [390, 667],
    [320, 568],
    [844, 390],
  ]) {
    for (const language of ["zh-CN", "en"]) {
      const mobile = width < 1000;
      const tag = `${width}_${height}_${language}`;
      if (
        process.env.ABYSSAL_PICKER_CASE &&
        process.env.ABYSSAL_PICKER_CASE !== tag
      )
        continue;
      const result = { width, height, language, passed: false };
      const context = await browser.newContext({
        viewport: { width, height },
        locale: language,
        isMobile: mobile,
        hasTouch: mobile,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      page.on("pageerror", (error) =>
        report.errors.push({ tag, error: error.message }),
      );
      const activate = async (selector) => {
        if (mobile) await page.locator(selector).tap();
        else await page.locator(selector).click();
      };
      const open = async (selector) => {
        await activate(selector);
        await page.locator("#expedition-picker").waitFor({ state: "visible" });
        assert.equal(
          await page.locator(selector).getAttribute("aria-expanded"),
          "true",
        );
        await assertMenu(page);
      };
      try {
        await page.goto(baseUrl, { timeout: 30000 });
        await page.locator("#character-select").waitFor();
        await page
          .locator("header [data-language-select]")
          .selectOption(language);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(
          await page
            .locator("#character-select")
            .evaluate((button) => button.tagName),
          "BUTTON",
        );
        assert.equal(
          await page
            .locator("#region-select")
            .evaluate((button) => button.tagName),
          "BUTTON",
        );
        assert.doesNotMatch(
          await page.locator("#region-choice-hint").innerText(),
          /筹备|coming/i,
        );

        await open("#region-select");
        result.regionGeometry = await measureDialog(page);
        assert.equal(
          await page.locator("#expedition-picker button:disabled").count(),
          2,
        );
        assert.equal(
          await page
            .locator('#expedition-picker [data-choice-value="hawaii"]')
            .getAttribute("aria-pressed"),
          "true",
        );
        if (language === "en")
          assert.doesNotMatch(
            await page.locator("#expedition-picker").innerText(),
            /[\u3400-\u9fff]/u,
          );
        await capture(page, `${tag}_regions`);
        const lockedOption = page.locator(
          '#expedition-picker [data-choice-value="mariana"]',
        );
        await lockedOption.scrollIntoViewIfNeeded();
        const locked = await lockedOption.boundingBox();
        if (mobile)
          await page.touchscreen.tap(
            locked.x + locked.width / 2,
            locked.y + locked.height / 2,
          );
        else
          await page.mouse.click(
            locked.x + locked.width / 2,
            locked.y + locked.height / 2,
          );
        assert.equal((await snapshot(page)).region, "hawaii");
        assert.equal(
          await page
            .locator("#expedition-picker")
            .evaluate((panel) => panel.open),
          true,
        );
        await activate(".picker-close");
        await assertClosed(page, "#region-select", true);
        await open("#region-select");
        await activate('#expedition-picker [data-choice-value="hawaii"]');
        await assertClosed(page, "#region-select", true);

        await open("#character-select");
        result.characterGeometry = await measureDialog(page);
        if (language === "en")
          assert.doesNotMatch(
            await page.locator("#expedition-picker").innerText(),
            /[\u3400-\u9fff]/u,
          );
        await capture(page, `${tag}_characters`);
        await activate('#expedition-picker [data-choice-value="squid"]');
        result.pointerClose = await assertClosed(
          page,
          "#character-select",
          true,
        );
        const selected = await snapshot(page);
        assert.equal(selected.character, "squid");
        assert.match(
          await page.locator(".specimen strong").textContent(),
          /Giant Squid|大王乌贼/i,
        );
        await open("#character-select");
        assert.equal(
          await page
            .locator('#expedition-picker [data-choice-value="squid"]')
            .getAttribute("aria-pressed"),
          "true",
        );
        await activate('#expedition-picker [data-choice-value="squid"]');
        await assertClosed(page, "#character-select", true);
        assert.deepEqual(
          await snapshot(page),
          selected,
          "Same choice preserves selection and avatar",
        );

        await open("#character-select");
        if (mobile) await page.touchscreen.tap(2, 2);
        else await page.mouse.click(2, 2);
        await assertClosed(page, "#character-select", true);
        await open("#character-select");
        await page.keyboard.press("Escape");
        result.escapeClose = await assertClosed(page, "#character-select");
        if (!mobile) assert.equal(result.escapeClose.outline, "solid");
        result.dismissal = "same choice, close button, backdrop, Escape";

        for (const locale of [language === "en" ? "zh-CN" : "en", language]) {
          await page
            .locator("header [data-language-select]")
            .selectOption(locale);
          assert.deepEqual(
            await snapshot(page),
            selected,
            "Language switches preserve selection and avatar",
          );
          await open("#character-select");
          assert.equal(
            await page
              .locator('#expedition-picker [data-choice-value="squid"]')
              .getAttribute("aria-pressed"),
            "true",
          );
          if (locale === "en")
            assert.doesNotMatch(
              await page.locator("#expedition-picker").innerText(),
              /[\u3400-\u9fff]/u,
            );
          await activate(".picker-close");
          await assertClosed(page, "#character-select", true);
        }
        result.languagePreservedAvatar = selected.avatar !== null;
        await capture(page, `${tag}_closed`);

        if (!mobile) {
          // 从返回的入口继续键盘操作，不直接改焦点或任何选择状态。
          await page.keyboard.press("Enter");
          await page
            .locator("#expedition-picker")
            .waitFor({ state: "visible" });
          for (let index = 0; index < 7; index++) {
            await page.keyboard.press("Tab");
            assert.equal(
              await page.evaluate(
                () =>
                  document.activeElement.closest("#expedition-picker") !== null,
              ),
              true,
            );
          }
          for (let index = 0; index < 7; index++) {
            await page.keyboard.press("Shift+Tab");
            assert.equal(
              await page.evaluate(
                () =>
                  document.activeElement.closest("#expedition-picker") !== null,
              ),
              true,
            );
          }
          await page.keyboard.press("p");
          await assertMenu(page);
          assert.equal(
            await page
              .locator("#expedition-picker")
              .evaluate((panel) => panel.open),
            true,
          );
          await page.keyboard.press("Home");
          assert.equal(
            await page.evaluate(
              () => document.activeElement.dataset.choiceValue,
            ),
            "orca",
          );
          await page.keyboard.press("ArrowDown");
          assert.equal(
            await page.evaluate(
              () => document.activeElement.dataset.choiceValue,
            ),
            "squid",
          );
          await page.keyboard.press("ArrowUp");
          assert.equal(
            await page.evaluate(
              () => document.activeElement.dataset.choiceValue,
            ),
            "orca",
          );
          await page.keyboard.press("Enter");
          result.keyboardClose = await assertClosed(page, "#character-select");
          assert.equal((await snapshot(page)).character, "orca");
          assert.equal(result.keyboardClose.outline, "solid");
          await page.keyboard.press("Enter");
          await page.keyboard.press("End");
          await page.keyboard.press("Space");
          await assertClosed(page, "#character-select");
          assert.equal((await snapshot(page)).character, "squid");
          result.keyboard =
            "arrows, Home/End, Enter/Space, contained Tab, restored focus, isolated P";
        }

        const character = language === "en" ? "orca" : "squid";
        await open("#character-select");
        await activate(`#expedition-picker [data-choice-value="${character}"]`);
        await assertClosed(page, "#character-select", true);
        await activate("#start");
        await page.waitForFunction(
          () => document.querySelector("#menu").hidden,
        );
        const started = await snapshot(page);
        if (started.playerCharacter)
          assert.equal(started.playerCharacter, character);
        if (started.mode) assert.equal(started.mode, "playing");
        assert.equal(
          await page
            .locator("#expedition-picker")
            .evaluate((panel) => panel.open),
          false,
        );
        assert.match(
          await page.locator("#touch-sonar").textContent(),
          character === "squid" ? /Ink|喷墨/i : /Sonar|声呐/i,
        );
        result.started = character;
        result.passed = true;
        console.log(`PASS ${tag}`);
      } catch (error) {
        result.error = error.stack;
        report.errors.push({ tag, error: error.message });
        await capture(page, `${tag}_failure`).catch(() => {});
        console.error(`FAIL ${tag}: ${error.message}`);
      } finally {
        report.checks.push(result);
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed =
    report.checks.length > 0 &&
    report.errors.length === 0 &&
    report.checks.every((check) => check.passed);
  await writeFile(
    `.local/${prefix}_report.json`,
    JSON.stringify(report, null, 2) + "\n",
  );
  if (!report.passed) process.exitCode = 1;
}
