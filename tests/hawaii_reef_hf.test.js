import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createOcean } from "../src/ocean.js";
import baseline from "./fixtures/hawaii_colliders_5cea32f.json" with { type: "json" };
import { acquireHawaiiReefAsset } from "../src/hawaii_reef_asset.js";
import { createHawaiiReefDecorations } from "../src/hawaii_reef_decorations.js";

const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const kinds = ["reef_branch", "reef_fan", "reef_brain", "reef_sponge"];

test("normal reef construction loads all four colors without a debug prepare call", async (t) => {
  const requests = [];
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window"),
    originalBitmap = Object.getOwnPropertyDescriptor(
      globalThis,
      "createImageBitmap",
    );
  globalThis.window = { addEventListener() {} };
  globalThis.createImageBitmap = async () => ({ close() {} });
  t.after(() => {
    for (const [key, descriptor] of [
      ["window", originalWindow],
      ["createImageBitmap", originalBitmap],
    ]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(String(url));
    return new Response(new Uint8Array([1]));
  });
  const reef = createHawaiiReefDecorations(new THREE.Scene(), {
    rand: () => 0.5,
    heightAt: () => -20,
  });
  try {
    // 只观察构造后的共享材质；主动调用 prepare 会掩盖生产路径漏加载。
    const materials = new Set();
    reef.root.traverse((node) => {
      if (node.name.endsWith("_close")) materials.add(node.material);
    });
    for (let i = 0; i < 100; i++) {
      if ([...materials].every((m) => m.userData.texturesReady)) break;
      await new Promise((resolve) => setImmediate(resolve));
    }
    assert.equal(materials.size, 4);
    assert.ok([...materials].every((m) => m.map && m.userData.texturesReady));
    assert.equal(requests.length, 4);
    for (const kind of kinds)
      assert.ok(requests.some((url) => url.endsWith(`${kind}_hf_color.webp`)));
  } finally {
    reef.dispose();
  }
});

test("reef redraw retains pre-redraw colony anchors and static collision layout", (t) => {
  const ocean = createOcean(new THREE.Scene());
  try {
    // 原始 double 字符串哈希会放大平台 sin/cos 的末位差异；逐项保留结构、顺序和纳米级坐标约束。
    let maxDelta = 0;
    function compare(actual, expected, path = "colliders") {
      assert.equal(typeof actual, typeof expected, path);
      if (typeof expected === "number") {
        const delta = Math.abs(actual - expected);
        assert.ok(
          Number.isFinite(actual) && delta <= 1e-9,
          `${path}: ${actual} != ${expected}`,
        );
        maxDelta = Math.max(maxDelta, delta);
      } else if (expected !== null && typeof expected === "object") {
        assert.ok(actual !== null, path);
        assert.equal(Array.isArray(actual), Array.isArray(expected), path);
        assert.deepEqual(Object.keys(actual), Object.keys(expected), path);
        for (const key of Object.keys(expected))
          compare(actual[key], expected[key], `${path}.${key}`);
      } else assert.equal(actual, expected, path);
    }
    // 快照来源和数量不能跟着当前实现重新生成后静默接受。
    assert.equal(hash(baseline.colliders), baseline.originalSha256);
    assert.equal(baseline.colliders.length, 646);
    compare(ocean.colliders, baseline.colliders);
    t.diagnostic(`Collider snapshot maximum numeric delta: ${maxDelta}`);
    assert.throws(() => compare([1.001], [1]), /colliders.0/);
    assert.throws(() => compare([1, 1], [1]));
    assert.equal(ocean.obstacles.length, 401);
    // 锚点快照来自提交前的独立旧版工厂，按 GPU float32 精度比较。
    for (const [group, expected] of [
      [
        ["reef_branch"],
        "b6eedd5cb6780f8a1fc55559a1f621b6284669c017da83b2b2b59b1b85c62fa7",
      ],
      [
        ["reef_fan"],
        "ac19169f5b5af1bbb1c4cdeeadf836c0e45c8fcd65cf4a8f412678cec088c6f0",
      ],
      [
        ["reef_brain", "reef_sponge"],
        "40bc104b656c8b0a81345a7d553f5da60b114c323fe77e07bcabe8972e106f66",
      ],
    ]) {
      const points = group.flatMap((kind) =>
        ocean.reef.placements[kind].map(({ x, z }) => [
          Math.fround(x),
          Math.fround(z),
        ]),
      );
      points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      assert.equal(hash(points), expected);
    }
  } finally {
    ocean.dispose();
  }
});

test("reef LOD keeps exactly one visible representation per colony across movement and restart", () => {
  const scene = new THREE.Scene(),
    ocean = createOcean(scene),
    reef = ocean.reef;
  const row = reef.placements.reef_branch[0];
  const counts = () => {
    let close = 0,
      far = 0;
    reef.root.traverse((node) => {
      if (!node.isInstancedMesh) return;
      if (node.name.endsWith("_close")) close += node.count;
      else far += node.count;
      assert.equal(node.visible, node.count > 0);
    });
    assert.equal(close + far, 357);
    return { close, far };
  };
  reef.update(100, new THREE.Vector3(row.x, row.y, row.z));
  assert.ok(counts().close > 0);
  reef.update(101, new THREE.Vector3(10000, 10000, 10000));
  assert.equal(counts().close, 0);
  reef.update(0, new THREE.Vector3(row.x, row.y, row.z));
  assert.ok(counts().close > 0);
  const before = counts();
  reef.update(0.1, new THREE.Vector3(10000, 10000, 10000));
  assert.deepEqual(counts(), before);
  ocean.dispose();
  ocean.dispose();
  assert.equal(scene.children.length, 0);
});

test("reef near and distant surfaces retain valid shared attributes and finite bounds", () => {
  for (const kind of kinds) {
    const asset = acquireHawaiiReefAsset(kind);
    try {
      assert.ok(asset.geometry.index.count / 3 <= 8000);
      assert.ok(asset.farGeometry.index.count / 3 <= 1100);
      assert.ok(asset.farGeometry.index.count < asset.geometry.index.count);
      assert.equal(
        asset.geometry.attributes.uv.count,
        asset.geometry.attributes.position.count,
      );
      assert.equal(
        asset.geometry.attributes.color.count,
        asset.geometry.attributes.position.count,
      );
      assert.ok(
        [...asset.geometry.attributes.position.array].every(Number.isFinite),
      );
      assert.ok(
        [...asset.geometry.attributes.normal.array].every(Number.isFinite),
      );
      assert.ok(Math.abs(asset.geometry.boundingBox.min.y) < 1e-6);
      assert.equal(asset.farMaterial.vertexColors, true);
      assert.equal(asset.farMaterial.map, null);
      for (const geometry of [asset.geometry, asset.farGeometry]) {
        const normal = geometry.attributes.normal;
        for (const i of new Set(geometry.index.array))
          assert.ok(
            Math.hypot(normal.getX(i), normal.getY(i), normal.getZ(i)) > 0.98,
            "rendered normals must not poison bloom with NaN",
          );
      }
    } finally {
      asset.release();
    }
  }
});

test("two reef owners release both LODs only after the last owner", () => {
  for (const kind of kinds) {
    const a = acquireHawaiiReefAsset(kind),
      b = acquireHawaiiReefAsset(kind);
    assert.equal(a.geometry, b.geometry);
    assert.equal(a.farGeometry, b.farGeometry);
    const disposed = [];
    for (const key of ["geometry", "material", "farGeometry", "farMaterial"])
      a[key].addEventListener("dispose", () => disposed.push(key));
    a.release();
    a.release();
    assert.equal(disposed.length, 0);
    b.release();
    b.release();
    assert.equal(new Set(disposed).size, 4);
    assert.equal(disposed.length, 4);
  }
});
