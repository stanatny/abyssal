import assert from "node:assert/strict";
import test from "node:test";
import * as T from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";

test("Awakening preserves planted body and rigid trident while rotating the gripping arm; no seam spikes", () => {
  const scene = new T.Scene(),
    city = createAtlantisCity(scene, { heightAt: atlantisSeabedHeight });
  try {
    const a = city.poseidon,
      m = a.mesh,
      p = m.geometry.attributes.position;
    const sample = () => {
      m.updateMatrixWorld(true);
      m.skeleton.update();
      return Array.from({ length: p.count }, (_, i) =>
        m.applyBoneTransform(i, new T.Vector3().fromBufferAttribute(p, i)),
      );
    };
    const initial = sample(),
      shaft = city.barriers.find((c) => c.kind === "poseidon_trident_shaft"),
      old = structuredClone(shaft);
    a.awaken();
    a.update(0);
    assert.equal(a.progress, 0);
    for (let f = 0; f < 50; f++) a.update(0.1);
    const final = sample(),
      delta = final
        .find((v, i) => p.getY(i) > 70)
        .clone()
        .sub(initial.find((v, i) => p.getY(i) > 70));
    assert.ok(delta.y > 3);
    for (let i = 0; i < p.count; i++) {
      assert.ok(final[i].toArray().every(Number.isFinite));
      if (p.getY(i) < 35 && p.getX(i) > -8)
        assert.ok(final[i].distanceTo(initial[i]) < 1e-4);
      if (p.getY(i) > 69)
        assert.ok(final[i].clone().sub(initial[i]).distanceTo(delta) < 1e-4);
    }
    const index = m.geometry.index.array;
    for (let i = 0; i < index.length; i += 3)
      for (let j = 0; j < 3; j++) {
        const u = index[i + j],
          v = index[i + ((j + 1) % 3)];
        assert.ok(
          final[u].distanceTo(final[v]) - initial[u].distanceTo(initial[v]) <
            2.2,
          "no discontinuous skin spike",
        );
      }
    assert.ok(shaft.a.y > old.a.y + 4);
    assert.ok(Math.abs(shaft.b.y - shaft.a.y - (old.b.y - old.a.y)) < 1e-6);
    assert.equal(
      city.colliders.some((c) => c.kind === "poseidon_trident_shaft"),
      false,
    );
    const fixed = JSON.stringify(city.colliders),
      frozen = JSON.stringify(city.barriers);
    a.update(0);
    assert.equal(JSON.stringify(city.barriers), frozen);
    assert.equal(JSON.stringify(city.colliders), fixed);
    a.reset();
    assert.equal(a.progress, 0);
    assert.equal(a.eyes[0].material.opacity, 0);
    sample().forEach((v, i) => assert.ok(v.distanceTo(initial[i]) < 1e-5));
  } finally {
    city.dispose();
  }
});
