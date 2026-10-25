import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  acquireAmazonCanopy,
  createAmazonCanopyMaterial,
} from "../src/amazon_canopy_asset.js";
import { createAmazonSpiderMonkey } from "../src/amazon_spider_monkey.js";
import {
  sampleCanopyTraverse,
  placeCanopyMonkey,
} from "../src/amazon_canopy_motion.js";
import { amazonSurfaceHeight } from "../src/amazon_config.js";
import { canopyVineHeight } from "../src/amazon_arboreal.js";
import {
  createAmazonOcean,
  createAmazonOceanSteps,
} from "../src/amazon_ocean.js";

// 直接检查实际蒙皮顶点、抓点、多个实例及释放，不以骨骼角度代替皮肤。
test("spider monkey keeps continuous seams and fixed grips through a complete traverse", () => {
  const a = createAmazonSpiderMonkey(),
    b = createAmazonSpiderMonkey();
  const state = { hands: [{}, {}] },
    hands = [new T.Vector3(), new T.Vector3()],
    v = new T.Vector3(),
    w = new T.Vector3();
  const p = a.mesh.geometry.attributes.position,
    index = a.mesh.geometry.index.array,
    original = p.array.slice(),
    seams = [],
    seen = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (seen.has(key)) seams.push([i, seen.get(key)]);
    else seen.set(key, i);
  }
  try {
    assert.equal(a.mesh.geometry, b.mesh.geometry);
    assert.notEqual(a.skeleton, b.skeleton);
    for (let frame = 0; frame < 240; frame++) {
      const span = [14, 19, 27][Math.floor(frame / 80)];
      const t = (frame % 80) * 0.37,
        pose = sampleCanopyTraverse(t, span, state);
      placeCanopyMonkey(a, pose, canopyVineHeight(pose.x, span), v);
      for (let side = 0; side < 2; side++)
        hands[side].set(
          pose.hands[side].x,
          canopyVineHeight(pose.hands[side].x, span) - pose.hands[side].drop,
          0,
        );
      a.pose(t, hands, false, pose);
      for (let side = 0; side < 2; side++) {
        v.set(side ? 0.025 : -0.02, -0.02, side ? 0.065 : 0.03);
        a.skeleton.bones[side ? 8 : 5].localToWorld(v);
        assert.ok(v.distanceTo(hands[side]) < 1e-5);
      }
      const posed = [];
      for (let i = 0; i < p.count; i++) {
        a.mesh.getVertexPosition(i, v);
        assert.ok(v.toArray().every(Number.isFinite));
        posed.push(v.clone());
      }
      for (const [x, y] of seams)
        assert.ok(posed[x].distanceTo(posed[y]) < 1e-6);
      for (let i = 0; i < index.length; i += 3)
        for (let k = 0; k < 3; k++) {
          const x = index[i + k],
            y = index[i + ((k + 1) % 3)],
            rest = v
              .fromBufferAttribute(p, x)
              .distanceTo(w.fromBufferAttribute(p, y));
          if (rest > 0.003) assert.ok(posed[x].distanceTo(posed[y]) < rest * 3);
        }
    }
    assert.deepEqual(p.array, original);
    assert.ok(
      b.skeleton.bones.every((bone) =>
        bone.quaternion.equals(new T.Quaternion()),
      ),
    );
    let released = 0;
    a.mesh.geometry.addEventListener("dispose", () => released++);
    a.dispose();
    a.dispose();
    assert.equal(released, 0);
    b.dispose();
    b.dispose();
    assert.equal(released, 1);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test("canopy scene finishes share one color owner but retain independent wind clocks", async (t) => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"),
    oldBitmap = Object.getOwnPropertyDescriptor(
      globalThis,
      "createImageBitmap",
    );
  globalThis.window = { addEventListener() {} };
  globalThis.createImageBitmap = async () => ({ close() {} });
  t.after(() => {
    for (const [key, d] of [
      ["window", oldWindow],
      ["createImageBitmap", oldBitmap],
    ])
      d ? Object.defineProperty(globalThis, key, d) : delete globalThis[key];
  });
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(String(url));
    return new Response(new Uint8Array([1]));
  });
  for (const kind of ["kapok", "kapokFar", "palm"]) {
    const a = acquireAmazonCanopy(kind),
      b = acquireAmazonCanopy(kind),
      ra = new Set(),
      rb = new Set(),
      ta = { value: 1 },
      tb = { value: 5 };
    const ca = createAmazonCanopyMaterial(a, ta, ra),
      cb = createAmazonCanopyMaterial(b, tb, rb);
    const shader = () => ({
        uniforms: {},
        vertexShader: "#include <common>\n#include <begin_vertex>",
      }),
      sa = shader(),
      sb = shader();
    ca.material.onBeforeCompile(sa);
    cb.material.onBeforeCompile(sb);
    assert.equal(sa.uniforms.canopyTime, ta);
    assert.equal(sb.uniforms.canopyTime, tb);
    await Promise.all([ca.prepare(), cb.prepare()]);
    assert.equal(ca.material.map, cb.material.map);
    assert.ok(ca.material.map);
    assert.equal(ca.material.vertexColors, false);
    assert.equal(a.geometry, b.geometry);
    let releases = 0;
    a.geometry.addEventListener("dispose", () => releases++);
    for (const r of ra) r.dispose();
    a.release();
    assert.equal(releases, 0);
    for (const r of rb) r.dispose();
    b.release();
    assert.equal(releases, 1);
  }
  assert.equal(urls.length, 3);
});

test("Amazon canopy retains bounded independent fauna and one visible level per tree chunk", () => {
  const ocean = createAmazonOcean(new T.Scene());
  try {
    const forest = ocean.root.getObjectByName("amazon_rainforest"),
      chunks = forest.children.filter((n) => n.name === "rainforest_chunk"),
      monkeys = forest.getObjectByName("amazon_spider_monkeys");
    assert.equal(chunks.length, 110);
    assert.equal(ocean.colliders.length, 2162);
    assert.equal(ocean.barriers.length, 13);
    assert.ok(monkeys.children.length >= 3 && monkeys.children.length <= 6);
    assert.equal(monkeys.userData.supports.length, monkeys.children.length);
    for (const [a, b] of monkeys.userData.anchors) {
      assert.ok(a[1] < 24 && a[1] > 10);
      for (let i = 0; i <= 20; i++) {
        const x = T.MathUtils.lerp(a[0], b[0], i / 20),
          z = T.MathUtils.lerp(a[2], b[2], i / 20),
          ground = amazonSurfaceHeight(x, z);
        assert.ok(
          ground < a[1] - 6,
          "low route leaves room for the hanging skin",
        );
        assert.ok(ground < 12, "route remains over the waterside slope");
      }
    }
    const animals = monkeys.children.map((g) => g.children[1]),
      initial = animals.map((n) => n.position.clone());
    const position = monkeys.children[0].position.clone();
    ocean.update(6, position);
    assert.ok(animals.some((n, i) => !n.position.equals(initial[i])));
    const frozen = animals.map((n) => n.position.clone());
    ocean.update(6, position);
    assert.ok(animals.every((n, i) => n.position.equals(frozen[i])));
    ocean.update(10, position, 0, null, null, true);
    const reduced = animals.map((n) => n.position.clone());
    ocean.update(20, position, 0, null, null, true);
    assert.ok(animals.every((n, i) => n.position.equals(reduced[i])));
    for (const chunk of chunks) {
      const near = chunk.getObjectByName("rainforest_kapok_hf"),
        far = chunk.getObjectByName("rainforest_kapok_far_hf");
      if (!near) continue;
      assert.deepEqual(near.instanceMatrix.array, far.instanceMatrix.array);
      assert.notEqual(near.visible, far.visible);
      assert.ok(near.geometry.index.count > far.geometry.index.count * 2);
    }
    ocean.update(30, new T.Vector3(0, -80, -600));
    assert.equal(monkeys.visible, false);
  } finally {
    ocean.dispose();
    ocean.dispose();
  }
});

test("cancelling construction releases local wind materials without evicting other owners", () => {
  const holder = acquireAmazonCanopy("kapok"),
    scene = new T.Scene(),
    iterator = createAmazonOceanSteps(scene);
  let result;
  do {
    result = iterator.next();
  } while (!result.done && result.value !== "rainforest-canopy");
  const local = scene.getObjectByName("rainforest_kapok_hf").material;
  let localDisposals = 0,
    sharedDisposals = 0;
  local.addEventListener("dispose", () => localDisposals++);
  holder.geometry.addEventListener("dispose", () => sharedDisposals++);
  iterator.return();
  assert.equal(scene.children.length, 0);
  assert.equal(localDisposals, 1);
  assert.equal(sharedDisposals, 0);
  holder.release();
  assert.equal(sharedDisposals, 1);
});
