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

const SOURCE_COMMIT = "f2adc3194ad445d3b0984cacaac0b29e2a54d540";
const CLOSURE_HASH =
  "ba33b624c47b1d6eecce3ea4c2bceea991c882fa29579730af0fb9419e2b5f4a";

/**
 * 验证冻结发布源码，禁止重新生成预期时意外引用当前海沟实现。
 * @param {object} snapshot 原提交、Three 版本及完整源码依赖闭包。
 * @returns {void} 来源或源码被改写时抛出错误，认证通过时无返回值。
 */
export function validateAcceptedMarianaSnapshot(snapshot) {
  if (
    snapshot.sourceCommit !== SOURCE_COMMIT ||
    snapshot.threeVersion !== "0.180.0"
  )
    throw new Error("Accepted Mariana fixture provenance mismatch");
  const closure = createHash("sha256");
  const entries = Object.keys(snapshot.sources)
    .sort()
    .map((name) => [name, snapshot.sources[name]]);
  if (entries.length !== 16)
    throw new Error("Accepted Mariana dependency closure is incomplete");
  for (const [name, entry] of entries) {
    if (!/^[a-z0-9_]+(?:\/[a-z0-9_]+)*\.js$/.test(name))
      throw new Error("Invalid published fixture filename");
    const digest = createHash("sha256").update(entry.source).digest("hex");
    if (digest !== entry.sha256)
      throw new Error("Accepted Mariana source integrity mismatch");
    closure.update(`${name}\0${entry.sha256}\0${entry.source}\0`);
  }
  if (closure.digest("hex") !== CLOSURE_HASH)
    throw new Error("Accepted Mariana dependency integrity mismatch");
}

/**
 * 在同一 Node/Three 环境加载独立冻结源码，保持逐字节接触海沟比较。
 * @returns {Promise<object>} 原工厂、来源信息和幂等临时文件清理接口。
 */
export async function loadAcceptedMariana() {
  const snapshot = JSON.parse(
    readFileSync(
      new URL("../fixtures/accepted_mariana_v0_11_5.json", import.meta.url),
      "utf8",
    ),
  );
  validateAcceptedMarianaSnapshot(snapshot);
  const threePackage = JSON.parse(
    readFileSync(
      new URL("../package.json", import.meta.resolve("three")),
      "utf8",
    ),
  );
  if (threePackage.version !== snapshot.threeVersion)
    throw new Error("Accepted Mariana oracle requires Three.js 0.180.0");
  const directory = mkdtempSync(join(tmpdir(), "abyssal-accepted-mariana-"));
  const dispose = () => rmSync(directory, { recursive: true, force: true });
  try {
    writeFileSync(join(directory, "package.json"), '{"type":"module"}\n');
    for (const [name, entry] of Object.entries(snapshot.sources)) {
      // 只改 Three 依赖定位；完整16份基线源码与原相对依赖保持冻结。
      const source = entry.source.replace(
        /(\bfrom\s+)(["'])(three(?:\/[^"']*)?)\2/g,
        (_, prefix, quote, specifier) =>
          `${prefix}${quote}${import.meta.resolve(specifier)}${quote}`,
      );
      mkdirSync(dirname(join(directory, name)), { recursive: true });
      writeFileSync(join(directory, name), source);
    }
    const published = await import(
      pathToFileURL(join(directory, "mariana_ocean.js")).href
    );
    return {
      sourceCommit: snapshot.sourceCommit,
      sourceHashes: Object.fromEntries(
        Object.entries(snapshot.sources).map(([name, entry]) => [
          name.replace(/\.js$/, ""),
          entry.sha256,
        ]),
      ),
      createOcean: published.createMarianaOcean,
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
