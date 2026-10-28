import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import {
  bodyRadius,
  resolveMotion,
  isPositionBlocked,
} from "../src/collision.js";
import {
  createOdysseyRuinsAssets,
  createOdysseyRuinMesh,
} from "../src/odyssey_ruins_asset.js";
test("HF wreck admits moving juvenile and adult bodies at the broken gunwale in both directions", () => {
  const o = createOdysseyOcean(new T.Group()),
    m = o.wreck;
  try {
    const point = (x, y, z) =>
      new T.Vector3(x, y, z).applyMatrix4(m.matrixWorld);
    for (const length of [3, 16, 30])
      for (const reverse of [false, true]) {
        const points = Array.from({ length: 61 }, (_, i) =>
          point(0, 0.03, 0.32 - (i * 0.32) / 60),
        );
        if (reverse) points.reverse();
        let prev = points[0];
        for (const next of points.slice(1)) {
          const forward = next.clone().sub(prev).normalize();
          const r = resolveMotion(prev, next, {
            colliders: o.colliders,
            length,
            radius: bodyRadius(length),
            forward,
            floorHeight: o.heightAt,
          });
          assert.equal(r.stuck, false);
          assert.ok(
            new T.Vector3(r.position.x, r.position.y, r.position.z).distanceTo(
              next,
            ) < 0.01,
            `${length}m ${reverse} ${next.toArray()}`,
          );
          prev = next;
        }
      }
    // 检查真实船面质心，而不是只验证预设路线：小球不能穿透大多数可见船板。
    const p = m.geometry.attributes.position,
      idx = m.geometry.index;
    let checked = 0,
      blocked = 0;
    for (let i = 0; i < idx.count; i += 231) {
      if (i + 2 >= idx.count) break;
      const c = new T.Vector3();
      for (let j = 0; j < 3; j++)
        c.add(new T.Vector3().fromBufferAttribute(p, idx.getX(i + j)));
      c.multiplyScalar(1 / 3).applyMatrix4(m.matrixWorld);
      checked++;
      if (isPositionBlocked(c, { colliders: o.colliders, radius: 0.05 }))
        blocked++;
    }
    assert.equal(blocked, checked);
    // 船底不能被海床大块切穿。允许泥沙覆盖最底部 0.35 米。
    let minGap = Infinity;
    for (let i = 0; i < p.count; i++) {
      const v = new T.Vector3()
        .fromBufferAttribute(p, i)
        .applyMatrix4(m.matrixWorld);
      minGap = Math.min(minGap, v.y - o.heightAt(v.x, v.z));
    }
    assert.ok(minGap >= -0.351);
  } finally {
    o.dispose();
  }
});
test("ruin materials retain real fallback colours; detail hysteresis and local ownership survive two maps", () => {
  const ownedA = new Set(),
    ownedB = new Set(),
    a = createOdysseyRuinsAssets((r) => (ownedA.add(r), r)),
    b = createOdysseyRuinsAssets((r) => (ownedB.add(r), r));
  const hits = new Map();
  for (const r of ownedA)
    r.addEventListener?.("dispose", () => hits.set(r, (hits.get(r) || 0) + 1));
  for (const kind of ["column", "galley"]) {
    assert.notEqual(a[kind].geometry, b[kind].geometry);
    assert.ok(a[kind].geometry.attributes.color.count > 0);
    assert.ok(a[kind].farGeometry.index.count < a[kind].geometry.index.count);
    const mesh = createOdysseyRuinMesh(a[kind], kind, 300);
    mesh.userData.updateDetail(new T.Vector3(400, 0, 0));
    assert.equal(mesh.geometry, a[kind].farGeometry);
    mesh.userData.updateDetail(new T.Vector3(290, 0, 0));
    assert.equal(mesh.geometry, a[kind].farGeometry);
    mesh.userData.updateDetail(new T.Vector3(200, 0, 0));
    assert.equal(mesh.geometry, a[kind].geometry);
  }
  for (const r of ownedA) r.dispose();
  for (const n of hits.values()) assert.equal(n, 1);
  assert.equal(b.column.prepare.state, "idle");
  for (const r of ownedB) r.dispose();
});
