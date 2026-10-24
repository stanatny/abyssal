/** 居民的 UV 分岛共享同一实体法线，避免最近点转移把原导出接缝复制成三角反光。 */
import fs from "node:fs";
import * as THREE from "three";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
const file = process.argv[2];
if (!file) throw new Error("Usage: packed-resident-mesh.json");
const packed = JSON.parse(fs.readFileSync(file, "utf8"));
const source = decodeOrganicMesh(packed, null, (_x, _y, _z, c) =>
  c.set(0xffffff),
);
const bare = new THREE.BufferGeometry();
bare.setAttribute("position", source.attributes.position.clone());
bare.setIndex(source.index.clone());
const welded = mergeVertices(bare, 1e-5);
welded.computeVertexNormals();
const key = (p, i) =>
  [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(6)).join(",");
const normalAt = new Map();
for (let i = 0; i < welded.attributes.position.count; i++)
  normalAt.set(
    key(welded.attributes.position, i),
    new THREE.Vector3().fromBufferAttribute(welded.attributes.normal, i),
  );
const normals = new Int16Array(packed.vertices * 3);
for (let i = 0; i < packed.vertices; i++) {
  const n = normalAt.get(key(source.attributes.position, i));
  if (!n || !Number.isFinite(n.length()) || n.length() < 0.5)
    throw new Error(`Invalid normal ${i}`);
  for (let a = 0; a < 3; a++)
    normals[3 * i + a] = Math.round(n.getComponent(a) * 32767);
}
packed.normal = Buffer.from(normals.buffer).toString("base64");
packed.finish =
  "Position-welded smooth normals; source UV and rebaked colors retained";
fs.writeFileSync(file, JSON.stringify(packed));
source.dispose();
bare.dispose();
welded.dispose();
