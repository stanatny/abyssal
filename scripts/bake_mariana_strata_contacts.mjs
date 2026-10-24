/** 按原始地貌表面离线拟合接触单元，岩窟开口保持为空；不在进图时扫描三角形。 */
import * as T from "three";
import { readFile, writeFile } from "node:fs/promises";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
const result = {};
for (const [kind, prefix] of Object.entries({
  hydra: "hydra_chimneys",
  kraken: "kraken_grotto",
  maja: "maja_ribs",
  leviathan: "leviathan_folds",
})) {
  const packed = JSON.parse(
    await readFile(`src/assets/models/${prefix}_hf_mesh.json`, "utf8"),
  );
  const g = decodeOrganicMesh(packed, null, (_x, _y, _z, c) => c.set(0xffffff)),
    p = g.attributes.position,
    idx = g.index;
  const cell = 0.1,
    occupied = new Set(),
    tri = new T.Triangle(),
    box = new T.Box3(),
    lo = new T.Vector3(),
    hi = new T.Vector3();
  for (let i = 0; i < idx.count; i += 3) {
    tri.a.fromBufferAttribute(p, idx.getX(i));
    tri.b.fromBufferAttribute(p, idx.getX(i + 1));
    tri.c.fromBufferAttribute(p, idx.getX(i + 2));
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
  result[kind] = {
    source: `${prefix}_hf_mesh.json`,
    sourceSha256: packed.sourceSha256,
    cell,
    count,
    boxes,
  };
  console.log(kind, { count, boxes: boxes.length });
  g.dispose();
}
await writeFile(
  "src/assets/models/mariana_strata_contacts.json",
  JSON.stringify(result) + "\n",
);
