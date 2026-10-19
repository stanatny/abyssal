import test from "node:test";
import assert from "node:assert/strict";
import {
  createMaterialPreparation,
  waitForMaterials,
} from "../src/material_loading.js";
import * as THREE from "three";

function environment(t) {
  const events = {};
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    blob: async () => ({}),
  }));
  const oldWindow = globalThis.window,
    oldBitmap = globalThis.createImageBitmap;
  globalThis.window = {
    addEventListener: (name, fn) => {
      events[name] = fn;
    },
  };
  globalThis.createImageBitmap = async () => ({ close() {} });
  t.after(() => {
    globalThis.window = oldWindow;
    globalThis.createImageBitmap = oldBitmap;
  });
  return events;
}
const slot = (name, apply = () => {}) => ({
  name,
  url: name,
  colorSpace: THREE.SRGBColorSpace,
  apply,
});

test("material loading deduplicates concurrent callers and preserves color when surface fails", async (t) => {
  environment(t);
  const requests = [],
    textures = [];
  let failSurface = true;
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    if (url === "surface" && failSurface) throw Error("temporary");
    return { ok: true, blob: async () => ({}) };
  });
  const prepare = createMaterialPreparation(
    [
      slot("color", (x) => textures.push(x)),
      slot("surface", (x) => textures.push(x)),
    ],
    () => {},
  );
  const first = prepare();
  assert.equal(first, prepare());
  assert.equal(await first, false);
  assert.equal(textures.length, 1);
  failSurface = false;
  assert.equal(await prepare({ retry: true }), true);
  assert.deepEqual(requests, ["color", "surface", "surface", "surface"]);
  assert.equal(await prepare(), true);
  assert.equal(textures.length, 2);
  prepare.dispose();
});

test("appearance queue caps active downloads and promotes the visible specimen", async (t) => {
  environment(t);
  const gates = [],
    order = [];
  let active = 0,
    peak = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    order.push(url);
    peak = Math.max(peak, ++active);
    await new Promise((r) => gates.push(r));
    active--;
    return { ok: true, blob: async () => ({}) };
  });
  const loaders = Array.from({ length: 9 }, (_, i) =>
    createMaterialPreparation([slot(String(i))], () => {}),
  );
  const tasks = loaders.map((fn) => fn());
  await new Promise((r) => setImmediate(r));
  assert.equal(order.length, 6);
  loaders[8]({ priority: 20 });
  gates.shift()();
  await new Promise((r) => setImmediate(r));
  assert.equal(order[6], "8");
  while (order.length < 9 || active) {
    gates.splice(0).forEach((r) => r());
    await new Promise((r) => setImmediate(r));
  }
  assert.ok((await Promise.all(tasks)).every(Boolean));
  assert.equal(peak, 6);
  loaders.forEach((fn) => fn.dispose());
});

test("startup budget does not abort a slow but successful texture", async (t) => {
  environment(t);
  let finish,
    applied = false;
  t.mock.method(globalThis, "fetch", async () => {
    await new Promise((r) => (finish = r));
    return { ok: true, blob: async () => ({}) };
  });
  const prepare = createMaterialPreparation(
      [slot("slow", () => (applied = true))],
      () => {},
    ),
    task = prepare();
  assert.equal(await waitForMaterials([task], 5), false);
  assert.equal(applied, false);
  finish();
  assert.equal(await task, true);
  assert.equal(applied, true);
  prepare.dispose();
});

test("disposing a human during bitmap decode closes late data without assigning a dead material", async (t) => {
  environment(t);
  let finish,
    closed = 0,
    applied = 0;
  globalThis.createImageBitmap = () =>
    new Promise(
      (r) =>
        (finish = () =>
          r({
            close() {
              closed++;
            },
          })),
    );
  const prepare = createMaterialPreparation(
      [slot("person", () => applied++)],
      () => {},
    ),
    task = prepare();
  await new Promise((r) => setImmediate(r));
  prepare.dispose();
  finish();
  assert.equal(await task, false);
  assert.equal(applied, 0);
  assert.equal(closed, 1);
  assert.equal(await prepare(), false);
});
