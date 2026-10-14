import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { selectCharacter } from "./menu_picker_helpers.mjs";
// 每轮只在入口设置一次成年身体及选中藏点；全程由键盘游入、拾取、转身和游出。
const out =
  process.env.ABYSSAL_REVIEW_OUT || ".local/expedition_objectives_20261014";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
});
page.setDefaultTimeout(60000);
const report = {
  routes: [],
  errors: [],
  limits: [
    "30 m/entrance/key-choice fixtures; native keyboard throughout each route; normal food, health, collision and ecology",
    "Geometric tests separately cover every 3/16/30 m body and all four mouth directions",
  ],
};
page.on("pageerror", (e) => report.errors.push(e.message));
const pressed = new Set();
async function keys(next) {
  for (const k of [...pressed])
    if (!next.includes(k)) {
      await page.keyboard.up(k);
      pressed.delete(k);
    }
  for (const k of next)
    if (!pressed.has(k)) {
      await page.keyboard.down(k);
      pressed.add(k);
    }
}
const angle = (x) => Math.atan2(Math.sin(x), Math.cos(x));
try {
  await page.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188/");
  await page.waitForFunction(
    () => window.__ABYSSAL__?.guide && !window.__ABYSSAL__.regionLoading,
  );
  await page.locator("header [data-language-select]").selectOption("en");
  await page.click("#region-select");
  await page.click('[data-choice-value="atlantis"]');
  await page.waitForFunction(
    () =>
      !window.__ABYSSAL__.regionLoading &&
      window.__ABYSSAL__.expedition.region.id === "atlantis",
  );
  const sites = await page.evaluate(() =>
    window.__ABYSSAL__.ocean.relic.keyArt.locations.map((s) => ({
      id: s.id,
      route: s.route,
      point: s.point,
    })),
  );
  const subset = process.env.ABYSSAL_ROUTE_IDS?.split(",");
  for (let index = 0; index < sites.length; index++) {
    const site = sites[index];
    if (subset && !subset.includes(site.id)) continue;
    const character = ["orca", "squid", "zombie_shark", "mechanical_shark"][
      index % 4
    ];
    await selectCharacter(page, character);
    await page.click("#start");
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.mouse.move(720, 450);
    await keys(["KeyK"]);
    await page.evaluate(
      ({ site }) => {
        const g = window.__ABYSSAL__,
          [a, b] = site.route;
        g.setLength(30);
        g.objective.keySiteId = site.id;
        g.setPosition(a.x, a.y, a.z);
        g.setFacing(
          Math.atan2(-(b.x - a.x), -(b.z - a.z)),
          Math.max(
            (-Math.PI * 85) / 180,
            Math.min(
              (Math.PI * 85) / 180,
              Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)),
            ),
          ),
        );
      },
      { site },
    );
    const record = {
      id: site.id,
      character,
      checkpoints: [],
      samples: [],
      collected: false,
    };
    report.routes.push(record);
    // 原路线最后一点是藏点，返程仍通过同一公开入口。
    const path = [...site.route.slice(1), ...site.route.slice(0, -1).reverse()];
    for (let j = 0; j < path.length; j++) {
      const target = path[j],
        deadline = Date.now() + 80000;
      let reached = false,
        sampleCount = 0;
      while (Date.now() < deadline) {
        const state = await page.evaluate(() => {
          const g = window.__ABYSSAL__;
          return {
            x: g.position.x,
            y: g.position.y,
            z: g.position.z,
            ...g.controls,
            mode: g.mode,
            health: g.player.health,
            stamina: g.player.stamina,
            hunger: g.player.hunger,
            collected: g.objective.keyCollected,
            stuck: g.lastCollision?.stuck ?? false,
          };
        });
        const dx = target.x - state.x,
          dy = target.y - state.y,
          dz = target.z - state.z,
          horizontal = Math.hypot(dx, dz),
          distance = Math.hypot(horizontal, dy);
        record.collected ||= state.collected;
        if (sampleCount++ % 6 === 0)
          record.samples.push({ checkpoint: j, distance, ...state });
        assert.equal(
          state.mode,
          "playing",
          `${site.id} ended at checkpoint ${j}`,
        );
        if (distance < 3.2) {
          reached = true;
          record.checkpoints.push({ checkpoint: j, ...state });
          break;
        }
        const yaw = horizontal > 2 ? Math.atan2(-dx, -dz) : state.yaw;
        const pitch = Math.max(
          (-Math.PI * 85) / 180,
          Math.min((Math.PI * 85) / 180, Math.atan2(dy, horizontal)),
        );
        const yd = angle(yaw - state.yaw),
          pd = pitch - state.pitch;
        const next = [];
        if (Math.abs(yd) > 0.045) next.push(yd > 0 ? "KeyA" : "KeyD");
        if (Math.abs(pd) > 0.045) next.push(pd > 0 ? "KeyW" : "KeyS");
        const turn = Math.abs(yd) * Math.cos(pitch) + Math.abs(pd);
        if (distance < 8 || turn > 0.35) next.push("KeyK");
        else if (distance > 25 && turn < 0.16 && state.stamina > 35)
          next.push("Space");
        await keys(next);
        await page.waitForTimeout(65);
      }
      assert.ok(
        reached,
        `${site.id} checkpoint ${j} not reachable with native steering`,
      );
      if (j === site.route.length - 2)
        await page.screenshot({ path: `${out}/key_${site.id}_30m.png` });
    }
    assert.equal(record.collected, true, `${site.id} native pickup missed`);
    await keys([]);
    console.log(
      JSON.stringify({
        id: site.id,
        character,
        collected: record.collected,
        health: record.checkpoints.at(-1).health,
      }),
    );
    await page.click("#pause");
    await page.click("#return-menu");
    await writeFile(
      `${out}/native_key_routes.json`,
      JSON.stringify(report, null, 2),
    );
  }
  assert.deepEqual(report.errors, []);
} catch (error) {
  report.failure = error.stack;
  await page.screenshot({ path: `${out}/key_route_failure.png` });
  throw error;
} finally {
  await keys([]);
  await writeFile(
    `${out}/native_key_routes.json`,
    JSON.stringify(report, null, 2),
  );
  await browser.close();
}
