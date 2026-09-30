import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";

// 使用游戏的原生 Web Audio 图导出完整主题、动态分层与生命周期片段。
const base = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5179";
const out = process.env.ABYSSAL_AUDIO_OUT || ".local/atlantis_music";
const bermudaOnly = process.env.ABYSSAL_AUDIO_REGION === "bermuda";
const lifecycleOnly = process.env.ABYSSAL_AUDIO_LIFECYCLE_ONLY === "1";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = {
  base,
  browser: browser.version(),
  platform: process.platform,
  architecture: process.arch,
  source:
    "Native OfflineAudioContext controlled renders plus AudioWorklet capture of the live game output; live cases stage legal positions but never assign AI combat state or call audio.update",
  listening:
    "Pending user listening. No audio perception tool was available; headless metrics do not establish musical quality or real-speaker acceptance.",
  clips: [],
  lifecycle: [],
  gameEncounters: [],
  errors: [],
};

/** 等待真实异步海域事务完成，再检查地图和声音，避免读取加载前的旧区域。 */
async function selectReviewRegion(page, region) {
  await page.locator("#region-select").click();
  await page.locator(`[data-choice-value="${region}"]`).click();
  await page.waitForFunction(
    (region) =>
      document.body.dataset.regionLoading !== "true" &&
      window.__ABYSSAL__.audio.regionId === region,
    region,
  );
}

/** 布置合法相遇位置，捕获真正游戏主循环的AI状态与输出，不写追击值或调用audio.update。 */
async function captureGameEncounter(region, boss) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    reducedMotion: "reduce",
  });
  page.on("pageerror", (error) => report.errors.push(error.message));
  try {
    await page.goto(base);
    await page.waitForFunction(() => window.__ABYSSAL__);
    if (region !== "hawaii") {
      await selectReviewRegion(page, region);
    }
    await page.locator("#start").click();
    await page.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await page.keyboard.down("KeyK");
    await page.evaluate(async () => {
      const game = window.__ABYSSAL__,
        audio = game.audio,
        context = audio.context;
      const module = `class Capture extends AudioWorkletProcessor {
        constructor() {super(); this.enabled=false; this.port.onmessage=e=>this.enabled=e.data;}
        process(inputs) {if(this.enabled && inputs[0]?.length) this.port.postMessage({at:currentTime,channels:inputs[0].map(c=>new Float32Array(c)),stems:inputs.slice(1).map(channels=>channels.map(c=>new Float32Array(c)))}); return true;}
      } registerProcessor('regional-capture', Capture);`;
      const url = URL.createObjectURL(
        new Blob([module], { type: "text/javascript" }),
      );
      await context.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const capture = new AudioWorkletNode(context, "regional-capture", {
        numberOfInputs: 3,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      const silent = context.createGain();
      silent.gain.value = 0;
      audio.pauseGate
        .connect(capture)
        .connect(silent)
        .connect(context.destination);
      (
        (audio.regionId === "bermuda"
          ? audio.bermudaMusic
          : audio.atlantisMusic
        )?.pursuit ?? audio.chase
      ).connect(capture, 0, 1);
      (
        (audio.regionId === "bermuda"
          ? audio.bermudaMusic
          : audio.atlantisMusic
        )?.guardian ?? audio.bossLayer
      ).connect(capture, 0, 2);
      const evidence = (window.regionalEncounter = {
        chunks: [],
        trace: [],
        notes: [],
        marks: { start: context.currentTime },
        capture,
        silent,
        sampleRate: context.sampleRate,
      });
      capture.port.onmessage = (event) => evidence.chunks.push(event.data);
      const originalUpdate = audio.update.bind(audio),
        originalNote = audio.note.bind(audio);
      audio.update = (time, danger, options) => {
        const result = originalUpdate(time, danger, options);
        const enemy = window.encounterHunter;
        evidence.trace.push({
          at: context.currentTime,
          danger,
          pursuing: options.pursuing,
          boss: options.boss,
          chase: enemy?.chase ?? 0,
          phase: bossPhase(),
          hudThreat: !document.querySelector("#threat").hidden,
          pursuitGain:
            (audio.regionId === "bermuda"
              ? audio.bermudaMusic
              : audio.atlantisMusic
            )?.pursuit.gain.value ?? audio.chase.gain.value,
          guardianGain:
            (audio.regionId === "bermuda"
              ? audio.bermudaMusic
              : audio.atlantisMusic
            )?.guardian.gain.value ?? audio.bossLayer.gain.value,
          mode: game.mode,
        });
        return result;
      };
      const bossPhase = () => game.activeBoss?.state.phase ?? null;
      audio.note = (...args) => {
        if (
          [
            audio.chase,
            audio.chaseFast,
            audio.bossLayer,
            (audio.regionId === "bermuda"
              ? audio.bermudaMusic
              : audio.atlantisMusic
            )?.pursuit,
            (audio.regionId === "bermuda"
              ? audio.bermudaMusic
              : audio.atlantisMusic
            )?.guardian,
          ].includes(args[4])
        )
          evidence.notes.push({
            at: args[1],
            scheduledAt: context.currentTime,
          });
        return originalNote(...args);
      };
      capture.port.postMessage(true);
    });
    await page.waitForTimeout(3000);
    const placement = await page.evaluate(
      ({ region, boss }) => {
        const game = window.__ABYSSAL__,
          evidence = window.regionalEncounter;
        game.entities.forEach((entity) => (entity.hiddenFor = 999));
        if (boss) {
          game.setLength(28);
          const target = game.encounters.bosses.find(
            (entry) => entry.enabled && !entry.state.defeated,
          );
          const home = target.home.toArray();
          game.setPosition(home[0], home[1] + 26, home[2] + 38);
          game.setFacing(0);
          evidence.marks.placed = game.audio.context.currentTime;
          return {
            kind: target.state.species.kind,
            home,
            player: game.position.toArray(),
            initialPhase: target.state.phase,
          };
        }
        const kind =
          region === "atlantis"
            ? "blue_shark"
            : region === "bermuda"
              ? "tiger_shark"
              : "shark";
        const target = game.entities.find(
          (entity) =>
            entity.species.kind === kind && entity.populationIndex === 0,
        );
        const position =
          region === "atlantis"
            ? [-36, -50, -235]
            : region === "bermuda"
              ? [-90, -70, -420]
              : [44, -60, -285];
        game.setPosition(...position);
        game.setFacing(0);
        target.hiddenFor = 0;
        target.mesh.position.set(position[0], position[1], position[2] + 45);
        window.encounterHunter = target;
        evidence.marks.placed = game.audio.context.currentTime;
        return {
          kind,
          player: position,
          enemy: target.mesh.position.toArray(),
          initialChase: target.chase,
        };
      },
      { region, boss },
    );
    await page.waitForFunction(
      (boss) => {
        const game = window.__ABYSSAL__;
        return boss
          ? !!game.activeBoss &&
              ["hunt", "windup", "attack", "recover"].includes(
                game.activeBoss.state.phase,
              ) &&
              game.audio.boss
          : window.encounterHunter?.chase > 0 &&
              game.audio.pursuing &&
              !document.querySelector("#threat").hidden;
      },
      boss,
      { timeout: 10000 },
    );
    await page.waitForTimeout(6000);
    assert.equal(await page.evaluate(() => window.__ABYSSAL__.mode), "playing");
    await page.evaluate(() => {
      const game = window.__ABYSSAL__;
      window.regionalEncounter.marks.escape = game.audio.context.currentTime;
      game.setPosition(0, -18, 75);
      game.setFacing(0);
    });
    await page.waitForFunction(
      () =>
        !window.__ABYSSAL__.audio.pursuing && !window.__ABYSSAL__.audio.boss,
    );
    await page.waitForTimeout(4000);
    const capture = await page.evaluate(async () => {
      const evidence = window.regionalEncounter;
      evidence.capture.port.postMessage(false);
      await new Promise((resolve) => setTimeout(resolve, 80));
      const blocks = evidence.chunks,
        length = blocks.reduce(
          (total, block) => total + block.channels[0].length,
          0,
        );
      const channels = [new Float32Array(length), new Float32Array(length)];
      const stems = Array.from({ length: 2 }, () => [
        new Float32Array(length),
        new Float32Array(length),
      ]);
      let cursor = 0;
      for (const block of blocks) {
        channels[0].set(block.channels[0], cursor);
        channels[1].set(block.channels[1] ?? block.channels[0], cursor);
        block.stems.forEach((stem, index) => {
          if (!stem.length) return;
          stems[index][0].set(stem[0], cursor);
          stems[index][1].set(stem[1] ?? stem[0], cursor);
        });
        cursor += block.channels[0].length;
      }
      const fromTime = blocks[0].at,
        rate = evidence.sampleRate;
      const measure = (from, to, sourceChannels = channels) => {
        let sum = 0,
          peak = 0,
          invalid = 0,
          clipped = 0,
          count = 0;
        const first = Math.max(0, Math.floor((from - fromTime) * rate)),
          last = Math.min(length, Math.floor((to - fromTime) * rate));
        for (const values of sourceChannels)
          for (let i = first; i < last; i++) {
            const value = values[i];
            if (!Number.isFinite(value)) invalid++;
            if (Math.abs(value) >= 0.985) clipped++;
            sum += value * value;
            peak = Math.max(peak, Math.abs(value));
            count++;
          }
        return {
          rms: Math.sqrt(sum / Math.max(1, count)),
          peak,
          invalid,
          clipped,
        };
      };
      const marks = evidence.marks;
      const metrics = {
        all: measure(fromTime, fromTime + length / rate),
        calm: measure(marks.start + 0.6, marks.placed - 0.1),
        battle: measure(marks.placed + 0.6, marks.escape - 0.1),
        recovery: measure(marks.escape + 2.7, marks.escape + 3.8),
        pursuitRecovery: measure(
          marks.escape + 3.5,
          marks.escape + 4,
          stems[0],
        ),
        guardianRecovery: measure(
          marks.escape + 3.5,
          marks.escape + 4,
          stems[1],
        ),
      };
      const bytes = new Uint8Array(44 + length * 4),
        view = new DataView(bytes.buffer);
      const ascii = (at, text) =>
        [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
      ascii(0, "RIFF");
      view.setUint32(4, bytes.length - 8, true);
      ascii(8, "WAVE");
      ascii(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 2, true);
      view.setUint32(24, rate, true);
      view.setUint32(28, rate * 4, true);
      view.setUint16(32, 4, true);
      view.setUint16(34, 16, true);
      ascii(36, "data");
      view.setUint32(40, bytes.length - 44, true);
      for (let c = 0; c < 2; c++)
        for (let i = 0; i < length; i++)
          view.setInt16(
            44 + i * 4 + c * 2,
            Math.round(Math.max(-1, Math.min(1, channels[c][i])) * 32767),
            true,
          );
      let binary = "";
      for (let at = 0; at < bytes.length; at += 8192)
        binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
      return {
        wav: btoa(binary),
        sampleRate: rate,
        seconds: length / rate,
        metrics,
        marks,
        trace: evidence.trace,
        notes: evidence.notes,
      };
    });
    const combatFrames = capture.trace.filter((frame) =>
      boss ? frame.boss : frame.pursuing,
    );
    assert.ok(
      combatFrames.length >= 10,
      "Real AI did not sustain the music trigger",
    );
    assert.ok(combatFrames.every((frame) => frame.danger > 0));
    if (!boss) assert.ok(combatFrames.every((frame) => frame.chase > 0));
    const first = combatFrames[0].at;
    const note = capture.notes.find((note) => note.at >= first - 0.001);
    assert.ok(
      note && note.at - first < 0.06,
      "Combat music missed the real chase entry",
    );
    const after = capture.trace
      .filter((frame) => frame.at > capture.marks.escape + 3.5)
      .at(-1);
    assert.ok(
      after && !after.boss && !after.pursuing,
      "Combat layer did not fade after escape",
    );
    // 原生引擎可在无输入时冻结 AudioParam.value；验真实输出，不把缓存读数当作声音。
    assert.ok(
      capture.metrics.pursuitRecovery.peak < 0.005,
      "Pursuit output did not fade after escape",
    );
    assert.ok(
      capture.metrics.guardianRecovery.peak < 0.005,
      "Guardian output did not fade after escape",
    );
    assert.equal(capture.metrics.all.invalid, 0);
    assert.equal(capture.metrics.all.clipped, 0);
    const name = `${region}_live_${boss ? "guardian" : "chase"}`;
    const bytes = Buffer.from(capture.wav, "base64");
    await writeFile(`${out}/${name}.wav`, bytes);
    delete capture.wav;
    const row = {
      name,
      region,
      boss,
      placement,
      ...capture,
      entryLatency: note.at - first,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    report.gameEncounters.push(row);
    console.log(
      `PASS ${name}: entry ${(row.entryLatency * 1000).toFixed(1)}ms, peak ${capture.metrics.all.peak.toFixed(3)}`,
    );
  } catch (error) {
    const detail = await page
      .evaluate(() => ({
        placement: window.regionalEncounter?.marks,
        trace: window.regionalEncounter?.trace.slice(-30),
        notes: window.regionalEncounter?.notes.slice(-20),
        mode: window.__ABYSSAL__?.mode,
        player: window.__ABYSSAL__?.position.toArray(),
      }))
      .catch(() => null);
    report.gameEncounterFailure = { region, boss, detail };
    await page
      .screenshot({
        path: `${out}/${region}_${boss ? "guardian" : "chase"}_failure.png`,
      })
      .catch(() => {});
    throw error;
  } finally {
    await page.close();
  }
}

try {
  if (!lifecycleOnly) {
    const page = await browser.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    await page.route("**/region_music_probe", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Regional soundtrack render</title>",
      }),
    );
    await page.goto(`${base}/region_music_probe`);
    await page.exposeFunction(
      "saveMusicClip",
      async ({ name, wav, ...metrics }) => {
        const bytes = Buffer.from(wav, "base64");
        await writeFile(`${out}/${name}.wav`, bytes);
        report.clips.push({
          name,
          ...metrics,
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      },
    );
    const offline = await page.evaluate(async (bermudaOnly) => {
      const { OceanAudio } = await import("/src/audio.js");
      const measure = (buffer, from = 0, to = buffer.duration) => {
        const first = Math.floor(from * buffer.sampleRate);
        const last = Math.min(
          buffer.length,
          Math.floor(to * buffer.sampleRate),
        );
        let sum = 0,
          peak = 0,
          clipped = 0,
          invalid = 0,
          largestStep = 0;
        for (let channel = 0; channel < 2; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let i = first; i < last; i++) {
            const value = samples[i];
            if (!Number.isFinite(value)) invalid++;
            if (Math.abs(value) >= 0.985) clipped++;
            peak = Math.max(peak, Math.abs(value));
            sum += value * value;
            if (i > 0)
              largestStep = Math.max(
                largestStep,
                Math.abs(value - samples[i - 1]),
              );
          }
        }
        return {
          rms: Math.sqrt(sum / (2 * (last - first))),
          peak,
          clipped,
          invalid,
          largestStep,
        };
      };
      const encode = (buffer) => {
        const bytes = new Uint8Array(44 + buffer.length * 4);
        const view = new DataView(bytes.buffer);
        const ascii = (at, str) =>
          [...str].forEach((char, i) =>
            view.setUint8(at + i, char.charCodeAt(0)),
          );
        ascii(0, "RIFF");
        view.setUint32(4, bytes.length - 8, true);
        ascii(8, "WAVE");
        ascii(12, "fmt ");
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 2, true);
        view.setUint32(24, buffer.sampleRate, true);
        view.setUint32(28, buffer.sampleRate * 4, true);
        view.setUint16(32, 4, true);
        view.setUint16(34, 16, true);
        ascii(36, "data");
        view.setUint32(40, bytes.length - 44, true);
        for (let channel = 0; channel < 2; channel++) {
          const samples = buffer.getChannelData(channel);
          for (let i = 0; i < buffer.length; i++)
            view.setInt16(
              44 + i * 4 + channel * 2,
              Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
              true,
            );
        }
        let binary = "";
        for (let at = 0; at < bytes.length; at += 8192)
          binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
        return btoa(binary);
      };
      const cases = bermudaOnly
        ? [
            {
              name: "bermuda_exploration",
              region: "bermuda",
              seconds: 168,
              danger: 0,
            },
            {
              name: "bermuda_chase",
              region: "bermuda",
              seconds: 40,
              danger: 0.1,
              pursuing: true,
            },
            {
              name: "bermuda_guardian",
              region: "bermuda",
              seconds: 40,
              danger: 1,
              boss: true,
            },
            {
              name: "bermuda_storm",
              region: "bermuda",
              seconds: 28,
              danger: 0.7,
              effects: true,
            },
            {
              name: "bermuda_lifecycle",
              region: "bermuda",
              seconds: 22,
              danger: 0,
              lifecycle: true,
            },
            {
              name: "bermuda_native_48000",
              region: "bermuda",
              seconds: 12,
              danger: 1,
              boss: true,
              sampleRate: 48000,
            },
          ]
        : [
            {
              name: "atlantis_exploration",
              region: "atlantis",
              seconds: 154,
              danger: 0,
            },
            {
              name: "atlantis_chase",
              region: "atlantis",
              seconds: 40,
              danger: 0.86,
            },
            {
              name: "atlantis_distant_chase",
              region: "atlantis",
              seconds: 40,
              danger: 0.1,
            },
            {
              name: "hawaii_distant_chase",
              region: "hawaii",
              seconds: 40,
              danger: 0.1,
            },
            {
              name: "atlantis_guardian",
              region: "atlantis",
              seconds: 40,
              danger: 1,
              boss: true,
            },
            {
              name: "hawaii_reference",
              region: "hawaii",
              seconds: 40,
              danger: 0,
            },
            {
              name: "atlantis_feeding_warnings",
              region: "atlantis",
              seconds: 28,
              danger: 0.92,
              boss: true,
              effects: true,
            },
            {
              name: "region_switch_lifecycle",
              region: "atlantis",
              seconds: 22,
              danger: 0,
              lifecycle: true,
            },
            {
              name: "atlantis_native_48000",
              region: "atlantis",
              seconds: 12,
              danger: 1,
              boss: true,
              sampleRate: 48000,
            },
          ];
      const results = [];
      for (const entry of cases) {
        const sampleRate = entry.sampleRate || 24000;
        const context = new OfflineAudioContext(
          2,
          entry.seconds * sampleRate,
          sampleRate,
        );
        const audio = new OceanAudio({ context });
        audio.setRegion(entry.region);
        audio.start();
        const prepared = await Promise.all([
          audio.prepareFishSounds(),
          audio.prepareHumanVoices(),
        ]);
        if (prepared.some((ready) => !ready))
          throw new Error("Recorded Foley or human voices failed to prepare");
        audio.reset();
        let maximumVoices = 0,
          maximumMusic = 0;
        const transitions = [];
        const tick = (at) => {
          if (entry.lifecycle) {
            if (at === 4) audio.toggle();
            if (at === 6) audio.toggle();
            if (at === 8) audio.setPaused(true);
            if (at === 10) audio.setPaused(false);
            if (at === 12) audio.setRegion("hawaii");
            if (at === 15) audio.setRegion(entry.region);
            if (at === 18) {
              audio.setPaused(true);
              audio.reset();
            }
            if (at === 20) {
              audio.start();
              audio.reset();
            }
            if ([4, 6, 8, 10, 12, 15, 18, 20].includes(at))
              transitions.push({
                at,
                region: audio.regionId,
                paused: audio.paused,
                enabled: audio.enabled,
              });
          }
          audio.update(at, entry.danger, {
            boss: !!entry.boss,
            pursuing: !!entry.pursuing,
            depth: 60 + Math.min(450, at * 6),
          });
          if (entry.effects) {
            if (at % 0.5 === 0) audio.eatFish(1.2);
            if ([3, 12, 21].includes(at)) {
              if (bermudaOnly) audio.thunder(1);
              else audio.eatHuman(1, at === 12 ? "female" : "male");
            }
            if (bermudaOnly && [5, 16].includes(at)) {
              audio.ghostWarning();
              audio.ghostShot();
            }
            if ([6, 15, 24].includes(at)) audio.bossAttack("kraken");
            if ([9, 18].includes(at)) audio.sonar();
          }
          maximumVoices = Math.max(maximumVoices, audio.voices.size);
          maximumMusic = Math.max(maximumMusic, audio.musicVoices.size);
        };
        tick(0);
        const pending = [];
        for (let index = 1; index / 8 < entry.seconds - 0.02; index++) {
          const at = index / 8;
          pending.push(
            context.suspend(at).then(async () => {
              tick(at);
              await context.resume();
            }),
          );
        }
        const buffer = await context.startRendering();
        await Promise.all(pending);
        const detail = {
          ...measure(buffer),
          onset: measure(buffer, 0, 0.1),
          comparison: entry.seconds >= 40 ? measure(buffer, 6, 38) : null,
          sampleRate,
          seconds: buffer.duration,
          maximumVoices,
          maximumMusic,
          sections: Array.from(
            { length: Math.floor(entry.seconds / 8) },
            (_, i) => ({ from: i * 8, ...measure(buffer, i * 8, (i + 1) * 8) }),
          ),
        };
        if (entry.lifecycle)
          detail.silentWindows = [4.5, 8.5, 18.5].map((from) => ({
            from,
            ...measure(buffer, from, from + 0.7),
          }));
        await window.saveMusicClip({
          name: entry.name,
          wav: encode(buffer),
          ...detail,
        });
        results.push({ name: entry.name, ...detail, transitions });
      }
      return results;
    }, bermudaOnly);
    for (const clip of offline) {
      assert.equal(clip.invalid, 0, `${clip.name}: non-finite samples`);
      assert.equal(clip.clipped, 0, `${clip.name}: clipping`);
      assert.ok(
        clip.rms > 0.004 && clip.peak < 0.9,
        `${clip.name}: invalid mix level`,
      );
      assert.ok(
        clip.maximumVoices < 115,
        `${clip.name}: unbounded voice count`,
      );
      if (
        [
          "atlantis_exploration",
          "hawaii_reference",
          "region_switch_lifecycle",
          "bermuda_exploration",
          "bermuda_lifecycle",
        ].includes(clip.name)
      )
        assert.ok(
          clip.onset.peak < 0.06,
          `${clip.name}: cancelled initial music burst`,
        );
      for (const silent of clip.silentWindows || [])
        assert.ok(
          silent.peak < 0.0001,
          `${clip.name}: mute/pause leakage at ${silent.from}`,
        );
    }
    report.contrast = (
      bermudaOnly
        ? [["bermuda_exploration", "bermuda_chase", 1.6]]
        : [
            ["atlantis_exploration", "atlantis_distant_chase", 1.6],
            ["atlantis_exploration", "atlantis_chase", 1.6],
            ["hawaii_reference", "hawaii_distant_chase", 1.2],
          ]
    ).map(([calmName, combatName, minimumRatio]) => {
      const calm = offline.find((clip) => clip.name === calmName).comparison;
      const combat = offline.find(
        (clip) => clip.name === combatName,
      ).comparison;
      const ratio = combat.rms / calm.rms;
      assert.ok(
        ratio >= minimumRatio,
        `${combatName}: combat contrast regressed`,
      );
      return {
        calm: calmName,
        combat: combatName,
        from: 6,
        to: 38,
        rmsRatio: ratio,
        decibels: 20 * Math.log10(ratio),
      };
    });
    await page.close();
  }

  if (process.env.ABYSSAL_AUDIO_OFFLINE_ONLY !== "1") {
    if (!lifecycleOnly)
      for (const region of bermudaOnly ? ["bermuda"] : ["atlantis", "hawaii"])
        for (const boss of [false, true])
          await captureGameEncounter(region, boss);
    const game = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      reducedMotion: "reduce",
    });
    game.on("pageerror", (error) => report.errors.push(error.message));
    await game.goto(base);
    await game.waitForFunction(() => window.__ABYSSAL__);
    await selectReviewRegion(game, "atlantis");
    assert.equal(
      await game.evaluate(() => window.__ABYSSAL__.audio.regionId),
      "atlantis",
    );
    assert.equal(
      await game.evaluate(() => window.__ABYSSAL__.audio.context),
      null,
    );
    await game.locator("#start").click();
    await game.waitForFunction(
      () =>
        window.__ABYSSAL__.mode === "playing" &&
        window.__ABYSSAL__.audio.context.state === "running",
    );
    await game.evaluate(() => {
      const a = window.__ABYSSAL__.audio;
      window.regionalAudioBaseline = {
        context: a.context,
        master: a.master,
        water: a.waterSource,
        score: a.atlantisMusic,
      };
    });
    await game.waitForTimeout(1000);
    await game.locator("#sound").click();
    assert.equal(
      await game.evaluate(() => window.__ABYSSAL__.audio.enabled),
      false,
    );
    await game.locator("#sound").click();
    await game.keyboard.press("Escape");
    await game.waitForFunction(
      () => window.__ABYSSAL__.audio.context.state === "suspended",
    );
    const step = await game.evaluate(() => window.__ABYSSAL__.audio.step);
    await game.waitForTimeout(250);
    assert.equal(
      await game.evaluate(() => window.__ABYSSAL__.audio.step),
      step,
    );
    await game.locator("#resume").click();
    await game.waitForFunction(
      () => window.__ABYSSAL__.audio.context.state === "running",
    );
    const rapidResume = await game.evaluate(async () => {
      const a = window.__ABYSSAL__.audio;
      for (const delay of [0, 20, 36, 50]) {
        a.setPaused(true);
        await new Promise((resolve) => setTimeout(resolve, delay));
        a.setPaused(false);
        await new Promise((resolve) => setTimeout(resolve, 70));
        if (a.context.state !== "running") return false;
      }
      return true;
    });
    assert.equal(rapidResume, true);
    report.lifecycle.push({
      flow: "Rapid pause/resume across deferred native suspension",
      passed: rapidResume,
    });
    await game.keyboard.press("Escape");
    await game.locator("#return-menu").click();
    await game.waitForFunction(
      () =>
        window.__ABYSSAL__.mode === "menu" &&
        window.__ABYSSAL__.audio.context.state === "suspended",
    );
    report.lifecycle.push({
      flow: "Atlantis selection/start/mute/unmute/pause/resume/Return Home",
      ...(await game.evaluate(() => {
        const a = window.__ABYSSAL__.audio;
        return {
          region: a.regionId,
          voices: a.voices.size,
          musicVoices: a.musicVoices.size,
          paused: a.paused,
        };
      })),
    });
    assert.equal(report.lifecycle.at(-1).voices, 0);
    assert.equal(report.lifecycle.at(-1).musicVoices, 0);
    await selectReviewRegion(game, "hawaii");
    await game.locator("#start").click();
    await game.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    await game.waitForTimeout(800);
    const reuse = await game.evaluate(() => {
      const a = window.__ABYSSAL__.audio,
        b = window.regionalAudioBaseline;
      a.start();
      a.start();
      return {
        region: a.regionId,
        sameContext: a.context === b.context,
        sameMaster: a.master === b.master,
        sameWater: a.waterSource === b.water,
        sameAtlantisScore: a.atlantisMusic === b.score,
        state: a.context.state,
      };
    });
    assert.equal(reuse.region, "hawaii");
    for (const key of [
      "sameContext",
      "sameMaster",
      "sameWater",
      "sameAtlantisScore",
    ])
      assert.equal(reuse[key], true);
    report.lifecycle.push({
      flow: "Return Home/switch Hawaii/start/repeated start",
      ...reuse,
    });
    await game.keyboard.press("Escape");
    await game.locator("#return-menu").click();
    await selectReviewRegion(game, "atlantis");
    await game.locator("#start").click();
    await game.waitForFunction(() => window.__ABYSSAL__.mode === "playing");
    assert.equal(
      await game.evaluate(() => window.__ABYSSAL__.audio.regionId),
      "atlantis",
    );
    report.lifecycle.push({
      flow: "Hawaii/Return Home/Atlantis/restart",
      passed: true,
    });
    await game.close();
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  throw error;
} finally {
  await writeFile(
    `${out}/${lifecycleOnly ? "lifecycle_report" : "report"}.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await browser.close();
  console.log(
    JSON.stringify(
      {
        passed: report.passed,
        clips: report.clips.map(({ name, rms, peak, maximumVoices }) => ({
          name,
          rms,
          peak,
          maximumVoices,
        })),
        gameEncounters: report.gameEncounters.map(
          ({ name, entryLatency, metrics }) => ({
            name,
            entryLatency,
            metrics,
          }),
        ),
        lifecycle: report.lifecycle,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
}
