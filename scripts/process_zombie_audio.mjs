import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

// 离线制作工具：分裂保留湿润拟音，尸爆以CC0爆破素材为主体；原素材见音频来源文档。
const input = process.argv[2],
  output = process.argv[3] || "src/assets/audio",
  blastInput = process.argv[4];
if (!input || !blastInput)
  throw new Error(
    "Usage: node scripts/process_zombie_audio.mjs FOLEY_DIRECTORY OUTPUT_DIRECTORY BLAST_MP3",
  );
const sourceHashes = {
  "02": "164aea403082be4179208644dcd2f77d115c26f4e666c5911ba1e6fd89b0c925",
  "05": "adf9fbbe3d32c61dfd2c66de9aa42e8c8d2b5bbadceb0d4ee6e9298113e3f3f9",
  "07": "adae57b90523d754a7b0221876d1c3e4c7b90d5ded732af4895c5b8d0489b640",
  "08": "08620cd7dbeaa27cff28a5295846ee9079be7ec6c83725a4af568b9dcc0d045d",
};
const sources = await Promise.all(
  Object.entries(sourceHashes).map(async ([id, expected]) => {
    const name = `impactsplat${id}.mp3.flac`,
      bytes = await readFile(join(input, name)),
      sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== expected)
      throw new Error(`Source fingerprint mismatch: ${name}`);
    return { id, name, sha256, data: [...bytes] };
  }),
);
const blastBytes = await readFile(blastInput);
const blastHash =
  "4de53bffac187e59d3f5b43096df2f8fcb4160076b65b71a67074947950e025f";
if (createHash("sha256").update(blastBytes).digest("hex") !== blastHash)
  throw new Error("Explosion source fingerprint mismatch");
sources.push({
  id: "blast",
  name: "Chunky Explosion.mp3",
  sha256: blastHash,
  highpass: 45,
  lowpass: 5200,
  data: [...blastBytes],
});
const specs = [
  {
    name: "zombie_fission.wav",
    duration: 1.28,
    attack: 0.016,
    tail: 0.14,
    layers: [
      { id: "05", offset: 0.055, at: 0, speed: 0.9, length: 1.15, gain: 0.76 },
      {
        id: "02",
        offset: 0.14,
        at: 0.38,
        speed: 1.06,
        length: 0.65,
        gain: 0.32,
      },
      { id: "07", offset: 0.035, at: 0.97, speed: 1, length: 0.28, gain: 0.28 },
    ],
  },
  {
    name: "zombie_corpse_burst.wav",
    duration: 0.72,
    attack: 0.003,
    tail: 0.12,
    decay: 3.8,
    layers: [
      { id: "blast", offset: 0, at: 0, speed: 1, length: 0.72, gain: 1 },
      {
        id: "07",
        offset: 0.035,
        at: 0.095,
        speed: 0.95,
        length: 0.35,
        gain: 0.075,
      },
      {
        id: "02",
        offset: 0.17,
        at: 0.23,
        speed: 1.2,
        length: 0.34,
        gain: 0.035,
      },
    ],
  },
];
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const results = await page.evaluate(
    async ({ sources, specs }) => {
      const rate = 32000,
        decoded = {};
      for (const f of sources) {
        const decoder = new OfflineAudioContext(1, rate, rate),
          b = await decoder.decodeAudioData(new Uint8Array(f.data).buffer);
        const c = new OfflineAudioContext(
            1,
            Math.ceil(b.duration * rate),
            rate,
          ),
          s = c.createBufferSource(),
          hp = c.createBiquadFilter(),
          lp = c.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = f.highpass || 65;
        hp.Q.value = 0.5;
        lp.type = "lowpass";
        lp.frequency.value = f.lowpass || 3900;
        lp.Q.value = 0.55;
        s.buffer = b;
        s.connect(hp).connect(lp).connect(c.destination);
        s.start();
        decoded[f.id] = (await c.startRendering()).getChannelData(0);
      }
      return specs.map((spec) => {
        const samples = new Float32Array(Math.round(spec.duration * rate));
        for (let i = 0; i < samples.length; i++) {
          const t = i / rate;
          let sum = 0;
          for (const l of spec.layers) {
            const age = t - l.at;
            if (age < 0 || age >= l.length) continue;
            const x = (l.offset + age * l.speed) * rate,
              a = Math.floor(x),
              p = decoded[l.id],
              v = (p[a] || 0) * (1 - (x - a)) + (p[a + 1] || 0) * (x - a);
            const fade =
              Math.min(1, age / 0.005) * Math.min(1, (l.length - age) / 0.035);
            sum += v * l.gain * fade;
          }
          const envelope =
            Math.min(1, t / spec.attack) *
            Math.min(1, (spec.duration - t) / spec.tail) ** 2;
          samples[i] = sum * envelope * Math.exp(-(spec.decay || 0) * t);
        }
        const mean = samples.reduce((n, v) => n + v, 0) / samples.length;
        for (let i = 0; i < samples.length; i++) {
          const t = i / rate;
          samples[i] -=
            mean *
            Math.min(1, t / 0.02) *
            Math.min(1, (spec.duration - t) / 0.03);
        }
        let peak = 0;
        for (const v of samples) peak = Math.max(peak, Math.abs(v));
        const gain = 0.72 / peak;
        return {
          ...spec,
          rate,
          samples: Array.from(samples, (v) => v * gain),
          normalizationGain: gain,
        };
      });
    },
    { sources, specs },
  );
  await mkdir(output, { recursive: true });
  const files = [];
  for (const { samples, rate, ...spec } of results) {
    const b = Buffer.alloc(44 + samples.length * 2);
    b.write("RIFF");
    b.writeUInt32LE(b.length - 8, 4);
    b.write("WAVEfmt ", 8);
    b.writeUInt32LE(16, 16);
    b.writeUInt16LE(1, 20);
    b.writeUInt16LE(1, 22);
    b.writeUInt32LE(rate, 24);
    b.writeUInt32LE(rate * 2, 28);
    b.writeUInt16LE(2, 32);
    b.writeUInt16LE(16, 34);
    b.write("data", 36);
    b.writeUInt32LE(samples.length * 2, 40);
    samples.forEach((v, i) =>
      b.writeInt16LE(Math.round(v * 32767), 44 + i * 2),
    );
    await writeFile(join(output, spec.name), b);
    files.push({
      ...spec,
      rate,
      channels: 1,
      format: "PCM16 WAV",
      bytes: b.length,
      sha256: createHash("sha256").update(b).digest("hex"),
    });
  }
  const receipt = {
    creator:
      "Independent.nu (Foley, uploaded by qubodup); Joth (Chunky Explosion)",
    sources_pages: [
      "https://opengameart.org/content/8-wet-squish-slurp-impacts",
      "https://opengameart.org/content/chunky-explosion",
    ],
    license: "CC0 1.0",
    processing:
      "Chrome OfflineAudioContext; mono32kHz; Foley65Hz high-pass/3900Hz low-pass, blast45Hz/5200Hz; recorded blast/quiet Foley scatter, finite fades/decay; DC reduction; peak0.72; PCM16",
    sources: sources.map(({ data, ...f }) => f),
    files,
  };
  await writeFile(
    join(dirname(blastInput), "zombie_processing.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  await browser.close();
}
