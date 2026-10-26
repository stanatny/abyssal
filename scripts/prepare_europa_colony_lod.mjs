/** Reduce only indices after atlas baking, sharing the exact near surface/UV buffers. */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
const [file, tools] = process.argv.slice(2);
const require = createRequire(resolve(tools, "package.json"));
const { MeshoptSimplifier } = await import(require.resolve("meshoptimizer"));
await MeshoptSimplifier.ready;
const d = JSON.parse(await readFile(file));
const decode = (s, T) =>
  new T(Uint8Array.from(Buffer.from(s, "base64")).buffer);
const q = decode(d.position, Uint16Array),
  p = new Float32Array(q.length);
for (let i = 0; i < q.length; i++)
  p[i] = d.min[i % 3] + (q[i] / 65535) * (d.max[i % 3] - d.min[i % 3]);
const [index, error] = MeshoptSimplifier.simplify(
  new Uint32Array(decode(d.index, Uint16Array)),
  p,
  3,
  (d.kind === "europa_fan" ? 380 : 480) * 3,
  0.065,
  ["Permissive"],
);
d.lodIndex = Buffer.from(new Uint16Array(index).buffer).toString("base64");
d.lodTriangles = index.length / 3;
d.lodError = error;
await writeFile(file, JSON.stringify(d) + "\n");
console.log({ kind: d.kind, near: d.triangles, far: d.lodTriangles, error });
