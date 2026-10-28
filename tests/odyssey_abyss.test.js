import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createOdysseyOcean } from "../src/odyssey_ocean.js";
import {
  isPositionBlocked,
  resolveMotion,
  bodyRadius,
} from "../src/collision.js";
import { ODYSSEY_BOSS_INSTANCES } from "../src/odyssey_lords.js";

test("abyss scenery follows complete seabed footprints and blocks its actual visible surfaces", () => {
  const o = createOdysseyOcean(new T.Group());
  try {
    assert.equal(o.abyss.meshes.length, 8);
    for (const r of o.abyss.records) {
      const m = r.mesh,
        p = r.near.attributes.position,
        idx = r.near.index;
      let min = Infinity,
        low = 0,
        checked = 0;
      for (let i = 0; i < p.count; i++) {
        const v = new T.Vector3().fromBufferAttribute(p, i).add(m.position),
          gap = v.y - o.heightAt(v.x, v.z);
        min = Math.min(min, gap);
        if (gap < 0.5) low++;
        assert.ok(Number.isFinite(v.y));
      }
      assert.ok(min >= -r.burial - 0.001 && min < 0.5, m.name);
      assert.ok(low > 0, m.name);
      for (let i = 0; i < idx.count - 2; i += 147) {
        const c = new T.Vector3();
        for (let j = 0; j < 3; j++)
          c.add(new T.Vector3().fromBufferAttribute(p, idx.getX(i + j)));
        c.multiplyScalar(1 / 3).add(m.position);
        if (c.y < o.heightAt(c.x, c.z)) continue;
        assert.ok(
          isPositionBlocked(c, { colliders: o.colliders, radius: 0.06 }),
          `${m.name}:${i}`,
        );
        checked++;
      }
      assert.ok(checked > 30);
      for (const g of [r.near, r.far]) {
        const n = g.attributes.normal;
        for (let i = 0; i < n.count; i++)
          assert.ok(new T.Vector3().fromBufferAttribute(n, i).length() > 0.98);
      }
    }
  } finally {
    o.dispose();
  }
});

test("new scenery leaves adult approach/retreat lanes and lord patrol centres open", () => {
  const o = createOdysseyOcean(new T.Group());
  try {
    for (const b of ODYSSEY_BOSS_INSTANCES) {
      assert.ok(
        !isPositionBlocked(new T.Vector3(...b.home), {
          colliders: o.colliders.filter(
            (c) => c.kind === "odyssey_abyss_solid",
          ),
          radius: 20,
        }),
        b.kind,
      );
    }
    for (const [x, z] of [
      [-200, -1170],
      [190, -1430],
      [65, -1500],
    ])
      for (const sign of [1, -1]) {
        const points = Array.from({ length: 81 }, (_, i) => {
          const zz = z - 90 + (i * 180) / 80;
          return new T.Vector3(x + 55, o.heightAt(x + 55, zz) + 40, zz);
        });
        if (sign < 0) points.reverse();
        let prev = points[0];
        for (const next of points.slice(1)) {
          const r = resolveMotion(prev, next, {
            colliders: o.colliders,
            length: 30,
            radius: bodyRadius(30),
            floorHeight: o.heightAt,
            forward: next.clone().sub(prev).normalize(),
          });
          assert.ok(
            !r.stuck &&
              new T.Vector3(
                r.position.x,
                r.position.y,
                r.position.z,
              ).distanceTo(next) < 0.1,
            `${x} ${z} ${next.toArray()}`,
          );
          prev = next;
        }
      }
  } finally {
    o.dispose();
  }
});

test("abyss near/far choices and all owned resources are independent across map lifetimes", () => {
  const a = createOdysseyOcean(new T.Group()),
    b = createOdysseyOcean(new T.Group()),
    hits = new Map();
  for (const r of a.abyss.records) {
    for (const g of [r.near, r.far]) {
      hits.set(g, 0);
      g.addEventListener("dispose", () => hits.set(g, hits.get(g) + 1));
    }
    r.update(r.mesh.position.clone().addScalar(600), true);
    assert.equal(r.mesh.geometry, r.far);
    r.update(r.mesh.position.clone(), true);
    assert.equal(r.mesh.geometry, r.near);
  }
  for (const asset of Object.values(a.abyss.assets))
    for (const r of [
      asset.geometry,
      asset.farGeometry,
      asset.material,
      asset.farMaterial,
    ]) {
      hits.set(r, 0);
      r.addEventListener("dispose", () => hits.set(r, hits.get(r) + 1));
    }
  a.dispose();
  a.dispose();
  assert.ok([...hits.values()].every((n) => n === 1));
  assert.ok(b.abyss.meshes.every((m) => m.parent === b.root));
  b.dispose();
});
