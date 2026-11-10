import { readFile, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseAst } from "rolldown/parseAst";

/** 只接受构建目录内的带内容指纹模块，不把源码或外站加入预览入口。 */
export function previewDependencyPath(source, importer) {
  const url = new URL(source, `https://preview.invalid/${importer}`);
  if (
    url.origin !== "https://preview.invalid" ||
    url.search ||
    url.hash ||
    !/^\/assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.js$/.test(url.pathname)
  )
    throw new Error(`Invalid preview dependency: ${source}`);
  return url.pathname.slice(1);
}

/** 先完成所有叶子，再准备依赖它们的父模块；遇到循环则在改写文件前停止。 */
export function previewDependencyLayers(graph) {
  const pending = new Map(
    [...graph].map(([path, imports]) => [path, new Set(imports)]),
  );
  const layers = [];
  const complete = new Set();
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

export async function preparePreviewLoader(root) {
  root = resolve(root);
  const original = await readFile(`${root}/index.html`, "utf8");
  const scripts = [
    ...original.matchAll(
      /<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g,
    ),
  ];
  if (scripts.length !== 1 || scripts[0][1].includes("preview_bootstrap-"))
    throw new Error("Expected one unwrapped compiled entry");
  const entry = previewDependencyPath(scripts[0][1], "index.html");
  const graph = new Map();
  async function visit(path) {
    if (graph.has(path)) return;
    const code = await readFile(`${root}/${path}`, "utf8");
    // 大型纯网格数据没有导入；跳过其数组AST，避免为了传输编排占用大量内存。
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
  const layers = previewDependencyLayers(graph);
  const source = await readFile(
    fileURLToPath(new URL("./preview_bootstrap.js", import.meta.url)),
    "utf8",
  );
  const code = `${source}\nstartPreviewBootstrap(${JSON.stringify({ layers, entry: `./${entry}` })});\n`;
  const digest = createHash("sha256").update(code).digest("hex").slice(0, 16);
  const asset = `assets/preview_bootstrap-${digest}.js`;
  const html = original
    .replace(/<link\b[^>]*rel="modulepreload"[^>]*>\s*/g, "")
    .replace(
      scripts[0][0],
      `<script type="module" crossorigin src="./${asset}"></script>`,
    );
  await writeFile(`${root}/${asset}`, code);
  await writeFile(`${root}/${asset}.gz`, gzipSync(code, { level: 9 }));
  // 原HTML可能参与硬链接归档，必须替换目录项，不能原地覆盖。
  await writeFile(`${root}/index.next.html`, html);
  await rename(`${root}/index.next.html`, `${root}/index.html`);
  return {
    entry,
    asset,
    modules: graph.size,
    layers: layers.map((layer) => layer.length),
    removedPreloads: [...original.matchAll(/rel="modulepreload"/g)].length,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (!process.argv[2])
    throw new Error(
      "Usage: node scripts/prepare_preview_loader.mjs COMPILED_ROOT",
    );
  console.log(JSON.stringify(await preparePreviewLoader(process.argv[2])));
}
