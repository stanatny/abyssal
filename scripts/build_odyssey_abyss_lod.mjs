/** 离线为断崖和航海残碑生成远景索引，沿用近景位置与源顶点色，不增加贴图。 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
const [file, tools] = process.argv.slice(2);
const require = createRequire(join(resolve(tools), "package.json"));
const { MeshoptSimplifier } = await import(require.resolve("meshoptimizer"));
await MeshoptSimplifier.ready;
const d = JSON.parse(await readFile(file, "utf8"));
const decode = (s, Type) =>
  new Type(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const q = decode(d.position, Uint16Array),
  src = decode(d.index, Uint16Array);
const keys = new Map(),
  positions = [],
  original = [],
  weld = [];
for (let i = 0; i < d.vertices; i++) {
  const key = `${q[i * 3]}_${q[i * 3 + 1]}_${q[i * 3 + 2]}`;
  if (!keys.has(key)) {
    keys.set(key, original.length);
    original.push(i);
    for (let a = 0; a < 3; a++)
      positions.push(d.min[a] + (q[i * 3 + a] / 65535) * (d.max[a] - d.min[a]));
  }
  weld.push(keys.get(key));
}
if (!["odyssey_crag", "odyssey_memorial"].includes(d.kind))
  throw Error("Expected Odyssey ruin");
const target = d.kind === "odyssey_crag" ? 2000 : 2000;
const [far, error] = MeshoptSimplifier.simplify(
  Uint32Array.from(src, (i) => weld[i]),
  new Float32Array(positions),
  3,
  target * 3,
  0.015,
  ["LockBorder"],
);
const index = Uint16Array.from(far, (i) => original[i]);
d.farIndex = Buffer.from(index.buffer).toString("base64");
// 远景三角面已改变，不能继续使用近景细褶皱法线；按焊接位置重新累加。
const sums = new Float64Array(positions.length);
for (let i = 0; i < far.length; i += 3) {
  const a = far[i] * 3,
    b = far[i + 1] * 3,
    c = far[i + 2] * 3;
  const ux = positions[b] - positions[a],
    uy = positions[b + 1] - positions[a + 1],
    uz = positions[b + 2] - positions[a + 2];
  const vx = positions[c] - positions[a],
    vy = positions[c + 1] - positions[a + 1],
    vz = positions[c + 2] - positions[a + 2];
  const normal = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  for (const id of [a, b, c])
    for (let axis = 0; axis < 3; axis++) sums[id + axis] += normal[axis];
}
const normals = new Int16Array(q.length),
  sourceNormal = decode(d.normal, Int16Array);
for (let i = 0; i < d.vertices; i++) {
  const id = weld[i] * 3,
    length = Math.hypot(sums[id], sums[id + 1], sums[id + 2]);
  // 细枝的相反面可能相互抵消，零法线会污染 bloom；退回同点的有效近景法线。
  const fallbackLength = Math.hypot(...sourceNormal.subarray(i * 3, i * 3 + 3));
  for (let axis = 0; axis < 3; axis++)
    normals[i * 3 + axis] = Math.round(
      (length > 1e-12
        ? sums[id + axis] / length
        : fallbackLength > 0
          ? sourceNormal[i * 3 + axis] / fallbackLength
          : Number(axis === 1)) * 32767,
    );
}
d.farNormal = Buffer.from(normals.buffer).toString("base64");
d.farTriangles = index.length / 3;
d.farError = error;
await writeFile(file, JSON.stringify(d) + "\n");
console.log({ kind: d.kind, near: d.triangles, far: d.farTriangles, error });
