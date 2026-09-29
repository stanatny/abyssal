import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";
import { getExpedition } from "../src/expedition_config.js";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/atlantis_verification";
const newKinds = [
  "spadefish",
  "seahorse",
  "cuttlefish",
  "blue_shark",
  "swordfish",
  "ichthyosaur",
  "helicoprion",
];
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
  measurements: [],
  screenshots: [],
  errors: [],
  limits: [
    "Chrome viewport/touch emulation does not establish performance or controls on a physical phone.",
    "Scene screenshots use staged world positions and the real game renderer; they are not a natural full-round playthrough.",
    "Resource checks cover repeated menu region switching after both map caches have warmed, not a long-duration soak test.",
    "Geometry, collision, and memory checks do not establish artistic quality. Review the actual screenshots independently.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function settle(page, frames = 4) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        function sample() {
          if (--count <= 0) resolve();
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
    frames,
  );
}

async function selectRegion(page, id) {
  await page.locator("#region-select").click();
  const picker = page.locator("#expedition-picker");
  await picker.waitFor({ state: "visible" });
  await picker.locator(`[data-choice-value="${id}"]`).click();
  await picker.waitFor({ state: "hidden" });
  await page.waitForFunction(
    (id) => window.__ABYSSAL__.expedition.region.id === id,
    id,
  );
  await settle(page);
}

async function capture(page, name) {
  const path = `${directory}/${name}.png`;
  await page.screenshot({ path });
  report.screenshots.push(path);
}

async function worldSnapshot(page) {
  return page.evaluate(() => {
    const game = window.__ABYSSAL__;
    let nodes = 0;
    game.scene.traverse(() => nodes++);
    return {
      region: game.expedition.region.id,
      mode: game.mode,
      population: game.entities.length,
      kinds: [...new Set(game.entities.map((entry) => entry.species.kind))],
      ids: game.entities.map((entry) => entry.mesh.uuid),
      ships: game.surface.ships.map((ship) => ({
        id: ship.root.uuid,
        length: ship.length,
        width: ship.width,
      })),
      bosses: game.encounters.bosses
        .filter((entry) => entry.enabled)
        .map((entry) => ({
          kind: entry.state.species.kind,
          home: entry.home.toArray(),
        })),
      worldColliders: game.ocean.colliders.length,
      fleetColliders: game.surface.colliders.length,
      memory: {
        nodes,
        geometries: game.renderer.info.memory.geometries,
        textures: game.renderer.info.memory.textures,
        programs: game.renderer.info.programs.length,
      },
    };
  });
}

async function assertDetached(page, ids) {
  const retained = await page.evaluate(
    (ids) =>
      ids.filter((uuid) =>
        window.__ABYSSAL__.scene.getObjectByProperty("uuid", uuid),
      ),
    ids,
  );
  assert.deepEqual(
    retained,
    [],
    "Inactive region objects must leave the scene",
  );
}

async function validateEnvironmentBuffers(page) {
  const geometryReport = await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const checked = new Set();
    const invalid = [];
    game.scene.traverse((node) => {
      if (!node.geometry || checked.has(node.geometry)) return;
      checked.add(node.geometry);
      for (const [name, attribute] of Object.entries(
        node.geometry.attributes,
      )) {
        const firstInvalid = attribute.array.findIndex(
          (value) => !Number.isFinite(value),
        );
        if (firstInvalid !== -1)
          invalid.push({
            object: node.name || node.type,
            geometry: node.geometry.name,
            attribute: name,
            firstInvalid,
          });
      }
      if (
        node.isInstancedMesh &&
        !node.instanceMatrix.array.every(Number.isFinite)
      )
        invalid.push({ object: node.name, attribute: "instanceMatrix" });
    });
    return { geometries: checked.size, invalid };
  });
  assert.deepEqual(
    geometryReport.invalid,
    [],
    "The actual environment has finite geometry and instance buffers",
  );
  report.measurements.push({
    check: "Scene geometry integrity",
    ...geometryReport,
  });
}

async function validateSpawn(page, character) {
  const snapshot = await page.evaluate(async () => {
    const game = window.__ABYSSAL__;
    const { bodyRadius, isPositionBlocked } = await import("/src/collision.js");
    const { seabedHeight } = await import("/src/ocean.js");
    const { isNursery, canPredatorHunt } = await import(
      "/src/nursery_rules.js"
    );
    const { canEat } = await import("/src/simulation.js");
    const spawn = game.position.clone().fromArray(game.expedition.region.spawn);
    const config = game.expedition.character;
    const invalid = [];
    for (const entity of game.entities) {
      const position = entity.mesh.position;
      const radius = Math.max(0.45, entity.species.length * 0.18);
      if (
        isPositionBlocked(position, {
          colliders: game.ocean.colliders,
          radius,
        }) ||
        position.y <
          seabedHeight(position.x, position.z) +
            entity.species.length * 0.35 +
            2.99
      )
        invalid.push(`${entity.species.kind}:${entity.populationIndex}`);
    }
    const nursery = game.entities.filter((entity) =>
      isNursery(entity.mesh.position),
    );
    return {
      character: config.id,
      blocked: isPositionBlocked(spawn, {
        colliders: [...game.ocean.colliders, ...game.surface.colliders],
        radius: bodyRadius(config.startLength),
        length: config.startLength,
        forward: { x: 0, y: 0, z: -1 },
      }),
      safe: isNursery(spawn),
      invalid,
      nurseryPopulation: nursery.length,
      nurseryPredators: nursery.filter((entity) => entity.species.predator)
        .length,
      nearbyFood: nursery.filter(
        (entity) =>
          canEat(
            { ...game.player, length: config.startLength },
            entity.species.length,
          ) && entity.mesh.position.distanceTo(spawn) < 35,
      ).length,
      activeHunters: game.entities.filter((entity) =>
        canPredatorHunt(
          entity.species,
          entity.populationIndex,
          entity.mesh.position,
          spawn,
        ),
      ).length,
    };
  });
  assert.equal(snapshot.character, character);
  assert.equal(snapshot.blocked, false);
  assert.equal(snapshot.safe, true);
  assert.deepEqual(snapshot.invalid, []);
  assert.ok(snapshot.nurseryPopulation >= 160);
  assert.equal(snapshot.nurseryPredators, 0);
  assert.equal(snapshot.activeHunters, 0);
  assert.ok(snapshot.nearbyFood >= 24);
  report.measurements.push({ check: "Native Atlantis spawn", ...snapshot });
}

async function inspectGuide(page, language, tag) {
  await page.locator("#open-guide").click();
  await page.locator("#ocean-guide").waitFor({ state: "visible" });
  assert.equal(await page.locator("#guide-region").inputValue(), "current");
  assert.ok(
    (await page.locator("#guide-region option:checked").innerText()).includes(
      language === "en" ? "Atlantis" : "亚特兰蒂斯",
    ),
  );
  for (const kind of newKinds) {
    const entry = page.locator(`[data-catalog-id="${kind}"]`);
    await entry.click();
    await settle(page, 2);
    const text = await page.locator(".guide-info").innerText();
    assert.ok(text.length > 120, `${kind} has a full guide entry`);
    assert.equal(/[\u3400-\u9fff]/u.test(text), language === "zh-CN");
  }
  assert.equal(await page.locator('[data-catalog-id="shark"]').count(), 0);
  await page.locator('[data-category="lord"]').click();
  assert.deepEqual(
    await page
      .locator(".guide-entry")
      .evaluateAll((entries) =>
        entries.map((entry) => entry.dataset.catalogId),
      ),
    ["kraken"],
  );
  await page.locator("#guide-region").selectOption("all");
  assert.equal(await page.locator(".guide-entry").count(), 4);
  await page.locator("#guide-region").selectOption("current");
  await page.locator('[data-category="all"]').click();
  await page.locator('[data-catalog-id="ichthyosaur"]').click();
  for (let repeat = 0; repeat < 3; repeat++)
    await page.locator('[data-catalog-id="ichthyosaur"]').click();
  assert.equal(await page.locator(".guide-availability").count(), 1);
  assert.equal(await page.locator(".guide-extra-fact").count(), 2);
  assert.equal(await page.locator(".guide-feeding-note").count(), 1);
  const bounds = await page.evaluate(() => {
    const dialog = document.querySelector("#ocean-guide");
    return {
      width: dialog.clientWidth,
      scroll: dialog.scrollWidth,
      viewport: innerWidth,
    };
  });
  assert.ok(
    bounds.scroll <= bounds.width + 1,
    "Guide has no horizontal overflow",
  );
  if (bounds.viewport === 390) {
    await page.setViewportSize({ width: 320, height: 667 });
    await settle(page);
    assert.equal(
      await page.evaluate(() => {
        const dialog = document.querySelector("#ocean-guide");
        const select = document
          .querySelector("#guide-region")
          .getBoundingClientRect();
        return (
          dialog.scrollWidth > dialog.clientWidth + 1 ||
          select.right > innerWidth
        );
      }),
      false,
      "Guide region controls fit a 320px viewport",
    );
    await page.setViewportSize({ width: 390, height: 667 });
    await settle(page);
  }
  await capture(page, `${tag}_guide`);
  await page.locator(".guide-close").click();
  report.checks.push(
    `${tag}: new species render in the bilingual guide; regional/all-region filters isolate Kraken correctly`,
  );
}

try {
  for (const { viewport, character, language } of [
    {
      viewport: { width: 1440, height: 900 },
      character: "orca",
      language: "en",
    },
    {
      viewport: { width: 390, height: 667 },
      character: "squid",
      language: "zh-CN",
    },
  ]) {
    const tag = `${viewport.width}_${character}_${language}`;
    const context = await browser.newContext({
      viewport,
      locale: language === "en" ? "en-US" : language,
      colorScheme: "dark",
      hasTouch: viewport.width < 900,
      isMobile: viewport.width < 900,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    page.on("pageerror", (error) =>
      report.errors.push(`${tag}: ${error.message}`),
    );
    page.on("console", (entry) => {
      if (entry.type() === "error")
        report.errors.push(`${tag}: ${entry.text()}`);
    });
    await page.goto(baseUrl);
    await page.waitForFunction(() => !!window.__ABYSSAL__?.expedition);
    await settle(page);
    const hawaii = await worldSnapshot(page);
    assert.equal(hawaii.region, "hawaii");
    assert.equal(hawaii.population, 285);
    assert.equal(hawaii.kinds.length, 24);
    assert.ok(newKinds.every((kind) => !hawaii.kinds.includes(kind)));
    await page.locator("#region-select").click();
    const options = await page
      .locator("#expedition-picker [data-choice-value]")
      .evaluateAll((entries) =>
        entries.map((entry) => ({
          id: entry.dataset.choiceValue,
          disabled: entry.disabled,
        })),
      );
    assert.deepEqual(
      options.filter((entry) => !entry.disabled).map((entry) => entry.id),
      ["hawaii", "atlantis"],
    );
    assert.equal(options.filter((entry) => entry.disabled).length, 2);
    await page.locator(".picker-close").click();
    await selectCharacter(page, character);
    await selectRegion(page, "atlantis");
    let atlantis = await worldSnapshot(page);
    assert.equal(atlantis.population, 390);
    assert.equal(atlantis.kinds.length, 17);
    assert.ok(newKinds.every((kind) => atlantis.kinds.includes(kind)));
    assert.equal(atlantis.bosses.length, 3);
    assert.deepEqual(
      atlantis.bosses,
      getExpedition("atlantis").region.bossInstances.map(({ kind, home }) => ({
        kind,
        home: [...home],
      })),
    );
    assert.ok(atlantis.worldColliders > 0);
    assert.ok(atlantis.fleetColliders > 0);
    assert.equal(atlantis.ships.length, 3);
    assert.ok(
      atlantis.ships.every((ship) => ship.length > 0 && ship.length < 70),
    );
    await assertDetached(page, [
      ...hawaii.ids,
      ...hawaii.ships.map((ship) => ship.id),
    ]);
    await validateEnvironmentBuffers(page);
    await validateSpawn(page, character);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await capture(page, `${tag}_menu`);
    report.checks.push(
      `${tag}: actual selection replaces Hawaii ecology, fleet, collision world and guardians; safe native spawn`,
    );

    if (viewport.width === 1440) {
      const samples = [];
      // 首轮建立两地图的模型缓存；随后重复切换必须稳定，不能累计场景或GPU资源。
      for (let cycle = 0; cycle < 3; cycle++) {
        await selectRegion(page, "hawaii");
        const currentHawaii = await worldSnapshot(page);
        assert.equal(currentHawaii.population, 285);
        assert.deepEqual(currentHawaii.ids, hawaii.ids);
        assert.ok(
          currentHawaii.bosses.every((entry) =>
            ["kraken", "mayan", "hydra", "leviathan"].includes(entry.kind),
          ),
        );
        await assertDetached(page, [
          ...atlantis.ids,
          ...atlantis.ships.map((ship) => ship.id),
        ]);
        samples.push({ cycle, ...currentHawaii.memory, region: "hawaii" });
        await selectRegion(page, "atlantis");
        const currentAtlantis = await worldSnapshot(page);
        assert.deepEqual(currentAtlantis.ids, atlantis.ids);
        assert.deepEqual(currentAtlantis.bosses, atlantis.bosses);
        await assertDetached(page, [
          ...currentHawaii.ids,
          ...currentHawaii.ships.map((ship) => ship.id),
        ]);
        samples.push({ cycle, ...currentAtlantis.memory, region: "atlantis" });
        atlantis = currentAtlantis;
      }
      for (const region of ["hawaii", "atlantis"]) {
        const warm = samples.find(
          (sample) => sample.region === region && sample.cycle === 1,
        );
        const last = samples.find(
          (sample) => sample.region === region && sample.cycle === 2,
        );
        for (const [key, allowance] of Object.entries({
          nodes: 8,
          geometries: 8,
          textures: 2,
          programs: 2,
        })) {
          assert.ok(
            last[key] <= warm[key] + allowance,
            `${region} ${key} grows after warmed map switch: ${warm[key]} -> ${last[key]}`,
          );
        }
      }
      report.measurements.push({ check: "Repeated region switching", samples });
      report.checks.push(
        "Repeated real menu switching detaches inactive worlds, reuses each region's creature meshes, and stabilizes rendered GPU resources",
      );
    }

    await inspectGuide(page, language, tag);
    const alternate = language === "en" ? "zh-CN" : "en";
    await page.locator("header [data-language-select]").selectOption(alternate);
    assert.equal(await page.locator("html").getAttribute("lang"), alternate);
    assert.equal(
      /[\u3400-\u9fff]/u.test(await page.locator(".intro").innerText()),
      alternate === "zh-CN",
    );
    assert.equal((await worldSnapshot(page)).region, "atlantis");
    await page.locator("header [data-language-select]").selectOption(language);
    assert.deepEqual((await worldSnapshot(page)).ids, atlantis.ids);
    report.checks.push(
      `${tag}: live language switching preserves the selected map and population while translating its introduction`,
    );
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.waitForFunction(() => window.__ABYSSAL__.player.elapsed >= 3);
    const initialPlay = await page.evaluate(() => ({
      character: window.__ABYSSAL__.player.characterId,
      health: window.__ABYSSAL__.player.health,
      hunger: window.__ABYSSAL__.player.hunger,
      region: window.__ABYSSAL__.expedition.region.id,
      population: window.__ABYSSAL__.entities.length,
    }));
    assert.equal(initialPlay.character, character);
    assert.equal(initialPlay.region, "atlantis");
    assert.equal(initialPlay.population, 390);
    assert.equal(initialPlay.health, 100);
    assert.ok(initialPlay.hunger > 95);
    await capture(page, `${tag}_shallow`);
    report.measurements.push({
      check: `${tag} unmodified first three seconds`,
      ...initialPlay,
    });
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "paused");
    await page.locator("#return-menu").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    const restarted = await worldSnapshot(page);
    assert.equal(restarted.region, "atlantis");
    assert.equal(restarted.population, 390);
    assert.deepEqual(restarted.ids, atlantis.ids);
    assert.deepEqual(restarted.bosses, atlantis.bosses);
    report.checks.push(
      `${tag}: real start survives the native nursery and restart retains selected ecology, avatar and guardian home`,
    );

    // 仅移动调试相机的跟随目标；灯光、雾、领主和模型仍走实际游戏循环。
    await page.evaluate(() => {
      const game = window.__ABYSSAL__;
      game.setLength(25);
      game.setPosition(0, -385, -625);
      game.setFacing(0, -0.3);
    });
    await settle(page, 12);
    await capture(page, `${tag}_city`);

    if (viewport.width === 1440) {
      const thermal = await page.evaluate(async () => {
        const game = window.__ABYSSAL__;
        const { seabedHeight } = await import("/src/ocean.js");
        const { isPositionBlocked } = await import("/src/collision.js");
        game.startGame();
        for (const entry of game.entities) entry.hiddenFor = 999;
        for (const boss of game.encounters.bosses) boss.enabled = false;
        for (const hazard of game.humans.hazards) hazard.active = false;
        const z = -1000;
        let point = null;
        for (const x of [240, 220, 260, -240, -220, -260]) {
          const candidate = { x, y: seabedHeight(x, z) + 3.3, z };
          if (
            !isPositionBlocked(candidate, {
              colliders: game.ocean.colliders,
              radius: 1,
            })
          ) {
            point = candidate;
            break;
          }
        }
        if (!point)
          throw new Error("No clear deep seabed point for thermal regression");
        game.setPosition(point.x, point.y, point.z);
        game.setFacing(Math.PI / 2, 0);
        const begin = game.player.elapsed;
        const result = {
          samplesNearFloor: 0,
          minimumHealth: 100,
          minimumGap: Infinity,
          location: point,
        };
        return new Promise((resolve) => {
          function sample() {
            const gap =
              game.position.y - seabedHeight(game.position.x, game.position.z);
            result.minimumGap = Math.min(result.minimumGap, gap);
            result.minimumHealth = Math.min(
              result.minimumHealth,
              game.player.health,
            );
            if (gap < 4.5) result.samplesNearFloor++;
            if (game.player.elapsed - begin >= 1) resolve(result);
            else requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        });
      });
      assert.ok(thermal.samplesNearFloor > 0);
      assert.equal(
        thermal.minimumHealth,
        100,
        "Atlantis has no invisible Hawaii thermal damage",
      );
      report.measurements.push({
        check: "Deep seabed thermal isolation",
        ...thermal,
      });
      report.checks.push(
        "Actual Atlantis gameplay beside its deep seabed does not apply Hawaii's hydrothermal burn",
      );
      await page.evaluate(() => {
        const game = window.__ABYSSAL__;
        game.startGame();
        game.setPosition(200, -35, -100);
        game.setFacing(0, 0.68);
      });
      await page.keyboard.down("Space");
      await page.waitForFunction(
        () => window.__ABYSSAL__.surface.airborne,
        {},
        { timeout: 30000 },
      );
      await page.waitForFunction(
        () => window.__ABYSSAL__.camera.position.y > 4,
      );
      await capture(page, `${tag}_night_surface`);
      await page.keyboard.up("Space");
      report.checks.push(
        "Night surface captured during the real charged breach, with the normal camera and surface state",
      );
    }
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
