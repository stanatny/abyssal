import { readFile, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
import { nearestChain, chainWeights } from "../src/hawaii_lord_rig.js";

// 在收拢但分离的实际 HF 腕足上拟合支点；不再把放射状支点硬套到纵向腕足。
const [input, output, reportPath] = process.argv.slice(2);
if (!input || !output || !reportPath)
  throw Error(
    "Usage: fit_octopus_swim_rig.mjs mesh.json output.json report.json",
  );
const packed = JSON.parse(await readFile(input, "utf8"));
const geometry = decodeOrganicMesh(packed, null, (_x, _y, _z, color) =>
  color.set(0xb96b49),
);
const position = geometry.attributes.position,
  indices = geometry.index.array;
const canonical = [],
  ids = new Uint32Array(position.count),
  welded = new Map();
for (let i = 0; i < position.count; i++) {
  const p = new THREE.Vector3().fromBufferAttribute(position, i),
    key = p.toArray().join(",");
  if (!welded.has(key)) {
    welded.set(key, canonical.length);
    canonical.push(p);
  }
  ids[i] = welded.get(key);
}
const neck = new THREE.Vector3(0, -0.015, -0.23);
function components(cut) {
  const parent = canonical.map((_, i) => i),
    used = new Set();
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a, b) => (parent[find(a)] = find(b));
  for (let i = 0; i < indices.length; i += 3) {
    const tri = [ids[indices[i]], ids[indices[i + 1]], ids[indices[i + 2]]];
    if (tri.every((id) => canonical[id].distanceTo(neck) > cut)) {
      tri.forEach((id) => used.add(id));
      join(tri[0], tri[1]);
      join(tri[1], tri[2]);
    }
  }
  const groups = new Map();
  for (const i of used) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }
  return [...groups.values()]
    .filter(
      (a) =>
        a.length > 35 &&
        Math.max(...a.map((i) => canonical[i].distanceTo(neck))) - cut >
          0.035 &&
        a.reduce((sum, i) => sum + canonical[i].z, 0) / a.length > -0.18,
    )
    .sort((a, b) => b.length - a.length);
}
// 此源模型一只短腕卷在颈下，最外层短腕又被切成背面/吸盘两片。
// 先合并同一末端的碎片，再补人工核对的颈下卷腕支点；不能把八个碎片等同八腕。
const cut = 0.35;
const groups = components(cut);
const armRows = [];
for (const ids of groups) {
  const rows = ids.map((i) => canonical[i]),
    end = Math.max(...rows.map((p) => p.distanceTo(neck)));
  const points = [0.02, 0.32, 0.62, 0.92].map((f) => {
    const distance = cut + (end - cut) * f,
      band = Math.max(0.014, (end - cut) * 0.07);
    const candidates = rows.filter(
      (p) => Math.abs(p.distanceTo(neck) - distance) < band,
    );
    if (!candidates.length) throw Error("Missing arm support slice");
    return candidates
      .reduce((sum, p) => sum.add(p), new THREE.Vector3())
      .multiplyScalar(1 / candidates.length)
      .toArray();
  });
  if (
    armRows.some(
      (c) =>
        new THREE.Vector3(...c.points[3]).distanceTo(
          new THREE.Vector3(...points[3]),
        ) < 0.025,
    )
  )
    continue;
  armRows.push({ type: "arm", points, sourceVertices: ids.length });
}
if (armRows.length !== 7)
  throw Error(
    "Expected seven separated long-arm tips; inspect this source before fitting",
  );
// 在同一源模型的俯视/腹面核对，记录短卷腕中心线；不重塑其网格。
const shortArm = [
  [0.045, -0.08, -0.12],
  [0.1, -0.09, 0.015],
  [0.09, -0.075, 0.11],
  [0.03, -0.07, 0.125],
];
const shortArmSupportDistances = shortArm.map((p) =>
  Math.min(...canonical.map((v) => v.distanceTo(new THREE.Vector3(...p)))),
);
if (shortArmSupportDistances.some((d) => d > 0.055))
  throw Error("Annotated short-arm supports no longer fit the source surface");
armRows.push({ type: "arm", points: shortArm, annotatedShortArm: true });
armRows.forEach((c) => {
  c.angle = Math.atan2(c.points[0][1], c.points[0][0]);
});
armRows.sort((a, b) => a.angle - b.angle);
const audit = {
  cut,
  rawSurfaceComponents: groups.length,
  distinctLongArmTips: 7,
  annotatedShortArm: true,
  shortArmSupportDistances,
};
const chains = armRows.map((c, i) => ({
  ...c,
  name: `arm_${i + 1}`,
  index: i,
  ids: [1, 2, 3, 4].map((j) => i * 4 + j),
}));
const mantlePoints = [];
for (let i = 0; i < position.count; i++)
  if (position.getZ(i) < -0.3)
    mantlePoints.push(new THREE.Vector3().fromBufferAttribute(position, i));
const mantle = mantlePoints
  .reduce((s, p) => s.add(p), new THREE.Vector3())
  .multiplyScalar(1 / mantlePoints.length);
chains.push({
  name: "mantle",
  type: "mantle",
  points: [mantle.toArray()],
  ids: [33],
});
const skinIndex = new Uint16Array(position.count * 4),
  skinWeight = new Uint16Array(position.count * 4),
  weights = new Float32Array(4),
  point = new THREE.Vector3();
const smooth = (a, b, v) => THREE.MathUtils.smoothstep(v, a, b);
for (let i = 0; i < position.count; i++) {
  point.fromBufferAttribute(position, i);
  weights.fill(0);
  const localIds = new Uint16Array(4);
  let closest = chains[0],
    distance = Infinity;
  for (const c of chains.slice(0, 8)) {
    const d = nearestChain(point, c).distance;
    if (d < distance) {
      distance = d;
      closest = c;
    }
  }
  const blend = smooth(cut - 0.06, cut + 0.025, point.distanceTo(neck));
  chainWeights(closest, point, blend, localIds, weights, 0);
  const breath = 1 - smooth(-0.35, -0.21, point.z);
  for (let j = 0; j < 3; j++) weights[j] *= 1 - breath;
  weights[3] = breath;
  localIds[3] = 33;
  skinIndex.set(localIds, i * 4);
  let sum = 0;
  for (let j = 0; j < 3; j++) {
    const w = Math.floor(weights[j] * 65535);
    skinWeight[i * 4 + j] = w;
    sum += w;
  }
  skinWeight[i * 4 + 3] = 65535 - sum;
}
const encode = (a) =>
  Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
const result = {
  ...packed,
  skinIndex: encode(skinIndex),
  skinWeight: encode(skinWeight),
  swimChains: chains.map(({ ids, ...c }) => c),
  swimRigRevision: "octopus-jet-20261020",
};
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
await writeFile(
  reportPath,
  JSON.stringify(
    {
      passed: true,
      cut,
      anatomy: result.swimChains,
      audit,
      weldedVertices: canonical.length,
      vertices: position.count,
      triangles: indices.length / 3,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    cut,
    armChains: 8,
    vertices: position.count,
    triangles: indices.length / 3,
  }),
);
