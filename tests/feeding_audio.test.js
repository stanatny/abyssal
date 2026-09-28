import assert from "node:assert/strict";
import test from "node:test";
import { OceanAudio } from "../src/audio.js";
import { createFeedingSound } from "../src/feeding_audio.js";

function rms(samples, sampleRate, from, to) {
  const first = Math.floor(from * sampleRate);
  const last = Math.min(samples.length, Math.floor(to * sampleRate));
  let sum = 0;
  for (let index = first; index < last; index++) sum += samples[index] ** 2;
  return Math.sqrt(sum / (last - first));
}

test("资源未就绪时的柔水流PCM短促、低峰值、无削波且首尾收拢", () => {
  for (const rate of [22050, 44100, 48000]) {
    const samples = createFeedingSound("fish", rate),
      duration = samples.length / rate;
    assert.equal(duration, 0.3);
    let peak = 0,
      mean = 0;
    for (const value of samples) {
      assert.ok(Number.isFinite(value));
      peak = Math.max(peak, Math.abs(value));
      mean += value;
    }
    assert.ok(peak > 0.1 && peak <= 0.3000001);
    assert.ok(Math.abs(mean / samples.length) < 0.001);
    assert.equal(samples[0], 0);
    assert.ok(Math.abs(samples.at(-1)) < 0.00002);
    assert.ok(rms(samples, rate, 0, duration) > 0.02);
    assert.ok(rms(samples, rate, duration - 0.02, duration) < 0.003);
    assert.ok(
      rms(samples, rate, 0.16, 0.3) / rms(samples, rate, 0.01, 0.07) < 0.35,
    );
  }
});

test("鱼声可重复合成，旧合成人声入口和非法采样率明确拒绝", () => {
  assert.deepEqual(
    createFeedingSound("fish", 22050),
    createFeedingSound("fish", 22050),
  );
  for (const kind of ["human", "unknown"])
    assert.throws(() => createFeedingSound(kind, 22050), RangeError);
  for (const rate of [Number.NaN, 7999, 192001])
    assert.throws(() => createFeedingSound("fish", rate), RangeError);
});

// Web Audio 调度替身只验证节点生命周期；实际输出音量由 verify_audio 离线浏览器验收。
function fishBuffers() {
  return new Map(
    [0.34, 0.36, 0.38].map((duration, variant) => [
      String(variant),
      { duration, variant },
    ]),
  );
}

function audioFixture({
  ready = true,
  humanVoiceBank,
  fishReady = false,
  fishBiteBank = {
    preload: () => Promise.resolve(),
    load: () => Promise.resolve(fishBuffers()),
  },
} = {}) {
  const nodes = [];
  const parameter = () => ({
    value: 0,
    events: [],
    setValueAtTime(value, time) {
      this.events.push({ method: "set", value, time });
      this.value = value;
    },
    setTargetAtTime(value, time) {
      this.events.push({ method: "target", value, time });
      this.value = value;
    },
    linearRampToValueAtTime(value, time) {
      this.events.push({ method: "linear", value, time });
      this.value = value;
    },
    exponentialRampToValueAtTime(value, time) {
      this.events.push({ method: "exponential", value, time });
      this.value = value;
    },
    cancelScheduledValues() {},
    cancelAndHoldAtTime() {},
  });
  const node = () => {
    const value = {
      gain: parameter(),
      frequency: parameter(),
      Q: parameter(),
      pan: parameter(),
      threshold: parameter(),
      knee: parameter(),
      ratio: parameter(),
      attack: parameter(),
      release: parameter(),
      playbackRate: parameter(),
      stoppedAt: Infinity,
      disconnected: false,
      connections: [],
      connect(destination) {
        this.connections.push(destination);
        return destination;
      },
      disconnect() {
        this.disconnected = true;
      },
      start(at = 0) {
        this.startedAt = at;
      },
      stop(at) {
        this.stoppedAt = Math.min(this.stoppedAt, at);
      },
      finish() {
        this.onended?.();
      },
    };
    nodes.push(value);
    return value;
  };
  const context = {
    currentTime: 0,
    sampleRate: 22050,
    state: "running",
    destination: node(),
    createGain: node,
    createBiquadFilter: node,
    createDynamicsCompressor: node,
    createWaveShaper: node,
    createConvolver: node,
    createBufferSource: node,
    createStereoPanner: node,
    createPeriodicWave: () => ({}),
    decodeAudioData() {
      throw new Error("Unexpected decoder call in scheduling fixture");
    },
    createBuffer(channels, length, rate) {
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length),
      );
      return {
        duration: length / rate,
        getChannelData: (channel) => data[channel],
      };
    },
    // 标识离线环境，暂停无需真正改变主线程时钟。
    startRendering() {},
  };
  const audio = new OceanAudio({ context, humanVoiceBank, fishBiteBank });
  audio.createGraph();
  if (ready) {
    audio.feedingBuffers.set("human_male", { duration: 1.84, sex: "male" });
    audio.feedingBuffers.set("human_female", {
      duration: 1.82159375,
      sex: "female",
    });
    audio.humanVoiceState = "ready";
  }
  if (fishReady) {
    for (const [variant, buffer] of fishBuffers())
      audio.feedingBuffers.set(`fish_${variant}`, buffer);
    audio.fishSoundState = "ready";
  }
  return { audio, context, nodes };
}

test("吞食密集连发最多三声，人声仅一声且优先于重复小鱼音效", () => {
  const { audio, context } = audioFixture();
  for (let index = 0; index < 3; index++) {
    context.currentTime = index * 0.1;
    audio.eatFish();
    audio.eatFish();
  }
  assert.equal(audio.feedingVoices.size, 3);
  const oldest = audio.feedingVoices.keys().next().value;
  context.currentTime = 0.3;
  audio.eatFish();
  assert.equal(audio.feedingVoices.size, 3);
  audio.eatHuman();
  assert.equal(oldest.stoppedAt, 0.3);
  oldest.finish();
  audio.eatHuman();
  assert.deepEqual([...audio.feedingVoices.values()].sort(), [
    "fish",
    "fish",
    "human",
  ]);
  assert.equal(audio.voices.size, 3);
  for (const source of [...audio.feedingVoices.keys()]) {
    assert.equal(source.loop, false);
    assert.ok(
      source.stoppedAt - source.startedAt <
        (audio.feedingVoices.get(source) === "human" ? 1.9 : 0.8),
    );
    source.finish();
    assert.equal(source.disconnected, true);
  }
  assert.equal(audio.feedingVoices.size, 0);
  assert.equal(audio.voices.size, 0);
});

test("真人录音不会重叠播放，配乐让位不被随后的鱼声提前解除", () => {
  const { audio, context } = audioFixture();
  const ducks = [];
  audio.duckMusic = (level, hold) => ducks.push({ level, hold });
  audio.eatHuman();
  const first = [...audio.feedingVoices.keys()][0];
  assert.ok(audio.cooldowns.get("eat_human") > first.stoppedAt);
  assert.ok(
    Math.abs(audio.cooldowns.get("eat_human") - first.buffer.duration - 0.12) <
      1e-9,
  );
  assert.equal(first.playbackRate.value, 1);
  assert.ok(ducks[0].hold >= 1 && ducks[0].hold <= first.buffer.duration);
  assert.ok(ducks[0].level < 0.75);
  context.currentTime = 0.1;
  audio.eatFish();
  assert.equal(ducks.length, 1);
  context.currentTime = 0.95;
  audio.eatHuman();
  assert.equal(
    [...audio.feedingVoices.values()].filter((kind) => kind === "human").length,
    1,
  );
  context.currentTime = first.stoppedAt + 0.001;
  first.finish();
  audio.eatHuman();
  assert.equal([...audio.feedingVoices.values()].includes("human"), false);
  context.currentTime = audio.cooldowns.get("eat_human") + 0.001;
  audio.eatHuman();
  const second = [...audio.feedingVoices.keys()].find(
    (source) => audio.feedingVoices.get(source) === "human",
  );
  assert.strictEqual(first.buffer, second.buffer, "再次播放必须复用已解码录音");
  assert.equal(ducks.length, 2);
});

test("静音和暂停不创建吞食声源，重开清尾音并复用缓存与主音频图", () => {
  const { audio, context } = audioFixture();
  audio.eatFish();
  audio.eatHuman();
  const sources = [...audio.feedingVoices.keys()];
  const buffers = [...audio.feedingBuffers.values()];
  const water = audio.waterSource,
    master = audio.master;
  context.currentTime = 1;
  audio.toggle();
  audio.eatFish();
  audio.eatHuman();
  assert.equal(audio.voices.size, 2);
  audio.toggle();
  audio.setPaused(true);
  audio.eatFish();
  audio.eatHuman();
  assert.equal(audio.voices.size, 2);
  audio.reset();
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.feedingVoices.size, 0);
  assert.equal(audio.cooldowns.size, 0);
  for (const source of sources) {
    assert.equal(source.stoppedAt <= context.currentTime, true);
    source.finish();
    assert.equal(source.disconnected, true);
  }
  audio.setPaused(false);
  audio.eatFish();
  audio.eatHuman();
  assert.equal(audio.voices.size, 2);
  assert.equal(audio.waterSource, water);
  assert.equal(audio.master, master);
  assert.deepEqual([...audio.feedingBuffers.values()], buffers);
});

test("男女录音共用人声限流、保持原速，重开复用各自缓存", () => {
  const { audio, context, nodes } = audioFixture();
  const begin = nodes.length;
  audio.eatHuman(1, "male");
  const male = [...audio.feedingVoices.keys()][0];
  audio.eatHuman(1, "female");
  assert.equal(audio.feedingVoices.size, 1);
  assert.equal(audio.feedingBuffers.size, 2);
  assert.equal(male.playbackRate.value, 1);
  const added = nodes.slice(begin),
    filter = added.find((node) => node.type === "lowpass");
  assert.ok(filter, "Human voice must pass through a water lowpass");
  const events = filter.frequency.events;
  assert.ok(events.length >= 2);
  assert.ok(events.at(-1).value < events[0].value * 0.5);
  assert.ok(events.at(-1).time > events[0].time + 0.5);
  assert.ok(
    added.some((node) => node.gain.value >= 0.35 && node.gain.value <= 0.45),
  );
  context.currentTime = audio.cooldowns.get("eat_human") + 0.001;
  male.finish();
  audio.eatHuman(1, "female");
  const female = [...audio.feedingVoices.keys()][0];
  assert.notStrictEqual(female.buffer, male.buffer);
  assert.equal(female.playbackRate.value, 1);
  assert.strictEqual(audio.feedingBuffers.get("human_male"), male.buffer);
  assert.strictEqual(audio.feedingBuffers.get("human_female"), female.buffer);
  for (const sex of ["female", "male"]) {
    audio.reset();
    audio.eatHuman(1, sex);
    assert.strictEqual(
      [...audio.feedingVoices.keys()][0].buffer,
      sex === "female" ? female.buffer : male.buffer,
    );
  }
});

test("真人加载期间捕食只播短水声，准备完成也不会延迟补播惨叫", async () => {
  let resolveLoad,
    loads = 0,
    preloads = 0;
  const promise = new Promise((resolve) => {
    resolveLoad = resolve;
  });
  const humanVoiceBank = {
    preload() {
      preloads++;
      return Promise.resolve();
    },
    load() {
      loads++;
      return promise;
    },
  };
  const { audio } = audioFixture({ ready: false, humanVoiceBank });
  await audio.preloadHumanVoices();
  assert.equal(preloads, 1);
  const preparation = audio.prepareHumanVoices();
  const concurrent = audio.prepareHumanVoices();
  assert.equal(audio.humanVoiceState, "loading");
  audio.eatHuman(1, "female");
  assert.deepEqual([...audio.feedingVoices.values()], ["fish"]);
  const before = [...audio.feedingVoices.keys()];
  resolveLoad(
    new Map([
      ["male", { duration: 1.84 }],
      ["female", { duration: 1.82159375 }],
    ]),
  );
  assert.equal(await preparation, true);
  assert.equal(await concurrent, true);
  assert.equal(loads, 1);
  assert.equal(audio.humanVoiceState, "ready");
  assert.deepEqual([...audio.feedingVoices.keys()], before);
  assert.equal(audio.cooldowns.has("eat_human"), false);
  audio.eatHuman(1, "female");
  assert.deepEqual([...audio.feedingVoices.values()], ["fish", "human"]);
  assert.strictEqual(
    [...audio.feedingVoices.keys()].at(-1).buffer,
    audio.feedingBuffers.get("human_female"),
  );
});

test("真人下载或解码失败不合成人声，显式再次准备可以恢复", async () => {
  let loads = 0;
  const buffers = new Map([
    ["male", { duration: 1.84 }],
    ["female", { duration: 1.82159375 }],
  ]);
  const humanVoiceBank = {
    preload: () => Promise.resolve(),
    load() {
      loads++;
      return loads === 1
        ? Promise.reject(new Error("Decode failed"))
        : Promise.resolve(buffers);
    },
  };
  const { audio } = audioFixture({ ready: false, humanVoiceBank });
  assert.equal(await audio.prepareHumanVoices(), false);
  assert.equal(audio.humanVoiceState, "unavailable");
  audio.eatHuman();
  assert.deepEqual([...audio.feedingVoices.values()], ["fish"]);
  assert.equal(audio.feedingBuffers.has("human_male"), false);
  assert.equal(await audio.prepareHumanVoices(), true);
  assert.equal(audio.humanVoiceState, "ready");
  assert.equal(loads, 2);
  assert.deepEqual([...audio.feedingVoices.values()], ["fish"]);
  audio.eatHuman();
  assert.strictEqual(
    [...audio.feedingVoices.keys()].at(-1).buffer,
    buffers.get("male"),
  );
});

test("准备真人录音跨越暂停或重开时没有补播队列", async () => {
  for (const reset of [false, true]) {
    let resolveLoad;
    const { audio } = audioFixture({
      ready: false,
      humanVoiceBank: {
        load: () =>
          new Promise((resolve) => {
            resolveLoad = resolve;
          }),
      },
    });
    const preparation = audio.prepareHumanVoices();
    audio.eatHuman();
    if (reset) audio.reset();
    else audio.setPaused(true);
    const before = [...audio.feedingVoices.keys()];
    resolveLoad(
      new Map([
        ["male", { duration: 1.84 }],
        ["female", { duration: 1.82159375 }],
      ]),
    );
    await preparation;
    assert.deepEqual([...audio.feedingVoices.keys()], before);
    if (!reset) audio.setPaused(false);
    assert.deepEqual([...audio.feedingVoices.keys()], before);
  }
});

test("开始游戏自动准备真人录音，重复start共用同一准备任务", async () => {
  let loads = 0,
    resolveLoad;
  const { audio } = audioFixture({
    ready: false,
    humanVoiceBank: {
      load: () => {
        loads++;
        return new Promise((resolve) => {
          resolveLoad = resolve;
        });
      },
    },
  });
  // 此用例仅检查开始入口的异步准备，音乐节拍由独立音频浏览器验收覆盖。
  audio.update = () => {};
  audio.start();
  audio.start();
  assert.equal(loads, 1);
  assert.equal(audio.humanVoiceState, "loading");
  assert.equal(audio.feedingVoices.size, 0);
  resolveLoad(
    new Map([
      ["male", { duration: 1.84 }],
      ["female", { duration: 1.82159375 }],
    ]),
  );
  assert.equal(await audio.prepareHumanVoices(), true);
  audio.start();
  assert.equal(loads, 1);
  assert.equal(audio.feedingVoices.size, 0);
});

test("水声录音相邻不重复、复用三个缓存，冷却拒绝不消耗变体", () => {
  const { audio, context } = audioFixture({ fishReady: true });
  const cache = new Map(audio.feedingBuffers),
    played = new Set();
  let previous;
  for (let index = 0; index < 18; index++) {
    context.currentTime = index * 0.12;
    audio.eatFish();
    const source = [...audio.feedingVoices.keys()].at(-1);
    assert.ok(source, "Allowed event must create one source");
    assert.equal(source.buffer, cache.get(`fish_${audio.lastFishVariant}`));
    assert.notEqual(source.buffer, previous);
    assert.ok(
      source.playbackRate.value >= 0.97 && source.playbackRate.value <= 1.03,
    );
    assert.equal(source.loop, false);
    played.add(source.buffer);
    previous = source.buffer;
    const variant = audio.lastFishVariant,
      randomState = audio.randomState;
    audio.eatFish();
    assert.equal(audio.feedingVoices.size, 1);
    assert.equal(audio.lastFishVariant, variant);
    assert.equal(audio.randomState, randomState);
    source.finish();
    assert.equal(source.disconnected, true);
  }
  assert.equal(played.size, 3);
  assert.deepEqual(audio.feedingBuffers, cache);
  assert.equal(audio.voices.size, 0);
});

test("水声预取不创建音频图，准备期间即时兜底且完成不补播", async () => {
  let preloads = 0,
    loads = 0,
    resolveLoad;
  const fishBiteBank = {
    preload: async () => {
      preloads++;
    },
    load: () => {
      loads++;
      return new Promise((resolve) => {
        resolveLoad = resolve;
      });
    },
  };
  const menuAudio = new OceanAudio({ fishBiteBank });
  assert.equal(await menuAudio.preloadFishSounds(), true);
  assert.equal(preloads, 1);
  assert.equal(menuAudio.context, null);
  assert.equal(menuAudio.ready, false);
  const { audio, context } = audioFixture({ fishBiteBank });
  const preparation = audio.prepareFishSounds();
  assert.strictEqual(audio.prepareFishSounds(), preparation);
  assert.equal(audio.fishSoundState, "loading");
  audio.eatFish();
  const fallback = [...audio.feedingVoices.keys()][0];
  assert.equal(fallback.buffer.duration, 0.3);
  assert.equal(fallback.buffer, audio.feedingBuffers.get("fish"));
  const before = [...audio.feedingVoices.keys()];
  resolveLoad(fishBuffers());
  assert.equal(await preparation, true);
  assert.equal(loads, 1);
  assert.equal(audio.fishSoundState, "ready");
  assert.deepEqual([...audio.feedingVoices.keys()], before);
  context.currentTime = 0.12;
  audio.eatFish();
  const recorded = [...audio.feedingVoices.keys()].at(-1);
  assert.equal(
    recorded.buffer,
    audio.feedingBuffers.get(`fish_${audio.lastFishVariant}`),
  );
  assert.notEqual(recorded.buffer, fallback.buffer);
});

test("水声失败可重试且不影响已就绪人声，人声失败也不阻塞水声", async () => {
  let loads = 0;
  const { audio } = audioFixture({
    fishBiteBank: {
      preload: () => Promise.reject(new Error("Offline")),
      load: () =>
        ++loads === 1
          ? Promise.reject(new Error("Decode failed"))
          : Promise.resolve(fishBuffers()),
    },
  });
  assert.equal(await audio.preloadFishSounds(), false);
  assert.equal(await audio.prepareFishSounds(), false);
  assert.equal(audio.fishSoundState, "unavailable");
  audio.eatHuman(1, "female");
  assert.equal(
    [...audio.feedingVoices.keys()][0].buffer,
    audio.feedingBuffers.get("human_female"),
  );
  audio.eatFish();
  assert.equal([...audio.feedingVoices.keys()].at(-1).buffer.duration, 0.3);
  const before = [...audio.feedingVoices.keys()];
  assert.equal(await audio.prepareFishSounds(), true);
  assert.equal(audio.fishSoundState, "ready");
  assert.equal(loads, 2);
  assert.deepEqual([...audio.feedingVoices.keys()], before);
  const second = audioFixture({
    ready: false,
    humanVoiceBank: { load: () => Promise.reject(new Error("No human voice")) },
  }).audio;
  assert.deepEqual(
    await Promise.all([
      second.prepareHumanVoices(),
      second.prepareFishSounds(),
    ]),
    [false, true],
  );
  second.eatFish();
  assert.equal(
    [...second.feedingVoices.keys()][0].buffer,
    second.feedingBuffers.get(`fish_${second.lastFishVariant}`),
  );
});

test("水声加载跨越暂停或重开不补播，静音不创建声源", async () => {
  for (const mode of ["pause", "reset", "mute"]) {
    let resolveLoad;
    const { audio } = audioFixture({
      fishBiteBank: {
        load: () =>
          new Promise((resolve) => {
            resolveLoad = resolve;
          }),
      },
    });
    const preparation = audio.prepareFishSounds();
    audio.eatFish();
    if (mode === "pause") audio.setPaused(true);
    if (mode === "reset") audio.reset();
    if (mode === "mute") audio.toggle();
    const before = [...audio.feedingVoices.keys()];
    resolveLoad(fishBuffers());
    assert.equal(await preparation, true);
    assert.deepEqual([...audio.feedingVoices.keys()], before);
    if (mode !== "reset") {
      audio.eatFish();
      assert.deepEqual([...audio.feedingVoices.keys()], before);
    }
    if (mode === "pause") audio.setPaused(false);
    if (mode === "mute") audio.toggle();
    assert.deepEqual([...audio.feedingVoices.keys()], before);
  }
});

test("开始入口独立准备水声，重复开始不重解码且重开保留缓存", async () => {
  let loads = 0;
  const { audio } = audioFixture({
    humanVoiceBank: { load: () => Promise.resolve(new Map()) },
    fishBiteBank: {
      load: () => {
        loads++;
        return Promise.resolve(fishBuffers());
      },
    },
  });
  audio.update = () => {};
  audio.start();
  audio.start();
  assert.equal(await audio.prepareFishSounds(), true);
  assert.equal(loads, 1);
  audio.eatFish();
  const source = [...audio.feedingVoices.keys()][0],
    cache = new Map(audio.feedingBuffers);
  audio.reset();
  assert.equal(audio.feedingVoices.size, 0);
  assert.equal(source.stoppedAt, 0);
  source.finish();
  assert.equal(source.disconnected, true);
  assert.deepEqual(audio.feedingBuffers, cache);
  audio.start();
  assert.equal(loads, 1);
  audio.eatFish();
  assert.ok(
    [...cache.values()].includes([...audio.feedingVoices.keys()][0].buffer),
  );
});
