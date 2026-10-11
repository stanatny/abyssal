import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
const out = process.env.ABYSSAL_PERF_DIRECTORY || ".local/resource_budget";
await mkdir(out, { recursive: true });
const report = {
  at: new Date().toISOString(),
  url: process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/",
  rounds: [],
  errors: [],
  method:
    "Headed Chrome, 1440x900 DPR2 High; all eight maps through native selectors/start/pause/Home; post-GC Runtime heap including backing storage is separate from GPU resource counters.",
};
const browser = await chromium.launch({
  channel: "chrome",
  headless: false,
  args: ["--no-proxy-server"],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  reducedMotion: "reduce",
  locale: "en-US",
});
page.setDefaultTimeout(90000);
page.on("pageerror", (e) => report.errors.push(e.message));
const cdp = await page.context().newCDPSession(page);
await cdp.send("Performance.enable");
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
async function snapshot() {
  await cdp.send("HeapProfiler.collectGarbage");
  const heap = await cdp.send("Runtime.getHeapUsage");
  const dom = await cdp.send("Memory.getDOMCounters");
  const data = await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    function inventory(roots) {
      const geometries = new Set(),
        materials = new Set(),
        buffers = new Set(),
        skeletons = new Set();
      let objects = 0,
        meshes = 0,
        triangles = 0,
        bytes = 0;
      for (const root of roots)
        root.traverse((o) => {
          objects++;
          if (o.isMesh) {
            meshes++;
            const geo = o.geometry;
            if (!geometries.has(geo)) {
              geometries.add(geo);
              triangles +=
                (geo.index?.count ?? geo.attributes.position?.count ?? 0) / 3;
              for (const a of [
                geo.index,
                ...Object.values(geo.attributes),
                ...Object.values(geo.morphAttributes).flat(),
              ].filter(Boolean)) {
                const buffer = (a.array ?? a.data?.array)?.buffer;
                if (buffer && !buffers.has(buffer)) {
                  buffers.add(buffer);
                  bytes += buffer.byteLength;
                }
              }
            }
            for (const m of [].concat(o.material || [])) materials.add(m);
            if (o.skeleton) skeletons.add(o.skeleton);
          }
        });
      return {
        objects,
        meshes,
        geometries: geometries.size,
        geometryArrayBufferBytes: bytes,
        uniqueGeometryTriangles: triangles,
        materials: materials.size,
        skeletons: skeletons.size,
      };
    }
    const enabled = g.encounters.bosses.filter((b) => b.enabled),
      inactive = g.encounters.bosses.filter((b) => !b.enabled);
    return {
      region: g.expedition.region.id,
      mode: g.mode,
      population: g.entities.length,
      canvas: [g.renderer.domElement.width, g.renderer.domElement.height],
      renderer: {
        ...g.renderer.info.memory,
        programs: g.renderer.info.programs.length,
      },
      scene: inventory([g.scene]),
      bossPool: {
        connectedDisabled: inactive.filter((b) => b.mesh.parent).length,
        total: g.encounters.bosses.length,
        enabled: enabled.map((b) => b.state.species.kind),
        inactiveKinds: inactive.map((b) => b.state.species.kind),
        inactive: inventory(inactive.map((b) => b.mesh)),
      },
      audio: {
        state: g.audio.context?.state,
        voices: g.audio.voices.size,
        musicVoices: g.audio.musicVoices.size,
        zombieVoices: g.audio.zombieVoices.size,
        zombieBuffers: g.audio.zombieBuffers.size,
        feedingBuffers: g.audio.feedingBuffers.size,
        retiredRooms: g.audio.retiredMusicRooms.length,
      },
    };
  });
  return { ...data, heap, dom };
}
try {
  const began = Date.now();
  await page.goto(report.url);
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  report.firstReadyMs = Date.now() - began;
  await page.locator("[data-language-select]").selectOption("en");
  for (let round = 0; round < Number(process.env.AUDIT_ROUNDS || 3); round++)
    for (const region of [
      "hawaii",
      "atlantis",
      "bermuda",
      "mariana",
      "amazon",
      "europa",
      "penglai",
      "odyssey",
    ]) {
      const stamp = await page.evaluate(() => performance.now());
      const began = Date.now();
      if (
        (await page.evaluate(
          () => document.querySelector("#region-select").value,
        )) !== region
      ) {
        await page.click("#region-select");
        await page.click(`[data-choice-value="${region}"]`);
      }
      await page.waitForFunction(
        (id) =>
          window.__ABYSSAL__.expedition.region.id === id &&
          !window.__ABYSSAL__.regionLoading,
        region,
      );
      const switchMs = Date.now() - began;
      const tasks = await page.evaluate(
        (s) => window.__tasks.filter((x) => x.at >= s),
        stamp,
      );
      await page.click("#start");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
      await page.waitForTimeout(1000);
      await page.click("#pause");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "paused");
      await page.waitForTimeout(300);
      const state = await snapshot();
      const result = { round, region, switchMs, longTasks: tasks, ...state };
      report.rounds.push(result);
      console.log(
        JSON.stringify({
          round,
          region,
          switchMs,
          maxTask: Math.max(0, ...tasks.map((t) => t.ms)),
          heap: state.heap,
          resources: state.renderer,
          sceneObjects: state.scene.objects,
          inactiveBossObjects: state.bossPool.inactive.objects,
        }),
      );
      await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
      await page.click("#return-menu");
      await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    }
  for (const sample of report.rounds) {
    assert.equal(
      sample.population,
      report.rounds.find((r) => r.region === sample.region).population,
    );
    assert.equal(sample.bossPool.connectedDisabled, 0);
  }
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  process.exitCode = 1;
  await page.screenshot({ path: `${out}/failed.png` }).catch(() => {});
} finally {
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
}
