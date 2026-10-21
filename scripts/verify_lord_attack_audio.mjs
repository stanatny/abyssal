import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5188";
const out =
  process.env.ABYSSAL_AUDIO_REPORT_DIR ||
  ".local/lord_attack_audio_20261020/graph";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: false });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/lord_audio_probe", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: "<!doctype html><title>Lord attack graph verification</title>",
  }),
);
try {
  await page.goto(base + "/lord_audio_probe");
  const results = await page.evaluate(async () => {
    const { OceanAudio } = await import("/src/audio.js");
    const { LordAttackAudio, LORD_ATTACK_URLS } = await import(
      "/src/lord_attack_audio.js"
    );
    const { RecordedAudioBank } = await import("/src/recorded_audio_bank.js");
    const rate = 48000;
    const representatives = {
      breath: ["hydra", "volley"],
      roar: ["white_tiger", "roar"],
      sword: ["sword_sage", "swords"],
      charge: ["leviathan", "charge"],
      water: ["azure_dragon", "water"],
      fire: ["vermilion_bird", "volley"],
      lightning: ["thunderbarbel", "volley"],
      vortex: ["kraken", "vortex"],
      pulse: ["black_tortoise", "pulse"],
      crystal: ["brine_regent", "pulse"],
      loom: ["abyss_weaver", "loom"],
      lash: ["lumen_stalker", "lash"],
      claw: ["karkinos", "claw"],
      fault: ["karkinos", "fault"],
    };
    const specs = [
      ...Object.keys(representatives).map((cue) => ({
        name: cue,
        events: [{ at: 0.125, cue }],
      })),
      ...["pause", "mute", "reset", "region", "interrupt"].map((op) => ({
        name: op,
        events: [
          { at: 0.125, cue: "roar" },
          { at: 0.25, op },
          { at: 0.375, cue: "breath" },
          { at: 0.75, op: "resume" },
        ],
      })),
      {
        name: "priority_mix",
        music: true,
        events: [
          ...Array.from({ length: 18 }, (_, i) => ({
            at: 0.125 + i * 0.125,
            op: "meal",
          })),
          ...Array.from({ length: 9 }, (_, i) => ({
            at: 0.25 + i * 0.25,
            cue: i % 2 ? "roar" : "sword",
          })),
          { at: 0.5, op: "hurt" },
          { at: 1, op: "hit" },
        ],
      },
      {
        name: "deep_mix",
        music: true,
        depth: 1500,
        events: [
          { at: 0.125, cue: "vortex" },
          { at: 0.5, cue: "breath" },
          { at: 0.75, op: "hurt" },
          { at: 1, op: "hit" },
        ],
      },
      {
        name: "bounded_voices",
        events: Array.from({ length: 14 }, (_, i) => ({
          at: 0.125,
          cue: "roar",
          owner: i % 3,
        })),
      },
      { name: "far", events: [{ at: 0.125, cue: "roar", distance: 400 }] },
    ];
    const report = [];
    function stats(b, from = 0) {
      let peak = 0,
        sum = 0,
        n = 0,
        clipped = 0,
        invalid = 0;
      for (let c = 0; c < b.numberOfChannels; c++)
        for (const x of b.getChannelData(c).subarray(Math.floor(from * rate))) {
          peak = Math.max(peak, Math.abs(x));
          sum += x * x;
          n++;
          if (!Number.isFinite(x)) invalid++;
          if (Math.abs(x) >= 0.985) clipped++;
        }
      return { peak, rms: Math.sqrt(sum / n), clipped, invalid };
    }
    function wav(b) {
      const data = new Uint8Array(44 + b.length * 4),
        v = new DataView(data.buffer);
      const str = (o, s) =>
        [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      str(0, "RIFF");
      v.setUint32(4, data.length - 8, true);
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
      for (let i = 0; i < data.length; i += 8192)
        s += String.fromCharCode(...data.subarray(i, i + 8192));
      return btoa(s);
    }
    for (const spec of specs) {
      const ctx = new OfflineAudioContext(2, 4 * rate, rate),
        a = new OceanAudio({ context: ctx });
      a.start();
      await Promise.all([
        a.lordAttackAudio.prepare(ctx),
        a.prepareCombatSounds(),
      ]);
      if (a.lordAttackAudio.state !== "ready")
        throw Error("Attack audio decode failed");
      a.reset();
      const buffers = a.lordAttackAudio.buffers;
      await a.lordAttackAudio.prepare(ctx);
      if (a.lordAttackAudio.buffers !== buffers)
        throw Error("Decode cache changed");
      const quiet = () => {
        if (!spec.music)
          for (const node of [a.music, a.waterGain, a.currentGain]) {
            node.gain.cancelScheduledValues(ctx.currentTime);
            node.gain.setValueAtTime(0, ctx.currentTime);
          }
      };
      quiet();
      let maxVoices = 0,
        maxOwned = 0;
      const events = [];
      const times = new Set(spec.events.map((e) => e.at));
      if (spec.music) for (let t = 0.125; t < 3.8; t += 0.125) times.add(t);
      const tasks = [...times]
        .sort((a, b) => a - b)
        .map((at) =>
          ctx.suspend(at).then(async () => {
            try {
              a.update(at, 0.5, {
                boss: !!spec.music,
                pursuing: !!spec.music,
                depth: spec.depth ?? 20,
              });
              quiet();
              for (const e of spec.events.filter((e) => e.at === at)) {
                const before = new Set(a.lordAttackAudio.voices.keys());
                if (e.cue) {
                  const [k, ability] = representatives[e.cue];
                  a.bossAbility(k, ability, {
                    owner: e.owner ?? "boss",
                    distance: e.distance ?? 40,
                    duration: 2.9,
                    index: 0,
                  });
                } else if (e.op === "pause") a.setPaused(true);
                else if (e.op === "mute") a.toggle();
                else if (e.op === "reset") {
                  a.reset();
                  quiet();
                } else if (e.op === "region") {
                  a.setRegion("penglai");
                  quiet();
                } else if (e.op === "interrupt") a.stopBossAbility("boss");
                else if (e.op === "resume") {
                  if (!a.enabled) a.toggle();
                  a.setPaused(false);
                } else if (e.op === "meal") a.eatFish(1, "ordinary");
                else if (e.op === "hurt") a.bitten();
                else if (e.op === "hit") a.biteLord();
                events.push({
                  ...e,
                  started: [...a.lordAttackAudio.voices]
                    .filter(([v]) => !before.has(v))
                    .map(([, v]) => v.cue),
                });
                maxVoices = Math.max(maxVoices, a.lordAttackAudio.voices.size);
                const counts = {};
                for (const v of a.lordAttackAudio.voices.values())
                  counts[v.owner] = (counts[v.owner] ?? 0) + 1;
                maxOwned = Math.max(maxOwned, 0, ...Object.values(counts));
              }
            } finally {
              await ctx.resume();
            }
          }),
        );
      const b = await ctx.startRendering();
      await Promise.all(tasks);
      report.push({
        name: spec.name,
        signal: stats(b),
        afterRestore: stats(b, 0.9),
        tail: stats(b, 3.5),
        maxVoices,
        maxOwned,
        remaining: a.lordAttackAudio.voices.size,
        decoded: buffers.size,
        events,
        wav: wav(b),
      });
    }
    // 丢包回退不会保存历史攻击；后续同上下文可重新准备。
    const context = new OfflineAudioContext(2, rate, rate);
    let calls = 0;
    const bank = new RecordedAudioBank(
      { roar: LORD_ATTACK_URLS.roar },
      {
        fetcher: async (u) => {
          if (++calls === 1) throw Error("staged failure");
          return fetch(u);
        },
      },
    );
    const layer = new LordAttackAudio(bank),
      audio = new OceanAudio({ context, lordAttackAudio: layer });
    audio.start();
    const first = await layer.pending;
    audio.bossAbility("white_tiger", "roar", { owner: "failed" });
    const before = layer.voices.size;
    await layer.prepare(context);
    const after = layer.voices.size;
    audio.bossAbility("white_tiger", "roar", { owner: "next" });
    const next = layer.voices.size;
    audio.reset();
    return {
      cases: report,
      retry: { first, before, after, next, calls, state: layer.state },
      sampleCount: Object.keys(LORD_ATTACK_URLS).length,
    };
  });
  for (const r of results.cases) {
    await writeFile(`${out}/${r.name}.wav`, Buffer.from(r.wav, "base64"));
    delete r.wav;
    assert.equal(r.signal.invalid, 0, r.name);
    assert.equal(r.signal.clipped, 0, r.name);
    assert.ok(r.maxVoices <= 6);
    assert.ok(r.maxOwned <= 3);
    assert.equal(r.remaining, 0, r.name);
    if (["pause", "mute"].includes(r.name))
      assert.ok(r.afterRestore.peak < 0.0001, `${r.name} stale tail`);
    if (r.name === "far") assert.ok(r.signal.peak < 0.0001);
    else assert.ok(r.signal.peak > 0.001, r.name);
  }
  assert.deepEqual(results.retry, {
    first: false,
    before: 0,
    after: 0,
    next: 1,
    calls: 2,
    state: "ready",
  });
  assert.deepEqual(errors, []);
  results.errors = errors;
  results.passed = true;
  await writeFile(out + "/report.json", JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify({
      cases: results.cases.length,
      passed: true,
      peaks: results.cases.map((r) => [r.name, r.signal.peak]),
    }),
  );
} finally {
  await browser.close();
}
