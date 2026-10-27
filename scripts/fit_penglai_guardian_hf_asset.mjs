/** 朱雀等长保留既有巨大翼展；按同一仿射变换处理法线，颜色与 UV 原样保留。 */
import { readFile, writeFile } from "node:fs/promises";
const [input, output] = process.argv.slice(2),
  d = JSON.parse(await readFile(input));
if (d.kind !== "vermilion_bird" || d.penglaiFit)
  throw Error("Expected unfitted Vermilion input");
const bytes = Buffer.from(d.normal, "base64"),
  n = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2),
  out = new Int16Array(n.length);
for (let i = 0; i < n.length; i += 3) {
  const x = n[i] / 1.35,
    y = n[i + 1],
    z = n[i + 2],
    l = Math.hypot(x, y, z);
  out[i] = Math.round((x / l) * 32767);
  out[i + 1] = Math.round((y / l) * 32767);
  out[i + 2] = Math.round((z / l) * 32767);
}
d.min[0] *= 1.35;
d.max[0] *= 1.35;
d.normal = Buffer.from(out.buffer).toString("base64");
d.penglaiFit = {
  xScale: 1.35,
  reason:
    "retain substantial 52m guardian wing silhouette with inverse-transpose normals",
};
await writeFile(output, JSON.stringify(d) + "\n");
