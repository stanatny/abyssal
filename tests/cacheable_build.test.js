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
  compressedAssets().generateBundle.call(
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
