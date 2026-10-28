import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { buildOdysseyPeopleHF } from "../src/creature_odyssey_people_hf.js";
import { preparedCreatureExterior } from "../src/creature_interior.js";
function build() {
  const root = new T.Group(),
    motions = [];
  buildOdysseyPeopleHF("triton_guard", root, motions);
  root.updateMatrixWorld(true);
  return { root, motions, ...root.userData.hfRig };
}
function pose(a, phase, speed) {
  a.motions.forEach((f) => f(phase, speed));
  a.root.updateMatrixWorld(true);
  a.mesh.skeleton.update();
}
test("Triton tail skin crosses the body centre with balanced excursions at cruise and fast effort", () => {
  for (const speed of [0.6, 1.5, 3]) {
    const a = build(),
      p = a.mesh.geometry.attributes.position,
      ids = [];
    for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.42) ids.push(i);
    assert.ok(ids.length > 100);
    const xs = [],
      point = new T.Vector3(),
      cycle = (Math.PI * 2) / 1.35;
    // 先让动作强度稳定，再采样两个完整周期，包含纵向低频变化。
    for (let f = 0; f < 360; f++) {
      pose(a, (f * cycle) / 120, speed);
      if (f < 120) continue;
      let x = 0;
      for (const i of ids) x += a.mesh.getVertexPosition(i, point).x;
      xs.push(x / ids.length - 0.03);
    }
    const left = -Math.min(...xs),
      right = Math.max(...xs),
      mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    assert.ok(left > 0.04 && right > 0.04, `both sides: ${left}, ${right}`);
    assert.ok(
      Math.max(left, right) / Math.min(left, right) < 1.2,
      `balanced: ${left}, ${right}`,
    );
    assert.ok(Math.abs(mean) < 0.008, `no one-sided mean: ${mean}`);
    a.root.userData.disposeLocalMotion();
  }
});
test("Triton neutral tail, vertical fluke and closed interior stay complete", () => {
  const a = build(),
    g = a.mesh.geometry,
    p = g.attributes.position;
  for (const z of [0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45]) {
    const x = [];
    for (let i = 0; i < p.count; i++)
      if (Math.abs(p.getZ(i) - z) < 0.0125 && p.getY(i) < 0.04)
        x.push(p.getX(i));
    const mid = (Math.max(...x) + Math.min(...x)) / 2;
    assert.ok(Math.abs(mid - 0.03) < 0.015, `neutral axis at ${z}: ${mid}`);
  }
  const fin = [];
  for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.42) fin.push(p.getY(i));
  assert.ok(
    Math.max(...fin) - Math.min(...fin) > 0.3,
    "vertical caudal fin retains its height",
  );
  const shell = preparedCreatureExterior(g);
  assert.ok(shell, "new geometry must retain a prepared closed interior");
  const edges = new Map();
  for (let i = 0; i < shell.index.count; i += 3)
    for (let j = 0; j < 3; j++) {
      const a = shell.index.getX(i + j),
        b = shell.index.getX(i + ((j + 1) % 3)),
        k = [a, b].sort((a, b) => a - b).join(":");
      edges.set(k, (edges.get(k) || 0) + 1);
    }
  assert.ok(
    [...edges.values()].every((n) => n === 2),
    "closed manifold interior",
  );
  shell.dispose();
  a.root.userData.disposeLocalMotion();
});

test("Triton upper fluke is carried by the tail and its surface stays continuous", () => {
  const a = build(),
    g = a.mesh.geometry,
    p = g.attributes.position,
    tail = new Set(a.chains.find((c) => c.type === "tail").ids),
    si = g.attributes.skinIndex,
    sw = g.attributes.skinWeight;
  let upperFin = 0;
  for (let i = 0; i < p.count; i++)
    if (p.getZ(i) > 0.38 && p.getY(i) > -0.015) {
      let weight = 0;
      for (let j = 0; j < 4; j++)
        if (tail.has(si.array[i * 4 + j])) weight += sw.array[i * 4 + j];
      assert.ok(
        weight > 0.9999,
        "fluke must not remain attached to the stationary torso",
      );
      upperFin++;
    }
  assert.ok(upperFin > 10);
  const triangles = [];
  for (let j = 0; j < g.index.count; j += 3) {
    const ids = [0, 1, 2].map((k) => g.index.getX(j + k)),
      v = ids.map((i) => new T.Vector3().fromBufferAttribute(p, i));
    if (!v.every((v) => v.z > 0)) continue;
    const area = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length(),
      edge2 = Math.max(
        v[0].distanceToSquared(v[1]),
        v[1].distanceToSquared(v[2]),
        v[2].distanceToSquared(v[0]),
      );
    // 近共线源三角形的面积比不稳定；检查具有可靠面积的实际表面。
    if (area > 1e-6 && area / edge2 > 0.08) triangles.push({ ids, area });
  }
  assert.ok(triangles.length > 800);
  for (let t = 0; t < 8; t += 0.125) {
    pose(a, t, t < 4 ? 1 : 3);
    for (const tri of triangles) {
      const v = tri.ids.map((i) =>
        a.mesh.getVertexPosition(i, new T.Vector3()),
      );
      const ratio =
        v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).length() /
        tri.area;
      assert.ok(ratio > 0.4 && ratio < 2, `tail skin area ratio: ${ratio}`);
    }
  }
  a.root.userData.disposeLocalMotion();
});
