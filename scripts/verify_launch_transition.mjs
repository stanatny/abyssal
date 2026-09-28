import { selectCharacter } from "./menu_picker_helpers.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 只观察真实主循环；通过实际开始按钮进入，不用开发接口推进或冻结时间。
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178/";
const directory = ".local/launch_transition_verification";
const report = {
  startedAt: new Date().toISOString(),
  baseUrl,
  checks: [],
  errors: [],
  screenshots: [],
  limits: [
    "Chrome viewport and touch emulation are not real-phone acceptance.",
    "Blur and hidden-document handlers are exercised with synthetic lifecycle events; actual operating-system backgrounding is not covered.",
    "The migration clock check stages a 1-second school deadline after 2 seconds of menu time, then observes the real gameplay loop.",
    "Camera traces establish state continuity; screenshots do not establish subjective motion quality or low-end performance.",
  ],
};
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function openPage(kind, viewport, reducedMotion = "no-preference") {
  const context = await browser.newContext({
    viewport,
    locale: "en-US",
    hasTouch: viewport.width < 900,
    isMobile: viewport.width < 900,
    deviceScaleFactor: 1,
    reducedMotion,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (error) => report.errors.push(error.message));
  page.on("console", (entry) => {
    if (entry.type() === "error") report.errors.push(entry.text());
  });
  await page.goto(baseUrl);
  await page.waitForFunction(() => !!window.__ABYSSAL__);
  await selectCharacter(page, kind);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  await page.evaluate(() => {
    const game = window.__ABYSSAL__;
    const refs = {
      avatar: game.avatar,
      entities: [...game.entities],
      pickups: [...game.pickups],
      ships: [...game.surface.ships],
      humans: [...game.humans.entities],
    };
    const positions = game.entities.map((entity) =>
      entity.mesh.position.clone(),
    );
    const trace = (window.__LAUNCH_TRACE__ = { samples: [] });
    const sameList = (a, b) =>
      a.length === b.length && a.every((value, index) => value === b[index]);
    const snapshot = () => ({
      at: performance.now(),
      mode: game.mode,
      player: structuredClone(game.player),
      sonar: game.sonar.state,
      ink: structuredClone(game.inkAbility),
      controls: game.controls,
      position: game.position.toArray(),
      camera: game.camera.position.toArray(),
      cameraQuaternion: game.camera.quaternion.toArray(),
      avatarPosition: game.avatar.position.toArray(),
      avatarQuaternion: game.avatar.quaternion.toArray(),
      avatarScale: game.avatar.scale.toArray(),
      avatarSame: game.avatar === refs.avatar,
      entitiesSame: sameList(game.entities, refs.entities),
      pickupsSame: sameList(game.pickups, refs.pickups),
      shipsSame: sameList(game.surface.ships, refs.ships),
      humansSame: sameList(game.humans.entities, refs.humans),
      fishMaxMove: Math.max(
        0,
        ...game.entities.map((entity, index) =>
          entity.mesh.position.distanceTo(positions[index]),
        ),
      ),
      menuHidden: document.querySelector("#menu").hidden,
      menuInert: document.querySelector("#menu").inert,
      hudInert: document.querySelector("#hud").inert,
      launchingClass: document.body.classList.contains("launching"),
      menuOpacity: document.body.style.getPropertyValue("--launch-menu"),
      hudOpacity: document.body.style.getPropertyValue("--launch-hud"),
      worldCanvases: document.querySelectorAll("canvas#ocean").length,
      canvasCount: document.querySelectorAll("canvas").length,
    });
    window.__LAUNCH_SNAPSHOT__ = snapshot;
    document.querySelector("#start").addEventListener(
      "click",
      () => {
        if (game.mode !== "menu") return;
        trace.before = snapshot();
      },
      { capture: true },
    );
    document.addEventListener("click", (event) => {
      if (event.target.closest("#start") && !trace.after)
        trace.after = snapshot();
    });
    const sample = () => {
      if (trace.after) {
        trace.samples.push(snapshot());
        if (game.mode === "playing") {
          trace.finished = snapshot();
          return;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  return { context, page };
}

async function start(page, method = "pointer") {
  if (method === "keyboard") {
    await page.focus("#start");
    await page.keyboard.press("Enter");
  } else if (method === "touch") await page.tap("#start");
  else await page.click("#start");
  assert.equal(
    await page.evaluate(() => window.__LAUNCH_TRACE__.after.mode),
    "launching",
  );
}

async function screenshot(page, name) {
  const path = `${directory}/${name}.png`;
  await page.screenshot({ path, timeout: 15000 });
  report.screenshots.push(path);
}

function verifyTrace(trace, { paused = false } = {}) {
  assert.equal(trace.before.mode, "menu");
  assert.equal(trace.after.mode, "launching");
  for (const field of [
    "camera",
    "cameraQuaternion",
    "avatarPosition",
    "avatarQuaternion",
    "avatarScale",
  ])
    assert.deepEqual(trace.after[field], trace.before[field], field);
  const frozenSamples = [
    trace.after,
    ...trace.samples.filter((sample) => sample.mode === "launching"),
    trace.finished,
  ];
  assert.ok(frozenSamples.length > 3, "Transition needs observable frames");
  for (const sample of frozenSamples) {
    assert.deepEqual(
      sample.player,
      trace.after.player,
      "Player state advanced",
    );
    assert.deepEqual(sample.sonar, trace.after.sonar, "Sonar state advanced");
    assert.deepEqual(sample.ink, trace.after.ink, "Ink state advanced");
    assert.deepEqual(sample.controls, trace.after.controls, "Input leaked");
    for (const field of [
      "avatarSame",
      "entitiesSame",
      "pickupsSame",
      "shipsSame",
      "humansSame",
    ])
      assert.equal(sample[field], true, field);
    assert.equal(sample.fishMaxMove, 0, "Fish moved before handoff");
    assert.equal(sample.worldCanvases, 1);
    assert.equal(sample.canvasCount, trace.before.canvasCount);
    assert.ok(sample.camera.every(Number.isFinite));
    assert.ok(sample.avatarPosition.every(Number.isFinite));
  }
  assert.equal(trace.finished.mode, "playing");
  assert.equal(trace.finished.player.elapsed, 0);
  assert.equal(trace.finished.menuHidden, true);
  assert.equal(trace.finished.hudInert, false);
  assert.equal(trace.finished.launchingClass, false);
  // 首次音频初始化可能同步占用点击回调；初始化不能吞掉可见过渡时间。
  const durationMs = trace.finished.at - trace.after.at;
  assert.ok(durationMs >= 1600, `Transition finished too early: ${durationMs}`);
  if (!paused)
    assert.ok(durationMs < 2300, `Transition was too slow: ${durationMs}`);
  return {
    durationMs: Math.round(durationMs),
    clickToHandoffMs: Math.round(trace.finished.at - trace.before.at),
    clickHandlerMs: Math.round(trace.after.at - trace.before.at),
    firstFrameDelayMs: Math.round(trace.samples[0].at - trace.before.at),
    firstFrameCameraMove: Math.hypot(
      ...trace.samples[0].camera.map(
        (value, index) => value - trace.before.camera[index],
      ),
    ),
    frames: frozenSamples.length,
    canvasCount: trace.before.canvasCount,
    entityCount: trace.before.entitiesSame ? "preserved" : "changed",
    initialCamera: trace.before.camera,
    finalCamera: trace.finished.camera,
  };
}

async function completedTrace(page) {
  await page.waitForFunction(() => !!window.__LAUNCH_TRACE__.finished);
  return page.evaluate(() => window.__LAUNCH_TRACE__);
}

async function run(name, kind, viewport, action, reducedMotion) {
  let context, page;
  try {
    ({ context, page } = await openPage(kind, viewport, reducedMotion));
    const evidence = await action(page);
    report.checks.push({ name, passed: true, evidence });
    console.log(`PASS ${name}`);
  } catch (error) {
    report.checks.push({ name, passed: false, error: error.stack });
    console.error(`FAIL ${name}: ${error.message}`);
    if (page) {
      await screenshot(page, `failure_${name}`).catch(() => {});
      const trace = await page
        .evaluate(() => window.__LAUNCH_TRACE__)
        .catch(() => null);
      await writeFile(
        `${directory}/failure_${name}.json`,
        `${JSON.stringify(trace, null, 2)}\n`,
      );
    }
  } finally {
    await context?.close();
  }
}

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 667 };
try {
  for (const [layout, viewport] of [
    ["desktop", desktop],
    ["phone", phone],
  ])
    for (const kind of ["orca", "squid"])
      await run(`${layout}_${kind}_launch`, kind, viewport, async (page) => {
        const method =
          layout === "phone"
            ? "touch"
            : kind === "orca"
              ? "keyboard"
              : "pointer";
        await screenshot(page, `${layout}_${kind}_home`);
        const bounds = await page.locator("#start").boundingBox();
        await start(page, method);
        await page.keyboard.down("KeyD");
        await page.keyboard.down("Space");
        await page.keyboard.press("KeyJ");
        // 重复真实指针点击及程序点击都不能重置已经开始的过渡。
        await page.mouse.click(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        await page.evaluate(() => document.querySelector("#start").click());
        await page.waitForTimeout(350);
        await page.keyboard.up("KeyD");
        await page.keyboard.up("Space");
        await screenshot(page, `${layout}_${kind}_launch`);
        const evidence = verifyTrace(await completedTrace(page));
        await screenshot(page, `${layout}_${kind}_playing`);
        await page.keyboard.press("KeyJ");
        await page.waitForFunction(
          () =>
            window.__ABYSSAL__.sonar.state.activatedAt !== null ||
            window.__ABYSSAL__.inkAbility.activatedAt !== null,
        );
        return { ...evidence, startMethod: method, skillAfterHandoff: true };
      });

  for (const trigger of ["keyboard", "pause_button", "blur", "visibility"])
    await run(`pause_${trigger}`, "squid", phone, async (page) => {
      await start(page, "touch");
      await page.waitForTimeout(300);
      if (trigger === "keyboard") await page.keyboard.press("Escape");
      else if (trigger === "pause_button") await page.tap("#pause");
      else
        await page.evaluate((trigger) => {
          if (trigger === "blur") window.dispatchEvent(new Event("blur"));
          else {
            Object.defineProperty(document, "hidden", {
              configurable: true,
              value: true,
            });
            document.dispatchEvent(new Event("visibilitychange"));
          }
        }, trigger);
      const before = await page.evaluate(() => window.__LAUNCH_SNAPSHOT__());
      assert.equal(before.mode, "paused");
      await page.waitForTimeout(450);
      const after = await page.evaluate(() => window.__LAUNCH_SNAPSHOT__());
      for (const field of [
        "player",
        "camera",
        "cameraQuaternion",
        "avatarPosition",
        "avatarQuaternion",
        "menuOpacity",
        "hudOpacity",
      ])
        assert.deepEqual(
          after[field],
          before[field],
          `Pause did not freeze ${field}`,
        );
      await page.evaluate(() => {
        delete document.hidden;
      });
      await page.tap("#resume");
      assert.equal(
        await page.evaluate(() => window.__ABYSSAL__.mode),
        "launching",
      );
      return verifyTrace(await completedTrace(page), { paused: true });
    });

  await run("restart_during_launch", "orca", desktop, async (page) => {
    await start(page);
    await page.keyboard.press("Escape");
    await page.click("#restart");
    const state = await page.evaluate(() => window.__LAUNCH_SNAPSHOT__());
    assert.equal(state.mode, "playing");
    assert.equal(state.menuHidden, true);
    assert.equal(state.menuInert, false);
    assert.equal(state.hudInert, false);
    assert.equal(state.launchingClass, false);
    await page.keyboard.press("KeyJ");
    assert.notEqual(
      await page.evaluate(() => window.__ABYSSAL__.sonar.state.activatedAt),
      null,
    );
    return { mode: state.mode, inputRestored: true };
  });

  await run(
    "menu_time_does_not_advance_migration",
    "orca",
    desktop,
    async (page) => {
      await page.waitForFunction(() => window.__ABYSSAL__.elapsed > 2);
      const menuElapsed = await page.evaluate(() => {
        const game = window.__ABYSSAL__;
        const school = game.entities.find(
          (entity) =>
            entity.school &&
            !["fish", "sardine"].includes(entity.school.kind) &&
            !entity.school.species.nurseryResident,
        ).school;
        // 仅缩短迁徙截止点，模拟首页停留已越过截止点；真实玩法时间仍为零。
        school.nextMigration = 1;
        window.__MIGRATION_SCHOOL__ = school;
        return game.elapsed;
      });
      await start(page);
      const evidence = verifyTrace(await completedTrace(page));
      await page.waitForFunction(
        () => window.__ABYSSAL__.player.elapsed > 0.15,
      );
      const state = await page.evaluate(() => ({
        nextMigration: window.__MIGRATION_SCHOOL__.nextMigration,
        playerElapsed: window.__ABYSSAL__.player.elapsed,
        visualElapsed: window.__ABYSSAL__.elapsed,
      }));
      assert.ok(state.playerElapsed < 1);
      assert.equal(state.nextMigration, 1);
      return { ...evidence, menuElapsed, ...state };
    },
  );

  await run(
    "compact_resize_during_launch",
    "squid",
    { width: 320, height: 568 },
    async (page) => {
      await start(page, "touch");
      await page.waitForTimeout(300);
      await page.setViewportSize({ width: 667, height: 390 });
      const evidence = verifyTrace(await completedTrace(page));
      const state = await page.evaluate(() => ({
        aspect: window.__ABYSSAL__.camera.aspect,
        width: innerWidth,
        height: innerHeight,
        canvas: document
          .querySelector("#ocean")
          .getBoundingClientRect()
          .toJSON(),
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert.equal(state.aspect, state.width / state.height);
      assert.equal(state.canvas.width, state.width);
      assert.equal(state.canvas.height, state.height);
      assert.equal(state.overflow, false);
      await screenshot(page, "compact_rotated_playing");
      return { ...evidence, viewport: state };
    },
  );

  for (const kind of ["orca", "squid"])
    await run(
      `reduced_motion_${kind}`,
      kind,
      phone,
      async (page) => {
        await page.tap("#start");
        const trace = await page.evaluate(() => window.__LAUNCH_TRACE__);
        assert.equal(trace.after.mode, "playing");
        assert.equal(trace.after.launchingClass, false);
        assert.equal(trace.after.menuHidden, true);
        assert.equal(trace.after.menuInert, false);
        assert.equal(trace.after.hudInert, false);
        assert.equal(trace.after.avatarSame, true);
        assert.equal(trace.after.entitiesSame, true);
        assert.equal(trace.after.fishMaxMove, 0);
        return { immediateMode: trace.after.mode, worldPreserved: true };
      },
      "reduce",
    );
} finally {
  await browser.close();
  report.completedAt = new Date().toISOString();
  report.passed =
    report.checks.every((check) => check.passed) && report.errors.length === 0;
  await writeFile(
    `${directory}/report.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(
    `Launch transition checks: ${report.checks.filter((check) => check.passed).length}/${report.checks.length}; console errors: ${report.errors.length}`,
  );
  if (!report.passed) process.exitCode = 1;
}
