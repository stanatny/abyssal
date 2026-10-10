import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// 使用真实OceanAudio图比较水声与混音，PCM指标不代表主观听感。
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188";
const out =
  process.env.ABYSSAL_AUDIO_REPORT_DIR ||
  ".local/underwater_ambience_revision_20261010/graph";
const baseline = process.env.ABYSSAL_AMBIENT_BASELINE;
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/water_audio_probe", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: "<!doctype html><title>Water audio</title>",
  }),
);
if (baseline) {
  const source = (await readFile(baseline, "utf8")).replaceAll(
    'from "./',
    'from "/src/',
  );
  await page.route("**/water_audio_before.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: source }),
  );
}
try {
  await page.goto(`${base}/water_audio_probe`);
  const cases = await page.evaluate(async (compare) => {
    const after = (await import("/src/audio.js")).OceanAudio;
    const versions = compare
      ? [
          ["before", (await import("/water_audio_before.js")).OceanAudio],
          ["after", after],
        ]
      : [["after", after]];
    const rate = 32000;
    const specs = [
      { name: "shallow", depth: 30 },
      { name: "deep", depth: 800 },
      { name: "chase", depth: 800, danger: 1 },
      { name: "europa", depth: 400, region: "europa" },
      { name: "amazon", depth: 100, region: "amazon" },
      { name: "surface", aboveWater: true },
      { name: "transitions", transition: true },
      { name: "muted", muted: true },
      {
        name: "mixed",
        music: true,
        depth: 400,
        danger: 0.7,
        region: "mariana",
      },
    ];
    function stats(buffer, from = 3, to = buffer.duration) {
      const data = buffer.getChannelData(0),
        start = Math.floor(from * rate),
        end = Math.min(data.length, Math.floor(to * rate));
      let energy = 0,
        peak = 0,
        invalid = 0,
        clipped = 0,
        hi = 0,
        highEnergy = 0,
        jump = 0;
      const alpha = 1 - Math.exp((-2 * Math.PI * 1000) / rate);
      for (let i = start; i < end; i++) {
        const v = data[i];
        if (!Number.isFinite(v)) invalid++;
        energy += v * v;
        peak = Math.max(peak, Math.abs(v));
        if (Math.abs(v) > 0.985) clipped++;
        hi += alpha * (v - hi);
        highEnergy += (v - hi) ** 2;
        if (i) jump = Math.max(jump, Math.abs(v - data[i - 1]));
      }
      return {
        rms: Math.sqrt(energy / (end - start)),
        peak,
        invalid,
        clipped,
        highRms: Math.sqrt(highEnergy / (end - start)),
        maxJump: jump,
      };
    }
    function wav(b) {
      const bytes = new Uint8Array(44 + b.length * 4),
        v = new DataView(bytes.buffer);
      const str = (at, s) =>
        [...s].forEach((c, i) => v.setUint8(at + i, c.charCodeAt(0)));
      str(0, "RIFF");
      v.setUint32(4, bytes.length - 8, true);
      str(8, "WAVEfmt ");
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 2, true);
      v.setUint32(24, rate, true);
      v.setUint32(28, rate * 4, true);
      v.setUint16(32, 4, true);
      v.setUint16(34, 16, true);
      str(36, "data");
      v.setUint32(40, b.length * 4, true);
      for (let c = 0; c < 2; c++)
        for (let i = 0; i < b.length; i++)
          v.setInt16(
            44 + i * 4 + c * 2,
            Math.round(
              Math.max(-1, Math.min(1, b.getChannelData(c)[i])) * 32767,
            ),
            true,
          );
      let s = "";
      for (let i = 0; i < bytes.length; i += 8192)
        s += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(s);
    }
    const reports = [];
    for (const [version, Audio] of versions)
      for (const spec of specs) {
        const ctx = new OfflineAudioContext(2, rate * 15, rate),
          audio = new Audio({ context: ctx });
        audio.start();
        if (spec.music) {
          await audio.prepareZombieSounds();
          await audio.prepareFishSounds();
        }
        audio.reset();
        audio.setRegion(spec.region || "hawaii");
        const original = {
          source: audio.waterSource,
          buffer: audio.waterSource.buffer,
          noise: audio.noiseBuffer,
        };
        const fix = (bus, value) => {
          bus.gain.cancelScheduledValues(ctx.currentTime);
          bus.gain.setValueAtTime(value, ctx.currentTime);
        };
        const tick = (t) => {
          const depth = spec.transition
            ? t < 4
              ? 30
              : t < 8
                ? 800
                : 100
            : spec.depth || 0;
          audio.update(t, spec.danger || 0, {
            depth,
            pursuing: !!spec.danger,
            aboveWater: spec.aboveWater || (spec.transition && t > 10),
          });
          if (!spec.music) {
            fix(audio.music, 0);
            fix(audio.effects, 0);
          }
          if (spec.muted) fix(audio.master, 0);
          if (spec.music && Math.abs(t - 5) < 0.001) audio.summonUndead();
          if (spec.music && Math.abs(t - 7) < 0.001) audio.corpseBurst();
          if (spec.music && Math.abs(t - 7.25) < 0.001) audio.eatFish(2);
        };
        tick(0);
        const tasks = [];
        for (let t = 0.25; t < 15; t += 0.25)
          tasks.push(
            ctx.suspend(t).then(async () => {
              try {
                tick(t);
              } finally {
                await ctx.resume();
              }
            }),
          );
        const rendered = await ctx.startRendering();
        await Promise.all(tasks);
        reports.push({
          version,
          name: spec.name,
          spec,
          signal: stats(rendered),
          full: stats(rendered, 0),
          seams: [6, 12].map((t) => stats(rendered, t - 0.03, t + 0.03)),
          sourceReused: audio.waterSource === original.source,
          bufferReused: audio.waterSource.buffer === original.buffer,
          separateEffectNoise: audio.waterSource.buffer !== original.noise,
          bufferSeconds: original.buffer.duration,
          bufferBytes: original.buffer.length * 4,
          recordedVoices: audio.zombieVoices.size,
          wav: wav(rendered),
        });
      }
    return reports;
  }, Boolean(baseline));
  const comparisons = [];
  for (const d of cases) {
    assert.equal(d.signal.invalid, 0);
    assert.equal(d.full.clipped, 0);
    assert.ok(d.sourceReused && d.bufferReused);
    assert.equal(d.recordedVoices, 0);
    if (d.name === "muted") assert.equal(d.full.rms, 0);
    else assert.ok(d.signal.rms > 0);
    if (d.version === "after") {
      assert.equal(d.bufferSeconds, 6);
      assert.ok(d.separateEffectNoise);
    }
    const bytes = Buffer.from(d.wav, "base64");
    await writeFile(`${out}/${d.version}_${d.name}.wav`, bytes);
    d.sha256 = createHash("sha256").update(bytes).digest("hex");
    delete d.wav;
    const prior = cases.find(
      (c) => c.version === "before" && c.name === d.name,
    );
    if (
      d.version === "after" &&
      prior &&
      !["muted", "mixed", "transitions", "surface"].includes(d.name)
    ) {
      const ratio = d.signal.rms / prior.signal.rms,
        highRatio = d.signal.highRms / prior.signal.highRms;
      comparisons.push({
        name: d.name,
        rmsRatio: ratio,
        db: 20 * Math.log10(ratio),
        highRatio,
      });
      assert.ok(ratio < 0.8 && ratio > 0.15, `${d.name} volume ${ratio}`);
      assert.ok(highRatio < 0.55, `${d.name} upper noise ${highRatio}`);
    }
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/report.json`,
    JSON.stringify(
      {
        completed: true,
        errors,
        comparisons,
        cases,
        listening:
          "Actual game-graph clips for user listening review; no subjective realism or physical speaker measurement inferred.",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      completed: true,
      cases: cases.length,
      comparisons,
      errors,
    }),
  );
} finally {
  await browser.close();
}
