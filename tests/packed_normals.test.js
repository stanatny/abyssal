import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { repairPackedNormals } from "../scripts/repair_packed_normals.mjs";
const encode = (a) => Buffer.from(a.buffer).toString("base64");

test("packed authored surfaces contain usable normals before GPU normalization", () => {
  let files = 0;
  for (const file of readdirSync("src/assets/models")) {
    if (!file.endsWith(".json")) continue;
    const d = JSON.parse(readFileSync("src/assets/models/" + file));
    if (typeof d.normal !== "string" || !d.vertices) continue;
    const n = new Int16Array(
      Uint8Array.from(Buffer.from(d.normal, "base64")).buffer,
    );
    assert.equal(n.length, d.vertices * 3, file);
    for (let i = 0; i < n.length; i += 3) {
      const length = Math.hypot(n[i], n[i + 1], n[i + 2]) / 32767;
      assert.ok(
        length > 0.5 && length < 1.01,
        `${file} vertex ${i / 3}: ${length}`,
      );
    }
    files++;
  }
  assert.ok(files > 100, "Audit the shared packed asset catalog");
});

test("offline repair keeps authored normals and mesh data, restores face normals across UV seams", () => {
  const d = {
    min: [0, 0, 0],
    max: [1, 1, 1],
    vertices: 5,
    position: encode(
      new Uint16Array([
        0, 0, 0, 65535, 0, 0, 0, 65535, 0, 0, 0, 0, 65535, 65535, 65535,
      ]),
    ),
    normal: encode(
      new Int16Array([0, 0, 0, 0, 0, 32767, 0, 0, 32767, 0, 0, 0, 0, 0, 0]),
    ),
    index: encode(new Uint16Array([0, 1, 2, 3, 1, 2])),
    uv: "Unchanged atlas",
  };
  const before = structuredClone(d);
  assert.equal(repairPackedNormals(d), 3);
  assert.deepEqual({ ...d, normal: before.normal }, before);
  const n = new Int16Array(
    Uint8Array.from(Buffer.from(d.normal, "base64")).buffer,
  );
  for (let i = 0; i < 5; i++)
    assert.deepEqual(Array.from(n.slice(i * 3, i * 3 + 3)), [0, 0, 32767]);
  const fixed = d.normal;
  assert.equal(repairPackedNormals(d), 0);
  assert.equal(d.normal, fixed);
});
