import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { decodePackedArray } from "../src/packed_array.js";

const types = {
  position: Uint16Array,
  normal: Int16Array,
  uv: Uint16Array,
  color: Uint8Array,
  index: Uint16Array,
  skinIndex: Uint16Array,
  skinWeight: Uint16Array,
  farIndex: Uint16Array,
  farNormal: Int16Array,
};
const folder = new URL("../src/assets/models/", import.meta.url);
const inputs = [];
function visit(value, path) {
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (types[key] && typeof item === "string")
      inputs.push({ path: path + "/" + key, value: item, Type: types[key] });
    else if (typeof item === "object") visit(item, path + "/" + key);
  }
}
for (const file of readdirSync(folder).filter((f) => f.endsWith(".json")))
  visit(JSON.parse(readFileSync(new URL(file, folder))), file);
function check() {
  assert.ok(inputs.length > 0);
  for (const { path, value, Type } of inputs) {
    const actual = decodePackedArray(value, Type),
      expected = Buffer.from(value, "base64");
    assert.equal(actual.byteLength, expected.byteLength, path);
    assert.deepEqual(
      Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength),
      expected,
      path,
    );
    const independent = decodePackedArray(value, Type);
    assert.notEqual(actual.buffer, independent.buffer, path);
  }
}
test("packed-array decoding preserves every shipped model and morph byte", () => {
  check();
});
test("older-browser packed-array fallback preserves the same complete asset corpus", () => {
  const descriptor = Object.getOwnPropertyDescriptor(Uint8Array, "fromBase64");
  try {
    Object.defineProperty(Uint8Array, "fromBase64", {
      value: undefined,
      configurable: true,
    });
    check();
  } finally {
    if (descriptor) Object.defineProperty(Uint8Array, "fromBase64", descriptor);
    else delete Uint8Array.fromBase64;
  }
});
