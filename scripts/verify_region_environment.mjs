import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { selectCharacter } from "./menu_picker_helpers.mjs";

const out = resolve(
  process.env.ABYSSAL_ENV_EVIDENCE ||
    ".local/atlantis_optimization_20261023/regions",
);
await mkdir(out, { recursive: true });
const server = spawn("python3", [
  "scripts/preview_server.py",
  "--root",
  resolve(process.env.ABYSSAL_ENV_BUILD || "dist"),
  "--port",
  "0",
]);
const lines = createInterface({ input: server.stdout });
const [line] = await once(lines, "line");
const url = `http://127.0.0.1:${JSON.parse(line).port}/`;
const r = {
  url,
  cases: [],
  errors: [],
  expectedImportFailure: [],
  limits:
    "Native desktop Chrome, English1440px and Chinese390px touch emulation; not a physical phone.",
};
const b = await chromium.launch({ channel: "chrome", headless: false });
let p;
const ready = () =>
  p.waitForFunction(
    () =>
      document.querySelector("#loading")?.hidden &&
      document.querySelector("#region-loading")?.hidden,
  );
const select = async (id) => {
  if ((await p.$eval("#region-select", (e) => e.value)) !== id) {
    await p.click("#region-select");
    await p.click(`[data-choice-value="${id}"]`);
  }
  await p.waitForFunction(
    (id) =>
      document.querySelector("#region-select").value === id &&
      document.querySelector("#region-loading").hidden,
    id,
  );
};
const play = async () => {
  await p.click("#start");
  await p.waitForFunction(
    () =>
      !document.body.classList.contains("launching") &&
      document.querySelector("#pause")?.offsetParent !== null,
  );
  await p.waitForTimeout(150);
  await p.click("#pause");
  await p.click("#return-menu");
};
try {
  for (const [language, width] of process.env.ABYSSAL_ENV_FAILURE_ONLY
    ? []
    : [
        ["en", 1440],
        ["zh-CN", 390],
      ]) {
    p = await b.newPage({
      viewport: { width, height: width === 1440 ? 900 : 844 },
      hasTouch: width < 500,
      isMobile: width < 500,
    });
    p.setDefaultTimeout(120000);
    p.on("pageerror", (e) => r.errors.push(e.message));
    await p.goto(url);
    await ready();
    await p.selectOption("[data-language-select]", language);
    assert.equal(
      await p.evaluate(() => typeof window.__ABYSSAL__),
      "undefined",
    );
    const initial = await p.evaluate(() =>
      performance.getEntriesByType("resource").map((e) => e.name),
    );
    assert.ok(
      !initial.some((s) => /\/atlantis_ocean-|model_poseidon_hf_mesh-/.test(s)),
      "Unselected city data should not load on home",
    );
    await p.click("#open-guide");
    await p.selectOption("#guide-region", "atlantis");
    await p.click('[data-category="surface"]');
    await p.click('.guide-entry[data-kind="pelican"]');
    await p.waitForFunction(
      () => document.querySelector(".guide-texture-status")?.hidden,
    );
    if (language === "en")
      assert.doesNotMatch(
        await p.locator("#ocean-guide").innerText(),
        /[\u4e00-\u9fff]/,
      );
    await p.click("#ocean-guide .guide-close");
    assert.ok(
      !(await p.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((e) => e.name.includes("/atlantis_ocean-")),
      )),
      "Guide does not construct the selected region",
    );
    for (const id of width === 1440
      ? [
          "atlantis",
          "odyssey",
          "penglai",
          "amazon",
          "europa",
          "mariana",
          "bermuda",
          "hawaii",
          "atlantis",
        ]
      : ["atlantis", "hawaii", "atlantis"]) {
      await select(id);
      await play();
      r.cases.push({
        language,
        width,
        region: id,
        flow: "native select/start/pause/Home",
      });
      console.log(language, id, "passed");
    }
    if (width === 1440)
      for (const id of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
        await selectCharacter(p, id);
        await play();
        r.cases.push({ language, character: id, region: "atlantis" });
      }
    await p.screenshot({ path: `${out}/${language}_menu.png` });
    await p.reload();
    await ready();
    await p.close();
  }
  // 首次模块下载失败时不丢失原海域；原生返回/重试必须可用，不靠手工修改游戏状态。
  p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.setDefaultTimeout(90000);
  p.on("pageerror", (e) => r.errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") r.expectedImportFailure.push(m.text());
  });
  let fail = true;
  await p.route("**/atlantis_ocean-*.js", async (route) => {
    if (fail) {
      fail = false;
      await route.abort("failed");
    } else await route.continue();
  });
  await p.goto(url);
  await ready();
  await p.click("#region-select");
  await p.click('[data-choice-value="atlantis"]');
  await p.locator("#region-loading button").first().waitFor();
  await p.locator("#region-loading button").first().click();
  await ready();
  assert.equal(await p.$eval("#region-select", (e) => e.value), "hawaii");
  await play();
  await p.click("#region-select");
  await p.click('[data-choice-value="atlantis"]');
  await p.waitForFunction(
    () =>
      !document.querySelector("#region-loading").hasAttribute("aria-busy") &&
      document.querySelector("[data-region-reload]"),
  );
  assert.equal(await p.locator("#region-loading button").count(), 2);
  r.focusBefore = await p.evaluate(() => ({
    tag: document.activeElement?.outerHTML,
    inert: document.querySelector("#region-loading").inert,
    buttons: [...document.querySelectorAll("#region-loading button")].map(
      (e) => e.outerHTML,
    ),
  }));
  await p.keyboard.press("Tab");
  r.focusAfter = await p.evaluate(() => document.activeElement?.outerHTML);
  assert.equal(
    await p
      .locator("[data-region-reload]")
      .evaluate((e) => e === document.activeElement),
    true,
  );
  await Promise.all([
    p.waitForNavigation({ waitUntil: "domcontentloaded" }),
    p.locator("[data-region-reload]").click(),
  ]);
  await ready();
  await select("atlantis");
  await play();
  r.importRetry =
    "Return Home preserves current sea; explicit reload clears failed module cache and reentry passes";
  await p.close();
  assert.deepEqual(r.errors, []);
  r.passed = true;
} catch (e) {
  r.error = e.stack;
  process.exitCode = 1;
  await p?.screenshot({ path: `${out}/failure.png` }).catch(() => {});
} finally {
  await b.close();
  server.kill();
  await once(server, "exit");
  lines.close();
  await writeFile(`${out}/report.json`, JSON.stringify(r, null, 2));
  console.log(r.error || "region environment checks passed");
}
