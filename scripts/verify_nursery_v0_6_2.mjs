import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 原生开局不移动鱼、不调整体长或直接结算进食；后续隔离夹具仅检查边界与追击。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [],
  errors = [],
  measurements = [];
let currentPage;
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 667 },
  ]) {
    const context = await browser.newContext({
      viewport,
      isMobile: viewport.width < 700,
      hasTouch: viewport.width < 700,
    });
    const page = (currentPage = await context.newPage());
    page.setDefaultTimeout(120000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
    await page.waitForFunction(() => !!window.__ABYSSAL__?.entities);
    await page.click("#quality");
    await installProbe(page);
    await page.click("#start");
    const birth = await population(page);
    assert.equal(birth.length, 3, "A native expedition must begin at 3 m");
    assertPopulation(birth);
    // 先开启逐帧记录，再拍图；截图耗时属于这一段原生游戏时间。
    await beginSample(page, { seconds: 7, physicsTime: true });
    await page.screenshot({
      path: `.local/v6_2_nursery_birth_${viewport.width}.png`,
    });
    const natural = await finishSample(page);
    assert.ok(natural.at(-1).simulationTime - natural[0].simulationTime >= 6.9);
    assert.ok(natural.at(-1).simulationTime - natural[0].simulationTime < 8);
    assert.ok(
      natural.at(-1).eaten >= 2,
      "Seven seconds of native straight swimming must consume at least two fish",
    );
    assert.ok(
      natural.every((frame) => frame.health === 100),
      "Native nursery swimming must retain full health",
    );
    assert.ok(
      natural.some((frame) => frame.nearestFish < 10),
      "Native swimming must actually encounter nearby small fish",
    );
    assertSafetyIndicator(natural[0]);
    assertSafetyIndicator(natural.at(-1));
    await page.screenshot({
      path: `.local/v6_2_nursery_juvenile_${viewport.width}.png`,
    });
    measurements.push({
      case: `native_${viewport.width}`,
      birth,
      frames: natural,
    });
    checks.push(
      `${viewport.width}px native 3 m start: two real meals, full health, visible nursery HUD and radar`,
    );

    await page.click("#pause");
    const paused = await sample(page, { frames: 16 });
    assert.ok(paused.every((frame) => frame.mode === "paused"));
    assert.ok(
      paused.every(
        (frame) =>
          frame.elapsed === paused[0].elapsed &&
          frame.clock === paused[0].clock,
      ),
    );
    measurements.push({ case: `pause_${viewport.width}`, frames: paused });
    await page.click("#resume");
    checks.push(`${viewport.width}px pause freezes game time and round clock`);

    if (viewport.width === 1440) {
      await verifyRespawnAndRestart(page, birth);
      await verifySafeCore(page);
      await verifyOuterReef(page);
    }
    await context.close();
    currentPage = null;
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  errors.push(error.message);
  if (currentPage) {
    await currentPage
      .screenshot({ path: ".local/v6_2_nursery_failure.png" })
      .catch(() => {});
    const last = await currentPage
      .evaluate(() => window.__NURSERY_REVIEW__?.frames)
      .catch(() => null);
    if (last) measurements.push({ case: "failure", frames: last });
  }
  throw error;
} finally {
  await writeFile(
    ".local/v6_2_nursery_results.json",
    JSON.stringify({ checks, errors, measurements }, null, 2),
  );
  await browser.close();
}

async function installProbe(page) {
  await page.evaluate(async () => {
    const g = window.__ABYSSAL__;
    const probe = (window.__NURSERY_REVIEW__ = {
      frames: [],
      done: true,
      watched: [],
      calls: {},
    });
    probe.rules = await import("/src/nursery_rules.js");
    // 只观察真正产生的战斗特效，不替换追击、伤害或技能规则。
    for (const name of ["hurt", "bite", "spawnInk", "flash"]) {
      probe.calls[name] = 0;
      const original = g.effects[name];
      g.effects[name] = function (...args) {
        probe.calls[name] += 1;
        return original.apply(this, args);
      };
    }
    probe.read = () => {
      const safety = document.querySelector("#zone-name");
      const hud = document.querySelector("#hud");
      const radar = document.querySelector("#minimap");
      const box = (node) => {
        if (!node) return null;
        const r = node.getBoundingClientRect(),
          style = getComputedStyle(node);
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          visible:
            !node.hidden &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            r.width > 0 &&
            r.height > 0,
        };
      };
      return {
        elapsed: g.player.elapsed,
        simulationTime: g.elapsed,
        mode: g.mode,
        health: g.player.health,
        eaten: g.player.eaten,
        length: g.player.length,
        position: g.position.toArray(),
        clock: document.querySelector("#round-clock").textContent,
        nearestFish: Math.min(
          ...g.entities
            .filter((e) => e.species.length < 1 && e.hiddenFor <= 0)
            .map((e) => e.mesh.position.distanceTo(g.position)),
        ),
        calls: { ...probe.calls },
        hunters: probe.watched.map((e) => ({
          kind: e.species.kind,
          position: e.mesh.position.toArray(),
          chase: e.chase,
          phase: e.hunter.phase,
          triggers: e.hunter.triggerCount,
          telegraph: !!e.telegraph?.visible,
          attackHeading: !!e.attackHeading,
        })),
        safety: {
          text: `${safety?.textContent || ""} ${document.querySelector("#objective").textContent}`,
          data: { ...hud.dataset },
          box: box(safety),
        },
        radar: {
          label: radar.getAttribute("aria-label"),
          data: { ...radar.dataset },
          text: radar.textContent,
          box: box(radar),
        },
        viewport: { width: innerWidth, height: innerHeight },
      };
    };
  });
}

async function beginSample(page, options) {
  await page.evaluate((options) => {
    const probe = window.__NURSERY_REVIEW__,
      g = window.__ABYSSAL__;
    if (!probe.done) throw new Error("A previous RAF sample is still running");
    probe.frames = [];
    probe.done = false;
    probe.error = null;
    const start = options.physicsTime ? g.elapsed : g.player.elapsed,
      wall = performance.now();
    function tick() {
      probe.frames.push(probe.read());
      const finished = options.frames
        ? probe.frames.length >= options.frames
        : (options.physicsTime ? g.elapsed : g.player.elapsed) - start >=
          options.seconds;
      if (finished || performance.now() - wall > 110000) {
        probe.error = finished
          ? null
          : "RAF sample timed out before enough game time elapsed";
        probe.done = true;
        return;
      }
      // 仅用于隔离边界检查；原生开局从不传入固定位置。
      if (options.hold) g.setPosition(...options.hold);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, options);
}
async function finishSample(page) {
  await page.waitForFunction(() => window.__NURSERY_REVIEW__.done);
  const result = await page.evaluate(() => ({
    frames: window.__NURSERY_REVIEW__.frames,
    error: window.__NURSERY_REVIEW__.error,
  }));
  assert.equal(result.error, null);
  return result.frames;
}
async function sample(page, options) {
  await beginSample(page, options);
  return finishSample(page);
}
async function population(page) {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      length: g.player.length,
      entities: g.entities.map((e) => ({
        kind: e.species.kind,
        length: e.species.length,
        predator: !!e.species.predator,
        uuid: e.mesh.uuid,
        populationIndex: e.populationIndex,
        territory: window.__NURSERY_REVIEW__.rules.predatorTerritory(
          e.species,
          e.populationIndex,
        ),
        position: e.mesh.position.toArray(),
        hiddenFor: e.hiddenFor,
      })),
      rewards: g.pickups.map((p) => ({
        uuid: p.mesh.uuid,
        position: [p.mesh.position.x, p.baseY, p.mesh.position.z],
      })),
    };
  });
}
function assertPopulation(state) {
  assert.equal(state.entities.length, 285);
  assert.equal(new Set(state.entities.map((e) => e.uuid)).size, 285);
  assert.equal(new Set(state.entities.map((e) => e.kind)).size, 24);
  assert.equal(state.entities.filter((e) => e.length < 1).length, 144);
  const predators = state.entities.filter((e) => e.predator);
  assert.ok(
    predators.every((e) => e.position[2] <= -145),
    "No ordinary predator may spawn inside the nursery buffer",
  );
  for (const e of predators) {
    const t = e.territory;
    assert.ok(
      t &&
        e.position[0] >= t.minX &&
        e.position[0] <= t.maxX &&
        e.position[2] >= t.minZ &&
        e.position[2] <= t.maxZ,
      "Each predator must spawn within its own territory",
    );
  }
  const outer = predators.filter((e) => e.position[2] >= -350);
  assert.ok(outer.every((e) => ["hammerhead", "shark"].includes(e.kind)));
  for (const kind of ["hammerhead", "shark"])
    assert.ok(outer.filter((e) => e.kind === kind).length <= 1);
  assert.ok(
    predators
      .filter((e) => !outer.includes(e))
      .every((e) => e.position[2] <= -370),
    "Other predators must stay beyond the outer reef",
  );
  assert.equal(state.rewards.length, 21);
  assert.equal(
    new Set(
      state.rewards.map((p) => p.position.map((v) => v.toFixed(4)).join(",")),
    ).size,
    21,
    "Rewards must occupy 21 distinct positions",
  );
}
function assertSafetyIndicator(frame) {
  assert.ok(
    frame.safety.box?.visible,
    "The nursery HUD status must be visible",
  );
  assert.equal(frame.safety.data.nursery, "true");
  assert.equal(frame.radar.data.nursery, "true");
  assert.match(frame.safety.text, /安全浅滩/);
  assert.match(frame.safety.text, /安心吃鱼群|成长/);
  assert.match(`${frame.radar.label} ${frame.radar.text}`, /安全|育幼/);
  for (const node of [frame.safety, frame.radar]) {
    const r = node.box;
    assert.ok(
      r.visible &&
        r.x >= -1 &&
        r.y >= -1 &&
        r.x + r.width <= frame.viewport.width + 1 &&
        r.y + r.height <= frame.viewport.height + 1,
      "Nursery HUD and radar must fit the viewport",
    );
  }
}

async function verifyRespawnAndRestart(page, birth) {
  const target = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.length < 1 && e.hiddenFor > 0);
    if (!e) return null;
    window.__NURSERY_RESPAWN__ = e;
    g.setPosition(180, -18, 75);
    return { uuid: e.mesh.uuid, hiddenFor: e.hiddenFor };
  });
  assert.ok(
    target,
    "A naturally eaten fish is required for the real respawn check",
  );
  // 等待真实重生倒计时，不缩短hiddenFor，也不重复创建或手工结算猎物。
  // 重生走物理dt；低帧率时远征墙钟与物理步长不同，按实际模拟时间等待。
  await sample(page, {
    seconds: target.hiddenFor + 0.3,
    physicsTime: true,
    hold: [180, -18, 75],
  });
  const respawn = await page.evaluate(() => ({
    uuid: window.__NURSERY_RESPAWN__.mesh.uuid,
    hiddenFor: window.__NURSERY_RESPAWN__.hiddenFor,
    present: window.__ABYSSAL__.entities.includes(window.__NURSERY_RESPAWN__),
  }));
  assert.equal(respawn.uuid, target.uuid);
  assert.ok(respawn.hiddenFor <= 0 && respawn.present);
  const after = await population(page);
  assert.deepEqual(
    after.entities.map((e) => e.uuid).sort(),
    birth.entities.map((e) => e.uuid).sort(),
  );
  const restarts = [];
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__ABYSSAL__.startGame());
    const state = await population(page);
    assertPopulation(state);
    assert.deepEqual(
      state.entities.map((e) => e.uuid).sort(),
      birth.entities.map((e) => e.uuid).sort(),
    );
    assert.deepEqual(
      state.rewards.map((e) => e.uuid).sort(),
      birth.rewards.map((e) => e.uuid).sort(),
    );
    restarts.push(state);
  }
  measurements.push({ case: "respawn_restart", target, respawn, restarts });
  checks.push(
    "A naturally eaten fish respawns on its original mesh; three restarts retain 285 creatures and 21 unique rewards",
  );
}

async function isolate(page) {
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.startGame();
    g.entities.forEach((e) => {
      e.hiddenFor = 999;
    });
    g.encounters.bosses.forEach((b) => {
      b.enabled = false;
    });
    g.humans.entities.forEach((e) => {
      e.alive = false;
      e.mesh.visible = false;
    });
    g.humans.hazards.forEach((h) => {
      h.active = false;
    });
    g.pickups.forEach((p) => {
      p.cooldown = 999;
    });
    g.player.invulnerable = 0;
    window.__NURSERY_REVIEW__.watched = [];
  });
}
async function verifySafeCore(page) {
  await isolate(page);
  const results = [];
  // 横向、深度、前后边界均采样；边缘留一帧巡游距离，避免走出边界再归因于保护失效。
  for (const point of [
    [-220, -8, 100],
    [0, -30, 100],
    [220, -65, 100],
    [-220, -65, -60],
    [0, -30, -60],
    [220, -8, -60],
    [-220, -8, -118],
    [0, -30, -118],
    [220, -71, -118],
  ]) {
    for (const phase of ["active", "windup"]) {
      const before = await page.evaluate(
        ({ point, phase }) => {
          const g = window.__ABYSSAL__,
            probe = window.__NURSERY_REVIEW__;
          g.setPosition(...point);
          g.setFacing(0);
          g.player.invulnerable = 0;
          probe.watched = [
            "shark",
            "hammerhead",
            "sperm_whale",
            "pliosaur",
            "angler",
            "octopus",
          ].map((kind) => g.entities.find((e) => e.species.kind === kind));
          for (const e of probe.watched) {
            e.hiddenFor = 0;
            e.cooldown = 0;
            e.chase = 4;
            e.mesh.position.copy(g.position);
            e.hunter.phase = phase;
            e.hunter.phaseDuration = 1;
            e.hunter.timer = phase === "windup" ? 0.9999 : 0;
            e.hunter.cooldown = 0;
            e.attackHeading = g.forward.clone();
          }
          return { calls: { ...probe.calls }, health: g.player.health };
        },
        { point, phase },
      );
      const frames = await sample(page, { frames: 5, hold: point });
      assert.equal(before.health, 100);
      for (const frame of frames) {
        assert.equal(
          frame.health,
          100,
          "Active hunters must not bite a player in the safe core",
        );
        assert.deepEqual(
          frame.calls,
          before.calls,
          "Nursery entry must suppress hunter skill effects as well as damage",
        );
        assert.ok(
          frame.hunters.every(
            (h) =>
              h.chase === 0 &&
              !["active", "windup"].includes(h.phase) &&
              !h.telegraph,
          ),
          "Nursery entry must clear pursuit, skill phase and telegraph",
        );
      }
      results.push({ point, phase, before, frames });
    }
  }
  measurements.push({ case: "safe_core", results });
  checks.push(
    "Nine safe-core positions cancel forced pursuit and active/windup hunter abilities without damage or effects",
  );
}
async function verifyOuterReef(page) {
  await isolate(page);
  const before = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      probe = window.__NURSERY_REVIEW__;
    const shark = g.entities.find(
      (e) => e.species.kind === "shark" && e.populationIndex === 0,
    );
    const territory = probe.rules.predatorTerritory(
      shark.species,
      shark.populationIndex,
    );
    const center = territory.center;
    g.setPosition(center.x, center.y, center.z);
    g.setFacing(Math.PI);
    shark.hiddenFor = 0;
    shark.cooldown = 0;
    shark.chase = 0;
    shark.mesh.position.copy(g.position).addScaledVector(g.forward, -22);
    shark.hunter.cooldown = 0;
    probe.watched = [shark];
    return probe.read();
  });
  const chase = await sample(page, { seconds: 1.8, hold: before.position });
  assert.ok(
    chase.some((f) => f.hunters[0].chase > 0),
    "A legally placed outer-reef shark must acquire the player through normal AI",
  );
  assert.ok(
    chase.some((f) => ["windup", "active"].includes(f.hunters[0].phase)),
    "Outer-reef shark skills must remain enabled",
  );
  await page.evaluate(() => window.__ABYSSAL__.setPosition(180, -30, -110));
  const returned = await sample(page, { seconds: 0.5, hold: [180, -30, -110] });
  assert.ok(
    returned.every(
      (f) =>
        f.hunters[0].chase === 0 &&
        !["windup", "active"].includes(f.hunters[0].phase),
    ),
  );
  assert.ok(returned.every((f) => f.health === returned[0].health));
  measurements.push({ case: "outer_reef_return", before, chase, returned });
  checks.push(
    "Normal AI pursuit and skills remain active outside the reef; returning to the safe core immediately ends pursuit",
  );
}
