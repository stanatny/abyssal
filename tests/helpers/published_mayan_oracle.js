import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_COMMIT = "21cf9a4e50afd11c3d8634d92c461b43f85fe791";
const CLOSURE_HASH =
  "36d357d0e290dfc7ced8a06c7ff2bb81ff32c8a501823e415355676bf02f4ec7";

/**
 * 验证冻结发布源码，禁止重新生成预期时意外引用当前模型实现。
 * @param {object} snapshot 原提交、Three 版本及完整源码依赖闭包。
 * @returns {void} 来源或源码被改写时抛出错误，认证通过时无返回值。
 */
export function validatePublishedMayanSnapshot(snapshot) {
  if (
    snapshot.sourceCommit !== SOURCE_COMMIT ||
    snapshot.threeVersion !== "0.180.0"
  )
    throw new Error("Published model fixture provenance mismatch");
  const closure = createHash("sha256");
  const entries = Object.keys(snapshot.sources)
    .sort()
    .map((name) => [name, snapshot.sources[name]]);
  if (entries.length !== 12)
    throw new Error("Published model dependency closure is incomplete");
  for (const [name, entry] of entries) {
    if (!/^[a-z_]+\.js$/.test(name))
      throw new Error("Invalid published fixture filename");
    const digest = createHash("sha256").update(entry.source).digest("hex");
    if (digest !== entry.sha256)
      throw new Error("Published model source integrity mismatch");
    closure.update(`${name}\0${entry.sha256}\0${entry.source}\0`);
  }
  if (closure.digest("hex") !== CLOSURE_HASH)
    throw new Error("Published model dependency integrity mismatch");
}

/**
 * 在同一 Node/Three 环境加载独立冻结源码，保持逐字节接触模型比较。
 * @returns {Promise<object>} 原工厂、来源信息和幂等临时文件清理接口。
 */
export async function loadPublishedMayan() {
  const snapshot = JSON.parse(
    readFileSync(
      new URL("../fixtures/published_mayan_v0_7_1.json", import.meta.url),
      "utf8",
    ),
  );
  validatePublishedMayanSnapshot(snapshot);
  const threePackage = JSON.parse(
    readFileSync(
      new URL("../package.json", import.meta.resolve("three")),
      "utf8",
    ),
  );
  if (threePackage.version !== snapshot.threeVersion)
    throw new Error("Published model oracle requires Three.js 0.180.0");
  const directory = mkdtempSync(join(tmpdir(), "abyssal-published-mayan-"));
  const dispose = () => rmSync(directory, { recursive: true, force: true });
  try {
    writeFileSync(join(directory, "package.json"), '{"type":"module"}\n');
    for (const [name, entry] of Object.entries(snapshot.sources)) {
      // 只改依赖定位；十二份源码的算法、原相对依赖和动作包装保持冻结。
      const source = entry.source.replace(
        /(\bfrom\s+)(["'])(three(?:\/[^"']*)?)\2/g,
        (_, prefix, quote, specifier) =>
          `${prefix}${quote}${import.meta.resolve(specifier)}${quote}`,
      );
      writeFileSync(join(directory, name), source);
    }
    const published = await import(
      pathToFileURL(join(directory, "creatures.js")).href
    );
    return {
      sourceCommit: snapshot.sourceCommit,
      sourceHashes: Object.fromEntries(
        Object.entries(snapshot.sources).map(([name, entry]) => [
          name.replace(/\.js$/, ""),
          entry.sha256,
        ]),
      ),
      createCreature(kind, length, seed) {
        if (kind !== "mayan")
          throw new Error("Published model oracle supports only mayan");
        return published.createCreature(kind, length, seed);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
