/**
 * 在离线准备阶段把能量线贴合到当前机械鲨鱼实体网格，避免玩家首次选角时执行密集射线。
 * 用法：node scripts/bake_mechanical_conduits.mjs [output.json]
 * 先运行 prepare_mechanical_hf_asset.mjs，将其产物放入 src/assets/models。
 */
import * as THREE from "three";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createMechanicalSharkRig } from "../src/mechanical_shark_asset.js";
const { body } = createMechanicalSharkRig(new THREE.Group());
const curves = [];
function fit(side, values, radius) {
  let points = [];
  const finish = () => {
    if (points.length > 1)
      curves.push({ radius, points: points.map((p) => p.toArray()) });
    points = [];
  };
  for (const [y, z] of values) {
    const hit = new THREE.Raycaster(
      new THREE.Vector3(side, y, z),
      new THREE.Vector3(-side, 0, 0),
    ).intersectObject(body)[0];
    if (!hit) {
      finish();
      continue;
    }
    const point = hit.point.clone();
    point.x += side * radius * 0.6;
    if (points.length && points.at(-1).distanceTo(point) > 0.012) finish();
    points.push(point);
  }
  finish();
}
for (const side of [-1, 1]) {
  fit(
    side,
    Array.from({ length: 90 }, (_, i) => [
      0.018 + Math.sin((i / 89) * Math.PI) * 0.014,
      -0.3 + (i / 89) * 0.3,
    ]),
    0.0013,
  );
  fit(
    side,
    Array.from({ length: 15 }, (_, i) => [
      0.004 + Math.sin((i / 14) * Math.PI) * 0.003,
      -0.421 + (i / 14) * 0.035,
    ]),
    0.0022,
  );
  for (let j = 0; j < 3; j++)
    fit(
      side,
      Array.from({ length: 16 }, (_, i) => [
        -0.025 + (i / 15) * 0.045,
        -0.276 + j * 0.015 + (i / 15) * 0.008,
      ]),
      0.0013,
    );
}
const mesh = JSON.parse(
  await readFile(
    new URL("../src/assets/models/mechanical_shark_mesh.json", import.meta.url),
    "utf8",
  ),
);
const data = {
  sourceMeshHash: createHash("sha256")
    .update(JSON.stringify(mesh))
    .digest("hex"),
  curves,
};
const output =
  process.argv[2] ||
  new URL(
    "../src/assets/models/mechanical_shark_conduits.json",
    import.meta.url,
  );
await writeFile(output, JSON.stringify(data));
body.skeleton.dispose();
console.log(
  JSON.stringify({
    curves: curves.length,
    points: curves.reduce((n, c) => n + c.points.length, 0),
    sourceMeshHash: data.sourceMeshHash,
  }),
);
