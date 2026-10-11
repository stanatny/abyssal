import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out =
  process.env.ABYSSAL_PERF_DIRECTORY || ".local/resource_transactions";
await mkdir(out, { recursive: true });
const report = { checks: [], errors: [] };
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--no-proxy-server"],
});
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(90000);
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  async function choose(id) {
    await page.click("#region-select");
    await page.click(`[data-choice-value="${id}"]`);
  }
  async function ready(id) {
    await page.waitForFunction(
      (id) =>
        !window.__ABYSSAL__.regionLoading &&
        window.__ABYSSAL__.expedition.region.id === id,
      id,
    );
  }
  await page.evaluate(() => {
    window.__yieldOriginal = scheduler.yield.bind(scheduler);
    let n = 0;
    scheduler.yield = () =>
      ++n === 25
        ? Promise.reject(new Error("Injected Mariana yield failure"))
        : window.__yieldOriginal();
  });
  await choose("mariana");
  await page.locator("#region-loading button").waitFor();
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.expedition.region.id),
    "hawaii",
  );
  await page.evaluate(() => {
    scheduler.yield = window.__yieldOriginal;
  });
  await page.click("#region-loading button");
  await ready("hawaii");
  await choose("mariana");
  await ready("mariana");
  report.checks.push(
    "Mariana partial construction rejects, restores Hawaii and retries successfully",
  );
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.waitForTimeout(300);
  await page.click("#pause");
  await page.click("#return-menu");
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    window.__oldPopulation = [...g.entities];
    window.__oldRoot = g.ocean.root;
    window.__oldCompile = g.renderer.compileAsync;
    g.renderer.compileAsync = async () => {
      throw new Error("Injected post-swap compile failure");
    };
  });
  await choose("atlantis");
  await page.locator("#region-loading button").waitFor();
  assert.ok(
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      return (
        g.expedition.region.id === "mariana" &&
        g.ocean.root === window.__oldRoot &&
        g.ocean.root.visible &&
        g.entities.every(
          (e, i) =>
            e === window.__oldPopulation[i] && e.mesh.parent === g.scene,
        )
      );
    }),
  );
  await page.evaluate(() => {
    window.__ABYSSAL__.renderer.compileAsync = window.__oldCompile;
  });
  await page.click("#region-loading button");
  await ready("mariana");
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.click("#pause");
  await page.click("#return-menu");
  report.checks.push(
    "Post-swap compile failure restores exact old population/root and native play remains available",
  );
  await page.evaluate(() => {
    window.__evictedSkeletons = new Set();
    for (const e of window.__oldPopulation)
      e.mesh.traverse((n) => {
        if (n.skeleton) window.__evictedSkeletons.add(n.skeleton);
      });
  });
  await choose("atlantis");
  await ready("atlantis");
  await choose("hawaii");
  await ready("hawaii");
  assert.ok(
    await page.evaluate(
      () =>
        window.__evictedSkeletons.size > 0 &&
        [...window.__evictedSkeletons].every((s) => s.boneTexture === null),
    ),
  );
  await page.evaluate(() => {
    delete window.__oldPopulation;
    delete window.__oldRoot;
    delete window.__evictedSkeletons;
    delete window.__oldCompile;
    delete window.__yieldOriginal;
  });
  report.checks.push(
    "After two successful switches, evicted Mariana private bone textures are released",
  );
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
