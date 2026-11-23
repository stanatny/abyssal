import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createBermudaOilRig } from "../src/bermuda_oil_rig.js";
import { bermudaMaterials } from "../src/bermuda_geometry.js";
import { isPositionBlocked } from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";

const ocean = createBermudaOcean(new T.Group()),
  owned = new Set(),
  keep = (resource) => (owned.add(resource), resource),
  rig = createBermudaOilRig(
    bermudaMaterials(keep),
    keep,
    ocean.contactSurface,
    [-45, 4, -1100],
  ),
  contacts = [...ocean.colliders, ...rig.colliders],
  films = ocean.caves.props.approachFilms,
  merged = ocean.caves.root.getObjectByName("cave_biological_seams");
after(() => {
  ocean.dispose();
  for (const resource of owned) resource.dispose();
  rig.root.clear();
});
const hash = (value) =>
    createHash("sha256").update(JSON.stringify(value)).digest("hex"),
  normalize = (c) => ({
    id: c.id,
    type: c.type,
    x: c.x,
    y: c.y,
    z: c.z,
    radius: c.radius,
    halfSize: c.halfSize?.toArray(),
    rotation: c.rotation?.toArray?.() ?? c.rotation,
  });

test("Seven sparse seabed films reuse the existing merged draw between the liner stern and actual north entrance", () => {
  assert.equal(films.length, 7);
  assert.equal(new Set(films.map((row) => row.id)).size, 7);
  assert.equal(merged.material.name, "cave_biological_films");
  assert.equal(merged.userData.terrainContact, undefined);
  let draws = 0,
    lights = 0;
  ocean.caves.root.traverse((m) => {
    if (m.name === "cave_biological_seams") draws++;
    if (m.isLight) lights++;
  });
  assert.equal(draws, 1, "all hints share the existing single material/draw");
  assert.equal(lights, 0);
  assert.equal(ocean.caves.lightSources.length, 9);
  assert.ok(films[0].z < -970 && films[0].z > -990);
  assert.ok(Math.hypot(films.at(-1).x + 85, films.at(-1).z + 1415) < 40);
  for (let i = 0; i < films.length; i++) {
    const row = films[i];
    assert.ok(row.firstVertex >= 200, "old wall-film vertices remain first");
    assert.ok(row.length >= 5 && row.length <= 6);
    assert.ok(row.width >= 0.5 && row.width < 0.8);
    if (i) {
      const before = films[i - 1];
      assert.ok(before.z - row.z > 30 && before.z - row.z < 100);
      assert.ok(
        Math.hypot(before.x - row.x, before.z - row.z) > 5 * row.length,
        "isolated short patches leave dark water between them",
      );
    }
  }
  assert.ok(
    films.reduce((count, row) => count + row.indexCount / 3, 0) < 1500,
    "bounded geometry adds no per-patch draw",
  );
});

test("Every actual film triangle stays on the rendered floor and outside the liner, rig and full world solids", () => {
  const positions = merged.geometry.attributes.position,
    index = merged.geometry.index,
    a = new T.Vector3(),
    b = new T.Vector3(),
    c = new T.Vector3(),
    center = new T.Vector3();
  let checked = 0,
    minimum = Infinity,
    maximum = -Infinity;
  const clear = (point) =>
    assert.equal(
      isPositionBlocked(point, {
        radius: 0.025,
        colliders: queryStaticColliders(contacts, point, point, {
          radius: 0.025,
        }),
      }),
      false,
      `film covered by a real world solid: ${point.toArray()}`,
    );
  for (const row of films) {
    for (let v = row.firstVertex; v < row.firstVertex + row.vertexCount; v++) {
      a.fromBufferAttribute(positions, v);
      const gap = a.y - ocean.contactSurface(a.x, a.z);
      assert.ok(
        Math.abs(gap - 0.08) < 0.001,
        `Float32 decal/floor gap: ${gap} / ${a.toArray()}`,
      );
      clear(a);
    }
    for (let i = row.firstIndex; i < row.firstIndex + row.indexCount; i += 3) {
      a.fromBufferAttribute(positions, index.getX(i));
      b.fromBufferAttribute(positions, index.getX(i + 1));
      c.fromBufferAttribute(positions, index.getX(i + 2));
      center
        .copy(a)
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);
      const gap = center.y - ocean.contactSurface(center.x, center.z);
      minimum = Math.min(minimum, gap);
      maximum = Math.max(maximum, gap);
      assert.ok(
        gap > 0.015 && gap < 0.16,
        `actual decal facet must neither bury nor float: ${gap} / ${center.toArray()}`,
      );
      clear(center);
      checked++;
    }
  }
  assert.ok(checked > 1000);
  console.log(JSON.stringify({ filmTriangles: checked, minimum, maximum }));
});

test("The accepted single-entrance and joined-den cave retains its exact solids and shell snapshot", () => {
  // 当前已验收的单入口、接枝巢室与洞口照明基线；贴膜仍不得生成实体或海床。
  assert.equal(ocean.caves.colliders.length, 34956);
  assert.ok(
    ocean.caves.colliders.every(
      (contact) => !contact.id.includes("approach_film"),
    ),
  );
  assert.notEqual(merged.userData.terrainContact, true);
  assert.equal(
    hash(ocean.caves.colliders.map(normalize)),
    "e2e1d4304053a310f923b2f29a9a9619a9d23628f6b750a7c0f0abcf367f72f4",
  );
  assert.deepEqual(
    ocean.caves.records.map((row) => ({
      id: row.id,
      positions: hash(Array.from(row.shell.geometry.attributes.position.array)),
      index: hash(Array.from(row.shell.geometry.index.array)),
    })),
    [
      {
        id: "kaiju_lair",
        positions:
          "eba1b32aed96f700c110601190fb96a836162421780fd1725fd7b61b74f54912",
        index:
          "86f5ec94ad2eae2b4257086513798407daa013dd4d688c30ad5dbd379bb70088",
      },
      {
        id: "luminous_grotto",
        positions:
          "575ccb4eb51694c27466d853d01828e2e64e66ffb8bf25bf8f3ca39c13e98d40",
        index:
          "1df93d1d549ae105a0acaba751c1b8bff0758f86a488ba2ed8513b192d724eb5",
      },
      {
        id: "fossil_passage",
        positions:
          "77b2326b592288bd33663359579704299dd392a6f53c3e0e12572c8cd8d5d101",
        index:
          "1df93d1d549ae105a0acaba751c1b8bff0758f86a488ba2ed8513b192d724eb5",
      },
    ],
  );
});
