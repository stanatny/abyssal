import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  createOdysseyOcean,
  createOdysseyOceanSteps,
} from "../src/odyssey_ocean.js";
import { prepareScene } from "../src/scene_preparation.js";

// 近远景共用不可变属性，但不同地块和地图不能复用变形后的位置。
test("Odyssey scenery shares immutable detail buffers without coupling map instances", () => {
  const a = createOdysseyOcean(new THREE.Group()),
    b = createOdysseyOcean(new THREE.Group());
  try {
    for (let i = 0; i < a.abyss.records.length; i++) {
      const r = a.abyss.records[i],
        other = b.abyss.records[i];
      for (const key of ["position", "uv", "color"])
        assert.equal(r.near.getAttribute(key), r.far.getAttribute(key));
      assert.notEqual(
        r.near.getAttribute("normal"),
        r.far.getAttribute("normal"),
      );
      assert.notEqual(r.near.index, r.far.index);
      assert.notEqual(
        r.near.getAttribute("position"),
        other.near.getAttribute("position"),
      );
      assert.notEqual(
        r.near.getAttribute("position"),
        a.abyss.assets[r.kind].geometry.getAttribute("position"),
      );
    }
  } finally {
    a.dispose();
    b.dispose();
  }
});

// 在新增可暂停边界退出构造，已挂载实体必须全部回收，重试仍应成功。
test("Odyssey cancellation at staged crags and masonry leaves no partial scene", async () => {
  for (const [stage, occurrence] of [
    ["abyss-assets", 1],
    ["abyss-crag-mesh", 2],
    ["abyss-crag-colliders", 5],
    ["abyss-memorial-mesh", 2],
    ["troy-masonry-row", 1],
    ["troy-masonry-row", 14],
  ]) {
    const parent = new THREE.Group(),
      error = new Error("cancelled " + stage),
      watched = new Map();
    let seen = 0;
    await assert.rejects(
      prepareScene(createOdysseyOceanSteps(parent), {
        budgetMs: Infinity,
        onStep(label) {
          if (label !== stage || ++seen !== occurrence) return;
          parent.traverse((n) => {
            if (!n.isMesh) return;
            for (const r of [
              n.geometry,
              ...(Array.isArray(n.material) ? n.material : [n.material]),
            ]) {
              if (watched.has(r)) continue;
              watched.set(r, 0);
              r.addEventListener("dispose", () =>
                watched.set(r, watched.get(r) + 1),
              );
            }
          });
          throw error;
        },
      }),
      error,
    );
    assert.equal(parent.children.length, 0, stage);
    assert.ok(watched.size > 0);
    assert.ok(
      [...watched.values()].every((n) => n === 1),
      stage,
    );
  }
  const parent = new THREE.Group(),
    steps = [];
  const restored = await prepareScene(createOdysseyOceanSteps(parent), {
    budgetMs: 0,
    yieldTask: async () => {},
    onStep: (label) => steps.push(label),
  });
  try {
    assert.equal(restored.abyss.records.length, 8);
    assert.equal(restored.colliders.length, 4531);
    assert.equal(steps.filter((n) => n === "troy-masonry-row").length, 21);
  } finally {
    restored.dispose();
  }
  assert.equal(parent.children.length, 0);
});
