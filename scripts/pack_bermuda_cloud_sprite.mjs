import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const [input, output, tools] = process.argv.slice(2);
if (!input || !output || !tools)
  throw Error(
    "Usage: pack_bermuda_cloud_sprite INPUT_PNG OUTPUT_WEBP TOOLS_DIR",
  );
const sharp = createRequire(path.resolve(tools, "package.json"))("sharp");
const bytes = await readFile(input);
// HF预处理为黑底RGB；运行时由亮度恢复密度。只缩放编码，不把它称为生成网格。
await sharp(bytes)
  .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0 } })
  .webp({ quality: 88 })
  .toFile(output);
const packed = await readFile(output);
await writeFile(
  output + ".receipt.json",
  JSON.stringify(
    {
      input: path.basename(input),
      inputSha256: createHash("sha256").update(bytes).digest("hex"),
      width: 512,
      height: 512,
      outputSha256: createHash("sha256").update(packed).digest("hex"),
      bytes: packed.length,
      source:
        "Built-in concept image, TRELLIS.2 Space background-removal output; 3D generation failed, no generated mesh",
    },
    null,
    2,
  ) + "\n",
);
console.log({ bytes: packed.length });
