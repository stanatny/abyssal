/** 补齐 HF 淡水魟缺失的腹面口和五对鳃褶，沿真实表面贴合生成静态几何。 */
import fs from "node:fs";
import * as T from "three";
import { decodeOrganicMesh } from "../src/hf_organic_asset.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const path = process.argv[2];
if (!path)
  throw Error("Usage: node scripts/finish_amazon_ray_hf_asset.mjs mesh.json");
const d = JSON.parse(fs.readFileSync(path));
const g = decodeOrganicMesh(d, null, (x, y, z, c) => c.setHex(0xffffff)),
  m = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide })),
  ray = new T.Raycaster(),
  parts = [];
function curve(points, r) {
  const fit = points.map(([x, z]) => {
    ray.set(new T.Vector3(x, -1, z), new T.Vector3(0, 1, 0));
    const hit = ray.intersectObject(m)[0];
    if (!hit) throw Error("No ventral surface");
    return new T.Vector3(x, hit.point.y - 0.0014, z);
  });
  parts.push(new T.TubeGeometry(new T.CatmullRomCurve3(fit), 10, r, 5, false));
}
curve(
  [
    [-0.034, -0.369],
    [-0.02, -0.374],
    [0, -0.376],
    [0.02, -0.374],
    [0.034, -0.369],
  ],
  0.0025,
);
for (const s of [-1, 1])
  for (let i = 0; i < 5; i++) {
    const z = -0.305 + i * 0.025;
    curve(
      [
        [s * 0.047, z + 0.005],
        [s * 0.067, z],
        [s * 0.085, z + 0.004],
      ],
      0.0019,
    );
  }
const merged = mergeGeometries(parts);
d.ventralDetails = {
  position: Array.from(merged.attributes.position.array),
  normal: Array.from(merged.attributes.normal.array),
  index: Array.from(merged.index.array),
  note: "Locally fitted mouth and five paired gill creases; original HF underside lacked these structures.",
};
fs.writeFileSync(path, JSON.stringify(d));
console.log({
  vertices: merged.attributes.position.count,
  triangles: merged.index.count / 3,
});
