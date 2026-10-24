/** 离线按船壳表面占据的格子合并接触盒；中空货舱和大破口保留为空。 */
import * as T from "three";
import { writeFile } from "node:fs/promises";
import { acquireBermudaCargoAsset } from "../src/bermuda_cargo_asset.js";
const a = acquireBermudaCargoAsset(),
  g = a.geometry,
  p = g.attributes.position,
  idx = g.index;
const cell = 2.5,
  occupied = new Set(),
  tri = new T.Triangle(),
  box = new T.Box3(),
  lo = new T.Vector3(),
  hi = new T.Vector3();
for (let i = 0; i < idx.count; i += 3) {
  tri.a.fromBufferAttribute(p, idx.getX(i)).multiplyScalar(57);
  tri.b.fromBufferAttribute(p, idx.getX(i + 1)).multiplyScalar(57);
  tri.c.fromBufferAttribute(p, idx.getX(i + 2)).multiplyScalar(57);
  lo.copy(tri.a).min(tri.b).min(tri.c).divideScalar(cell).floor();
  hi.copy(tri.a).max(tri.b).max(tri.c).divideScalar(cell).floor();
  for (let x = lo.x; x <= hi.x; x++)
    for (let y = lo.y; y <= hi.y; y++)
      for (let z = lo.z; z <= hi.z; z++) {
        const key = [x, y, z].join(",");
        if (occupied.has(key)) continue;
        box.min.set(x * cell, y * cell, z * cell);
        box.max.copy(box.min).addScalar(cell);
        if (box.intersectsTriangle(tri)) occupied.add(key);
      }
}
const count = occupied.size,
  boxes = [];
for (const key of [...occupied].sort()) {
  if (!occupied.has(key)) continue;
  const [x, y, z] = key.split(",").map(Number);
  let nx = 1,
    ny = 1,
    nz = 1;
  while (occupied.has([x + nx, y, z].join(","))) nx++;
  outer: while (true) {
    for (let i = 0; i < nx; i++)
      if (!occupied.has([x + i, y, z + nz].join(","))) break outer;
    nz++;
  }
  outer: while (true) {
    for (let i = 0; i < nx; i++)
      for (let k = 0; k < nz; k++)
        if (!occupied.has([x + i, y + ny, z + k].join(","))) break outer;
    ny++;
  }
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++)
      for (let k = 0; k < nz; k++)
        occupied.delete([x + i, y + j, z + k].join(","));
  boxes.push({
    center: [(x + nx / 2) * cell, (y + ny / 2) * cell, (z + nz / 2) * cell],
    size: [nx * cell, ny * cell, nz * cell],
  });
}
await writeFile(
  "src/assets/models/bermuda_cargo_contacts.json",
  JSON.stringify(
    { source: "bermuda_cargo_hf_mesh.json", length: 57, cell, count, boxes },
    null,
    2,
  ),
);
console.log({ cell, count, boxes: boxes.length });
a.release();
