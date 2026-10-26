import * as THREE from "three";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** 离线修复零法线；已有有效法线、形体、索引、UV及蒙皮一律保持原样。 */
export function repairPackedNormals(packed) {
  const decode = (s, Type) =>
      new Type(Uint8Array.from(Buffer.from(s, "base64")).buffer),
    normals = decode(packed.normal, Int16Array),
    positions = decode(packed.position, Uint16Array),
    indices = decode(packed.index, Uint16Array),
    groups = new Map(),
    vertices = [],
    invalid = [];
  for (let i = 0; i < positions.length; i += 3) {
    const key = positions.slice(i, i + 3).join(",");
    if (!groups.has(key))
      groups.set(key, {
        point: new THREE.Vector3(
          ...[0, 1, 2].map(
            (j) =>
              packed.min[j] +
              (positions[i + j] / 65535) * (packed.max[j] - packed.min[j]),
          ),
        ),
        sum: new THREE.Vector3(),
        face: new THREE.Vector3(),
        authored: new THREE.Vector3(),
      });
    const group = groups.get(key),
      normal = new THREE.Vector3().fromArray(normals, i);
    vertices.push(group);
    if (normal.lengthSq() < 1) invalid.push(i);
    else if (group.authored.lengthSq() === 0)
      group.authored.copy(normal).normalize();
  }
  if (!invalid.length) return 0;
  const ab = new THREE.Vector3(),
    ac = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    const a = vertices[indices[i]],
      b = vertices[indices[i + 1]],
      c = vertices[indices[i + 2]];
    const cross = ab
      .subVectors(b.point, a.point)
      .cross(ac.subVectors(c.point, a.point));
    for (const v of [a, b, c]) {
      v.sum.add(cross);
      if (cross.lengthSq() > v.face.lengthSq()) v.face.copy(cross);
    }
  }
  const repaired = new Map();
  for (const i of invalid) {
    const v = vertices[i / 3];
    if (!repaired.has(v)) {
      const n = (
        v.authored.lengthSq() > 0
          ? v.authored
          : v.sum.lengthSq() > 1e-24
            ? v.sum
            : v.face
      ).clone();
      if (n.lengthSq() < 1e-24) {
        // 已删除面的孤立顶点无邻接面，借用最近有效源法线。
        let distance = Infinity;
        for (const other of groups.values()) {
          if (other.authored.lengthSq() === 0) continue;
          const d = other.point.distanceToSquared(v.point);
          if (d < distance) {
            distance = d;
            n.copy(other.authored);
          }
        }
      }
      if (n.lengthSq() < 1e-24)
        throw Error("Mesh has no valid normal or adjacent surface");
      repaired.set(
        v,
        n
          .normalize()
          .toArray()
          .map((x) => Math.round(x * 32767)),
      );
    }
    normals.set(repaired.get(v), i);
  }
  packed.normal = Buffer.from(normals.buffer).toString("base64");
  return invalid.length;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  for (const file of process.argv.slice(2)) {
    const packed = JSON.parse(await readFile(file));
    const repaired = repairPackedNormals(packed);
    if (repaired) await writeFile(file, JSON.stringify(packed) + "\n");
    console.log(JSON.stringify({ file, repaired }));
  }
}
