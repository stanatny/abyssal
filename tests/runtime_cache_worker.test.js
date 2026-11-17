import test from "node:test";
import assert from "node:assert/strict";
import {
  installRuntimeCache,
  RUNTIME_CACHE_PROTOCOL,
} from "../scripts/runtime_cache_worker.js";

const base = "https://example.test/abyssal/";
const pathA = "assets/model-aaaaaaaa.js";
const pathB = "assets/world-bbbbbbbb.js";
const pathC = "assets/next-cccccccc.js";
const url = (path) => new URL(path, base).href;
const requestKey = (request) =>
  typeof request === "string" ? request : request.url;

class MemoryCache {
  constructor() {
    this.entries = new Map();
    this.putFailure = null;
    this.matchFailure = null;
  }
  async match(request) {
    if (this.matchFailure) throw this.matchFailure;
    return this.entries.get(requestKey(request))?.clone();
  }
  async put(request, response) {
    if (this.putFailure) throw this.putFailure;
    this.entries.set(requestKey(request), response.clone());
  }
  async delete(request) {
    return this.entries.delete(requestKey(request));
  }
  async keys() {
    return [...this.entries.keys()].map((key) => new Request(key));
  }
}

function memoryStorage() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
  };
}

function makeHarness({
  storage = memoryStorage(),
  scopeUrl = base,
  config = {},
  fetch = async () =>
    new Response("data", { headers: { "Content-Type": "text/javascript" } }),
  options = {},
} = {}) {
  const handlers = new Map();
  const network = [];
  const messages = [];
  let claimed = 0;
  let skipped = 0;
  const worker = installRuntimeCache(
    {
      registration: { scope: scopeUrl },
      caches: storage,
      fetch: async (request) => {
        network.push(request.url);
        return fetch(request);
      },
      clients: {
        async claim() {
          claimed += 1;
        },
        async get(id) {
          return { postMessage: (value) => messages.push({ id, value }) };
        },
      },
      async skipWaiting() {
        skipped += 1;
      },
      addEventListener: (type, handler) => handlers.set(type, handler),
    },
    {
      buildId: "build-one",
      assets: [pathA, pathB, pathC].map((path) => ({ path, size: 4 })),
      maxBytes: 12,
      maxEntries: 3,
      ...config,
    },
    { flushDelayMs: 0, ...options },
  );
  async function dispatch(type, data) {
    const pending = [];
    let response;
    handlers.get(type)({
      ...data,
      waitUntil: (promise) => pending.push(promise),
      respondWith: (promise) => {
        response = promise;
      },
    });
    const result = response ? await response : null;
    while (pending.length) await Promise.all(pending.splice(0));
    return result;
  }
  return {
    worker,
    storage,
    network,
    messages,
    dispatch,
    claimed: () => claimed,
    skipped: () => skipped,
    fetch: (path, init, clientId = "client-one") =>
      dispatch("fetch", {
        request: new Request(new URL(path, scopeUrl), init),
        clientId,
      }),
  };
}

test("worker installs without eager requests and claims the first page", async () => {
  const harness = makeHarness();
  assert.deepEqual(harness.network, []);
  assert.equal(harness.storage.stores.size, 0);
  await harness.dispatch("install", {});
  await harness.dispatch("activate", {});
  assert.equal(harness.skipped(), 1);
  assert.equal(harness.claimed(), 1);
  assert.deepEqual(harness.network, []);
});

test("real requested bytes are cached once at their original hashed URL", async () => {
  const harness = makeHarness();
  const first = await harness.fetch(pathA);
  assert.equal(await first.text(), "data");
  const status = await harness.worker.getStatus("client-one");
  assert.equal(status.available, true);
  assert.equal(status.entryCount, 1);
  assert.equal(status.totalBytes, 4);
  assert.deepEqual(harness.network, [url(pathA)]);
  assert.equal(await (await harness.fetch(pathA)).text(), "data");
  assert.deepEqual(harness.network, [url(pathA)]);
  assert.deepEqual(
    harness.messages.map(({ value }) => value.source),
    ["network", "persistent"],
  );
  const cached = await harness.storage.open(harness.worker.names.assets);
  assert.deepEqual([...cached.entries.keys()], [url(pathA)]);
  assert.equal(cached.entries.has(url(pathB)), false);
});

test("a restarted worker reuses shared hashes and existing old hashes", async () => {
  const storage = memoryStorage();
  const oldWorker = makeHarness({ storage });
  await oldWorker.fetch(pathA);
  await oldWorker.fetch(pathB);
  const nextWorker = makeHarness({
    storage,
    config: {
      buildId: "build-two",
      assets: [pathB, pathC].map((path) => ({ path, size: 4 })),
    },
  });
  assert.equal(await (await nextWorker.fetch(pathB)).text(), "data");
  assert.equal(await (await nextWorker.fetch(pathA)).text(), "data");
  assert.deepEqual(nextWorker.network, []);
  await nextWorker.fetch(pathC);
  assert.deepEqual(nextWorker.network, [url(pathC)]);
  const status = await nextWorker.worker.getStatus("client-one");
  assert.equal(status.buildId, "build-two");
  assert.equal(status.hitCount, 2);
  assert.equal(status.totalBytes, 12);
});

test("uncached old hashes fall through without entering the current store", async () => {
  const harness = makeHarness({
    config: { assets: [{ path: pathB, size: 4 }] },
  });
  await harness.fetch(pathA);
  await harness.fetch(pathA);
  assert.deepEqual(harness.network, [url(pathA), url(pathA)]);
  assert.equal((await harness.worker.getStatus()).entryCount, 0);
});

test("the cache is scoped to each mounted game, including root previews", async () => {
  const storage = memoryStorage();
  const formal = makeHarness({ storage });
  await formal.fetch(pathA);
  const preview = makeHarness({ storage, scopeUrl: "https://example.test/" });
  await preview.fetch(pathA);
  assert.notEqual(formal.worker.names.assets, preview.worker.names.assets);
  assert.deepEqual(preview.network, [
    "https://example.test/assets/model-aaaaaaaa.js",
  ]);
});

test("HTML, navigation, out-of-scope, query, Range and authorized reads bypass", async () => {
  const harness = makeHarness();
  for (const [path, init] of [
    ["index.html"],
    ["runtime_cache-aaaaaaaa.js"],
    ["assets/unhashed.js"],
    ["assets/model-aaaaaaaa.js.gz"],
    ["../assets/model-aaaaaaaa.js"],
    ["https://another.test/assets/model-aaaaaaaa.js"],
    [`${pathA}?version=old`],
    [pathA, { headers: { Range: "bytes=0-2" } }],
    [pathA, { headers: { Authorization: "Bearer example" } }],
    [pathA, { method: "POST" }],
  ])
    assert.equal(await harness.fetch(path, init), null, path);
  assert.equal(
    await harness.dispatch("fetch", {
      request: {
        method: "GET",
        mode: "navigate",
        headers: new Headers(),
        url: url(pathA),
      },
    }),
    null,
  );
  assert.equal(harness.storage.stores.size, 0);
  assert.deepEqual(harness.network, []);
});

test("reload and no-store request semantics are retained", async () => {
  let generation = 0;
  const harness = makeHarness({
    fetch: async () =>
      new Response(String(++generation), {
        headers: { "Content-Type": "text/javascript" },
      }),
  });
  assert.equal(await (await harness.fetch(pathA)).text(), "1");
  assert.equal(
    await (await harness.fetch(pathA, { cache: "reload" })).text(),
    "2",
  );
  assert.equal(await (await harness.fetch(pathA)).text(), "2");
  assert.equal(
    await (await harness.fetch(pathA, { cache: "no-store" })).text(),
    "3",
  );
  assert.equal(await (await harness.fetch(pathA)).text(), "2");
  assert.equal(harness.network.length, 3);
});

test("LRU and declared raw-byte budgets evict within finite bounds", async () => {
  let clock = 1;
  const harness = makeHarness({
    config: { maxBytes: 8, maxEntries: 2 },
    options: { now: () => clock++ },
  });
  await harness.fetch(pathA);
  await harness.fetch(pathB);
  await harness.fetch(pathA);
  await harness.fetch(pathC);
  const cached = await harness.storage.open(harness.worker.names.assets);
  assert.deepEqual(
    [...cached.entries.keys()].sort(),
    [url(pathA), url(pathC)].sort(),
  );
  const status = await harness.worker.getStatus();
  assert.equal(status.totalBytes, 8);
  assert.equal(status.entryCount, 2);
});

test("eviction prefers stale hashes before current-version assets", async () => {
  const storage = memoryStorage();
  const oldWorker = makeHarness({ storage });
  await oldWorker.fetch(pathA);
  await oldWorker.fetch(pathB);
  const nextWorker = makeHarness({
    storage,
    config: {
      maxBytes: 8,
      maxEntries: 2,
      assets: [pathB, pathC].map((path) => ({ path, size: 4 })),
    },
  });
  await nextWorker.fetch(pathA);
  await nextWorker.fetch(pathC);
  const cached = await storage.open(nextWorker.worker.names.assets);
  assert.deepEqual(
    [...cached.entries.keys()].sort(),
    [url(pathB), url(pathC)].sort(),
  );
});

test("oversized requested resources remain usable without breaking the bound", async () => {
  const harness = makeHarness({
    config: { assets: [{ path: pathA, size: 13 }] },
  });
  assert.equal(await (await harness.fetch(pathA)).text(), "data");
  const status = await harness.worker.getStatus();
  assert.equal(status.available, true);
  assert.equal(status.entryCount, 0);
  assert.equal(status.totalBytes, 0);
});

test("CacheStorage absence, denial, timeout and quota failures preserve one fetch", async () => {
  for (const storage of [
    null,
    {
      open: async () => {
        throw new Error("Storage denied");
      },
    },
    { open: () => new Promise(() => {}) },
  ]) {
    const harness = makeHarness({ storage, options: { cacheTimeoutMs: 5 } });
    assert.equal(await (await harness.fetch(pathA)).text(), "data");
    assert.equal((await harness.worker.getStatus()).available, false);
    assert.deepEqual(harness.network, [url(pathA)]);
  }
  const harness = makeHarness();
  await harness.worker.getStatus();
  const cached = await harness.storage.open(harness.worker.names.assets);
  cached.putFailure = new DOMException("Quota exhausted", "QuotaExceededError");
  assert.equal(await (await harness.fetch(pathA)).text(), "data");
  assert.deepEqual(harness.network, [url(pathA)]);
  assert.equal((await harness.worker.getStatus()).available, false);
});

test("CacheStorage read failure falls back to the original network request", async () => {
  const harness = makeHarness();
  await harness.worker.getStatus();
  const cached = await harness.storage.open(harness.worker.names.assets);
  cached.matchFailure = new Error("Read unavailable");
  assert.equal(await (await harness.fetch(pathA)).text(), "data");
  assert.deepEqual(harness.network, [url(pathA)]);
  assert.equal((await harness.worker.getStatus()).available, false);
});

test("failed or HTML fallback resources never poison a module or stylesheet", async () => {
  for (const response of [
    new Response("missing", { status: 404 }),
    new Response("partial", { status: 206 }),
    new Response("<html>fallback</html>", {
      headers: { "Content-Type": "text/html" },
    }),
    new Response("data", { headers: { "Content-Type": "text/plain" } }),
    new Response("data", {
      headers: {
        "Content-Type": "text/javascript",
        "Cache-Control": "no-store",
      },
    }),
    Object.defineProperty(
      new Response("data", { headers: { "Content-Type": "text/javascript" } }),
      "redirected",
      { value: true },
    ),
    Object.defineProperty(
      new Response("data", { headers: { "Content-Type": "text/javascript" } }),
      "type",
      { value: "opaque" },
    ),
  ]) {
    // clone 不保留测试覆盖的 readonly getter，因此让测试网络返回原 Response。
    let calls = 0;
    const direct = makeHarness({
      fetch: async () =>
        ++calls === 1
          ? response
          : new Response("data", {
              headers: { "Content-Type": "text/javascript" },
            }),
    });
    await direct.fetch(pathA);
    assert.equal((await direct.worker.getStatus()).entryCount, 0);
    await direct.fetch(pathA);
    assert.equal(direct.network.length, 2);
    assert.equal((await direct.worker.getStatus()).entryCount, 1);
  }
  const css = "assets/style-dddddddd.css";
  const harness = makeHarness({ config: { assets: [{ path: css, size: 4 }] } });
  await harness.fetch(css);
  assert.equal((await harness.worker.getStatus()).entryCount, 0);
});

test("successful images and audio cache while Range audio keeps the network path", async () => {
  for (const [path, mime] of [
    ["assets/skin-eeeeeeee.webp", "image/webp"],
    ["assets/music-ffffffff.m4a", "audio/mp4"],
    ["assets/data-gggggggg.bin", "application/octet-stream"],
  ]) {
    const harness = makeHarness({
      config: { assets: [{ path, size: 4 }] },
      fetch: async () =>
        new Response("data", { headers: { "Content-Type": mime } }),
    });
    await harness.fetch(path);
    await harness.fetch(path);
    assert.equal(harness.network.length, 1);
    assert.equal(
      await harness.fetch(path, { headers: { Range: "bytes=0-1" } }),
      null,
    );
  }
});

test("HTML and text fallbacks cannot poison images, audio, fonts or model data", async () => {
  for (const path of [
    "assets/skin-eeeeeeee.webp",
    "assets/music-ffffffff.m4a",
    "assets/font-gggggggg.woff2",
    "assets/data-hhhhhhhh.bin",
  ]) {
    for (const mime of ["text/html", "text/plain"]) {
      const harness = makeHarness({
        config: { assets: [{ path, size: 4 }] },
        fetch: async () =>
          new Response("data", { headers: { "Content-Type": mime } }),
      });
      await harness.fetch(path);
      assert.equal((await harness.worker.getStatus()).entryCount, 0);
    }
  }
});

test("index write failure cannot make the real network response fail", async () => {
  const harness = makeHarness();
  await harness.worker.getStatus();
  const metadata = await harness.storage.open(harness.worker.names.metadata);
  metadata.putFailure = new Error("Index unavailable");
  assert.equal(await (await harness.fetch(pathA)).text(), "data");
  assert.deepEqual(harness.network, [url(pathA)]);
  assert.equal((await harness.worker.getStatus()).available, false);
});

test("concurrent same-URL requests share one network response", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const harness = makeHarness({
    fetch: async () => {
      await gate;
      return new Response("data", {
        headers: { "Content-Type": "text/javascript" },
      });
    },
  });
  const first = harness.fetch(pathA);
  const second = harness.fetch(pathA);
  release();
  assert.equal(await (await first).text(), "data");
  assert.equal(await (await second).text(), "data");
  assert.equal(harness.network.length, 1);
});

test("offline cached hits work and uncached misses retain network errors", async () => {
  const storage = memoryStorage();
  await makeHarness({ storage }).fetch(pathA);
  const harness = makeHarness({
    storage,
    fetch: async () => {
      throw new TypeError("Offline");
    },
  });
  assert.equal(await (await harness.fetch(pathA)).text(), "data");
  await assert.rejects(harness.fetch(pathB), /Offline/);
  assert.deepEqual(harness.network, [url(pathB)]);
});

test("status handshakes report only the requesting client's definite cache hits", async () => {
  const harness = makeHarness();
  await harness.fetch(pathA, undefined, "first");
  await harness.fetch(pathA, undefined, "second");
  const replies = [];
  await harness.dispatch("message", {
    data: { type: RUNTIME_CACHE_PROTOCOL.status },
    source: { id: "second" },
    ports: [{ postMessage: (value) => replies.push(value) }],
  });
  assert.equal(replies.length, 1);
  assert.equal(replies[0].type, RUNTIME_CACHE_PROTOCOL.status);
  assert.equal(replies[0].hitCount, 1);
  assert.equal(replies[0].networkCount, 0);
  assert.equal((await harness.worker.getStatus("first")).hitCount, 0);
  for (let i = 0; i < 33; i += 1) await harness.worker.getStatus(`other-${i}`);
  assert.equal((await harness.worker.getStatus("second")).hitCount, 0);
});

test("a corrupt index reconciles real current assets and removes unaccounted old data", async () => {
  const storage = memoryStorage();
  const first = makeHarness({ storage });
  await first.fetch(pathA);
  const cached = await storage.open(first.worker.names.assets);
  await cached.put(url("assets/unknown-zzzzzzzz.js"), new Response("data"));
  const metadata = await storage.open(first.worker.names.metadata);
  await metadata.put(
    new URL("__runtime_cache_index_v1__", base).href,
    new Response("invalid json"),
  );
  const next = makeHarness({ storage });
  const status = await next.worker.getStatus();
  assert.equal(status.entryCount, 1);
  assert.equal(status.totalBytes, 4);
  assert.equal(cached.entries.has(url("assets/unknown-zzzzzzzz.js")), false);
  await next.fetch(pathA);
  assert.deepEqual(next.network, []);
});

test("invalid manifests and limits fail before installing event handlers", () => {
  for (const config of [
    { buildId: "" },
    { maxBytes: NaN },
    { maxBytes: -1 },
    { maxEntries: 0 },
    { cacheName: "unsafe/path" },
    { assets: [{ path: "../assets/model-aaaaaaaa.js", size: 4 }] },
    { assets: [{ path: `${pathA}?v=1`, size: 4 }] },
    { assets: [{ path: pathA, size: Infinity }] },
    { assets: [{ path: pathA, size: -1 }] },
    { assets: [{ path: pathA, size: 0.5 }] },
    {
      assets: [
        { path: pathA, size: 4 },
        { path: pathA, size: 4 },
      ],
    },
  ])
    assert.throws(() => makeHarness({ config }), /runtime cache/);
});
