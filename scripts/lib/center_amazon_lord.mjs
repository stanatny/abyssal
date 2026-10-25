/** Remove a measured reconstruction bend after color projection, preserving the atlas. */
import { readFile, writeFile } from "node:fs/promises";
export async function centerAmazonLord(path, kind, measuredAxis) {
  if (kind !== "thunderbarbel" && kind !== "yacumama" && kind !== "rootjaw")
    return;
  const d = JSON.parse(await readFile(path, "utf8"));
  const decode = (s, T) =>
    new T(Uint8Array.from(Buffer.from(s, "base64")).buffer);
  const q = decode(d.position, Uint16Array),
    normals = decode(d.normal, Int16Array);
  const p = new Float64Array(q.length);
  for (let i = 0; i < q.length; i++)
    p[i] = d.min[i % 3] + (q[i] / 65535) * (d.max[i % 3] - d.min[i % 3]);
  let points;
  if (measuredAxis) {
    if (
      !Array.isArray(measuredAxis) ||
      measuredAxis.length < 2 ||
      measuredAxis.some(
        (p, i) =>
          p.length !== 3 ||
          p.some((v) => !Number.isFinite(v)) ||
          (i && p[0] <= measuredAxis[i - 1][0]),
      )
    )
      throw Error("Invalid measured neutral axis");
    points = measuredAxis;
  } else if (kind === "thunderbarbel") {
    points = [
      [-0.5, 0, 0],
      [-0.15, 0, 0],
      [0, 0, 0],
      [0.1, -0.012, 0],
      [0.2, -0.035, 0],
      [0.3, -0.055, 0],
      [0.4, -0.071, 0],
      [0.5, -0.081, 0],
    ];
  } else if (kind === "rootjaw") {
    points = [
      [-0.5, 0, 0],
      [0.05, 0, 0],
      [0.15, 0.004, 0],
      [0.25, -0.003, 0],
      [0.35, -0.024, 0],
      [0.45, -0.065, 0],
      [0.5, -0.088, 0],
    ];
  } else {
    points = Array.from({ length: 33 }, (_, j) => {
      const z = -0.49 + (j * 0.98) / 32,
        x = [],
        y = [];
      for (let i = 0; i < p.length; i += 3)
        if (Math.abs(p[i + 2] - z) < 0.018) {
          x.push(p[i]);
          y.push(p[i + 1]);
        }
      if (!x.length) throw Error("Missing serpent cross section");
      x.sort((a, b) => a - b);
      y.sort((a, b) => a - b);
      const mid = (a) =>
        (a[Math.floor(a.length * 0.03)] + a[Math.floor(a.length * 0.97)]) / 2;
      return [z, mid(x), mid(y)];
    });
    // Fit a smooth neutral axis; neighboring sections cannot introduce a corrugated skin.
    for (let pass = 0; pass < 3; pass++)
      points = points.map((p, j, a) =>
        j === 0 || j === a.length - 1
          ? p
          : [
              p[0],
              (a[j - 1][1] + 2 * p[1] + a[j + 1][1]) / 4,
              (a[j - 1][2] + 2 * p[2] + a[j + 1][2]) / 4,
            ],
      );
  }
  const sample = (z, k) => {
    const j = Math.max(
      0,
      Math.min(
        points.length - 2,
        points.findIndex(
          (p, i) => i < points.length - 1 && z <= points[i + 1][0],
        ),
      ),
    );
    if (z <= points[0][0]) return points[0][k];
    if (z >= points.at(-1)[0]) return points.at(-1)[k];
    const a = points[j],
      b = points[j + 1],
      h = b[0] - a[0],
      t = (z - a[0]) / h;
    const prev = points[Math.max(0, j - 1)],
      next = points[Math.min(points.length - 1, j + 2)];
    const ma = (b[k] - prev[k]) / (b[0] - prev[0]),
      mb = (next[k] - a[k]) / (next[0] - a[0]);
    return (
      (2 * t * t * t - 3 * t * t + 1) * a[k] +
      (t * t * t - 2 * t * t + t) * h * ma +
      (-2 * t * t * t + 3 * t * t) * b[k] +
      (t * t * t - t * t) * h * mb
    );
  };
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  let maxShift = 0;
  for (let i = 0; i < p.length; i += 3) {
    const z = p[i + 2],
      dx = sample(z, 1),
      dy = sample(z, 2);
    maxShift = Math.max(maxShift, Math.hypot(dx, dy));
    p[i] -= dx;
    p[i + 1] -= dy;
    const sx = (sample(z + 0.0001, 1) - sample(z - 0.0001, 1)) / 0.0002,
      sy = (sample(z + 0.0001, 2) - sample(z - 0.0001, 2)) / 0.0002;
    let nx = normals[i] / 32767,
      ny = normals[i + 1] / 32767,
      nz = normals[i + 2] / 32767 + sx * nx + sy * ny;
    const len = Math.hypot(nx, ny, nz);
    normals[i] = Math.round((nx / len) * 32767);
    normals[i + 1] = Math.round((ny / len) * 32767);
    normals[i + 2] = Math.round((nz / len) * 32767);
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p[i + k]);
      max[k] = Math.max(max[k], p[i + k]);
    }
  }
  if (maxShift > 0.18)
    throw Error("Neutral-axis correction exceeds reviewed envelope");
  for (let i = 0; i < q.length; i++)
    q[i] = Math.round(
      ((p[i] - min[i % 3]) / (max[i % 3] - min[i % 3])) * 65535,
    );
  const b64 = (a) =>
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
  d.min = min;
  d.max = max;
  d.position = b64(q);
  d.normal = b64(normals);
  d.neutralAxis = {
    points,
    maxShift,
    method:
      "post-projection smooth centerline translation with inverse-transpose normals",
  };
  await writeFile(path, JSON.stringify(d) + "\n");
  console.log({ kind, neutralShift: maxShift, min, max });
}
