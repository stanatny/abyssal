import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";

const out = process.env.ABYSSAL_CAPTURE_OUT || ".local/rare_capture_checks";
await mkdir(out, { recursive: true });
const report = {
  checks: [],
  errors: [],
  limits: [
    "Populated maps with normally moving NPCs. Legal player position/facing fixtures isolate the pursuit or assisted contact; no NPC, stock, vitals, size, habitat, camera or lighting writes. Frenzy is acquired from an actual pickup; summon uses the native skill. This is not a full natural expedition or physical-phone test.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20000);
page.on("pageerror", (e) => report.errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") report.errors.push(m.text());
});
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
let held = new Set();
async function keys(next) {
  const set = new Set(next);
  for (const key of held) if (!set.has(key)) await page.keyboard.up(key);
  for (const key of set) if (!held.has(key)) await page.keyboard.down(key);
  held = set;
}
async function snapshot() {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__,
      e = g.entities.find((e) => e.species.category === "rare"),
      d = e.mesh.position.clone().sub(g.position);
    return {
      mode: g.mode,
      kind: e.species.kind,
      rare: e.mesh.position.toArray(),
      player: g.position.toArray(),
      time: g.player.elapsed,
      length: g.player.length,
      mass: g.player.mass,
      stamina: g.player.stamina,
      health: g.player.health,
      hunger: g.player.hunger,
      cap: g.player.vitalCap,
      claimed: g.player.rareRewardClaimed,
      retired: e.hiddenFor === Infinity,
      eaten: g.player.eaten,
      count: g.entities.filter((e) => e.species.category === "rare").length,
      frenzy: g.player.buffs.frenzy,
      distance: d.length(),
      desiredYaw: Math.atan2(-d.x, -d.z),
      desiredPitch: Math.atan2(d.y, Math.hypot(d.x, d.z)),
      yaw: g.controls.yaw,
      pitch: g.controls.pitch,
      speed: g.controls.speed,
      minion: g.minion.snapshot(),
      minionEatingRare: g.minion.feeding.has(e.mesh),
      ownerEatingRare: g.feeding.has(e.mesh),
    };
  });
}
async function start(region, character, locale, width) {
  await keys([]);
  if (await page.evaluate(() => window.__ABYSSAL__?.mode === "playing"))
    await page.click("#pause");
  if (await page.evaluate(() => window.__ABYSSAL__?.mode === "paused"))
    await page.click("#return-menu");
  await page.setViewportSize({ width, height: width < 500 ? 740 : 900 });
  await page.locator("[data-language-select]").selectOption(locale);
  if (
    (await page.locator("#region-select").evaluate((e) => e.value)) !== region
  ) {
    await page.click("#region-select");
    await page.click(`#expedition-picker [data-choice-value="${region}"]`);
  }
  await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
  if (
    (await page.locator("#character-select").evaluate((e) => e.value)) !==
    character
  )
    await selectCharacter(page, character);
  await page.click("#start");
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.mode === "playing" &&
      !document.body.classList.contains("launching"),
  );
  await page.click("#pause");
  return snapshot();
}
async function stage(distance, minion = false) {
  return page.evaluate(
    async ({ distance, minion }) => {
      const g = window.__ABYSSAL__,
        e = g.entities.find((e) => e.species.category === "rare"),
        { isPositionBlocked, castSegment } = await import("/src/collision.js"),
        { seabedHeight } = await import("/src/ocean.js");
      const floor = g.ocean.heightAt || seabedHeight,
        p = e.mesh.position,
        w = e.species.worldBounds;
      const angles = Array.from(
        { length: 16 },
        (_, i) => (i * Math.PI) / 8,
      ).sort((a, b) => {
        const clearance = (angle) => {
          const q = {
            x: p.x + Math.sin(angle) * distance,
            y: p.y,
            z: p.z + Math.cos(angle) * distance,
          };
          return Math.min(
            ...g.entities
              .filter(
                (n) =>
                  n.hiddenFor <= 0 &&
                  n.species.predator &&
                  n.species.length > g.player.length - 5,
              )
              .map((n) => n.mesh.position.distanceTo(q) - n.species.length),
          );
        };
        return clearance(b) - clearance(a);
      });
      for (const angle of angles) {
        const a = angle,
          q = {
            x: p.x + Math.sin(a) * distance,
            y: p.y,
            z: p.z + Math.cos(a) * distance,
          };
        const dx = p.x - q.x,
          dz = p.z - q.z;
        const yaw = Math.atan2(-dx, -dz);
        const forward = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
        if (
          q.x < w.minX + 8 ||
          q.x > w.maxX - 8 ||
          q.z < w.minZ + 8 ||
          q.z > w.maxZ - 8 ||
          q.y < floor(q.x, q.z) + g.player.length * 0.34 + 1 ||
          isPositionBlocked(q, {
            forward,
            length: g.player.length,
            radius: g.player.length * 0.13,
            colliders: g.ocean.colliders,
          }) ||
          castSegment(q, p, g.ocean.colliders)
        )
          continue;
        g.setFacing(yaw);
        g.setPosition(q.x, q.y, q.z);
        const mouth = g.getCapturePoint();
        return {
          point: q,
          yaw,
          rare: p.toArray(),
          mouthDistance: mouth.distanceTo(p),
          legal: true,
          count: g.entities.filter((e) => e.species.category === "rare").length,
        };
      }
      throw new Error("No legal player fixture beside live rare");
    },
    { distance, minion },
  );
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  const cases = [
    ...["orca", "squid", "zombie_shark", "mechanical_shark"].map(
      (character) => ({
        type: "sprint",
        region: "hawaii",
        character,
        locale: "en",
        width: 1440,
      }),
    ),
    ...["orca", "squid", "zombie_shark", "mechanical_shark"].map(
      (character) => ({
        type: "frenzy",
        region: "hawaii",
        character,
        locale: character === "squid" ? "zh-CN" : "en",
        width: character === "squid" ? 390 : 1440,
      }),
    ),
    {
      type: "companion",
      region: "mariana",
      character: "zombie_shark",
      locale: "en",
      width: 1440,
    },
    {
      type: "companion",
      region: "penglai",
      character: "zombie_shark",
      locale: "zh-CN",
      width: 390,
    },
  ];
  for (const c of cases.filter(
    (c) =>
      !process.env.ABYSSAL_CAPTURE_CASE ||
      `${c.type}:${c.region}` === process.env.ABYSSAL_CAPTURE_CASE ||
      c.type === process.env.ABYSSAL_CAPTURE_CASE,
  )) {
    const initial = await start(c.region, c.character, c.locale, c.width);
    assert.equal(initial.cap, 100);
    assert.equal(initial.count, 1);
    if (c.type === "frenzy") {
      const pickup = await page.evaluate(() => {
        const g = window.__ABYSSAL__,
          p = g.pickups.find(
            (p) => p.kind === "frenzy" && !p.disabled && p.cooldown <= 0,
          );
        if (!p) throw Error("No active native Frenzy pickup");
        g.setPosition(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z);
        return p.mesh.position.toArray();
      });
      await page.click("#resume");
      await page.waitForFunction(
        () => window.__ABYSSAL__.player.buffs.frenzy > 0,
      );
      await page.click("#pause");
      c.pickup = pickup;
    }
    const fixture = await stage(
      c.type === "sprint" ? 28 : c.type === "frenzy" ? 5 : 22,
      c.type === "companion",
    );
    const before = await snapshot();
    await page.waitForTimeout(150);
    assert.deepEqual((await snapshot()).rare, before.rare);
    assert.equal((await snapshot()).time, before.time);
    if (c.type === "frenzy") {
      const range = await page.evaluate(async () => {
        const { preyCaptureRadius, frenzyReachBonus } = await import(
          "/src/prey_capture.js"
        );
        const p = window.__ABYSSAL__.player;
        return {
          normal: preyCaptureRadius(p.length, 1.8),
          intake:
            preyCaptureRadius(p.length, 1.8, false, true) +
            frenzyReachBonus(p.length),
        };
      });
      assert.ok(fixture.mouthDistance > range.normal);
      assert.ok(fixture.mouthDistance < range.intake);
      c.range = range;
    }
    await page.click("#resume");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await keys(
      c.type === "sprint" ? ["Space"] : c.type === "companion" ? ["k"] : [],
    );
    if (c.type === "companion") {
      await page.keyboard.press("j");
      await page.waitForFunction(() => window.__ABYSSAL__.minion.active);
    }
    const trace = [];
    report.pending = { ...c, initial, fixture, before, trace };
    let award;
    for (let i = 0; i < 150; i++) {
      const s = await snapshot();
      trace.push(s);
      if (s.claimed) {
        award = s;
        break;
      }
      assert.equal(s.mode, "playing");
      assert.equal(s.health > 0, true);
      if (s.time - before.time > 8) break;
      if (c.type === "sprint" || c.type === "companion") {
        const yaw = wrap(s.desiredYaw - s.yaw),
          pitch = s.desiredPitch - s.pitch,
          inputs =
            s.distance >
              (c.type === "companion" ? 23 : c.character === "squid" ? 2 : 3) &&
            Math.abs(yaw) < 0.5 &&
            Math.abs(pitch) < 0.5
              ? ["Space"]
              : [];
        if (
          Math.abs(yaw) > 0.035 &&
          !(c.character === "squid" && s.distance < 2.2)
        )
          inputs.push(yaw > 0 ? "a" : "d");
        if (
          Math.abs(pitch) > 0.035 &&
          !(c.character === "squid" && s.distance < 2.2)
        )
          inputs.push(pitch > 0 ? "w" : "s");
        await keys(inputs);
      }
      await page.waitForTimeout(60);
    }
    await keys([]);
    assert.ok(
      award,
      `Native ${c.type} capture failed: ${c.character}/${c.region}`,
    );
    assert.equal(award.cap, 150);
    assert.equal(award.retired, true);
    assert.equal(award.count, 1);
    if (c.type === "companion") {
      assert.ok(award.minion.meals >= 1);
      assert.equal(award.minionEatingRare, true);
      assert.equal(award.ownerEatingRare, false);
    }
    if (c.type === "sprint")
      assert.ok(Math.min(...trace.map((s) => s.stamina)) > 0);
    await page.screenshot({
      path: `${out}/${c.type}_${c.character}_${c.region}_${c.width}.png`,
    });
    await page.click("#pause");
    const paused = await snapshot();
    await page.waitForTimeout(180);
    assert.equal((await snapshot()).time, paused.time);
    assert.equal((await snapshot()).retired, true);
    report.checks.push({
      ...c,
      initial,
      fixture,
      before,
      award,
      activeCaptureSeconds: award.time - before.time,
      lowestPreAwardStamina: Math.min(
        ...trace.filter((s) => !s.claimed).map((s) => s.stamina),
      ),
      paused,
      trace,
    });
    delete report.pending;
    console.log(
      `Passed ${c.type}/${c.character}/${c.region}: ${(award.time - before.time).toFixed(2)} active seconds`,
    );
  }
  await page.click("#return-menu");
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  assert.equal((await snapshot()).cap, 100);
  assert.equal((await snapshot()).count, 1);
  assert.ok(report.checks.length > 0);
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  report.failure = await snapshot().catch(() => null);
  await page.screenshot({ path: `${out}/failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await keys([]).catch(() => {});
  await browser.close();
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      completed: report.completed,
      cases: report.checks.length,
      error: report.error,
      errors: report.errors,
    }),
  );
}
