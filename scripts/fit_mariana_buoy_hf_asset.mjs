/** 离线统一缩放科考浮标，把浮环置于原水线；不改UV、表面法线或三角拓扑。 */
import { resolve, dirname, join } from "node:path";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
const [input, outArg] = process.argv.slice(2);
if (!input || !outArg)
  throw new Error("Usage: uniform-mesh.json output-directory");
const packed = JSON.parse(await readFile(input, "utf8"));
if (
  packed.kind !== "mariana_buoy" ||
  packed.sourceSha256 !==
    "ac7a4d323262d078225d7c7a0f6adad62943de1dc3291e58e707d76577e367a7"
)
  throw new Error(
    "Inspect the source and waterline before fitting a different buoy",
  );
if (packed.worldFit)
  throw new Error("Preserve the uniform intermediate; do not fit twice");
const spanX = packed.max[0] - packed.min[0],
  spanZ = packed.max[2] - packed.min[2],
  scale = 4 / Math.max(spanX, spanZ),
  origin = [
    (packed.min[0] + packed.max[0]) / 2,
    packed.max[1] - 5.8 / scale,
    (packed.min[2] + packed.max[2]) / 2,
  ];
if (!(scale > 1 && scale < 12) || !(origin[1] > -0.34 && origin[1] < -0.28))
  throw new Error(
    "Unexpected float band; inspect its actual surface before fitting",
  );
const previous = structuredClone(packed.sourceNormalization);
packed.min = packed.min.map((x, i) => (x - origin[i]) * scale);
packed.max = packed.max.map((x, i) => (x - origin[i]) * scale);
// 统一仿射变换保持量化值、UV和法线原样，组合回原始曲面的反投射坐标。
packed.sourceNormalization = {
  center: previous.center.map((x, i) => x + origin[i] / previous.scale),
  scale: previous.scale * scale,
};
packed.worldFit = {
  revision: "mariana-survey-buoy-hf-20261111",
  previousNormalization: previous,
  uniformScale: scale,
  originInUniformMesh: origin,
  floatDiameter: 4,
  topAboveWaterline: 5.8,
  waterline: 0,
  cableStart: [0, -0.6, 0],
  cableEnd: [0, -7, 0],
};
packed.normalization =
  "World metres; float/rubber waterline at local Y0, diameter4, antenna topY5.8. Existing group owns bob/roll and unchanged collision.";
const out = resolve(outArg);
await mkdir(out, { recursive: true });
await writeFile(
  join(out, "mariana_buoy_hf_mesh.json"),
  JSON.stringify(packed) + "\n",
);
await copyFile(
  join(dirname(resolve(input)), "mariana_buoy_hf_color.webp"),
  join(out, "mariana_buoy_hf_color.webp"),
);
console.log(
  JSON.stringify({
    triangles: packed.triangles,
    vertices: packed.vertices,
    min: packed.min,
    max: packed.max,
    worldFit: packed.worldFit,
  }),
);
