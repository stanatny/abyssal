import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";

// 仅允许调用方点名的浮点字段有误差；ID、顺序、形状和其余所有值仍严格对账。
export function assertNumericReference(
  actual,
  expected,
  { label = "numeric reference", toleranceFor = () => 0 } = {},
) {
  const report = {
    numbers: 0,
    toleratedDifferences: 0,
    maxAbsoluteDifference: 0,
    maxDifferencePath: null,
  };
  function compare(a, b, path) {
    const where = `${label}${path}`;
    assert.equal(typeof a, typeof b, `${where}: value type`);
    if (typeof b === "number") {
      assert.ok(
        Number.isFinite(a) && Number.isFinite(b),
        `${where}: finite number`,
      );
      const difference = Math.abs(a - b),
        tolerance = toleranceFor(path, b, a);
      assert.ok(
        Number.isFinite(tolerance) && tolerance >= 0,
        `${where}: explicit tolerance`,
      );
      report.numbers++;
      if (difference > 0) report.toleratedDifferences++;
      if (difference > report.maxAbsoluteDifference) {
        report.maxAbsoluteDifference = difference;
        report.maxDifferencePath = path;
      }
      assert.ok(
        difference <= tolerance,
        `${where}: ${a} differs from ${b} by ${difference} (limit ${tolerance})`,
      );
    } else if (Array.isArray(b)) {
      assert.ok(Array.isArray(a), `${where}: array type`);
      assert.equal(a.length, b.length, `${where}: array length`);
      for (let i = 0; i < b.length; i++) compare(a[i], b[i], `${path}/${i}`);
    } else if (b !== null && typeof b === "object") {
      assert.ok(a !== null && !Array.isArray(a), `${where}: object type`);
      const keys = Object.keys(b)
        .filter((key) => b[key] !== undefined)
        .sort();
      assert.deepEqual(
        Object.keys(a)
          .filter((key) => a[key] !== undefined)
          .sort(),
        keys,
        `${where}: object keys`,
      );
      for (const key of keys) compare(a[key], b[key], `${path}/${key}`);
    } else assert.equal(a, b, `${where}: exact value`);
  }
  compare(actual, expected, "");
  return report;
}

// 保留所有实体字段及完整变换，向量/四元数使用稳定的数值数组，不保存实例私有字段。
export function normalizeColliderReference(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value) || ArrayBuffer.isView(value))
    return Array.from(value, normalizeColliderReference);
  if (value.isVector3 || value.isQuaternion || value.isMatrix4)
    return value.toArray();
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter(
        (key) => value[key] !== undefined && typeof value[key] !== "function",
      )
      .map((key) => [key, normalizeColliderReference(value[key])]),
  );
}

export function decodeNumericReference(reference) {
  assert.equal(reference.encoding, "gzip+base64+json");
  return JSON.parse(
    gunzipSync(Buffer.from(reference.data, "base64")).toString("utf8"),
  );
}

// 坐标/实体尺寸最大0.2毫米；方向与矩阵基向量更严，齐次分量和索引仍要求完全相等。
export function bermudaGeometryTolerance(path) {
  const matrix = path.match(/\/matrix\/(\d+)$/);
  if (matrix) {
    const index = Number(matrix[1]);
    if ([3, 7, 11, 15].includes(index)) return 0;
    return [12, 13, 14].includes(index) ? 0.0002 : 1e-9;
  }
  if (/\/rotation\/\d+$/.test(path)) return 1e-9;
  if (
    /\/(?:x|y|z|radius)$/.test(path) ||
    /\/(?:position|positions|halfSize|axes)\/\d+$/.test(path)
  )
    return 0.0002;
  return 0;
}
