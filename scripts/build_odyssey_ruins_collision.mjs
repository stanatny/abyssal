/** 离线以实际三角面生成表面体素，合并相邻实心格；不填满船舱和破口。 */
import * as THREE from "three";
import { readFile, writeFile } from "node:fs/promises";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
const [input, output] = process.argv.slice(2);
const packed = JSON.parse(await readFile(input, "utf8"));
const g = decodeOrganicMesh(packed, null, (_x, _y, _z, c) => c.set(0xaaaaaa));
const p = g.attributes.position,
  idx = g.index;
const cell = packed.kind === "odyssey_column" ? 1 / 80 : 1 / 75;
const tri = new THREE.Triangle(),
  bounds = new THREE.Box3(),
  box = new THREE.Box3();
const occupied = new Set(),
  key = (x, y, z) => `${x},${y},${z}`;
for (let i = 0; i < idx.count; i += 3) {
  tri.a.fromBufferAttribute(p, idx.getX(i));
  tri.b.fromBufferAttribute(p, idx.getX(i + 1));
  tri.c.fromBufferAttribute(p, idx.getX(i + 2));
  bounds.setFromPoints([tri.a, tri.b, tri.c]);
  for (
    let x = Math.floor(bounds.min.x / cell);
    x <= Math.floor(bounds.max.x / cell);
    x++
  )
    for (
      let y = Math.floor(bounds.min.y / cell);
      y <= Math.floor(bounds.max.y / cell);
      y++
    )
      for (
        let z = Math.floor(bounds.min.z / cell);
        z <= Math.floor(bounds.max.z / cell);
        z++
      ) {
        box.min.set(x * cell, y * cell, z * cell);
        box.max.copy(box.min).addScalar(cell);
        if (box.intersectsTriangle(tri)) occupied.add(key(x, y, z));
      }
}
const voxels = occupied.size,
  boxes = [];
while (occupied.size) {
  const [x, y, z] = occupied.values().next().value.split(",").map(Number);
  let nx = 1,
    ny = 1,
    nz = 1;
  while (occupied.has(key(x + nx, y, z))) nx++;
  const layerY = () => {
    for (let a = 0; a < nx; a++)
      if (!occupied.has(key(x + a, y + ny, z))) return false;
    return true;
  };
  while (layerY()) ny++;
  const layerZ = () => {
    for (let a = 0; a < nx; a++)
      for (let b = 0; b < ny; b++)
        if (!occupied.has(key(x + a, y + b, z + nz))) return false;
    return true;
  };
  while (layerZ()) nz++;
  for (let a = 0; a < nx; a++)
    for (let b = 0; b < ny; b++)
      for (let c = 0; c < nz; c++) occupied.delete(key(x + a, y + b, z + c));
  boxes.push(
    [
      (x + nx / 2) * cell,
      (y + ny / 2) * cell,
      (z + nz / 2) * cell,
      (nx * cell) / 2,
      (ny * cell) / 2,
      (nz * cell) / 2,
    ].map((v) => +v.toFixed(7)),
  );
}
await writeFile(
  output,
  JSON.stringify({
    kind: packed.kind,
    sourceSha256: packed.sourceSha256,
    cell,
    voxels,
    boxes,
  }) + "\n",
);
console.log({ kind: packed.kind, cell, voxels, boxes: boxes.length });
g.dispose();
