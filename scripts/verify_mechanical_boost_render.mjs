import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { selectCharacter } from "./menu_picker_helpers.mjs";
// 原生游戏中采样辉光前的半浮点缓冲与最终画面；用于捕获短暂NaN黑帧，不是性能测量。
const tag = process.env.ABYSSAL_REVIEW_QUALITY || "high",
  out = process.env.ABYSSAL_REVIEW_OUT || ".local/mechanical_boost_render",
  r = { errors: [], quality: tag },
  b = await chromium.launch({ channel: "chrome", headless: false });
await mkdir(out, { recursive: true });
try {
  const width = Number(process.env.ABYSSAL_REVIEW_WIDTH || 960);
  const p = await b.newPage({
    viewport: { width, height: width < 500 ? 844 : 540 },
  });
  p.on("pageerror", (e) => r.errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") r.errors.push(m.text());
  });
  await p.goto(process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188");
  await p.waitForFunction(
    () => window.__ABYSSAL__ && !window.__ABYSSAL__.regionLoading,
  );
  await selectCharacter(p, "mechanical_shark");
  await p.click("#start");
  await p.waitForFunction(
    () =>
      window.__ABYSSAL__.mode === "playing" &&
      !document.body.classList.contains("launching"),
  );
  if (
    (await p.evaluate(() => window.__ABYSSAL__.visuals.enabled)) !==
    (tag === "high")
  )
    await p.click("#quality");
  await p.evaluate(() => {
    const g = window.__ABYSSAL__;
    g.setPosition(0, -100, -600);
    g.player.invulnerable = 999;
    g.player.health = g.player.stamina = 100;
    const renderer = g.renderer,
      original = renderer.render,
      render = g.visuals.render,
      buffers = new Map(),
      stats = (window.probeStats = { frames: [], bad: [], images: [] });
    let currentBad = 0;
    renderer.render = function (scene, camera) {
      original.call(this, scene, camera);
      const target = this.getRenderTarget();
      if (scene === g.scene && target && stats.frames.length < 800) {
        let buffer = buffers.get(target);
        if (!buffer) {
          buffer = new Uint16Array(target.width * target.height * 4);
          buffers.set(target, buffer);
        }
        this.readRenderTargetPixels(
          target,
          0,
          0,
          target.width,
          target.height,
          buffer,
        );
        currentBad = 0;
        for (const v of buffer) if ((v & 0x7c00) === 0x7c00) currentBad++;
        if (currentBad)
          stats.bad.push({
            frame: stats.frames.length,
            count: currentBad,
            boost: g.avatar.userData.pose.mechanical.boost,
          });
      }
    };
    g.visuals.render = function (...args) {
      render.apply(this, args);
      if (stats.frames.length >= 800) return;
      const gl = renderer.getContext(),
        w = gl.drawingBufferWidth,
        h = gl.drawingBufferHeight,
        pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let black = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] < 3 && pixels[i + 1] < 3 && pixels[i + 2] < 3) black++;
      stats.frames.push({
        length: g.player.length,
        boost: g.avatar.userData.pose.mechanical.boost,
        black,
        pixels: w * h,
        bad: currentBad,
      });
      if ((currentBad || black > w * h * 0.9) && stats.images.length < 4)
        stats.images.push(renderer.domElement.toDataURL());
    };
    window.restore = () => {
      renderer.render = original;
      g.visuals.render = render;
    };
  });
  for (const length of [3, 15, 30]) {
    await p.evaluate((length) => {
      const g = window.__ABYSSAL__;
      g.setLength(length);
      g.setPosition(0, -100, -600);
      g.player.stamina = 100;
    }, length);
    await p.waitForTimeout(350);
    await p.keyboard.down("Space");
    await p.keyboard.down("KeyA");
    await p.waitForTimeout(1200);
    await p.keyboard.up("KeyA");
    await p.keyboard.down("KeyW");
    await p.waitForTimeout(1200);
    await p.keyboard.up("KeyW");
    await p.keyboard.up("Space");
    await p.waitForTimeout(600);
  }
  r.stats = await p.evaluate(() => {
    window.restore();
    return window.probeStats;
  });
  for (const [i, data] of r.stats.images.entries())
    await writeFile(
      `${out}/world_${tag}_${i}.png`,
      Buffer.from(data.split(",")[1], "base64"),
    );
  delete r.stats.images;
  console.log({
    frames: r.stats.frames.length,
    bad: r.stats.bad.length,
    maxBad: Math.max(0, ...r.stats.bad.map((v) => v.count)),
    maxBlack: Math.max(0, ...r.stats.frames.map((v) => v.black)),
    errors: r.errors,
  });
  await writeFile(`${out}/world_${tag}.json`, JSON.stringify(r, null, 2));
  assert.deepEqual(r.errors, []);
  assert.ok(r.stats.frames.length > 60);
  assert.equal(
    r.stats.bad.length,
    0,
    "Non-finite HDR values contaminate bloom",
  );
  assert.ok(
    r.stats.frames.every((f) => f.black < f.pixels * 0.9),
    "Full black output frame",
  );
} finally {
  await b.close();
}
