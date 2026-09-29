import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/home_lifecycle";
await mkdir(directory, { recursive: true });
const report = {
  baseUrl,
  checks: [],
  errors: [],
  limits: [
    "Desktop Chrome CDP touch emulation at 390×667; not a physical-phone interaction test.",
    "Reduced motion skips the separately tested launch animation. The death condition is staged through the development API; all menu and skill actions use the actual UI.",
    "Mixed-input cleanup regression: a real CDP touch holds the joystick and keyboard Escape pauses/resumes. Chromium did not synthesize a button click from a non-primary touch while another touch remained down; this does not claim two-finger pause support.",
    "Joystick identity is observed from real pointer events. Its reset is behaviorally checked by moving the original held touch after resume. Return and new departure then use single-touch UI taps.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 667 },
  hasTouch: true,
  locale: "en-US",
  reducedMotion: "reduce",
});
const cdp = await page.context().newCDPSession(page);
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
page.setDefaultTimeout(8000);
const touches = new Map();
async function touch(type, id, point) {
  if (type === "touchEnd" || type === "touchCancel") touches.delete(id);
  else
    touches.set(id, {
      id,
      x: point.x,
      y: point.y,
      radiusX: 5,
      radiusY: 5,
      force: 1,
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: [...touches.values()],
  });
}
async function frames(count = 8) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        function sample() {
          if (--count <= 0) resolve();
          else requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }),
    count,
  );
}
async function tap(selector, id = 2) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box, `Visible touch target: ${selector}`);
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await touch("touchStart", id, point);
  await touch("touchEnd", id);
}
async function state() {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__,
      j = document.querySelector("#joystick"),
      p = window.__homeLifecycleProbe;
    return {
      mode: g.mode,
      character: g.player.characterId,
      controls: g.controls,
      joystickTransform: j.firstElementChild.style.transform,
      captured: p.pointerId !== null && j.hasPointerCapture(p.pointerId),
      lostCaptures: p.lostCaptures,
      sonar: g.sonar.snapshot.active,
      sonarReady: g.sonar.snapshot.ready,
      sonarMarkers: document.querySelector("#sonar-markers").childElementCount,
      sonarClass: document.body.classList.contains("sonar-active"),
      inkState: { ...g.inkAbility },
      clouds: g.effects.clouds.length,
      ink: g.effects.ink,
      particles: g.effects.activeParticles,
      inkOpacity: document.querySelector("#ink-overlay").style.opacity,
      notification: {
        hidden: document.querySelector("#notification").hidden,
        opacity: getComputedStyle(document.querySelector("#notification"))
          .opacity,
        text: document.querySelector("#notification").textContent,
      },
      languageDisabled: document.querySelector("[data-language-select]")
        .disabled,
      health: g.player.health,
    };
  });
}
async function expectCleanHome(label) {
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "menu");
  const s = await state();
  assert.equal(s.sonar, false);
  assert.equal(s.sonarClass, false);
  assert.equal(s.clouds, 0);
  assert.equal(s.ink, 0);
  assert.equal(s.particles, 0);
  assert.equal(s.inkState.activatedAt, null);
  assert.equal(s.inkState.readyAt, 0);
  assert.equal(s.inkOpacity, "0");
  assert.equal(s.notification.hidden, true);
  assert.equal(s.languageDisabled, false);
  assert.deepEqual(s.controls.pointer, { x: 0, y: 0 });
  assert.equal(s.joystickTransform, "");
  assert.equal(s.captured, false);
  report.checks.push({ label, state: s });
  return s;
}
async function expectDeparture(label) {
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await frames(4);
  const s = await state();
  assert.equal(s.languageDisabled, true);
  assert.equal(s.notification.hidden, false);
  assert.ok(Number(s.notification.opacity) > 0.9);
  assert.match(s.notification.text, /nursery shallows|safe shallows|安全浅滩/i);
  report.checks.push({ label, state: s });
  return s;
}
try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ABYSSAL__?.controls);
  await page.evaluate(() => {
    window.__homeLifecycleProbe = {
      pointerId: null,
      lostCaptures: 0,
      events: [],
    };
    for (const type of [
      "pointerdown",
      "pointerup",
      "pointercancel",
      "gotpointercapture",
      "lostpointercapture",
      "click",
    ])
      document.addEventListener(
        type,
        (event) => {
          window.__homeLifecycleProbe.events.push({
            type,
            target: event.target.id,
            pointerId: event.pointerId,
            primary: event.isPrimary,
          });
        },
        true,
      );
    const j = document.querySelector("#joystick");
    j.addEventListener(
      "pointerdown",
      (event) => (window.__homeLifecycleProbe.pointerId = event.pointerId),
    );
    j.addEventListener(
      "lostpointercapture",
      () => window.__homeLifecycleProbe.lostCaptures++,
    );
  });
  await tap("#start");
  await expectDeparture("Initial departure notification");
  const box = await page.locator("#joystick").boundingBox();
  const held = {
    x: box.x + box.width / 2 + 25,
    y: box.y + box.height / 2 + 20,
  };
  await touch("touchStart", 1, held);
  await touch("touchMove", 1, { x: held.x + 2, y: held.y + 2 });
  await frames(3);
  const heldState = await state();
  assert.equal(heldState.captured, true);
  assert.ok(Math.abs(heldState.controls.pointer.x) > 0.4);
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "paused");
  const paused = await state();
  assert.equal(paused.captured, false);
  assert.equal(paused.joystickTransform, "");
  assert.deepEqual(paused.controls.pointer, { x: 0, y: 0 });
  report.checks.push({
    label:
      "Real held touch + keyboard pause releases capture and clears joystick",
    state: paused,
  });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  const before = (await state()).controls;
  await touch("touchMove", 1, { x: held.x + 12, y: held.y - 35 });
  await frames(14);
  const after = await state();
  assert.deepEqual(after.controls.pointer, { x: 0, y: 0 });
  assert.ok(Math.abs(before.yaw - after.controls.yaw) < 1e-7);
  assert.ok(Math.abs(before.pitch - after.controls.pitch) < 1e-7);
  assert.equal(after.joystickTransform, "");
  assert.equal(after.captured, false);
  assert.ok(
    after.lostCaptures > 0,
    "The committed joystick capture must emit lostpointercapture",
  );
  report.checks.push({
    label: "Old touch cannot resume steering after pause",
    before,
    after: after.controls,
    lostCaptures: after.lostCaptures,
  });
  await touch("touchEnd", 1);
  await tap("#pause");
  await tap("#return-menu");
  await expectCleanHome("Single-touch return after held-pointer cleanup");
  await tap("#start");
  const newRound = await expectDeparture(
    "New departure after joystick cleanup",
  );
  assert.deepEqual(newRound.controls.pointer, { x: 0, y: 0 });
  assert.equal(newRound.controls.yaw, 0);
  assert.equal(newRound.controls.pitch, 0);

  await tap("#touch-sonar");
  await frames(3);
  assert.equal((await state()).sonar, true);
  await tap("#pause");
  await tap("#return-menu");
  await expectCleanHome("Orca active sonar cleared by return");
  await tap("#character-select");
  await tap('[data-choice-value="squid"]');
  await tap("#start");
  await expectDeparture("Squid departure after character selection");
  await tap("#touch-sonar");
  await frames(3);
  const ink = await state();
  assert.ok(ink.inkState.readyAt > 0);
  assert.ok(ink.clouds > 0);
  await tap("#pause");
  await tap("#return-menu");
  await expectCleanHome("Squid active ink and jet cleared by return");

  await tap("#start");
  await expectDeparture("Departure after active ink cleanup");
  await page.evaluate(() => {
    window.__ABYSSAL__.takeDamage(10000);
  });
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "dead");
  await tap("#return-menu");
  const clean = await expectCleanHome("Death result returns to a clean home");
  assert.equal(clean.health, 100);
  await tap("#start");
  const final = await expectDeparture(
    "Departure notification reappears after death-result return",
  );
  assert.equal(final.character, "squid");
  assert.equal(final.inkState.readyAt, 0);
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  report.pointerEvents = await page.evaluate(
    () => window.__homeLifecycleProbe?.events,
  );
  report.failureState = await state();
  await page.screenshot({ path: `${directory}/failure.png` });
  throw error;
} finally {
  await cdp
    .send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] })
    .catch(() => {});
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify(
    { checks: report.checks.length, errors: report.errors },
    null,
    2,
  ),
);
