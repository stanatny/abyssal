import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaRefuge } from "../src/mariana_refuge.js";

const events = {};
const tick = () => new Promise((resolve) => setImmediate(resolve));
function environment(t, fetcher) {
  const previous = [globalThis.window, globalThis.createImageBitmap];
  globalThis.window = {
    addEventListener(name, callback) {
      events[name] = callback;
    },
  };
  const bitmaps = [];
  globalThis.createImageBitmap = async () => {
    const bitmap = {
      closed: 0,
      close() {
        this.closed++;
      },
    };
    bitmaps.push(bitmap);
    return bitmap;
  };
  t.mock.method(globalThis, "fetch", fetcher);
  t.after(() => {
    [globalThis.window, globalThis.createImageBitmap] = previous;
  });
  return bitmaps;
}
function fixture(t) {
  const owned = new Set(),
    refuge = createMarianaRefuge(new THREE.Group(), {
      keep: (r) => (owned.add(r), r),
      heightAt: () => -2770,
    });
  const assets = [
    ...refuge.root.userData.refugeBuildings.assets.values(),
    ...refuge.root.userData.refugeResidents.assets.values(),
  ];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const r of owned) r.dispose();
  };
  t.after(dispose);
  return { ...refuge, assets, dispose };
}
async function settled(f, state) {
  for (let i = 0; i < 30; i++) {
    if (f.assets.every((a) => a.prepare.state === state)) return;
    await tick();
  }
  assert.deepEqual(
    f.assets.map((a) => a.prepare.state),
    Array(7).fill(state),
  );
}
const response = () => ({ ok: true, blob: async () => ({}) });

test("Shallow Mariana keeps complete refuge solids and fallback without downloading its seven colors", async (t) => {
  const requests = [];
  environment(t, async (url) => (requests.push(String(url)), response()));
  const f = fixture(t);
  for (const y of [-18, -650, -1375, -1799.9]) f.update(3, { y });
  await tick();
  assert.equal(f.colliders.length, 1373);
  assert.equal(f.assets.length, 7);
  assert.ok(f.assets.every((a) => a.geometry.attributes.color.count > 100));
  assert.ok(f.assets.every((a) => a.material.vertexColors && !a.material.map));
  assert.equal(f.root.visible, false);
  assert.deepEqual(requests, []);
});

test("Final-layer approach preloads once while hidden; pause, retreat and return reuse the same textures", async (t) => {
  const requests = [];
  environment(t, async (url) => (requests.push(String(url)), response()));
  const f = fixture(t);
  f.update(20, { y: -1800 });
  assert.equal(f.root.visible, false);
  await settled(f, "ready");
  assert.equal(requests.length, 7);
  const textures = f.assets.map((a) => a.material.map);
  f.update(20, { y: -2500 });
  const resident = f.root.userData.refugeResidents;
  const pose = resident.instances.flatMap((i) =>
    i.bones.flatMap((b) => b.quaternion.toArray()),
  );
  f.update(20, { y: -2500 });
  assert.deepEqual(
    resident.instances.flatMap((i) =>
      i.bones.flatMap((b) => b.quaternion.toArray()),
    ),
    pose,
  );
  for (const y of [-18, -1800, -2401, -2700]) f.update(22, { y });
  await tick();
  assert.equal(requests.length, 7);
  assert.deepEqual(
    f.assets.map((a) => a.material.map),
    textures,
  );
  assert.equal(f.root.visible, true);
});

test("Direct arrival displays complete colored fallback while slow texture requests finish", async (t) => {
  const pending = [];
  environment(t, () => new Promise((r) => pending.push(() => r(response()))));
  const f = fixture(t);
  f.update(0, { y: -2740 });
  assert.equal(f.root.visible, true);
  assert.equal(f.colliders.length, 1373);
  assert.ok(f.assets.every((a) => a.material.vertexColors && !a.material.map));
  for (let i = 0; i < 10; i++) {
    await tick();
    pending.splice(0).forEach((resolve) => resolve());
  }
  await settled(f, "ready");
  assert.ok(f.assets.every((a) => a.material.map && !a.material.vertexColors));
});

test("Failed deep colors recover on the normal online event, without re-entering or replacing the refuge", async (t) => {
  let online = false;
  environment(t, async () => {
    if (!online) throw new Error("Injected network outage");
    return response();
  });
  const f = fixture(t),
    geometry = f.assets.map((a) => a.geometry);
  f.update(3, { y: -1810 });
  await settled(f, "error");
  assert.ok(f.assets.every((a) => !a.material.map && a.material.vertexColors));
  online = true;
  events.online();
  await settled(f, "ready");
  assert.deepEqual(
    f.assets.map((a) => a.geometry),
    geometry,
  );
});

test("Switching away during deferred requests aborts them and removes queued work; disposed updates cannot restart", async (t) => {
  let requested = 0,
    aborted = 0;
  environment(t, (_url, { signal }) => {
    requested++;
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        aborted++;
        reject(new Error("Aborted"));
      });
    });
  });
  const f = fixture(t);
  f.update(2, { y: -1801 });
  await tick();
  assert.equal(requested, 6);
  f.dispose();
  await settled(f, "disposed");
  await tick();
  f.update(4, { y: -2700 });
  events.online();
  await tick();
  assert.equal(requested, 6);
  assert.equal(aborted, 6);
  assert.ok(f.assets.every((a) => !a.material.map));
});

test("Shared refuge surfaces survive an owner's disposal and close decoded images only on last release", async (t) => {
  let requests = 0;
  const bitmaps = environment(t, async () => (requests++, response()));
  const a = fixture(t),
    b = fixture(t);
  a.update(2, { y: -1900 });
  await settled(a, "ready");
  a.dispose();
  b.update(5, { y: -2750 });
  await settled(b, "ready");
  assert.equal(requests, 7);
  assert.ok(bitmaps.every((x) => x.closed === 0));
  b.dispose();
  assert.ok(bitmaps.every((x) => x.closed === 1));
});
