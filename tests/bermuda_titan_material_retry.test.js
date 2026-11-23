import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaTitanWhole } from "../src/bermuda_titan_whole.js";

function globals(fetch) {
  const previous = {
      window: globalThis.window,
      fetch: globalThis.fetch,
      createImageBitmap: globalThis.createImageBitmap,
    },
    listeners = new Map();
  globalThis.window = {
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
  };
  globalThis.fetch = fetch;
  globalThis.createImageBitmap = async () => ({
    width: 2,
    height: 2,
    close() {},
  });
  return {
    listeners,
    restore() {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}
const response = () => ({
  ok: true,
  blob: async () => new Blob([new Uint8Array(4)]),
});

test("Shared online texture recovery reaches the live private whole material once and never revives a disposed actor", async () => {
  let fail = true,
    requests = 0;
  const environment = globals(async () => {
      requests++;
      if (fail) throw Error("Induced initial material failure");
      return response();
    }),
    active = createBermudaTitanWhole(new THREE.Group(), {
      inspectionOnly: true,
    }),
    disposed = createBermudaTitanWhole(new THREE.Group(), {
      inspectionOnly: true,
    });
  const source = active.asset.material,
    sourceEmissive = source.emissive.getHex();
  let sourceDisposals = 0;
  source.addEventListener("dispose", () => sourceDisposals++);
  try {
    assert.deepEqual(
      await Promise.all([active.prepare(), disposed.prepare()]),
      [false, false],
    );
    assert.equal(requests, 4);
    disposed.dispose();
    const deadVersion = disposed.near.material.version,
      deadVisibility = [disposed.near.visible, disposed.far.visible];
    fail = false;
    environment.listeners.get("online")();
    assert.equal(await active.asset.prepare({ retry: true }), true);
    assert.equal(sourceDisposals, 0);
    assert.equal(active.near.material.map, null);
    active.update(1);
    assert.equal(active.near.material.map, source.map);
    assert.equal(active.near.material.roughnessMap, source.roughnessMap);
    assert.equal(active.near.material.metalnessMap, source.metalnessMap);
    assert.equal(active.near.material.vertexColors, false);
    assert.equal(active.near.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(
      active.near.material.roughnessMap.colorSpace,
      THREE.NoColorSpace,
    );
    assert.equal(source.emissive.getHex(), sourceEmissive);
    const stableVersion = active.near.material.version;
    for (let i = 0; i < 10; i++) active.update(i);
    assert.equal(active.near.material.version, stableVersion);
    assert.equal(await disposed.prepare({ retry: true }), false);
    disposed.update(2, { distant: true });
    assert.equal(disposed.near.material.map, null);
    assert.equal(disposed.near.material.version, deadVersion);
    assert.deepEqual(
      [disposed.near.visible, disposed.far.visible],
      deadVisibility,
    );
    assert.equal(requests, 6, "existing updates must not start more downloads");
    active.dispose();
    assert.equal(sourceDisposals, 1);
  } finally {
    active.dispose();
    disposed.dispose();
    environment.restore();
  }
});

test("Disposal during a shared pending prepare stops late private writes while the other lease finishes", async () => {
  const pending = [],
    environment = globals(
      () => new Promise((resolve) => pending.push(resolve)),
    ),
    active = createBermudaTitanWhole(new THREE.Group(), {
      inspectionOnly: true,
    }),
    late = createBermudaTitanWhole(new THREE.Group(), {
      inspectionOnly: true,
    });
  try {
    const activeTask = active.prepare(),
      lateTask = late.prepare();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(pending.length, 2);
    late.dispose();
    const version = late.near.material.version;
    for (const resolve of pending) resolve(response());
    assert.equal(await activeTask, true);
    assert.equal(await lateTask, false);
    assert.equal(late.near.material.map, null);
    assert.equal(late.near.material.version, version);
    assert.equal(active.near.material.map, active.asset.material.map);
    assert.equal(
      active.near.material.roughnessMap,
      active.asset.material.roughnessMap,
    );
    assert.equal(active.near.material.map.isTexture, true);
  } finally {
    for (const resolve of pending) resolve(response());
    late.dispose();
    active.dispose();
    environment.restore();
  }
});
