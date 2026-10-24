import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { addMarianaResidents } from "../src/mariana_residents.js";
function fixture() {
  const root = new THREE.Group(),
    resources = [],
    colliders = [];
  const owner = addMarianaResidents(
    root,
    (r) => (resources.push(r), r),
    new THREE.Vector3(0, -2770, -460),
    colliders,
  );
  return {
    root,
    owner,
    colliders,
    dispose() {
      for (const r of resources) r.dispose();
    },
  };
}
function surface(f, t) {
  f.owner.update(t);
  f.root.updateMatrixWorld(true);
  return f.owner.instances.map((i) => {
    i.mesh.skeleton.update();
    return Array.from(
      { length: i.mesh.geometry.attributes.position.count },
      (_, n) =>
        i.mesh
          .applyBoneTransform(
            n,
            new THREE.Vector3().fromBufferAttribute(
              i.mesh.geometry.attributes.position,
              n,
            ),
          )
          .applyMatrix4(i.mesh.matrixWorld),
    );
  });
}
test("Resident skin moves appendages continuously while actual feet and bodies remain supported", () => {
  const f = fixture();
  try {
    const rest = surface(f, 0),
      motion = surface(f, 1.7);
    for (let i = 0; i < 3; i++) {
      const mesh = f.owner.instances[i].mesh,
        geo = mesh.geometry,
        weights = geo.attributes.skinWeight;
      let moved = 0,
        planted = 0;
      const locations = new Map();
      for (let n = 0; n < weights.count; n++) {
        const sum =
          weights.getX(n) + weights.getY(n) + weights.getZ(n) + weights.getW(n);
        assert.ok(Math.abs(sum - 1) < 1e-6);
        assert.ok(motion[i][n].toArray().every(Number.isFinite));
        const distance = motion[i][n].distanceTo(rest[i][n]);
        if (rest[i][n].y < 6.05) {
          assert.ok(distance < 1e-6);
          planted++;
        }
        if (distance > 0.02) moved++;
        const key = new THREE.Vector3()
          .fromBufferAttribute(geo.attributes.position, n)
          .toArray()
          .join(",");
        const old = locations.get(key);
        if (old)
          assert.ok(
            old.distanceTo(motion[i][n]) < 1e-7,
            "UV seams remain continuous",
          );
        else locations.set(key, motion[i][n]);
      }
      assert.ok(planted > 2);
      assert.ok(moved > 50);
      const size = new THREE.Box3()
        .setFromPoints(motion[i])
        .getSize(new THREE.Vector3());
      assert.ok(size.y > 5 && size.y < 13);
    }
    assert.deepEqual(surface(f, 1.7), motion, "identical paused clock");
  } finally {
    f.dispose();
  }
});
test("Resident instances share immutable assets but animate and release skeletons independently", () => {
  const a = fixture(),
    b = fixture(),
    disposed = new Map(),
    bones = [];
  for (let i = 0; i < 3; i++) {
    const x = a.owner.instances[i],
      y = b.owner.instances[i];
    assert.equal(x.mesh.geometry, y.mesh.geometry);
    assert.equal(x.mesh.material, y.mesh.material);
    assert.notEqual(x.mesh.skeleton, y.mesh.skeleton);
    const sk = x.mesh.skeleton,
      dispose = sk.dispose.bind(sk);
    const row = { count: 0 };
    bones.push(row);
    sk.dispose = () => {
      row.count++;
      dispose();
    };
  }
  for (const asset of a.owner.assets.values())
    for (const row of [asset, ...asset.details])
      for (const resource of [row.geometry, row.material]) {
        disposed.set(resource, 0);
        resource.addEventListener("dispose", () =>
          disposed.set(resource, disposed.get(resource) + 1),
        );
      }
  const before = surface(b, 0);
  surface(a, 2);
  assert.deepEqual(surface(b, 0), before);
  a.dispose();
  a.dispose();
  assert.ok(bones.every((x) => x.count === 1));
  assert.ok([...disposed.values()].every((n) => n === 0));
  b.dispose();
  b.dispose();
  assert.ok([...disposed.values()].every((n) => n === 1));
});
