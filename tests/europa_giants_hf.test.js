import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
const kinds = [
  "crown_filterer",
  "bell_carrier",
  "siphon_colossus",
  "spiral_grazer",
];
for (const kind of kinds) {
  test(`${kind}: shared HF surface, independent pose and owned disposal`, () => {
    const a = createCreature(kind, 1, 7),
      b = createCreature(kind, 1, 7),
      r = a.userData.hfRig,
      s = b.userData.hfRig,
      g = r.mesh.geometry;
    assert.equal(a.userData.artRevision, "trellis_europa_giants_20261026");
    assert.equal(g, s.mesh.geometry);
    assert.equal(r.mesh.material, s.mesh.material);
    assert.notEqual(r.mesh.skeleton, s.mesh.skeleton);
    assert.ok(g.index.count / 3 < (kind === "bell_carrier" ? 24000 : 19000));
    assert.ok(r.bones.length <= 40);
    for (let i = 0; i < g.attributes.skinWeight.count; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        const w = g.attributes.skinWeight.array[i * 4 + j],
          id = g.attributes.skinIndex.array[i * 4 + j];
        assert.ok(w >= 0 && w <= 1);
        assert.ok(id < r.bones.length);
        sum += w;
      }
      assert.ok(Math.abs(sum - 1) < 1e-6);
    }
    const unchanged = s.bones.map((x) => x.matrix.toArray());
    for (let f = 0; f < 120; f++) a.userData.animate(f / 60, 2);
    assert.deepEqual(
      s.bones.map((x) => x.matrix.toArray()),
      unchanged,
    );
    r.mesh.skeleton.computeBoneTexture();
    let released = 0;
    r.mesh.skeleton.boneTexture.addEventListener("dispose", () => released++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(released, 1);
    assert.ok(s.mesh.geometry.attributes.position);
    b.userData.disposeLocalMotion();
  });
  test(`${kind}: skinned surface survives cruise/fast/stop, preserves seams and paused state`, () => {
    const a = createCreature(kind, 1, 5),
      r = a.userData.hfRig,
      g = r.mesh.geometry,
      p = g.attributes.position,
      seen = new Map(),
      pairs = [],
      v = new THREE.Vector3(),
      edges = [];
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
      if (seen.has(key)) pairs.push([seen.get(key), i]);
      else seen.set(key, i);
    }
    for (let i = 0; i < g.index.count; i += 33) {
      const ids = [g.index.array[i], g.index.array[i + 1]],
        d = v
          .fromBufferAttribute(p, ids[0])
          .distanceTo(new THREE.Vector3().fromBufferAttribute(p, ids[1]));
      if (d > 0.004) edges.push({ ids, d });
    }
    const tips = r.chains
      .filter((c) => !["mantle", "umbrella"].includes(c.type))
      .map((c) => {
        let id = -1,
          best = -1;
        for (let i = 0; i < p.count; i++) {
          let weight = 0;
          for (let j = 0; j < 4; j++)
            if (c.ids.includes(g.attributes.skinIndex.array[i * 4 + j]))
              weight += g.attributes.skinWeight.array[i * 4 + j];
          const dist = v
            .fromBufferAttribute(p, i)
            .distanceToSquared(new THREE.Vector3(...c.points[0]));
          if (weight > 0.3 && dist > best) {
            id = i;
            best = dist;
          }
        }
        assert.ok(id >= 0, c.name);
        return { id, box: new THREE.Box3() };
      });
    let radius = 0,
      minStretch = 1,
      maxStretch = 1;
    const rest = Array.from(p.array);
    for (let f = 0; f < 240; f++) {
      const speed = f < 80 ? 1 : f < 160 ? 2 : 0;
      a.userData.animate(f / 30, speed, {
        dt: 1 / 30,
        travelSpeed: speed * 5,
        cruiseSpeed: 5,
      });
      a.updateMatrixWorld(true);
      r.mesh.skeleton.update();
      for (const t of tips)
        t.box.expandByPoint(r.mesh.getVertexPosition(t.id, v));
      if (f % 12 === 0) {
        for (let i = 0; i < p.count; i++) {
          r.mesh.getVertexPosition(i, v);
          assert.ok(v.toArray().every(Number.isFinite));
          radius = Math.max(radius, v.length());
          assert.ok(r.mesh.boundingSphere.containsPoint(v));
        }
        for (const [x, y] of pairs)
          assert.ok(
            r.mesh
              .getVertexPosition(x, v)
              .distanceTo(r.mesh.getVertexPosition(y, new THREE.Vector3())) <
              1e-6,
          );
        for (const e of edges) {
          const stretch =
            r.mesh
              .getVertexPosition(e.ids[0], v)
              .distanceTo(
                r.mesh.getVertexPosition(e.ids[1], new THREE.Vector3()),
              ) / e.d;
          minStretch = Math.min(minStretch, stretch);
          maxStretch = Math.max(maxStretch, stretch);
        }
      }
    }
    assert.ok(
      minStretch > 0.5 && maxStretch < (kind === "crown_filterer" ? 2 : 1.65),
      `${kind}: stretch ${minStretch}..${maxStretch}`,
    );
    for (const t of tips)
      assert.ok(
        t.box.getSize(v).length() > 0.0005,
        "appendage surface must actually move",
      );
    const species = getRegionSpecies("europa").find((s) => s.kind === kind);
    assert.ok(radius < species.swimClearance, `${kind} radius ${radius}`);
    assert.ok(radius * species.length * 2 < species.populationSpacing);
    const snapshot = r.bones.map((b) => [
      ...b.position.toArray(),
      ...b.quaternion.toArray(),
      ...b.scale.toArray(),
    ]);
    a.userData.animate(239 / 30, 0, {
      dt: 1 / 30,
      travelSpeed: 0,
      cruiseSpeed: 5,
    });
    assert.deepEqual(
      r.bones.map((b) => [
        ...b.position.toArray(),
        ...b.quaternion.toArray(),
        ...b.scale.toArray(),
      ]),
      snapshot,
    );
    assert.deepEqual(Array.from(p.array), rest);
    a.userData.disposeLocalMotion();
  });
}
test("Spiral shell remains rigid while the foot and fins move", () => {
  const a = createCreature("spiral_grazer", 1, 3),
    r = a.userData.hfRig,
    p = r.mesh.geometry.attributes.position,
    v = new THREE.Vector3();
  let checked = 0;
  for (let f = 0; f < 90; f++) {
    a.userData.animate(f / 30, 2);
    a.updateMatrixWorld(true);
    r.mesh.skeleton.update();
    for (let i = 0; i < p.count; i += 7)
      if (p.getY(i) > 0.01 && p.getZ(i) > -0.23) {
        assert.ok(
          r.mesh
            .getVertexPosition(i, v)
            .distanceTo(new THREE.Vector3().fromBufferAttribute(p, i)) < 1e-6,
        );
        checked++;
      }
  }
  assert.ok(checked > 100);
  a.userData.disposeLocalMotion();
});

test("Crown trails a volumetric arm bundle, gathers during travel and loosens after stopping", () => {
  const a = createCreature("crown_filterer", 1, 3),
    r = a.userData.hfRig,
    p = r.mesh.geometry.attributes.position,
    v = new THREE.Vector3();
  const widths = [];
  for (let stage = 0; stage < 3; stage++) {
    const speed = stage === 1 ? 2 : 0;
    for (let f = 0; f < 180; f++)
      a.userData.animate((stage * 180 + f) / 60, speed, {
        dt: 1 / 60,
        travelSpeed: speed * 5,
        cruiseSpeed: 5,
      });
    a.updateMatrixWorld(true);
    r.mesh.skeleton.update();
    let maxX = 0,
      maxY = 0;
    for (let i = 0; i < p.count; i++)
      if (p.getZ(i) > 0.2) {
        r.mesh.getVertexPosition(i, v);
        assert.ok(v.z > 0.19, "arms fold back through the mantle");
        maxX = Math.max(maxX, Math.abs(v.x));
        maxY = Math.max(maxY, Math.abs(v.y));
      }
    assert.ok(maxY > maxX * 0.45, "bundle flattened into a planar fan");
    widths.push(maxX);
  }
  assert.ok(widths[1] < widths[0] * 0.9, "travel must gather the actual skin");
  assert.ok(
    widths[2] > widths[1] * 1.1,
    "stopping must release the gathering gradually",
  );
  a.userData.disposeLocalMotion();
});

test("Crown cruise has readable trailing-surface motion without collapsing connected tissue", () => {
  const a = createCreature("crown_filterer", 1, 3),
    r = a.userData.hfRig,
    g = r.mesh.geometry,
    p = g.attributes.position,
    v = new THREE.Vector3(),
    q = new THREE.Vector3(),
    tips = [],
    edges = [];
  // Eight spatial sectors sample the trailing surface, including seam duplicates.
  // The mantle/root is stationary, so this measures deformation, not root travel.
  for (let sector = 0; sector < 8; sector++) {
    let id = -1,
      farthest = 0.25;
    for (let i = 0; i < p.count; i++) {
      const angle = Math.atan2(p.getY(i), p.getX(i));
      if (
        Math.floor(((angle + Math.PI) * 4) / Math.PI) % 8 === sector &&
        p.getZ(i) > farthest
      ) {
        id = i;
        farthest = p.getZ(i);
      }
    }
    assert.ok(id >= 0);
    tips.push({ id, box: new THREE.Box3() });
  }
  for (let i = 0; i < g.index.count; i += 3) {
    for (let j = 0; j < 3; j++) {
      const x = g.index.array[i + j],
        y = g.index.array[i + ((j + 1) % 3)],
        distance = v
          .fromBufferAttribute(p, x)
          .distanceTo(q.fromBufferAttribute(p, y));
      if (distance > 0.004) edges.push({ x, y, distance });
    }
  }
  let min = 1,
    max = 1;
  for (let frame = 0; frame < 420; frame++) {
    const speed = frame < 300 ? 1 : 2;
    a.userData.animate(frame / 60, speed, {
      dt: 1 / 60,
      travelSpeed: speed * 5,
      cruiseSpeed: 5,
    });
    a.updateMatrixWorld(true);
    r.mesh.skeleton.update();
    if (frame > 120 && frame < 300)
      for (const tip of tips)
        tip.box.expandByPoint(r.mesh.getVertexPosition(tip.id, v));
    if (frame % 12 === 0) {
      for (const edge of edges) {
        const ratio =
          r.mesh
            .getVertexPosition(edge.x, v)
            .distanceTo(r.mesh.getVertexPosition(edge.y, q)) / edge.distance;
        min = Math.min(min, ratio);
        max = Math.max(max, ratio);
      }
    }
  }
  for (const tip of tips)
    assert.ok(
      tip.box.getSize(v).length() > 0.04,
      "trailing tissue appears frozen at normal viewing distance",
    );
  // The previous diffused/top-four binding lost axial weight continuity.
  // Raising amplitude alone caused near-zero edges; audit every connected edge.
  assert.ok(min > 0.65 && max < 1.45, `Crown tissue stretch ${min}..${max}`);
  a.userData.disposeLocalMotion();
});
