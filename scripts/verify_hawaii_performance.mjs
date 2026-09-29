import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.ABYSSAL_PERF_DIRECTORY || ".local/hawaii_performance";
await mkdir(out, { recursive: true });
const url = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const browser = await chromium.launch({
  channel: "chrome",
  headless: process.env.ABYSSAL_PERF_HEADED !== "1",
});
const report = { url, samples: [], errors: [], at: new Date().toISOString() };
try {
  const page = await browser.newPage({
    viewport: {
      width: Number(process.env.ABYSSAL_PERF_WIDTH || 1440),
      height: Number(process.env.ABYSSAL_PERF_HEIGHT || 900),
    },
    locale: "en-US",
    reducedMotion: "reduce",
  });
  await page.addInitScript(() => {
    let seed = 71523;
    Math.random = () =>
      (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
    window.__longTasks = [];
    new PerformanceObserver((l) =>
      window.__longTasks.push(
        ...l.getEntries().map((e) => ({ start: e.startTime, ms: e.duration })),
      ),
    ).observe({ type: "longtask", buffered: true });
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.keyboard.down("KeyK");
  for (const scenario of [
    { name: "nursery", position: [0, -18, 55], length: 3, yaw: 0 },
    { name: "reef", position: [35, -70, -150], length: 10, yaw: 0 },
    { name: "volcano", position: [-20, -525, -900], length: 25, yaw: 0 },
  ])
    for (const high of [true, false]) {
      if (
        (await page.evaluate(() => window.__ABYSSAL__.visuals.enabled)) !== high
      )
        await page.click("#quality");
      await page.evaluate((scenario) => {
        const g = window.__ABYSSAL__;
        g.setLength(scenario.length);
        g.player.health = 100;
        g.player.hunger = 100;
        g.setPosition(...scenario.position);
        g.setFacing(scenario.yaw, -0.1);
      }, scenario);
      await page.waitForTimeout(1500);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.start");
      const sample = await page.evaluate(async (scenario) => {
        const g = window.__ABYSSAL__,
          timings = [],
          parts = {};
        for (const [name, o, k] of [
          ["render", g.visuals, "render"],
          ["ocean", g.ocean, "update"],
          ["humans", g.humans, "update"],
          ["encounters", g.encounters, "update"],
          ["surface", g.surface, "update"],
          ["audio", g.audio, "update"],
        ]) {
          const old = o[k];
          o[k] = function (...a) {
            const t = performance.now();
            const r = old.apply(this, a);
            (parts[name] ??= []).push(performance.now() - t);
            return r;
          };
          (window.__restore ??= []).push(() => (o[k] = old));
        }
        let last = performance.now();
        for (let i = 0; i < 120; i++) {
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          timings.push(now - last);
          last = now;
          g.setPosition(...scenario.position);
          g.setFacing(scenario.yaw, -0.1);
        }
        for (const f of window.__restore) f();
        window.__restore = [];
        const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
        const gl = g.renderer.getContext(),
          ext = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          scenario: scenario.name,
          high: g.visuals.enabled,
          meanMs: mean(timings),
          fps: 1000 / mean(timings),
          p95Ms: [...timings].sort((a, b) => a - b)[
            Math.floor(timings.length * 0.95)
          ],
          times: timings,
          parts: Object.fromEntries(
            Object.entries(parts).map(([k, v]) => [
              k,
              { mean: mean(v), max: Math.max(...v) },
            ]),
          ),
          population: g.entities.length,
          calls: g.renderer.info.render.calls,
          triangles: g.renderer.info.render.triangles,
          position: g.position.toArray(),
          gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        };
      }, scenario);
      const { profile } = await cdp.send("Profiler.stop");
      const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
      const parents = new Map(
        profile.nodes.flatMap((n) =>
          (n.children || []).map((id) => [id, n.id]),
        ),
      );
      const included = {};
      profile.samples.forEach((id, i) => {
        const seen = new Set();
        while (nodes.has(id)) {
          const name = nodes.get(id).callFrame.functionName;
          if (!seen.has(name)) {
            included[name] = (included[name] || 0) + profile.timeDeltas[i];
            seen.add(name);
          }
          id = parents.get(id);
        }
      });
      sample.cpuMsPerFrame = Object.fromEntries(
        [
          "frame",
          "updateEntities",
          "resolveCreatureMotion",
          "queryWorldSegment",
          "pushFromRocks",
          "castSegment",
          "segmentCollider",
          "updateMatrixWorld",
        ].map((name) => [
          name,
          (included[name] || 0) / 1000 / sample.times.length,
        ]),
      );
      await writeFile(
        `${out}/${scenario.name}_${high ? "high" : "smooth"}_cpu.json`,
        JSON.stringify(profile),
      );
      await cdp.detach();
      report.samples.push(sample);
      console.log(
        JSON.stringify({
          scenario: sample.scenario,
          high: sample.high,
          meanMs: sample.meanMs,
          fps: sample.fps,
          p95Ms: sample.p95Ms,
          calls: sample.calls,
          triangles: sample.triangles,
        }),
      );
      await page.screenshot({
        path: `${out}/${scenario.name}_${high ? "high" : "smooth"}.png`,
      });
    }
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
