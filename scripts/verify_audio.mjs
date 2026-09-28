import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

// 通过真实浏览器离线渲染各层音乐、全部音效和生命周期场景，保存试听与测量数据。
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const baseUrl = process.env.ABYSSAL_DEV_URL || "http://127.0.0.1:5178";
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/audio_probe", (route) =>
  route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><title>Audio verification</title><button id="unlock">Enable audio test</button>',
  }),
);

try {
  await page.goto(`${baseUrl}/audio_probe`);
  await page.locator("#unlock").click();
  const result = await page.evaluate(async () => {
    const { OceanAudio } = await import("/src/audio.js");
    const sampleRate = 22050;
    let maximumVoices = 0;
    const setGain = (audio, node, value) => {
      node.gain.cancelScheduledValues(audio.context.currentTime);
      node.gain.setValueAtTime(value, audio.context.currentTime);
    };
    const silenceBed = (audio) => {
      setGain(audio, audio.music, 0);
      setGain(audio, audio.waterGain, 0);
      setGain(audio, audio.currentGain, 0);
    };
    const measure = (buffer, from = 0, to = buffer.duration) => {
      const left = buffer.getChannelData(0),
        right = buffer.getChannelData(1);
      const first = Math.floor(from * sampleRate),
        last = Math.min(left.length, Math.floor(to * sampleRate));
      let sum = 0,
        peak = 0,
        clipped = 0,
        invalid = 0,
        stereo = 0,
        dc = 0;
      let low = 0,
        lowMid = 0,
        lowSum = 0,
        midSum = 0,
        highSum = 0;
      const alphaLow = 1 - Math.exp((-2 * Math.PI * 240) / sampleRate);
      const alphaMid = 1 - Math.exp((-2 * Math.PI * 1600) / sampleRate);
      for (let index = first; index < last; index++) {
        const l = left[index],
          r = right[index],
          mono = (l + r) * 0.5;
        if (!Number.isFinite(l) || !Number.isFinite(r)) invalid++;
        peak = Math.max(peak, Math.abs(l), Math.abs(r));
        if (Math.abs(l) >= 0.985 || Math.abs(r) >= 0.985) clipped++;
        sum += (l * l + r * r) * 0.5;
        stereo += (l - r) ** 2;
        dc += mono;
        low += alphaLow * (mono - low);
        lowMid += alphaMid * (mono - lowMid);
        lowSum += low * low;
        midSum += (lowMid - low) ** 2;
        highSum += (mono - lowMid) ** 2;
      }
      const count = Math.max(1, last - first);
      return {
        rms: Math.sqrt(sum / count),
        peak,
        clipped,
        invalid,
        dc: dc / count,
        stereoRms: Math.sqrt(stereo / count),
        lowRms: Math.sqrt(lowSum / count),
        midRms: Math.sqrt(midSum / count),
        highRms: Math.sqrt(highSum / count),
      };
    };
    const render = async (
      duration,
      { configure = () => {}, tick = null, events = [] } = {},
    ) => {
      const context = new OfflineAudioContext(
        2,
        Math.ceil(sampleRate * duration),
        sampleRate,
      );
      const audio = new OceanAudio({ context });
      audio.start();
      if (!(await audio.prepareHumanVoices()))
        throw new Error("Recorded voices failed to load");
      if (!(await audio.prepareFishSounds()))
        throw new Error("Fish recordings failed to load");
      audio.reset();
      configure(audio);
      if (tick) tick(audio, 0);
      const times = new Set(events.map((event) => event.at));
      if (tick)
        for (let index = 1; index / 8 < duration - 0.02; index++)
          times.add(index / 8);
      const pending = [...times]
        .sort((a, b) => a - b)
        .map((at) =>
          context.suspend(at).then(async () => {
            try {
              if (tick) tick(audio, at);
              for (const event of events)
                if (Math.abs(event.at - at) < 0.000001) event.run(audio);
              maximumVoices = Math.max(maximumVoices, audio.voices.size);
            } finally {
              await context.resume();
            }
          }),
        );
      const buffer = await context.startRendering();
      await Promise.all(pending);
      return buffer;
    };
    const wav = (buffers) => {
      const frames = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const pcm = new Uint8Array(44 + frames * 4),
        view = new DataView(pcm.buffer);
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
      let frame = 0;
      for (const buffer of buffers) {
        const left = buffer.getChannelData(0),
          right = buffer.getChannelData(1);
        for (let index = 0; index < buffer.length; index++, frame++) {
          view.setInt16(
            44 + frame * 4,
            Math.round(Math.max(-1, Math.min(1, left[index])) * 32767),
            true,
          );
          view.setInt16(
            46 + frame * 4,
            Math.round(Math.max(-1, Math.min(1, right[index])) * 32767),
            true,
          );
        }
      }
      let binary = "";
      for (let offset = 0; offset < pcm.length; offset += 8192)
        binary += String.fromCharCode(...pcm.subarray(offset, offset + 8192));
      return btoa(binary);
    };

    // 连续混音用于验收海洋、追逐、领主三种状态间的真实过渡。
    const modes = ["calm", "chase", "boss"];
    const transition = await render(24, {
      tick(audio, at) {
        const section = Math.min(2, Math.floor(at / 8));
        audio.update(at, [0, 0.92, 1][section], {
          boss: section === 2,
          depth: [30, 210, 650][section],
        });
      },
    });
    const checks = modes.map((mode, section) => ({
      mode,
      ...measure(transition, section * 8 + 2, section * 8 + 7.8),
    }));

    // 分别静音其余总线，证明三条音乐轨和水体底噪各自确实存在。
    const stemBuffers = [],
      stemChecks = [];
    for (const mode of [...modes, "water"]) {
      const buffer = await render(10, {
        tick(audio, at) {
          audio.update(at, mode === "chase" ? 0.92 : mode === "boss" ? 1 : 0, {
            boss: mode === "boss",
            depth: mode === "water" ? 450 : 140,
          });
          setGain(audio, audio.calm, mode === "calm" ? 0.86 : 0);
          setGain(audio, audio.chase, mode === "chase" ? 1 : 0);
          setGain(audio, audio.bossLayer, mode === "boss" ? 1 : 0);
          setGain(audio, audio.effects, 0);
          if (mode !== "water") {
            setGain(audio, audio.waterGain, 0);
            setGain(audio, audio.currentGain, 0);
          }
        },
      });
      stemBuffers.push(buffer);
      stemChecks.push({ mode, ...measure(buffer, 1, 9.8) });
    }

    // 每个公共音效在独立静音背景下渲染，避免配乐掩盖缺失的音效。
    const effectCases = [
      ["eat", (audio) => audio.eat()],
      ["eat_fish", (audio) => audio.eatFish()],
      ["eat_human", (audio) => audio.eatHuman(1, "male")],
      ["eat_human_female", (audio) => audio.eatHuman(1, "female")],
      ["hit", (audio) => audio.hit()],
      ["sonar", (audio) => audio.sonar()],
      ["breach", (audio) => audio.breach()],
      ["splash", (audio) => audio.splash()],
      ["stamina", (audio) => audio.pickup("stamina")],
      ["flow", (audio) => audio.pickup("flow")],
      ["frenzy", (audio) => audio.pickup("frenzy")],
      ["hunter_shark", (audio) => audio.hunter("shark")],
      ["hunter_kraken", (audio) => audio.hunter("kraken")],
      ["boss_attack", (audio) => audio.bossAttack("leviathan")],
      ["victory", (audio) => audio.victory()],
      ["tone", (audio) => audio.tone(330, 0.7, 0.2, 220)],
    ];
    const effectBuffers = [],
      effectChecks = [];
    for (const [name, play] of effectCases) {
      const buffer = await render(3.5, {
        configure: silenceBed,
        events: [{ at: 0.125, run: play }],
      });
      effectBuffers.push(buffer);
      effectChecks.push({
        name,
        montageStart: (effectBuffers.length - 1) * 3.5,
        ...(name.startsWith("eat_")
          ? {
              onsetRms: measure(buffer, 0.14, 0.2).rms,
              sustainRms: measure(buffer, 0.285, 0.425).rms,
              tailRms: measure(buffer, 3.1, 3.5).rms,
            }
          : {}),
        ...measure(buffer),
      });
    }

    // 导出实际游戏音频图中的吞食变体和连续鱼群，不能用素材裸文件代替效果试听。
    const fishPlayback = [],
      fishPreview = [],
      fishChecks = [];
    const playFish = (audio, size = 1) => {
      const before = new Set(audio.feedingVoices.keys());
      audio.eatFish(size);
      const source = [...audio.feedingVoices.keys()].find(
        (node) => !before.has(node),
      );
      if (source)
        fishPlayback.push({
          variant: [0, 1, 2].find(
            (i) => source.buffer === audio.feedingBuffers.get(`fish_${i}`),
          ),
          rate: source.playbackRate.value,
          duration: source.buffer.duration,
          voices: audio.feedingVoices.size,
        });
    };
    for (let variant = 0; variant < 3; variant++) {
      const buffer = await render(1.5, {
        configure(audio) {
          silenceBed(audio);
          audio.lastFishVariant = variant - 1;
          audio.random = () => 0;
        },
        events: [{ at: 0.125, run: (audio) => playFish(audio) }],
      });
      fishPreview.push(buffer);
      fishChecks.push({ name: `fish_variant_${variant}`, ...measure(buffer) });
    }
    for (const depth of [25, 1800]) {
      const buffer = await render(4.5, {
        tick: (audio, at) => audio.update(at, 0, { depth }),
        events: Array.from({ length: 10 }, (_, i) => ({
          at: 0.5 + i * 0.15,
          run: (audio) => playFish(audio),
        })),
      });
      fishPreview.push(buffer);
      fishChecks.push({ name: `fish_school_${depth}`, ...measure(buffer) });
    }

    const stress = await render(5, {
      tick(audio, at) {
        audio.update(at, 1, { boss: true, depth: 650 });
      },
      events: [
        {
          at: 0.5,
          run(audio) {
            audio.eat(2);
            audio.eatFish(2);
            audio.eatHuman(2);
            audio.hit(1.6);
            audio.splash();
            audio.breach();
            audio.sonar();
            audio.pickup("frenzy");
            audio.bossAttack("hydra");
            audio.hunter("leviathan");
            audio.victory();
            for (let index = 0; index < 8; index++)
              audio.tone(140 + index * 37, 0.8, 0.2, 70);
          },
        },
      ],
    });

    const lifecycle = {};
    const gateBuffer = await render(3.5, {
      configure(audio) {
        silenceBed(audio);
        audio.tone(260, 2.2, 0.22);
      },
      events: [
        {
          at: 0.4,
          run(audio) {
            lifecycle.muted = audio.toggle() === false;
            const before = audio.voices.size;
            audio.hit();
            audio.eatFish();
            audio.eatHuman();
            lifecycle.mutedEffectSuppressed = before === audio.voices.size;
          },
        },
        {
          at: 0.9,
          run(audio) {
            lifecycle.unmuted = audio.toggle() === true;
            audio.sonar();
          },
        },
        {
          at: 1.5,
          run(audio) {
            audio.setPaused(true);
            const before = audio.voices.size;
            audio.eat();
            audio.eatFish();
            audio.eatHuman();
            lifecycle.pausedEffectSuppressed = before === audio.voices.size;
          },
        },
        {
          at: 1.9,
          run(audio) {
            audio.setPaused(false);
            audio.hit();
          },
        },
        {
          at: 2.4,
          run(audio) {
            const water = audio.waterSource,
              master = audio.master,
              context = audio.context;
            audio.reset();
            audio.start();
            silenceBed(audio);
            lifecycle.resetReusedGraph =
              water === audio.waterSource &&
              master === audio.master &&
              context === audio.context;
            lifecycle.resetClearedDanger =
              audio.lastDanger === 0 && audio.boss === false;
          },
        },
        {
          at: 2.75,
          run(audio) {
            audio.eat();
          },
        },
      ],
    });
    lifecycle.mutedRms = measure(gateBuffer, 0.69, 0.88).rms;
    lifecycle.pausedRms = measure(gateBuffer, 1.55, 1.88).rms;
    lifecycle.resumedRms = measure(gateBuffer, 1.91, 2.32).rms;
    lifecycle.resetTailRms = measure(gateBuffer, 2.56, 2.72).rms;
    lifecycle.newGameEffectRms = measure(gateBuffer, 2.76, 3.2).rms;

    const inkChecks = [];
    for (const ink of [0, 1]) {
      const buffer = await render(3, {
        tick(audio, at) {
          audio.update(at, 0, { ink, depth: 350 });
          silenceBed(audio);
        },
        events: [
          {
            at: 0.75,
            run(audio) {
              audio.breach();
            },
          },
        ],
      });
      inkChecks.push({ ink, ...measure(buffer, 0.75, 2.3) });
    }

    // 同时使用实时上下文验证浏览器的真实暂停、恢复及节点复用。
    const live = new OceanAudio();
    const firstToggle = live.toggle();
    await live.context.resume();
    if (!(await live.prepareHumanVoices()))
      throw new Error("Live recorded voices failed to load");
    // 直接核对真人采样路由，不用宽频能量差推断男女声或听感。
    const maleBuffer = live.feedingBuffers.get("human_male");
    const femaleBuffer = live.feedingBuffers.get("human_female");
    const recordedVoices = {
      ready: live.humanVoiceState === "ready",
      distinctBuffers: maleBuffer !== femaleBuffer,
      maleDuration: maleBuffer.duration,
      femaleDuration: femaleBuffer.duration,
      mono:
        maleBuffer.numberOfChannels === 1 &&
        femaleBuffer.numberOfChannels === 1,
    };
    const initialContext = live.context,
      initialWater = live.waterSource,
      initialMaster = live.master;
    live.start();
    live.start();
    live.reset();
    live.start();
    await new Promise((resolve) => setTimeout(resolve, 80));
    live.setPaused(true);
    await new Promise((resolve) => setTimeout(resolve, 70));
    const pausedAt = live.context.currentTime;
    await new Promise((resolve) => setTimeout(resolve, 70));
    const pausedClock = live.context.currentTime === pausedAt;
    live.setPaused(false);
    await new Promise((resolve) => setTimeout(resolve, 110));
    const resumedClock = live.context.currentTime > pausedAt + 0.035;
    const liveChecks = {
      firstToggle,
      graphReused:
        live.context === initialContext &&
        live.waterSource === initialWater &&
        live.master === initialMaster,
      pausedClock,
      resumedClock,
    };
    await live.context.close();

    return {
      checks,
      stemChecks,
      effectChecks,
      fishChecks,
      fishPlayback,
      stress: measure(stress),
      lifecycle,
      inkChecks,
      liveChecks,
      recordedVoices,
      maximumVoices,
      sampleRate,
      files: [
        { name: "audio_validation.wav", data: wav([transition]) },
        { name: "audio_music_stems.wav", data: wav(stemBuffers) },
        { name: "audio_effects.wav", data: wav(effectBuffers) },
        { name: "audio_fish_preview.wav", data: wav(fishPreview) },
        { name: "audio_stress.wav", data: wav([stress]) },
      ],
    };
  });

  for (const check of [
    ...result.checks,
    ...result.stemChecks,
    ...result.effectChecks,
    ...result.fishChecks,
    result.stress,
  ]) {
    const name = check.mode || check.name || "stress";
    assert.equal(check.invalid, 0, `${name} contains non-finite samples`);
    assert.equal(check.clipped, 0, `${name} has clipped samples`);
    assert.ok(check.peak < 0.9, `${name} lacks output headroom: ${check.peak}`);
    assert.ok(
      check.rms > (name === "water" ? 0.001 : 0.003),
      `${name} is effectively silent: ${check.rms}`,
    );
    assert.ok(
      Math.abs(check.dc) < 0.005,
      `${name} has excessive DC offset: ${check.dc}`,
    );
  }
  assert.ok(
    result.stemChecks[0].stereoRms > 0.005,
    "Calm pad stereo layer is absent",
  );
  assert.ok(
    result.stemChecks[1].lowRms > result.stemChecks[1].highRms * 2,
    "Chase track lacks low-frequency body",
  );
  assert.ok(
    result.maximumVoices < 180,
    `Voice count is unbounded: ${result.maximumVoices}`,
  );
  assert.deepEqual(
    result.fishPlayback.slice(0, 3).map((e) => e.variant),
    [0, 1, 2],
  );
  assert.ok(
    result.fishPlayback.length >= 18,
    "Dense fish school must retain audible feeding cues",
  );
  for (const entry of result.fishPlayback) {
    assert.ok(
      Number.isInteger(entry.variant),
      "Fish voice must use a decoded recording",
    );
    assert.ok(entry.rate >= 0.97 && entry.rate <= 1.03);
    assert.ok(entry.duration >= 0.34 && entry.duration <= 0.38);
    assert.ok(entry.voices <= 3);
  }
  const fish = result.effectChecks.find((entry) => entry.name === "eat_fish");
  const human = result.effectChecks.find((entry) => entry.name === "eat_human");
  assert.ok(
    human.sustainRms / human.onsetRms > (fish.sustainRms / fish.onsetRms) * 2,
    "Human vocal and fish transient have insufficient temporal separation",
  );
  const female = result.effectChecks.find(
    (entry) => entry.name === "eat_human_female",
  );
  assert.ok(
    female.sustainRms > 0.01,
    "Female vocal must produce sustained output",
  );
  assert.ok(
    result.recordedVoices.ready &&
      result.recordedVoices.distinctBuffers &&
      result.recordedVoices.mono,
    "Distinct recorded voices must decode and cache",
  );
  assert.ok(
    Math.abs(result.recordedVoices.maleDuration - 1.65) < 0.001,
    "Male recording duration changed",
  );
  assert.ok(
    Math.abs(result.recordedVoices.femaleDuration - 1) < 0.001,
    "Female recording duration changed",
  );
  for (const effect of [fish, human, female])
    assert.ok(effect.tailRms < 0.0003, `${effect.name} has an excessive tail`);
  for (const [name, value] of Object.entries(result.liveChecks))
    assert.ok(value, `Live lifecycle failed: ${name}`);
  for (const name of [
    "muted",
    "unmuted",
    "mutedEffectSuppressed",
    "pausedEffectSuppressed",
    "resetReusedGraph",
    "resetClearedDanger",
  ])
    assert.ok(result.lifecycle[name], `Lifecycle failed: ${name}`);
  assert.ok(
    result.lifecycle.mutedRms < 0.0003,
    "Sound toggle leaks audible audio",
  );
  assert.ok(result.lifecycle.pausedRms < 0.00001, "Paused audio leaks output");
  assert.ok(result.lifecycle.resumedRms > 0.003, "Audio does not resume");
  assert.ok(
    result.lifecycle.resetTailRms < 0.0003,
    "Old reverb persists after reset",
  );
  assert.ok(
    result.lifecycle.newGameEffectRms > 0.003,
    "New game effects do not restart",
  );
  assert.ok(
    result.inkChecks[1].highRms < result.inkChecks[0].highRms * 0.8,
    "Ink muffling does not reduce high-frequency energy",
  );
  assert.deepEqual(errors, []);
  await mkdir(".local", { recursive: true });
  for (const file of result.files)
    await writeFile(`.local/${file.name}`, Buffer.from(file.data, "base64"));
  delete result.files;
  await writeFile(
    ".local/audio_validation.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
