import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/atlantis_guide_revision";
await mkdir(directory, { recursive: true });
const report = {
  baseUrl,
  checks: [],
  measurements: [],
  screenshots: [],
  errors: [],
  limits: [
    "Desktop Chrome with emulated phone viewports; not physical-device acceptance.",
    "Only menus and the guide are exercised. This does not evaluate the city redraw or ecology.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
  locale: "en-US",
});
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
await page.addInitScript(() => {
  localStorage.setItem("abyssal-language", "en");
  const request = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set();
  window.__guideRafAudit = { pending, maximum: 0, frames: 0 };
  window.requestAnimationFrame = (callback) => {
    const isGuide = callback.toString().includes("dialog.open");
    const id = request((time) => {
      pending.delete(id);
      if (isGuide) window.__guideRafAudit.frames++;
      callback(time);
    });
    if (isGuide) {
      pending.add(id);
      window.__guideRafAudit.maximum = Math.max(
        pending.size,
        window.__guideRafAudit.maximum,
      );
    }
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    pending.delete(id);
    cancel(id);
  };
});
async function settle() {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
async function capture(name, selector) {
  const path = `${directory}/${name}.png`;
  await (selector ? page.locator(selector) : page).screenshot({ path });
  report.screenshots.push(path);
}
function closeEnough(a, b, label) {
  assert.ok(Math.abs(a - b) < 1, `${label}: ${a} / ${b}`);
}
async function checkCards(tag) {
  await page.mouse.move(0, 0);
  await settle();
  const data = await page.locator(".expedition-choice").evaluateAll((buttons) =>
    buttons.map((button) => {
      const box = (element) => {
        const { x, y, width, height, right, bottom } =
          element.getBoundingClientRect();
        return { x, y, width, height, right, bottom };
      };
      return {
        card: box(button),
        heading: box(button.querySelector(".choice-heading")),
        title: box(button.querySelector(".choice-heading > span:nth-child(2)")),
        cta: box(button.querySelector(".choice-cta")),
        value: box(button.querySelector(".choice-value")),
        hint: box(button.querySelector(".choice-hint")),
        overflow: button.scrollWidth > button.clientWidth + 1,
      };
    }),
  );
  closeEnough(data[0].card.y, data[1].card.y, `${tag} card top`);
  closeEnough(data[0].card.height, data[1].card.height, `${tag} card height`);
  for (const key of ["cta", "value", "hint"])
    closeEnough(data[0][key].y, data[1][key].y, `${tag} ${key} row`);
  for (const entry of data) {
    assert.ok(
      entry.cta.y >= entry.title.bottom,
      `${tag} CTA has an explicit second row`,
    );
    assert.equal(entry.overflow, false, `${tag} card overflow`);
    assert.ok(
      entry.cta.right <= entry.card.right &&
        entry.value.right <= entry.card.right,
    );
  }
  report.measurements.push({ tag, cards: data });
}
async function checkGuide(tag) {
  const regionBefore = await page.evaluate(() => ({
    selected: document.querySelector("#region-select").value,
    world: window.__ABYSSAL__.expedition.region.id,
    ocean: window.__ABYSSAL__.scene.getObjectByName("ocean_environment").uuid,
  }));
  await page.locator("#open-guide").click();
  await settle();
  assert.deepEqual(
    await page
      .locator("#guide-region option")
      .evaluateAll((options) => options.map((option) => option.value)),
    ["current", "hawaii", "atlantis", "all"],
  );
  for (const [region, count] of [
    ["hawaii", 35],
    ["atlantis", 25],
    ["all", 42],
  ]) {
    await page.locator("#guide-region").selectOption(region);
    assert.equal(await page.locator(".guide-entry").count(), count);
    const grouped = await page.locator(".guide-group").evaluateAll((groups) =>
      groups.map((group) => ({
        category: group.dataset.guideCategory,
        ids: [...group.querySelectorAll(".guide-entry")].map(
          (entry) => entry.dataset.catalogId,
        ),
        heading: group.querySelector("h3").innerText,
      })),
    );
    assert.deepEqual(
      grouped.map((group) => group.category),
      ["shoal", "surface", "hunter", "ancient", "lord", "player", "human"],
    );
    if (region !== "hawaii") assert.equal(grouped[0].ids[0], "seahorse");
    assert.equal(grouped[0].ids.includes("seahorse"), region !== "hawaii");
    assert.equal(
      grouped
        .find((group) => group.category === "hunter")
        .ids.includes("blue_shark"),
      region !== "hawaii",
    );
    const overflow = await page.locator("#ocean-guide").evaluate((dialog) => {
      const region = dialog
        .querySelector("#guide-region")
        .getBoundingClientRect();
      return (
        dialog.scrollWidth > dialog.clientWidth + 1 || region.right > innerWidth
      );
    });
    assert.equal(overflow, false, `${tag} guide overflow`);
    report.measurements.push({ tag, region, groups: grouped });
  }
  await page.locator("#guide-region").selectOption("atlantis");
  await page.locator('[data-catalog-id="seahorse"]').click();
  await settle();
  const cached = await page.evaluate(
    () => window.__ABYSSAL__.guide.inspectPreview().model.uuid,
  );
  for (let index = 0; index < 2; index++) {
    await page.locator("#guide-region").selectOption("hawaii");
    await page.locator("#guide-region").selectOption("atlantis");
    await page.locator('[data-catalog-id="seahorse"]').click();
    assert.equal(
      await page.evaluate(
        () => window.__ABYSSAL__.guide.inspectPreview().model.uuid,
      ),
      cached,
    );
  }
  const regionAfter = await page.evaluate(() => ({
    selected: document.querySelector("#region-select").value,
    world: window.__ABYSSAL__.expedition.region.id,
    ocean: window.__ABYSSAL__.scene.getObjectByName("ocean_environment").uuid,
  }));
  assert.deepEqual(
    regionAfter,
    regionBefore,
    "Guide selection never rebuilds or selects the expedition",
  );
  await page.locator('[data-catalog-id="spadefish"]').click();
  await settle();
  await capture(`${tag}_guide`);
  await page.locator("#guide-search").fill("Common Cuttlefish");
  assert.equal(await page.locator(".guide-entry").count(), 1);
  assert.equal(
    await page.locator(".guide-entry").getAttribute("data-kind"),
    "cuttlefish",
  );
  await page.locator("#guide-region").selectOption("hawaii");
  assert.equal(await page.locator(".guide-entry").count(), 0);
  await page.locator("#guide-search").fill("");
  await page.locator(".guide-close").click();
  await page.locator("#open-guide").click();
  await settle();
  await page.keyboard.press("Escape");
  await settle();
  const raf = await page.evaluate(() => ({
    maximum: window.__guideRafAudit.maximum,
    pending: window.__guideRafAudit.pending.size,
    frames: window.__guideRafAudit.frames,
  }));
  assert.equal(raf.maximum, 1);
  assert.equal(raf.pending, 0);
  assert.ok(raf.frames > 0);
  report.measurements.push({ tag, raf });
}
try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ABYSSAL__?.guide);
  for (const [width, height] of [
    [1440, 900],
    [390, 667],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    for (const language of ["en", "zh-CN"]) {
      await page
        .locator("header [data-language-select]")
        .selectOption(language);
      await settle();
      const tag = `${width}_${language}`;
      await checkCards(tag);
      await capture(`${tag}_menu`);
      await capture(`${tag}_cards`, ".expedition-selects");
      await checkGuide(tag);
      report.checks.push(
        `${tag}: aligned cards, grouped archive, independent map filters, bilingual search, model reuse, single RAF, no overflow`,
      );
      console.log(`PASS ${tag}`);
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#region-select").focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-choice-value="atlantis"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(
    await page.locator("#region-select").getAttribute("aria-expanded"),
    "false",
  );
  await page.locator("#character-select").focus();
  await page.keyboard.press("Enter");
  await page.locator('[data-choice-value="squid"]').focus();
  await page.keyboard.press("Enter");
  await page.locator("header [data-language-select]").selectOption("en");
  for (const [width, height] of [
    [1440, 900],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await settle();
    await checkCards(`${width}_long_choices`);
    await capture(`${width}_long_choices`, ".expedition-selects");
  }
  report.checks.push(
    "Keyboard selection preserves visible focus and card alignment for Atlantis / Giant Squid",
  );
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({ checks: report.checks.length, errors: report.errors }),
);
