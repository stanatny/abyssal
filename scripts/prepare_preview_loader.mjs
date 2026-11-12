import { readFile, writeFile, rename, realpath, lstat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseAst } from "rolldown/parseAst";

const marker = "/* ABYSSAL_STARTUP_MANIFEST */";
const runtimePath = fileURLToPath(
  new URL("./preview_bootstrap.js", import.meta.url),
);

/** 构建资源必须是目录内的实际文件，与受限静态服务器的符号链接规则一致。 */
async function readRuntimeFile(root, path, encoding) {
  const absolute = resolve(root, path);
  if (
    (await realpath(absolute)) !== absolute ||
    !(await lstat(absolute)).isFile()
  )
    throw new Error(`Compiled runtime path crosses a symbolic link: ${path}`);
  return readFile(absolute, encoding);
}

/** 只接受构建目录内的相对指纹资源，保持仓库子路径中的实际模块URL一致。 */
function compiledAssetPath(source, importer, extension) {
  const url = new URL(source, `https://preview.invalid/${importer}`);
  if (
    typeof source !== "string" ||
    !source.startsWith(".") ||
    url.origin !== "https://preview.invalid" ||
    url.search ||
    url.hash ||
    !new RegExp(
      `^/assets/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\\.${extension}$`,
    ).test(url.pathname)
  )
    throw new Error(`Invalid preview dependency: ${source}`);
  return url.pathname.slice(1);
}

export function previewDependencyPath(source, importer) {
  return compiledAssetPath(source, importer, "js");
}

/** 叶子先于父模块；循环和缺失依赖必须在写入启动器前失败。 */
export function previewDependencyLayers(graph) {
  const pending = new Map(
    [...graph].map(([path, imports]) => [path, new Set(imports)]),
  );
  const layers = [],
    complete = new Set();
  while (pending.size) {
    const ready = [...pending]
      .filter(([, imports]) => [...imports].every((path) => complete.has(path)))
      .map(([path]) => path)
      .sort();
    if (!ready.length)
      throw new Error(
        "Preview dependency graph contains a cycle or missing module",
      );
    layers.push(ready.map((path) => `./${path}`));
    for (const path of ready) {
      complete.add(path);
      pending.delete(path);
    }
  }
  return layers;
}

async function readGraph(root, entry) {
  const graph = new Map();
  async function visit(path) {
    if (graph.has(path)) return;
    const code = await readRuntimeFile(root, path, "utf8");
    // 纯网格数组没有静态导入，避免为传输编排额外构建其庞大AST。
    const nodes = /\bimport\b|\bfrom\s*["']/.test(code)
      ? parseAst(code).body
      : [];
    const imports = nodes
      .filter(
        (node) =>
          [
            "ImportDeclaration",
            "ExportNamedDeclaration",
            "ExportAllDeclaration",
          ].includes(node.type) && node.source,
      )
      .map((node) => previewDependencyPath(node.source.value, path));
    graph.set(path, imports);
    for (const dependency of imports) await visit(dependency);
  }
  await visit(entry);
  return graph;
}

/** 首帧壳不依赖大体积游戏CSS或应用模块，语言在第一次绘制前就地确定。 */
function initialShell(copy, total) {
  const words = JSON.stringify(copy).replaceAll("<", "\\u003c");
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll('"', "&quot;");
  return `<div id="loading" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="startup-initial-title" data-abyssal-startup-shell="1">
<section class="startup-initial-card"><p class="startup-initial-brand">ABYSSAL</p><h1 id="startup-initial-title" role="status">${escape(copy.en.title)}</h1><p id="startup-initial-count">0 / ${total}</p><progress max="${total}" value="0" aria-label="${escape(copy.en.title)}"></progress><p id="startup-initial-note">${escape(copy.en.note)}</p><button id="startup-initial-retry" type="button" onclick="this.disabled=true;location.reload()">${escape(copy.en.retry)}</button></section></div>
<script id="startup-initial-language">(()=>{const words=${words};let language=navigator.language?.toLowerCase().startsWith("zh")?"zh-CN":"en";try{const saved=localStorage.getItem("abyssal-language");if(saved==="en"||saved==="zh-CN")language=saved}catch{}const copy=words[language];document.documentElement.lang=language;document.getElementById("startup-initial-title").textContent=copy.title;document.getElementById("startup-initial-note").textContent=copy.note;document.querySelector("#loading progress").setAttribute("aria-label",copy.title);document.getElementById("startup-initial-retry").textContent=copy.retry;const failed=event=>{if(!event.target?.matches?.('script[data-abyssal-startup="1"]'))return;document.removeEventListener("error",failed,true);document.getElementById("loading").dataset.startupState="failed-bootstrap";document.getElementById("startup-initial-title").textContent=copy.resourceFailure;document.getElementById("startup-initial-note").textContent=copy.failureNote;document.getElementById("startup-initial-retry").focus()};document.addEventListener("error",failed,true)})();</script>`;
}

const initialStyle = `<style id="startup-initial-style">
#loading{position:fixed;inset:0;display:grid;place-items:center;z-index:10000;background:#020a12;color:#dbece8;font:15px/1.6 system-ui,sans-serif;text-align:center;padding:24px;animation:none!important;opacity:1!important;letter-spacing:0}
#loading[hidden]{display:none!important}#loading progress{width:100%;height:8px;accent-color:#92cfbc}.startup-initial-card{width:min(420px,100%);padding:max(16px,env(safe-area-inset-top)) max(0px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(0px,env(safe-area-inset-left))}.startup-initial-brand{font:28px Georgia,serif;letter-spacing:6px;margin:0 0 30px}#startup-initial-title{font-size:18px;line-height:1.5;font-weight:500;margin:0 0 18px}#startup-initial-count{font-variant-numeric:tabular-nums;font-size:13px;color:#a7c6bd}#startup-initial-note{font-size:13px;color:#a4bdbd;margin-top:20px}#startup-initial-retry{min-height:44px;padding:10px 16px;border:1px solid #92cfbc;border-radius:6px;background:#17323b;color:#e8f6f2;font:inherit;cursor:pointer;margin-top:12px}body{margin:0;background:#020a12;overflow:hidden}
</style>`;

function bootstrapCode(source, config) {
  return `${source}\n${marker}\nstartPreviewBootstrap(${JSON.stringify(config)});\n`;
}

function assetName(code) {
  return `assets/startup_bootstrap-${createHash("sha256").update(code).digest("hex").slice(0, 16)}.js`;
}

function metadata(graph, config, asset, alreadyPrepared, removedPreloads = 0) {
  return {
    entry: config.entry.slice(2),
    asset,
    modules: graph.size,
    resources: graph.size + config.styles.length,
    styles: config.styles.length,
    layers: config.layers.map((layer) => layer.length),
    removedPreloads,
    alreadyPrepared,
  };
}

/** 同一合法包装可重复调用，现有预览管理器无需再套第二层启动入口。 */
export async function prepareStartupLoader(root) {
  root = await realpath(resolve(root));
  const original = await readRuntimeFile(root, "index.html", "utf8");
  const scripts = [
    ...original.matchAll(
      /<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
    ),
  ];
  if (scripts.length !== 1)
    throw new Error("Expected one compiled module entry");
  const source = await readFile(runtimePath, "utf8");
  const { STARTUP_COPY } = await import(
    `${pathToFileURL(runtimePath).href}?source=${createHash("sha256").update(source).digest("hex")}`
  );
  if (!STARTUP_COPY?.en?.title || !STARTUP_COPY?.["zh-CN"]?.note)
    throw new Error("Startup loading copy is missing");
  const script = scripts[0],
    scriptPath = previewDependencyPath(script[1], "index.html");
  if (/\/(?:startup|preview)_bootstrap-/.test(scriptPath)) {
    if (!script[0].includes('data-abyssal-startup="1"'))
      throw new Error("Unrecognized prepared startup entry");
    const existing = await readRuntimeFile(root, scriptPath, "utf8");
    const match = existing.match(
      /\/\* ABYSSAL_STARTUP_MANIFEST \*\/\s*startPreviewBootstrap\((\{[^\n]+\})\);\s*$/,
    );
    if (!match) throw new Error("Prepared startup manifest is missing");
    const config = JSON.parse(match[1]);
    if (!Array.isArray(config.styles) || !Array.isArray(config.layers))
      throw new Error("Invalid prepared startup manifest");
    const entry = previewDependencyPath(config.entry, "index.html"),
      graph = await readGraph(root, entry);
    const styles = config.styles.map(
      (path) => `./${compiledAssetPath(path, "index.html", "css")}`,
    );
    if (new Set(styles).size !== styles.length)
      throw new Error("Duplicate startup stylesheet");
    for (const path of styles) await readRuntimeFile(root, path.slice(2));
    const expectedConfig = {
      layers: previewDependencyLayers(graph),
      entry: `./${entry}`,
      styles,
    };
    const expectedCode = bootstrapCode(source, expectedConfig);
    if (
      JSON.stringify(config) !== JSON.stringify(expectedConfig) ||
      existing !== expectedCode ||
      scriptPath !== assetName(existing)
    )
      throw new Error("Prepared startup loader does not match build inputs");
    const gzip = await readRuntimeFile(root, `${scriptPath}.gz`);
    if (!gunzipSync(gzip).equals(Buffer.from(existing)))
      throw new Error("Prepared startup gzip does not match");
    if (
      !original.includes(initialStyle) ||
      !original.includes(
        initialShell(STARTUP_COPY, graph.size + styles.length),
      ) ||
      /<link\b[^>]*rel="(?:stylesheet|modulepreload)"/.test(original)
    )
      throw new Error("Prepared startup HTML is incomplete");
    return metadata(graph, config, scriptPath, true);
  }
  const graph = await readGraph(root, scriptPath),
    layers = previewDependencyLayers(graph);
  const styleLinks = [
    ...original.matchAll(
      /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
    ),
  ];
  const styles = styleLinks.map(
    (match) => `./${compiledAssetPath(match[1], "index.html", "css")}`,
  );
  if (new Set(styles).size !== styles.length)
    throw new Error("Duplicate startup stylesheet");
  for (const path of styles) await readRuntimeFile(root, path.slice(2));
  const config = { layers, entry: `./${scriptPath}`, styles };
  const code = bootstrapCode(source, config),
    asset = assetName(code);
  const placeholders = [
    ...original.matchAll(/<div\b[^>]*id="loading"[^>]*>([\s\S]*?)<\/div>/g),
  ];
  if (placeholders.length !== 1 || /<div\b/i.test(placeholders[0][1]))
    throw new Error("Expected one simple startup loading placeholder");
  if (!original.includes("</head>"))
    throw new Error("Compiled startup document has no head");
  let html = original.replace(/<link\b[^>]*rel="modulepreload"[^>]*>\s*/g, "");
  for (const link of styleLinks) html = html.replace(link[0], "");
  html = html
    .replace(
      script[0],
      `<script type="module" crossorigin data-abyssal-startup="1" src="./${asset}"></script>`,
    )
    .replace(
      placeholders[0][0],
      initialShell(STARTUP_COPY, graph.size + styles.length),
    )
    .replace("</head>", `${initialStyle}\n</head>`);
  await writeFile(`${root}/${asset}`, code);
  await writeFile(`${root}/${asset}.gz`, gzipSync(code, { level: 9 }));
  // 原HTML可能参与硬链接归档，替换目录项以保留此前验收版本。
  await writeFile(`${root}/index.next.html`, html);
  await rename(`${root}/index.next.html`, `${root}/index.html`);
  return metadata(
    graph,
    config,
    asset,
    false,
    [...original.matchAll(/rel="modulepreload"/g)].length,
  );
}

export const preparePreviewLoader = prepareStartupLoader;

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.argv[2])
    throw new Error(
      "Usage: node scripts/prepare_preview_loader.mjs COMPILED_ROOT",
    );
  console.log(JSON.stringify(await prepareStartupLoader(process.argv[2])));
}
