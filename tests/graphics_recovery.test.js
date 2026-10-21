import test from "node:test";
import assert from "node:assert/strict";
import {
  createEnvironmentCache,
  createGraphicsRecovery,
  releaseLostSceneResources,
} from "../src/graphics_recovery.js";
const tick = () => new Promise((r) => setImmediate(r));
function event(canvas, type) {
  const e = new Event(type, { cancelable: true });
  canvas.dispatchEvent(e);
  return e;
}
test("generated environments rebuild the selected night/ice target and retire stale GPU contents", () => {
  const made = [];
  const cache = createEnvironmentCache((kind) => {
    const target = {
      texture: { kind },
      retired: 0,
      dispose() {
        this.retired++;
      },
    };
    made.push(target);
    return target;
  });
  const day = cache.select();
  const night = cache.select("night");
  assert.equal(cache.select("day"), day);
  assert.equal(cache.select("night"), night);
  const next = cache.restore();
  assert.equal(next.kind, "night");
  assert.notEqual(next, night);
  assert.deepEqual(
    made.slice(0, 2).map((t) => t.retired),
    [1, 1],
  );
  cache.select("ice");
  assert.equal(cache.restore().kind, "ice");
  cache.dispose();
  cache.dispose();
  assert.ok(made.every((t) => t.retired === 1));
  assert.equal(cache.restore(), null);
});
test("resume remains blocked until restoration and first frame complete", async () => {
  const canvas = new EventTarget();
  let complete,
    lost = 0,
    ready = 0;
  const recovery = createGraphicsRecovery(canvas, {
    restore: () =>
      new Promise((r) => {
        complete = r;
      }),
    onLost: () => lost++,
    onReady: () => ready++,
  });
  assert.equal(event(canvas, "webglcontextlost").defaultPrevented, true);
  assert.equal(recovery.pending, true);
  assert.equal(lost, 1);
  event(canvas, "webglcontextrestored");
  await tick();
  assert.equal(recovery.pending, true);
  assert.equal(ready, 0);
  complete();
  await tick();
  assert.equal(recovery.pending, false);
  assert.equal(ready, 1);
  recovery.dispose();
});
test("a second loss invalidates the previous async completion", async () => {
  const canvas = new EventTarget(),
    completes = [];
  let ready = 0;
  const recovery = createGraphicsRecovery(canvas, {
    restore: () => new Promise((r) => completes.push(r)),
    onReady: () => ready++,
  });
  event(canvas, "webglcontextlost");
  event(canvas, "webglcontextrestored");
  event(canvas, "webglcontextlost");
  completes[0]();
  await tick();
  assert.equal(recovery.pending, true);
  assert.equal(ready, 0);
  event(canvas, "webglcontextrestored");
  completes[1]();
  await tick();
  assert.equal(recovery.pending, false);
  assert.equal(ready, 1);
  recovery.dispose();
});
test("failed rebuild stays blocked and disposal removes both listeners", async () => {
  const canvas = new EventTarget();
  let failures = 0,
    calls = 0;
  const recovery = createGraphicsRecovery(canvas, {
    restore() {
      calls++;
      throw Error("generation failed");
    },
    onError: () => failures++,
  });
  event(canvas, "webglcontextlost");
  event(canvas, "webglcontextrestored");
  await tick();
  assert.equal(recovery.pending, true);
  assert.equal(failures, 1);
  recovery.dispose();
  assert.equal(event(canvas, "webglcontextlost").defaultPrevented, false);
  event(canvas, "webglcontextrestored");
  await tick();
  assert.equal(calls, 1);
});
test("disposal invalidates an outstanding successful rebuild", async () => {
  const canvas = new EventTarget();
  let complete,
    ready = 0;
  const recovery = createGraphicsRecovery(canvas, {
    restore: () =>
      new Promise((r) => {
        complete = r;
      }),
    onReady: () => ready++,
  });
  event(canvas, "webglcontextrestored");
  recovery.dispose();
  complete();
  await tick();
  assert.equal(ready, 0);
});

test("lost buffer retirement deduplicates geometry and preserves model/image data", () => {
  let retiredGeometry = 0,
    retiredInstance = 0;
  const data = new Float32Array([1, 2, 3]);
  const geometry = {
    attributes: { position: { array: data } },
    dispose() {
      retiredGeometry++;
    },
  };
  const image = { width: 8, height: 8 };
  const node = {
    geometry,
    isInstancedMesh: true,
    instanceMatrix: { array: data },
    material: {
      map: {
        image,
        dispose() {
          throw Error("Must retain texture subscriptions");
        },
      },
    },
    dispatchEvent() {
      retiredInstance++;
    },
  };
  const root = {
    traverse(fn) {
      fn(node);
    },
  };
  let cleared = 0;
  const renderer = {
    getContext: () => ({ isContextLost: () => true }),
    properties: {
      dispose() {
        cleared++;
      },
    },
  };
  releaseLostSceneResources(renderer, [root, root]);
  assert.equal(cleared, 1);
  assert.equal(retiredGeometry, 1);
  assert.equal(retiredInstance, 1);
  assert.equal(node.geometry.attributes.position.array, data);
  assert.equal(node.instanceMatrix.array, data);
  assert.equal(node.material.map.image, image);
});
