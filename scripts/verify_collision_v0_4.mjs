import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 只通过开发接口布置起点和体型，所有位移、转向和破水均由真实输入驱动主循环。
const outputDirectory = ".local";
await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const checks = [];
const heldKeys = new Set();
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

async function releaseKeys() {
  for (const key of heldKeys) await page.keyboard.up(key);
  heldKeys.clear();
}

async function resetCase(length = 6) {
  await releaseKeys();
  await page.mouse.move(720, 450);
  await page.evaluate((length) => {
    const game = window.__ABYSSAL__;
    game.startGame();
    window.__COLLISION_TRACE__ = null;
    game.setLength(length);
    game.player.invulnerable = 999;
    game.entities.forEach((entity) => (entity.hiddenFor = 999));
    game.pickups.forEach((pickup) => (pickup.cooldown = 999));
  }, length);
}

async function startTrace() {
  await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const trace = { active: true, startedAt: game.elapsed, samples: [] };
    window.__COLLISION_TRACE__ = trace;
    function sample() {
      if (!trace.active) return;
      const { isPositionBlocked, bodyRadius } = window.__COLLISION_MODULE__;
      const result = game.lastCollision;
      const colliders = [...game.ocean.colliders, ...game.surface.colliders];
      trace.samples.push({
        time: game.elapsed,
        position: {
          x: game.position.x,
          y: game.position.y,
          z: game.position.z,
        },
        forward: { x: game.forward.x, y: game.forward.y, z: game.forward.z },
        camera: {
          x: game.camera.position.x,
          y: game.camera.position.y,
          z: game.camera.position.z,
        },
        length: game.player.length,
        health: game.player.health,
        stamina: game.player.stamina,
        airborne: game.surface.airborne,
        mode: game.mode,
        recovered: !!result?.recovered,
        stuck: !!result?.stuck,
        contacts: (result?.contacts || []).map(({ collider, normal }) => ({
          kind: collider.kind,
          normal: { x: normal.x, y: normal.y, z: normal.z },
        })),
        bodyOverlap: isPositionBlocked(game.position, {
          colliders,
          radius: bodyRadius(game.player.length),
          length: game.player.length,
          forward: game.forward,
        }),
        cameraShipOverlap: isPositionBlocked(game.camera.position, {
          colliders: game.surface.colliders,
          radius: 0.15,
        }),
      });
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
}

async function stopTrace() {
  return page.evaluate(() => {
    const trace = window.__COLLISION_TRACE__;
    trace.active = false;
    return { startedAt: trace.startedAt, samples: trace.samples };
  });
}

async function drive(keys, seconds) {
  for (const key of keys) {
    await page.keyboard.down(key);
    heldKeys.add(key);
  }
  const startedAt = await page.evaluate(() => window.__ABYSSAL__.elapsed);
  try {
    await page.waitForFunction(
      ({ startedAt, seconds }) =>
        window.__ABYSSAL__.elapsed >= startedAt + seconds ||
        window.__ABYSSAL__.mode !== "playing",
      { startedAt, seconds },
      { timeout: 60000 },
    );
  } finally {
    await releaseKeys();
  }
}

function summarize(trace) {
  const samples = trace.samples;
  const first = samples[0],
    last = samples.at(-1);
  let maximumSpeed = 0;
  let maximumTangentialStep = 0;
  for (let index = 1; index < samples.length; index++) {
    const current = samples[index],
      previous = samples[index - 1];
    const dx = current.position.x - previous.position.x;
    const dy = current.position.y - previous.position.y;
    const dz = current.position.z - previous.position.z;
    const dt = current.time - previous.time;
    if (dt > 0 && !current.recovered)
      maximumSpeed = Math.max(maximumSpeed, Math.hypot(dx, dy, dz) / dt);
    for (const { normal } of current.contacts) {
      const normalStep = dx * normal.x + dy * normal.y + dz * normal.z;
      const tangent = Math.sqrt(
        Math.max(0, dx * dx + dy * dy + dz * dz - normalStep * normalStep),
      );
      maximumTangentialStep = Math.max(maximumTangentialStep, tangent);
    }
  }
  return {
    sampleCount: samples.length,
    simulationSeconds: last && first ? last.time - first.time : 0,
    displacement:
      last && first
        ? Math.hypot(
            last.position.x - first.position.x,
            last.position.y - first.position.y,
            last.position.z - first.position.z,
          )
        : 0,
    first,
    last,
    maximumSpeed,
    maximumTangentialStep,
    blockedFrames: samples.filter((sample) => sample.contacts.length).length,
    recoveredFrames: samples.filter((sample) => sample.recovered).length,
    stuckFrames: samples.filter((sample) => sample.stuck).length,
    bodyOverlapFrames: samples.filter((sample) => sample.bodyOverlap).length,
    cameraShipOverlapFrames: samples.filter(
      (sample) => sample.cameraShipOverlap,
    ).length,
    contactKinds: [
      ...new Set(
        samples.flatMap((sample) =>
          sample.contacts.map((contact) => contact.kind),
        ),
      ),
    ],
  };
}

function assertClear(result) {
  assert.ok(result.sampleCount > 5, "Expected live main-loop samples");
  assert.equal(result.last.mode, "playing", "Game should remain active");
  assert.equal(result.stuckFrames, 0, "Player must not remain trapped");
  assert.equal(
    result.bodyOverlapFrames,
    0,
    "Player body must stay outside solid colliders",
  );
  assert.equal(
    result.cameraShipOverlapFrames,
    0,
    "Camera must stay outside ship geometry",
  );
}

async function runCase(name, callback) {
  if (
    process.env.ABYSSAL_COLLISION_CASE &&
    process.env.ABYSSAL_COLLISION_CASE !== name
  )
    return;
  const record = { name, status: "running" };
  checks.push(record);
  try {
    const result = await callback();
    Object.assign(record, result, { status: "passed" });
  } catch (error) {
    record.status = "failed";
    record.error = error.stack;
    if (await page.evaluate(() => !!window.__COLLISION_TRACE__)) {
      record.trace = await stopTrace();
      record.summary = summarize(record.trace);
    }
  } finally {
    await releaseKeys();
    record.screenshot = `${outputDirectory}/v0_4_collision_${name}.png`;
    await page.screenshot({ path: record.screenshot });
    console.log(`${record.status.toUpperCase()}: ${name}`);
  }
}

// 从真实礁石列表选择一个起点无重叠、迎面能碰到主体的场景。
async function placeAtReef({ growing = false } = {}) {
  return page.evaluate(
    async ({ growing }) => {
      const game = window.__ABYSSAL__;
      const collision = window.__COLLISION_MODULE__;
      const { seabedHeight } = await import("/src/ocean.js");
      const colliders = [...game.ocean.colliders, ...game.surface.colliders];
      const forward = { x: 0, y: 0, z: -1 };
      const candidates = game.ocean.colliders.filter(
        (collider) =>
          collider.kind === "reef" &&
          collider.z > -230 &&
          collider.z < 60 &&
          Math.abs(collider.x) < 180 &&
          collider.axes.y > 8,
      );
      for (const reef of candidates) {
        const y = reef.y + reef.axes.y * 0.5;
        for (let gap = growing ? 3 : 22; gap < (growing ? 14 : 30); gap += 1) {
          const position = { x: reef.x, y, z: reef.z + reef.axes.z + gap };
          if (y < seabedHeight(position.x, position.z) + 8 || y > -5) continue;
          const small = {
            colliders,
            radius: collision.bodyRadius(6),
            length: 6,
            forward,
          };
          if (collision.isPositionBlocked(position, small)) continue;
          if (growing) {
            if (
              !collision.isPositionBlocked(position, {
                colliders,
                radius: collision.bodyRadius(30),
                length: 30,
                forward,
              })
            )
              continue;
          } else {
            const hit = collision.castSegment(
              position,
              { x: reef.x, y, z: reef.z },
              colliders,
              collision.bodyRadius(6),
            );
            if (hit?.collider !== reef) continue;
          }
          game.setPosition(position.x, position.y, position.z);
          return {
            position,
            reef: { x: reef.x, y: reef.y, z: reef.z, axes: reef.axes },
            growing,
          };
        }
      }
      throw new Error("Could not find a suitable actual reef fixture");
    },
    { growing },
  );
}

try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
  await page.waitForFunction(() => window.__ABYSSAL__);
  await page.evaluate(async () => {
    const game = window.__ABYSSAL__;
    for (const key of ["ocean", "camera", "forward"])
      if (!game[key]) throw new Error(`Missing development interface: ${key}`);
    if (!("lastCollision" in game))
      throw new Error("Missing development interface: lastCollision");
    window.__COLLISION_MODULE__ = await import("/src/collision.js");
  });
  await page.click("#quality");
  await page.click("#start");

  for (const length of [6, 30]) {
    await runCase(`spawn_${length}m`, async () => {
      await resetCase(length);
      await startTrace();
      await drive(["Space"], 1.2);
      const trace = await stopTrace(),
        summary = summarize(trace);
      assertClear(summary);
      assert.ok(
        summary.displacement > 12,
        "Spawn should permit sustained sprint movement",
      );
      return { summary, trace };
    });
  }

  await runCase("reef_sprint", async () => {
    await resetCase();
    const fixture = await placeAtReef();
    await startTrace();
    await drive(["Space"], 2.2);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    assert.ok(
      summary.contactKinds.includes("reef"),
      "Main loop should collide with an actual reef",
    );
    assert.ok(
      summary.maximumSpeed > 26,
      "Reef approach should reach high sprint speed",
    );
    return { fixture, summary, trace };
  });

  await runCase("hunter_knockback_wall", async () => {
    await resetCase();
    const fixture = await page.evaluate(async () => {
      const game = window.__ABYSSAL__,
        collision = window.__COLLISION_MODULE__;
      const { seabedHeight } = await import("/src/ocean.js");
      const forward = { x: 0, y: 0, z: -1 };
      for (const pillar of game.ocean.colliders.filter(
        (collider) => collider.kind === "pillar" && collider.type === "capsule",
      )) {
        const center = {
          x: (pillar.a.x + pillar.b.x) / 2,
          y: (pillar.a.y + pillar.b.y) / 2,
          z: (pillar.a.z + pillar.b.z) / 2,
        };
        for (const side of [1, -1]) {
          const position = {
            x:
              center.x +
              side * (pillar.radius + collision.bodyRadius(6) + 0.12),
            y: center.y,
            z: center.z,
          };
          if (
            position.y < seabedHeight(position.x, position.z) + 2 ||
            position.y > -60
          )
            continue;
          if (
            collision.isPositionBlocked(position, {
              colliders: game.ocean.colliders,
              radius: collision.bodyRadius(6),
              length: 6,
              forward,
            })
          )
            continue;
          const hunterPosition = {
            x: position.x + side * 3.6,
            y: position.y,
            z: position.z,
          };
          if (
            collision.segmentBlocked(
              position,
              hunterPosition,
              game.ocean.colliders,
            )
          )
            continue;
          game.setPosition(position.x, position.y, position.z);
          return {
            pillar: center,
            position,
            hunterPosition,
            initialHealth: game.player.health,
          };
        }
      }
      throw new Error("Could not find an exposed pillar for hunter knockback");
    });
    await startTrace();
    await page.evaluate(({ hunterPosition }) => {
      const game = window.__ABYSSAL__;
      const hunter = game.entities.find(
        (entity) => entity.species.kind === "shark",
      );
      if (!hunter)
        throw new Error("Missing shark encounter for knockback verification");
      game.player.invulnerable = 0;
      hunter.hiddenFor = 0;
      hunter.cooldown = 0;
      hunter.chase = 4;
      hunter.mesh.position.set(
        hunterPosition.x,
        hunterPosition.y,
        hunterPosition.z,
      );
    }, fixture);
    // 真实近距咬击触发5米击退；慢游仍由主循环推进，不手动设置受击结果。
    await drive(["KeyK"], 0.6);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    const minimumHealth = Math.min(
      ...trace.samples.map((sample) => sample.health),
    );
    assert.ok(
      minimumHealth <= fixture.initialHealth - 20,
      "A real hunter bite must reduce health before checking knockback",
    );
    assert.ok(
      summary.contactKinds.includes("pillar"),
      "Hunter knockback must be swept against the nearby pillar",
    );
    return { fixture, minimumHealth, summary, trace };
  });

  await runCase("ship_side_slide", async () => {
    await resetCase();
    const fixture = await page.evaluate(() => {
      const game = window.__ABYSSAL__,
        ship = game.surface.ships[0];
      const point = ship.root.position
        .clone()
        .set(ship.width / 2 + 8, -1.05, 13);
      ship.root.localToWorld(point);
      game.setPosition(point.x, point.y, point.z);
      return { ship: ship.kind, position: point };
    });
    await startTrace();
    await drive(["Space"], 1.8);
    // 松开冲刺后用 D 实际转向，让沿面滑动后的出口由正常输入产生。
    await drive(["KeyD"], 0.35);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    assert.ok(
      summary.contactKinds.includes("ship_hull"),
      "Ship side should block swimming",
    );
    assert.ok(
      summary.maximumTangentialStep > 0.04,
      "Contact should preserve sliding movement",
    );
    assert.ok(
      Math.abs(summary.first.forward.x - summary.last.forward.x) > 0.15,
      "D input should steer the live swimmer",
    );
    return { fixture, summary, trace };
  });

  await runCase("ship_underpass", async () => {
    await resetCase();
    const fixture = await page.evaluate(() => {
      const game = window.__ABYSSAL__,
        ship = game.surface.ships[0];
      const point = {
        x: ship.root.position.x,
        y: ship.root.position.y - 8,
        z: ship.root.position.z + 25,
      };
      game.setPosition(point.x, point.y, point.z);
      return { ship: ship.kind, position: point };
    });
    await startTrace();
    await drive(["Space"], 2.1);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    assert.ok(
      summary.displacement > 40,
      "Deep swim should cross beneath the boat",
    );
    assert.ok(
      !summary.contactKinds.some((kind) => kind.startsWith("ship_")),
      "Boat must not block the underwater passage",
    );
    return { fixture, summary, trace };
  });

  await runCase("ship_bottom", async () => {
    await resetCase();
    const fixture = await page.evaluate(() => {
      const game = window.__ABYSSAL__,
        ship = game.surface.ships[0];
      const point = {
        x: ship.root.position.x,
        y: -24,
        z: ship.root.position.z + 4,
      };
      // 自由俯仰上限提高后，旧的36米斜向起点会从船尾外侧上浮；
      // 在真实艇底正下方保持80度游向，验证冲刺被船底连续碰撞阻挡。
      game.setFacing(0, (Math.PI * 80) / 180);
      game.setPosition(point.x, point.y, point.z);
      return { ship: ship.kind, position: point };
    });
    await startTrace();
    await drive(["Space"], 2.2);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    assert.ok(
      trace.samples.some((sample) =>
        sample.contacts.some(
          ({ kind, normal }) => kind === "ship_hull" && normal.y < -0.7,
        ),
      ),
      "Upward sprint should contact the underside of the real hull",
    );
    return { fixture, summary, trace };
  });

  await runCase("ship_deck_landing", async () => {
    await resetCase();
    const fixture = await page.evaluate(async () => {
      const game = window.__ABYSSAL__,
        ship = game.surface.ships[0];
      const { createSurfaceState, stepSurface } = await import(
        "/src/surface_rules.js"
      );
      const { characterMovement } = await import("/src/character_rules.js");
      const { stepSteering } = await import("/src/steering_rules.js");
      const movement = characterMovement(game.player.characterId, true);
      const sprintSpeed = movement.sprintSpeed;
      const state = createSurfaceState();
      let position = { x: 0, y: -24, z: 0 },
        speed = 12,
        pitch = 0,
        time = 0,
        launched = false;
      const dt = 1 / 240;
      // 纯规则只用于估算起跳点；不会直接推进游戏状态或代替主循环位移。
      while (time < 9) {
        ({ pitch } = stepSteering(
          { yaw: Math.PI, pitch },
          { x: 0, y: 1 },
          movement,
          dt,
        ));
        if (!state.airborne)
          speed += (sprintSpeed - speed) * (1 - Math.exp(-3 * dt));
        const forward = { x: 0, y: Math.sin(pitch), z: Math.cos(pitch) };
        const desired = state.airborne
          ? { ...position }
          : {
              x: 0,
              y: position.y + forward.y * speed * dt,
              z: position.z + forward.z * speed * dt,
            };
        const result = stepSurface(state, dt, {
          previousPosition: position,
          position: desired,
          forward,
          speed,
          boosting: !state.airborne,
          length: 6,
        });
        position = result.position;
        time += dt;
        launched ||= result.launched;
        if (launched && state.velocityY < 0 && position.y < 11.7) break;
      }
      if (!launched) throw new Error("Flight fixture planning failed");
      const phase = ship.phase + (game.elapsed + time) * ship.rate;
      const futureHeading = Math.atan2(
        -Math.cos(phase) * ship.radiusX,
        Math.sin(phase) * ship.radiusZ,
      );
      // 瞄准外侧净甲板，避开中心烟囱；必须命中 ship_deck 才算甲板验收。
      const localTarget = { x: 3.2, z: -1 };
      const target = {
        x:
          ship.anchor.x +
          Math.sin(phase) * ship.radiusX +
          Math.cos(futureHeading) * localTarget.x +
          Math.sin(futureHeading) * localTarget.z,
        z:
          ship.anchor.z +
          Math.cos(phase) * ship.radiusZ -
          Math.sin(futureHeading) * localTarget.x +
          Math.cos(futureHeading) * localTarget.z,
      };
      const start = { x: target.x, y: -24, z: target.z - position.z };
      // 新虎鲸速度更高，从深水侧向岸接近，避免延长的起跳跑道落在海岸礁石里。
      const { seabedHeight } = await import("/src/ocean.js");
      const collision = window.__COLLISION_MODULE__;
      if (
        start.y <= seabedHeight(start.x, start.z) + 4 ||
        collision.isPositionBlocked(start, {
          colliders: [...game.ocean.colliders, ...game.surface.colliders],
          radius: collision.bodyRadius(6),
          length: 6,
          forward: { x: 0, y: 0, z: 1 },
        })
      )
        throw new Error(
          "Deck landing start must have unobstructed deep-water clearance",
        );
      game.setFacing(Math.PI);
      game.setPosition(start.x, start.y, start.z);
      return {
        ship: ship.kind,
        position: start,
        plannedLandingTime: time,
        plannedLandingY: position.y,
        target,
      };
    });
    await startTrace();
    await drive(["KeyW", "Space"], fixture.plannedLandingTime + 0.8);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    assert.ok(
      trace.samples.some((sample) => sample.airborne && sample.position.y > 12),
      "Actual underwater sprint should breach into a high ballistic arc",
    );
    assert.ok(
      trace.samples.some((sample) =>
        sample.contacts.some(
          ({ kind, normal }) => kind === "ship_deck" && normal.y > 0.7,
        ),
      ),
      "The descending body should land on a finite ship deck",
    );
    return { fixture, summary, trace };
  });

  await runCase("growth_recovery", async () => {
    await resetCase();
    const fixture = await placeAtReef({ growing: true });
    await startTrace();
    const grewIntoRock = await page.evaluate(() => {
      const game = window.__ABYSSAL__,
        collision = window.__COLLISION_MODULE__;
      game.setLength(30);
      return collision.isPositionBlocked(game.position, {
        colliders: game.ocean.colliders,
        radius: collision.bodyRadius(30),
        length: 30,
        forward: game.forward,
      });
    });
    await drive(["Space"], 1.3);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assert.ok(
      grewIntoRock,
      "Growth fixture should initially overlap a real reef",
    );
    assertClear(summary);
    assert.ok(
      summary.displacement > 5,
      "Growth recovery should leave a playable exit",
    );
    return { fixture, grewIntoRock, summary, trace };
  });

  // 专门把默认跟随相机放在船体后方阻挡线上，再由正常游泳和相机缩臂清除穿模。
  await runCase("camera_ship_occlusion", async () => {
    await resetCase();
    const fixture = await page.evaluate(() => {
      const game = window.__ABYSSAL__,
        ship = game.surface.ships[0];
      const point = {
        x: ship.root.position.x,
        y: -3.2,
        z: ship.root.position.z - 12,
      };
      game.setPosition(point.x, point.y, point.z);
      return {
        ship: ship.kind,
        position: point,
        initialCamera: { ...game.camera.position },
      };
    });
    await startTrace();
    await drive(["KeyA", "KeyK"], 0.8);
    const trace = await stopTrace(),
      summary = summarize(trace);
    assertClear(summary);
    assert.ok(
      summary.displacement > 2,
      "Camera test must keep the game moving",
    );
    return { fixture, summary, trace };
  });
} catch (error) {
  errors.push(error.stack);
} finally {
  await releaseKeys();
  const report = {
    verifiedAt: new Date().toISOString(),
    url: process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178",
    checks,
    errors,
    passed:
      checks.length === (process.env.ABYSSAL_COLLISION_CASE ? 1 : 10) &&
      checks.every((check) => check.status === "passed") &&
      errors.length === 0,
  };
  await writeFile(
    `${outputDirectory}/verification_collision_v0_4.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        checks: checks.map(({ name, status, error, summary }) => ({
          name,
          status,
          error,
          summary,
        })),
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!report.passed) process.exitCode = 1;
}
