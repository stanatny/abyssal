import { repairPackedNormals } from "./repair_packed_normals.mjs";
/** 离线恢复原始 HF 表面法线，避免运行时重建与硬质高光接缝。 */
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import * as T from "three";
const [kind, rawPath, meshPath, tools] = process.argv.slice(2);
if (
  !["brine_rosette", "hinge_walker", "lantern_pod", "veil_glider"].includes(
    kind,
  ) ||
  !rawPath ||
  !meshPath ||
  !tools
)
  throw Error("Usage: kind raw.glb converted.json tools-directory");
const req = createRequire(resolve(tools, "package.json"));
const { NodeIO } = await import(req.resolve("@gltf-transform/core"));
const { ALL_EXTENSIONS } = await import(
  req.resolve("@gltf-transform/extensions")
);
{
  const file = meshPath,
    d = JSON.parse(await readFile(file)),
    doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(rawPath),
    p = doc.getRoot().listMeshes()[0].listPrimitives()[0],
    v = p.getAttribute("POSITION").getArray(),
    n = p.getAttribute("NORMAL").getArray(),
    rot = new T.Matrix4().fromArray(d.sourceRotation),
    center = new T.Vector3().fromArray(d.sourceNormalization.center),
    scale = d.sourceNormalization.scale,
    x = new T.Vector3(),
    norm = new T.Vector3(),
    pts = [];
  for (let i = 0; i < v.length; i += 3) {
    x.fromArray(v, i).applyMatrix4(rot).sub(center).multiplyScalar(scale);
    norm.fromArray(n, i).transformDirection(rot);
    pts.push([...x.toArray(), ...norm.toArray()]);
  }
  const q = new Uint16Array(
      Uint8Array.from(Buffer.from(d.position, "base64")).buffer,
    ),
    out = new Int16Array(q.length),
    cache = new Map();
  let max = 0;
  for (let i = 0; i < q.length; i += 3) {
    const key = q.slice(i, i + 3).join(",");
    if (cache.has(key)) {
      out.set(cache.get(key), i);
      continue;
    }
    const xyz = [0, 1, 2].map(
      (j) => d.min[j] + (q[i + j] / 65535) * (d.max[j] - d.min[j]),
    );
    let best = null,
      dist = Infinity;
    for (const p of pts) {
      const dd =
        (p[0] - xyz[0]) ** 2 + (p[1] - xyz[1]) ** 2 + (p[2] - xyz[2]) ** 2;
      if (dd < dist) {
        best = p;
        dist = dd;
      }
    }
    max = Math.max(max, Math.sqrt(dist));
    const normal = best.slice(3).map((v) => Math.round(v * 32767));
    cache.set(key, normal);
    out.set(normal, i);
  }
  d.normal = Buffer.from(out.buffer).toString("base64");
  d.normalTransfer = {
    method: "original retained source vertex normals, offline nearest position",
    maxDistance: max,
  };
  repairPackedNormals(d);
  await writeFile(file, JSON.stringify(d) + "\n");
  console.log(kind, max);
}
