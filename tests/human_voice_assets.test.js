import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { HUMAN_VOICE_URLS, HumanVoiceBank } from "../src/human_voice_assets.js";

function downloads() {
  const calls = [],
    originals = new Map();
  const fetcher = async (url) => {
    calls.push(String(url));
    const sex = String(url).includes("female") ? "female" : "male";
    const data = new Uint8Array([sex === "male" ? 1 : 2, 22, 33, 44]).buffer;
    originals.set(sex, data);
    return { ok: true, arrayBuffer: async () => data };
  };
  return { fetcher, calls, originals };
}

test("真人资源只下载两份，同一音频上下文共享解码Promise与Buffer", async () => {
  const { fetcher, calls, originals } = downloads(),
    bank = new HumanVoiceBank({ fetcher });
  await Promise.all([bank.preload(), bank.preload()]);
  assert.equal(calls.length, 2);
  assert.equal(new Set(calls).size, 2);
  let decodes = 0;
  const context = {
    async decodeAudioData(bytes) {
      decodes++;
      return { duration: 1.84, marker: new Uint8Array(bytes)[0] };
    },
  };
  const first = bank.load(context),
    second = bank.load(context);
  assert.strictEqual(first, second);
  const map = await first;
  assert.ok(map instanceof Map);
  assert.deepEqual([...map.keys()].sort(), ["female", "male"]);
  assert.equal(map.get("male").marker, 1);
  assert.equal(map.get("female").marker, 2);
  assert.equal(decodes, 2);
  assert.strictEqual(await bank.load(context), map);
  assert.equal(calls.length, 2);
  assert.equal(originals.size, 2);
});

test("解码使用ArrayBuffer副本，被转移后仍能为另一上下文解码", async () => {
  const { fetcher, calls, originals } = downloads(),
    bank = new HumanVoiceBank({ fetcher });
  const makeContext = () => ({
    async decodeAudioData(bytes) {
      assert.ok(
        [...originals.values()].every((original) => original !== bytes),
      );
      const copy = structuredClone(bytes, { transfer: [bytes] });
      assert.equal(bytes.byteLength, 0);
      return { marker: new Uint8Array(copy)[0], duration: 1.84 };
    },
  });
  const first = await bank.load(makeContext()),
    second = await bank.load(makeContext());
  assert.notStrictEqual(first, second);
  assert.notStrictEqual(first.get("male"), second.get("male"));
  assert.deepEqual(first, second);
  assert.equal(calls.length, 2);
  for (const original of originals.values())
    assert.equal(original.byteLength, 4);
});

test("真人下载失败可重试，不把HTTP错误当成有效音频缓存", async () => {
  let failed = false;
  const { fetcher, calls } = downloads();
  const bank = new HumanVoiceBank({
    fetcher: async (url) => {
      if (!failed && String(url).includes("female")) {
        failed = true;
        return { ok: false, status: 503 };
      }
      return fetcher(url);
    },
  });
  await assert.rejects(bank.preload());
  await bank.preload();
  const result = await bank.load({
    decodeAudioData: async (bytes) => ({
      size: bytes.byteLength,
      duration: 1.84,
    }),
  });
  assert.equal(result.size, 2);
  assert.ok(calls.length >= 2 && calls.length <= 3);
});

test("失败的解码Promise会移除，相同上下文可重新解码已下载字节", async () => {
  const { fetcher, calls } = downloads(),
    bank = new HumanVoiceBank({ fetcher });
  let failed = false;
  const context = {
    async decodeAudioData(bytes) {
      if (!failed) {
        failed = true;
        throw new Error("Invalid temporary decode state");
      }
      return { marker: new Uint8Array(bytes)[0], duration: 1.84 };
    },
  };
  await assert.rejects(bank.load(context));
  const map = await bank.load(context);
  assert.equal(map.size, 2);
  assert.equal(map.get("male").marker, 1);
  assert.equal(map.get("female").marker, 2);
  assert.equal(calls.length, 2);
});

// 按RIFF区块读取实际PCM，允许编码器保留合法的元信息区块。
function pcmWav(bytes) {
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
  let format, data;
  for (let at = 12; at + 8 <= bytes.length; ) {
    const kind = bytes.toString("ascii", at, at + 4),
      length = bytes.readUInt32LE(at + 4);
    const chunk = bytes.subarray(at + 8, at + 8 + length);
    assert.equal(chunk.length, length);
    if (kind === "fmt ") format = chunk;
    if (kind === "data") data = chunk;
    at += 8 + length + (length % 2);
  }
  assert.ok(format && data);
  assert.equal(format.readUInt16LE(0), 1);
  assert.equal(format.readUInt16LE(2), 1);
  assert.equal(format.readUInt16LE(14), 16);
  const rate = format.readUInt32LE(4),
    samples = new Float32Array(data.length / 2);
  for (let i = 0; i < samples.length; i++)
    samples[i] = data.readInt16LE(i * 2) / 32768;
  return { rate, samples };
}

test("打包的两份真人WAV时长正确、波形不同且有安全峰值和自然收尾", async () => {
  const hashes = [];
  for (const [sex, duration] of [
    ["male", 1.65],
    ["female", 1],
  ]) {
    assert.ok(String(HUMAN_VOICE_URLS[sex]).endsWith(`/human_${sex}.wav`));
    const bytes = await readFile(new URL(HUMAN_VOICE_URLS[sex]));
    hashes.push(createHash("sha256").update(bytes).digest("hex"));
    const { rate, samples } = pcmWav(bytes);
    assert.equal(rate, 32000);
    assert.ok(Math.abs(samples.length / rate - duration) < 0.0001);
    let peak = 0,
      energy = 0,
      nonzero = 0,
      tail = 0;
    for (let i = 0; i < samples.length; i++) {
      const value = samples[i];
      peak = Math.max(peak, Math.abs(value));
      energy += value ** 2;
      if (value) nonzero++;
      if (i > samples.length - rate * 0.02) tail += value ** 2;
    }
    assert.ok(peak > 0.6 && peak < 0.72);
    assert.ok(nonzero > samples.length * 0.5);
    assert.ok(Math.sqrt(energy / samples.length) > 0.025);
    // 连续20ms有足够能量才算起音，避免单次点击或弱底噪绕过半秒延迟检查。
    let audibleOnset = Infinity;
    const window = Math.round(rate * 0.02),
      step = Math.round(rate * 0.005);
    for (let end = window; end <= rate * 0.15; end += step) {
      let windowEnergy = 0,
        windowPeak = 0;
      for (let i = end - window; i < end; i++) {
        windowEnergy += samples[i] ** 2;
        windowPeak = Math.max(windowPeak, Math.abs(samples[i]));
      }
      if (Math.sqrt(windowEnergy / window) >= 0.05 && windowPeak >= 0.15) {
        audibleOnset = end / rate;
        break;
      }
    }
    assert.ok(
      audibleOnset <= 0.15,
      `${sex}: audible voice must begin within 150ms`,
    );
    assert.ok(Math.sqrt(tail / (rate * 0.02)) < 0.005);
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 0);
  }
  assert.notEqual(hashes[0], hashes[1]);
});
