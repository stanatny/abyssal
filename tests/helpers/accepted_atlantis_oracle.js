import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_COMMIT = "329210459a939d979412d81a7b7fe0c928711545";
const CLOSURE_HASH =
  "ce5ab5d6c12b732933c50607e98228cdd4225a5dc073b3b18d3dccf0b5d3fee4";

/**
 * 验证冻结发布源码，禁止重新生成预期时意外引用当前古城实现。
 * @param {object} snapshot 原提交、Three 版本及完整源码依赖闭包。
 * @returns {void} 来源或源码被改写时抛出错误，认证通过时无返回值。
 */
export function validateAcceptedAtlantisSnapshot(snapshot) {
  if (
    snapshot.sourceCommit !== SOURCE_COMMIT ||
    snapshot.threeVersion !== "0.180.0"
  )
    throw new Error("Accepted Atlantis fixture provenance mismatch");
  const closure = createHash("sha256");
  const entries = Object.keys(snapshot.sources)
    .sort()
    .map((name) => [name, snapshot.sources[name]]);
  if (entries.length !== 46)
    throw new Error("Accepted Atlantis dependency closure is incomplete");
  for (const [name, entry] of entries) {
    if (!/^[a-z0-9_]+(?:\/[a-z0-9_]+)*\.js$/.test(name))
      throw new Error("Invalid published fixture filename");
    const digest = createHash("sha256").update(entry.source).digest("hex");
    if (digest !== entry.sha256)
      throw new Error("Accepted Atlantis source integrity mismatch");
    closure.update(`${name}\0${entry.sha256}\0${entry.source}\0`);
  }
  if (closure.digest("hex") !== CLOSURE_HASH)
    throw new Error("Accepted Atlantis dependency integrity mismatch");
}

/**
 * 在同一 Node/Three 环境加载独立冻结源码，保持逐字节接触古城比较。
 * @returns {Promise<object>} 原工厂、来源信息和幂等临时文件清理接口。
 */
export async function loadAcceptedAtlantis() {
  const snapshot = JSON.parse(
    readFileSync(
      new URL(
        "../fixtures/accepted_atlantis_v0_8_0_base.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  validateAcceptedAtlantisSnapshot(snapshot);
  const threePackage = JSON.parse(
    readFileSync(
      new URL("../package.json", import.meta.resolve("three")),
      "utf8",
    ),
  );
  if (threePackage.version !== snapshot.threeVersion)
    throw new Error("Accepted Atlantis oracle requires Three.js 0.180.0");
  const directory = mkdtempSync(join(tmpdir(), "abyssal-accepted-atlantis-"));
  const dispose = () => rmSync(directory, { recursive: true, force: true });
  try {
    writeFileSync(join(directory, "package.json"), '{"type":"module"}\n');
    for (const [name, entry] of Object.entries(snapshot.sources)) {
      // 只改 Three 依赖定位；完整46份基线源码与原相对依赖保持冻结。
      const source = entry.source.replace(
        /(\bfrom\s+)(["'])(three(?:\/[^"']*)?)\2/g,
        (_, prefix, quote, specifier) =>
          `${prefix}${quote}${import.meta.resolve(specifier)}${quote}`,
      );
      mkdirSync(dirname(join(directory, name)), { recursive: true });
      writeFileSync(join(directory, name), source);
    }
    const published = await import(
      pathToFileURL(join(directory, "atlantis_ocean.js")).href
    );
    return {
      sourceCommit: snapshot.sourceCommit,
      sourceHashes: Object.fromEntries(
        Object.entries(snapshot.sources).map(([name, entry]) => [
          name.replace(/\.js$/, ""),
          entry.sha256,
        ]),
      ),
      createOcean: published.createAtlantisOcean,
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
