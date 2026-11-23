import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { OceanAudio } from "../src/audio.js";
import {
  BermudaTitanAwakenAudio,
  createTitanAwakenPcm,
  TITAN_AWAKEN_SOUND,
} from "../src/bermuda_titan_awaken_audio.js";

async function original(name) {
  const bytes = await readFile(
    new URL(`../src/assets/audio/${name}.wav`, import.meta.url),
  );
  const channels = bytes.readUInt16LE(22),
    sampleRate = bytes.readUInt32LE(24),
    length = (bytes.length - 44) / (channels * 2),
    data = Array.from({ length: channels }, () => new Float32Array(length));
  for (let i = 0; i < length; i++)
    for (let channel = 0; channel < channels; channel++)
      data[channel][i] =
        bytes.readInt16LE(44 + (i * channels + channel) * 2) / 32768;
  return {
    bytes,
    buffer: {
      sampleRate,
      length,
      duration: length / sampleRate,
      numberOfChannels: channels,
      getChannelData: (channel) => data[channel],
    },
  };
}
function rms(data, rate, from, to) {
  let sum = 0;
  const first = Math.floor(from * rate),
    last = Math.min(data.length, Math.floor(to * rate));
  for (let i = first; i < last; i++) sum += data[i] ** 2;
  return Math.sqrt(sum / (last - first));
}
const sources = new Map();
for (const name of ["roar", "fault"])
  sources.set(name, await original(`lord_${name}`));
const buffers = new Map(
  [...sources].map(([name, source]) => [name, source.buffer]),
);

test("Accepted HF roar/fault source bytes are reused unchanged", () => {
  assert.equal(
    createHash("sha256").update(sources.get("roar").bytes).digest("hex"),
    "dc16590b319b687dd46c918cae8fac24c2137654e03094bc7d7a7643897d4f38",
  );
  assert.equal(
    createHash("sha256").update(sources.get("fault").bytes).digest("hex"),
    "82fd57430fa0875a85c70776d7e8635cf6ba64ef140d60b1ade212f0b5f9e3ea",
  );
});

test("Actual sample-derived PCM is deterministic, finite, bounded and closes its tail", () => {
  for (const rate of [22050, 44100, 48000]) {
    const options = {
        sampleRate: rate,
        roar: buffers.get("roar"),
        fault: buffers.get("fault"),
      },
      pcm = createTitanAwakenPcm(options);
    assert.deepEqual(pcm, createTitanAwakenPcm(options));
    assert.equal(pcm.length, Math.round(rate * TITAN_AWAKEN_SOUND.duration));
    let peak = 0,
      mean = 0;
    for (const value of pcm) {
      assert.ok(Number.isFinite(value));
      peak = Math.max(peak, Math.abs(value));
      mean += value;
    }
    assert.ok(peak >= 0.67 && peak <= 0.680001);
    assert.ok(Math.abs(mean / pcm.length) < 0.001);
    assert.equal(pcm[0], 0);
    assert.equal(pcm.at(-1), 0);
    assert.ok(
      rms(pcm, rate, 0.02, 0.2) > 0.003,
      "Immediate ground movement precedes the throat onset",
    );
    assert.ok(rms(pcm, rate, 0.2, 2.4) > 0.015);
    assert.ok(rms(pcm, rate, 3.6, 3.8) < rms(pcm, rate, 0.2, 1) * 0.12);
  }
  assert.throws(() => createTitanAwakenPcm({ sampleRate: NaN }), RangeError);
  assert.throws(() => createTitanAwakenPcm({ variant: "unknown" }), RangeError);
});

test("Audition alternatives differ; fallback is finite and independent of network loading", () => {
  const options = {
    sampleRate: 22050,
    roar: buffers.get("roar"),
    fault: buffers.get("fault"),
  };
  assert.notDeepEqual(
    createTitanAwakenPcm(options),
    createTitanAwakenPcm({ ...options, variant: "articulate" }),
  );
  const fallback = createTitanAwakenPcm({ sampleRate: 22050 });
  assert.ok(fallback.every(Number.isFinite));
  assert.ok(rms(fallback, 22050, 0.2, 2) > 0.01);
  assert.equal(fallback.at(-1), 0);
});

function fixture({ enabled = true, paused = false, state = "running" } = {}) {
  const parameter = () => ({
    value: 0,
    events: [],
    setValueAtTime(v, t) {
      this.value = v;
      this.events.push(["set", v, t]);
    },
    linearRampToValueAtTime(v, t) {
      this.value = v;
      this.events.push(["linear", v, t]);
    },
    setTargetAtTime(v, t) {
      this.value = v;
      this.events.push(["target", v, t]);
    },
    cancelScheduledValues() {},
    cancelAndHoldAtTime() {},
  });
  const node = () => ({
    gain: parameter(),
    connect(destination) {
      this.destination = destination;
      return destination;
    },
    disconnect() {
      this.disconnected = true;
    },
  });
  const created = [],
    context = {
      sampleRate: 22050,
      state,
      currentTime: 0,
      buffers: 0,
      createBuffer(channels, length, rate) {
        this.buffers++;
        const data = new Float32Array(length);
        return {
          numberOfChannels: channels,
          length,
          sampleRate: rate,
          duration: length / rate,
          getChannelData: () => data,
        };
      },
      createGain: node,
      createBufferSource() {
        const value = {
          ...node(),
          stops: [],
          start(at) {
            this.started = at;
          },
          stop(at) {
            this.stops.push(at);
          },
          finish() {
            this.onended?.();
          },
        };
        created.push(value);
        return value;
      },
    };
  const audio = new OceanAudio({ context });
  audio.ready = true;
  audio.enabled = enabled;
  audio.paused = paused;
  audio.regionId = "bermuda";
  audio.combatEffects = node();
  audio.musicDuck = node();
  audio.master = node();
  audio.pauseGate = node();
  audio.stopMusic = () => {};
  audio.resumeContext = () => {};
  audio.replaceMusicRoom = () => {};
  audio.connectReverb = () => {};
  audio.reverbInput = node();
  audio.convolver = node();
  for (const key of ["calm", "chase", "bossLayer"]) audio[key] = node();
  audio.lordAttackAudio.buffers = buffers;
  return { audio, context, created };
}

test("Prepared PCM is reused across starts and owns at most one once-only voice", () => {
  const { audio, context, created } = fixture(),
    cue = audio.titanAwakenAudio;
  cue.prepare(context, buffers);
  const first = cue.buffer;
  cue.prepare(context);
  cue.prepare(context, buffers);
  assert.equal(context.buffers, 1);
  assert.equal(cue.buffer, first);
  assert.equal(cue.mode, "accepted_sample_mix");
  assert.equal(audio.titanAwaken(), true);
  assert.equal(audio.titanAwaken(), false);
  assert.equal(created.length, 1);
  assert.equal(created[0].loop, false);
  assert.equal(audio.voices.size, 1);
  assert.ok(created[0].stops[0] - created[0].started <= 3.82);
  created[0].finish();
  assert.equal(cue.voice, null);
  assert.equal(audio.voices.size, 0);
  assert.equal(created[0].disconnected, true);
});

test("Late decode prepares a future round without replaying an already consumed event", async () => {
  const { audio, context, created } = fixture();
  audio.lordAttackAudio.buffers = new Map();
  assert.equal(audio.titanAwaken(), true);
  assert.equal(audio.titanAwakenAudio.mode, "immediate_fallback");
  let complete;
  audio.lordAttackAudio.prepare = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const pending = audio.prepareTitanAwakenSound();
  audio.lordAttackAudio.buffers = buffers;
  complete(true);
  await pending;
  assert.equal(created.length, 1);
  assert.equal(audio.titanAwaken(), false);
  assert.equal(audio.titanAwakenAudio.mode, "accepted_sample_mix");
  audio.reset();
  assert.equal(audio.titanAwaken(), true);
  assert.equal(created.length, 2);
});

for (const condition of [
  { enabled: false },
  { paused: true },
  { state: "suspended" },
])
  test(`Muted/paused/locked event is consumed and never queues a stale roar ${JSON.stringify(condition)}`, () => {
    const { audio, context, created } = fixture(condition);
    assert.equal(audio.titanAwaken(), false);
    audio.enabled = true;
    audio.paused = false;
    context.state = "running";
    audio.titanAwakenAudio.prepare(context, buffers);
    assert.equal(audio.titanAwaken(), false);
    assert.equal(created.length, 0);
    audio.reset();
    assert.equal(audio.titanAwaken(), true);
    assert.equal(created.length, 1);
  });

test("Pause/mute/reset/region changes stop finite tails; resume does not restart them", () => {
  const { audio, context, created } = fixture();
  audio.titanAwakenAudio.prepare(context, buffers);
  audio.titanAwaken();
  audio.setPaused(true);
  assert.equal(audio.titanAwakenAudio.voice, null);
  assert.ok(created[0].stops.includes(0.02));
  audio.setPaused(false);
  assert.equal(audio.titanAwaken(), false);
  audio.reset();
  audio.titanAwaken();
  audio.toggle();
  assert.equal(audio.enabled, false);
  assert.equal(audio.titanAwakenAudio.voice, null);
  audio.toggle();
  assert.equal(audio.titanAwaken(), false);
  audio.reset();
  audio.titanAwaken();
  audio.setRegion("hawaii");
  assert.equal(audio.titanAwakenAudio.voice, null);
  assert.equal(audio.titanAwaken(), false);
});

test("A quieter later cue never releases a stronger active music duck", () => {
  const { audio, context } = fixture();
  audio.duckMusic(0.3, 5);
  context.currentTime = 0.1;
  audio.titanAwakenAudio.prepare(context, buffers);
  audio.titanAwaken();
  assert.equal(audio.duckLevel, 0.3);
  assert.equal(audio.duckUntil, 5);
});

test("Failed shared decode keeps an immediate bounded fallback without deferred sources", async () => {
  const { audio, created } = fixture();
  audio.lordAttackAudio.buffers = new Map();
  audio.lordAttackAudio.prepare = async () => false;
  assert.equal(await audio.prepareTitanAwakenSound(), false);
  assert.equal(audio.titanAwakenAudio.mode, "immediate_fallback");
  assert.equal(created.length, 0);
  assert.equal(audio.titanAwaken(), true);
  assert.equal(created.length, 1);
  audio.lordAttackAudio.prepare = async () => {
    throw Error("decode unavailable");
  };
  assert.equal(await audio.prepareTitanAwakenSound(), false);
  assert.equal(created.length, 1);
  assert.equal(audio.titanAwaken(), false);
});
