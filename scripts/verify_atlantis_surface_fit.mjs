import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/atlantis_surface_fit";
await mkdir(directory, { recursive: true });
const report = {
  baseUrl,
  checks: [],
  screenshots: [],
  errors: [],
  limits: [
    "One actual charged breach uses normal follow camera and the existing surface simulation; the starting position and heading are staged.",
    "The other views are explicitly controlled free cameras with HUD/avatar hidden. Lighting, fog, island transforms and the lighthouse remain unchanged.",
    "Close inspection moves the free camera beyond the playable swim boundary; this is an asset inspection, not an accessible player position.",
    "390px desktop Chrome emulation is not physical-phone acceptance.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") report.errors.push(m.text());
});
async function frames(count = 6) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        function sample() {
          if (--count <= 0) resolve();
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
    count,
  );
}
async function capture(name, kind) {
  const path = `${directory}/${name}.png`;
  await page.screenshot({ path });
  report.screenshots.push({ path, kind });
}
try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ABYSSAL__?.surface);
  await page.locator("header [data-language-select]").selectOption("en");
  await page.locator("#region-select").click();
  await page.locator('[data-choice-value="atlantis"]').click();
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  const fit = await page.evaluate(
    () =>
      window.__ABYSSAL__.scene.getObjectByName("atlantis_islands").userData
        .surfaceFit,
  );
  await page.evaluate((x) => {
    const g = window.__ABYSSAL__;
    g.setPosition(x, -35, -40);
    g.setFacing(Math.PI, 0.68);
  }, fit.beacon.x);
  await page.keyboard.down("Space");
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.surface.airborne &&
      window.__ABYSSAL__.camera.position.y > 4,
    {},
    { timeout: 20000 },
  );
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.surface.airborne &&
      window.__ABYSSAL__.camera.position.y > 8 &&
      window.__ABYSSAL__.forward.y < 0.08,
    {},
    { timeout: 12000 },
  );
  await capture(
    "1440_normal_breach",
    "Actual charged breach and normal follow camera, staged start/heading",
  );
  report.checks.push(
    await page.evaluate(() => ({
      name: "Real surface breach",
      airborne: window.__ABYSSAL__.surface.airborne,
      camera: window.__ABYSSAL__.camera.position.toArray(),
      position: window.__ABYSSAL__.position.toArray(),
    })),
  );
  await page.keyboard.up("Space");
  await page.keyboard.press("Escape");
  await page.addStyleTag({
    content:
      'body[data-surface-fit="free"] :is(#hud,#overlay,header,#target,#notification,#touch-controls,#sonar-markers){visibility:hidden!important}',
  });
  const x = fit.beacon.x;
  for (const view of [
    {
      name: "front",
      position: [x, 5, 138],
      target: [x, 15, 330],
      quality: true,
    },
    {
      name: "left",
      position: [x - 90, 7, 135],
      target: [x, 18, 330],
      quality: true,
    },
    {
      name: "right",
      position: [x + 95, 7, 135],
      target: [x, 18, 330],
      quality: true,
    },
    {
      name: "close",
      position: [x - 19, 24, 281],
      target: [x, 20, 330],
      quality: true,
    },
    {
      name: "close_smooth",
      position: [x - 19, 24, 281],
      target: [x, 20, 330],
      quality: false,
    },
  ]) {
    await page.evaluate(({ position, target, quality }) => {
      const g = window.__ABYSSAL__;
      document.body.dataset.surfaceFit = "free";
      g.avatar.visible = false;
      g.camera.position.set(...position);
      g.camera.up.set(0, 1, 0);
      g.camera.lookAt(...target);
      g.camera.updateMatrixWorld(true);
      for (let i = 1; i <= 25; i++)
        g.surface.update(
          0.2,
          g.elapsed + i * 0.2,
          g.player,
          g.position,
          g.camera,
          false,
          quality,
        );
      g.visuals.render();
    }, view);
    await frames(2);
    await capture(
      `1440_${view.name}`,
      "Controlled camera; actual night lighting/fog and world geometry",
    );
  }
  await page.setViewportSize({ width: 390, height: 667 });
  for (const [name, position, target] of [
    ["front", [x, 5, 138], [x, 15, 330]],
    ["close", [x - 19, 24, 281], [x, 20, 330]],
  ]) {
    await page.evaluate(
      ({ position, target }) => {
        const g = window.__ABYSSAL__;
        g.camera.position.set(...position);
        g.camera.lookAt(...target);
        g.camera.updateMatrixWorld(true);
        g.visuals.render();
      },
      { position, target },
    );
    await frames(2);
    await capture(`390_${name}`, "390px controlled camera, actual geometry");
  }
  report.checks.push(
    await page.evaluate(async () => {
      const THREE = await import("/node_modules/three/build/three.module.js");
      const g = window.__ABYSSAL__,
        islands = g.scene.getObjectByName("atlantis_islands"),
        mesh = islands.getObjectByName("atlantis_island_ridges");
      const geo = mesh.geometry.clone();
      geo.setDrawRange(0, mesh.userData.terrainVertexCount);
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const terrain = new THREE.Mesh(geo, material);
      terrain.matrixWorld.copy(mesh.matrixWorld);
      const ray = new THREE.Raycaster();
      let samples = 0,
        worstGap = -Infinity;
      for (const support of [
        islands.userData.surfaceFit.beacon,
        ...islands.userData.surfaceFit.villages,
      ])
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * Math.PI * 2,
            r = support === islands.userData.surfaceFit.beacon ? 2.05 : 1.4;
          ray.set(
            new THREE.Vector3(
              support.x + Math.cos(a) * r,
              200,
              support.z + Math.sin(a) * r,
            ),
            new THREE.Vector3(0, -1, 0),
          );
          const hit = ray.intersectObject(terrain)[0];
          if (!hit) throw new Error("Missing island ground under a support");
          worstGap = Math.max(worstGap, support.bottom - hit.point.y);
          samples++;
        }
      geo.dispose();
      material.dispose();
      return {
        name: "Actual rendered terrain supports",
        samples,
        worstGap,
        fit: islands.userData.surfaceFit,
        drawCalls: g.renderer.info.render.calls,
      };
    }),
  );
  assert.ok(report.checks.at(-1).worstGap < 0);
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify(
    {
      checks: report.checks.length,
      screenshots: report.screenshots.length,
      errors: report.errors,
    },
    null,
    2,
  ),
);
