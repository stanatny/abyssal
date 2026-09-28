import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import { FISH_BITE_URLS, FishBiteBank } from "../src/fish_bite_assets.js";

// 读取真实WAV区块，允许编码器在fmt/data之间写入元信息。
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

function rms(samples, from, to) {
  let energy = 0;
  for (let i = from; i < to; i++) energy += samples[i] ** 2;
  return Math.sqrt(energy / (to - from));
}

test("三份打包水声WAV短促、不同、低峰值且起尾无点击", async () => {
  const hashes = new Set();
  assert.deepEqual(Object.keys(FISH_BITE_URLS), ["0", "1", "2"]);
  for (const [variant, url] of Object.entries(FISH_BITE_URLS)) {
    assert.ok(String(url).endsWith(`/fish_bite_${variant}.wav`));
    const bytes = await readFile(new URL(url));
    hashes.add(createHash("sha256").update(bytes).digest("hex"));
    const { rate, samples } = pcmWav(bytes),
      duration = samples.length / rate;
    assert.equal(rate, 32000);
    assert.ok(duration >= 0.3 && duration <= 0.45);
    let peak = 0;
    for (const value of samples) {
      assert.ok(Number.isFinite(value));
      peak = Math.max(peak, Math.abs(value));
    }
    assert.ok(peak >= 0.3 && peak <= 0.61);
    assert.ok(rms(samples, 0, samples.length) > 0.02);
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 0);
    assert.ok(
      rms(samples, samples.length - rate * 0.02, samples.length) < 0.002,
    );
    // 捕食发生后100ms内必须有连续20ms水声，避免裁切留下明显空白。
    let onset = Infinity;
    const window = Math.round(rate * 0.02),
      step = Math.round(rate * 0.005);
    for (let end = window; end <= rate * 0.1; end += step) {
      if (rms(samples, end - window, end) >= 0.01) {
        onset = end / rate;
        break;
      }
    }
    assert.ok(onset <= 0.1, `Fish variant ${variant} has delayed onset`);
  }
  assert.equal(hashes.size, 3);
});

test("FishBiteBank默认下载函数使用正确接收者，只取三份并按上下文缓存解码", async (t) => {
  const calls = [],
    originals = new Map();
  // 覆盖global fetch来检查默认封装，避免之前浏览器Illegal invocation接收者回归。
  t.mock.method(globalThis, "fetch", function (url) {
    assert.equal(this, globalThis);
    const variant = Number(String(url).match(/fish_bite_(\d)\.wav$/)[1]);
    const bytes = new Uint8Array([variant + 1, 22, 33, 44]).buffer;
    originals.set(String(variant), bytes);
    calls.push(String(url));
    return Promise.resolve({ ok: true, arrayBuffer: async () => bytes });
  });
  const bank = new FishBiteBank();
  const firstPreload = bank.preload();
  assert.strictEqual(bank.preload(), firstPreload);
  assert.equal((await firstPreload).size, 3);
  assert.equal(calls.length, 3);
  let decodes = 0;
  const context = {
    async decodeAudioData(bytes) {
      decodes++;
      assert.ok([...originals.values()].every((value) => value !== bytes));
      const copy = structuredClone(bytes, { transfer: [bytes] });
      return { duration: 0.35, marker: new Uint8Array(copy)[0] };
    },
  };
  const pending = bank.load(context);
  assert.strictEqual(bank.load(context), pending);
  const buffers = await pending;
  assert.deepEqual([...buffers.keys()], ["0", "1", "2"]);
  assert.deepEqual(
    [...buffers.values()].map((buffer) => buffer.marker),
    [1, 2, 3],
  );
  assert.strictEqual(await bank.load(context), buffers);
  assert.equal(decodes, 3);
  assert.equal(calls.length, 3);
  const another = await bank.load({ decodeAudioData: context.decodeAudioData });
  assert.equal(decodes, 6);
  assert.deepEqual(another, buffers);
  assert.notStrictEqual(another.get("0"), buffers.get("0"));
  for (const bytes of originals.values()) assert.equal(bytes.byteLength, 4);
});

test("水声下载与解码失败可恢复，成功资源保留且没有空缓存冒充就绪", async () => {
  let failedFetch = false,
    decodeFailed = false;
  const calls = [];
  const bank = new FishBiteBank({
    fetcher: async (url) => {
      calls.push(String(url));
      if (String(url).endsWith("fish_bite_1.wav") && !failedFetch) {
        failedFetch = true;
        return { ok: false, status: 503 };
      }
      const variant = Number(String(url).match(/fish_bite_(\d)\.wav$/)[1]);
      return {
        ok: true,
        arrayBuffer: async () => new Uint8Array([variant + 1]).buffer,
      };
    },
  });
  await assert.rejects(bank.preload());
  const bytes = await bank.preload();
  assert.equal(bytes.size, 3);
  assert.equal(
    calls.filter((url) => url.endsWith("fish_bite_1.wav")).length,
    2,
  );
  assert.equal(
    calls.filter((url) => url.endsWith("fish_bite_0.wav")).length,
    1,
  );
  assert.equal(
    calls.filter((url) => url.endsWith("fish_bite_2.wav")).length,
    1,
  );
  const context = {
    async decodeAudioData(input) {
      if (!decodeFailed) {
        decodeFailed = true;
        return { duration: 0 };
      }
      return { duration: 0.35, marker: new Uint8Array(input)[0] };
    },
  };
  await assert.rejects(bank.load(context), /no duration/);
  const buffers = await bank.load(context);
  assert.equal(buffers.size, 3);
  assert.equal(calls.length, 4);
});
