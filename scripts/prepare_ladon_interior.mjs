/** 只追加拉冬的离线闭合外壳，原有拓扑记录保持逐项一致。 */
import { readFile, writeFile } from "node:fs/promises";
import { createCreature } from "../src/creatures.js";
import { closedCreatureExterior } from "./lib/closed_creature_exterior.mjs";
import { creatureGeometryKey } from "../src/creature_interior_key.js";
const path = "src/assets/models/creature_interior_topology.json";
const records = JSON.parse(await readFile(path, "utf8"));
const root = createCreature("ladon", 20);
let added = 0;
root.traverse((mesh) => {
  if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
  const key = creatureGeometryKey(mesh.geometry);
  if (records[key]) return;
  const cap = closedCreatureExterior(mesh.geometry);
  if (!cap) return;
  const count =
    (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
  if (count >= 65536) throw Error("Ladon topology exceeds Uint16 limits");
  const keep = new Set(cap.userData.triangles),
    omit = Array.from({ length: count }, (_, i) => i).filter(
      (i) => !keep.has(i),
    );
  const invert = omit.length < keep.size;
  records[key] = {
    [invert ? "omit" : "keep"]: Buffer.from(
      new Uint16Array(invert ? omit : [...keep]).buffer,
    ).toString("base64"),
  };
  added++;
  cap.dispose();
});
root.userData.disposeLocalMotion?.();
await writeFile(path, JSON.stringify(records) + "\n");
console.log(JSON.stringify({ added, records: Object.keys(records).length }));
