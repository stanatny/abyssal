import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import asset from "../src/assets/models/octopus_hf_mesh.json" with { type: "json" };
import { setOctopusJetBlend } from "../src/octopus_jet_pose.js";

function armTips(model) {
  const { mesh, chains } = model.userData.hfRig;
  const p = mesh.geometry.attributes.position;
  const ids = mesh.geometry.attributes.skinIndex.array;
  const weights = mesh.geometry.attributes.skinWeight.array;
  return chains
    .filter((c) => c.type === "arm")
    .map((chain) => {
      let selected = -1,
        furthest = -Infinity;
      const root = new THREE.Vector3(...chain.points[0]);
      for (let i = 0; i < p.count; i++) {
        let influence = 0;
        for (let j = 0; j < 4; j++)
          if (chain.ids.includes(ids[i * 4 + j]))
            influence += weights[i * 4 + j];
        const distance = new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .distanceToSquared(root);
        if (influence > 0.85 && distance > furthest) {
          selected = i;
          furthest = distance;
        }
      }
      assert.ok(selected >= 0, `Missing actual distal skin for ${chain.name}`);
      return selected;
    });
}

test("octopus: actual mantle leads all eight trailing arms under world headings", () => {
  const model = createCreature("octopus", 5, 24);
  const { mesh } = model.userData.hfRig;
  try {
    const tips = armTips(model);
    assert.equal(tips.length, 8);
    for (const velocity of [
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0.3, 0.25, 0.4).normalize(),
    ]) {
      model.position.set(100, -200, 300);
      model.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        velocity,
      );
      model.userData.animate(1, 1);
      model.updateMatrixWorld(true);
      mesh.skeleton.update();
      const mantle = new THREE.Vector3();
      let count = 0;
      for (let i = 0; i < mesh.geometry.attributes.position.count; i++)
        if (mesh.geometry.attributes.position.getZ(i) < -0.3) {
          mantle.add(
            mesh
              .getVertexPosition(i, new THREE.Vector3())
              .applyMatrix4(mesh.matrixWorld),
          );
          count++;
        }
      mantle.multiplyScalar(1 / count);
      for (const id of tips) {
        const tip = mesh
          .getVertexPosition(id, new THREE.Vector3())
          .applyMatrix4(mesh.matrixWorld);
        assert.ok(
          tip.sub(mantle).dot(velocity) < -0.5,
          "Arms must trail the visible mantle, not lead travel",
        );
      }
      assert.equal(model.userData.length, 5);
      assert.deepEqual(model.position.toArray(), [100, -200, 300]);
    }
  } finally {
    model.userData.disposeLocalMotion();
  }
});

test("octopus: defense effort and acceleration remain frozen at a paused motion phase", () => {
  const model = createCreature("octopus", 1, 24);
  const bones = model.userData.hfRig.bones;
  const pose = () => [
    ...bones.map((b) => [...b.quaternion.toArray(), ...b.scale.toArray()]),
    ...model.userData.hfRig.mesh.morphTargetInfluences,
  ];
  try {
    model.userData.animate(2, 0.7);
    const paused = pose();
    model.userData.setHunterPhase("windup");
    model.userData.animate(2, 3);
    assert.deepEqual(pose(), paused);
    model.userData.animate(2 + 1 / 60, 3);
    assert.notDeepEqual(pose(), paused);
    const advanced = pose();
    model.userData.setHunterPhase("idle");
    model.userData.animate(2 + 1 / 60, 0.7);
    assert.deepEqual(pose(), advanced);
  } finally {
    model.userData.disposeLocalMotion();
  }
});

test("octopus: compact transit is shared geometry with private, pause-stable pose influences", () => {
  const a = createCreature("octopus", 1, 24),
    b = createCreature("octopus", 1, 25);
  try {
    const ma = a.userData.hfRig.mesh,
      mb = b.userData.hfRig.mesh;
    assert.equal(ma.geometry, mb.geometry);
    assert.notEqual(ma.morphTargetInfluences, mb.morphTargetInfluences);
    assert.equal(ma.geometry.morphAttributes.position.length, 2);
    assert.equal(ma.geometry.morphAttributes.normal.length, 2);
    const tips = armTips(a);
    const span = (m) => {
      m.updateMatrixWorld(true);
      const mesh = m.userData.hfRig.mesh;
      mesh.skeleton.update();
      return new THREE.Box3()
        .setFromPoints(
          tips.map((i) => mesh.getVertexPosition(i, new THREE.Vector3())),
        )
        .getSize(new THREE.Vector3());
    };
    for (let i = 0; i < 180; i++) {
      a.userData.animate(i / 60, 1, { travelSpeed: 0 });
      b.userData.animate(i / 60, 1, { travelSpeed: 6 });
    }
    assert.equal(ma.morphTargetInfluences[0], 0);
    assert.ok(mb.morphTargetInfluences[1] >= 0.6);
    assert.ok(
      span(b).x < span(a).x * 0.65,
      "Transit must be a gathered bundle",
    );
    assert.ok(span(b).y > span(a).y * 1.4, "Avoid another flattened fan");
    const paused = mb.morphTargetInfluences[0];
    b.userData.animate(179 / 60, 3, { travelSpeed: 0 });
    assert.equal(mb.morphTargetInfluences[0], paused);
    const ray = createCreature("ray", 1, 24);
    assert.equal(ray.userData.hfRig.mesh.morphTargetInfluences, undefined);
    ray.userData.disposeLocalMotion();
  } finally {
    a.userData.disposeLocalMotion();
    b.userData.disposeLocalMotion();
  }
});

test("octopus: volumetric bundle has a round cross-section, not a compressed flat fan", () => {
  const m = createCreature("octopus", 1, 24),
    { mesh, chains } = m.userData.hfRig,
    g = mesh.geometry,
    p = g.attributes.position,
    ids = g.attributes.skinIndex.array,
    w = g.attributes.skinWeight.array;
  try {
    m.userData.animate(0, 3, { travelSpeed: 18 });
    for (let step = 1; step <= 180; step++)
      m.userData.animate(step / 60, 3, { travelSpeed: 18 });
    m.updateMatrixWorld(true);
    mesh.skeleton.update();
    const centers = [];
    for (const chain of chains.filter(
      (c) => c.type === "arm" && !c.annotatedShortArm,
    )) {
      const center = new THREE.Vector3();
      let count = 0;
      for (let i = 0; i < p.count; i++) {
        const r = Math.hypot(p.getX(i), p.getZ(i) + 0.23);
        let influence = 0;
        for (let j = 0; j < 4; j++)
          if (chain.ids.includes(ids[i * 4 + j])) influence += w[i * 4 + j];
        if (influence > 0.9 && r > 0.5 && r < 0.54) {
          center.add(mesh.getVertexPosition(i, new THREE.Vector3()));
          count++;
        }
      }
      assert.ok(count > 5);
      centers.push(center.divideScalar(count));
    }
    assert.equal(centers.length, 7);
    const mean = centers
      .reduce((s, v) => s.add(v), new THREE.Vector3())
      .divideScalar(centers.length);
    let xx = 0,
      yy = 0,
      xy = 0;
    for (const v of centers) {
      const x = v.x - mean.x,
        y = v.y - mean.y;
      xx += x * x;
      yy += y * y;
      xy += x * y;
    }
    const disc = Math.hypot(xx - yy, 2 * xy),
      ratio = (xx + yy - disc) / (xx + yy + disc);
    assert.ok(
      ratio > 0.3,
      `Actual arm section still flat: minor/major variance ${ratio}`,
    );
    const span = new THREE.Box3()
      .setFromPoints(centers)
      .getSize(new THREE.Vector3());
    assert.ok(
      span.x < 0.16 && span.y < 0.16,
      "Fast crown must gather within the mantle silhouette",
    );
  } finally {
    m.userData.disposeLocalMotion();
  }
});

test("octopus: transported surfaces preserve UV seams, mantle and finite normals through opening", () => {
  const m = createCreature("octopus", 1, 24),
    g = m.userData.hfRig.mesh.geometry,
    p = g.attributes.position;
  try {
    for (let target = 0; target < 2; target++) {
      const q = g.morphAttributes.position[target],
        n = g.morphAttributes.normal[target],
        seen = new Map();
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(q, i),
          normal = new THREE.Vector3().fromBufferAttribute(n, i);
        assert.ok(v.toArray().every(Number.isFinite));
        assert.ok(Math.abs(normal.length() - 1) < 1e-6);
        if (p.getZ(i) < -0.3)
          assert.ok(
            v.distanceTo(new THREE.Vector3().fromBufferAttribute(p, i)) <
              0.00002,
            "Mantle must remain in place",
          );
        const key = [p.getX(i), p.getY(i), p.getZ(i)].join(",");
        if (seen.has(key)) assert.deepEqual(v.toArray(), seen.get(key));
        else seen.set(key, v.toArray());
      }
    }
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    function area(attr, i) {
      a.fromBufferAttribute(attr, g.index.getX(i));
      b.fromBufferAttribute(attr, g.index.getX(i + 1)).sub(a);
      c.fromBufferAttribute(attr, g.index.getX(i + 2)).sub(a);
      return b.cross(c).length();
    }
    for (const amount of [0.25, 0.5, 0.75, 1]) {
      const mesh = m.userData.hfRig.mesh;
      setOctopusJetBlend(mesh, amount);
      const posed = new THREE.BufferAttribute(new Float32Array(p.count * 3), 3);
      for (let i = 0; i < p.count; i++) {
        a.fromBufferAttribute(p, i).multiplyScalar(
          1 - mesh.morphTargetInfluences.reduce((s, v) => s + v, 0),
        );
        for (let j = 0; j < 2; j++)
          a.addScaledVector(
            b.fromBufferAttribute(g.morphAttributes.position[j], i),
            mesh.morphTargetInfluences[j],
          );
        posed.setXYZ(i, a.x, a.y, a.z);
      }
      const ratios = [];
      for (let i = 0; i < g.index.count; i += 3) {
        const ref = area(p, i);
        if (ref > 1e-10) ratios.push(area(posed, i) / ref);
      }
      ratios.sort((a, b) => a - b);
      assert.ok(
        ratios[0] > 0.01,
        "No collapsed source triangle in sampled transitions",
      );
      assert.ok(
        ratios[Math.floor(ratios.length * 0.01)] > 0.2,
        "Arm/web surfaces must retain thickness during folding",
      );
    }
  } finally {
    m.userData.disposeLocalMotion();
  }
});

test("octopus: propulsion has a short mantle contraction and quiet delayed arm-tip drift", () => {
  const m = createCreature("octopus", 1, 24);
  try {
    const { mesh, bones, chains } = m.userData.hfRig,
      mantle = bones[chains.find((c) => c.type === "mantle").ids[0]],
      tips = armTips(m),
      poses = tips.map(() => []),
      scales = [];
    for (let i = 0; i < 180; i++) {
      m.userData.animate(i / 60, 1, { travelSpeed: 6 });
      m.updateMatrixWorld(true);
      mesh.skeleton.update();
      scales.push(mantle.scale.x);
      tips.forEach((id, j) =>
        poses[j].push(mesh.getVertexPosition(id, new THREE.Vector3())),
      );
    }
    assert.ok(Math.max(...scales) - Math.min(...scales) > 0.06);
    assert.ok(
      scales.filter((s) => s < 0.96).length < scales.length * 0.45,
      "Contraction must not last the entire cycle",
    );
    for (const points of poses)
      assert.ok(
        new THREE.Box3()
          .setFromPoints(points)
          .getSize(new THREE.Vector3())
          .length() < 0.085,
        "Arms trail; avoid wide synchronous rowing",
      );
  } finally {
    m.userData.disposeLocalMotion();
  }
});

test("octopus: reduced swim surface has one padded chart per triangle and stays within the prior budget", () => {
  const decode = (s, Type) =>
    new Type(Uint8Array.from(Buffer.from(s, "base64")).buffer);
  const chart = decode(asset.uvChart, Uint16Array),
    index = decode(asset.index, Uint16Array);
  const uv = decode(asset.uv, Uint16Array);
  assert.ok(asset.triangles <= 16516);
  assert.equal(index.length / 3, asset.triangles);
  assert.equal(chart.length, asset.vertices);
  assert.equal(uv.length, asset.vertices * 2);
  assert.equal(asset.swimChains.filter((c) => c.type === "arm").length, 8);
  for (let i = 0; i < index.length; i += 3) {
    assert.equal(chart[index[i]], chart[index[i + 1]]);
    assert.equal(chart[index[i]], chart[index[i + 2]]);
  }
});

test("octopus: every fitted arm has a distinct distal support, including the short curled arm", () => {
  const arms = asset.swimChains.filter((c) => c.type === "arm");
  assert.equal(arms.filter((c) => c.annotatedShortArm).length, 1);
  for (let i = 0; i < arms.length; i++)
    for (let j = i + 1; j < arms.length; j++)
      assert.ok(
        new THREE.Vector3(...arms[i].points[3]).distanceTo(
          new THREE.Vector3(...arms[j].points[3]),
        ) > 0.025,
        "Two surface fragments of one arm must not be counted as independent arms",
      );
});

test("octopus: stopped travel opens all arms while actual movement gathers them, independently of animation effort", () => {
  const idle = createCreature("octopus", 1, 24),
    swimming = createCreature("octopus", 1, 24);
  try {
    const tips = armTips(idle);
    const span = (model) => {
      model.updateMatrixWorld(true);
      const mesh = model.userData.hfRig.mesh;
      mesh.skeleton.update();
      const points = tips.map((i) =>
        mesh.getVertexPosition(i, new THREE.Vector3()),
      );
      return (
        Math.max(...points.map((p) => p.x)) -
        Math.min(...points.map((p) => p.x))
      );
    };
    for (let i = 0; i < 120; i++) {
      idle.userData.animate(i / 60, 1, { travelSpeed: 0 });
      swimming.userData.animate(i / 60, 1, { travelSpeed: 6 });
    }
    assert.ok(
      span(idle) > span(swimming) * 1.1,
      "Idle skin must visibly spread beyond the moving envelope",
    );
    assert.deepEqual(idle.position.toArray(), [0, 0, 0]);
  } finally {
    idle.userData.disposeLocalMotion();
    swimming.userData.disposeLocalMotion();
  }
});

test("octopus: stop/start pose changes remain continuous and pause freezes travel-state changes", () => {
  const model = createCreature("octopus", 1, 24),
    { mesh, bones } = model.userData.hfRig,
    tips = armTips(model);
  let previous;
  try {
    for (let i = 0; i < 540; i++) {
      const travelSpeed = i < 90 || i >= 360 ? 0 : i < 210 ? 6 : 18;
      model.userData.animate(i / 60, 1, { travelSpeed });
      model.updateMatrixWorld(true);
      mesh.skeleton.update();
      const current = tips.map((id) =>
        mesh.getVertexPosition(id, new THREE.Vector3()),
      );
      if (previous)
        current.forEach((p, j) => assert.ok(p.distanceTo(previous[j]) < 0.035));
      previous = current;
    }
    const paused = bones.map((b) => [
      ...b.quaternion.toArray(),
      ...b.scale.toArray(),
    ]);
    model.userData.animate(539 / 60, 3, { travelSpeed: 18 });
    assert.deepEqual(
      bones.map((b) => [...b.quaternion.toArray(), ...b.scale.toArray()]),
      paused,
    );
  } finally {
    model.userData.disposeLocalMotion();
  }
});
