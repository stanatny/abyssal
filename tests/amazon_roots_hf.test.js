import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { amazonIslandCeiling } from "../src/amazon_config.js";
import { acquireAmazonRoot, bendAmazonRoot } from "../src/amazon_root_asset.js";
import {
  createAmazonOcean,
  createAmazonOceanSteps,
} from "../src/amazon_ocean.js";

test("HF root copies bend continuously inside the existing solid envelope, with valid normals and intact UVs", () => {
  const asset = acquireAmazonRoot("buttress");
  const source = asset.geometry,
    original = source.attributes.position.array.slice();
  try {
    for (const points of [
      [
        [0, 12, 0],
        [7, 3, -7],
        [17, -20, -14],
      ],
      [
        [0, 30, 0],
        [-7, 22, -7],
        [-17, 10, -14],
      ],
      [
        [0, 20, 0],
        [0, 10, 0],
        [0, 0, 0],
      ],
    ]) {
      const curve = new T.CatmullRomCurve3(
          points.map((p) => new T.Vector3(...p)),
        ),
        g = bendAmazonRoot(source, curve, 1.2),
        p = g.attributes.position,
        n = g.attributes.normal,
        centers = Array.from({ length: 301 }, (_, i) =>
          curve.getPoint(i / 300),
        ),
        seams = new Map();
      try {
        assert.deepEqual(g.attributes.uv.array, source.attributes.uv.array);
        assert.deepEqual(g.index.array, source.index.array);
        for (let i = 0; i < p.count; i++) {
          const v = new T.Vector3().fromBufferAttribute(p, i),
            normal = new T.Vector3().fromBufferAttribute(n, i);
          assert.ok(v.toArray().every(Number.isFinite));
          // 解码法线是 normalized Int16，写回后的量化误差约 2.2e-5。
          assert.ok(Math.abs(normal.length() - 1) < 3e-5);
          assert.ok(
            Math.min(...centers.map((c) => c.distanceToSquared(v))) < 1.24 ** 2,
          );
          const key = [0, 1, 2].map((k) => original[i * 3 + k]).join(",");
          if (seams.has(key)) assert.ok(v.distanceTo(seams.get(key)) < 1e-6);
          else seams.set(key, v);
        }
        assert.deepEqual(source.attributes.position.array, original);
      } finally {
        g.dispose();
      }
    }
  } finally {
    asset.release();
  }
});

test("root surfaces have bounded shared ownership and release after the last scene only", () => {
  for (const kind of ["buttress", "hanging"]) {
    const a = acquireAmazonRoot(kind),
      b = acquireAmazonRoot(kind);
    assert.equal(a.geometry, b.geometry);
    assert.equal(a.material, b.material);
    assert.ok(a.geometry.index.count / 3 <= 1500);
    let g = 0,
      m = 0;
    a.geometry.addEventListener("dispose", () => g++);
    a.material.addEventListener("dispose", () => m++);
    a.release();
    a.release();
    assert.equal(g, 0);
    b.release();
    b.release();
    assert.equal(g, 1);
    assert.equal(m, 1);
    const c = acquireAmazonRoot(kind);
    assert.notEqual(c.geometry, a.geometry);
    c.release();
  }
});

test("normal river construction loads both root colors and releases both owned surfaces", async (t) => {
  const keys = ["window", "createImageBitmap"],
    before = keys.map((k) => Object.getOwnPropertyDescriptor(globalThis, k));
  globalThis.window = { addEventListener() {} };
  globalThis.createImageBitmap = async () => ({ close() {} });
  t.after(() =>
    keys.forEach((k, i) =>
      before[i]
        ? Object.defineProperty(globalThis, k, before[i])
        : delete globalThis[k],
    ),
  );
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(String(url));
    return new Response(new Uint8Array([1]));
  });
  const o = createAmazonOcean(new T.Scene());
  try {
    const root = o.root.getObjectByName("riverbank_roots_hf"),
      h = [];
    o.root.traverse((n) => {
      if (n.name === "island_hanging_root_hf") h.push(n);
    });
    assert.equal(h.length, 30);
    o.root.updateMatrixWorld(true);
    const capsules = o.colliders.filter(
      (c) => c.kind === "island_hanging_root",
    );
    for (let j = 0; j < h.length; j++) {
      const mesh = h[j],
        c = capsules[j],
        axis = c.b.clone().sub(c.a);
      let above = false,
        below = false;
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
        const v = new T.Vector3()
          .fromBufferAttribute(mesh.geometry.attributes.position, i)
          .applyMatrix4(mesh.matrixWorld);
        const t = T.MathUtils.clamp(
          v.clone().sub(c.a).dot(axis) / axis.lengthSq(),
          0,
          1,
        );
        assert.ok(
          v.distanceTo(c.a.clone().addScaledVector(axis, t)) <= c.radius,
        );
        const clear = amazonIslandCeiling(v.x, v.z) - v.y;
        above ||= clear < 0;
        below ||= clear > 0.5;
      }
      assert.ok(
        above && below,
        "root must attach to the roof and remain visible below it",
      );
    }
    assert.equal(root.geometry.index.count / 3, 56 * 1500);
    assert.equal(
      o.colliders.filter((c) => c.kind === "flooded_root").length,
      448,
    );
    assert.equal(o.colliders.length, 2162);
    for (
      let i = 0;
      i < 100 &&
      (!root.material.userData.texturesReady ||
        !h[0].material.userData.texturesReady);
      i++
    )
      await new Promise((r) => setImmediate(r));
    assert.ok(
      root.material.userData.texturesReady &&
        h[0].material.userData.texturesReady,
    );
    assert.ok(
      urls.some((u) => u.endsWith("buttress_root_hf_color.webp")) &&
        urls.some((u) => u.endsWith("hanging_root_hf_color.webp")),
    );
    let released = 0;
    for (const m of [root.material, h[0].material])
      m.map.addEventListener("dispose", () => released++);
    o.dispose();
    o.dispose();
    assert.equal(released, 2);
  } finally {
    o.dispose();
  }
});

test("cancelling during root construction releases its acquisition without affecting another owner", () => {
  const scene = new T.Scene(),
    it = createAmazonOceanSteps(scene);
  let step;
  do {
    step = it.next();
    assert.ok(!step.done);
  } while (step.value !== "flooded-roots");
  const a = acquireAmazonRoot("buttress");
  let released = 0;
  a.geometry.addEventListener("dispose", () => released++);
  it.return();
  assert.equal(scene.children.length, 0);
  assert.equal(released, 0);
  a.release();
  assert.equal(released, 1);
});
