import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaRockSurfaces } from "../src/mariana_rock_surfaces.js";

test("Mariana rock surfaces keep opaque palette fallback and release private textures once", async (t) => {
  const oldWindow = globalThis.window,
    oldBitmap = globalThis.createImageBitmap,
    bitmaps = [];
  globalThis.window = { addEventListener() {} };
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
  t.after(() => {
    globalThis.window = oldWindow;
    globalThis.createImageBitmap = oldBitmap;
  });
  let failed = true;
  t.mock.method(globalThis, "fetch", async () => {
    if (failed) throw new Error("Offline");
    return { ok: true, blob: async () => ({}) };
  });
  const owner = createMarianaRockSurfaces(),
    wall = new THREE.MeshStandardMaterial({
      color: 0x647989,
      vertexColors: true,
    }),
    rock = new THREE.MeshStandardMaterial({ color: 0x566878 }),
    unrelated = new THREE.MeshStandardMaterial({ color: 0x123456 });
  owner.apply(wall, "wall");
  owner.apply(rock, "outcrop");
  assert.equal(await owner.prepare(), false);
  assert.equal(wall.map, null);
  assert.equal(wall.color.getHex(), 0x647989);
  assert.equal(wall.transparent, false);
  assert.equal(wall.opacity, 1);
  failed = false;
  assert.equal(await owner.prepare({ retry: true }), true);
  assert.equal(bitmaps.length, 4);
  assert.notEqual(wall.map, rock.map);
  assert.equal(unrelated.map, null);
  assert.equal(unrelated.color.getHex(), 0x123456);
  const released = [];
  for (const g of owner.groups.values())
    for (const texture of [g.texture, g.height]) {
      const count = { value: 0 };
      texture.addEventListener("dispose", () => count.value++);
      released.push(count);
    }
  for (const m of [wall, rock]) {
    assert.equal(m.userData.rockSurfaceReady, true);
    assert.equal(m.transparent, false);
    assert.equal(m.alphaMap, null);
    assert.equal(m.map.colorSpace, THREE.SRGBColorSpace);
  }
  owner.dispose();
  owner.dispose();
  assert.ok(released.every((c) => c.value === 1));
  assert.ok(bitmaps.every((b) => b.closed === 1));
  assert.ok(
    [...owner.groups.values()].every(
      (g) => g.materials.size === 0 && !g.texture && !g.height,
    ),
  );
  assert.equal(wall.map, null);
  assert.equal(await owner.prepare(), false);
  for (const m of [wall, rock, unrelated]) m.dispose();
});
