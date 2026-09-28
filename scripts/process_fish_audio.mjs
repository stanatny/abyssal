import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

// 离线制作工具；输入为docs/audio_sources.md记录的三份CC0水声，不参与运行时构建。
const input = process.argv[2];
if (!input)
  throw new Error(
    "Usage: node scripts/process_fish_audio.mjs SOURCE_DIRECTORY",
  );
const output = process.argv[3] || "src/assets/audio";
const rate = 32000;
const specs = [
  {
    duration: 0.34,
    waterOffset: 0.018,
    impactOffset: 0,
    bubbleOffset: 0.07,
    weights: [0.75, 0.26, 0.1],
  },
  {
    duration: 0.36,
    waterOffset: 0.036,
    impactOffset: 0.014,
    bubbleOffset: 0.19,
    weights: [0.66, 0.32, 0.13],
  },
  {
    duration: 0.38,
    waterOffset: 0.006,
    impactOffset: 0.027,
    bubbleOffset: 0.31,
    weights: [0.82, 0.21, 0.09],
  },
];
const sources = ["water", "waterReentry", "bubbles"].map((name, index) => {
  const path = join(input, `${name}.wav`);
  const raw = execFileSync("ffmpeg", [
    "-v",
    "error",
    "-i",
    path,
    "-af",
    `highpass=f=70,lowpass=f=${[1450, 700, 900][index]}:p=2`,
    "-ar",
    String(rate),
    "-ac",
    "1",
    "-f",
    "f32le",
    "pipe:1",
  ]);
  const samples = Array.from({ length: raw.length / 4 }, (_, i) =>
    raw.readFloatLE(i * 4),
  );
  const rms = Math.sqrt(
    samples.reduce((n, v) => n + v * v, 0) / samples.length,
  );
  return {
    name,
    sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    samples: samples.map((v) => v * (0.16 / rms)),
  };
});
mkdirSync(output, { recursive: true });
const results = specs.map((spec, variant) => {
  const count = Math.round(spec.duration * rate),
    samples = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const value = (source, offset, delay = 0) =>
      t < delay
        ? 0
        : sources[source].samples[Math.floor((t - delay + offset) * rate)] || 0;
    // 水流吸入为主体，压低的入水冲击作咬合，细气泡稍后淡出；没有正弦音高。
    const attack = Math.min(1, t / 0.018);
    const tail = Math.min(1, (spec.duration - t) / 0.1);
    samples[i] =
      (value(0, spec.waterOffset) * spec.weights[0] +
        value(1, spec.impactOffset, 0.022) *
          spec.weights[1] *
          Math.exp(-t / 0.12) +
        value(2, spec.bubbleOffset, 0.075) *
          spec.weights[2] *
          Math.exp(-t / 0.13)) *
      attack *
      tail *
      tail;
  }
  const peak = samples.reduce((n, v) => Math.max(n, Math.abs(v)), 0);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++)
    wav.writeInt16LE(
      Math.round(((samples[i] * 0.6) / peak) * 32767),
      44 + i * 2,
    );
  const name = `fish_bite_${variant}.wav`;
  writeFileSync(join(output, name), wav);
  return {
    name,
    ...spec,
    bytes: wav.length,
    sha256: createHash("sha256").update(wav).digest("hex"),
  };
});
console.log(
  JSON.stringify(
    {
      rate,
      sources: sources.map(({ name, sha256 }) => ({ name, sha256 })),
      results,
    },
    null,
    2,
  ),
);
