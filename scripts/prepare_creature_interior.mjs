/** 离线提取生物截面；可见皮肤、碰撞、骨骼和世界行为不变。 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createCreature } from "../src/creatures.js";
import { ALL_SPECIES } from "../src/region_ecology.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { closedCreatureExterior } from "./lib/closed_creature_exterior.mjs";
import { creatureGeometryKey } from "../src/creature_interior_key.js";

const kinds = [
  ...new Set([
    ...ALL_SPECIES.filter((s) => s.length >= 8 || s.predator).map(
      (s) => s.kind,
    ),
    ...BOSS_SPECIES.map((s) => s.kind),
  ]),
];
if (process.argv[2] === "--export") {
  const dir = process.argv[3];
  if (!dir) throw new Error("Provide an export directory");
  await mkdir(dir, { recursive: true });
  const manifest = [];
  for (const kind of kinds) {
    const root = createCreature(kind, 20),
      meshes = [];
    root.traverse((m) => {
      if (m.isSkinnedMesh && m.name.includes("_hf_") && m.geometry.index)
        meshes.push(m);
    });
    for (const mesh of meshes) {
      manifest.push(`${kind}.json`);
      const g = mesh.geometry;
      await writeFile(
        `${dir}/${kind}.json`,
        JSON.stringify({
          key: creatureGeometryKey(g),
          positions: Array.from(g.attributes.position.array),
          indices: Array.from(g.index.array),
        }),
      );
    }
    root.userData.disposeLocalMotion?.();
  }
  await writeFile(`${dir}/manifest.json`, JSON.stringify(manifest));
  process.exit(0);
}
if (!process.argv[2])
  throw new Error(
    "Provide the generated hulls.json file; see docs/creature_interior_revision.md",
  );
const hf = JSON.parse(await readFile(process.argv[2], "utf8"));
const records = { ...hf },
  seen = new Set(),
  audit = [];
for (const kind of kinds) {
  const root = createCreature(kind, 20),
    used = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.userData.noShadow) return;
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    if (materials.some((m) => m.transparent || m.opacity < 0.99)) return;
    const key = creatureGeometryKey(mesh.geometry);
    if (!seen.has(key) && !records[key]) {
      const cap = closedCreatureExterior(mesh.geometry);
      if (cap) {
        const count =
            (mesh.geometry.index?.count ??
              mesh.geometry.attributes.position.count) / 3,
          keep = new Set(cap.userData.triangles),
          omit = Array.from({ length: count }, (_, i) => i).filter(
            (i) => !keep.has(i),
          );
        if (count >= 65536)
          throw new Error("Interior face table exceeds Uint16 limit");
        const inverted = omit.length < keep.size;
        records[key] = {
          [inverted ? "omit" : "keep"]: Buffer.from(
            new Uint16Array(inverted ? omit : [...keep]).buffer,
          ).toString("base64"),
        };
        cap.dispose();
      }
    }
    seen.add(key);
    if (records[key]) used.push({ name: mesh.name, key });
  });
  audit.push({ kind, meshes: used.length, parts: used });
  root.userData.disposeLocalMotion?.();
}
await writeFile(
  process.argv[3] ?? "src/assets/models/creature_interior_topology.json",
  JSON.stringify(records) + "\n",
);
console.log(
  JSON.stringify(
    { meshes: seen.size, records: Object.keys(records).length, audit },
    null,
    2,
  ),
);
