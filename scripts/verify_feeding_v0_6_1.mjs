import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 只布置接触位置和隔离遭遇；进食、破水、数值与过渡均由真实主循环触发。
await mkdir(".local", { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(30000);
const checks = [],
  errors = [],
  traces = [],
  limitations = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/");
  await page.waitForFunction(() => window.__ABYSSAL__?.feeding?.snapshot);
  await page.click("#quality");
  await page.click("#start");
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.audio.humanVoiceState === "ready" &&
      window.__ABYSSAL__.audio.fishSoundState === "ready",
  );
  await installRecorder();

  for (const kind of ["hammerhead", "shark"]) {
    await resetFixture();
    const bornLength = await page.evaluate(
      () => window.__ABYSSAL__.player.length,
    );
    assert.equal(
      bornLength,
      3,
      "A new expedition must begin at 3 m without a length override",
    );
    await armCase({ kind, reject: true });
    const trace = await finishCase(`reject_${kind}`);
    assert.ok(
      trace.frames.some((frame) => frame.mouthDistance < frame.biteRange),
      "The inedible hunter must actually enter mouth range",
    );
    assert.ok(trace.frames.every((frame) => frame.eaten === trace.beforeEaten));
    assert.ok(trace.frames.every((frame) => !frame.active));
    assert.equal(trace.mist.length, 0);
    checks.push(`Newborn 3 m contact cannot consume ${kind}`);
  }

  await resetFixture();
  await armCase({ kind: "sardine", pause: true });
  await page.waitForFunction(() => {
    const trace = window.__FEEDING_TRACE__;
    return (
      trace.phase === "paused" &&
      trace.frames.filter((frame) => frame.mode === "paused").length >= 12
    );
  });
  const frozen = await page.evaluate(() =>
    window.__FEEDING_TRACE__.frames.filter((frame) => frame.mode === "paused"),
  );
  assert.ok(frozen.length >= 12);
  for (const frame of frozen) {
    assert.equal(frame.age, frozen[0].age, "Pause must freeze feeding age");
    assert.deepEqual(frame.scale, frozen[0].scale);
    assert.deepEqual(frame.position, frozen[0].position);
    assert.equal(frame.eaten, frozen[0].eaten);
  }
  await page.screenshot({ path: ".local/v6_1_feeding_paused.png" });
  await page.click("#resume");
  const fish = await finishCase("sardine");
  assertConsumed(fish);
  assert.ok(
    fish.audio[0].recordedVoice?.matchingBuffer,
    "Actual fish capture must use the recorded water bite",
  );
  assert.deepEqual(
    fish.audio.map((event) => event.method),
    ["eatFish"],
  );
  checks.push(
    "Sardine remains visible while closing and compressing, then emits one meal mist; pause freezes the original mesh",
  );

  await resetFixture();
  await armCase({ kind: "sardine", pause: true });
  await page.waitForFunction(() => window.__FEEDING_TRACE__.phase === "paused");
  const restartBefore = await page.evaluate(() => {
    const trace = window.__FEEDING_TRACE__;
    trace.recording = false;
    return { originalScale: trace.originalScale, mist: trace.mist.length };
  });
  await page.click("#return-menu");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
  await page.click("#start");
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        function tick() {
          if (++frames >= 12) resolve();
          else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }),
  );
  const restartAfter = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      trace = window.__FEEDING_TRACE__;
    return {
      active: g.feeding.snapshot().activeCount,
      eaten: g.player.eaten,
      scale: trace.target.mesh.scale.toArray(),
      mist: trace.mist.length,
      particles: g.effects.activeParticles,
    };
  });
  assert.equal(restartAfter.active, 0);
  assert.equal(restartAfter.eaten, 0);
  assert.equal(
    restartAfter.mist,
    restartBefore.mist,
    "Restart must cancel pending meal mist",
  );
  assert.deepEqual(restartAfter.scale, restartBefore.originalScale);
  traces.push({ case: "restart", before: restartBefore, after: restartAfter });
  checks.push(
    "Restart clears a live swallow and restores prey scale without delayed mist or duplicate nutrition",
  );

  for (const kind of ["swimmer", "diver"]) {
    for (const sex of ["male", "female"]) {
      await resetFixture(6);
      await armCase({ kind, human: true, sex });
      const human = await finishCase(`${kind}_${sex}`);
      assert.equal(human.sex, sex);
      assert.equal(human.meshSex, sex);
      assert.equal(
        human.audio[0]?.args[1],
        sex,
        "Captured human must use the matching voice",
      );
      assert.ok(
        human.audio[0].recordedVoice?.matchingBuffer,
        "Actual voice source must use the captured person's recording",
      );
      assert.equal(human.audio[0].recordedVoice.playbackRate, 1);
      assert.ok(
        Math.abs(
          human.audio[0].recordedVoice.duration - (sex === "male" ? 1.65 : 1),
        ) < 0.001,
      );
      assertConsumed(human);
      assert.deepEqual(
        human.audio.map((event) => event.method),
        ["eatHuman"],
      );
      assert.ok(
        human.frames.some(
          (frame) => frame.active && frame.alive === false && frame.visible,
        ),
      );
      checks.push(
        `Real ${sex} ${kind} contact triggers one matching vocal cue, one swallow and one delayed mist`,
      );
    }
  }

  // 鸟必须通过真实冲刺破水进入可捕食状态；不改私有airborne状态或直接调用回调。
  if (process.env.ABYSSAL_SKIP_BIRD === "1") {
    limitations.push(
      "Seagull flight was explicitly skipped; verify the shared transition during a real breach separately",
    );
  } else {
    await resetFixture(6, true);
    await armCase({ kind: "seagull", bird: true });
    await page.keyboard.down("Space");
    try {
      const bird = await finishCase("seagull", 60000);
      assertConsumed(bird);
      assert.ok(
        bird.frames.some((frame) => frame.airborne && frame.active),
        "Seagull capture must occur during a real breach",
      );
      checks.push(
        "A 6 m fixture actually breaches with Space and swallows a seagull through the same transition",
      );
    } finally {
      await page.keyboard.up("Space");
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors, limitations }, null, 2));
} catch (error) {
  errors.push(error.message);
  await page
    .screenshot({ path: ".local/v6_1_feeding_failure.png" })
    .catch(() => {});
  const current = await readTrace().catch(() => null);
  if (current) traces.push({ case: "failure", ...current });
  throw error;
} finally {
  await writeFile(
    ".local/v6_1_feeding_results.json",
    JSON.stringify({ checks, errors, limitations, traces }, null, 2),
  );
  await browser.close();
}

async function resetFixture(length = null, breach = false) {
  await page.evaluate(
    ({ length, breach }) => {
      if (window.__FEEDING_TRACE__) window.__FEEDING_TRACE__.recording = false;
      const g = window.__ABYSSAL__;
      g.startGame();
      if (length !== null) g.setLength(length);
      g.setFacing(0, breach ? 1.48 : 0);
      g.setPosition(...(breach ? [180, -90, -500] : [180, -100, -400]));
      g.player.invulnerable = 999;
      g.entities.forEach((entity) => {
        entity.hiddenFor = 999;
        entity.mesh.visible = false;
      });
      g.encounters.bosses.forEach((boss) => (boss.enabled = false));
      g.pickups.forEach((pickup) => (pickup.cooldown = 999));
      g.humans.entities.forEach((entity) => {
        entity.alive = false;
        entity.mesh.visible = false;
      });
      g.humans.hazards.forEach((hazard) => {
        hazard.active = false;
        hazard.mesh.visible = false;
        hazard.warning.visible = false;
      });
      g.surface.birds.forEach((bird) => (bird.cooldown = 999));
    },
    { length, breach },
  );
}

async function installRecorder() {
  await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      originalMist = g.effects.mealMist;
    // 观察实际余雾API，而不是用咬合气泡数量推断血雾出现。
    g.effects.mealMist = function (point, length) {
      const trace = window.__FEEDING_TRACE__;
      if (trace)
        trace.mist.push({
          time: g.elapsed,
          point: point.toArray(),
          length,
          eaten: g.player.eaten,
        });
      return originalMist.call(this, point, length);
    };
    // 只记录真实结算所调用的音频接口，不替换或手动触发实际声源。
    for (const method of ["eatFish", "eatHuman"]) {
      const original = g.audio[method];
      if (typeof original !== "function")
        throw new Error(`Missing audio: ${method}`);
      g.audio[method] = function (...args) {
        const trace = window.__FEEDING_TRACE__;
        if (trace) trace.audio.push({ method, time: g.elapsed, args });
        const before = new Set(this.feedingVoices.keys());
        const result = original.apply(this, args);
        if (trace) {
          const source = [...this.feedingVoices.keys()].find(
            (node) => !before.has(node),
          );
          trace.audio.at(-1).recordedVoice = source
            ? {
                matchingBuffer:
                  method === "eatHuman"
                    ? source.buffer ===
                      this.feedingBuffers.get(`human_${args[1]}`)
                    : [0, 1, 2].some(
                        (i) =>
                          source.buffer ===
                          this.feedingBuffers.get(`fish_${i}`),
                      ),
                duration: source.buffer.duration,
                playbackRate: source.playbackRate.value,
              }
            : null;
        }
        return result;
      };
    }
  });
}

async function armCase(options) {
  await page.evaluate((options) => {
    const g = window.__ABYSSAL__;
    const target = options.bird
      ? g.surface.birds.find((bird) => !bird.ship)
      : options.human
        ? g.humans.entities.find(
            (entity) =>
              entity.kind === options.kind &&
              entity.sex === options.sex &&
              !entity.reserved,
          )
        : g.entities.find((entity) => entity.species.kind === options.kind);
    if (!target) throw new Error(`Missing fixture: ${options.kind}`);
    const trace = {
      kind: options.kind,
      sex: target.sex,
      meshSex: target.mesh.userData.sex,
      target,
      frames: [],
      mist: [],
      audio: [],
      beforeEaten: g.player.eaten,
      originalScale: target.mesh.scale.toArray(),
      recording: true,
      phase: "waiting",
      startedAt: performance.now(),
      gameStart: g.elapsed,
      seenActive: false,
      pauseUsed: false,
      settledFrames: 0,
      birdPlaced: false,
      capture: null,
    };
    window.__FEEDING_TRACE__ = trace;
    if (!options.bird) {
      target.mesh.position
        .copy(g.position)
        .addScaledVector(g.forward, g.player.length * 0.36);
      target.mesh.visible = true;
      if (options.human) {
        target.anchor.copy(target.mesh.position);
        target.alive = true;
        target.protectedUntil = 0;
        target.cooldown = 0;
      } else {
        target.hiddenFor = 0;
        // 静置接触夹具，走既有迷失状态分支；没有直接调用进食函数。
        target.disorientedUntil = g.player.elapsed + 60;
      }
    }
    function sample() {
      if (!trace.recording) return;
      if (options.bird && !trace.birdPlaced && g.surface.airborne) {
        const time = g.elapsed;
        target.anchor.copy(g.position);
        target.anchor.x -= Math.sin(time * 0.16 + target.phase) * 8;
        target.anchor.y -= Math.sin(time * 0.65 + target.phase) * 0.8;
        target.anchor.z -= Math.cos(time * 0.16 + target.phase) * 8;
        target.cooldown = 0;
        trace.birdPlaced = true;
      }
      const entry = g.feeding
        .snapshot()
        .entries.find((item) => item.uuid === target.mesh.uuid);
      const mouth = g.position
        .clone()
        .addScaledVector(g.forward, g.player.length * 0.36);
      const length = options.bird ? 2.6 : target.species.length;
      const frame = {
        time: g.elapsed,
        wall: performance.now() - trace.startedAt,
        mode: g.mode,
        eaten: g.player.eaten,
        active: !!entry,
        visible: target.mesh.visible,
        position: target.mesh.position.toArray(),
        scale: target.mesh.scale.toArray(),
        age: entry?.age ?? null,
        progress: entry?.progress ?? null,
        mistEmitted: entry?.mistEmitted ?? false,
        mistCount: trace.mist.length,
        alive: target.alive ?? null,
        hiddenFor: target.hiddenFor ?? null,
        airborne: g.surface.airborne,
        mouthDistance: target.mesh.position.distanceTo(mouth),
        biteRange: g.player.length * 0.22 + length * 0.28,
      };
      trace.frames.push(frame);
      if (entry) {
        trace.seenActive = true;
        if (!trace.capture && entry.progress > 0.22 && entry.progress < 0.65) {
          try {
            trace.capture = g.renderer.domElement.toDataURL("image/png");
          } catch {
            /* JSON轨迹仍保留，页面截图由外层负责。 */
          }
        }
        if (options.pause && !trace.pauseUsed && entry.progress >= 0.22) {
          trace.pauseUsed = true;
          document.querySelector("#pause").click();
          trace.phase = "paused";
        }
      }
      if (options.reject && g.elapsed - trace.gameStart >= 0.5)
        trace.phase = "done";
      if (trace.seenActive && !entry && g.mode === "playing") {
        if (++trace.settledFrames >= 10) trace.phase = "done";
      }
      if (performance.now() - trace.startedAt > 55000) {
        trace.phase = "timeout";
        trace.recording = false;
      }
      if (trace.phase === "done") trace.recording = false;
      if (trace.recording) requestAnimationFrame(sample);
    }
    sample();
  }, options);
}

async function readTrace() {
  return page.evaluate(() => {
    const trace = window.__FEEDING_TRACE__;
    if (!trace) return null;
    const { target, ...data } = trace;
    return { ...data, targetUuid: target.mesh.uuid };
  });
}

async function finishCase(name, timeout = 30000) {
  await page.waitForFunction(
    () => ["done", "timeout"].includes(window.__FEEDING_TRACE__?.phase),
    null,
    { timeout },
  );
  const trace = await readTrace();
  if (trace.capture) {
    await writeFile(
      `.local/v6_1_feeding_${name}_transition.png`,
      Buffer.from(trace.capture.split(",")[1], "base64"),
    );
    delete trace.capture;
  }
  traces.push({ case: name, ...trace });
  assert.equal(
    trace.phase,
    "done",
    `${name}: the live gameplay trigger must complete`,
  );
  await page.screenshot({ path: `.local/v6_1_feeding_${name}_after.png` });
  return trace;
}

function assertConsumed(trace) {
  const frames = trace.frames,
    active = frames.filter((frame) => frame.active);
  assert.ok(
    active.length >= 2,
    "Capture must contain multiple live transition frames",
  );
  assert.ok(
    active.every((frame) => frame.visible),
    "The original prey must remain visible during the transition",
  );
  assert.ok(
    active.some((frame) => frame.scale[0] < trace.originalScale[0] * 0.9),
    "The original prey must compress before disappearing",
  );
  assert.ok(
    active.some((frame) => !frame.mistEmitted && frame.mistCount === 0),
    "Blood mist must not appear on the capture frame",
  );
  assert.equal(
    trace.mist.length,
    1,
    "Exactly one delayed meal mist must be emitted",
  );
  assert.ok(trace.mist[0].time > active[0].time);
  assert.ok(
    frames.every(
      (frame) =>
        frame.eaten === trace.beforeEaten ||
        frame.eaten === trace.beforeEaten + 1,
    ),
  );
  assert.equal(frames.at(-1).eaten, trace.beforeEaten + 1);
  assert.equal(frames.at(-1).visible, false);
  assert.deepEqual(frames.at(-1).scale, trace.originalScale);
}
