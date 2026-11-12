import test from "node:test";
import assert from "node:assert/strict";
import {
  STARTUP_COPY,
  selectStartupLanguage,
  preloadPreviewModule,
  preloadPreviewStylesheet,
  startPreviewBootstrap,
} from "../scripts/preview_bootstrap.js";

class Element {
  constructor(tag, owner) {
    this.tagName = tag.toUpperCase();
    this.owner = owner;
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.style = {};
    this.listeners = new Map();
    this.hidden = false;
    this.relList = { supports: () => owner.modulePreload };
  }
  set textContent(value) {
    this.text = String(value);
    this.children = [];
  }
  get textContent() {
    return (this.text || "") + this.children.map((n) => n.textContent).join("");
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parentNode = this;
      this.children.push(node);
      if (this === this.owner.head) this.owner.onLink?.(node);
    }
  }
  remove() {
    if (this.parentNode)
      this.parentNode.children = this.parentNode.children.filter(
        (n) => n !== this,
      );
    this.parentNode = null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  addEventListener(name, handler) {
    this.listeners.set(name, handler);
  }
  removeEventListener(name, handler) {
    if (this.listeners.get(name) === handler) this.listeners.delete(name);
  }
  contains(node) {
    return this === node || this.children.some((child) => child.contains(node));
  }
  click() {
    if (!this.disabled) this.listeners.get("click")?.();
  }
  focus() {
    this.owner.activeElement = this;
  }
}

function documentFixture(modulePreload = true) {
  const doc = {
    URL: "https://example.test/abyssal/index.html?v=1#home",
    baseURI: "https://example.test/abyssal/index.html?v=1#home",
    modulePreload,
    createElement(tag) {
      return new Element(tag, doc);
    },
    getElementById(id) {
      const visit = (node) =>
        node.id === id
          ? node
          : node.children.map(visit).find((n) => n !== undefined);
      return visit(doc.body);
    },
  };
  doc.head = doc.createElement("head");
  doc.body = doc.createElement("body");
  doc.panel = doc.createElement("div");
  doc.panel.id = "loading";
  doc.panel.setAttribute("role", "dialog");
  doc.panel.setAttribute("aria-labelledby", "startup-initial-title");
  doc.panel.setAttribute("aria-modal", "true");
  doc.body.append(doc.panel);
  return doc;
}

const tick = () => new Promise((resolve) => setImmediate(resolve));
const entry = "./assets/entry-abcdefgh.js";
const stylesheet = "./assets/index-abcdefgh.css";
const optionsFor = (doc, overrides = {}) => ({
  documentObject: doc,
  navigatorObject: { language: "en-US" },
  storageObject: null,
  consoleObject: { error() {} },
  waitingMs: 0,
  locationObject: { reload() {} },
  ...overrides,
});

test("startup language honors the saved game preference and survives denied storage", () => {
  assert.equal(selectStartupLanguage({ language: "zh-TW" }, null), "zh-CN");
  assert.equal(selectStartupLanguage({ language: "fr" }, null), "en");
  assert.equal(
    selectStartupLanguage({ language: "zh-CN" }, { getItem: () => "en" }),
    "en",
  );
  assert.equal(
    selectStartupLanguage({ language: "en" }, { getItem: () => "zh-CN" }),
    "zh-CN",
  );
  assert.equal(
    selectStartupLanguage(
      { language: "zh-CN" },
      {
        getItem: () => {
          throw new Error("Storage denied");
        },
      },
    ),
    "zh-CN",
  );
  assert.equal(
    selectStartupLanguage({ language: "en" }, { getItem: () => "unknown" }),
    "en",
  );
  for (const copy of Object.values(STARTUP_COPY)) {
    assert.ok(copy.title && copy.note && copy.initializing);
    assert.notEqual(copy.resourceFailure, copy.initializationFailure);
  }
});

test("module and stylesheet links use original repo URLs and a three-minute deadline", async () => {
  const doc = documentFixture(),
    deadlines = [],
    cleared = [];
  doc.onLink = (link) => link.onload();
  const options = {
    setTimer(_run, ms) {
      deadlines.push(ms);
      return deadlines.length;
    },
    clearTimer(id) {
      cleared.push(id);
    },
  };
  await preloadPreviewModule("./assets/leaf-abcdefgh.js", doc, options);
  await preloadPreviewStylesheet(stylesheet, doc, options);
  assert.deepEqual(deadlines, [180000, 180000]);
  assert.deepEqual(cleared, [1, 2]);
  assert.deepEqual(
    doc.head.children.map((link) => [link.rel, link.href, link.crossOrigin]),
    [
      [
        "modulepreload",
        "https://example.test/abyssal/assets/leaf-abcdefgh.js",
        "anonymous",
      ],
      [
        "stylesheet",
        "https://example.test/abyssal/assets/index-abcdefgh.css",
        "anonymous",
      ],
    ],
  );
  for (const bad of [
    "https://other.example/abyssal/assets/leaf-abcdefgh.js",
    "/else/assets/leaf-abcdefgh.js",
    "./assets/leaf.js",
    "./assets/leaf-abcdefgh.js?cache=1",
    "./assets/leaf-abcdefgh.js#fragment",
    "./assets/leaf-abcdefgh.js.gz",
    "./assets/../secret-abcdefgh.js",
    "./assets/%2e%2e/secret-abcdefgh.js",
  ])
    await assert.rejects(
      preloadPreviewModule(bad, doc),
      /Invalid startup asset/,
    );
  assert.equal(doc.head.children.length, 2);
});

test("a timed-out link settles once, clears handlers and removes the failed hint", async () => {
  const doc = documentFixture();
  let expire,
    delay,
    cleared = 0;
  const pending = preloadPreviewModule(entry, doc, {
    timeoutMs: 7,
    setTimer(run, ms) {
      expire = run;
      delay = ms;
      return 42;
    },
    clearTimer(id) {
      assert.equal(id, 42);
      cleared++;
    },
  });
  const link = doc.head.children[0],
    lateLoad = link.onload;
  assert.equal(delay, 7);
  expire();
  await assert.rejects(pending, /timed out/);
  lateLoad();
  assert.equal(cleared, 1);
  assert.equal(link.onload, null);
  assert.equal(link.onerror, null);
  assert.equal(doc.head.children.length, 0);
  await assert.rejects(
    preloadPreviewModule(entry, doc, { timeoutMs: 0 }),
    /timeout/,
  );
});

test("CSS and leaves share eight workers and import starts only after real completion", async () => {
  const doc = documentFixture(),
    gates = [],
    completed = new Set();
  const leaves = Array.from(
    { length: 10 },
    (_, i) => "./assets/leaf" + i + "-abcdefgh.js",
  );
  let active = 0,
    peak = 0,
    imports = 0;
  const load = async (path) => {
    if (path === entry)
      assert.ok([...leaves, stylesheet].every((p) => completed.has(p)));
    peak = Math.max(peak, ++active);
    await new Promise((resolve) =>
      gates.push({ path, resolve, released: false }),
    );
    active--;
    completed.add(path);
  };
  const pending = startPreviewBootstrap(
    { layers: [leaves, [entry]], styles: [stylesheet], entry },
    optionsFor(doc, {
      loadModule: load,
      loadStylesheet: load,
      async importEntry(url) {
        imports++;
        assert.equal(
          url,
          "https://example.test/abyssal/assets/entry-abcdefgh.js",
        );
        assert.equal(active, 0);
        assert.equal(completed.size, 12);
        assert.equal(doc.panel.dataset.startupState, "initializing");
        assert.equal(
          doc.getElementById("startup-progress").getAttribute("aria-valuenow"),
          "100",
        );
        assert.equal(doc.panel.getAttribute("role"), null);
        assert.equal(doc.panel.getAttribute("aria-labelledby"), null);
        assert.equal(doc.panel.getAttribute("aria-modal"), null);
        assert.equal(doc.panel.listeners.has("keydown"), false);
      },
    }),
  );
  assert.equal(active, 8);
  let tabPrevented = false;
  doc.panel.listeners.get("keydown")({
    key: "Tab",
    preventDefault() {
      tabPrevented = true;
    },
  });
  assert.equal(tabPrevented, true);
  assert.equal(doc.activeElement, doc.panel);
  assert.equal(doc.getElementById("startup-progress").dataset.completed, "0");
  assert.equal(doc.getElementById("startup-progress").dataset.total, "12");
  while (gates.some((gate) => !gate.released)) {
    const gate = gates.find((g) => !g.released);
    gate.released = true;
    gate.resolve();
    await tick();
  }
  assert.equal(await pending, true);
  assert.equal(peak, 8);
  assert.equal(imports, 1);
  assert.equal(doc.panel.dataset.startupState, "ready");
  assert.equal(doc.body.inert, undefined);
});

test("resource failure drains the queue before exposing one native reload action", async () => {
  const doc = documentFixture();
  let rejectCSS,
    finishJS,
    calls = 0,
    imports = 0,
    reloads = 0;
  const pending = startPreviewBootstrap(
    { layers: [[entry]], styles: [stylesheet], entry },
    optionsFor(doc, {
      loadStylesheet: () => {
        calls++;
        return new Promise((_r, reject) => {
          rejectCSS = reject;
        });
      },
      loadModule: () => {
        calls++;
        return new Promise((resolve) => {
          finishJS = resolve;
        });
      },
      importEntry: () => {
        imports++;
      },
      locationObject: {
        reload() {
          reloads++;
        },
      },
    }),
  );
  rejectCSS(new Error("CSS unavailable"));
  await tick();
  assert.equal(doc.getElementById("startup-retry").hidden, true);
  finishJS();
  assert.equal(await pending, false);
  assert.equal(doc.panel.dataset.startupState, "failed-resources");
  assert.equal(
    doc.getElementById("startup-title").textContent,
    STARTUP_COPY.en.resourceFailure,
  );
  const retry = doc.getElementById("startup-retry");
  assert.equal(retry.hidden, false);
  assert.equal(retry.tagName, "BUTTON");
  assert.equal(retry.type, "button");
  assert.equal(doc.activeElement, retry);
  retry.click();
  retry.click();
  assert.equal(reloads, 1);
  assert.equal(calls, 2);
  assert.equal(imports, 0);
});

test("initialization failure rebuilds an accessible card after the game reused the loading node", async () => {
  const doc = documentFixture();
  const result = await startPreviewBootstrap(
    { layers: [[entry]], entry },
    optionsFor(doc, {
      navigatorObject: { language: "zh-CN" },
      loadModule: async () => {},
      importEntry: async () => {
        assert.equal(doc.panel.getAttribute("aria-labelledby"), null);
        doc.panel.textContent = "Game initialization error";
        throw new Error("Renderer failed");
      },
    }),
  );
  assert.equal(result, false);
  assert.equal(doc.panel.dataset.startupState, "failed-initialization");
  assert.equal(doc.panel.getAttribute("aria-labelledby"), "startup-title");
  assert.equal(
    doc.getElementById("startup-title").textContent,
    STARTUP_COPY["zh-CN"].initializationFailure,
  );
  assert.equal(doc.getElementById("startup-retry").hidden, false);
  assert.equal(
    doc.getElementById("startup-note").textContent,
    "Game initialization error",
  );
});

test("unsupported modulepreload waits for CSS before direct import without inventing a percentage", async () => {
  const doc = documentFixture(false);
  let finishCSS,
    cssReady = false,
    imports = 0;
  const pending = startPreviewBootstrap(
    { layers: [[entry]], styles: [stylesheet], entry },
    optionsFor(doc, {
      loadStylesheet: async () => {
        await new Promise((resolve) => {
          finishCSS = resolve;
        });
        cssReady = true;
      },
      loadModule: () => {
        throw new Error("Unsupported hints must not run");
      },
      importEntry: async () => {
        imports++;
        assert.equal(cssReady, true);
        assert.equal(
          doc.getElementById("startup-progress").getAttribute("aria-valuenow"),
          null,
        );
      },
    }),
  );
  assert.equal(imports, 0);
  assert.equal(doc.panel.dataset.startupState, "direct");
  assert.equal(doc.getElementById("startup-progress-fill").hidden, true);
  assert.equal(
    doc.getElementById("startup-count").textContent,
    STARTUP_COPY.en.indeterminate,
  );
  finishCSS();
  assert.equal(await pending, true);
  assert.equal(imports, 1);
});

test("a genuine idle hint does not move progress and all timers end at handoff completion", async () => {
  const doc = documentFixture(),
    timers = new Map();
  let next = 0,
    finishModule,
    finishImport;
  const pending = startPreviewBootstrap(
    { layers: [[entry]], entry },
    optionsFor(doc, {
      waitingMs: 10,
      setTimer(run) {
        timers.set(++next, run);
        return next;
      },
      clearTimer(id) {
        timers.delete(id);
      },
      loadModule: () =>
        new Promise((resolve) => {
          finishModule = resolve;
        }),
      importEntry: () =>
        new Promise((resolve) => {
          finishImport = resolve;
        }),
    }),
  );
  const fire = () => {
    const [id, run] = [...timers].at(-1);
    timers.delete(id);
    run();
  };
  fire();
  assert.equal(doc.getElementById("startup-waiting").hidden, false);
  assert.equal(
    doc.getElementById("startup-progress").getAttribute("aria-valuenow"),
    "0",
  );
  finishModule();
  await tick();
  assert.equal(doc.panel.dataset.startupState, "initializing");
  fire();
  assert.equal(
    doc.getElementById("startup-progress").getAttribute("aria-valuenow"),
    "100",
  );
  finishImport();
  assert.equal(await pending, true);
  assert.equal(timers.size, 0);
  assert.equal(doc.getElementById("startup-waiting").hidden, true);
});
