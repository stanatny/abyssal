import { chromium, webkit } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { REGIONS, CHARACTERS } from "../src/expedition_config.js";
import { t } from "../src/i18n.js";
import { selectCharacter } from "./menu_picker_helpers.mjs";

const url = process.env.ABYSSAL_PREVIEW_URL || "http://127.0.0.1:7188/";
const out = process.env.ABYSSAL_REVIEW_OUT || ".local/localization_review";
const engine = process.env.ABYSSAL_BROWSER_ENGINE || "chrome";
const report = {
  url,
  engine,
  cases: [],
  issues: [],
  errors: [],
  limits: [
    "Native desktop browsers and touch viewport emulation, not physical-phone verification.",
    "All regional loading/menu/Guide entries are checked. Ordinary native play samples HUD, abilities and pause; it does not trigger every possible combat event.",
  ],
};
await mkdir(out, { recursive: true });
const browser = await (engine === "webkit" ? webkit : chromium).launch({
  ...(engine === "webkit" ? {} : { channel: "chrome" }),
  headless: false,
});
let page;
async function scan(label, locale) {
  if (locale !== "en") return;
  const issues = await page.evaluate(() => {
    const found = [],
      han = /[\u3400-\u9fff]/u;
    const visible = (e) => {
      if (!e || e.closest("[hidden], [data-no-i18n], script, style, canvas"))
        return false;
      if (e.tagName === "OPTION") e = e.closest("select");
      return e.checkVisibility({
        checkOpacity: true,
        checkVisibilityCSS: true,
      });
    };
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (han.test(n.nodeValue) && visible(n.parentElement))
        found.push({
          text: n.nodeValue.trim(),
          element: n.parentElement.outerHTML.slice(0, 300),
        });
    }
    for (const e of document.querySelectorAll(
      "[title], [aria-label], [placeholder]",
    )) {
      if (!visible(e)) continue;
      for (const a of ["title", "aria-label", "placeholder"])
        if (han.test(e.getAttribute(a) || ""))
          found.push({
            attribute: a,
            text: e.getAttribute(a),
            element: e.outerHTML.slice(0, 300),
          });
    }
    return found;
  });
  for (const issue of issues) report.issues.push({ label, ...issue });
}
async function ready() {
  await page.waitForFunction(
    () => document.querySelector("#region-loading")?.hidden,
    { timeout: 90000 },
  );
  await page.locator("#start").waitFor({ state: "visible" });
}
async function loading(record, locale) {
  const rows = await page.evaluate(() => window.__localizationLoads.splice(0));
  assert.ok(rows.length > 0, "No loading observations");
  for (const row of rows) {
    assert.equal(row.locale, locale);
    if (locale === "en" && /[\u3400-\u9fff]/u.test(row.text))
      report.issues.push({ label: `${record.name}:loading`, ...row });
    // 起始及切换标题必须来自同一份海域配置，避免仅检查已存在的词条。
    assert.equal(
      row.title,
      t(REGIONS.find((r) => r.id === record.region).name, [], locale),
    );
  }
  record.loading = rows;
}
async function guide(record, locale, exhaustive) {
  await page.locator("#open-guide").click();
  await page.locator("#guide-region").selectOption(record.region);
  await page.locator('[data-category="all"]').click();
  const ids = await page
    .locator(".guide-entry")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.catalogId));
  record.entries = ids.length;
  const categories = await page
    .locator(".guide-filters button:not([hidden])")
    .evaluateAll((nodes) => nodes.map((n) => n.dataset.category));
  for (const category of categories) {
    await page.locator(`[data-category="${category}"]`).click();
    await scan(`${record.name}:category:${category}`, locale);
  }
  await page.locator('[data-category="all"]').click();
  for (const id of exhaustive ? ids : ids.slice(0, 2)) {
    await page.locator(`.guide-entry[data-catalog-id="${id}"]`).click();
    await scan(`${record.name}:guide:${id}`, locale);
    for (const variant of await page
      .locator("[data-human-sex]:visible")
      .all()) {
      await variant.click();
      await scan(`${record.name}:variant:${id}`, locale);
    }
  }
  for (const details of await page.locator("details.guide-region-intro").all())
    if (!(await details.evaluate((e) => e.open)))
      await details.locator("summary").click();
  await scan(`${record.name}:guide-intro`, locale);
  await page.locator(".guide-close").click();
}
try {
  const profiles =
    process.env.ABYSSAL_AUDIT_DESKTOP_ONLY === "1"
      ? [[1440, 900, "en", false]]
      : [
          [1440, 900, "en", false],
          [320, 568, "en", true],
          [390, 844, "zh-CN", true],
        ];
  for (const [width, height, locale, touch] of profiles.filter(
    (p) => process.env.ABYSSAL_AUDIT_TOUCH_ONLY !== "1" || p[3],
  )) {
    const context = await browser.newContext({
      viewport: { width, height },
      locale: locale === "en" ? "en-US" : "zh-CN",
      isMobile: touch,
      hasTouch: touch,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      window.__localizationLoads = [];
      let last = "";
      // 只读记录真实加载状态，不延迟加载、不改写游戏或翻译状态。
      new MutationObserver(() => {
        const p = document.querySelector("#region-loading");
        if (!p || p.hidden) return;
        const text = p.innerText,
          title = p.querySelector("h2")?.textContent;
        if (text !== last) {
          last = text;
          window.__localizationLoads.push({
            locale: document.documentElement.lang,
            title,
            text,
          });
        }
      }).observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["hidden"],
      });
    });
    page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (e) => {
      if (e.type() === "error") report.errors.push(e.text());
    });
    await page.goto(url, { waitUntil: "commit" });
    await page.locator("#region-loading").waitFor({ state: "visible" });
    await page.screenshot({ path: `${out}/${width}_${locale}_loading.png` });
    await ready();
    const first = { name: `${width}:${locale}:initial`, region: "hawaii" };
    // 先保留失败结果，完整审查其余界面。
    try {
      await loading(first, locale);
    } catch (e) {
      report.issues.push({ label: first.name, error: e.message });
    }
    report.cases.push(first);
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    const regions =
      width === 1440
        ? REGIONS
        : REGIONS.filter((r) =>
            ["hawaii", "penglai", "odyssey"].includes(r.id),
          );
    for (const [index, region] of regions.entries()) {
      const record = {
        name: `${width}:${locale}:${region.id}`,
        region: region.id,
      };
      if (
        (await page.locator("#region-select").evaluate((e) => e.value)) !==
        region.id
      ) {
        await page.locator("#region-select").click();
        await scan(`${record.name}:region-picker`, locale);
        await page.locator(`[data-choice-value="${region.id}"]`).click();
        await ready();
        await loading(record, locale);
      }
      for (const selector of [".region-overview", ".expedition-settings"]) {
        const detail = page.locator(selector);
        if (!(await detail.evaluate((e) => e.open)))
          await detail.locator("summary").click();
      }
      await scan(`${record.name}:home`, locale);
      await guide(record, locale, width === 1440);
      await page.locator("#open-records").click();
      await scan(`${record.name}:records`, locale);
      await page.locator(".run-board-close").click();
      const character = CHARACTERS[index % CHARACTERS.length].id;
      await page.locator("#character-select").click();
      await scan(`${record.name}:character-picker`, locale);
      await page.locator(".picker-close").click();
      await selectCharacter(page, character);
      const abilities = page.locator(".ability-details");
      if (
        (await abilities.count()) &&
        !(await abilities.evaluate((e) => e.open))
      )
        await abilities.locator("summary").click();
      await scan(`${record.name}:character`, locale);
      await page.locator("#start").click();
      await page.waitForFunction(
        () =>
          !document.body.classList.contains("launching") &&
          !document.querySelector("#pause").hidden,
      );
      await scan(`${record.name}:playing`, locale);
      await page.locator(touch ? "#touch-sonar" : "#sonar-control").click();
      await page.waitForTimeout(150);
      await scan(`${record.name}:ability`, locale);
      await page.locator("#pause").click();
      await scan(`${record.name}:pause`, locale);
      if (region.id === "hawaii")
        await page.screenshot({ path: `${out}/${width}_${locale}_pause.png` });
      await page.locator("#return-menu").click();
      report.cases.push({ ...record, character });
      console.log(`PASS ${record.name}, ${record.entries} Guide entries`);
    }
    for (const next of locale === "en" ? ["zh-CN", "en"] : ["en", "zh-CN"]) {
      await page.locator("[data-language-select]").selectOption(next);
      await scan(`${width}:language:${next}`, next);
    }
    await page.reload();
    await ready();
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    const reload = { name: `${width}:${locale}:reload`, region: "hawaii" };
    await loading(reload, locale);
    report.cases.push(reload);
    if (!url.includes(":5188"))
      assert.equal(
        await page.evaluate(() => typeof window.__ABYSSAL__),
        "undefined",
      );
    await page.screenshot({ path: `${out}/${width}_${locale}_home.png` });
    await context.close();
  }
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
  await page?.screenshot({ path: `${out}/failed.png` }).catch(() => {});
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      passed: report.passed,
      cases: report.cases.length,
      issues: report.issues.length,
      errors: report.errors,
      error: report.error,
    }),
  );
}
