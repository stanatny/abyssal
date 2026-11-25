/** 按独眼巨人真实闭合体表减面，生成轻量内部截面；保留所有其他物种记录。 */
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { createCreature } from "../src/creatures.js";
import { closedCreatureExterior } from "./lib/closed_creature_exterior.mjs";
import { creatureGeometryKey } from "../src/creature_interior_key.js";

const tools = process.argv[2];
if (!tools)
  throw Error(
    "Usage: prepare_polyphemus_interior.mjs tools-directory [output-topology.json]",
  );
const path =
  process.argv[3] ?? "src/assets/models/creature_interior_topology.json";
const records = JSON.parse(
  await readFile("src/assets/models/creature_interior_topology.json", "utf8"),
);
const require = createRequire(join(resolve(tools), "package.json"));
const { MeshoptSimplifier } = await import(require.resolve("meshoptimizer"));
await MeshoptSimplifier.ready;
const root = createCreature("polyphemus", 20);
const source = root.userData.hfRig.mesh.geometry;
const key = creatureGeometryKey(source),
  cap = closedCreatureExterior(source);
if (!cap) throw Error("The actual Polyphemus source has no closed exterior");
const p = source.attributes.position;
const canonical = new Map(),
  vertices = [],
  sourceIds = [],
  ids = new Map();
for (const id of cap.index.array) {
  const xyz = [p.getX(id), p.getY(id), p.getZ(id)],
    coordinate = xyz.join(",");
  if (!canonical.has(coordinate)) {
    canonical.set(coordinate, vertices.length / 3);
    vertices.push(...xyz);
    sourceIds.push(id);
  }
  ids.set(id, canonical.get(coordinate));
}
const originalIndices = Uint32Array.from(cap.index.array, (id) => ids.get(id));
const [reduced, error] = MeshoptSimplifier.simplify(
  originalIndices,
  new Float32Array(vertices),
  3,
  4000 * 3,
  0.02,
  ["LockBorder"],
);
if (reduced.length > 12000)
  throw Error("Polyphemus interior exceeds its 4000-face budget");
// 约简后的每条有向边必须相互抵消；不能用一层未闭合的图像或凸球冒充真实内壳。
const edges = new Map();
for (let i = 0; i < reduced.length; i += 3)
  for (let j = 0; j < 3; j++) {
    const a = reduced[i + j],
      b = reduced[i + ((j + 1) % 3)];
    if (a === b) continue;
    const edge = a < b ? `${a},${b}` : `${b},${a}`;
    edges.set(edge, (edges.get(edge) || 0) + (a < b ? 1 : -1));
  }
if ([...edges.values()].some((balance) => balance !== 0))
  throw Error("Polyphemus reduced interior has an oriented boundary");
const compact = new Map(),
  compactPositions = [],
  nearest = [];
const index = Uint16Array.from(reduced, (id) => {
  if (!compact.has(id)) {
    compact.set(id, compact.size);
    compactPositions.push(...vertices.slice(id * 3, id * 3 + 3));
    nearest.push(sourceIds[id]);
  }
  return compact.get(id);
});
const low = [Infinity, Infinity, Infinity],
  high = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < compactPositions.length; i++) {
  low[i % 3] = Math.min(low[i % 3], compactPositions[i]);
  high[i % 3] = Math.max(high[i % 3], compactPositions[i]);
}
const span = high.map((v, i) => Math.max(1e-9, v - low[i]));
const position = Uint16Array.from(compactPositions, (v, i) =>
  Math.round(((v - low[i % 3]) / span[i % 3]) * 65535),
);
const b64 = (values) =>
  Buffer.from(values.buffer, values.byteOffset, values.byteLength).toString(
    "base64",
  );
records[key] = {
  position: b64(position),
  index: b64(index),
  nearest: b64(new Uint16Array(nearest)),
  low,
  span,
};
await writeFile(path, JSON.stringify(records) + "\n");
console.log(
  JSON.stringify({
    key,
    sourceTriangles: source.index.count / 3,
    closedSourceTriangles: cap.index.count / 3,
    interiorTriangles: index.length / 3,
    interiorVertices: nearest.length,
    simplificationError: error,
    records: Object.keys(records).length,
  }),
);
cap.dispose();
root.userData.disposeLocalMotion?.();
