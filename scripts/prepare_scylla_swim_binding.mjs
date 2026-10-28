/** 将足根调和权重离线写入稀疏覆盖层；运行时只解码，不建立表面图或迭代。 */
import fs from "node:fs";
import { createCreature } from "../src/creatures.js";
import { ODYSSEY_HF_LORD_DATA } from "../src/odyssey_lord_hf_asset.js";
import { decodePackedArray } from "../src/packed_array.js";
import { relaxScyllaFootRoots } from "./scylla_foot_binding.js";
const output = process.argv[2];
if (!output) throw Error("Output path required");
const data = ODYSSEY_HF_LORD_DATA.scylla;
delete data.footRootBinding;
const root = createCreature("scylla", 1),
  g = root.userData.hfRig.mesh.geometry,
  before = g.attributes.skinWeight.array.slice(),
  beforeIds = g.attributes.skinIndex.array.slice();
relaxScyllaFootRoots(g, decodePackedArray(data.anatomyPart, Uint8Array));
const vertices = [],
  ids = [],
  weights = [];
for (let i = 0; i < g.attributes.position.count; i++) {
  if (
    [0, 1, 2, 3].every(
      (j) =>
        g.attributes.skinWeight.array[i * 4 + j] === before[i * 4 + j] &&
        g.attributes.skinIndex.array[i * 4 + j] === beforeIds[i * 4 + j],
    )
  )
    continue;
  vertices.push(i);
  for (let j = 0; j < 4; j++) {
    ids.push(g.attributes.skinIndex.array[i * 4 + j]);
    weights.push(Math.round(g.attributes.skinWeight.array[i * 4 + j] * 65535));
  }
}
const enc = (a) => Buffer.from(new Uint16Array(a).buffer).toString("base64");
data.footRootBinding = {
  version: 1,
  vertices: enc(vertices),
  skinIndex: enc(ids),
  skinWeight: enc(weights),
};
fs.writeFileSync(output, JSON.stringify(data) + "\n");
root.userData.disposeLocalMotion();
console.log(
  JSON.stringify({ vertices: vertices.length, bytes: vertices.length * 18 }),
);
