import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

// 实际Web Audio图测量，离线样本不是玩家实战录像，也不代表主观听感验收。
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188";
const out =
  process.env.ABYSSAL_AUDIO_REPORT_DIR ||
  ".local/combat_audio_integration_20261020/graph";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/combat_audio_probe", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: "<!doctype html><title>Combat audio graph</title>",
  }),
);
try {
  await page.goto(`${base}/combat_audio_probe`);
  const results = await page.evaluate(async () => {
    const { OceanAudio } = await import("/src/audio.js");
    const rate = 48000;
    const specs = [
      ...["ordinary", "yellow", "hurt", "lord"].map((kind) => ({
        name: kind,
        duration: 2,
        events: [{ at: 0.125, kind }],
      })),
      {
        name: "dense_meals",
        duration: 4,
        events: Array.from({ length: 22 }, (_, i) => ({
          at: 0.125 + i * 0.1,
          kind: i % 3 === 0 ? "yellow" : "ordinary",
        })),
      },
      {
        name: "priority_mix",
        duration: 6,
        music: true,
        events: [
          ...Array.from({ length: 18 }, (_, i) => ({
            at: 0.125 + i * 0.125,
            kind: i % 3 === 0 ? "yellow" : "ordinary",
          })),
          { at: 0.25, kind: "hurt" },
          { at: 0.375, kind: "lord" },
          { at: 0.625, kind: "hurt" },
          { at: 0.875, kind: "lord" },
        ],
      },
      {
        name: "deep_mix",
        duration: 4,
        music: true,
        depth: 1800,
        events: [
          { at: 0.125, kind: "ordinary" },
          { at: 0.75, kind: "yellow" },
          { at: 1.5, kind: "hurt" },
          { at: 2.25, kind: "lord" },
        ],
      },
      {
        name: "pause",
        duration: 2,
        events: [
          { at: 0.125, kind: "lord" },
          { at: 0.25, kind: "pause" },
          { at: 0.375, kind: "hurt" },
          { at: 0.75, kind: "resume" },
        ],
      },
      {
        name: "mute",
        duration: 2,
        events: [
          { at: 0.125, kind: "hurt" },
          { at: 0.25, kind: "mute" },
          { at: 0.375, kind: "lord" },
          { at: 0.75, kind: "unmute" },
        ],
      },
      {
        name: "reset",
        duration: 2,
        events: [
          { at: 0.125, kind: "lord" },
          { at: 0.25, kind: "reset" },
        ],
      },
    ];
    function stats(b, from = 0, to = b.duration) {
      let peak = 0,
        sum = 0,
        invalid = 0,
        clipped = 0,
        n = 0;
      for (let c = 0; c < b.numberOfChannels; c++) {
        const a = b.getChannelData(c);
        for (
          let i = Math.floor(from * rate);
          i < Math.min(a.length, to * rate);
          i++
        ) {
          const x = a[i];
          if (!Number.isFinite(x)) invalid++;
          if (Math.abs(x) >= 0.985) clipped++;
          peak = Math.max(peak, Math.abs(x));
          sum += x * x;
          n++;
        }
      }
      return { peak, rms: Math.sqrt(sum / Math.max(1, n)), invalid, clipped };
    }
    function wav(b) {
      const bytes = new Uint8Array(44 + b.length * 4),
        v = new DataView(bytes.buffer);
      const str = (i, s) =>
        [...s].forEach((c, j) => v.setUint8(i + j, c.charCodeAt(0)));
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
    const reports = [];
    for (const spec of specs) {
      const ctx = new OfflineAudioContext(2, spec.duration * rate, rate),
        audio = new OceanAudio({ context: ctx });
      audio.start();
      if (!(await audio.prepareCombatSounds()))
        throw new Error("Combat decode failed");
      audio.reset();
      const set = (node, x) => {
        node.gain.cancelScheduledValues(ctx.currentTime);
        node.gain.setValueAtTime(x, ctx.currentTime);
      };
      const silence = () => {
        if (!spec.music)
          for (const node of [audio.music, audio.waterGain, audio.currentGain])
            set(node, 0);
      };
      silence();
      let maxFeeding = 0,
        maxImpacts = 0;
      const played = [];
      const times = new Set(spec.events.map((e) => e.at));
      if (spec.music)
        for (let t = 0.125; t < spec.duration - 0.02; t += 0.125) times.add(t);
      const tasks = [...times]
        .sort((a, b) => a - b)
        .map((at) =>
          ctx.suspend(at).then(async () => {
            try {
              audio.update(at, 0.65, {
                depth: spec.depth || 25,
                pursuing: !!spec.music,
              });
              silence();
              for (const e of spec.events.filter(
                (e) => Math.abs(e.at - at) < 1e-6,
              )) {
                const before = new Set(audio.voices);
                if (e.kind === "ordinary" || e.kind === "yellow")
                  audio.eatFish(1, e.kind);
                else if (e.kind === "hurt") audio.bitten();
                else if (e.kind === "lord") audio.biteLord();
                else if (e.kind === "pause") audio.setPaused(true);
                else if (e.kind === "resume") audio.setPaused(false);
                else if (e.kind === "mute" || e.kind === "unmute")
                  audio.toggle();
                else if (e.kind === "reset") {
                  audio.reset();
                  silence();
                }
                const newVoices = [...audio.voices].filter(
                  (v) => !before.has(v),
                );
                played.push({
                  kind: e.kind,
                  at,
                  started: newVoices.length,
                  sampleKinds: newVoices
                    .map(
                      (v) =>
                        [...audio.feedingBuffers].find(
                          ([, b]) => b === v.buffer,
                        )?.[0],
                    )
                    .filter(Boolean),
                });
              }
              maxFeeding = Math.max(maxFeeding, audio.feedingVoices.size);
              maxImpacts = Math.max(maxImpacts, audio.combatVoices.size);
            } finally {
              await ctx.resume();
            }
          }),
        );
      const b = await ctx.startRendering();
      await Promise.all(tasks);
      reports.push({
        name: spec.name,
        spec,
        signal: stats(b),
        afterRestore: stats(b, 0.9),
        tail: stats(b, spec.duration - 0.3),
        maxFeeding,
        maxImpacts,
        remainingFeeding: audio.feedingVoices.size,
        remainingImpacts: audio.combatVoices.size,
        decoded: [...audio.feedingBuffers.keys()].filter((k) =>
          k.startsWith("combat_"),
        ),
        played,
        wav: wav(b),
      });
    }
    return reports;
  });
  await writeFile(
    `${out}/report.json`,
    JSON.stringify(
      { results: results.map(({ wav, ...r }) => r), errors },
      null,
      2,
    ),
  );
  for (const r of results) {
    await writeFile(`${out}/${r.name}.wav`, Buffer.from(r.wav, "base64"));
    assert.equal(r.signal.invalid, 0);
    assert.equal(r.signal.clipped, 0);
    assert.ok(r.signal.peak > 0.001);
    assert.ok(r.maxFeeding <= 3);
    assert.ok(r.maxImpacts <= 2);
    assert.equal(r.remainingFeeding, 0);
    assert.equal(r.remainingImpacts, 0);
    assert.equal(r.decoded.length, 4);
    if (["pause", "mute", "reset"].includes(r.name))
      assert.ok(r.afterRestore.rms < 0.00001, `${r.name} replays a stale tail`);
  }
  for (const kind of ["ordinary", "yellow", "hurt", "lord"]) {
    const r = results.find((x) => x.name === kind);
    assert.deepEqual(r.played[0].sampleKinds, [`combat_${kind}`]);
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      passed: true,
      cases: results.map((r) => ({
        name: r.name,
        peak: r.signal.peak,
        rms: r.signal.rms,
      })),
    }),
  );
} finally {
  await browser.close();
}
