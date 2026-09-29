import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { getExpedition } from "../src/expedition_config.js";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/atlantis_guardians";
const expected = getExpedition("atlantis").region.bossInstances;
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
  screenshots: [],
  measurements: [],
  errors: [],
  limits: [
    "Staged approach positions use the real game loop, renderer, collisions, and abilities; they are not a natural full-round playthrough.",
    "Chrome desktop and phone viewport emulation do not establish physical-device performance or touch controls.",
    "Resource measurements cover a warmed session with repeated map changes and restarts, not a long-duration soak test.",
    "Resource-only warm-up briefly renders every existing scene node without visibility or frustum culling, then restores all flags; screenshots and encounter checks use normal visibility.",
    "Whole-renderer shader counts and cache keys are recorded separately; environment teardown and recreation can replace their identities, so they are not guardian-pool lifecycle assertions.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function settle(page, count = 6) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        const sample = () => {
          if (--count <= 0) resolve();
          else requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
    count,
  );
}

async function selectRegion(page, id) {
  await page.locator("#region-select").click();
  await page.locator(`[data-choice-value="${id}"]`).click();
  await page.waitForFunction(
    (id) => window.__ABYSSAL__.expedition.region.id === id,
    id,
  );
  await settle(page);
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    const flags = [];
    g.scene.traverse((node) => {
      flags.push([node, node.visible, node.frustumCulled]);
      node.visible = true;
      node.frustumCulled = false;
    });
    try {
      g.renderer.render(g.scene, g.camera);
    } finally {
      for (const [node, visible, culled] of flags) {
        node.visible = visible;
        node.frustumCulled = culled;
      }
    }
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__;
    const resources = (roots) => {
      const nodes = new Set(),
        geometries = new Set(),
        materials = new Set(),
        textures = new Set();
      for (const root of roots)
        root.traverse((node) => {
          nodes.add(node.uuid);
          if (node.geometry) geometries.add(node.geometry.uuid);
          for (const material of node.material
            ? Array.isArray(node.material)
              ? node.material
              : [node.material]
            : []) {
            materials.add(material.uuid);
            for (const value of Object.values(material))
              if (value?.isTexture) textures.add(value.uuid);
            for (const uniform of Object.values(material.uniforms || {}))
              if (uniform.value?.isTexture) textures.add(uniform.value.uuid);
          }
        });
      return Object.fromEntries(
        Object.entries({ nodes, geometries, materials, textures }).map(
          ([key, value]) => [key, [...value].sort()],
        ),
      );
    };
    const sceneResources = resources([g.scene]);
    const guardianResources = resources(
      g.encounters.bosses.flatMap((entry) => [
        entry.mesh,
        entry.ring,
        entry.label,
        entry.fx.group,
      ]),
    );
    let nodes = 0;
    g.scene.traverse(() => nodes++);
    return {
      enabled: g.encounters.bosses
        .filter((entry) => entry.enabled)
        .map((entry) => ({
          id: entry.id,
          kind: entry.state.species.kind,
          home: entry.home.toArray(),
          radius: entry.radius,
          mesh: entry.mesh.uuid,
          health: entry.state.health,
          defeated: entry.state.defeated,
          phase: entry.state.phase,
          ring: entry.ring.visible,
        })),
      pool: g.encounters.bosses.map((entry) => entry.mesh.uuid),
      programKeys: g.renderer.info.programs
        .map((program) => ({ name: program.name, cacheKey: program.cacheKey }))
        .sort((a, b) => a.cacheKey.localeCompare(b.cacheKey)),
      guardianResources,
      sceneResourceCounts: Object.fromEntries(
        Object.entries(sceneResources).map(([key, value]) => [
          key,
          value.length,
        ]),
      ),
      memory: {
        nodes,
        geometries: g.renderer.info.memory.geometries,
        textures: g.renderer.info.memory.textures,
        programs: g.renderer.info.programs.length,
      },
    };
  });
}

try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 667 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.goto(baseUrl);
    await page.waitForFunction(() => window.__ABYSSAL__);
    await page.locator("header [data-language-select]").selectOption("en");
    await selectRegion(page, "atlantis");
    const selected = await snapshot(page);
    assert.deepEqual(
      selected.enabled.map(({ id, kind, home, radius }) => ({
        id,
        kind,
        home,
        radius,
      })),
      expected,
    );
    for (let round = 0; round < 5; round++) {
      await selectRegion(page, "hawaii");
      const hawaii = await snapshot(page);
      assert.equal(hawaii.enabled.length, 2);
      assert.equal(new Set(hawaii.enabled.map((entry) => entry.kind)).size, 2);
      await selectRegion(page, "atlantis");
      assert.deepEqual((await snapshot(page)).pool, selected.pool);
    }
    const warm = await snapshot(page);
    const samples = [];
    let lastPrograms = warm.programKeys;
    for (let round = 0; round < 3; round++) {
      await selectRegion(page, "hawaii");
      await selectRegion(page, "atlantis");
      const sample = await snapshot(page);
      assert.deepEqual(sample.guardianResources, warm.guardianResources);
      assert.deepEqual(sample.sceneResourceCounts, warm.sceneResourceCounts);
      for (const key of ["nodes", "geometries", "textures"])
        assert.equal(sample.memory[key], warm.memory[key]);
      const newPrograms = sample.programKeys.filter(
        (program) =>
          !lastPrograms.some(
            (previous) => previous.cacheKey === program.cacheKey,
          ),
      );
      lastPrograms = sample.programKeys;
      samples.push({
        round,
        memory: sample.memory,
        sceneResourceCounts: sample.sceneResourceCounts,
        newPrograms,
      });
    }
    const switched = await snapshot(page);
    for (const key of ["nodes", "geometries", "textures"])
      assert.equal(switched.memory[key], warm.memory[key]);
    report.measurements.push({
      viewport,
      mapSwitchMemory: switched.memory,
      samples,
      guardianResourceCounts: Object.fromEntries(
        Object.entries(switched.guardianResources).map(([key, value]) => [
          key,
          value.length,
        ]),
      ),
    });
    report.checks.push(
      `${viewport.width}px: ${5 + samples.length} map round trips retain the same guardian resources and whole-scene resource counts, preserving Hawaii's two different lords; shared shader cache changes are recorded separately`,
    );
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.waitForFunction(() => window.__ABYSSAL__.player.elapsed >= 2);
    assert.equal(
      await page.evaluate(() => window.__ABYSSAL__.player.health),
      100,
    );
    assert.ok(
      (await snapshot(page)).enabled.every(
        (entry) => entry.phase === "dormant",
      ),
    );

    for (const target of expected) {
      await page.evaluate((id) => {
        const g = window.__ABYSSAL__;
        g.startGame();
        g.setLength(25);
        const entry = g.encounters.bosses.find((entry) => entry.id === id);
        g.setPosition(entry.home.x, entry.home.y, entry.home.z + 48);
        g.setFacing(0, 0);
      }, target.id);
      await page.waitForFunction(
        (id) =>
          window.__ABYSSAL__.encounters.bosses.find((entry) => entry.id === id)
            .state.phase === "windup",
        target.id,
      );
      const windup = await snapshot(page);
      assert.deepEqual(
        windup.enabled.filter((entry) => entry.ring).map((entry) => entry.id),
        [target.id],
      );
      const screenshot = `${directory}/${viewport.width}_${target.id}_windup.png`;
      await page.screenshot({ path: screenshot });
      report.screenshots.push(screenshot);
      await page.waitForFunction(
        (id) =>
          window.__ABYSSAL__.encounters.bosses.find((entry) => entry.id === id)
            .state.phase === "attack",
        target.id,
      );
      const attack = await snapshot(page);
      assert.deepEqual(
        attack.enabled
          .filter((entry) => entry.phase === "attack")
          .map((entry) => entry.id),
        [target.id],
      );
      assert.ok(
        attack.enabled
          .filter((entry) => entry.id !== target.id)
          .every(
            (entry) =>
              entry.phase === "dormant" && entry.health === 180 && !entry.ring,
          ),
      );
      report.measurements.push({
        viewport,
        guardian: target.id,
        windup: { enabled: windup.enabled, memory: windup.memory },
        attack: { enabled: attack.enabled, memory: attack.memory },
      });
    }
    report.checks.push(
      `${viewport.width}px: all three real city approaches show only the entered guardian's windup and attack`,
    );
    await page.evaluate(() => {
      for (const entry of window.__ABYSSAL__.encounters.bosses.filter(
        (entry) => entry.enabled,
      )) {
        entry.state.health = 0;
        entry.state.defeated = true;
      }
    });
    await page.keyboard.press("Escape");
    await page.locator("#return-menu").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    const restarted = await snapshot(page);
    assert.deepEqual(restarted.pool, selected.pool);
    assert.ok(
      restarted.enabled.every(
        (entry) => entry.health === 180 && !entry.defeated && !entry.ring,
      ),
    );
    report.checks.push(
      `${viewport.width}px: actual restart restores three healthy guardians using the same meshes`,
    );
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.success = true;
} catch (error) {
  report.success = false;
  report.failure = error.stack || String(error);
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
