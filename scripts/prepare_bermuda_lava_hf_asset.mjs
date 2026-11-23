/** 将原始 HF 色图制成周期材质，并明确离线派生表面通道；不重画生成来源。 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const [inputArg, receiptArg, outputArg = "src/assets/textures"] =
  process.argv.slice(2);
if (!inputArg || !receiptArg)
  throw new Error("Usage: input-image generation-receipt output-directory");
const input = resolve(inputArg),
  output = resolve(outputArg),
  size = 1024,
  packedSize = 512;
const ffmpeg = process.env.FFMPEG || "ffmpeg";
function run(args, data) {
  const r = spawnSync(
    ffmpeg,
    ["-hide_banner", "-loglevel", "error", "-threads", "1", ...args],
    { input: data, maxBuffer: 32 * 1024 * 1024 },
  );
  if (r.status !== 0)
    throw new Error(
      "Image conversion failed: " + r.stderr?.toString().slice(0, 500),
    );
  return r.stdout;
}
const source = await readFile(input),
  receipt = JSON.parse(await readFile(resolve(receiptArg), "utf8"));
const sha = (data) => createHash("sha256").update(data).digest("hex");
if (!receipt.completed || receipt.sha256 !== sha(source))
  throw new Error("HF source receipt does not match input bytes");
const raw = run([
  "-i",
  input,
  "-vf",
  `scale=${size}:${size}:flags=lanczos`,
  "-f",
  "rawvideo",
  "-pix_fmt",
  "rgb24",
  "pipe:1",
]);
if (raw.length !== size * size * 3)
  throw new Error("Invalid decoded image dimensions");
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const color = Buffer.from(raw),
  band = 48;
// 两侧共享边界值，保留中央原始细节；原始生成文件单独永久保留。
for (const axis of [0, 1]) {
  const before = Buffer.from(color);
  for (let a = 0; a < band; a++)
    for (let b = 0; b < size; b++)
      for (let c = 0; c < 3; c++) {
        const left =
          ((axis === 0 ? b : a) * size + (axis === 0 ? a : b)) * 3 + c;
        const right =
          ((axis === 0 ? b : size - 1 - a) * size +
            (axis === 0 ? size - 1 - a : b)) *
            3 +
          c;
        const weight = 0.5 * (1 - smooth(a / (band - 1)));
        color[left] = Math.round(
          before[left] * (1 - weight) + before[right] * weight,
        );
        color[right] = Math.round(
          before[right] * (1 - weight) + before[left] * weight,
        );
      }
}
const fields = new Float32Array(packedSize * packedSize * 3);
for (let y = 0; y < packedSize; y++)
  for (let x = 0; x < packedSize; x++) {
    let r = 0,
      g = 0,
      b = 0;
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const i = ((y * 2 + dy) * size + x * 2 + dx) * 3;
        r += color[i] / 1020;
        g += color[i + 1] / 1020;
        b += color[i + 2] / 1020;
      }
    const heat = smooth((r - (g + b) * 0.5 - 0.08) / 0.63),
      luma = 0.2126 * r + 0.7152 * g + 0.0722 * b,
      i = (y * packedSize + x) * 3;
    fields[i] = 0.22 + 0.62 * (1 - heat) + 0.1 * luma;
    fields[i + 1] = 0.4 + 0.5 * (1 - heat);
    fields[i + 2] = heat;
  }
const packed = Buffer.alloc(packedSize * packedSize * 3);
// 高度做环绕低通，热量和粗糙保留源图区域，不冒称模型原生 PBR。
for (let y = 0; y < packedSize; y++)
  for (let x = 0; x < packedSize; x++) {
    let sum = 0,
      total = 0;
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++) {
        const w = (4 - Math.abs(dx)) * (4 - Math.abs(dy)),
          i =
            (((y + dy + packedSize) % packedSize) * packedSize +
              ((x + dx + packedSize) % packedSize)) *
            3;
        sum += fields[i] * w;
        total += w;
      }
    const i = (y * packedSize + x) * 3;
    packed[i] = Math.round((sum / total) * 255);
    packed[i + 1] = Math.round(fields[i + 1] * 255);
    packed[i + 2] = Math.round(fields[i + 2] * 255);
  }
await mkdir(output, { recursive: true });
function encode(data, n, lossless) {
  return run(
    [
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-s",
      `${n}x${n}`,
      "-i",
      "pipe:0",
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      lossless ? "100" : "92",
      "-lossless",
      lossless ? "1" : "0",
      "-compression_level",
      "6",
      "-f",
      "webp",
      "pipe:1",
    ],
    data,
  );
}
const image = encode(color, size, false),
  surface = encode(packed, packedSize, true);
const outputs = [
  {
    name: "bermuda_lava_hf_color.webp",
    data: image,
    size,
    colorSpace: "sRGB",
    channels: "HF color with 48-pixel periodic-edge blend",
  },
  {
    name: "bermuda_lava_hf_surface.webp",
    data: surface,
    size: packedSize,
    colorSpace: "linear",
    channels:
      "R: derived low-pass height; G: derived roughness; B: derived thermal mask",
  },
];
for (const o of outputs) await writeFile(join(output, o.name), o.data);
const stats = {};
for (let c = 0; c < 3; c++) {
  let lo = 255,
    hi = 0,
    sum = 0;
  for (let i = c; i < packed.length; i += 3) {
    lo = Math.min(lo, packed[i]);
    hi = Math.max(hi, packed[i]);
    sum += packed[i];
  }
  stats[["height", "roughness", "heat"][c]] = {
    min: lo,
    max: hi,
    mean: sum / (packedSize * packedSize),
  };
}
const record = {
  purpose:
    "Original HF molten-basalt color, with explicitly derived runtime surface channels",
  model: receipt.model,
  space: receipt.space,
  spaceRevision: receipt.spaceRevision,
  modelLicense: receipt.license,
  seed: receipt.seed,
  steps: receipt.steps,
  prompt: receipt.prompt,
  source: {
    filename: basename(input),
    sha256: sha(source),
    bytes: source.length,
  },
  processing: {
    converter: "scripts/prepare_bermuda_lava_hf_asset.mjs",
    colorSize: size,
    edgeBlendPixels: band,
    surfaceSize: packedSize,
    heightFilter: "7x7 weighted toroidal low-pass",
    nativePbr: false,
  },
  outputs: outputs.map(({ data, ...o }) => ({
    ...o,
    bytes: data.length,
    sha256: sha(data),
  })),
  surfaceStats: stats,
};
await writeFile(
  join(output, "bermuda_lava_hf_sources.json"),
  JSON.stringify(record, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { source: record.source, outputs: record.outputs, stats },
    null,
    2,
  ),
);
