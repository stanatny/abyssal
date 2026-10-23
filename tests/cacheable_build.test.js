import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import {
  compressedAssets,
  modelChunkName,
} from "../scripts/cacheable_build.js";

test("mesh chunks isolate data without moving gameplay, textures or unrelated JSON", () => {
  assert.equal(
    modelChunkName("/repo/src/assets/models/tuna_hf_mesh.json"),
    "model_tuna_hf_mesh",
  );
  for (const id of [
    "/repo/src/main.js",
    "/repo/src/config.json",
    "/repo/src/assets/models/tuna_hf_color.webp",
  ])
    assert.equal(modelChunkName(id), undefined);
});

test("precompressed JS/CSS preserve exact bytes and leave binary assets alone", () => {
  const emitted = [];
  const code = "export const model = [1,2,3];\n".repeat(100);
  const css = "body{color:#fff}\n".repeat(100);
  compressedAssets().generateBundle.handler.call(
    { emitFile: (asset) => emitted.push(asset) },
    {},
    {
      "assets/model-abcd1234.js": { type: "chunk", code },
      "assets/style-abcd1234.css": { type: "asset", source: css },
      "assets/voice-abcd1234.wav": { type: "asset", source: Buffer.alloc(200) },
    },
  );
  assert.equal(emitted.length, 2);
  assert.equal(gunzipSync(emitted[0].source).toString(), code);
  assert.equal(gunzipSync(emitted[1].source).toString(), css);
  assert.ok(emitted.every((item) => item.fileName.endsWith(".gz")));
});

test("真实动态导入构建的gzip包含最终预加载依赖，不保留Vite临时标记", async () => {
  const { build } = await import("vite");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const root = await mkdtemp(join(tmpdir(), "abyssal-compression-"));
  try {
    await writeFile(
      join(root, "index.html"),
      '<script type="module" src="/main.js"></script>',
    );
    await writeFile(
      join(root, "main.js"),
      'document.body.onclick = () => import("./lazy.js").then(m => m.run());',
    );
    await writeFile(
      join(root, "lazy.js"),
      'export const run = () => console.log("lazy module");',
    );
    const result = await build({
      root,
      configFile: false,
      logLevel: "silent",
      plugins: [compressedAssets()],
      build: { write: false },
    });
    const output = result.output;
    const scripts = output.filter((item) => item.type === "chunk");
    assert.ok(scripts.length >= 2);
    for (const chunk of scripts) {
      assert.doesNotMatch(chunk.code, /__VITE_PRELOAD__/);
      const gzip = output.find(
        (item) => item.fileName === `${chunk.fileName}.gz`,
      );
      if (gzip) assert.equal(gunzipSync(gzip.source).toString(), chunk.code);
    }
    assert.ok(output.some((item) => item.fileName.endsWith(".gz")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
