import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { OceanAudio } from "../src/audio.js";
import { QUEST_AUDIO_URLS, QuestAudioBank } from "../src/quest_audio_assets.js";

test("Four distinct portable PCM cues retain headroom, finite samples and silent boundaries", async () => {
  const hashes = new Set();
  for (const url of Object.values(QUEST_AUDIO_URLS)) {
    const bytes = await readFile(new URL(url));
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.readUInt16LE(22), 1);
    assert.equal(bytes.readUInt32LE(24), 48000);
    let peak = 0,
      sum = 0;
    for (let i = 44; i < bytes.length; i += 2) {
      const n = bytes.readInt16LE(i) / 32768;
      peak = Math.max(peak, Math.abs(n));
      sum += n * n;
    }
    assert.ok(peak <= 0.709 && peak > 0.1);
    assert.ok(sum > 1);
    assert.equal(bytes.readInt16LE(44), 0);
    assert.ok(Math.abs(bytes.readInt16LE(bytes.length - 2)) < 3);
  }
  assert.equal(hashes.size, 4);
});

test("Quest loading recovers without replaying old events; voices are bounded and mute/reset stop tails", async () => {
  const sources = [],
    notes = [];
  const context = {
    currentTime: 0,
    state: "running",
    decodeAudioData: async () => ({ duration: 1 }),
    createBufferSource: () => {
      const s = {
        connect() {},
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(s);
      return s;
    },
  };
  const bank = new QuestAudioBank({
    fetcher: async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }),
  });
  const audio = new OceanAudio({ context, questAudioBank: bank });
  audio.ready = true;
  audio.regionId = "atlantis";
  audio.makeBus = () => ({});
  audio.connectVoice = () => {};
  audio.releaseWhenEnded = () => {};
  audio.note = (...a) => notes.push(a);
  assert.equal(audio.quest("key"), true);
  assert.equal(sources.length, 0);
  assert.equal(notes.length, 2);
  await audio.prepareQuestSounds();
  assert.equal(sources.length, 0);
  assert.equal(audio.quest("key"), false); // 不补播同一事件
  context.currentTime = 2;
  for (const k of Object.keys(QUEST_AUDIO_URLS))
    assert.equal(audio.quest(k), true);
  assert.equal(audio.questVoices.size, 4);
  context.currentTime = 4;
  audio.quest("key");
  assert.equal(audio.questVoices.size, 4);
  assert.equal(sources[0].stopped, true);
  audio.paused = true;
  assert.equal(audio.quest("chest"), false);
  audio.paused = false;
  audio.enabled = false;
  assert.equal(audio.quest("guardian"), false);
  audio.stopQuestSounds();
  assert.equal(audio.questVoices.size, 0);
  assert.ok(sources.every((s) => s.stopped));
});
