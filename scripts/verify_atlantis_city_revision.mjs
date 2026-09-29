import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/atlantis_city_revision";
await mkdir(directory, { recursive: true });
const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  checks: [],
  measurements: [],
  screenshots: [],
  errors: [],
  limits: [
    "Actual development renderer, region lighting, fog, materials and normal quality; no diagnostic lights or fog changes.",
    "Positions and character length are staged to inspect all districts. Free-camera captures pause play, hide HUD/avatar and reset camera up before lookAt; they are labeled separately from follow-camera play views.",
    "Draw calls and triangles are one controlled frame, including the configured rendering pipeline; they are not FPS or real-device performance measurements.",
    "The overview respects actual fog and city culling, and cannot show every district simultaneously. Coverage is independently measured from the real paved meshes.",
    "390px is desktop Chrome viewport emulation, not physical-phone acceptance or a full natural progression run.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
async function frames(count = 6) {
  await page.evaluate(
    (remaining) =>
      new Promise((resolve) => {
        function sample() {
          if (--remaining <= 0) resolve();
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
  report.measurements.push(
    await page.evaluate((name) => {
      const game = window.__ABYSSAL__;
      return {
        name,
        viewport: [innerWidth, innerHeight],
        mode: game.mode,
        position: game.position.toArray(),
        camera: game.camera.position.toArray(),
        cameraUp: game.camera.up.toArray(),
        fog: game.scene.fog.density,
        render: { ...game.renderer.info.render },
        memory: { ...game.renderer.info.memory },
        cityStats: game.ocean.city.stats,
        visibleChunks: game.ocean.city.root.children.filter(
          (node) => node.name.startsWith("city_district_") && node.visible,
        ).length,
      };
    }, name),
  );
}
async function stage(position, { length = 12, yaw = 0, pitch = -0.12 } = {}) {
  if (await page.evaluate(() => window.__ABYSSAL__.mode === "paused"))
    await page.keyboard.press("Escape");
  await page.evaluate(
    ({ position, length, yaw, pitch }) => {
      const game = window.__ABYSSAL__;
      document.body.removeAttribute("data-city-audit");
      game.avatar.visible = true;
      game.player.health = 100;
      game.player.hunger = 100;
      game.setLength(length);
      game.setPosition(...position);
      game.setFacing(yaw, pitch);
    },
    { position, length, yaw, pitch },
  );
  await frames(10);
  assert.equal(await page.evaluate(() => window.__ABYSSAL__.mode), "playing");
}
try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ABYSSAL__?.guide);
  await page.locator("header [data-language-select]").selectOption("en");
  await page.locator("#region-select").click();
  await page.locator('[data-choice-value="atlantis"]').click();
  await frames();
  const ecology = await page.evaluate(async () => {
    const game = window.__ABYSSAL__;
    const { isPositionBlocked, bodyRadius } = await import("/src/collision.js");
    const { seabedHeight } = await import("/src/ocean.js");
    const { isNursery } = await import("/src/nursery_rules.js");
    const { atlantisDistrict } = await import("/src/atlantis_city_plan.js");
    const invalid = [],
      counts = {},
      districts = {};
    for (const entity of game.entities) {
      const p = entity.mesh.position,
        species = entity.species;
      counts[species.kind] = (counts[species.kind] || 0) + 1;
      const district = atlantisDistrict(p.x, p.z)?.id || "outside";
      districts[district] = (districts[district] || 0) + 1;
      if (
        isPositionBlocked(p, {
          colliders: game.ocean.colliders,
          radius: Math.max(0.45, species.length * 0.18),
        }) ||
        p.y < seabedHeight(p.x, p.z) + species.length * 0.35 + 2.99
      )
        invalid.push({
          kind: species.kind,
          index: entity.populationIndex,
          position: p.toArray(),
        });
    }
    const spawn = game.position.clone().fromArray(game.expedition.region.spawn);
    const nursery = game.entities.filter((entity) =>
      isNursery(entity.mesh.position),
    );
    return {
      population: game.entities.length,
      counts,
      districts,
      invalid,
      nurseryPopulation: nursery.length,
      nurseryPredators: nursery.filter((entity) => entity.species.predator)
        .length,
      spawnBlocked: isPositionBlocked(spawn, {
        colliders: game.ocean.colliders,
        radius: bodyRadius(3),
        length: 3,
      }),
      stats: game.ocean.city.stats,
    };
  });
  report.measurements.push({ name: "Initial real region ecology", ...ecology });
  assert.equal(ecology.population, 390);
  assert.equal(Object.keys(ecology.counts).length, 17);
  assert.deepEqual(ecology.invalid, []);
  assert.equal(ecology.spawnBlocked, false);
  assert.equal(ecology.nurseryPredators, 0);
  assert.ok(ecology.nurseryPopulation >= 160);
  assert.ok(ecology.stats.coverage >= 2 / 3);
  report.checks.push(
    "Expanded city retains all 17 species / 390 legal spawns and a safe nursery",
  );
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  const views = await page.evaluate(async () => {
    const { seabedHeight } = await import("/src/ocean.js");
    const floor = (x, z, offset) => [x, seabedHeight(x, z) + offset, z];
    const head = window.__ABYSSAL__.ocean.landmarks.find(
      (entry) => entry.id === "poseidon_statue",
    ).position;
    return [
      {
        name: "harbor",
        position: floor(-85, -165, 75),
        target: floor(0, -240, 20),
        play: floor(0, -180, 38),
      },
      {
        name: "market",
        position: floor(-110, -390, 85),
        target: floor(0, -450, 25),
        play: floor(0, -425, 38),
      },
      {
        name: "civic",
        position: floor(-95, -550, 85),
        target: floor(35, -615, 24),
        play: floor(0, -575, 42),
      },
      {
        name: "royal",
        position: floor(140, -735, 150),
        target: floor(0, -845, 80),
        play: floor(0, -765, 65),
      },
      {
        name: "necropolis",
        position: floor(110, -990, 78),
        target: floor(0, -1030, 25),
        play: floor(85, -1005, 42),
      },
      {
        name: "poseidon",
        position: [head.x + 83, head.y + 28, head.z + 94],
        target: [head.x, head.y - 27, head.z],
      },
      {
        name: "city_overview",
        position: [215, -205, -470],
        target: [0, -495, -700],
      },
    ];
  });
  await page.addStyleTag({
    content:
      'body[data-city-audit="free"] :is(#hud,#overlay,header,#target,#notification,#touch-controls,#sonar-markers){visibility:hidden!important}',
  });
  for (const view of views) {
    await stage(view.position, { length: 3, pitch: 0 });
    await page.keyboard.press("Escape");
    await page.evaluate((view) => {
      const game = window.__ABYSSAL__;
      document.body.dataset.cityAudit = "free";
      game.avatar.visible = false;
      game.camera.position.set(...view.position);
      game.camera.up.set(0, 1, 0);
      game.camera.lookAt(...view.target);
      game.camera.updateMatrixWorld(true);
      game.visuals.render();
    }, view);
    await frames(2);
    await capture(
      `1440_${view.name}_free`,
      "Controlled free camera; real lighting/fog; HUD/avatar hidden",
    );
  }
  report.checks.push(
    "All five districts, Poseidon and overview captured in unchanged real region lighting/fog",
  );
  for (const [width, height] of [
    [1440, 900],
    [390, 667],
  ]) {
    await page.setViewportSize({ width, height });
    for (const name of ["harbor", "civic", "royal"]) {
      const view = views.find((entry) => entry.name === name);
      await stage(view.play, { length: name === "royal" ? 25 : 12 });
      await capture(
        `${width}_${name}_play`,
        "Staged position/size; actual active follow-camera gameplay with HUD and unmodified AI",
      );
    }
  }
  report.checks.push(
    "Desktop and 390px phone follow-camera views preserve HUD and normal active simulation",
  );
  assert.deepEqual(report.errors, []);
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify({
    checks: report.checks.length,
    screenshots: report.screenshots.length,
    errors: report.errors,
  }),
);
