/** 从最终同源色图采样线性顶点色，下载失败时仍保留石材、铜饰与雕纹的配色。 */
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
const [meshPath, imagePath, tools] = process.argv.slice(2);
if (!tools) throw Error("Usage: mesh.json color.webp base-tools");
const require = createRequire(join(resolve(tools), "package.json")),
  sharp = require("sharp"),
  mesh = JSON.parse(await readFile(meshPath, "utf8")),
  uv = new Uint16Array(Uint8Array.from(Buffer.from(mesh.uv, "base64")).buffer),
  image = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true }),
  color = new Uint8Array(mesh.vertices * 3),
  linear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
for (let i = 0; i < mesh.vertices; i++) {
  const x = Math.min(
      image.info.width - 1,
      Math.round((uv[2 * i] / 65535) * (image.info.width - 1)),
    ),
    y = Math.min(
      image.info.height - 1,
      Math.round((uv[2 * i + 1] / 65535) * (image.info.height - 1)),
    );
  let nearest,
    distance = Infinity;
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx,
        yy = y + dy,
        d = dx * dx + dy * dy;
      if (
        xx < 0 ||
        yy < 0 ||
        xx >= image.info.width ||
        yy >= image.info.height ||
        d >= distance
      )
        continue;
      const o = (yy * image.info.width + xx) * 4;
      if (image.data[o + 3] < 128) continue;
      nearest = o;
      distance = d;
    }
  if (nearest === undefined) throw Error(`Uncovered fallback vertex ${i}`);
  for (let c = 0; c < 3; c++)
    color[i * 3 + c] = Math.round(linear(image.data[nearest + c] / 255) * 255);
}
mesh.color = Buffer.from(color).toString("base64");
mesh.fallbackBake =
  "Final HF-derived atlas sampled in linear RGB; 8-bit normalized vertex color";
await writeFile(meshPath, JSON.stringify(mesh) + "\n");
console.log(mesh.kind, "fallback bytes", color.byteLength);
