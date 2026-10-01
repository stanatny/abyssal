import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const out =
  process.env.ABYSSAL_PERF_DIRECTORY || ".local/performance_lifecycle";
await mkdir(out, { recursive: true });
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5240/";
const browser = await chromium.launch({
  channel: "chrome",
  headless: process.env.ABYSSAL_PERF_HEADED !== "1",
});
const report = {
  url,
  at: new Date().toISOString(),
  checks: [],
  renderSamples: [],
  resources: [],
  errors: [],
};
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(60000);
  page.on("pageerror", (error) => report.errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ABYSSAL__);
  const region = async (id) => {
    await page.click("#region-select");
    await page.click(`[data-choice-value="${id}"]`);
    await page.waitForFunction(
      (id) =>
        !window.__ABYSSAL__.regionLoading &&
        window.__ABYSSAL__.expedition.region.id === id,
      id,
    );
  };
  const waitForWorldPaint = async (action, expectedMode) => {
    await page.evaluate((expected) => {
      const game = window.__ABYSSAL__;
      const render = game.visuals.render;
      window.__worldPainted = false;
      game.visuals.render = function (...args) {
        const result = render.apply(this, args);
        if (game.mode === expected) {
          window.__worldPainted = true;
          game.visuals.render = render;
        }
        return result;
      };
    }, expectedMode);
    await action();
    await page.waitForFunction(() => window.__worldPainted);
  };
  const renderCount = async (action = null, windowMs = 450) => {
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      window.__renderCount = 0;
      window.__originalRender = g.visuals.render;
      g.visuals.render = function (...args) {
        window.__renderCount++;
        return window.__originalRender.apply(this, args);
      };
    });
    if (action) await action();
    await page.waitForTimeout(windowMs);
    const count = await page.evaluate(() => {
      window.__ABYSSAL__.visuals.render = window.__originalRender;
      return window.__renderCount;
    });
    report.renderSamples.push({
      region: await page.evaluate(
        () => window.__ABYSSAL__.expedition.region.id,
      ),
      mode: await page.evaluate(() => window.__ABYSSAL__.mode),
      windowMs,
      count,
    });
    return count;
  };
  for (const id of ["hawaii", "atlantis", "bermuda", "mariana"]) {
    if (id !== "hawaii") await region(id);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    // 等到暂停入口的必要重绘完成，再测空闲阶段，避免慢设备上的定时等待竞态。
    await waitForWorldPaint(() => page.keyboard.press("Escape"), "paused");
    const frozen = await page.evaluate(() => ({
      elapsed: window.__ABYSSAL__.player.elapsed,
      position: window.__ABYSSAL__.position.toArray(),
      health: window.__ABYSSAL__.player.health,
    }));
    assert.equal(await renderCount(), 0, id);
    assert.deepEqual(
      await page.evaluate(() => ({
        elapsed: window.__ABYSSAL__.player.elapsed,
        position: window.__ABYSSAL__.position.toArray(),
        health: window.__ABYSSAL__.player.health,
      })),
      frozen,
    );
    const resize = await renderCount(() =>
      page.setViewportSize({ width: 390, height: 667 }),
    );
    assert.ok(resize >= 1 && resize <= 3, `resize ${id} ${resize}`);
    await page.screenshot({ path: `${out}/${id}_paused_390.png` });
    await waitForWorldPaint(
      () => page.setViewportSize({ width: 1440, height: 900 }),
      "paused",
    );
    assert.equal(await renderCount(), 0, `settled resize ${id}`);
    const quality = await renderCount(() => page.click("#quality"));
    assert.ok(quality >= 1 && quality <= 2);
    await waitForWorldPaint(() => page.click("#quality"), "paused");
    await page.click("#resume");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    // 这里只验证恢复后持续绘制；固定 60 FPS 的帧数门槛不适合冷启动或繁忙主机。
    assert.ok((await renderCount(null, 900)) > 1);
    await page.keyboard.press("Escape");
    await page.click("#return-menu");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    await page.click("#open-guide");
    await page.waitForTimeout(100);
    assert.equal(await renderCount(), 0, `guide ${id}`);
    await page.click(".guide-close");
    assert.ok((await renderCount(null, 900)) > 1, `menu after guide ${id}`);
    report.checks.push(
      `${id}: pause/time/input, resize, quality, resume, home and Guide`,
    );
  }
  await region("hawaii");
  // 真实让出点注入失败，不能用只改 UI 的伪失败替代事务回退。
  await page.evaluate(() => {
    window.__nativeYield = scheduler.yield.bind(scheduler);
    window.__yieldCalls = 0;
    scheduler.yield = () => {
      window.__yieldCalls++;
      if (window.__yieldCalls === 25)
        return Promise.reject(new Error("Injected scene preparation failure"));
      return window.__nativeYield();
    };
  });
  await page.click("#region-select");
  await page.click('[data-choice-value="atlantis"]');
  await page.locator("#region-loading button").waitFor();
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.expedition.region.id),
    "hawaii",
  );
  await page.evaluate(() => {
    scheduler.yield = window.__nativeYield;
  });
  await page.click("#region-loading button");
  await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
  await region("atlantis");
  report.checks.push(
    "Mid-construction rejection retains Hawaii; input unlock and real retry succeed",
  );
  for (let round = 0; round < 3; round++)
    for (const id of ["hawaii", "atlantis", "bermuda", "mariana"]) {
      await region(id);
      await page.waitForTimeout(100);
      report.resources.push(
        await page.evaluate((round) => {
          const g = window.__ABYSSAL__;
          return {
            round,
            id: g.expedition.region.id,
            population: g.entities.length,
            geometry: g.renderer.info.memory.geometries,
            textures: g.renderer.info.memory.textures,
          };
        }, round),
      );
    }
  for (const id of ["hawaii", "atlantis", "bermuda", "mariana"]) {
    const samples = report.resources.filter((r) => r.id === id);
    assert.equal(samples[1].population, samples[2].population);
    assert.equal(samples[1].geometry, samples[2].geometry);
    assert.equal(samples[1].textures, samples[2].textures);
  }
  report.checks.push(
    "12 sequential switches: warmed per-region resource and population counts stable",
  );
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  const context = await page.evaluate(async () => {
    const game = window.__ABYSSAL__;
    const extension = game.renderer
      .getContext()
      .getExtension("WEBGL_lose_context");
    const elapsed = game.player.elapsed;
    const restored = new Promise((resolve) =>
      game.renderer.domElement.addEventListener(
        "webglcontextrestored",
        resolve,
        { once: true },
      ),
    );
    extension.loseContext();
    await new Promise((resolve) => setTimeout(resolve, 200));
    extension.restoreContext();
    await restored;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return {
      elapsed,
      after: game.player.elapsed,
      lost: game.renderer.getContext().isContextLost(),
    };
  });
  assert.equal(context.lost, false);
  assert.equal(context.after, context.elapsed);
  assert.ok(await page.locator("#loading").isHidden());
  await page.click("#resume");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  report.checks.push(
    "Context restoration redraws the frozen scene, removes the blocking error layer and permits native resume",
  );
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify(
    {
      checks: report.checks,
      resources: report.resources,
      errors: report.errors,
    },
    null,
    2,
  ),
);
