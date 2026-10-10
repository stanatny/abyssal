import assert from "node:assert/strict";
import test from "node:test";
import { createWaterAmbience } from "../src/water_ambience.js";

test("环境PCM跨采样率有界、去直流、确定性且循环接缝无异常跳变", () => {
  for (const rate of [8000, 32000, 48000]) {
    const pcm = createWaterAmbience(rate);
    assert.equal(pcm.length, rate * 6);
    assert.deepEqual(pcm, createWaterAmbience(rate));
    let sum = 0,
      energy = 0,
      maxJump = 0;
    for (let i = 0; i < pcm.length; i++) {
      assert.ok(Number.isFinite(pcm[i]));
      assert.ok(Math.abs(pcm[i]) < 1);
      sum += pcm[i];
      energy += pcm[i] ** 2;
      if (i) maxJump = Math.max(maxJump, Math.abs(pcm[i] - pcm[i - 1]));
    }
    assert.ok(Math.abs(sum / pcm.length) < 1e-7);
    assert.ok(Math.sqrt(energy / pcm.length) > 0.03);
    assert.ok(Math.abs(pcm[0] - pcm.at(-1)) < maxJump);
  }
});

test("非法采样率拒绝分配环境PCM", () => {
  for (const rate of [NaN, Infinity, 0, 7999, 192001])
    assert.throws(() => createWaterAmbience(rate), RangeError);
});
