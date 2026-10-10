import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// 真实Web Audio离线音图验声；指标不能代替主观听感，导出文件供试听。
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188";
const out =
  process.env.ABYSSAL_AUDIO_REPORT_DIR ||
  ".local/zombie_blast_audio_revision_20261010/graph";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/zombie_audio_probe", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: "<!doctype html><title>Zombie audio graph</title>",
  }),
);
try {
  await page.goto(`${base}/zombie_audio_probe`);
  const results = await page.evaluate(async () => {
    const { OceanAudio } = await import("/src/audio.js");
    const rate = 32000;
    const specs = [
      {
        name: "fission",
        duration: 5,
        events: [{ at: 0.1, kind: "summonUndead" }],
      },
      {
        name: "corpse_burst",
        duration: 5,
        events: [{ at: 0.1, kind: "corpseBurst" }],
      },
      {
        name: "deep_pair",
        duration: 6,
        depth: 650,
        events: [
          { at: 0.1, kind: "summonUndead" },
          { at: 1.6, kind: "corpseBurst" },
        ],
      },
      {
        name: "music_overlap",
        duration: 7,
        music: true,
        events: [
          { at: 0.1, kind: "summonUndead" },
          { at: 1.4, kind: "corpseBurst" },
          { at: 1.5, kind: "summonUndead" },
          { at: 1.55, kind: "eatFish" },
          { at: 2.9, kind: "corpseBurst" },
          { at: 3.1, kind: "summonUndead" },
          { at: 4.5, kind: "corpseBurst" },
        ],
      },
      {
        name: "muted",
        duration: 3,
        muted: true,
        events: [
          { at: 0.1, kind: "summonUndead" },
          { at: 1.6, kind: "corpseBurst" },
        ],
      },
    ];
    const reports = [];
    function stats(b, from = 0, to = b.duration) {
      let sum = 0,
        peak = 0,
        invalid = 0,
        clipped = 0;
      const first = Math.floor(from * rate),
        last = Math.min(b.length, Math.floor(to * rate));
      for (let c = 0; c < b.numberOfChannels; c++) {
        const a = b.getChannelData(c);
        for (let i = first; i < last; i++) {
          const v = a[i];
          if (!Number.isFinite(v)) invalid++;
          sum += v * v;
          peak = Math.max(peak, Math.abs(v));
          if (Math.abs(v) >= 0.985) clipped++;
        }
      }
      return {
        rms: Math.sqrt(sum / Math.max(1, (last - first) * b.numberOfChannels)),
        peak,
        invalid,
        clipped,
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
      for (let c = 0; c < 2; c++) {
        const a = b.getChannelData(c);
        for (let i = 0; i < a.length; i++)
          v.setInt16(
            44 + i * 4 + c * 2,
            Math.round(Math.max(-1, Math.min(1, a[i])) * 32767),
            true,
          );
      }
      let s = "";
      for (let i = 0; i < bytes.length; i += 8192)
        s += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(s);
    }
    for (const spec of specs) {
      const ctx = new OfflineAudioContext(
          2,
          Math.ceil(spec.duration * rate),
          rate,
        ),
        audio = new OceanAudio({ context: ctx });
      audio.start();
      if (!(await audio.prepareZombieSounds()))
        throw new Error("Zombie sample decode failed");
      if (!(await audio.prepareFishSounds()))
        throw new Error("Fish sample decode failed");
      audio.reset();
      const set = (node, x) => {
        node.gain.cancelScheduledValues(0);
        node.gain.setValueAtTime(x, 0);
      };
      if (!spec.music) {
        set(audio.music, 0);
        set(audio.waterGain, 0);
        set(audio.currentGain, 0);
      }
      if (spec.muted) {
        audio.enabled = false;
        set(audio.master, 0);
      }
      let maxSamples = 0,
        started = [];
      const play = audio.playZombieSample.bind(audio);
      audio.playZombieSample = (kind, at) => {
        const ok = play(kind, at);
        if (ok) started.push(kind);
        return ok;
      };
      const times = new Set(spec.events.map((e) => e.at));
      if (spec.music)
        for (let t = 0.125; t < spec.duration - 0.02; t += 0.125) times.add(t);
      const tasks = [...times]
        .sort((a, b) => a - b)
        .map((at) =>
          ctx.suspend(at).then(async () => {
            try {
              audio.update(at, spec.music ? 0.8 : 0, {
                depth: spec.depth || 20,
                pursuing: !!spec.music,
              });
              // 音效单独导出仍使用真实深度滤波，但隔离持续环境水声。
              if (!spec.music) {
                for (const node of [
                  audio.music,
                  audio.waterGain,
                  audio.currentGain,
                ]) {
                  node.gain.cancelScheduledValues(ctx.currentTime);
                  node.gain.setValueAtTime(0, ctx.currentTime);
                }
              }
              for (const e of spec.events)
                if (Math.abs(e.at - at) < 1e-6) audio[e.kind]();
              maxSamples = Math.max(maxSamples, audio.zombieVoices.size);
            } finally {
              await ctx.resume();
            }
          }),
        );
      const buffer = await ctx.startRendering();
      await Promise.all(tasks);
      reports.push({
        name: spec.name,
        spec,
        signal: stats(buffer),
        onset: stats(buffer, 0.1, 0.35),
        tail: stats(buffer, spec.duration - 0.4),
        maxSamples,
        remainingSamples: audio.zombieVoices.size,
        decoded: audio.zombieBuffers.size,
        started,
        wav: wav(buffer),
      });
    }
    return reports;
  });
  await writeFile(
    `${out}/measurement_pilot.json`,
    JSON.stringify(
      results.map(({ wav, ...d }) => d),
      null,
      2,
    ),
  );
  for (const d of results) {
    assert.equal(d.signal.invalid, 0);
    assert.equal(d.signal.clipped, 0);
    assert.ok(d.maxSamples <= 2);
    assert.equal(d.remainingSamples, 0);
    assert.equal(d.decoded, 2);
    if (d.name === "muted") {
      assert.equal(d.signal.rms, 0);
      assert.equal(d.started.length, 0);
    } else assert.ok(d.signal.rms > 0.008);
    if (!d.spec.music) assert.ok(d.tail.rms < 0.001);
    const bytes = Buffer.from(d.wav, "base64");
    await writeFile(`${out}/${d.name}.wav`, bytes);
    d.sha256 = createHash("sha256").update(bytes).digest("hex");
    d.bytes = bytes.length;
    delete d.wav;
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/report.json`,
    JSON.stringify(
      {
        completed: true,
        errors,
        cases: results,
        listening:
          "Game-graph clips delivered for user listening review; no subjective or physical-phone speaker acceptance claimed.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results.map(({ spec, ...d }) => d)));
} finally {
  await browser.close();
}
