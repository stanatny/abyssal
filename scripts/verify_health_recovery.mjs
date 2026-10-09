import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";
const out = process.env.ABYSSAL_HEALTH_OUT || ".local/health_recovery_checks";
await mkdir(out, { recursive: true });
const report = {
  checks: [],
  errors: [],
  limits: [
    "Populated moving ecology; native keyboard casts/captures. Legal player viewing positions/facing and takeDamage fixtures isolate recovery. No NPC, stock, size, buff, camera, light or direct vital assignment. Damage fixture uses the real resistance/invulnerability rule. Not a natural full expedition or physical phone test.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(25000);
page.on("pageerror", (e) => report.errors.push(e.message));
let held = new Set();
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
async function keys(next) {
  const set = new Set(next);
  for (const k of held) if (!set.has(k)) await page.keyboard.up(k);
  for (const k of set) if (!held.has(k)) await page.keyboard.down(k);
  held = set;
}
async function snap() {
  return page.evaluate(() => {
    const g = window.__ABYSSAL__;
    return {
      mode: g.mode,
      time: g.player.elapsed,
      health: g.player.health,
      hunger: g.player.hunger,
      pending: g.player.mealRecovery,
      layers: g.player.recoveryMeals,
      rate: document.querySelector("#recovery-rate").textContent,
      stacks: Number(
        document.querySelector("#recovery-count").textContent.split("/")[0],
      ),
      lastMeal: g.player.lastMeal,
      eaten: g.player.eaten,
      cap: g.player.vitalCap,
      length: g.player.length,
      position: g.position.toArray(),
      yaw: g.controls.yaw,
      pitch: g.controls.pitch,
      minion: g.minion.snapshot(),
      hint: document.querySelector("#feeding-mode").textContent,
      notice: document.querySelector("#notification").textContent,
    };
  });
}
async function start(c) {
  await keys([]);
  const mode = await page.evaluate(() => window.__ABYSSAL__.mode);
  if (mode === "playing") await page.click("#pause");
  if (mode === "paused" || mode === "playing") await page.click("#return-menu");
  await page.setViewportSize({
    width: c.width,
    height: c.width < 500 ? 740 : 900,
  });
  await page.locator("[data-language-select]").selectOption(c.locale);
  if (
    (await page.locator("#region-select").evaluate((e) => e.value)) !== c.region
  ) {
    await page.click("#region-select");
    await page.click(`#expedition-picker [data-choice-value="${c.region}"]`);
  }
  await page.waitForFunction(() => !window.__ABYSSAL__.regionLoading);
  if (
    (await page.locator("#character-select").evaluate((e) => e.value)) !==
    c.character
  )
    await selectCharacter(page, c.character);
  await page.click("#open-guide");
  await page.locator("#guide-region").selectOption(c.region);
  await page.click('#ocean-guide [data-category="player"]');
  await page.click(`.guide-entry[data-kind="${c.character}"]`);
  const text = await page.locator(".guide-info").innerText();
  assert.match(
    text,
    c.locale === "en" ? /recover 0.5 health per second/ : /每秒缓慢恢复0.5生命/,
  );
  assert.match(text, c.locale === "en" ? /no instant healing/ : /不会立即回血/);
  if (c.locale === "en") assert.ok(!/[\u3400-\u9fff]/.test(text));
  await page.click("#ocean-guide .guide-close");
  await page.click("#start");
  await page.waitForFunction(
    () =>
      window.__ABYSSAL__.mode === "playing" &&
      !document.body.classList.contains("launching"),
  );
  await page.click("#pause");
  return text;
}
async function clearStation() {
  return page.evaluate(async () => {
    const g = window.__ABYSSAL__,
      { seabedHeight } = await import("/src/ocean.js"),
      { isPositionBlocked } = await import("/src/collision.js");
    const floor = g.ocean.heightAt || seabedHeight;
    for (const x of [280, -280, 220, -220, 160, -160])
      for (const z of [-200, -300, -400, -100]) {
        const y = Math.min(
            -25,
            Math.max(-90, floor(x, z) + g.player.length * 0.5 + 5),
          ),
          p = { x, y, z };
        if (
          isPositionBlocked(p, {
            forward: { x: 0, y: 0, z: -1 },
            length: g.player.length,
            radius: g.player.length * 0.13,
            colliders: g.ocean.colliders,
          })
        )
          continue;
        if (
          g.entities.some(
            (e) =>
              e.hiddenFor <= 0 &&
              e.mesh.position.distanceTo(p) < 45 + e.species.length,
          )
        )
          continue;
        g.setFacing(0);
        g.setPosition(x, y, z);
        return p;
      }
    throw Error("No clear legal baseline viewing station");
  });
}
async function foodStation(c) {
  return page.evaluate(async (c) => {
    const g = window.__ABYSSAL__,
      { seabedHeight } = await import("/src/ocean.js"),
      { isPositionBlocked, castSegment } = await import("/src/collision.js");
    const floor = g.ocean.heightAt || seabedHeight,
      rare = g.entities.find((e) => e.species.category === "rare");
    const candidates = g.entities
      .filter(
        (e) =>
          e.hiddenFor <= 0 &&
          !e.species.predator &&
          !e.species.flying &&
          !e.species.groundBound &&
          e.species.category !== "rare" &&
          e.species.tier !== 3 &&
          !e.species.vehicle &&
          e.species.length <
            (c.type === "companion" ? g.player.length - 5 : g.player.length) &&
          e.species.nutrition >= 8,
      )
      .sort((a, b) => b.species.nutrition - a.species.nutrition);
    for (const e of candidates)
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8,
          d = c.type === "mouth" ? 20 : 26,
          p = e.mesh.position,
          q = { x: p.x + Math.sin(a) * d, y: p.y, z: p.z + Math.cos(a) * d },
          w = rare.species.worldBounds;
        if (
          q.x < w.minX + 12 ||
          q.x > w.maxX - 12 ||
          q.z < w.minZ + 12 ||
          q.z > w.maxZ - 12 ||
          q.y < floor(q.x, q.z) + g.player.length * 0.4 + 2 ||
          rare.mesh.position.distanceTo(q) < 120
        )
          continue;
        const dx = p.x - q.x,
          dz = p.z - q.z,
          yaw = Math.atan2(-dx, -dz),
          forward = { x: -Math.sin(yaw), y: 0, z: -Math.cos(yaw) };
        if (
          isPositionBlocked(q, {
            forward,
            length: g.player.length,
            radius: g.player.length * 0.13,
            colliders: g.ocean.colliders,
          }) ||
          castSegment(q, p, g.ocean.colliders) ||
          g.entities.some(
            (n) =>
              n.hiddenFor <= 0 &&
              n.species.predator &&
              n.species.length > g.player.length - 5 &&
              n.mesh.position.distanceTo(q) < 50,
          )
        )
          continue;
        g.setFacing(yaw);
        g.setPosition(q.x, q.y, q.z);
        return {
          kind: e.species.kind,
          length: e.species.length,
          nutrition: e.species.nutrition,
          index: g.entities.indexOf(e),
          position: q,
        };
      }
    throw Error("No legal real-food viewing fixture");
  }, c);
}
async function target(index) {
  return page.evaluate((index) => {
    const g = window.__ABYSSAL__,
      e = g.entities[index],
      d = e.mesh.position.clone().sub(g.position);
    return {
      hidden: e.hiddenFor > 0,
      distance: d.length(),
      yaw: Math.atan2(-d.x, -d.z),
      pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)),
    };
  }, index);
}
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188");
  await page.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  const cases = [
    {
      type: "mouth",
      character: "orca",
      region: "hawaii",
      locale: "en",
      width: 1440,
    },
    {
      type: "mouth",
      character: "squid",
      region: "hawaii",
      locale: "zh-CN",
      width: 390,
    },
    {
      type: "torpedo",
      character: "mechanical_shark",
      region: "hawaii",
      locale: "en",
      width: 1440,
    },
    {
      type: "companion",
      character: "zombie_shark",
      region: "mariana",
      locale: "zh-CN",
      width: 390,
    },
  ].filter(
    (c) =>
      !process.env.ABYSSAL_HEALTH_CASE ||
      c.character === process.env.ABYSSAL_HEALTH_CASE,
  );
  for (const c of cases) {
    const guide = await start(c);
    // 正常出发可能已吃过鱼：让真实旧层在空水域自行到期，不写入效果或生命状态。
    for (let warm = 0; (await snap()).layers.length && warm < 12; warm++) {
      await clearStation();
      const t = (await snap()).time;
      await page.click("#resume");
      await keys(["k"]);
      await page.waitForFunction(
        (t) => window.__ABYSSAL__.player.elapsed - t >= 1,
        t,
      );
      await keys([]);
      await page.click("#pause");
    }
    assert.equal((await snap()).layers.length, 0);
    const station = await clearStation();
    await page.evaluate(() => window.__ABYSSAL__.takeDamage(30));
    const damaged = await snap();
    assert.equal(damaged.pending, 0);
    await page.click("#resume");
    await keys(["k"]);
    await page.waitForFunction(
      (start) => window.__ABYSSAL__.player.elapsed - start >= 3,
      damaged.time,
    );
    await keys([]);
    await page.click("#pause");
    const passive = await snap();
    assert.equal(passive.eaten, damaged.eaten);
    assert.ok(
      Math.abs(
        passive.health - damaged.health - 0.5 * (passive.time - damaged.time),
      ) < 0.03,
    );
    assert.match(passive.hint, c.locale === "en" ? /Slow regen/ : /缓慢恢复/);
    const fixture = await foodStation(c),
      before = await snap(),
      trace = [];
    report.pending = {
      ...c,
      guide,
      station,
      damaged,
      passive,
      fixture,
      before,
      trace,
    };
    await page.click("#resume");
    await keys(c.type === "mouth" ? ["Space"] : ["k"]);
    if (c.type !== "mouth") await page.keyboard.press("j");
    let ate;
    for (let i = 0; i < 150; i++) {
      const s = await snap();
      trace.push(s);
      assert.equal(s.mode, "playing");
      if (
        s.layers.length > 0 &&
        s.eaten > before.eaten &&
        (c.type !== "companion" || s.minion.meals > 0)
      ) {
        ate = s;
        break;
      }
      if (s.time - before.time > 10) break;
      if (c.type === "mouth") {
        const t = await target(fixture.index),
          yaw = wrap(t.yaw - s.yaw),
          pitch = t.pitch - s.pitch,
          next =
            t.distance > 3 && Math.abs(yaw) < 0.4 && Math.abs(pitch) < 0.4
              ? ["Space"]
              : [];
        if (Math.abs(yaw) > 0.04) next.push(yaw > 0 ? "a" : "d");
        if (Math.abs(pitch) > 0.04) next.push(pitch > 0 ? "w" : "s");
        await keys(next);
      }
      await page.waitForTimeout(60);
    }
    assert.ok(ate, `${c.type} actual food did not add recovery credit`);
    assert.equal(ate.lastMeal.healed, 0);
    assert.ok(ate.layers.length > before.layers.length);
    assert.ok(ate.layers.length <= 3);
    assert.ok(ate.lastMeal.recovery >= 0);
    let prior = before;
    for (const s of trace) {
      assert.ok(
        s.health - prior.health <= 6 * (s.time - prior.time) + 0.05,
        "Instant healing jump",
      );
      prior = s;
    }
    // 仆从会继续捕食：隔离到合法空水域后测当前层速率，保留正常仆从/食物行为。
    await keys([]);
    await page.click("#pause");
    await clearStation();
    await page.click("#resume");
    await keys(["k"]);
    const settle = (await snap()).time;
    await page.waitForFunction(
      (t) => window.__ABYSSAL__.player.elapsed - t >= 0.05,
      settle,
    );
    const followStart = await snap();
    await page.waitForFunction(
      (start) => window.__ABYSSAL__.player.elapsed - start >= 1.5,
      followStart.time,
    );
    const accelerated = await snap();
    assert.ok(
      Math.abs(
        accelerated.health -
          followStart.health -
          followStart.layers.length * 2 * (accelerated.time - followStart.time),
      ) < 0.04,
    );
    assert.match(
      accelerated.hint,
      c.locale === "en" ? /Fed regen/ : /进食恢复/,
    );
    await page.screenshot({
      path: `${out}/${c.type}_${c.character}_${c.width}.png`,
    });
    await keys([]);
    await page.click("#pause");
    const paused = await snap();
    await page.waitForTimeout(300);
    const frozen = await snap();
    assert.equal(frozen.health, paused.health);
    assert.equal(frozen.pending, paused.pending);
    assert.deepEqual(frozen.layers, paused.layers);
    assert.equal(frozen.time, paused.time);
    report.checks.push({
      ...c,
      guide,
      station,
      damaged,
      passive,
      fixture,
      before,
      ate,
      accelerated,
      paused,
      trace,
    });
    delete report.pending;
    console.log(`Passed ${c.type}/${c.character}`);
  }
  await page.click("#return-menu");
  await page.click("#start");
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  assert.equal((await snap()).pending, 0);
  assert.equal((await snap()).layers.length, 0);
  assert.equal((await snap()).health, 100);
  assert.deepEqual(report.errors, []);
  report.completed = true;
} catch (e) {
  report.error = e.stack;
  report.failure = await snap().catch(() => null);
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
