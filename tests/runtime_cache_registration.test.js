import test from "node:test";
import assert from "node:assert/strict";
import { prepareRuntimeCache } from "../scripts/preview_bootstrap.js";

const pageURL = "https://example.test/abyssal/index.html";
const workerURL =
  "https://example.test/abyssal/runtime_cache-0123456789abcdef.js";
const config = {
  worker: "./runtime_cache-0123456789abcdef.js",
  buildId: "build-one",
};
const status = {
  type: "ABYSSAL_RUNTIME_CACHE_STATUS",
  buildId: config.buildId,
  available: true,
  hitCount: 0,
  networkCount: 0,
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeHarness({ register, initialController = null } = {}) {
  const listeners = new Map();
  const registrations = [];
  const channels = [];
  const posts = [];
  const reads = [];
  const container = {
    controller: initialController,
    async register(...args) {
      registrations.push(args);
      return register?.(container, ...args);
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
  };
  const emit = (type, event = {}) => {
    for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
  };
  class Channel {
    constructor() {
      this.port1 = {
        onmessage: null,
        closed: false,
        started: false,
        start() {
          this.started = true;
        },
        close() {
          this.closed = true;
        },
      };
      this.port2 = {
        postMessage: (data) => {
          if (!this.port1.closed) this.port1.onmessage?.({ data });
        },
      };
      channels.push(this);
    }
  }
  function controller({ scriptURL = workerURL, reply = status, onPost } = {}) {
    return {
      scriptURL,
      postMessage(data, ports) {
        posts.push({ data, ports, source: this });
        if (onPost) onPost(data, ports);
        else if (reply) queueMicrotask(() => ports[0].postMessage(reply));
      },
    };
  }
  const options = {
    navigatorObject: { serviceWorker: container },
    documentObject: { URL: pageURL },
    MessageChannelClass: Channel,
    timeoutMs: 20,
    onRead: (value) => reads.push(value),
  };
  return {
    container,
    registrations,
    channels,
    posts,
    reads,
    options,
    controller,
    emit,
    count: (type) => listeners.get(type)?.size ?? 0,
    prepare: (settings = {}) =>
      prepareRuntimeCache(config, { ...options, ...settings }),
  };
}

test("optional cache absence or unsupported APIs immediately use the existing loader", async () => {
  const harness = makeHarness();
  for (const [settings, options] of [
    [undefined, harness.options],
    [config, { ...harness.options, navigatorObject: {} }],
    [config, { ...harness.options, navigatorObject: null }],
    [config, { ...harness.options, MessageChannelClass: null }],
  ]) {
    const session = await prepareRuntimeCache(settings, options);
    assert.equal(session.available, false);
    session.dispose();
  }
  assert.equal(harness.registrations.length, 0);
  assert.equal(harness.count("controllerchange"), 0);
});

test("denied ServiceWorker property access remains an optional-cache fallback", async () => {
  const harness = makeHarness();
  const navigatorObject = Object.defineProperty({}, "serviceWorker", {
    get() {
      throw new DOMException("Service workers denied", "SecurityError");
    },
  });
  const session = await harness.prepare({ navigatorObject });
  assert.equal(session.available, false);
  assert.equal(harness.registrations.length, 0);
});

test("the first page is observed before registration and can claim before register resolves", async () => {
  let harness;
  harness = makeHarness({
    register: async (container) => {
      assert.equal(harness.count("controllerchange"), 1);
      container.controller = harness.controller();
      harness.emit("controllerchange");
      await delay(1);
    },
  });
  const session = await harness.prepare();
  assert.equal(session.available, true);
  assert.deepEqual(harness.registrations, [
    [workerURL, { type: "module", scope: "./", updateViaCache: "none" }],
  ]);
  assert.equal(harness.posts.length, 1);
  assert.deepEqual(harness.posts[0].data, {
    type: "ABYSSAL_RUNTIME_CACHE_STATUS",
  });
  assert.equal(harness.channels[0].port1.started, true);
  assert.equal(harness.channels[0].port1.closed, true);
  assert.equal(harness.count("controllerchange"), 0);
  assert.equal(harness.count("message"), 1);
  session.dispose();
});

test("an already-controlled first page still performs the expected registration and handshake", async () => {
  const harness = makeHarness();
  harness.container.controller = harness.controller();
  const session = await harness.prepare();
  assert.equal(session.available, true);
  assert.equal(harness.registrations.length, 1);
  assert.equal(harness.posts.length, 1);
  session.dispose();
});

test("denied registration returns fallback and removes listeners", async () => {
  const harness = makeHarness({
    register: async () => {
      throw new DOMException("Registration denied", "SecurityError");
    },
  });
  const session = await harness.prepare();
  assert.equal(session.available, false);
  assert.equal(harness.count("controllerchange"), 0);
  assert.equal(harness.count("message"), 0);
});

test("hung registration has a bounded fallback and a late result cannot reopen the session", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const harness = makeHarness({ register: () => gate });
  const session = await harness.prepare({ timeoutMs: 5 });
  assert.equal(session.available, false);
  assert.equal(harness.count("controllerchange"), 0);
  harness.container.controller = harness.controller();
  harness.emit("controllerchange");
  release();
  await delay(0);
  assert.equal(harness.posts.length, 0);
  assert.equal(harness.count("message"), 0);
});

test("claim and status waits share one overall deadline", async () => {
  let harness;
  harness = makeHarness({
    register: async (container) => {
      await delay(8);
      container.controller = harness.controller({ reply: null });
      harness.emit("controllerchange");
    },
  });
  const started = performance.now();
  const session = await harness.prepare({ timeoutMs: 15 });
  assert.equal(session.available, false);
  assert.ok(performance.now() - started < 100);
  assert.equal(harness.posts.length, 1);
  assert.equal(harness.channels[0].port1.closed, true);
  assert.equal(harness.count("message"), 0);
});

test("a different controller script cannot satisfy a claim", async () => {
  const harness = makeHarness();
  harness.container.controller = harness.controller({
    scriptURL: "https://example.test/abyssal/runtime_cache-fedcba9876543210.js",
  });
  const session = await harness.prepare({ timeoutMs: 5 });
  assert.equal(session.available, false);
  assert.equal(harness.posts.length, 0);
  assert.equal(harness.count("controllerchange"), 0);
});

test("a controller replaced immediately after claim cannot echo the build to pass", async () => {
  let harness;
  harness = makeHarness({
    register: async (container) => {
      container.controller = harness.controller();
      harness.emit("controllerchange");
      container.controller = harness.controller({
        scriptURL:
          "https://example.test/abyssal/runtime_cache-fedcba9876543210.js",
      });
    },
  });
  const session = await harness.prepare({ timeoutMs: 5 });
  assert.equal(session.available, false);
  assert.equal(harness.posts.length, 0);
});

test("status must match the exact type and build before an available session is returned", async () => {
  const harness = makeHarness();
  harness.container.controller = harness.controller({
    onPost(_data, ports) {
      ports[0].postMessage({ ...status, type: "OTHER_STATUS" });
      ports[0].postMessage({ ...status, buildId: "old-build" });
      queueMicrotask(() => ports[0].postMessage(status));
    },
  });
  const session = await harness.prepare();
  assert.equal(session.available, true);
  assert.equal(session.buildId, config.buildId);
  session.dispose();
});

test("a controller replaced during the status wait cannot leave a stale available session", async () => {
  const harness = makeHarness();
  harness.container.controller = harness.controller({
    onPost(_data, ports) {
      harness.container.controller = harness.controller({
        scriptURL:
          "https://example.test/abyssal/runtime_cache-fedcba9876543210.js",
      });
      ports[0].postMessage(status);
    },
  });
  const session = await harness.prepare();
  assert.equal(session.available, false);
  assert.equal(harness.count("message"), 0);
  assert.equal(harness.channels[0].port1.closed, true);
});

test("wrong-build status or a silent status channel reaches bounded fallback", async () => {
  for (const reply of [null, { ...status, buildId: "old-build" }]) {
    const harness = makeHarness();
    harness.container.controller = harness.controller({ reply });
    const session = await harness.prepare({ timeoutMs: 5 });
    assert.equal(session.available, false);
    assert.equal(harness.channels[0].port1.closed, true);
    assert.equal(harness.count("message"), 0);
  }
});

test("unavailable storage status removes listeners and returns a disposable fallback", async () => {
  const harness = makeHarness();
  harness.container.controller = harness.controller({
    reply: { ...status, available: false },
  });
  const session = await harness.prepare();
  assert.equal(session.available, false);
  session.dispose();
  assert.equal(harness.channels[0].port1.closed, true);
  assert.equal(harness.count("message"), 0);
});

test("read feedback accepts only the expected controller, build, type and source", async () => {
  const harness = makeHarness();
  const controller = harness.controller();
  harness.container.controller = controller;
  const session = await harness.prepare();
  const read = {
    type: "ABYSSAL_RUNTIME_CACHE_READ",
    buildId: config.buildId,
    source: "persistent",
    url: "https://example.test/abyssal/assets/model-aaaaaaaa.js",
  };
  for (const event of [
    { source: harness.controller(), data: read },
    { source: null, data: read },
    { source: controller, data: { ...read, type: "OTHER_READ" } },
    { source: controller, data: { ...read, buildId: "old-build" } },
    { source: controller, data: { ...read, source: "disk" } },
    { source: controller, data: {} },
  ])
    harness.emit("message", event);
  assert.deepEqual(harness.reads, []);
  harness.emit("message", { source: controller, data: read });
  harness.emit("message", {
    source: controller,
    data: { ...read, source: "network" },
  });
  assert.deepEqual(
    harness.reads.map((value) => value.source),
    ["persistent", "network"],
  );
  session.dispose();
});

test("dispose removes read feedback and is safe to repeat", async () => {
  const harness = makeHarness();
  const controller = harness.controller();
  harness.container.controller = controller;
  const session = await harness.prepare();
  session.dispose();
  session.dispose();
  harness.emit("message", {
    source: controller,
    data: {
      type: "ABYSSAL_RUNTIME_CACHE_READ",
      buildId: config.buildId,
      source: "persistent",
    },
  });
  assert.deepEqual(harness.reads, []);
  assert.equal(harness.count("controllerchange"), 0);
  assert.equal(harness.count("message"), 0);
  assert.equal(harness.channels[0].port1.closed, true);
});

test("unsafe or mismounted worker URLs never register", async () => {
  const harness = makeHarness();
  for (const settings of [
    {
      ...config,
      worker: "https://another.test/runtime_cache-0123456789abcdef.js",
    },
    { ...config, worker: "../runtime_cache-0123456789abcdef.js" },
    { ...config, worker: "./assets/runtime_cache-0123456789abcdef.js" },
    { ...config, worker: `${config.worker}?version=1` },
    { ...config, worker: `${config.worker}#part` },
    { ...config, worker: "./runtime_cache.js" },
    { ...config, worker: "./runtime_cache-ABCDEFGH.js" },
    { ...config, buildId: "" },
    { ...config, buildId: 123 },
  ]) {
    const session = await prepareRuntimeCache(settings, harness.options);
    assert.equal(session.available, false);
  }
  assert.equal(harness.registrations.length, 0);
});

test("root-mounted previews resolve the same module worker contract", async () => {
  const harness = makeHarness();
  harness.container.controller = harness.controller({
    scriptURL: "http://localhost:5173/runtime_cache-0123456789abcdef.js",
  });
  const session = await harness.prepare({
    documentObject: { URL: "http://localhost:5173/" },
  });
  assert.equal(session.available, true);
  assert.equal(
    harness.registrations[0][0],
    "http://localhost:5173/runtime_cache-0123456789abcdef.js",
  );
  session.dispose();
});
