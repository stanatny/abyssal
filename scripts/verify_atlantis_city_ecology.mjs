import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const directory =
  process.env.ABYSSAL_ECOLOGY_DIRECTORY || ".local/atlantis_city_ecology";
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const scope = process.env.ABYSSAL_ECOLOGY_SCOPE || "full";
const reportName = scope === "full" ? "report.json" : `${scope}_report.json`;
await mkdir(directory, { recursive: true });
const sourcePaths = [
  "src/main.js",
  "src/region_ecology.js",
  "src/ecosystem_population.js",
  "src/atlantis_city_ecology.js",
  "src/atlantis_city.js",
  "src/atlantis_underways.js",
  "src/simulation.js",
  "src/navigation.js",
  "src/collision.js",
  "src/static_collider_grid.js",
  "src/creatures.js",
  "src/atlantis_architecture.js",
];
async function sourceHashes() {
  return Object.fromEntries(
    await Promise.all(
      sourcePaths.map(async (path) => [
        path,
        createHash("sha256")
          .update(await readFile(path))
          .digest("hex"),
      ]),
    ),
  );
}
const report = {
  startedAt: new Date().toISOString(),
  sourceHashes: await sourceHashes(),
  baseUrl,
  scope,
  checks: [],
  initial: [],
  movement: [],
  feeding: [],
  nutrition: [],
  errors: [],
  limits: [
    "Real development renderer and normal gameplay feeding, occlusion, movement and respawn code. No lights, fog, hunger formula, prey nutrition or capture rules are changed.",
    "Player character length, health, hunger, inspection viewpoints and the initial encounter approach are staged. Prey remain in their naturally spawned city positions and move normally; keyboard sprint performs contact. This is controlled feeding evidence, not natural encounter-rate or full-round evidence.",
    "The meal model starts at zero hunger and 60 health. Travel is a stated 15-second reserve plus a 15-second battle reserve; unobstructed cruise distance is illustrative and not a city pathfinding guarantee.",
    "Browser frame times are a headless desktop observation, not physical-phone or player-device acceptance.",
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

async function frames(count = 4) {
  return page.evaluate(
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
async function audit() {
  return page.evaluate(async () => {
    const g = window.__ABYSSAL__;
    const { isPositionBlocked } = await import("/src/collision.js");
    const { isNursery } = await import("/src/nursery_rules.js");
    const { sharesHabitat } = await import("/src/ecosystem_population.js");
    const { atlantisDistrict } = await import("/src/atlantis_city_plan.js");
    const invalid = [],
      nurseryPredators = [],
      cities = {},
      counts = {};
    for (const e of g.entities) {
      const p = e.mesh.position,
        s = e.species,
        habitat = e.school?.habitat || s;
      counts[s.kind] = (counts[s.kind] || 0) + 1;
      if (e.hiddenFor > 0) continue;
      if (
        isPositionBlocked(p, {
          colliders: g.ocean.colliders,
          radius: Math.max(0.45, s.length * 0.18),
        }) ||
        (e.school && !sharesHabitat(habitat, p, 0.05))
      )
        invalid.push({
          kind: s.kind,
          index: e.populationIndex,
          position: p.toArray(),
          band: [habitat.depthMin, habitat.depthMax],
        });
      if (isNursery(p) && s.predator) nurseryPredators.push(s.kind);
      if (habitat.cityResident) {
        const district = atlantisDistrict(p.x, p.z)?.id || "outside";
        cities[district] = (cities[district] || 0) + 1;
      }
    }
    return {
      population: g.entities.length,
      counts,
      cities,
      invalid,
      nurseryPredators,
      nursery: g.entities.filter((e) => isNursery(e.mesh.position)).length,
      colliders: g.ocean.city.colliders.length,
      render: { ...g.renderer.info.render },
      memory: { ...g.renderer.info.memory },
    };
  });
}
async function openCharacter(character) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ABYSSAL__?.guide);
  await page.locator("header [data-language-select]").selectOption("en");
  await page.locator("#region-select").click();
  await page.locator('[data-choice-value="atlantis"]').click();
  await page.locator("#character-select").click();
  await page.locator(`[data-choice-value="${character}"]`).click();
  await page.waitForFunction(
    () =>
      !window.__ABYSSAL__.regionLoading &&
      window.__ABYSSAL__.expedition.region.id === "atlantis" &&
      window.__ABYSSAL__.entities.length === 390,
  );
  await frames();
  const initial = await audit();
  assert.equal(initial.population, 390);
  assert.equal(Object.keys(initial.counts).length, 17);
  assert.deepEqual(initial.invalid, []);
  assert.deepEqual(initial.nurseryPredators, []);
  assert.ok(initial.nursery >= 168);
  assert.equal(Object.keys(initial.cities).length, 5);
  assert.equal(
    Object.values(initial.cities).reduce((sum, count) => sum + count, 0),
    114,
  );
  report.initial.push({ character, ...initial });
  console.log(`${character}: ${initial.population} legal initial spawns`);
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await frames(12);
}
async function feed(character, length) {
  const setup = await page.evaluate(
    async ({ length }) => {
      const g = window.__ABYSSAL__;
      const { isPositionBlocked, bodyRadius, castSegment } = await import(
        "/src/collision.js"
      );
      const { seabedHeight } = await import("/src/ocean.js");
      const { preyCaptureRadius } = await import("/src/prey_capture.js");
      g.setLength(length);
      g.player.hunger = 20;
      g.player.health = 60;
      g.player.stamina = 100;
      const targets = g.entities.filter(
        (e) =>
          e.species.length >= 13 &&
          e.species.length <= 20 &&
          e.hiddenFor <= 0 &&
          e.mesh.position.z < -500 &&
          e.mesh.position.z > -1050,
      );
      targets.sort((a, b) => b.species.length - a.species.length);
      for (const e of targets) {
        const p = e.mesh.position;
        const direction = e.velocity.clone().multiplyScalar(-1);
        direction.y = 0;
        if (direction.length() < 0.1) direction.set(0, 0, -1);
        direction.normalize();
        const start = p.clone().addScaledVector(direction, -38);
        if (
          start.y < seabedHeight(start.x, start.z) + bodyRadius(length) + 2 ||
          isPositionBlocked(start, {
            colliders: g.ocean.colliders,
            radius: bodyRadius(length),
            length,
            forward: direction,
          }) ||
          castSegment(start, p, g.ocean.colliders)
        )
          continue;
        const yaw = Math.atan2(-direction.x, -direction.z);
        g.setFacing(yaw, 0);
        g.setPosition(...start.toArray());
        window.__cityFeedingTarget = e;
        const gap = g.getCapturePoint().distanceTo(p);
        return {
          kind: e.species.kind,
          index: e.populationIndex,
          target: p.toArray(),
          start: start.toArray(),
          character: g.player.characterId,
          length,
          eaten: g.player.eaten,
          hunger: g.player.hunger,
          health: g.player.health,
          elapsed: g.player.elapsed,
          captureGap: gap,
          captureRadius: preyCaptureRadius(length, e.species.length),
          targetLength: e.species.length,
        };
      }
      throw new Error("No legal city feeding approach");
    },
    { length },
  );
  assert.equal(setup.character, character);
  assert.ok(setup.captureGap > setup.captureRadius);
  await page.keyboard.down("Space");
  let passed = false;
  try {
    await page.waitForFunction(
      () => window.__cityFeedingTarget.hiddenFor > 0,
      null,
      { timeout: 18000 },
    );
    passed = true;
  } finally {
    await page.keyboard.up("Space");
  }
  const result = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = window.__cityFeedingTarget;
    return {
      eaten: g.player.eaten,
      hunger: g.player.hunger,
      health: g.player.health,
      elapsed: g.player.elapsed,
      meal: { ...g.player.lastMeal },
      position: g.position.toArray(),
      targetPosition: e.mesh.position.toArray(),
      hiddenFor: e.hiddenFor,
      feedingActive: g.feeding.has(e.mesh),
      mode: g.mode,
      collision: g.lastCollision?.blocked,
    };
  });
  report.feeding.push({ setup, result, passed });
  assert.ok(result.eaten > setup.eaten);
  assert.ok(result.hunger > setup.hunger);
  assert.ok(result.health > setup.health);
  assert.ok(result.meal.nutrition > 40);
  assert.ok(result.feedingActive);
  await frames(3);
  await page.screenshot({
    path: `${directory}/${character}_${length}m_feed.png`,
  });
  console.log(
    `${character} ${length}m: ate ${setup.kind}, nutrition ${result.meal.nutrition}`,
  );
  return { setup, result };
}

try {
  if (scope === "full") {
    for (const character of ["orca", "squid"]) {
      await openCharacter(character);
      for (const length of [25, 30]) await feed(character, length);
      report.checks.push(
        `${character}: actual moving city prey consumed at 25 m and 30 m via keyboard sprint`,
      );
      const performance = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const g = window.__ABYSSAL__,
              samples = [];
            let previous = performance.now();
            function sample(now) {
              samples.push(now - previous);
              previous = now;
              if (samples.length < 90) requestAnimationFrame(sample);
              else {
                const measured = samples.slice(15).sort((a, b) => a - b);
                resolve({
                  character: g.player.characterId,
                  position: g.position.toArray(),
                  medianFrameMs: measured[Math.floor(measured.length / 2)],
                  p95FrameMs: measured[Math.floor(measured.length * 0.95)],
                  render: { ...g.renderer.info.render },
                  memory: { ...g.renderer.info.memory },
                  visiblePrey: g.entities.filter((e) => e.mesh.visible).length,
                });
              }
            }
            requestAnimationFrame(sample);
          }),
      );
      (report.performance ??= []).push(performance);
    }
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      g.setLength(3);
      g.player.health = 100;
      g.player.hunger = 100;
      g.setPosition(0, -18, 75);
      g.setFacing(0, 0);
      window.__cityMovement = g.entities
        .filter((e) => e.school?.habitat.cityResident)
        .map((e) => ({ e, start: e.mesh.position.clone() }));
    });
    await page.keyboard.down("KeyK");
    await page.waitForTimeout(6000);
    const movement = await page.evaluate(() =>
      window.__cityMovement.map(({ e, start }) => ({
        kind: e.species.kind,
        index: e.populationIndex,
        moved: e.mesh.position.distanceTo(start),
        hidden: e.hiddenFor > 0,
      })),
    );
    await page.keyboard.up("KeyK");
    assert.ok(movement.filter((e) => e.moved > 1).length >= 100);
    report.movement.push({
      residents: movement.length,
      moving: movement.filter((e) => e.moved > 1).length,
      maximum: Math.max(...movement.map((e) => e.moved)),
    });
    const afterMovement = await audit();
    assert.deepEqual(afterMovement.invalid, []);
    assert.deepEqual(afterMovement.nurseryPredators, []);
    report.movement.push(afterMovement);
    report.checks.push(
      "City schools move in assigned layers without entering solids or the nursery",
    );

    const respawn = await page.evaluate(async () => {
      const g = window.__ABYSSAL__,
        target = window.__cityFeedingTarget;
      const { isPositionBlocked } = await import("/src/collision.js");
      return {
        kind: target.species.kind,
        remaining: target.hiddenFor,
        blocked: isPositionBlocked(target.mesh.position, {
          colliders: g.ocean.colliders,
          radius: Math.max(0.45, target.species.length * 0.18),
        }),
      };
    });
    if (respawn.remaining > 0)
      await page.waitForFunction(
        () => window.__cityFeedingTarget.hiddenFor <= 0,
        null,
        { timeout: 65000 },
      );
    const respawnAudit = await audit();
    assert.deepEqual(respawnAudit.invalid, []);
    report.checks.push(
      "Naturally consumed large prey returned through the normal 28-second respawn path",
    );
    report.respawn = respawnAudit;
  } else {
    await openCharacter("squid");
  }
  if (scope === "density") {
    await page.evaluate(() => {
      const g = window.__ABYSSAL__;
      window.__densityMovement = g.entities
        .filter((e) => e.school?.habitat.cityResident)
        .map((e) => ({ entity: e, start: e.mesh.position.clone() }));
    });
    await page.keyboard.down("KeyK");
    await page.waitForTimeout(6000);
    await page.keyboard.up("KeyK");
    const movement = await page.evaluate(() =>
      window.__densityMovement.map(({ entity, start }) => ({
        kind: entity.species.kind,
        moved: entity.mesh.position.distanceTo(start),
      })),
    );
    assert.equal(movement.length, 114);
    assert.ok(movement.filter((entry) => entry.moved > 1).length >= 100);
    const live = await audit();
    assert.deepEqual(live.invalid, []);
    assert.deepEqual(live.nurseryPredators, []);
    report.movement.push({
      residents: movement.length,
      moving: movement.filter((entry) => entry.moved > 1).length,
      maximum: Math.max(...movement.map((entry) => entry.moved)),
      audit: live,
    });
    report.checks.push(
      "The denser native city population retains 114 mobile residents and legal school layers",
    );
    for (const view of [
      { name: "deep_city_small_school", point: [0, -400, -617] },
      { name: "deep_city_tuna_school", point: [-25, -510, -795] },
    ]) {
      await page.evaluate((point) => {
        const g = window.__ABYSSAL__;
        g.setLength(16);
        g.player.health = 100;
        g.player.hunger = 100;
        g.setFacing(0, 0);
        g.setPosition(...point);
      }, view.point);
      await frames(8);
      await page.screenshot({ path: `${directory}/${view.name}.png` });
    }
  }
  const schoolSetup = await page.evaluate(async (scope) => {
    const g = window.__ABYSSAL__;
    const { preyCaptureRadius } = await import("/src/prey_capture.js");
    const { isPositionBlocked, bodyRadius, castSegment } = await import(
      "/src/collision.js"
    );
    const schoolMember = g.entities.find(
      (e) =>
        (scope === "density"
          ? e.species.kind === "sardine" &&
            e.school?.habitat.cityResident &&
            Math.abs(e.school.center.x - 18) < 3 &&
            Math.abs(e.school.center.z + 650) < 3
          : e.school?.habitat.citySite === "harbor_sanctuary") &&
        e.hiddenFor <= 0,
    );
    if (!schoolMember) throw new Error("No native city school target");
    const target = schoolMember.school.members
      .filter((entity) => entity.hiddenFor <= 0)
      .toSorted((a, b) => b.mesh.position.z - a.mesh.position.z)[0];
    g.setLength(3);
    g.player.hunger = 30;
    g.player.health = 80;
    g.player.stamina = 100;
    const p = target.mesh.position;
    g.setFacing(0, 0);
    g.setPosition(p.x, p.y, p.z + 3.5);
    window.__citySchool = target.school;
    window.__citySchoolTarget = null;
    return {
      bodyBlocked: isPositionBlocked(g.position, {
        colliders: g.ocean.colliders,
        radius: bodyRadius(3),
        length: 3,
        forward: p.clone().set(0, 0, -1),
      }),
      approachBlocked: Boolean(castSegment(g.position, p, g.ocean.colliders)),
      captureGap: Math.min(
        ...target.school.members.map((e) =>
          g.getCapturePoint().distanceTo(e.mesh.position),
        ),
      ),
      captureRadius: preyCaptureRadius(3, target.species.length),
      kind: target.species.kind,
      index: target.populationIndex,
      position: p.toArray(),
      hunger: g.player.hunger,
      eaten: g.player.eaten,
      habitat: {
        depthMin: target.school.habitat.depthMin,
        depthMax: target.school.habitat.depthMax,
      },
      center: target.school.center.toArray(),
    };
  }, scope);
  assert.ok(schoolSetup.captureGap > schoolSetup.captureRadius);
  assert.equal(schoolSetup.bodyBlocked, false);
  assert.equal(schoolSetup.approachBlocked, false);
  report.schoolSetup = schoolSetup;
  await page.keyboard.down("Space");
  try {
    await page.waitForFunction(
      () => window.__citySchool.members.some((entity) => entity.hiddenFor > 0),
      null,
      { timeout: 12000 },
    );
  } finally {
    await page.keyboard.up("Space");
  }
  await page.evaluate(() => {
    window.__citySchoolTarget = window.__citySchool.members.find(
      (entity) => entity.hiddenFor > 0,
    );
  });
  const schoolFed = await page.evaluate(() => ({
    hiddenFor: window.__citySchoolTarget.hiddenFor,
    eaten: window.__ABYSSAL__.player.eaten,
    meal: { ...window.__ABYSSAL__.player.lastMeal },
    feedingActive: window.__ABYSSAL__.feeding.has(
      window.__citySchoolTarget.mesh,
    ),
  }));
  assert.ok(schoolFed.eaten > schoolSetup.eaten);
  assert.ok(schoolFed.feedingActive);
  assert.ok(schoolFed.hiddenFor > 17 && schoolFed.hiddenFor <= 18);
  await frames(3);
  await page.screenshot({
    path: `${directory}/${scope === "density" ? "deep_city" : "gallery"}_school_feed.png`,
  });
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(0, -18, 75);
    g.setFacing(0, 0);
    g.player.health = 100;
    g.player.hunger = 100;
  });
  await page.keyboard.down("KeyK");
  try {
    await page.waitForFunction(
      () => window.__citySchoolTarget.hiddenFor <= 0,
      null,
      { timeout: 65000 },
    );
  } finally {
    await page.keyboard.up("KeyK");
  }
  const schoolRespawn = await page.evaluate(async () => {
    const g = window.__ABYSSAL__,
      e = window.__citySchoolTarget;
    const { isPositionBlocked } = await import("/src/collision.js");
    const { sharesHabitat } = await import("/src/ecosystem_population.js");
    return {
      position: e.mesh.position.toArray(),
      hiddenFor: e.hiddenFor,
      blocked: isPositionBlocked(e.mesh.position, {
        colliders: g.ocean.colliders,
        radius: 0.45,
      }),
      inLayer: sharesHabitat(e.school.habitat, e.mesh.position, 0),
      distanceFromCenter: e.mesh.position.distanceTo(e.school.center),
    };
  });
  assert.equal(schoolRespawn.blocked, false);
  assert.equal(schoolRespawn.inLayer, true);
  assert.ok(schoolRespawn.distanceFromCenter < 20);
  report.schoolRespawn = {
    setup: schoolSetup,
    fed: schoolFed,
    respawn: schoolRespawn,
  };
  report.checks.push(
    `A naturally moving ${scope === "density" ? "deep-city" : "harbor-gallery"} fish was eaten and returned legally to its original school through the 18-second respawn path`,
  );

  report.nutrition = await page.evaluate(async () => {
    const g = window.__ABYSSAL__;
    const { createPlayer, canEat, consumePrey, hungerDrainRate } = await import(
      "/src/simulation.js"
    );
    const rows = [];
    for (const character of ["orca", "squid"])
      for (const [length, depth, minPrey, maxDepth] of [
        [3, 18, 0.1, 72],
        [6, 80, 3, 200],
        [10, 180, 5, 330],
        [16, 300, 10, 500],
        [25, 440, 12, 650],
        [30, 540, 13, 660],
      ]) {
        const player = createPlayer(character);
        player.length = length;
        const meals = g.entities.filter(
          (e) =>
            canEat(player, e.species.length) &&
            e.species.length >= minPrey &&
            -e.mesh.position.y <= maxDepth &&
            (length < 25 || e.mesh.position.z < -500),
        );
        let best;
        for (const e of meals) {
          const p = createPlayer(character);
          Object.assign(p, {
            length,
            mass: (length / 6) ** 3,
            hunger: 0,
            health: 60,
          });
          consumePrey(p, e.species);
          const drain = hungerDrainRate(length, depth),
            seconds = p.lastMeal.nutrition / drain;
          if (!best || seconds > best.seconds)
            best = {
              kind: e.species.kind,
              nutrition: p.lastMeal.nutrition,
              healed: p.lastMeal.healed,
              growth: p.lastMeal.growth,
              seconds,
              drain,
              travelReserve: drain * 15,
              battleReserve: drain * 15,
              remainingAfterReserves: p.lastMeal.nutrition - drain * 30,
            };
        }
        rows.push({
          character,
          length,
          worldDepth: depth,
          displayDepth: depth * 4,
          availableMeals: meals.length,
          ...best,
        });
      }
    return rows;
  });
  assert.ok(report.nutrition.every((row) => row.remainingAfterReserves > 0));
  assert.deepEqual(report.errors, []);
  report.finalSourceHashes = await sourceHashes();
  assert.deepEqual(
    report.finalSourceHashes,
    report.sourceHashes,
    "Sources changed during browser verification",
  );
} catch (error) {
  report.failure = error.stack;
  await page.screenshot({ path: `${directory}/failure.png` }).catch(() => {});
  throw error;
} finally {
  report.finishedAt = new Date().toISOString();
  await writeFile(
    `${directory}/${reportName}`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
console.log(
  JSON.stringify(
    {
      checks: report.checks,
      feeding: report.feeding,
      nutrition: report.nutrition,
      errors: report.errors,
    },
    null,
    2,
  ),
);
