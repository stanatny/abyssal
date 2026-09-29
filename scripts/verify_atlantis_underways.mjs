import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179/";
const directory = ".local/atlantis_underways";
await mkdir(directory, { recursive: true });
const report = {
  baseUrl,
  screenshots: [],
  checks: [],
  errors: [],
  limits: [
    "Controlled positions and character lengths; actual renderer, game lighting, fog and materials.",
    "Free-camera images pause play and hide the HUD/avatar; follow-camera images use active gameplay.",
    "Viewport emulation is not physical-phone acceptance or a natural full-session playthrough.",
  ],
};
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  reducedMotion: "reduce",
});
page.on("pageerror", (error) => report.errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") report.errors.push(message.text());
});
async function frames(count = 8) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        const frame = () => {
          if (--count <= 0) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      }),
    count,
  );
}
async function capture(name, kind) {
  const path = `${directory}/${name}.png`;
  await page.screenshot({ path });
  report.screenshots.push({ path, kind });
}
async function stage(position, length = 12) {
  if (await page.evaluate(() => window.__ABYSSAL__.mode === "paused"))
    await page.keyboard.press("Escape");
  await page.evaluate(
    ({ position, length }) => {
      const game = window.__ABYSSAL__;
      delete document.body.dataset.underwayAudit;
      game.avatar.visible = true;
      game.player.health = 100;
      game.player.hunger = 100;
      game.setLength(length);
      game.setPosition(...position);
      game.setFacing(0, 0);
    },
    { position, length },
  );
  await frames(12);
}
try {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__ABYSSAL__?.guide);
  await page.locator("header [data-language-select]").selectOption("en");
  await page.locator("#region-select").click();
  await page.locator('[data-choice-value="atlantis"]').click();
  await frames();
  const sites = await page.evaluate(async () => {
    const game = window.__ABYSSAL__,
      u = game.ocean.city.underways;
    if (!u) throw new Error("Integrated city.underways is unavailable");
    const { bodyRadius, resolveMotion } = await import("/src/collision.js");
    const checks = [];
    for (const site of u.records)
      for (const route of [
        site.lowerRoute,
        site.upperRoute,
        site.verticalRoute,
      ].filter(Boolean))
        for (const reversed of [false, true]) {
          const [start, end] = reversed ? [...route].reverse() : route;
          const distance = Math.hypot(
              end.x - start.x,
              end.y - start.y,
              end.z - start.z,
            ),
            forward = {
              x: (end.x - start.x) / distance,
              y: (end.y - start.y) / distance,
              z: (end.z - start.z) / distance,
            };
          let current = { ...start };
          for (let i = 1; i <= 120; i++) {
            const desired = {
              x: start.x + ((end.x - start.x) * i) / 120,
              y: start.y + ((end.y - start.y) * i) / 120,
              z: start.z + ((end.z - start.z) * i) / 120,
            };
            const result = resolveMotion(current, desired, {
              colliders: game.ocean.colliders,
              length: 30,
              radius: bodyRadius(30),
              forward,
            });
            if (result.blocked || result.stuck)
              throw new Error(
                `${site.id} integrated route blocked: ${JSON.stringify(result.contacts.map((c) => c.collider.kind))}`,
              );
            current = result.position;
          }
          checks.push({ site: site.id, reversed, end: current });
        }
    return {
      stats: u.stats,
      checks,
      records: u.records.map(({ id, x, z, y, lowerY, upperY }) => ({
        id,
        x,
        z,
        y,
        lowerY,
        upperY,
      })),
    };
  });
  report.checks.push({
    name: "Integrated 30m forward/reverse continuous movement on both levels and vertical well",
    ...sites,
  });
  await page.locator("#start").click();
  await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
  await page.addStyleTag({
    content:
      'body[data-underway-audit="free"] :is(#hud,#overlay,header,#target,#notification,#touch-controls,#sonar-markers){visibility:hidden!important}',
  });
  for (const site of sites.records) {
    for (const [suffix, position, target] of [
      [
        "overview",
        [site.x + 93, Math.min(-8, site.y + 53), site.z + 102],
        [site.x, site.y - 6, site.z],
      ],
      [
        "lower_close",
        [site.x + 13, site.lowerY + 5, site.z + 66],
        [site.x, site.lowerY + 8, site.z - 22],
      ],
      [
        "upper_close",
        [site.x + 7, site.upperY + 3, site.z + 60],
        [site.x, site.upperY + 5, site.z - 18],
      ],
    ]) {
      await stage(position, 3);
      await page.keyboard.press("Escape");
      await page.evaluate(
        ({ position, target }) => {
          const g = window.__ABYSSAL__;
          document.body.dataset.underwayAudit = "free";
          g.avatar.visible = false;
          g.camera.position.set(...position);
          g.camera.up.set(0, 1, 0);
          g.camera.lookAt(...target);
          g.camera.updateMatrixWorld(true);
          g.visuals.render();
        },
        { position, target },
      );
      await frames(2);
      await capture(
        `${site.id}_${suffix}`,
        "Controlled free camera, actual lighting and fog",
      );
    }
    for (const [width, height] of [
      [1440, 900],
      [390, 667],
    ]) {
      await page.setViewportSize({ width, height });
      await stage([site.x, site.lowerY, site.z + 28], 30);
      await capture(
        `${site.id}_${width}_lower_play`,
        "Active follow camera, staged 30m character in lower gallery",
      );
      await stage([site.x, site.upperY, site.z + 28], 30);
      await capture(
        `${site.id}_${width}_upper_play`,
        "Active follow camera, staged 30m character in upper hall",
      );
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  report.measurement = await page.evaluate(() => ({
    render: { ...window.__ABYSSAL__.renderer.info.render },
    memory: { ...window.__ABYSSAL__.renderer.info.memory },
  }));
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(
  JSON.stringify(
    {
      checks: report.checks.length,
      screenshots: report.screenshots.length,
      errors: report.errors,
    },
    null,
    2,
  ),
);
