import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.ABYSSAL_PERF_DIRECTORY || ".local/runtime_performance";
await mkdir(out, { recursive: true });
const report = {
  at: new Date().toISOString(),
  url: process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/",
  samples: [],
  errors: [],
};
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--no-proxy-server"],
});
try {
  for (const config of [
    {
      name: "hawaii_phone",
      region: "hawaii",
      width: 390,
      height: 844,
      dpr: 3,
      position: [0, -18, 55],
      length: 3,
    },
    {
      name: "atlantis_desktop",
      region: "atlantis",
      width: 1440,
      height: 900,
      dpr: 2,
      position: [0, -688, -895],
      length: 25,
    },
    {
      name: "mariana_desktop",
      region: "mariana",
      width: 1440,
      height: 900,
      dpr: 2,
      position: [110, -1150, -420],
      length: 30,
    },
  ]) {
    const page = await browser.newPage({
      viewport: { width: config.width, height: config.height },
      deviceScaleFactor: config.dpr,
      isMobile: config.name.includes("phone"),
      hasTouch: config.name.includes("phone"),
      locale: "en-US",
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(90000);
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.addInitScript(() => {
      let s = 71523;
      Math.random = () => (s = (1664525 * s + 1013904223) >>> 0) / 4294967296;
      window.__tasks = [];
      new PerformanceObserver((l) =>
        window.__tasks.push(
          ...l.getEntries().map((e) => ({ at: e.startTime, ms: e.duration })),
        ),
      ).observe({ type: "longtask", buffered: true });
    });
    await page.goto(report.url);
    await page.waitForFunction(
      () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
    );
    await page.locator("[data-language-select]").selectOption("en");
    if (config.region !== "hawaii") {
      await page.click("#region-select");
      await page.click(`[data-choice-value="${config.region}"]`);
      await page.waitForFunction(
        (id) =>
          window.__ABYSSAL__.expedition.region.id === id &&
          !window.__ABYSSAL__.regionLoading,
        config.region,
      );
    }
    for (const high of [true, false]) {
      if (
        (await page.evaluate(() => window.__ABYSSAL__.visuals.enabled)) !== high
      )
        await page.click("#quality");
      await page.click("#start");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
      await page.keyboard.down("k");
      await page.evaluate((c) => {
        const g = window.__ABYSSAL__;
        g.setLength(c.length);
        g.setPosition(...c.position);
        g.setFacing(0, -0.1);
      }, config);
      await page.waitForTimeout(1500);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.start");
      const sample = await page.evaluate(async () => {
        const g = window.__ABYSSAL__,
          gl = g.renderer.getContext(),
          ext = gl.getExtension("EXT_disjoint_timer_query_webgl2"),
          queries = [],
          gpu = [],
          parts = {},
          restores = [],
          times = [];
        for (const [name, o, k] of [
          ["render", g.visuals, "render"],
          ["ocean", g.ocean, "update"],
          ["encounters", g.encounters, "update"],
          ["humans", g.humans, "update"],
          ["audio", g.audio, "update"],
        ]) {
          const old = o[k];
          o[k] = function (...a) {
            const t = performance.now();
            let q;
            if (name === "render" && ext) {
              q = gl.createQuery();
              gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
            }
            const r = old.apply(this, a);
            if (q) {
              gl.endQuery(ext.TIME_ELAPSED_EXT);
              queries.push(q);
            }
            (parts[name] ??= []).push(performance.now() - t);
            return r;
          };
          restores.push(() => (o[k] = old));
        }
        const began = performance.now();
        let last = began;
        for (let i = 0; i < 180; i++) {
          await new Promise(requestAnimationFrame);
          const now = performance.now();
          times.push(now - last);
          last = now;
          while (
            queries.length &&
            gl.getQueryParameter(queries[0], gl.QUERY_RESULT_AVAILABLE)
          ) {
            const q = queries.shift();
            if (!gl.getParameter(ext.GPU_DISJOINT_EXT))
              gpu.push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
          }
        }
        restores.forEach((f) => f());
        queries.forEach((q) => gl.deleteQuery(q));
        const mean = (a) =>
          a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
        const sorted = [...times].sort((a, b) => a - b);
        const debug = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          frames: times.length,
          meanMs: mean(times),
          p50: sorted[90],
          p95: sorted[171],
          times,
          gpuMs: mean(gpu),
          gpuSamples: gpu.length,
          parts: Object.fromEntries(
            Object.entries(parts).map(([k, v]) => [
              k,
              { mean: mean(v), max: Math.max(...v) },
            ]),
          ),
          calls: g.renderer.info.render.calls,
          triangles: g.renderer.info.render.triangles,
          population: g.entities.length,
          memory: g.renderer.info.memory,
          heap: performance.memory?.usedJSHeapSize,
          pixelRatio: g.renderer.getPixelRatio(),
          canvas: [g.renderer.domElement.width, g.renderer.domElement.height],
          position: g.position.toArray(),
          camera: g.camera.position.toArray(),
          mode: g.mode,
          gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
          tasks: window.__tasks.filter((t) => t.at >= began),
          sceneObjects: (() => {
            let n = 0;
            g.scene.traverse(() => n++);
            return n;
          })(),
        };
      });
      const { profile } = await cdp.send("Profiler.stop");
      await cdp.detach();
      await writeFile(
        `${out}/${config.name}_${high ? "high" : "smooth"}_cpu.json`,
        JSON.stringify(profile),
      );
      const nodes = new Map(profile.nodes.map((n) => [n.id, n])),
        parents = new Map(
          profile.nodes.flatMap((n) =>
            (n.children || []).map((id) => [id, n.id]),
          ),
        ),
        inc = {};
      profile.samples.forEach((id, i) => {
        const seen = new Set();
        while (nodes.has(id)) {
          const n = nodes.get(id),
            name = n.callFrame.functionName || n.callFrame.url;
          if (!seen.has(name)) {
            inc[name] = (inc[name] || 0) + profile.timeDeltas[i];
            seen.add(name);
          }
          id = parents.get(id);
        }
      });
      sample.cpu = Object.fromEntries(
        Object.entries(inc)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 45)
          .map(([k, v]) => [k, v / 1000 / sample.frames]),
      );
      if (sample.mode !== "playing")
        throw new Error("Fixture left active play");
      sample.conditions = config;
      sample.name = config.name;
      sample.high = high;
      report.samples.push(sample);
      console.log(
        JSON.stringify({
          name: sample.name,
          high,
          meanMs: sample.meanMs,
          p95: sample.p95,
          gpuMs: sample.gpuMs,
          parts: sample.parts,
          topCPU: Object.entries(sample.cpu).slice(0, 12),
          calls: sample.calls,
          triangles: sample.triangles,
          sceneObjects: sample.sceneObjects,
        }),
      );
      await page.screenshot({
        path: `${out}/${config.name}_${high ? "high" : "smooth"}.png`,
      });
      await page.click("#pause");
      await page.keyboard.up("k");
      await page.click("#return-menu");
    }
    await page.close();
  }
  if (report.errors.length) throw new Error("Browser errors observed");
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
