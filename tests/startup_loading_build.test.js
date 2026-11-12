import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";
import { parseAst } from "rolldown/parseAst";
import { build } from "vite";
import { compressedAssets } from "../scripts/cacheable_build.js";
import {
  prepareStartupLoader,
  preparePreviewLoader,
} from "../scripts/prepare_preview_loader.mjs";
import { startupLoading } from "../scripts/startup_loading_build.js";

const project = fileURLToPath(new URL("..", import.meta.url));

async function withFixture(run) {
  const local = join(project, ".local");
  await mkdir(local, { recursive: true });
  const root = await mkdtemp(join(local, "startup_loading_build_test_"));
  try {
    await run(root);
  } finally {
    // 只删除本测试独占的随机目录，不碰已有试玩包、服务或其他测试产物。
    await rm(root, { recursive: true, force: true });
  }
}

async function put(root, path, value) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, value);
}

async function snapshot(root, prefix = "") {
  const result = new Map();
  for (const entry of await readdir(join(root, prefix), {
    withFileTypes: true,
  })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      for (const [path, bytes] of await snapshot(root, name))
        result.set(path, bytes);
    } else if (entry.isSymbolicLink()) {
      // 越界用例的外部目标保持在本测试目录内；快照只记录链接本身，不跟随读取。
      const { readlink } = await import("node:fs/promises");
      result.set(
        name,
        Buffer.from(`symlink:${await readlink(join(root, name))}`),
      );
    } else result.set(name, await readFile(join(root, name)));
  }
  return result;
}

function assertSameFiles(before, after) {
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort());
  for (const [path, bytes] of before)
    assert.deepEqual(after.get(path), bytes, `Changed artifact: ${path}`);
}

function moduleScript(html) {
  const tags = [...html.matchAll(/<script\b[^>]*>\s*<\/script>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\btype\s*=\s*["']module["']/i.test(tag));
  assert.equal(tags.length, 1, "Expected one external module entry");
  const source = tags[0].match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
  assert.ok(source, "Expected an external module URL");
  return source.replace(/^\.\//, "");
}

function stylesheetPaths(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\brel\s*=\s*["']stylesheet["']/i.test(tag))
    .map((tag) => tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]);
}

function loadingShell(html) {
  const start = /<div\b[^>]*\bid\s*=\s*["']loading["'][^>]*>/i.exec(html);
  assert.ok(start, "Static loading panel must remain in the HTML");
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start.index;
  let depth = 0;
  for (let tag; (tag = tags.exec(html)); ) {
    depth += /^<\//.test(tag[0]) ? -1 : 1;
    if (depth === 0) return html.slice(start.index, tags.lastIndex);
  }
  assert.fail("Loading panel is not closed");
}

function manifestFrom(code) {
  let manifest;
  function value(node) {
    if (node.type === "Literal") return node.value;
    if (node.type === "ArrayExpression") return node.elements.map(value);
    if (node.type === "ObjectExpression")
      return Object.fromEntries(
        node.properties.map((property) => [
          property.key.name ?? property.key.value,
          value(property.value),
        ]),
      );
    assert.fail(`Manifest contains non-literal syntax: ${node.type}`);
  }
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ObjectExpression") {
      const keys = node.properties.map(
        (property) => property.key?.name ?? property.key?.value,
      );
      if (["entry", "layers", "styles"].every((key) => keys.includes(key))) {
        assert.equal(manifest, undefined, "Expected one startup manifest");
        manifest = value(node);
      }
    }
    for (const child of Object.values(node))
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === "object") visit(child);
  }
  visit(parseAst(code));
  assert.ok(
    manifest,
    "Wrapper must contain the entry, styles and module layers",
  );
  return manifest;
}

async function sourceFixture(root) {
  await put(
    root,
    "index.html",
    `<!doctype html><html lang="en"><head>
      <meta name="fixture-kept" content="head-sentinel">
      <title>Startup fixture</title>
      <link rel="icon" href="data:image/svg+xml,%3Csvg/%3E">
      </head><body>
      <div id="loading"><p>Loading placeholder</p></div>
      <main id="fixture-kept" data-sentinel="body-sentinel">Keep this content</main>
      <script type="module" src="/src/main.js"></script>
      </body></html>`,
  );
  await put(
    root,
    "src/main.js",
    `import "./main.css";
      import { sharedText, bridgeText } from "./static_bridge.js";
      document.querySelector("main").textContent = sharedText + bridgeText;
      globalThis.loadFixtureLazy = () => import("./lazy.js").then(m => m.run());`,
  );
  await put(
    root,
    "src/static_bridge.js",
    `export { sharedText } from "./static_leaf.js";
      export const bridgeText = ${JSON.stringify("Bridge fixture ".repeat(80))};
      globalThis.fixtureBridgeLoaded = true;`,
  );
  await put(
    root,
    "src/static_leaf.js",
    `export const sharedText = ${JSON.stringify("Static fixture ".repeat(160))};`,
  );
  await put(
    root,
    "src/lazy.js",
    'import "./lazy.css"; export const run = () => "Lazy fixture remains on demand";',
  );
  await put(
    root,
    "src/main.css",
    "main { color: #97c9bd; padding: 12px; }\n".repeat(80),
  );
  await put(
    root,
    "src/lazy.css",
    ".lazy-fixture { opacity: .8; }\n".repeat(40),
  );
  await put(
    root,
    "src/ssr_entry.js",
    'export const render = () => "SSR fixture";',
  );
  await put(
    root,
    "public/untouched.bin",
    Buffer.from([0, 1, 2, 128, 254, 255]),
  );
}

function fixtureConfig(root, plugins, overrides = {}) {
  return {
    root,
    configFile: false,
    base: "./",
    logLevel: "silent",
    plugins,
    build: {
      outDir: "dist",
      minify: false,
      cssMinify: false,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "static_leaf",
                test: /\/static_leaf\.js$/,
                priority: 2,
                includeDependenciesRecursively: false,
              },
              {
                name: "static_bridge",
                test: /\/static_bridge\.js$/,
                priority: 1,
                includeDependenciesRecursively: false,
              },
            ],
          },
        },
      },
      ...overrides,
    },
  };
}

async function compiledFixture(root) {
  const dist = join(root, "dist");
  const modules = {
    "assets/entry-abcdefgh.js":
      'import { shared } from "./bridge-abcdefgh.js"; globalThis.fixture = shared; globalThis.loadLazy = () => import("./lazy-abcdefgh.js");',
    "assets/bridge-abcdefgh.js": 'export * from "./leaf-abcdefgh.js";',
    "assets/leaf-abcdefgh.js": 'export const shared = "Static fixture";',
    "assets/lazy-abcdefgh.js": 'export const lazy = "On-demand fixture";',
    "assets/style-abcdefgh.css": "body { color: #92cfbc; }\n",
  };
  await put(
    dist,
    "index.html",
    '<!doctype html><html><head><title>Compiled fixture</title><link rel="modulepreload" href="./assets/bridge-abcdefgh.js"><link rel="stylesheet" href="./assets/style-abcdefgh.css"></head><body><div id="loading"><p>Loading placeholder</p></div><main>Preserved content</main><script type="module" src="./assets/entry-abcdefgh.js"></script></body></html>',
  );
  for (const [path, code] of Object.entries(modules)) {
    await put(dist, path, code);
    await put(dist, `${path}.gz`, gzipSync(code));
  }
  return dist;
}

test("Ordinary Vite builds add a compressed startup wrapper without changing existing JS, CSS, gzip or binary artifacts", async () => {
  await withFixture(async (root) => {
    await sourceFixture(root);
    const baseline = await build(
      fixtureConfig(root, [compressedAssets()], { outDir: "baseline" }),
    );
    const before = await snapshot(join(root, "baseline"));
    await build(fixtureConfig(root, [compressedAssets(), startupLoading()]));
    const dist = join(root, "dist"),
      after = await snapshot(dist),
      html = after.get("index.html").toString(),
      original = before.get("index.html").toString(),
      wrapper = moduleScript(html);
    assert.match(wrapper, /^assets\/startup_bootstrap-[a-zA-Z0-9_-]{8,}\.js$/);
    assert.ok(after.has(wrapper));
    assert.deepEqual(
      gunzipSync(after.get(`${wrapper}.gz`)),
      after.get(wrapper),
    );
    for (const [path, bytes] of before)
      if (path !== "index.html")
        assert.deepEqual(
          after.get(path),
          bytes,
          `Changed compiled artifact: ${path}`,
        );
    assert.deepEqual(
      [...after.keys()].filter((path) => !before.has(path)).sort(),
      [wrapper, `${wrapper}.gz`].sort(),
    );
    assert.doesNotMatch(
      html,
      /<link\b[^>]*rel=["'](?:modulepreload|stylesheet)["']/i,
    );
    for (const sentinel of [
      "head-sentinel",
      "body-sentinel",
      "Keep this content",
      "data:image/svg+xml",
    ])
      assert.ok(html.includes(sentinel), sentinel);
    const shell = loadingShell(html);
    assert.match(shell, /<progress\b|role\s*=\s*["']progressbar["']/i);
    assert.match(shell, /role\s*=\s*["']status["']/i);

    const manifest = manifestFrom(after.get(wrapper).toString()),
      entry = moduleScript(original),
      chunks = new Map(
        baseline.output
          .filter((item) => item.type === "chunk")
          .map((item) => [item.fileName, item]),
      ),
      closure = new Set();
    function visit(path) {
      if (closure.has(path)) return;
      closure.add(path);
      for (const dependency of chunks.get(path).imports) visit(dependency);
    }
    visit(entry);
    assert.ok(
      closure.size >= 3,
      "Fixture must exercise real static chunk dependencies",
    );
    const flattened = manifest.layers
      .flat()
      .map((path) => path.replace(/^\.\//, ""));
    assert.equal(new Set(flattened).size, flattened.length);
    assert.deepEqual(new Set(flattened), closure);
    assert.equal(manifest.entry.replace(/^\.\//, ""), entry);
    assert.deepEqual(manifest.styles, stylesheetPaths(original));
    assert.ok(manifest.styles.length > 0);
    const layer = new Map(
      manifest.layers.flatMap((paths, i) =>
        paths.map((path) => [path.replace(/^\.\//, ""), i]),
      ),
    );
    for (const path of closure)
      for (const dependency of chunks.get(path).imports)
        assert.ok(
          layer.get(dependency) < layer.get(path),
          `${dependency} must precede ${path}`,
        );
    const dynamic = [...chunks.values()].filter((item) => item.isDynamicEntry);
    assert.ok(dynamic.length > 0, "Fixture must retain a real lazy entry");
    for (const chunk of dynamic) assert.ok(!closure.has(chunk.fileName));
  });
});

test("Static import and re-export closure excludes lazy modules and preparation is byte-identical on repeated startup and legacy calls", async () => {
  await withFixture(async (root) => {
    const dist = await compiledFixture(root),
      before = await snapshot(dist);
    await prepareStartupLoader(dist);
    const prepared = await snapshot(dist),
      wrapper = moduleScript(prepared.get("index.html").toString()),
      manifest = manifestFrom(prepared.get(wrapper).toString());
    assert.deepEqual(manifest.layers, [
      ["./assets/leaf-abcdefgh.js"],
      ["./assets/bridge-abcdefgh.js"],
      ["./assets/entry-abcdefgh.js"],
    ]);
    assert.deepEqual(manifest.styles, ["./assets/style-abcdefgh.css"]);
    for (const [path, bytes] of before)
      if (path !== "index.html")
        assert.deepEqual(prepared.get(path), bytes, path);
    assert.equal((await prepareStartupLoader(dist)).alreadyPrepared, true);
    assertSameFiles(prepared, await snapshot(dist));
    assert.equal((await preparePreviewLoader(dist)).alreadyPrepared, true);
    assertSameFiles(prepared, await snapshot(dist));
  });
});

test("Corrupt prepared HTML, wrappers and gzip or missing wrapper files fail before any repair or rewrite", async (t) => {
  for (const corruption of [
    "html_shell",
    "wrapper",
    "gzip",
    "missing_wrapper",
    "missing_gzip",
  ])
    await t.test(corruption, async () => {
      await withFixture(async (root) => {
        const dist = await compiledFixture(root);
        await prepareStartupLoader(dist);
        const wrapper = moduleScript(
          await readFile(join(dist, "index.html"), "utf8"),
        );
        if (corruption === "html_shell")
          await put(
            dist,
            "index.html",
            (await readFile(join(dist, "index.html"), "utf8")).replace(
              'id="startup-initial-retry"',
              'id="missing-retry"',
            ),
          );
        if (corruption === "wrapper")
          await put(
            dist,
            wrapper,
            `${await readFile(join(dist, wrapper), "utf8")}\n// corrupted bytes\n`,
          );
        if (corruption === "gzip")
          await put(dist, `${wrapper}.gz`, gzipSync("Different content"));
        if (corruption === "missing_wrapper") await unlink(join(dist, wrapper));
        if (corruption === "missing_gzip")
          await unlink(join(dist, `${wrapper}.gz`));
        const before = await snapshot(dist);
        await assert.rejects(prepareStartupLoader(dist));
        assertSameFiles(before, await snapshot(dist));
      });
    });
});

test("Missing dependencies, cycles and escaped JS or CSS paths fail atomically without altering existing artifacts", async (t) => {
  for (const invalid of [
    "missing_js",
    "missing_css",
    "cycle",
    "escaped_js",
    "escaped_css",
    "symlink_escape",
  ])
    await t.test(invalid, async () => {
      await withFixture(async (root) => {
        const dist = await compiledFixture(root);
        if (invalid === "missing_js")
          await unlink(join(dist, "assets/leaf-abcdefgh.js"));
        if (invalid === "missing_css")
          await unlink(join(dist, "assets/style-abcdefgh.css"));
        if (invalid === "cycle" || invalid === "escaped_js") {
          const code =
            invalid === "cycle"
              ? 'export * from "./entry-abcdefgh.js";'
              : 'export * from "../../outside-abcdefgh.js";';
          await put(dist, "assets/leaf-abcdefgh.js", code);
          await put(dist, "assets/leaf-abcdefgh.js.gz", gzipSync(code));
        }
        if (invalid === "escaped_css") {
          const html = await readFile(join(dist, "index.html"), "utf8");
          await put(
            dist,
            "index.html",
            html.replace(
              "./assets/style-abcdefgh.css",
              "../outside-abcdefgh.css",
            ),
          );
        }
        if (invalid === "symlink_escape") {
          await put(
            root,
            "outside-abcdefgh.js",
            await readFile(join(dist, "assets/leaf-abcdefgh.js")),
          );
          await unlink(join(dist, "assets/leaf-abcdefgh.js"));
          await symlink(
            "../../outside-abcdefgh.js",
            join(dist, "assets/leaf-abcdefgh.js"),
          );
        }
        const before = await snapshot(root);
        await assert.rejects(prepareStartupLoader(dist));
        assertSameFiles(before, await snapshot(root));
      });
    });
});

test("Vite write:false builds never wrap or modify an existing client output directory", async () => {
  await withFixture(async (root) => {
    await sourceFixture(root);
    const dist = await compiledFixture(root),
      before = await snapshot(dist);
    const result = await build(
      fixtureConfig(root, [compressedAssets(), startupLoading()], {
        write: false,
      }),
    );
    assert.ok(result.output.some((item) => item.type === "chunk"));
    assertSameFiles(before, await snapshot(dist));
  });
});

test("SSR writes preserve old client HTML and assets and do not add a startup wrapper", async () => {
  await withFixture(async (root) => {
    await sourceFixture(root);
    const dist = await compiledFixture(root),
      before = await snapshot(dist);
    await build(
      fixtureConfig(root, [compressedAssets(), startupLoading()], {
        ssr: resolve(root, "src/ssr_entry.js"),
        emptyOutDir: false,
      }),
    );
    const after = await snapshot(dist);
    for (const [path, bytes] of before)
      assert.deepEqual(after.get(path), bytes, path);
    assert.ok(
      ![...after.keys()].some((path) => /startup_bootstrap-/.test(path)),
    );
    assert.ok([...after.keys()].some((path) => /ssr_entry.*\.js$/.test(path)));
  });
});

test("A failing client build never wraps the previous successful output in its error cleanup", async () => {
  await withFixture(async (root) => {
    await sourceFixture(root);
    const dist = await compiledFixture(root),
      before = await snapshot(dist);
    await assert.rejects(
      build(
        fixtureConfig(root, [
          compressedAssets(),
          startupLoading(),
          {
            name: "intentional-startup-fixture-failure",
            buildStart() {
              throw new Error("Intentional startup fixture build failure");
            },
          },
        ]),
      ),
      /Intentional startup fixture build failure/,
    );
    assertSameFiles(before, await snapshot(dist));
  });
});
