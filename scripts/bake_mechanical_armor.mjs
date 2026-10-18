/** Bake fitted, bevelled titanium panels against the actual neutral HF mesh. */
import * as THREE from "three";
import { createMechanicalSharkRig } from "../src/mechanical_shark_asset.js";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const { body } = createMechanicalSharkRig(new THREE.Group());
const panels = [];
function panel(name, axis, side, polygon) {
  const center = polygon
    .reduce((c, p) => c.add(new THREE.Vector2(...p)), new THREE.Vector2())
    .multiplyScalar(1 / polygon.length);
  const point = (v, lift) => {
    const from =
        axis === "y"
          ? new THREE.Vector3(v.x, side, v.y)
          : new THREE.Vector3(side, v.x, v.y),
      direction =
        axis === "y"
          ? new THREE.Vector3(0, -side, 0)
          : new THREE.Vector3(-side, 0, 0);
    const hit = new THREE.Raycaster(from, direction).intersectObject(body)[0];
    if (!hit) throw Error(`Missing panel support ${name} ${v.toArray()}`);
    return hit.point.addScaledVector(direction, -lift);
  };
  const outline = polygon.map((p) => new THREE.Vector2(...p)),
    inside = outline.map((p) => p.clone().lerp(center, 0.12)),
    position = [];
  const tri = (a, b, c) => {
    const n = new THREE.Vector3()
      .subVectors(b, a)
      .cross(new THREE.Vector3().subVectors(c, a));
    if (n[axis] * side < 0) [b, c] = [c, b];
    position.push(...a.toArray(), ...b.toArray(), ...c.toArray());
  };
  // Fit a smooth quadratic cap instead of reproducing reconstruction noise as foil-like dents.
  const sx = Math.max(...outline.map((p) => Math.abs(p.x - center.x))),
    sy = Math.max(...outline.map((p) => Math.abs(p.y - center.y)));
  const basis = (v) => {
    const u = (v.x - center.x) / sx,
      w = (v.y - center.y) / sy;
    return [1, u, w, u * u, u * w, w * w];
  };
  const samples = [];
  for (let i = 0; i < inside.length; i++)
    for (let u = 0; u <= 6; u++)
      for (let v = 0; v <= 6 - u; v++) {
        const p = center
          .clone()
          .multiplyScalar(1 - u / 6 - v / 6)
          .addScaledVector(inside[i], u / 6)
          .addScaledVector(inside[(i + 1) % inside.length], v / 6);
        samples.push({ p, h: point(p, 0)[axis] * side });
      }
  const matrix = Array.from({ length: 6 }, () => Array(7).fill(0));
  for (const { p, h } of samples) {
    const b = basis(p);
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) matrix[i][j] += b[i] * b[j];
      matrix[i][6] += b[i] * h;
    }
  }
  for (let i = 0; i < 6; i++) {
    let pivot = i;
    for (let j = i + 1; j < 6; j++)
      if (Math.abs(matrix[j][i]) > Math.abs(matrix[pivot][i])) pivot = j;
    [matrix[i], matrix[pivot]] = [matrix[pivot], matrix[i]];
    const scale = matrix[i][i];
    for (let k = i; k < 7; k++) matrix[i][k] /= scale;
    for (let j = 0; j < 6; j++)
      if (j !== i) {
        const q = matrix[j][i];
        for (let k = i; k < 7; k++) matrix[j][k] -= q * matrix[i][k];
      }
  }
  const evaluate = (v) => basis(v).reduce((n, b, i) => n + b * matrix[i][6], 0);
  const offset =
    Math.max(...samples.map(({ p, h }) => h - evaluate(p))) + 0.004;
  const cap = (v, extra = 0) => {
    const p =
      axis === "y"
        ? new THREE.Vector3(v.x, 0, v.y)
        : new THREE.Vector3(0, v.x, v.y);
    p[axis] = side * (evaluate(v) + offset + extra);
    return p;
  };
  for (let i = 0; i < outline.length; i++) {
    const j = (i + 1) % outline.length,
      a = point(outline[i], 0.0008),
      b = point(outline[j], 0.0008),
      c = cap(inside[i]),
      d = cap(inside[j]);
    tri(a, b, c);
    tri(b, d, c);
    // Small, surface-fitted facets keep each cap outside the rounded head while the bevel is a real step.
    const steps = 4;
    const sample = (u, v) =>
      cap(
        center
          .clone()
          .multiplyScalar(1 - u - v)
          .addScaledVector(inside[i], u)
          .addScaledVector(inside[j], v),
      );
    for (let u = 0; u < steps; u++)
      for (let v = 0; v < steps - u; v++) {
        tri(
          sample(u / steps, v / steps),
          sample((u + 1) / steps, v / steps),
          sample(u / steps, (v + 1) / steps),
        );
        if (u + v < steps - 1)
          tri(
            sample((u + 1) / steps, v / steps),
            sample((u + 1) / steps, (v + 1) / steps),
            sample(u / steps, (v + 1) / steps),
          );
      }
  }
  panels.push({
    name,
    position,
    fasteners: [0, 2].map((i) => ({
      point: cap(outline[i].clone().lerp(center, 0.3), 0.001).toArray(),
      normal: axis === "y" ? [0, side, 0] : [side, 0, 0],
    })),
  });
}
for (const side of [-1, 1]) {
  panel(`helmet_forward_${side}`, "y", 1, [
    [side * 0.006, -0.437],
    [side * 0.027, -0.435],
    [side * 0.063, -0.368],
    [side * 0.006, -0.345],
  ]);
  panel(`helmet_rear_${side}`, "y", 1, [
    [side * 0.006, -0.334],
    [side * 0.064, -0.355],
    [side * 0.074, -0.296],
    [side * 0.006, -0.279],
  ]);
  panel(`cheek_shield_${side}`, "x", side, [
    [0.016, -0.382],
    [0.041, -0.343],
    [0.035, -0.296],
    [-0.013, -0.302],
    [-0.022, -0.352],
  ]);
  panel(`shoulder_${side}`, "y", 1, [
    [side * 0.023, -0.249],
    [side * 0.067, -0.245],
    [side * 0.071, -0.187],
    [side * 0.024, -0.175],
  ]);
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
  panels,
};
await writeFile(
  process.argv[2] ||
    new URL(
      "../src/assets/models/mechanical_shark_armor.json",
      import.meta.url,
    ),
  JSON.stringify(data),
);
body.skeleton.dispose();
console.log(
  JSON.stringify({
    panels: panels.length,
    triangles: panels.reduce((n, p) => n + p.position.length / 9, 0),
  }),
);
