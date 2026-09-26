import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// 在浏览器中真正渲染音频，输出被忽略目录中的试听文件与测量结果。
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/audio_probe", (route) =>
  route.fulfill({
    contentType: "text/html",
    body: "<!doctype html><title>Audio verification</title>",
  }),
);
try {
  await page.goto(`${baseUrl}/audio_probe`);
  const result = await page.evaluate(async () => {
    const { OceanAudio } = await import("/src/audio.js");
    const duration = 18;
    const sampleRate = 22050;
    const context = new OfflineAudioContext(
      2,
      sampleRate * duration,
      sampleRate,
    );
    const audio = new OceanAudio({ context });
    audio.start();
    const checks = [];
    const modes = ["calm", "chase", "boss"];
    for (let index = 1; index < duration / 0.15; index += 1) {
      const at = index * 0.15;
      context.suspend(at).then(() => {
        const section = Math.min(2, Math.floor(at / 6));
        audio.update(at, section === 0 ? 0 : section === 1 ? 0.9 : 1, {
          boss: section === 2,
          depth: section * 110,
        });
        context.resume();
      });
    }
    const rendered = await context.startRendering();
    const left = rendered.getChannelData(0);
    const right = rendered.getChannelData(1);
    for (let section = 0; section < 3; section += 1) {
      const from = Math.floor((section * 6 + 1.5) * sampleRate);
      const to = Math.floor((section * 6 + 5.8) * sampleRate);
      let sum = 0;
      let peak = 0;
      for (let sample = from; sample < to; sample += 1) {
        sum += left[sample] ** 2;
        peak = Math.max(peak, Math.abs(left[sample]));
      }
      checks.push({
        mode: modes[section],
        rms: Math.sqrt(sum / (to - from)),
        peak,
      });
    }
    const pcm = new Uint8Array(44 + left.length * 4);
    const view = new DataView(pcm.buffer);
    const text = (offset, value) =>
      [...value].forEach((char, index) =>
        view.setUint8(offset + index, char.charCodeAt(0)),
      );
    text(0, "RIFF");
    view.setUint32(4, pcm.length - 8, true);
    text(8, "WAVE");
    text(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, pcm.length - 44, true);
    for (let index = 0; index < left.length; index += 1) {
      view.setInt16(
        44 + index * 4,
        Math.round(Math.max(-1, Math.min(1, left[index])) * 32767),
        true,
      );
      view.setInt16(
        46 + index * 4,
        Math.round(Math.max(-1, Math.min(1, right[index])) * 32767),
        true,
      );
    }
    let binary = "";
    for (let offset = 0; offset < pcm.length; offset += 8192)
      binary += String.fromCharCode(...pcm.subarray(offset, offset + 8192));

    // 单独验证首次开关能激活、重复开始复用图，以及暂停时钟。
    const live = new OceanAudio();
    const firstToggle = live.toggle();
    const initialContext = live.context;
    const initialWater = live.waterSource;
    live.start();
    live.start();
    await new Promise((resolve) => setTimeout(resolve, 90));
    live.setPaused(true);
    await new Promise((resolve) => setTimeout(resolve, 70));
    const pausedAt = live.context.currentTime;
    await new Promise((resolve) => setTimeout(resolve, 70));
    const pausedClock = live.context.currentTime === pausedAt;
    live.setPaused(false);
    live.pickup("stamina");
    live.breach();
    live.splash();
    live.bossAttack("kraken");
    live.victory();
    const liveChecks = {
      firstToggle,
      graphReused:
        live.context === initialContext && live.waterSource === initialWater,
      pausedClock,
    };
    await live.context.close();
    return { checks, liveChecks, duration, sampleRate, wav: btoa(binary) };
  });
  for (const check of result.checks) {
    assert.ok(check.rms > 0.018, `${check.mode} is too quiet: ${check.rms}`);
    assert.ok(check.peak < 0.97, `${check.mode} is clipping: ${check.peak}`);
  }
  assert.ok(result.liveChecks.firstToggle);
  assert.ok(result.liveChecks.graphReused);
  assert.ok(result.liveChecks.pausedClock);
  assert.deepEqual(errors, []);
  await mkdir(".local", { recursive: true });
  await writeFile(
    ".local/audio_validation.wav",
    Buffer.from(result.wav, "base64"),
  );
  delete result.wav;
  await writeFile(
    ".local/audio_validation.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
