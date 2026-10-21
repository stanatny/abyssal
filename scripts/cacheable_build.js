import { gzipSync } from "node:zlib";

/** 为纯模型数据生成独立内容指纹块，避免一只生物更新导致全部网格重下。 */
export function modelChunkName(id) {
  const match = id
    .replaceAll("\\", "/")
    .match(/\/src\/assets\/models\/([a-z0-9_]+)\.json$/);
  return match ? `model_${match[1]}` : undefined;
}

/** 构建时生成压缩副本；只改变传输格式，不改变解压后的程序或模型字节。 */
export function compressedAssets() {
  return {
    name: "abyssal-compressed-assets",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const [name, item] of Object.entries(bundle)) {
        if (!/\.(js|css)$/.test(name)) continue;
        const bytes = Buffer.from(
          item.type === "chunk" ? item.code : item.source,
        );
        const compressed = gzipSync(bytes, { level: 9 });
        if (compressed.length >= bytes.length) continue;
        this.emitFile({
          type: "asset",
          fileName: `${name}.gz`,
          source: compressed,
        });
      }
    },
  };
}
