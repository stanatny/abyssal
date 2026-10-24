import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createBermudaGeology } from "../src/bermuda_geology.js";
import { acquireBermudaGeologyAsset } from "../src/bermuda_geology_asset.js";
import { bermudaSeabedHeight as heightAt } from "../src/bermuda_terrain.js";
import { isPositionBlocked } from "../src/collision.js";
const options = { heightAt };
test("Bermuda geology preserves every non-geology solid and all original placement counts", () => {
  const ocean = createBermudaOcean(new T.Group());
  const unchanged = ocean.colliders.filter(
    (c) =>
      !/^(reef_arch_|trench_arch_|bermuda_spire_|bermuda_rock_)/.test(
        c.id || "",
      ),
  );
  assert.equal(
    createHash("sha256").update(JSON.stringify(unchanged)).digest("hex"),
    "6077e9f955b7e8ed0781bd1a63f999ea459e81d043a5aefe3f35f39567cdca9a",
  );
  const deep = ocean.root.getObjectByName("bermuda_exploration_biomes").userData
      .geologyArt,
    shelf = ocean.root.userData.shelfArt;
  assert.equal(deep.arches.length, 2);
  assert.equal(deep.batches[0].matrices.length, 28);
  assert.equal(shelf.batches[0].matrices.length, 60);
  ocean.dispose();
});
test("Geology surfaces are backed by local solids and seated on the actual seabed", () => {
  for (const shelf of [false, true]) {
    const art = createBermudaGeology(new T.Group(), { heightAt, shelf }),
      p = new T.Vector3();
    for (const b of art.batches)
      for (let k = 0; k < b.matrices.length; k++) {
        const boxes = art.colliders.filter(
          (c) =>
            c.id.startsWith(`bermuda_${b.kind}_${k}_`) ||
            c.id === `bermuda_${b.kind}_${k}`,
        );
        let low = Infinity;
        for (let i = 0; i < b.near.geometry.attributes.position.count; i += 7) {
          p.fromBufferAttribute(
            b.near.geometry.attributes.position,
            i,
          ).applyMatrix4(b.matrices[k]);
          low = Math.min(low, p.y - heightAt(p.x, p.z));
          if (p.y > heightAt(p.x, p.z))
            assert.ok(isPositionBlocked(p, { radius: 0.02, colliders: boxes }));
        }
        assert.ok(low < 1);
      }
    for (const row of art.arches) {
      const p = row.meshes[0].geometry.attributes.position;
      for (let i = 0; i < p.count; i += 7) {
        const v = new T.Vector3().fromBufferAttribute(p, i);
        if (v.y > heightAt(v.x, v.z))
          assert.ok(
            isPositionBlocked(v, { radius: 0.05, colliders: art.colliders }),
          );
      }
    }
    art.dispose();
  }
});
test("Both reef arches retain an adult-width route through the full final collision set", () => {
  const ocean = createBermudaOcean(new T.Group()),
    a = ocean.root.getObjectByName("bermuda_exploration_biomes").userData
      .geologyArt,
    p = new T.Vector3();
  for (const row of a.arches) {
    let found = false;
    for (let d = 10; d < 35; d++) {
      const y0 = heightAt(row.x, row.z - 24) + d,
        y1 = heightAt(row.x, row.z + 24) + d;
      let clear = true;
      for (let z = row.z - 24; z <= row.z + 24; z++) {
        p.set(row.x, y0 + ((y1 - y0) * (z - row.z + 24)) / 48, z);
        if (
          p.y - heightAt(p.x, p.z) < 9 ||
          isPositionBlocked(p, { radius: 9, colliders: ocean.colliders })
        ) {
          clear = false;
          break;
        }
      }
      if (clear) {
        found = true;
        break;
      }
    }
    assert.ok(found, row.id);
  }
  ocean.dispose();
});
test("Geology detail state is instance-local; shared buffers are released once after the last owner", () => {
  const parent = new T.Group(),
    lease = acquireBermudaGeologyAsset("spire"),
    a = createBermudaGeology(parent, options),
    b = createBermudaGeology(parent, options);
  let disposed = 0;
  lease.geometry.addEventListener("dispose", () => disposed++);
  const point = new T.Vector3().setFromMatrixPosition(a.batches[0].matrices[0]);
  a.update(0, point);
  assert.equal(a.batches[0].close[0], 1);
  assert.equal(b.batches[0].close[0], 0);
  for (const batch of a.batches)
    assert.equal(batch.near.count + batch.far.count, batch.matrices.length);
  a.dispose();
  a.dispose();
  b.dispose();
  assert.equal(parent.children.length, 0);
  assert.equal(disposed, 0);
  lease.release();
  lease.release();
  assert.equal(disposed, 1);
});
