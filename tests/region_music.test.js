import assert from "node:assert/strict";
import test from "node:test";
import { OceanAudio } from "../src/audio.js";
import { AtlantisMusic, ATLANTIS_SCORE } from "../src/music_atlantis.js";
import { EUROPA_SCORE } from "../src/music_europa.js";

// 这里只验证乐句结构与调度契约，原生音频图另由浏览器脚本渲染验收。
function fixture() {
  const nodes = [];
  const parameter = () => ({
    value: 0,
    events: [],
    setValueAtTime(value, time) {
      this.value = value;
      this.events.push({ value, time });
    },
    setTargetAtTime(value, time, constant) {
      this.value = value;
      this.events.push({ value, time, constant });
    },
    linearRampToValueAtTime(value, time) {
      this.value = value;
      this.events.push({ value, time });
    },
    exponentialRampToValueAtTime(value, time) {
      this.value = value;
      this.events.push({ value, time });
    },
    cancelScheduledValues() {},
    cancelAndHoldAtTime() {},
  });
  const node = () => {
    const n = {
      gain: parameter(),
      frequency: parameter(),
      Q: parameter(),
      detune: parameter(),
      pan: parameter(),
      threshold: parameter(),
      knee: parameter(),
      ratio: parameter(),
      attack: parameter(),
      release: parameter(),
      playbackRate: parameter(),
      connect(to) {
        return to;
      },
      disconnect() {
        this.disconnected = true;
      },
      start(at = 0) {
        this.started = at;
      },
      stop(at) {
        this.stopped = at;
      },
      setPeriodicWave() {},
    };
    nodes.push(n);
    return n;
  };
  const context = {
    currentTime: 0,
    sampleRate: 8000,
    state: "running",
    destination: node(),
    createGain: node,
    createBiquadFilter: node,
    createOscillator: node,
    createBufferSource: node,
    createStereoPanner: node,
    createDynamicsCompressor: node,
    createWaveShaper: node,
    createConvolver: node,
    createPeriodicWave: () => ({}),
    startRendering() {},
    createBuffer(channels, length, sampleRate) {
      const data = Array.from(
        { length: channels },
        () => new Float32Array(length),
      );
      return {
        duration: length / sampleRate,
        getChannelData: (index) => data[index],
      };
    },
  };
  const audio = new OceanAudio({ context });
  audio.createGraph();
  return { audio, context, nodes };
}

test("Europa pursuit starts from actual pursuit even at zero danger, skips old beats and uses tonal score voices", () => {
  const { audio, context } = fixture();
  audio.setRegion("europa");
  const score = audio.europaMusic,
    notes = [],
    noises = [];
  audio.note = (...args) => notes.push(args);
  audio.noise = (...args) => noises.push(args);
  audio.drum = (...args) => noises.push(args);
  audio.update(0, 0, { pursuing: false });
  context.currentTime = 0.31;
  audio.update(0.31, 0, { pursuing: true });
  assert.ok(notes.some((n) => n[4] === score.pursuit && n[1] < 0.35));
  const count = notes.length;
  audio.update(0.31, 0, { pursuing: true });
  assert.equal(notes.length, count);
  context.currentTime = 40;
  audio.update(40, 0, { pursuing: true });
  assert.ok(notes.length - count <= 10);
  for (let i = 0; i < 96; i++) score.schedule(50 + i, i);
  for (let i = 0; i < 32; i++) score.scheduleCombat(200 + i / 4, i);
  assert.equal(noises.length, 0);
  audio.setPaused(true);
  const pausedCount = notes.length;
  context.currentTime = 42;
  audio.update(42, 1, { boss: true });
  assert.equal(notes.length, pausedCount);
});

test("Europa reduces ambient noise and wet mix locally, while switching to Earth restores the existing mix", () => {
  const { audio, context } = fixture();
  // 环境声带慢起伏，区域比例比较使用同一音频时刻。
  context.currentTime = 1;
  audio.update(0, 0, { depth: 400, pursuing: false });
  const water = audio.waterGain.gain.value,
    current = audio.currentGain.gain.value;
  audio.setRegion("europa");
  context.currentTime = 1;
  audio.update(1, 0, { depth: 400, pursuing: false });
  assert.ok(
    Math.abs(audio.waterGain.gain.value - water * EUROPA_SCORE.ambientWater) <
      1e-9,
  );
  assert.ok(
    Math.abs(
      audio.currentGain.gain.value - current * EUROPA_SCORE.ambientCurrent,
    ) < 1e-9,
  );
  assert.equal(audio.musicWet.gain.value, 0.11);
  for (const region of ["hawaii", "atlantis", "bermuda", "mariana"]) {
    audio.setRegion(region);
    audio.update(context.currentTime, 0, { depth: 400, pursuing: false });
    assert.equal(audio.waterGain.gain.value, water);
    assert.equal(audio.currentGain.gain.value, current);
    assert.equal(audio.musicWet.gain.value, 0.26);
  }
});

test("选区可在用户手势前设置，不激活上下文；未知区域保留夏威夷主题", () => {
  const audio = new OceanAudio();
  assert.equal(audio.setRegion("atlantis"), "atlantis");
  assert.equal(audio.context, null);
  assert.equal(audio.ready, false);
  assert.equal(audio.beat, ATLANTIS_SCORE.beat);
  audio.reset();
  assert.equal(audio.regionId, "atlantis");
  assert.equal(audio.setRegion("unknown"), "hawaii");
  assert.equal(audio.beat, 0.75);
});

test("遗城乐句超过两分钟，和声和动机具有独立发展而非更换音量", () => {
  assert.ok(
    (ATLANTIS_SCORE.harmony.length *
      ATLANTIS_SCORE.phraseSteps *
      ATLANTIS_SCORE.beat) /
      2 >
      140,
  );
  assert.equal(new Set(ATLANTIS_SCORE.harmony.map(String)).size, 8);
  assert.equal(new Set(ATLANTIS_SCORE.motifs.map(String)).size, 8);
  for (const motif of ATLANTIS_SCORE.motifs) {
    assert.ok(motif.length >= 2 && motif.length <= 3);
    assert.ok(motif.every(([step]) => step >= 3 && step < 29));
  }
});

test("不同区域选择不同编排，反复切图复用主图与遗城总线", () => {
  const { audio, context } = fixture();
  const master = audio.master,
    water = audio.waterSource;
  let hawaii = 0,
    atlantis = 0;
  audio.scheduleMusicStep = () => hawaii++;
  audio.update(0, 0);
  assert.equal(hawaii, 1);
  audio.setRegion("atlantis");
  const score = audio.atlantisMusic;
  assert.ok(score instanceof AtlantisMusic);
  score.schedule = () => atlantis++;
  for (let i = 0; i < 6; i++) {
    audio.setRegion(i % 2 ? "atlantis" : "hawaii");
    context.currentTime += 0.5;
    audio.update(0, 0.7, { boss: true, depth: 400 });
  }
  assert.equal(audio.atlantisMusic, score);
  assert.equal(audio.master, master);
  assert.equal(audio.waterSource, water);
  assert.ok(hawaii > 1 && atlantis > 1);
  assert.ok(audio.retiredMusicRooms.length <= 1);
});

test("遗城追逐与领主增加独立乐器，深度平滑增加压力层", () => {
  const { audio, context } = fixture();
  audio.setRegion("atlantis");
  audio.update(0, 0, { depth: 10 });
  const score = audio.atlantisMusic;
  const shallow = score.pressure.gain.value;
  context.currentTime = 1;
  audio.update(1, 0.8, { depth: 500 });
  assert.ok(score.pressure.gain.value > shallow);
  assert.ok(score.pursuit.gain.value > 0.6);
  assert.equal(score.guardian.gain.value, 0);
  audio.update(1, 0.8, { boss: true, depth: 500 });
  assert.equal(score.guardian.gain.value, 1.05);
  const events = [];
  audio.note = (...args) => events.push({ kind: "note", destination: args[4] });
  audio.noise = (...args) =>
    events.push({ kind: "noise", destination: args[3] });
  score.schedule(2, 0);
  score.scheduleCombat(2, 0);
  assert.ok(events.some((e) => e.destination === score.pursuit));
  assert.ok(events.some((e) => e.destination === score.guardian));
  assert.ok(events.some((e) => e.destination === score.exploration));
});

test("掉帧跳过旧拍，静音或暂停无新乐句，重开保留区域并清音乐源", () => {
  const { audio, context } = fixture();
  audio.setRegion("atlantis");
  audio.update(0, 0);
  const sources = [...audio.musicVoices.keys()];
  assert.ok(sources.length > 0);
  let scheduled = 0;
  audio.atlantisMusic.schedule = () => scheduled++;
  context.currentTime = 48;
  audio.update(48, 0);
  assert.ok(scheduled <= 1);
  audio.toggle();
  assert.equal(audio.musicVoices.size, 0);
  assert.ok(sources.every((source) => source.stopped <= 48.081));
  context.currentTime = 50;
  const before = scheduled;
  audio.update(50, 1, { boss: true });
  assert.equal(scheduled, before);
  audio.toggle();
  audio.setPaused(true);
  audio.reset();
  audio.update(50, 1, { boss: true });
  assert.equal(scheduled, before);
  assert.equal(audio.regionId, "atlantis");
  assert.equal(audio.musicVoices.size, 0);
  assert.equal(audio.voices.size, 0);
  audio.setPaused(false);
  audio.update(50, 0);
  assert.ok(scheduled <= before + 1);
});

test("切区仅清音乐声源，不中止已开始的真人捕食声", () => {
  const { audio } = fixture();
  audio.feedingBuffers.set("human_female", { duration: 1.8 });
  audio.eatHuman(1, "female");
  const source = [...audio.feedingVoices.keys()][0];
  const end = source.stopped;
  audio.setRegion("atlantis");
  assert.equal(source.stopped, end);
  assert.ok(audio.feedingVoices.has(source));
  assert.equal(audio.feedingBuffers.get("human_female").duration, 1.8);
});

test("取消尚未起音的预排音乐直接结束源，不把默认增益变成淡出爆音", () => {
  const { audio, context } = fixture();
  audio.setRegion("atlantis");
  audio.update(0, 0);
  const scheduled = [...audio.musicVoices.entries()];
  assert.ok(scheduled.length > 8);
  assert.ok(scheduled.every(([, voice]) => voice.onset > context.currentTime));
  const events = scheduled.map(([, voice]) => voice.gain.events.length);
  audio.reset();
  for (const [index, [source, voice]] of scheduled.entries()) {
    assert.equal(source.stopped, context.currentTime);
    assert.equal(voice.gain.events.length, events[index]);
  }
});

test("已暂停的原生时钟在重置时立即结束旧音乐，重入不等待旧淡出", () => {
  const { audio, context } = fixture();
  audio.setRegion("atlantis");
  audio.update(0, 0);
  const sources = [...audio.musicVoices.keys()];
  context.currentTime = 1;
  audio.setPaused(true);
  context.state = "suspended";
  delete context.startRendering;
  audio.reset();
  assert.ok(sources.length > 0);
  assert.ok(sources.every((source) => source.stopped === context.currentTime));
  assert.equal(audio.musicVoices.size, 0);
  assert.equal(audio.voices.size, 0);
});

for (const region of ["atlantis", "hawaii"]) {
  test(`${region}真实追击标志在探索落点之间立即起拍，低危险值也有明确战斗声部`, () => {
    const { audio, context } = fixture();
    audio.setRegion(region);
    audio.update(0, 0, { pursuing: false });
    context.currentTime = 1;
    audio.step = 1;
    audio.nextStep = 2;
    const calls = [];
    audio.note = (...args) => calls.push({ at: args[1], destination: args[4] });
    audio.update(1, 0.1, { pursuing: true });
    const bus =
      region === "atlantis" ? audio.atlantisMusic.pursuit : audio.chase;
    assert.ok(
      calls.some((call) => call.destination === bus && call.at <= 1.025),
    );
    assert.ok(bus.gain.value >= 0.9);
    assert.ok(
      (region === "atlantis" ? audio.atlantisMusic.exploration : audio.calm)
        .gain.value < 0.5,
    );
    const rise = bus.gain.events.at(-1).constant;
    audio.update(1, 0, { pursuing: false });
    assert.equal(bus.gain.value, 0);
    assert.ok(bus.gain.events.at(-1).constant >= rise * 6);
  });
}

test("显式非追击状态不被残留危险值重新点燃，领主仍独立激活", () => {
  const { audio } = fixture();
  audio.setRegion("atlantis");
  audio.update(0, 0.8, { pursuing: false, boss: false });
  assert.equal(audio.atlantisMusic.combatActive, false);
  assert.equal(audio.atlantisMusic.pursuit.gain.value, 0);
  audio.update(0, 0, { pursuing: false, boss: true });
  assert.equal(audio.atlantisMusic.combatActive, true);
  assert.ok(audio.atlantisMusic.guardian.gain.value > 1);
});

test("独立追击时钟跳过掉帧、静音不补拍，重复update不重入强调音", () => {
  const { audio, context } = fixture();
  audio.setRegion("atlantis");
  audio.update(0, 0);
  let calls = 0;
  audio.atlantisMusic.scheduleCombat = () => calls++;
  audio.update(0, 0.1, { pursuing: true });
  assert.equal(calls, 1);
  audio.update(0, 0.1, { pursuing: true });
  assert.equal(calls, 1);
  context.currentTime = 90;
  audio.update(90, 0.1, { pursuing: true });
  assert.ok(calls <= 2);
  audio.toggle();
  const mutedCalls = calls;
  context.currentTime = 180;
  audio.update(180, 1, { pursuing: true });
  assert.equal(calls, mutedCalls);
  audio.toggle();
  audio.update(180, 1, { pursuing: true });
  assert.equal(calls, mutedCalls + 1);
});
