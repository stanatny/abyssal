import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { acquireAmazonDriftwood } from "../src/amazon_driftwood_asset.js";
import {
  createAmazonOcean,
  createAmazonOceanSteps,
} from "../src/amazon_ocean.js";

test("driftwood keeps a small shared surface and releases only after its final owner", () => {
  const a = acquireAmazonDriftwood(),
    b = acquireAmazonDriftwood();
  assert.equal(a.geometry, b.geometry);
  assert.equal(a.material, b.material);
  assert.ok(a.geometry.index.count / 3 <= 2100);
  assert.equal(a.geometry.attributes.skinWeight, undefined);
  assert.ok(
    Math.abs(a.geometry.boundingBox.max.z - a.geometry.boundingBox.min.z - 14) <
      1e-5,
  );
  for (const id of new Set(a.geometry.index.array)) {
    const n = new THREE.Vector3().fromBufferAttribute(
      a.geometry.attributes.normal,
      id,
    );
    assert.ok(n.length() > 0.99 && n.length() < 1.01);
  }
  let disposed = 0;
  a.geometry.addEventListener("dispose", () => disposed++);
  a.release();
  a.release();
  assert.equal(disposed, 0);
  b.release();
  b.release();
  assert.equal(disposed, 1);
  const c = acquireAmazonDriftwood();
  assert.notEqual(c.geometry, a.geometry);
  c.release();
});
test("normal Amazon construction initiates driftwood color and retains 112 instanced trunks", async (t) => {
  const descriptors = Object.fromEntries(
    ["window", "createImageBitmap"].map((k) => [
      k,
      Object.getOwnPropertyDescriptor(globalThis, k),
    ]),
  );
  globalThis.window = { addEventListener() {} };
  globalThis.createImageBitmap = async () => ({ close() {} });
  t.after(() => {
    for (const [k, d] of Object.entries(descriptors)) {
      if (d) Object.defineProperty(globalThis, k, d);
      else delete globalThis[k];
    }
  });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(String(url));
    return new Response(new Uint8Array([1]));
  });
  const ocean = createAmazonOcean(new THREE.Scene());
  try {
    const logs = [];
    ocean.root.traverse((o) => {
      if (o.name === "river_logs") logs.push(o);
    });
    for (let i = 0; i < 100 && !logs[0].material.userData.texturesReady; i++)
      await new Promise((r) => setImmediate(r));
    assert.ok(logs[0].material.userData.texturesReady);
    assert.ok(
      requests.some((url) => url.endsWith("/river_driftwood_hf_color.webp")),
    );
    assert.equal(
      logs.reduce((s, o) => s + o.count, 0),
      112,
    );
    assert.equal(new Set(logs.map((o) => o.geometry)).size, 1);
    assert.equal(ocean.colliders.length, 2162);
    let textures = 0;
    logs[0].material.map.addEventListener("dispose", () => textures++);
    ocean.dispose();
    ocean.dispose();
    assert.equal(textures, 1);
  } finally {
    ocean.dispose();
  }
});
test("aborted riverbed construction returns its acquired asset and leaves no scene root", () => {
  const scene = new THREE.Scene(),
    iterator = createAmazonOceanSteps(scene);
  let step;
  do {
    step = iterator.next();
    assert.ok(!step.done);
  } while (step.value !== "riverbed-ecology");
  const held = acquireAmazonDriftwood();
  let disposed = 0;
  held.geometry.addEventListener("dispose", () => disposed++);
  iterator.return();
  assert.equal(scene.children.length, 0);
  assert.equal(disposed, 0);
  held.release();
  assert.equal(disposed, 1);
});

test("driftwood rests beside rocks with matching contacts and clear river crossings", async () => {
  const { amazonSeabedHeight } = await import("../src/amazon_config.js");
  const ocean = createAmazonOcean(new THREE.Scene());
  try {
    const contacts = ocean.colliders.filter(
      (c) => c.kind === "submerged_driftwood",
    );
    const rocks = ocean.colliders.filter((c) => c.kind === "riverbed_stone");
    const instances = [];
    ocean.root.traverse((o) => {
      if (o.name === "river_logs")
        for (let i = 0; i < o.count; i++) {
          const m = new THREE.Matrix4();
          o.getMatrixAt(i, m);
          instances.push(m);
        }
    });
    assert.equal(contacts.length, 112);
    assert.equal(instances.length, 112);
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i],
        m = instances[i];
      assert.ok(
        new THREE.Vector3(0, 0, -6).applyMatrix4(m).distanceTo(c.a) < 0.0002,
      );
      assert.ok(
        new THREE.Vector3(0, 0, 6).applyMatrix4(m).distanceTo(c.b) < 0.0002,
      );
      for (let j = 0; j <= 12; j++) {
        const p = c.a.clone().lerp(c.b, j / 12),
          gap = p.y - amazonSeabedHeight(p.x, p.z) - c.radius;
        assert.ok(gap < 1 && gap > -1);
        assert.ok(Math.abs(p.x) >= 36);
        for (const g of [-330, -650, -940]) assert.ok(Math.abs(p.z - g) >= 24);
        for (const r of rocks) {
          const q = p
            .clone()
            .sub(new THREE.Vector3(r.x, r.y, r.z))
            .applyQuaternion(r.rotation.clone().invert());
          const n =
            (q.x / (r.axes.x + c.radius)) ** 2 +
            (q.y / (r.axes.y + c.radius)) ** 2 +
            (q.z / (r.axes.z + c.radius)) ** 2;
          assert.ok(n >= 1 - 1e-10);
        }
      }
    }
  } finally {
    ocean.dispose();
  }
});
