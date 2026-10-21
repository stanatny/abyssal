import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { preyFeedingSound } from "../src/combat_audio_events.js";
import { createPlayer, consumePrey } from "../src/simulation.js";
import {
  CombatAudioBank,
  COMBAT_AUDIO_URLS,
} from "../src/combat_audio_assets.js";

test("黄标按可反击的五米体长差而非猎物绝对体长选择，保留威胁上限", () => {
  const player = createPlayer();
  player.length = 9;
  const prey = { length: 4.01, predator: true };
  assert.equal(preyFeedingSound(player, prey), "yellow");
  assert.equal(preyFeedingSound(player, { ...prey, length: 4 }), "ordinary");
  player.length = 30;
  assert.equal(preyFeedingSound(player, { ...prey, length: 28 }), "yellow");
  assert.equal(
    preyFeedingSound(player, { ...prey, length: 28, threatCeilingLength: 30 }),
    "ordinary",
  );
  assert.equal(
    preyFeedingSound(player, { length: 29, predator: false }),
    "ordinary",
  );
  assert.equal(
    preyFeedingSound(player, { length: 31, predator: true }),
    "ordinary",
  );
});

test("真实食物结算跨过反击边界时必须保留结算前选定类别", () => {
  const player = createPlayer();
  player.length = 5.999;
  player.mass = (player.length / 6) ** 3;
  const prey = { length: 1, predator: true, nutrition: 10, growth: 10 };
  const selected = preyFeedingSound(player, prey);
  assert.equal(selected, "yellow");
  assert.equal(consumePrey(player, prey), true);
  assert.ok(player.length > 6);
  assert.equal(preyFeedingSound(player, prey), "ordinary");
  assert.equal(selected, "yellow");
});

test("所选四个文件为原试听B版本，格式固定且无需新推理", async () => {
  const expected = {
    ordinary:
      "bd96a3017b4967a5e2ea40ccc723b86a5ed7aad758f88b0bfaed1d328c6beafc",
    yellow: "968a415706293bce5fa26da682f5ee4f5c2d669f6da3b17b1ae478b060c342da",
    hurt: "ef6043909e94f8ba8b0ae82e38444989ca2bb0acec1476c9f06fc3b7e27384de",
    lord: "97eeeece14a7e52ee2b6bd7b04f750991f0c56ae62de0ee53d4f1119e623607d",
  };
  for (const [kind, url] of Object.entries(COMBAT_AUDIO_URLS)) {
    const bytes = await readFile(new URL(url));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      expected[kind],
    );
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
    assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
    assert.equal(bytes.readUInt32LE(24), 48000);
    assert.equal(bytes.readUInt16LE(22), 1);
  }
});

test("损坏样本重试只重取坏项，正常项复用，跨上下文独立解码", async () => {
  const calls = {};
  const bank = new CombatAudioBank({
    fetcher: async (url) => {
      const key = Object.keys(COMBAT_AUDIO_URLS).find(
        (k) => COMBAT_AUDIO_URLS[k] === url,
      );
      calls[key] = (calls[key] || 0) + 1;
      return {
        ok: true,
        arrayBuffer: async () =>
          new Uint8Array([key === "hurt" && calls[key] === 1 ? 0 : 1]).buffer,
      };
    },
  });
  let decodes = 0;
  const context = {
    decodeAudioData: async (bytes) => {
      decodes++;
      if (new Uint8Array(bytes)[0] === 0) throw new Error("Corrupt WAV");
      return { duration: 0.5 };
    },
  };
  await assert.rejects(bank.load(context), /Corrupt/);
  assert.equal(bank.bytes.size, 3);
  const [a, b] = await Promise.all([bank.load(context), bank.load(context)]);
  assert.strictEqual(a, b);
  assert.equal(a.size, 4);
  assert.deepEqual(calls, { ordinary: 1, yellow: 1, hurt: 2, lord: 1 });
  const before = decodes;
  await bank.load(context);
  assert.equal(decodes, before);
  await bank.load({ ...context });
  assert.equal(decodes, before + 4);
});
