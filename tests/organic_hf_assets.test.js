import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import squid from "../src/assets/models/squid_mesh.json" with { type: "json" };

function step(root, input, frames = 1) {
  for (let i = 0; i < frames; i++)
    root.userData.animate(i / 60, 1, { dt: 1 / 60, speed: 12, ...input });
  root.updateMatrixWorld(true);
  root.getObjectByName(root.name.slice(9) + "_hf_body").skeleton.update();
}
function vertex(body, index) {
  return body.getVertexPosition(index, new THREE.Vector3());
}

for (const kind of ["orca", "squid"]) {
  test(`${kind}: 有界实体网格、合法连续权重和UV接缝，跨实例共享静态资源`, () => {
    const a = createCreature(kind, 1, 733),
      b = createCreature(kind, 1, 734),
      ma = a.getObjectByName(kind + "_hf_body"),
      mb = b.getObjectByName(kind + "_hf_body"),
      g = ma.geometry;
    assert.equal(ma.geometry, mb.geometry);
    assert.equal(ma.material, mb.material);
    assert.notEqual(ma.skeleton, mb.skeleton);
    assert.ok(g.index.count / 3 < (kind === "orca" ? 18000 : 29000));
    assert.ok(g.attributes.position.count < 30000);
    for (const m of Array.isArray(ma.material) ? ma.material : [ma.material]) {
      assert.equal(m.transparent, false);
      assert.equal(m.side, THREE.FrontSide);
      assert.equal(m.metalness, 0);
    }
    const p = g.attributes.position,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex,
      seams = new Map();
    let duplicateCount = 0;
    for (let i = 0; i < p.count; i++) {
      const xyz = [p.getX(i), p.getY(i), p.getZ(i)];
      assert.ok(xyz.every(Number.isFinite));
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        const value = w.getComponent(i, j);
        assert.ok(value >= 0 && value <= 1);
        sum += value;
        assert.ok(ids.getComponent(i, j) < ma.skeleton.bones.length);
      }
      assert.ok(Math.abs(sum - 1) < 2 / 65535);
      const key = xyz.map((n) => n.toFixed(7)).join(",");
      if (seams.has(key)) {
        const prior = seams.get(key);
        for (let j = 0; j < 4; j++) {
          assert.equal(ids.getComponent(i, j), ids.getComponent(prior, j));
          assert.ok(
            Math.abs(w.getComponent(i, j) - w.getComponent(prior, j)) <
              2 / 65535,
          );
        }
        duplicateCount++;
      } else seams.set(key, i);
    }
    assert.ok(duplicateCount > 10);
    assert.ok(g.boundingBox.min.z < -0.47 && g.boundingBox.max.z > 0.48);
  });
  test(`${kind}: 所有渲染顶点都有单位法线，UV接缝不产生明暗断层`, () => {
    const geometry = createCreature(kind, 1, 733).getObjectByName(
        kind + "_hf_body",
      ).geometry,
      p = geometry.attributes.position,
      n = geometry.attributes.normal,
      seams = new Map();
    for (const i of new Set(geometry.index.array)) {
      const normal = new THREE.Vector3().fromBufferAttribute(n, i);
      assert.ok(
        Math.abs(normal.length() - 1) < 0.00005,
        `Invalid normal at ${i}`,
      );
      const key = [p.getX(i), p.getY(i), p.getZ(i)]
        .map((v) => v.toFixed(6))
        .join(",");
      if (seams.has(key)) assert.ok(normal.dot(seams.get(key)) > 0.995);
      else seams.set(key, normal);
    }
  });
  test(`${kind}: 真实末端变形可见，急转/冲刺释放不跳变，暂停保持精确姿态`, () => {
    const root = createCreature(kind, 1, 733),
      body = root.getObjectByName(kind + "_hf_body"),
      p = body.geometry.attributes.position;
    const picks = [];
    for (let i = 0; i < p.count; i++)
      if (
        (kind === "orca"
          ? Math.abs(p.getX(i)) > 0.17 && p.getY(i) < -0.13
          : p.getZ(i) > 0.3 && p.getZ(i) < 0.45) &&
        picks.length < 80
      )
        picks.push(i);
    assert.ok(picks.length > 20);
    const identity = body.geometry,
      raw = Array.from(p.array);
    let maxStep = 0;
    const samples = [];
    for (let frame = 0; frame < 360; frame++) {
      const before = picks.map((i) => vertex(body, i));
      step(root, {
        boosting: frame > 120 && frame < 240,
        speed: frame > 120 && frame < 240 ? 32 : 12,
        jet: kind === "squid" && frame > 180 && frame < 240,
        turn: frame > 240 ? (frame < 300 ? 1 : -1) : 0,
        pitchInput: frame > 240 ? -1 : 0,
      });
      const after = picks.map((i) => vertex(body, i));
      samples.push(after[0]);
      for (let j = 0; j < after.length; j++)
        maxStep = Math.max(maxStep, after[j].distanceTo(before[j]));
    }
    const box = new THREE.Box3().setFromPoints(samples),
      range = box.getSize(new THREE.Vector3());
    assert.ok(range.length() > 0.015);
    assert.ok(maxStep < 0.035, `single-frame jump ${maxStep}`);
    assert.equal(body.geometry, identity);
    assert.deepEqual(Array.from(p.array), raw);
    const before = picks.map((i) => vertex(body, i).toArray());
    root.userData.animate(99, 3, {
      dt: 0,
      speed: 72,
      boosting: true,
      turn: 1,
      jet: true,
    });
    root.updateMatrixWorld(true);
    body.skeleton.update();
    assert.deepEqual(
      picks.map((i) => vertex(body, i).toArray()),
      before,
    );
  });
}

test("虎鲸冲刺两侧胸鳍确实向后收，真实尾扇上下运动且头部稳定", () => {
  const root = createCreature("orca", 1, 733),
    body = root.getObjectByName("orca_hf_body"),
    p = body.geometry.attributes.position;
  const sides = [-1, 1].map((side) => {
    let picked = -1,
      max = -Infinity;
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) < -0.1 && p.getZ(i) < -0.15 && side * p.getX(i) > max) {
        max = side * p.getX(i);
        picked = i;
      }
    return picked;
  });
  const start = sides.map((i) => vertex(body, i));
  step(root, { speed: 32, boosting: true }, 180);
  const after = sides.map((i) => vertex(body, i));
  for (let i = 0; i < 2; i++) assert.ok(after[i].z - start[i].z > 0.018);
  const tail = [];
  for (let i = 0; i < p.count; i++) if (p.getZ(i) > 0.48) tail.push(i);
  const y = [];
  for (let f = 0; f < 180; f++) {
    step(root, {});
    y.push(vertex(body, tail[0]).y);
  }
  assert.ok(Math.max(...y) - Math.min(...y) > 0.07);
  const head = [];
  for (let i = 0; i < p.count; i++) if (p.getZ(i) < -0.4) head.push(i);
  const a = vertex(body, head[0]);
  step(root, { boosting: true }, 120);
  assert.ok(vertex(body, head[0]).distanceTo(a) < 1e-7);
});

test("乌贼八腕和双触腕独立，吸盘跟随同一连续骨链，腕冠没有拆成漂浮实例", () => {
  assert.equal(squid.chains.filter((c) => c.type === "arm").length, 8);
  assert.equal(squid.chains.filter((c) => c.type === "tentacle").length, 2);
  const root = createCreature("squid", 1),
    body = root.getObjectByName("squid_hf_body"),
    p = body.geometry.attributes.position,
    ids = body.geometry.attributes.skinIndex;
  for (const chain of squid.chains) {
    assert.equal(chain.count, chain.type === "arm" ? 5 : 6);
    assert.ok(chain.length > (chain.type === "arm" ? 0.34 : 0.5));
    const owned = [];
    for (let i = 0; i < p.count; i++)
      if (ids.getX(i) >= chain.first && ids.getX(i) < chain.first + chain.count)
        owned.push(i);
    assert.ok(owned.length > 200);
    const rootBone = body.skeleton.bones[chain.first];
    assert.equal(rootBone.parent, body.skeleton.bones[0]);
  }
  assert.equal(body.geometry.groups.length, 2);
  assert.equal(
    body.geometry.groups.reduce((n, g) => n + g.count, 0),
    body.geometry.index.count,
  );
});
