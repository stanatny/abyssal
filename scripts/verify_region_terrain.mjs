import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { selectCharacter } from "./menu_picker_helpers.mjs";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5193/";
const directory = process.env.ABYSSAL_TERRAIN_OUTPUT || ".local/region_terrain";
// 元数据未给出完整入口路线时，可显式传入 [{site, points:[{x,y,z}, ...]}]。
const routeOverride = process.env.ABYSSAL_TERRAIN_ROUTES_JSON
  ? JSON.parse(process.env.ABYSSAL_TERRAIN_ROUTES_JSON)
  : null;
const sites = [
  { id: "harbor_sanctuary", x: -215, z: -240.5 },
  { id: "agora_bridges", x: 215, z: -447.5 },
].filter(
  (site) =>
    !process.env.ABYSSAL_TERRAIN_SITE ||
    site.id === process.env.ABYSSAL_TERRAIN_SITE,
);
assert.ok(sites.length, "Requested terrain site must exist");
const report = {
  baseUrl,
  scope: process.env.ABYSSAL_TERRAIN_SITE
    ? `Partial slice: ${process.env.ABYSSAL_TERRAIN_SITE}; other sites unverified`
    : "All planned excavated sites",
  checks: [],
  screenshots: [],
  expectedErrors: [],
  errors: [],
  limits: [
    "Desktop Chrome at 1440x900; development runtime and normal menu region/character selection.",
    "Live routes stage position once at the entrance and set heading each frame; descent and return displacement, floor projection, collision, vitals and follow camera use the running game. The lower-room screenshot pauses play without repositioning.",
    "Controlled heading is not a keyboard-navigation or natural-discovery test. Static sweeps separately cover 3m, 16m and 30m bodies in both directions.",
    "The Hawaii recovery probe intentionally starts below its terrain. One-shot compilation failure checks active terrain after rollback.",
    "Rendered-ground checks raycast actual seabed and available city paving triangles at route intervals no longer than 2.5m. A 2m seabed/sampler tolerance allows interpolation on the original roughly 5m terrain grid; the route/body clearance and surface-crossing checks remain separate.",
    "A missing seabed triangle is accepted only at an explicitly excavated sample and is recorded as an omitted opening, not a matched terrain height. These samples cannot prove the depth of the omitted terrain surface.",
    "Not a physical-device performance, full-round survival or subjective visual acceptance test.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
page.setDefaultTimeout(30000);
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("console", (entry) => {
  if (entry.type() !== "error") return;
  const text = entry.text();
  if (text.includes("Injected terrain rollback compilation failure"))
    report.expectedErrors.push(text);
  else report.errors.push(text);
});

try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__?.mode === "menu" && !window.__ABYSSAL__.regionLoading,
  );
  await page.locator("header [data-language-select]").selectOption("en");
  report.checks.push(await inspectTerrain("hawaii"));
  await selectRegion("atlantis");
  report.checks.push(await inspectTerrain("atlantis"));
  const routes = await discoverRoutes();
  report.routes = routes;
  const renderedTerrain = await inspectRenderedTerrain(routes);
  report.checks.push(renderedTerrain);
  assert.deepEqual(renderedTerrain.violations, []);
  report.checks.push(await sweepRoutes(routes));

  for (const character of ["orca", "squid"]) {
    await selectCharacter(page, character);
    await startPlaying();
    for (const route of routes) {
      report.checks.push(await swimRoute(route, character));
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => window.__ABYSSAL__?.mode === "paused");
      await capture(`${character}_${route.site}_underground`);
      await page.locator("#resume").click();
      await page.waitForFunction(() => window.__ABYSSAL__?.mode === "playing");
      report.checks.push(await swimRoute(route, character, true));
      await capture(`${character}_${route.site}_returned`);
    }
    await returnHome();
  }

  // 回滚发生在环境替换之后，动态采样闭包必须重新读取被恢复的旧环境。
  const priorOcean = await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const original = game.renderer.compileAsync;
    game.renderer.compileAsync = function (...args) {
      game.renderer.compileAsync = original;
      void args;
      throw new Error("Injected terrain rollback compilation failure");
    };
    return game.ocean.root.uuid;
  });
  await chooseRegion("hawaii");
  await page.locator("#region-loading button").waitFor({ state: "visible" });
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.ocean.root.uuid),
    priorOcean,
    "Rollback restores the original ocean object",
  );
  await page.locator("#region-loading button").click();
  await waitForRegion("atlantis");
  report.checks.push({
    ...(await inspectTerrain("atlantis")),
    phase: "rollback",
  });
  await startPlaying();
  report.checks.push({
    ...(await swimRoute(routes[0], "squid")),
    phase: "rollback",
  });
  report.checks.push({
    ...(await swimRoute(routes[0], "squid", true)),
    phase: "rollback",
  });
  await returnHome();

  // 两次完整切换验证采样不是首次创建时捕获的函数。
  for (let cycle = 1; cycle <= 2; cycle++) {
    await selectRegion("hawaii");
    report.checks.push({ ...(await inspectTerrain("hawaii")), cycle });
    await startPlaying();
    report.checks.push({ ...(await probeHawaiiFloor()), cycle });
    await returnHome();
    await selectRegion("atlantis");
    report.checks.push({ ...(await inspectTerrain("atlantis")), cycle });
  }
  assert.equal(report.expectedErrors.length, 1);
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  await browser.close();
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify({ checks: report.checks.length, errors: report.errors }),
);

async function chooseRegion(region) {
  await page.locator("#region-select").click();
  await page.locator("#expedition-picker").waitFor({ state: "visible" });
  await page.locator(`button[data-choice-value="${region}"]`).click();
}

async function selectRegion(region) {
  await chooseRegion(region);
  await waitForRegion(region);
}

async function waitForRegion(region) {
  await page.waitForFunction((region) => {
    const game = window.__ABYSSAL__;
    return (
      game?.mode === "menu" &&
      !game.regionLoading &&
      game.expedition.region.id === region &&
      document.querySelector("#region-select").value === region &&
      !document.querySelector("#menu").inert
    );
  }, region);
  await page.locator("#region-loading").waitFor({ state: "hidden" });
}

async function startPlaying() {
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__?.mode === "playing");
}

async function returnHome() {
  if (await page.evaluate(() => window.__ABYSSAL__.mode === "playing"))
    await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__ABYSSAL__?.mode === "paused");
  await page.locator("#return-menu").click();
  await page.waitForFunction(() => window.__ABYSSAL__?.mode === "menu");
}

async function inspectTerrain(region) {
  const result = await page.evaluate(
    async ({ sites, region }) => {
      const game = window.__ABYSSAL__;
      const { seabedHeight } = await import("/src/ocean.js");
      if (region === "atlantis" && typeof game.ocean.heightAt !== "function")
        throw new Error("Atlantis ocean.heightAt is unavailable");
      const heightAt = game.ocean.heightAt || seabedHeight;
      return {
        name: "Active terrain and unchanged exterior samples",
        region: game.expedition.region.id,
        environments: game.scene.getObjectsByProperty(
          "name",
          "ocean_environment",
        ).length,
        sites: sites.map((site) => ({
          ...site,
          base: seabedHeight(site.x, site.z),
          active: heightAt(site.x, site.z),
        })),
        exterior: [
          [0, 75],
          [0, -735],
          [-215, -999.5],
          [0, -450],
          [-150, -240.5],
          [150, -447.5],
        ].map(([x, z]) => ({
          x,
          z,
          base: seabedHeight(x, z),
          active: heightAt(x, z),
        })),
      };
    },
    { sites, region },
  );
  assert.equal(result.region, region);
  assert.equal(result.environments, 1);
  for (const sample of result.exterior)
    assert.equal(
      sample.active,
      sample.base,
      "Terrain outside excavations is unchanged",
    );
  for (const sample of result.sites) {
    if (region === "hawaii") assert.equal(sample.active, sample.base);
    else
      assert.ok(
        sample.active < sample.base - 20,
        `${sample.id} has a real excavation`,
      );
  }
  return result;
}

async function discoverRoutes() {
  return page.evaluate(
    async ({ sites, routeOverride }) => {
      const { seabedHeight } = await import("/src/ocean.js");
      const { ATLANTIS_EXCAVATION_SITES } = await import(
        "/src/atlantis_terrain.js"
      );
      const records = ATLANTIS_EXCAVATION_SITES;
      if (!Array.isArray(records))
        throw new Error("Underway route records are unavailable");
      const validPoint = (point) =>
        point && [point.x, point.y, point.z].every(Number.isFinite);
      return sites.map((site) => {
        const record = records.find((entry) => entry.reservation === site.id);
        if (!record) throw new Error(`Missing underway record: ${site.id}`);
        const candidates = routeOverride
          ? routeOverride
              .filter((route) => route.site === site.id)
              .map((route) => ({ key: "override", points: route.points }))
          : record.routes.map((route) => ({
              key: route.id,
              points: route.waypoints,
            }));
        for (const { key, points } of candidates) {
          if (
            !Array.isArray(points) ||
            points.length < 2 ||
            !points.every(validPoint)
          )
            throw new Error(`Invalid route points: ${site.id}/${key}`);
          for (const reversed of [false, true]) {
            const ordered = reversed ? [...points].reverse() : points;
            const first = ordered[0],
              last = ordered.at(-1);
            if (
              first.y >= seabedHeight(first.x, first.z) + 4 &&
              last.y <= seabedHeight(last.x, last.z) - 20
            )
              return {
                site: site.id,
                source: key,
                points: ordered.map(({ x, y, z }) => ({ x, y, z })),
              };
          }
        }
        throw new Error(
          `No above-ground-to-underground route for ${site.id}; provide a complete *Route record or ABYSSAL_TERRAIN_ROUTES_JSON`,
        );
      });
    },
    { sites, routeOverride },
  );
}

async function inspectRenderedTerrain(routes) {
  return page.evaluate(async (routes) => {
    const THREE = await import("/node_modules/three/build/three.module.js");
    const { seabedHeight } = await import("/src/ocean.js");
    const { bodyRadius } = await import("/src/collision.js");
    const { WORLD } = await import("/src/world_config.js");
    const game = window.__ABYSSAL__;
    const seabed = game.ocean.root.getObjectByName(
      "atlantis_pearl_slate_seabed",
    );
    if (!seabed?.isMesh)
      throw new Error(
        "Named Atlantis seabed mesh is unavailable for geometry verification",
      );
    const paving = game.ocean.root
      .getObjectsByProperty("name", "city_paved_district")
      .filter((mesh) => mesh.isMesh);
    game.ocean.root.updateWorldMatrix(true, true);
    const ray = new THREE.Raycaster(),
      down = new THREE.Vector3(0, -1, 0);
    const tolerance = 2,
      radius = bodyRadius(30),
      extent = Math.max(0, 30 * 0.42 - radius);
    const samples = [],
      crossings = [],
      violations = [];
    const source = new THREE.Vector3(),
      destination = new THREE.Vector3();
    const groundMeshes = [seabed, ...paving];
    for (const route of routes) {
      let undergroundSamples = 0;
      for (let segment = 1; segment < route.points.length; segment++) {
        const a = new THREE.Vector3().copy(route.points[segment - 1]);
        const b = new THREE.Vector3().copy(route.points[segment]);
        const distance = a.distanceTo(b),
          direction = b.clone().sub(a).normalize();
        if (distance < 0.001)
          throw new Error(`Duplicate waypoint in ${route.site}`);
        const steps = Math.max(1, Math.ceil(distance / 2.5));
        // 正反射线同时检查正面与背面，不改生产材质的 side 或可见性。
        for (const reverse of [false, true]) {
          source.copy(reverse ? b : a);
          destination.copy(reverse ? a : b);
          ray.set(source, destination.sub(source).normalize());
          ray.near = 0.02;
          ray.far = Math.max(0.02, distance - 0.02);
          const hit = ray.intersectObjects(groundMeshes, false)[0];
          if (hit) {
            const crossing = {
              site: route.site,
              segment,
              reverse,
              mesh: hit.object.name,
              position: hit.point.toArray(),
            };
            crossings.push(crossing);
            violations.push({
              reason: "Visible ground crosses the swimming route",
              ...crossing,
            });
          }
        }
        for (let step = segment === 1 ? 0 : 1; step <= steps; step++) {
          const point = a.clone().lerp(b, step / steps);
          const active = game.ocean.heightAt(point.x, point.z),
            base = seabedHeight(point.x, point.z);
          const underground = point.y < base - 1;
          if (underground) undergroundSamples++;
          ray.set(source.set(point.x, WORLD.surfaceY + 100, point.z), down);
          ray.near = 0;
          ray.far = WORLD.maxDepth + 300;
          const hit = ray.intersectObject(seabed, false)[0];
          const pavingHits = ray.intersectObjects(paving, false);
          const rendered = hit?.point.y ?? null;
          const delta = rendered === null ? null : rendered - active;
          const bodyBottom = point.y - radius - Math.abs(direction.y) * extent;
          const sample = {
            site: route.site,
            segment,
            step,
            position: point.toArray(),
            active,
            base,
            underground,
            rendered,
            delta,
            bodyBottom,
            groundClearance: rendered === null ? null : bodyBottom - rendered,
            pavingTop: pavingHits[0]?.point.y ?? null,
            omittedOpening: rendered === null && active < base - 20,
          };
          samples.push(sample);
          if (rendered === null && !sample.omittedOpening)
            violations.push({
              reason:
                "Rendered seabed is missing outside an explicit excavation",
              ...sample,
            });
          if (delta !== null && Math.abs(delta) > tolerance)
            violations.push({
              reason: "Rendered seabed diverges from the active floor sampler",
              ...sample,
            });
          if (underground && rendered !== null && bodyBottom < rendered - 0.35)
            violations.push({
              reason: "Underground body envelope intersects visible seabed",
              ...sample,
            });
          // 铺装可能合法地处于上方屋面；只拒绝与身体垂直范围实际重叠的表面。
          const bodyTop = point.y + radius + Math.abs(direction.y) * extent;
          const touchingPaving =
            underground &&
            pavingHits.find(
              (entry) =>
                entry.point.y > bodyBottom + 0.35 &&
                entry.point.y < bodyTop - 0.35,
            );
          if (touchingPaving)
            violations.push({
              reason:
                "Underground body envelope intersects visible city paving",
              ...sample,
              pavingContact: touchingPaving.point.y,
            });
        }
      }
      if (!undergroundSamples)
        violations.push({
          reason: "No underground rendered-ground samples",
          site: route.site,
        });
    }
    const matched = samples.filter((sample) => sample.delta !== null);
    if (!matched.length)
      violations.push({
        reason: "No rendered seabed heights could be compared",
      });
    return {
      name: "Rendered terrain, route clearance and active floor agreement",
      tolerance,
      sampleSpacing: 2.5,
      bodyLength: 30,
      seabedMesh: seabed.name,
      pavingMeshes: paving.length,
      maxAbsoluteDelta: matched.length
        ? Math.max(...matched.map((sample) => Math.abs(sample.delta)))
        : null,
      omittedOpenings: samples.filter((sample) => sample.omittedOpening).length,
      samples,
      crossings,
      violations,
    };
  }, routes);
}

async function sweepRoutes(routes) {
  return page.evaluate(async (routes) => {
    const { bodyRadius } = await import("/src/collision.js");
    const { resolveIndexedMotion } = await import(
      "/src/static_collider_grid.js"
    );
    const { WORLD } = await import("/src/world_config.js");
    const game = window.__ABYSSAL__,
      checks = [];
    for (const route of routes)
      for (const length of [3, 16, 30])
        for (const reverse of [false, true])
          for (const steps of [1, 120]) {
            const points = reverse ? [...route.points].reverse() : route.points;
            const radius = bodyRadius(length);
            let current = { ...points[0] };
            for (let segment = 1; segment < points.length; segment++) {
              const a = points[segment - 1],
                b = points[segment];
              const distance = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
              if (distance < 0.001)
                throw new Error(`Duplicate waypoint in ${route.site}`);
              const forward = {
                x: (b.x - a.x) / distance,
                y: (b.y - a.y) / distance,
                z: (b.z - a.z) / distance,
              };
              for (let step = 1; step <= steps; step++) {
                const desired = Object.fromEntries(
                  ["x", "y", "z"].map((axis) => [
                    axis,
                    a[axis] + ((b[axis] - a[axis]) * step) / steps,
                  ]),
                );
                const result = resolveIndexedMotion(current, desired, {
                  staticColliders: game.ocean.colliders,
                  radius,
                  forward,
                  length,
                  floorHeight: (x, z) =>
                    game.ocean.heightAt(x, z) +
                    radius +
                    Math.abs(forward.y) * Math.max(0, length * 0.42 - radius) +
                    0.4,
                  bounds: {
                    minX: WORLD.minX + 5,
                    maxX: WORLD.maxX - 5,
                    minZ: WORLD.minZ + 5,
                    maxZ: WORLD.maxZ - 5,
                    minY: -WORLD.maxDepth + radius,
                    maxY: WORLD.surfaceY - length * 0.15,
                  },
                });
                const error = Math.hypot(
                  result.position.x - desired.x,
                  result.position.y - desired.y,
                  result.position.z - desired.z,
                );
                if (result.stuck || error > 0.15)
                  throw new Error(
                    `Route blocked: ${route.site}, length=${length}, reverse=${reverse}, steps=${steps}, segment=${segment}, step=${step}, error=${error}, contacts=${result.contacts.map((contact) => contact.collider?.kind).join(",")}`,
                  );
                current = result.position;
              }
            }
            checks.push({
              site: route.site,
              length,
              reverse,
              steps,
              end: current,
            });
          }
    return {
      name: "Continuous routes with actual region floor and player bounds",
      checks,
    };
  }, routes);
}

async function swimRoute(route, character, reverse = false) {
  await page.bringToFront();
  await page.waitForFunction(() => window.__ABYSSAL__?.mode === "playing");
  return page.evaluate(
    async ({ route, character, reverse }) => {
      const { seabedHeight } = await import("/src/ocean.js");
      const game = window.__ABYSSAL__;
      if (game.player.characterId !== character)
        throw new Error("Unexpected character for live route");
      const points = reverse ? [...route.points].reverse() : route.points;
      const start = points[0];
      if (!reverse) {
        game.setLength(30);
        game.player.health = game.player.hunger = game.player.stamina = 100;
        game.setPosition(start.x, start.y, start.z);
      }
      const startOffset = game.position.distanceTo(start);
      if (reverse && startOffset > 8)
        throw new Error(
          `Return must continue from the lower route endpoint: ${route.site}, offset=${startOffset}`,
        );
      const began = performance.now(),
        samples = [];
      let next = 1,
        frames = 0,
        deepest = 0,
        cameraBelowBase = false;
      // 只设置朝向；每个位置、碰撞和相机结果来自主循环，不能逐点瞬移代替穿行。
      return new Promise((resolve, reject) => {
        let animationFrame = null,
          finished = false,
          timer;
        const finish = (error, result) => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (animationFrame !== null) cancelAnimationFrame(animationFrame);
          if (error) reject(error);
          else resolve(result);
        };
        const fail = (message) => finish(new Error(message));
        timer = setTimeout(
          () =>
            fail(
              `Live route timed out: ${route.site}, reverse=${reverse}, next=${next}, position=${game.position.toArray().join(",")}`,
            ),
          60000,
        );
        const tick = () => {
          if (finished) return;
          try {
            if (game.mode !== "playing")
              return fail(`Live route left playing mode: ${game.mode}`);
            const point = game.position,
              target = points[next];
            const distance = point.distanceTo(target);
            const belowBase = seabedHeight(point.x, point.z) - point.y;
            deepest = Math.max(deepest, belowBase);
            const camera = game.camera.position;
            if (
              belowBase > 20 &&
              camera.y < seabedHeight(camera.x, camera.z) - 2 &&
              camera.y >= game.ocean.heightAt(camera.x, camera.z) - 0.5
            )
              cameraBelowBase = true;
            if (++frames % 20 === 0 || distance < 2.5)
              samples.push({
                elapsedMs: performance.now() - began,
                next,
                position: point.toArray(),
                camera: camera.toArray(),
                belowBase,
                blocked: game.lastCollision?.blocked,
                stuck: game.lastCollision?.stuck,
              });
            if (frames > 1 && game.lastCollision?.stuck)
              return fail(`Player became stuck in ${route.site}`);
            if (distance < 2.5) {
              next++;
              if (next === points.length) {
                if (!reverse && (deepest < 20 || belowBase < 15))
                  return fail(
                    `Live descent did not reach below the original seabed: ${route.site}`,
                  );
                if (!reverse && !cameraBelowBase)
                  return fail(
                    `Follow camera never entered the excavated space: ${route.site}`,
                  );
                if (reverse && belowBase > 1)
                  return fail(
                    `Live return did not leave the original seabed: ${route.site}`,
                  );
                return finish(null, {
                  name: reverse
                    ? "Live return without repositioning"
                    : "Live staged entrance and controlled-heading descent",
                  site: route.site,
                  character,
                  length: game.player.length,
                  reverse,
                  stagedPositions: reverse ? 0 : 1,
                  startOffset,
                  durationMs: performance.now() - began,
                  deepest,
                  cameraBelowBase,
                  samples,
                });
              }
            }
            const aim = points[next];
            const dx = aim.x - point.x,
              dy = aim.y - point.y,
              dz = aim.z - point.z;
            game.setFacing(
              Math.atan2(-dx, -dz),
              Math.atan2(dy, Math.hypot(dx, dz)),
            );
            animationFrame = requestAnimationFrame(tick);
          } catch (error) {
            finish(error);
          }
        };
        tick();
      });
    },
    { route, character, reverse },
  );
}

async function probeHawaiiFloor() {
  return page.evaluate(async () => {
    const { seabedHeight } = await import("/src/ocean.js");
    const game = window.__ABYSSAL__;
    const x = -215,
      z = -240.5,
      base = seabedHeight(x, z);
    game.setLength(3);
    game.setFacing(0, 0);
    game.setPosition(x, base - 30, z);
    await new Promise((resolve, reject) => {
      let animationFrame = null,
        finished = false;
      const finish = (error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (animationFrame !== null) cancelAnimationFrame(animationFrame);
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(
        () => finish(new Error("Hawaii floor probe timed out")),
        5000,
      );
      let frames = 0;
      const tick = () => {
        if (finished) return;
        if (++frames < 5) animationFrame = requestAnimationFrame(tick);
        else finish();
      };
      animationFrame = requestAnimationFrame(tick);
    });
    const floor = seabedHeight(game.position.x, game.position.z) + 1.05;
    if (game.mode !== "playing" || game.position.y < floor - 0.05)
      throw new Error(
        "Hawaii retained the Atlantis depression after switching",
      );
    return {
      name: "Live Hawaii floor projection after region switch",
      position: game.position.toArray(),
      expectedFloor: floor,
    };
  });
}

async function capture(name) {
  const path = `${directory}/${name}.png`;
  const paused = await page.evaluate(
    () => window.__ABYSSAL__.mode === "paused",
  );
  if (paused)
    await page.evaluate(() => {
      document.querySelector("#overlay").style.visibility = "hidden";
    });
  await page.screenshot({ path });
  if (paused)
    await page.evaluate(() => {
      document.querySelector("#overlay").style.visibility = "";
    });
  report.screenshots.push(path);
}
