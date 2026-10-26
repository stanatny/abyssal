/** Bake surface-connected skin weights offline; UV seams share one influence set. */
import { readFile, writeFile } from "node:fs/promises";
import { createCreature } from "../src/creatures.js";
for (const kind of process.argv.slice(2)) {
  const file = `src/assets/models/${kind}_hf_mesh.json`,
    d = JSON.parse(await readFile(file));
  if (d.skinIndex) throw Error("Start from the unbound converted source");
  const m = createCreature(kind, 1, 31),
    g = m.userData.hfRig.mesh.geometry,
    p = g.attributes.position,
    ids = g.attributes.skinIndex.array,
    w = g.attributes.skinWeight.array;
  const canonical = [],
    keys = new Map(),
    vertices = [];
  for (let i = 0; i < p.count; i++) {
    const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
    if (!keys.has(key)) {
      keys.set(key, vertices.length);
      vertices.push(i);
    }
    canonical.push(keys.get(key));
  }
  const links = vertices.map(() => new Set());
  for (let i = 0; i < g.index.count; i += 3)
    for (let a = 0; a < 3; a++) {
      const x = canonical[g.index.array[i + a]],
        y = canonical[g.index.array[i + ((a + 1) % 3)]];
      links[x].add(y);
      links[y].add(x);
    }
  let values = vertices.map((i) => {
    const a = new Map();
    for (let j = 0; j < 4; j++)
      a.set(ids[i * 4 + j], (a.get(ids[i * 4 + j]) || 0) + w[i * 4 + j]);
    return a;
  });
  // Crown uses a continuous axial field. Diffusing and then truncating the
  // angular weights breaks the axial interpolation and creases neighbouring
  // vertices when the travelling bend grows visible. Preserve its analytic
  // weights; the other anatomical rigs still need surface diffusion.
  for (let pass = 0; pass < (kind === "crown_filterer" ? 0 : 16); pass++)
    values = values.map((v, i) => {
      const a = new Map([...v].map(([id, w]) => [id, w * 0.4]));
      for (const n of links[i])
        for (const [id, w] of values[n])
          a.set(id, (a.get(id) || 0) + (w * 0.6) / links[i].size);
      return a;
    });
  for (let i = 0; i < p.count; i++) {
    const top = [...values[canonical[i]]]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4),
      total = top.reduce((a, b) => a + b[1], 0);
    for (let j = 0; j < 4; j++) {
      ids[i * 4 + j] = top[j]?.[0] || 0;
      w[i * 4 + j] = (top[j]?.[1] || 0) / total;
    }
  }
  const quant = new Uint16Array(w.length);
  for (let i = 0; i < p.count; i++) {
    let sum = 0,
      max = 0;
    for (let j = 0; j < 4; j++) {
      quant[i * 4 + j] = Math.round(w[i * 4 + j] * 65535);
      sum += quant[i * 4 + j];
      if (quant[i * 4 + j] > quant[i * 4 + max]) max = j;
    }
    quant[i * 4 + max] += 65535 - sum;
  }
  d.skinIndex = Buffer.from(ids.buffer).toString("base64");
  d.skinWeight = Buffer.from(quant.buffer).toString("base64");
  d.binding = {
    method:
      kind === "crown_filterer"
        ? "continuous angular/axial interpolation; matched UV seams"
        : "surface adjacency diffusion; matched UV seams; 16 offline passes",
    bones: m.userData.hfRig.bones.map((b) => b.name),
  };
  await writeFile(file, JSON.stringify(d) + "\n");
  m.userData.disposeLocalMotion();
  console.log(kind, p.count, vertices.length);
}
