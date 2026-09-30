import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { getRegionSpecies } from "../src/region_ecology.js";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5193/";
const directory =
  process.env.ABYSSAL_RESIDENT_DIRECTORY || ".local/regional_residents";
const scope = process.env.ABYSSAL_RESIDENT_SCOPE || "full";
const report = {
  scope,
  baseUrl,
  startedAt: new Date().toISOString(),
  snapshots: [],
  feeding: [],
  errors: [],
  limits: [
    "Actual renderer, species models, AI, sonar, feeding and 28-second respawn; player viewpoints and feeding approaches are staged through the development interface.",
    "The full-scope patrol sample holds the juvenile player at spawn for one minute of wall time. NPC simulation uses the capped frame delta, so slow rendering can make it advance less than one minute. This does not establish natural full-round encounter rates or physical-phone performance.",
    "Respawn waits for the normal hiddenFor countdown without changing the game clock; simulated and player elapsed times are recorded separately.",
    "Seahorse height remains 0.15 m and cuttlefish total length remains 0.5 m. Distant small silhouettes remain intentionally small; sonar helps identify them.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
page.on("pageerror", (e) => report.errors.push(e.message));
await page.addInitScript(() => {
  let seed = 71523;
  Math.random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
});
async function select(region) {
  if (
    (await page.evaluate(() => window.__ABYSSAL__.expedition.region.id)) ===
    region
  )
    return;
  await page.locator("#region-select").click();
  await page.locator(`[data-choice-value="${region}"]`).click();
  await page.waitForFunction(
    (id) =>
      window.__ABYSSAL__.expedition.region.id === id &&
      !window.__ABYSSAL__.regionLoading,
    region,
  );
}
async function snapshot(label) {
  const data = await page.evaluate(async () => {
    const g = window.__ABYSSAL__,
      { isPositionBlocked } = await import("/src/collision.js");
    const counts = {},
      wrongModels = [],
      residents = [];
    for (const e of g.entities) {
      const s = e.species;
      counts[s.kind] = (counts[s.kind] || 0) + 1;
      if (
        e.mesh.userData.kind !== s.kind ||
        Math.abs(e.mesh.scale.x - s.length) > 1e-8
      )
        wrongModels.push(s.kind);
      if (s.residentRadius > 0) {
        const a = s.spawnAnchors[e.populationIndex];
        const p = e.mesh.position,
          clip = p.clone().project(g.camera);
        residents.push({
          kind: s.kind,
          index: e.populationIndex,
          position: p.toArray(),
          anchor: a,
          distance: p.distanceTo(g.position),
          drift: Math.hypot(p.x - a[0], p.y - a[1], p.z - a[2]),
          radius: s.residentRadius,
          hiddenFor: e.hiddenFor,
          visible: e.mesh.visible,
          inFrame:
            Math.abs(clip.x) < 1 &&
            Math.abs(clip.y) < 1 &&
            clip.z > -1 &&
            clip.z < 1,
          blocked: isPositionBlocked(p, {
            colliders: g.ocean.colliders,
            radius: 0.45,
          }),
          model: e.mesh.userData.atlantisAnatomy,
        });
      }
    }
    return {
      region: g.expedition.region.id,
      mode: g.mode,
      elapsed: g.player.elapsed,
      simulationElapsed: g.elapsed,
      counts,
      wrongModels,
      residents,
    };
  });
  report.snapshots.push({ label, ...data });
  assert.deepEqual(
    data.counts,
    Object.fromEntries(
      getRegionSpecies(data.region).map((s) => [s.kind, s.population]),
    ),
  );
  assert.deepEqual(data.wrongModels, []);
  for (const e of data.residents) {
    assert.equal(e.model, e.kind);
    if (e.hiddenFor <= 0) {
      assert.equal(e.blocked, false);
      assert.ok(
        e.drift <= e.radius * 1.2,
        `${e.kind} ${e.index} drift: ${e.drift}`,
      );
    }
  }
  console.log(
    label,
    JSON.stringify({
      region: data.region,
      count: Object.values(data.counts).reduce((a, b) => a + b, 0),
      maximumResidentDrift: Math.max(0, ...data.residents.map((e) => e.drift)),
    }),
  );
  return data;
}
try {
  await page.goto(baseUrl);
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await select("hawaii");
  await snapshot("Initial Hawaii");
  for (let cycle = 0; cycle < 2; cycle++) {
    await select("atlantis");
    await snapshot(`Atlantis selection ${cycle + 1}`);
    await select("hawaii");
    await snapshot(`Hawaii return ${cycle + 1}`);
  }
  await select("atlantis");
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.evaluate(() => {
    window.__residentHold = true;
    const hold = () => {
      if (!window.__residentHold) return;
      const g = window.__ABYSSAL__;
      g.setPosition(0, -18, 75);
      g.setFacing(0, 0);
      g.player.health = 100;
      g.player.hunger = 100;
      requestAnimationFrame(hold);
    };
    requestAnimationFrame(hold);
  });
  await page.waitForTimeout(1000);
  await snapshot("Juvenile nursery start");
  await page.keyboard.press("KeyJ");
  await page.waitForTimeout(250);
  const sonar = await page.evaluate(() =>
    window.__ABYSSAL__.sonarMarkers.snapshot.labels.map((l) => ({
      text: l.text,
      kinds: l.contacts.map((c) => c.kind),
    })),
  );
  report.sonar = sonar;
  for (const kind of ["seahorse", "cuttlefish"])
    assert.ok(
      sonar.some((l) => l.kinds.includes(kind)),
      `${kind} forward sonar label`,
    );
  await page.screenshot({ path: `${directory}/nursery_sonar.png` });
  if (scope === "full") {
    await page.waitForTimeout(30000);
    await snapshot("Resident patrol after 30 wall seconds");
    await page.waitForTimeout(30000);
    await snapshot("Resident patrol after 60 wall seconds");
  }
  await page.evaluate(() => {
    window.__residentHold = false;
    window.__ABYSSAL__.returnToMenu();
  });
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await snapshot("Restart resets resident positions");
  for (const kind of ["seahorse", "cuttlefish"]) {
    const approach = await page.evaluate((kind) => {
      const g = window.__ABYSSAL__,
        e = g.entities.find(
          (e) => e.species.kind === kind && e.populationIndex === 3,
        );
      window.__residentTarget = e;
      g.setLength(3);
      g.setPosition(
        e.mesh.position.x,
        e.mesh.position.y,
        e.mesh.position.z + 4,
      );
      g.setFacing(0, 0);
      g.player.health = 100;
      g.player.hunger = 50;
      return {
        kind,
        index: e.populationIndex,
        position: e.mesh.position.toArray(),
        eaten: g.player.eaten,
        elapsed: g.player.elapsed,
        simulationElapsed: g.elapsed,
      };
    }, kind);
    await page.waitForFunction(
      () => window.__residentTarget.hiddenFor > 0,
      null,
      { timeout: 12000 },
    );
    const fed = await page.evaluate(() => {
      const g = window.__ABYSSAL__,
        e = window.__residentTarget;
      return {
        hiddenFor: e.hiddenFor,
        eaten: g.player.eaten,
        feeding: g.feeding.has(e.mesh),
        elapsed: g.player.elapsed,
        simulationElapsed: g.elapsed,
      };
    });
    assert.ok(fed.hiddenFor > 27 && fed.hiddenFor <= 28);
    assert.ok(fed.eaten > approach.eaten);
    assert.equal(fed.feeding, true);
    report.feeding.push({ approach, fed });
  }
  await page.evaluate(() => {
    window.__residentHold = true;
    const hold = () => {
      if (!window.__residentHold) return;
      const g = window.__ABYSSAL__;
      g.setPosition(0, -18, 75);
      g.setFacing(0, 0);
      g.player.health = 100;
      g.player.hunger = 100;
      requestAnimationFrame(hold);
    };
    requestAnimationFrame(hold);
  });
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.entities
        .filter(
          (e) =>
            ["seahorse", "cuttlefish"].includes(e.species.kind) &&
            e.populationIndex === 3,
        )
        .every((e) => e.hiddenFor <= 0),
    null,
    { timeout: 180000 },
  );
  const returned = await snapshot(
    "Both consumed residents returned through normal 28-second respawn",
  );
  for (const event of report.feeding) {
    const e = returned.residents.find(
      (e) => e.kind === event.approach.kind && e.index === 3,
    );
    assert.ok(e.drift < 1);
    assert.ok(returned.simulationElapsed - event.fed.simulationElapsed >= 27.9);
  }
  assert.deepEqual(report.errors, []);
  report.completedAt = new Date().toISOString();
} finally {
  report.endState = await page
    .evaluate(() => {
      const g = window.__ABYSSAL__;
      return g
        ? {
            mode: g.mode,
            playerElapsed: g.player.elapsed,
            simulationElapsed: g.elapsed,
          }
        : null;
    })
    .catch(() => null);
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log("Regional residents: all checks passed");
