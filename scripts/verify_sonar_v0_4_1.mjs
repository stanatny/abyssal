import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

// 只布置遭遇与边界时刻，声呐由真实按键、触摸和主循环激活/停止。
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const checks = [],
  errors = [],
  measurements = {};
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
  await page.waitForFunction(() => !!window.__ABYSSAL__);
  await page.locator("#menu-markers").uncheck();
  await page.click("#start");
  assert.equal(await page.locator("#touch-markers").count(), 0);
  assert.equal(await page.locator("#pause-markers").count(), 0);
  await page.waitForFunction(() =>
    document.querySelector("#round-clock").textContent.includes("29:"),
  );
  await page.keyboard.down("KeyK");
  measurements.fixture = await createOccludedFixture(page);
  await page.keyboard.press("KeyJ");
  await page.waitForFunction(() => {
    const g = window.__ABYSSAL__;
    const prey = g.sonar.snapshot.contacts.find(
      (entry) => entry.kind === "fish",
    );
    return (
      g.sonar.snapshot.active &&
      g.sonar.snapshot.total >= 3 &&
      g.sonarMarkers.snapshot.contacts.some((entry) => entry.id === prey?.id)
    );
  });
  const first = await page.evaluate(() => {
    const g = window.__ABYSSAL__,
      f = window.__SONAR_FIXTURE__;
    return {
      scan: g.sonar.snapshot,
      state: g.sonar.state,
      blocked: f.segmentBlocked(g.position, f.prey.mesh.position, f.colliders),
      hunterVisible: f.hunter.mesh.visible,
      markers: g.markersEnabled,
    };
  });
  assert.equal(first.markers, false);
  assert.equal(first.blocked, true);
  const prey = first.scan.contacts.find((e) => e.kind === "fish");
  const hunter = first.scan.contacts.find((e) => e.kind === "shark");
  const lord = first.scan.contacts.find((e) => e.kind === "kraken");
  assert.equal(prey.status, "可捕食");
  assert.equal(prey.length, 0.8);
  assert.equal(hunter.status, "不可捕食");
  assert.match(hunter.direction, /后/);
  assert.equal(lord.status, "体型不足 · 避开领主");
  assert.equal(
    first.scan.contacts.some((e) => e.kind === "tuna"),
    false,
  );
  checks.push(
    "J detects occluded prey, rear hunters and lords with normal markers off; the world labels show only the narrow forward view",
  );
  measurements.first = first;
  const presented = await readPresentation(page);
  assertDirectionalPresentation(presented);
  assertContactAbsent(presented, hunter.id);
  assert.ok(presented.anchors.some((entry) => entry.id === prey.id));
  assert.equal(presented.wave.visible, true);
  assert.ok(presented.wave.visiblePulses > 0);
  assertPointClose(presented.wave.position, presented.position);
  await page.waitForTimeout(250);
  const moved = await readPresentation(page);
  assertPointClose(moved.wave.position, moved.position);
  assert.ok(
    Math.hypot(
      ...moved.position.map((value, i) => value - presented.position[i]),
    ) > 0.1,
    "The orca must actually move while its wave origin follows",
  );
  measurements.presentation = presented;
  measurements.movingWave = moved.wave;
  checks.push(
    "The occluded forward prey has a size/eligibility label; rear contacts have no DOM marker while the minimap retains every detected creature",
    "Sonar emits visible expanding waves whose center follows the moving orca",
  );
  await page.screenshot({ path: ".local/v4_1_sonar_desktop.png" });
  await page.keyboard.press("KeyJ");
  assert.deepEqual(
    await page.evaluate(() => window.__ABYSSAL__.sonar.state),
    first.state,
  );
  checks.push("Repeated activation does not refresh duration or cooldown");
  await page.keyboard.up("KeyK");
  await page.keyboard.press("Escape");
  const paused = await page.evaluate(() => ({
    elapsed: window.__ABYSSAL__.player.elapsed,
    state: window.__ABYSSAL__.sonar.state,
  }));
  assertClearedPresentation(await readPresentation(page));
  await page.waitForTimeout(1100);
  assert.deepEqual(
    await page.evaluate(() => ({
      elapsed: window.__ABYSSAL__.player.elapsed,
      state: window.__ABYSSAL__.sonar.state,
    })),
    paused,
  );
  await page.click("#resume");
  await page.waitForFunction(() => window.__ABYSSAL__.sonarWave.group.visible);
  checks.push("Pause freezes the active scan and cooldown clock");
  await page.waitForFunction(
    () => !window.__ABYSSAL__.sonar.snapshot.active,
    {},
    { timeout: 14000 },
  );
  const expired = await page.evaluate(() => ({
    elapsed: window.__ABYSSAL__.player.elapsed,
    scan: window.__ABYSSAL__.sonar.snapshot,
    hidden: document.querySelector("#sonar-panel").hidden,
  }));
  assert.ok(expired.elapsed - first.state.activatedAt >= 10);
  assert.ok(expired.elapsed - first.state.activatedAt < 10.6);
  assert.equal(expired.hidden, true);
  assert.ok(expired.scan.cooldownRemaining > 49);
  const expiredPresentation = await readPresentation(page);
  assertClearedPresentation(expiredPresentation);
  assert.equal(expiredPresentation.touchDisabled, true);
  assert.equal(expiredPresentation.desktopDisabled, true);
  assert.match(expiredPresentation.touchStatus, /^\d+s$/);
  assert.equal(expiredPresentation.normalTargetHidden, true);
  await page.keyboard.press("KeyJ");
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.sonar.snapshot.active),
    false,
  );
  checks.push(
    "The scan visibly expires after 10 real active seconds; cooldown blocks immediate reuse",
  );
  const desktopTurnFixture = await createTurnFixture(page);
  await page.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.player.elapsed = g.sonar.state.readyAt - 1;
  });
  await page.keyboard.press("KeyJ");
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.sonar.snapshot.active),
    false,
  );
  await page.waitForFunction(() => window.__ABYSSAL__.sonar.snapshot.ready);
  assert.equal(await page.locator("#sonar-control").isDisabled(), false);
  assert.equal(await page.locator("#touch-sonar").isDisabled(), false);
  await page.keyboard.press("KeyJ");
  await page.waitForFunction(() => window.__ABYSSAL__.sonar.snapshot.active);
  checks.push("Sonar becomes available at the 60-second activation boundary");
  measurements.desktopTurn = await verifyRealTurn(page, desktopTurnFixture.id);
  checks.push(
    "Desktop D/A turning brings a rear target into the narrow forward labels and removes its old label again when turning away",
  );
  await page.evaluate(() => window.__ABYSSAL__.startGame());
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.sonar.snapshot.ready),
    true,
  );
  assert.equal(
    await page.evaluate(() => window.__ABYSSAL__.sonar.snapshot.active),
    false,
  );
  assert.equal(await page.locator("#touch-bite").count(), 0);
  assertClearedPresentation(await readPresentation(page));
  checks.push("Restart clears the skill state, and no bite button remains");
  await page.close();

  // 手机按钮使用真实触摸释放；禁用态同时验证原生属性、倒计时和重复触摸。
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  mobile.on("pageerror", (error) => errors.push(error.message));
  await mobile.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178");
  await mobile.waitForFunction(() => !!window.__ABYSSAL__);
  await mobile.locator("#menu-markers").uncheck();
  await mobile.locator("#start").tap();
  await mobile.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await mobile.keyboard.down("KeyK");
  measurements.mobileFixture = await createOccludedFixture(mobile);
  const ability = mobile.locator("#touch-sonar");
  await ability.tap();
  await mobile.waitForFunction(() => {
    const g = window.__ABYSSAL__;
    const prey = g.sonar.snapshot.contacts.find(
      (entry) => entry.kind === "fish",
    );
    return (
      g.sonar.snapshot.active &&
      g.sonarMarkers.snapshot.contacts.some((entry) => entry.id === prey?.id)
    );
  });
  const mobilePresentation = await readPresentation(mobile);
  assertDirectionalPresentation(mobilePresentation);
  const mobileHunter = mobilePresentation.scan.contacts.find(
    (entry) => entry.kind === "shark",
  );
  assert.ok(mobileHunter);
  assertContactAbsent(mobilePresentation, mobileHunter.id);
  assert.ok(
    mobilePresentation.anchors.some(
      (entry) =>
        entry.id ===
        mobilePresentation.scan.contacts.find(
          (contact) => contact.kind === "fish",
        )?.id,
    ),
  );
  measurements.mobileForward = mobilePresentation;
  const mobileState = await mobile.evaluate(
    () => window.__ABYSSAL__.sonar.state,
  );
  assert.equal(await ability.isDisabled(), true);
  assert.equal(await ability.getAttribute("aria-disabled"), "true");
  assert.match(
    await mobile.locator("#touch-sonar-status").textContent(),
    /^\d+s$/,
  );
  const box = await ability.boundingBox();
  assert.ok(box && box.width >= 40 && box.height >= 40);
  await mobile.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  assert.deepEqual(
    await mobile.evaluate(() => window.__ABYSSAL__.sonar.state),
    mobileState,
  );
  await mobile.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.player.elapsed = g.sonar.state.activeUntil;
  });
  await mobile.waitForFunction(() => !window.__ABYSSAL__.sonar.snapshot.active);
  assert.equal(await ability.getAttribute("data-state"), "cooldown");
  assert.equal(await ability.isDisabled(), true);
  assertClearedPresentation(await readPresentation(mobile));
  measurements.mobileCooldown = {
    label: await ability.getAttribute("aria-label"),
    status: await mobile.locator("#touch-sonar-status").textContent(),
    disabled: await ability.isDisabled(),
    box,
  };
  checks.push(
    "Mobile sonar uses a real touch target, displays its countdown and stays disabled during the scan and cooldown",
  );
  const mobileTurnFixture = await createTurnFixture(mobile);
  await mobile.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.player.elapsed = g.sonar.state.readyAt;
  });
  await mobile.waitForFunction(() => window.__ABYSSAL__.sonar.snapshot.ready);
  await ability.tap();
  await mobile.waitForFunction(() => window.__ABYSSAL__.sonar.snapshot.active);
  measurements.mobileTurn = await verifyRealTurn(mobile, mobileTurnFixture.id, {
    touch: true,
  });
  checks.push(
    "Mobile forward labels reveal the occluded fish, omit the rear hunter, and respond to real touchscreen joystick turns without dropping 360-degree radar contacts",
  );
  await mobile.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally {
  await writeFile(
    ".local/sonar_v0_4_1_results.json",
    JSON.stringify({ checks, errors, measurements }, null, 2),
  );
  await browser.close();
}

async function readPresentation(targetPage) {
  return targetPage.evaluate(async () => {
    const g = window.__ABYSSAL__;
    const { projectMinimapPosition } = await import("/src/minimap_rules.js");
    const readDot = (node) => [
      Number(node.getAttribute("cx")),
      Number(node.getAttribute("cy")),
    ];
    return {
      scan: g.sonar.snapshot,
      markerSnapshot: g.sonarMarkers.snapshot,
      anchors: [...document.querySelectorAll(".sonar-world-anchor")].map(
        (node) => ({
          id: node.dataset.contactId,
          labelId: node.dataset.labelId,
          length: Number(node.dataset.length),
          eligible: node.dataset.eligible,
          behind: node.dataset.behind,
          onscreen: node.dataset.onscreen,
          title: node.title,
        }),
      ),
      labels: [...document.querySelectorAll(".sonar-world-label")].map(
        (node) => ({
          ids: node.dataset.contactIds.split(","),
          text: node.textContent,
          title: node.title,
        }),
      ),
      markerHidden: document.querySelector(".sonar-world-markers").hidden,
      edgeIndicators: document.querySelectorAll(".sonar-world-anchor.is-edge")
        .length,
      directionLines: document.querySelectorAll(".sonar-world-links").length,
      minimap: {
        active: document.querySelector("#minimap").dataset.sonarActive,
        contacts: Number(document.querySelector("#minimap").dataset.contacts),
        dots: [...document.querySelectorAll("#minimap .minimap-contact")].map(
          readDot,
        ),
        expected: g.sonar.snapshot.contacts.map((entry) => {
          const point = projectMinimapPosition(entry.position);
          return [point.x, point.y];
        }),
      },
      position: g.position.toArray(),
      controls: g.controls,
      wave: {
        visible: g.sonarWave.group.visible,
        position: g.sonarWave.group.position.toArray(),
        visiblePulses: g.sonarWave.group.children.filter(
          (entry) => entry.visible,
        ).length,
      },
      touchDisabled: document.querySelector("#touch-sonar").disabled,
      desktopDisabled: document.querySelector("#sonar-control").disabled,
      touchStatus: document.querySelector("#touch-sonar-status").textContent,
      normalTargetHidden: document.querySelector("#target").hidden,
      bodyActive: document.body.classList.contains("sonar-active"),
    };
  });
}

function assertDirectionalPresentation(presentation) {
  assert.equal(presentation.markerHidden, false);
  assert.equal(presentation.edgeIndicators, 0);
  assert.equal(presentation.directionLines, 0);
  assert.equal(
    presentation.anchors.length,
    presentation.markerSnapshot.contacts.length,
  );
  assert.equal(
    presentation.markerSnapshot.totalDetected,
    presentation.scan.contacts.length,
  );
  assert.ok(
    presentation.markerSnapshot.frontVisible <=
      presentation.scan.contacts.length,
  );
  assert.ok(presentation.markerSnapshot.shownGroups <= 4);
  assert.ok(
    presentation.markerSnapshot.markedCount <=
      presentation.markerSnapshot.frontVisible,
  );
  assert.equal(
    presentation.markerSnapshot.shownGroups,
    presentation.labels.length,
  );
  assert.equal(presentation.minimap.active, "true");
  assert.equal(
    presentation.minimap.contacts,
    presentation.scan.contacts.length,
  );
  assert.equal(
    presentation.minimap.dots.length,
    presentation.scan.contacts.length,
  );
  for (const contact of presentation.markerSnapshot.contacts) {
    const anchor = presentation.anchors.find(
      (entry) => entry.id === contact.id,
    );
    assert.ok(anchor, `Missing world anchor for ${contact.id}`);
    assert.equal(anchor.length, contact.length);
    assert.equal(anchor.eligible, String(contact.eligible));
    assert.equal(anchor.behind, "false");
    assert.equal(anchor.onscreen, "true");
    assert.ok(Math.abs(contact.horizontalAngle) <= Math.PI / 6 + 1e-8);
    assert.ok(Math.abs(contact.verticalAngle) <= (25 * Math.PI) / 180 + 1e-8);
    const mapped = presentation.markerSnapshot.contacts.find(
      (entry) => entry.id === contact.id,
    );
    assert.equal(mapped.labelId, anchor.labelId);
    const label = presentation.markerSnapshot.labels.find(
      (entry) => entry.id === anchor.labelId,
    );
    assert.ok(label?.contacts.some((entry) => entry.id === contact.id));
    const domLabel = presentation.labels.find((entry) =>
      entry.ids.includes(contact.id),
    );
    assert.ok(domLabel, `Missing readable label for ${contact.id}`);
    assert.ok(domLabel.title.includes(`${contact.length}米`));
    assert.ok(domLabel.title.includes(contact.status));
  }
  for (const label of presentation.labels) {
    for (const id of label.ids)
      assert.ok(
        presentation.scan.contacts.some((contact) => contact.id === id),
        `Label leaked a non-detected contact ${id}`,
      );
  }
  assert.equal(
    new Set(presentation.labels.flatMap((label) => label.ids)).size,
    presentation.markerSnapshot.markedCount,
  );
  for (const expected of presentation.minimap.expected) {
    assert.ok(
      presentation.minimap.dots.some(
        (dot) => Math.hypot(dot[0] - expected[0], dot[1] - expected[1]) < 1e-7,
      ),
    );
  }
}

function assertContactAbsent(presentation, id) {
  assert.equal(
    presentation.anchors.some((entry) => entry.id === id),
    false,
    `Out-of-sector anchor remained for ${id}`,
  );
  assert.equal(
    presentation.labels.some((entry) => entry.ids.includes(id)),
    false,
    `Out-of-sector label remained for ${id}`,
  );
}

function assertClearedPresentation(presentation) {
  assert.equal(presentation.markerHidden, true);
  assert.equal(presentation.anchors.length, 0);
  assert.equal(presentation.labels.length, 0);
  assert.equal(presentation.markerSnapshot.contacts.length, 0);
  assert.equal(presentation.minimap.active, "false");
  assert.equal(presentation.minimap.contacts, 0);
  assert.equal(presentation.minimap.dots.length, 0);
  assert.equal(presentation.wave.visible, false);
  assert.equal(presentation.wave.visiblePulses, 0);
  assert.equal(presentation.bodyActive, false);
}

function assertPointClose(actual, expected) {
  assert.ok(
    Math.hypot(...actual.map((value, i) => value - expected[i])) < 1e-7,
  );
}

async function createOccludedFixture(targetPage) {
  return targetPage.evaluate(async () => {
    const g = window.__ABYSSAL__;
    const { segmentBlocked, isPositionBlocked, bodyRadius } = await import(
      "/src/collision.js"
    );
    const { seabedHeight } = await import("/src/ocean.js");
    const { WORLD } = await import("/src/world_config.js");
    const colliders = [...g.ocean.colliders, ...g.surface.colliders];
    g.entities.forEach((entry) => (entry.hiddenFor = 999));
    g.encounters.bosses.forEach((entry) => (entry.enabled = false));
    g.player.invulnerable = 999;
    let origin, hiddenPoint;
    for (const reef of g.ocean.colliders.filter(
      (entry) =>
        entry.kind === "reef" &&
        entry.axes.y > 10 &&
        entry.z > -250 &&
        Math.abs(entry.x) < 180,
    )) {
      const y = reef.y + reef.axes.y * 0.5;
      const start = { x: reef.x, y, z: reef.z + reef.axes.z + 12 };
      const behind = { x: reef.x, y, z: reef.z - reef.axes.z - 12 };
      // 为后方猎手留出真实世界边界余量，避免下一帧被边界钳回玩家附近。
      if (start.z > WORLD.maxZ - 120 || behind.z < WORLD.minZ + 12) continue;
      // 前侧上坡海床可能比岩石中部更高；抬高玩家保留身体净空，仍以真实射线验证遮挡。
      start.y = Math.max(start.y, seabedHeight(start.x, start.z) + 7);
      if (
        start.y > -5 ||
        Math.atan2(start.y - behind.y, start.z - behind.z) > Math.PI / 8
      )
        continue;
      if (
        isPositionBlocked(start, {
          colliders,
          radius: bodyRadius(6),
          length: 6,
          forward: g.forward,
        })
      )
        continue;
      if (!segmentBlocked(start, behind, colliders)) continue;
      origin = start;
      hiddenPoint = behind;
      break;
    }
    if (!origin) throw new Error("No occluded sonar fixture found");
    g.setPosition(origin.x, origin.y, origin.z);
    const locate = (kind, point) => {
      const entry = g.entities.find((e) => e.species.kind === kind);
      entry.hiddenFor = 0;
      entry.school = null;
      entry.chase = 0;
      entry.velocity.set(0, 0, 0);
      entry.mesh.position.copy(point);
      entry.mesh.visible = false;
      return entry;
    };
    const prey = locate("fish", hiddenPoint);
    const hunter = locate("shark", {
      x: origin.x,
      y: origin.y,
      z: origin.z + 100,
    });
    const outside = locate("tuna", {
      x: origin.x,
      y: origin.y,
      z: origin.z - 300,
    });
    const lord = g.encounters.bosses.find(
      (e) => e.state.species.kind === "kraken",
    );
    lord.enabled = true;
    lord.state.defeated = false;
    lord.mesh.position.set(origin.x + 30, origin.y - 130, origin.z - 120);
    lord.home.copy(lord.mesh.position);
    window.__SONAR_FIXTURE__ = {
      prey,
      hunter,
      outside,
      lord,
      colliders,
      segmentBlocked,
    };
    return {
      origin,
      hiddenPoint,
      blocked: segmentBlocked(origin, hiddenPoint, colliders),
    };
  });
}

async function createTurnFixture(targetPage) {
  return targetPage.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.entities.forEach((entry) => (entry.hiddenFor = 999));
    g.encounters.bosses.forEach((entry) => (entry.enabled = false));
    g.player.invulnerable = 999;
    // 保持真实游向，仅把遭遇放到深水开阔位置，避免船壳和礁石阻挡转身。
    g.setPosition(180, -160, -660);
    const hunter = g.entities.find((entry) => entry.species.kind === "shark");
    const index = g.entities.indexOf(hunter);
    hunter.hiddenFor = 0;
    hunter.school = null;
    hunter.chase = 0;
    hunter.velocity.set(0, 0, 0);
    // 130单位起始间距给正常巡游留足余量，转身期间不会误把离开260范围当成过滤失败。
    hunter.mesh.position.set(180, -160, -530);
    hunter.mesh.visible = false;
    return { id: `fish-${index}`, kind: hunter.species.kind };
  });
}

async function verifyRealTurn(targetPage, id, { touch = false } = {}) {
  const steering = await createSteeringInput(targetPage, touch);
  await targetPage.keyboard.down("KeyK");
  await targetPage.waitForFunction((contactId) => {
    const g = window.__ABYSSAL__;
    return (
      g.sonar.snapshot.active &&
      g.sonar.snapshot.contacts.some((entry) => entry.id === contactId)
    );
  }, id);
  // 让20Hz标记层吃到新采样；不能把上一遭遇残留误判成后方已消失。
  await targetPage.waitForFunction((contactId) => {
    const g = window.__ABYSSAL__;
    return (
      g.sonar.snapshot.contacts.length === 1 &&
      g.sonarMarkers.snapshot.totalDetected === 1 &&
      !g.sonarMarkers.snapshot.contacts.some((entry) => entry.id === contactId)
    );
  }, id);
  const behind = await readPresentation(targetPage);
  assertDirectionalPresentation(behind);
  assertContactAbsent(behind, id);
  assert.equal(behind.markerSnapshot.frontVisible, 0);
  assert.equal(behind.minimap.contacts, 1);
  await targetPage.evaluate(() => (window.__SONAR_TURN_TRACE__ = []));
  await steering.start(1);
  try {
    await targetPage.waitForFunction(
      (contactId) => {
        const g = window.__ABYSSAL__;
        const samples = window.__SONAR_TURN_TRACE__;
        if (!samples.length || performance.now() - samples.at(-1).at > 200) {
          const entity = g.entities[Number(contactId.split("-").at(-1))];
          const point = entity.mesh.position
            .clone()
            .applyMatrix4(g.camera.matrixWorldInverse);
          samples.push({
            at: performance.now(),
            elapsed: g.player.elapsed,
            simulationTime: g.elapsed,
            yaw: g.controls.yaw,
            position: g.position.toArray(),
            camera: g.camera.position.toArray(),
            target: entity.mesh.position.toArray(),
            view: point.toArray(),
            horizontalAngle: (Math.atan2(point.x, -point.z) * 180) / Math.PI,
            verticalAngle: (Math.atan2(point.y, -point.z) * 180) / Math.PI,
            scanActive: g.sonar.snapshot.active,
            detected: g.sonar.snapshot.total,
            frontVisible: g.sonarMarkers.snapshot.frontVisible,
            marked: g.sonarMarkers.snapshot.markedCount,
            labels: document.querySelectorAll(".sonar-world-label").length,
            collision: g.lastCollision?.contacts.map(
              (entry) => entry.collider?.kind,
            ),
          });
        }
        return (
          g.sonar.snapshot.active &&
          g.sonarMarkers.snapshot.contacts.some(
            (entry) => entry.id === contactId,
          ) &&
          [...document.querySelectorAll(".sonar-world-label")].some((node) =>
            node.dataset.contactIds.split(",").includes(contactId),
          )
        );
      },
      id,
      { timeout: 8000 },
    );
  } finally {
    await steering.stop();
    measurements[`turnTrace${targetPage.viewportSize().width}`] =
      await targetPage.evaluate(() => window.__SONAR_TURN_TRACE__);
  }
  const forward = await readPresentation(targetPage);
  assertDirectionalPresentation(forward);
  assert.ok(forward.anchors.some((entry) => entry.id === id));
  assert.ok(forward.markerSnapshot.frontVisible >= 1);
  assert.ok(
    Math.abs(forward.controls.yaw - behind.controls.yaw) > 1.5,
    "The actual steering input must turn the orca toward its rear contact",
  );
  assert.equal(forward.minimap.contacts, 1);
  await steering.start(-1);
  try {
    await targetPage.waitForFunction(
      (contactId) => {
        const g = window.__ABYSSAL__;
        return (
          g.sonar.snapshot.active &&
          g.sonar.snapshot.contacts.some((entry) => entry.id === contactId) &&
          g.sonarMarkers.snapshot.frontVisible === 0 &&
          ![...document.querySelectorAll(".sonar-world-anchor")].some(
            (node) => node.dataset.contactId === contactId,
          ) &&
          ![...document.querySelectorAll(".sonar-world-label")].some((node) =>
            node.dataset.contactIds.split(",").includes(contactId),
          )
        );
      },
      id,
      { timeout: 4000 },
    );
  } finally {
    await steering.stop();
    await targetPage.keyboard.up("KeyK");
  }
  const turnedAway = await readPresentation(targetPage);
  assertDirectionalPresentation(turnedAway);
  assertContactAbsent(turnedAway, id);
  assert.equal(turnedAway.minimap.contacts, 1);
  assert.equal(
    turnedAway.scan.active,
    true,
    "A label must disappear because of turning, not because the scan expired",
  );
  assert.ok(
    turnedAway.controls.yaw > forward.controls.yaw,
    "Left steering must reverse the previous right turn",
  );
  await steering.dispose();
  return {
    input: touch ? "cdp-touchscreen-joystick" : "keyboard-D-A",
    behind,
    forward,
    turnedAway,
  };
}

async function createSteeringInput(targetPage, touch) {
  if (!touch) {
    let activeKey = null;
    return {
      async start(direction) {
        activeKey = direction > 0 ? "KeyD" : "KeyA";
        await targetPage.keyboard.down(activeKey);
      },
      async stop() {
        if (activeKey) await targetPage.keyboard.up(activeKey);
        activeKey = null;
      },
      async dispose() {},
    };
  }
  const session = await targetPage.context().newCDPSession(targetPage);
  return {
    async start(direction) {
      const rect = await targetPage.locator("#joystick").boundingBox();
      assert.ok(
        rect && rect.width > 40 && rect.height > 40,
        "The touchscreen joystick must be visible",
      );
      const center = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
        id: 1,
        radiusX: 5,
        radiusY: 5,
        force: 1,
      };
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [center],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...center, x: center.x + direction * 40 }],
      });
    },
    async stop() {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    },
    async dispose() {
      await session.detach();
    },
  };
}
