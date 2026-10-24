/** 离线按礁拱 XY 轮廓合并接触格；开洞留空，Z 厚度来自对应三角面。 */
import * as T from "three";
import { readFile, writeFile } from "node:fs/promises";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
const packed = JSON.parse(await readFile(process.argv[2], "utf8"));
const g = decodeOrganicMesh(packed, null, (_x, _y, _z, c) => c.set(0x777777));
const p = g.attributes.position,
  idx = g.index,
  bb = g.boundingBox;
const scale = 80 / (bb.max.x - bb.min.x),
  cell = 2.5,
  occupied = new Map();
const tri = new T.Triangle(),
  box = new T.Box3();
const shift = new T.Vector3(
  (bb.max.x + bb.min.x) / 2,
  bb.min.y,
  (bb.max.z + bb.min.z) / 2,
);
for (let i = 0; i < idx.count; i += 3) {
  for (const [v, j] of [
    [tri.a, i],
    [tri.b, i + 1],
    [tri.c, i + 2],
  ])
    v.fromBufferAttribute(p, idx.getX(j)).sub(shift).multiplyScalar(scale);
  const lo = tri.a.clone().min(tri.b).min(tri.c),
    hi = tri.a.clone().max(tri.b).max(tri.c);
  for (let x = Math.floor(lo.x / cell); x <= Math.floor(hi.x / cell); x++)
    for (let y = Math.floor(lo.y / cell); y <= Math.floor(hi.y / cell); y++) {
      box.min.set(x * cell, y * cell, -100);
      box.max.set((x + 1) * cell, (y + 1) * cell, 100);
      if (!box.intersectsTriangle(tri)) continue;
      const key = `${x},${y}`,
        row = occupied.get(key) || [Infinity, -Infinity];
      row[0] = Math.min(row[0], lo.z);
      row[1] = Math.max(row[1], hi.z);
      occupied.set(key, row);
    }
}
const count = occupied.size,
  boxes = [];
for (const key of [...occupied.keys()].sort()) {
  if (!occupied.has(key)) continue;
  const [x, y] = key.split(",").map(Number);
  let nx = 1,
    ny = 1;
  while (nx < 2 && occupied.has(`${x + nx},${y}`)) nx++;
  outer: while (true) {
    for (let i = 0; i < nx; i++)
      if (!occupied.has(`${x + i},${y + ny}`)) break outer;
    ny++;
  }
  let z0 = Infinity,
    z1 = -Infinity;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < ny; j++) {
      const k = `${x + i},${y + j}`,
        r = occupied.get(k);
      z0 = Math.min(z0, r[0]);
      z1 = Math.max(z1, r[1]);
      occupied.delete(k);
    }
  boxes.push({
    center: [(x + nx / 2) * cell, (y + ny / 2) * cell, (z0 + z1) / 2],
    size: [nx * cell, ny * cell, z1 - z0],
  });
}
await writeFile(
  process.argv[3],
  JSON.stringify(
    { sourceSha256: packed.sourceSha256, width: 80, cell, count, boxes },
    null,
    2,
  ) + "\n",
);
console.log({ cell, count, boxes: boxes.length });
g.dispose();
