import test from "node:test";
import assert from "node:assert/strict";
import { preloadPreviewLayers } from "../scripts/preview_bootstrap.js";
import {
  previewDependencyPath,
  previewDependencyLayers,
} from "../scripts/prepare_preview_loader.mjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("preview modules finish dependencies before parents with bounded concurrency", async () => {
  const leaves = Array.from({ length: 25 }, (_, i) => `leaf-${i}`);
  const done = new Set(),
    progress = [];
  let active = 0,
    peak = 0;
  await preloadPreviewLayers(
    [leaves, ["parent"], ["entry"]],
    async (path) => {
      if (path === "parent") assert.equal(done.size, 25);
      if (path === "entry") assert.ok(done.has("parent"));
      peak = Math.max(peak, ++active);
      await delay(path.endsWith("0") ? 4 : 1);
      active--;
      done.add(path);
    },
    { concurrency: 8, onProgress: (n, total) => progress.push([n, total]) },
  );
  assert.equal(active, 0);
  assert.equal(peak, 8);
  assert.equal(done.size, 27);
  assert.deepEqual(
    progress,
    Array.from({ length: 27 }, (_, i) => [i + 1, 27]),
  );
});

test("failed preload drains in-flight workers and never starts the entry", async () => {
  let active = 0,
    calls = 0;
  await assert.rejects(
    preloadPreviewLayers(
      [["bad", "slow", "unused"], ["entry"]],
      async (path) => {
        calls++;
        active++;
        try {
          await delay(path === "bad" ? 1 : 10);
          if (path === "bad") throw new Error("HTTP 429");
        } finally {
          active--;
        }
      },
      { concurrency: 2 },
    ),
    /HTTP 429/,
  );
  assert.equal(active, 0);
  assert.equal(calls, 2);
  for (const concurrency of [0, -1, 1.5, 17, NaN])
    await assert.rejects(
      preloadPreviewLayers([], () => {}, { concurrency }),
      /concurrency/,
    );
});

test("dependency layers retain all modules and reject cycles before wrapping", () => {
  const graph = new Map([
    ["assets/entry-abcdefgh.js", ["assets/middle-abcdefgh.js"]],
    ["assets/middle-abcdefgh.js", ["assets/leaf-abcdefgh.js"]],
    ["assets/leaf-abcdefgh.js", []],
  ]);
  assert.deepEqual(previewDependencyLayers(graph), [
    ["./assets/leaf-abcdefgh.js"],
    ["./assets/middle-abcdefgh.js"],
    ["./assets/entry-abcdefgh.js"],
  ]);
  assert.throws(
    () =>
      previewDependencyLayers(
        new Map([
          ["a", ["b"]],
          ["b", ["a"]],
        ]),
      ),
    /cycle/,
  );
  assert.throws(
    () => previewDependencyLayers(new Map([["a", ["missing"]]])),
    /missing/,
  );
});

test("preview dependency scope permits only the same-origin hashed runtime JS", () => {
  assert.equal(
    previewDependencyPath("./leaf-abcdefgh.js", "assets/main-abcdefgh.js"),
    "assets/leaf-abcdefgh.js",
  );
  for (const source of [
    "https://other.example/assets/leaf-abcdefgh.js",
    "../src/main.js",
    "./leaf.js",
    "./leaf-abcdefgh.js?x=1",
    "./leaf-abcdefgh.js#x",
    "/assets/.hidden-abcdefgh.js",
  ])
    assert.throws(
      () => previewDependencyPath(source, "assets/main-abcdefgh.js"),
      /Invalid preview dependency/,
    );
});
