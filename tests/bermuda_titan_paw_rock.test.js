import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { createBermudaTitanPawRock } from "../src/bermuda_titan_paw_rock.js";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";
import { isPositionBlocked, castBodySegment } from "../src/collision.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createBermudaWholeWristSeatSampledCandidate } from "./fixtures/bermuda_paw_reference/actor.js";
import { createWholeWristSupports } from "./fixtures/bermuda_paw_reference/supports_original.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import fit from "../src/assets/models/bermuda_titan_paw_jewel_fit.json" with { type: "json" };

let actor,
  rock,
  original,
  oldSurface,
  terrainMesh,
  baseHeight,
  scene,
  parent,
  grid;
const point = new THREE.Vector3(),
  triangle = new THREE.Triangle();
const hash = (array) =>
  createHash("sha256")
    .update(Buffer.from(array.buffer, array.byteOffset, array.byteLength))
    .digest("hex");
before(() => {
  scene = new THREE.Group();
  parent = new THREE.Group();
  terrainMesh = new THREE.Mesh(createBermudaTerrainMesh());
  terrainMesh.userData.terrainContact = true;
  baseHeight = createTerrainSurface(terrainMesh, {
    fallback: bermudaSeabedHeight,
  });
  actor = createBermudaWholeWristSeatSampledCandidate(scene, {
    heightAt: baseHeight,
  });
  original = createWholeWristSupports(new THREE.Group(), {
    near: actor.near,
    pose: actor.pose,
    setPose: actor.setPose,
    heightAt: baseHeight,
  });
  original.body.userData.terrainContact = true;
  oldSurface = createTerrainSurface(original.body, { fallback: baseHeight });
  const started = performance.now();
  rock = createBermudaTitanPawRock(parent, {
    near: actor.near,
    pose: actor.pose,
    setPose: actor.setPose,
    heightAt: baseHeight,
  });
  grid = createStaticColliderGrid(rock.contacts, {
    cellSize: 8,
    maxCellsPerCollider: 4096,
  });
  console.log(
    JSON.stringify({
      constructionMs: performance.now() - started,
      vertices: rock.mesh.geometry.attributes.position.count,
      triangles: rock.mesh.geometry.index.count / 3,
      contacts: rock.contacts.length,
      fit: rock.metadata.contactFit,
      positionsSHA: hash(rock.mesh.geometry.attributes.position.array),
      indicesSHA: hash(rock.mesh.geometry.index.array),
    }),
  );
});
after(() => {
  rock?.dispose();
  oldSurface?.dispose();
  original?.dispose();
  actor?.dispose();
  baseHeight?.dispose();
  terrainMesh?.geometry.dispose();
  terrainMesh?.material.dispose();
});

function contains(contact, p) {
  if (contact.type === "capsule") {
    const nearest = new THREE.Line3(contact.a, contact.b).closestPointToPoint(
      p,
      true,
      new THREE.Vector3(),
    );
    return nearest.distanceTo(p) <= contact.radius + 1e-7;
  }
  return (
    Math.abs(contact.x - p.x) <= contact.halfSize.x + 1e-7 &&
    Math.abs(contact.y - p.y) <= contact.halfSize.y + 1e-7 &&
    Math.abs(contact.z - p.z) <= contact.halfSize.z + 1e-7
  );
}

test("Physical source geometry exactly ports the accepted south channel and jewel while visible floor copies are removed", () => {
  const accepted = actor.beds[0].mesh.geometry,
    actual = rock.sourceGeometry;
  assert.equal(
    rock.mesh.geometry.attributes.position,
    actual.attributes.position,
  );
  assert.ok(rock.mesh.geometry.index.count < actual.index.count);
  assert.equal(
    hash(actual.attributes.position.array),
    hash(accepted.attributes.position.array),
  );
  assert.equal(hash(actual.index.array), hash(accepted.index.array));
  assert.equal(
    hash(actual.attributes.normal.array),
    hash(accepted.attributes.normal.array),
  );
  assert.ok(rock.relicPoint.distanceTo(actor.relicPoint) < 1e-9);
  assert.ok(rock.relicQuaternion.angleTo(actor.relicQuaternion) < 1e-9);
  assert.deepEqual(parent.children, [rock.mesh]);
  parent.traverse((object) => assert.ok(!object.isLight));
  assert.equal(rock.mesh.material.color.getHex(), 0x4b5b60);
  assert.equal(rock.mesh.material.roughness, 0.96);
  assert.equal(fit.heightShift, 1.0417396018960745);
  assert.equal(rock.metadata.sourceHeightFit, 0.1433027935343351);
  assert.ok(
    Math.abs(rock.metadata.crystalTopGap - (1.2 - fit.heightShift)) < 1e-12,
  );
  assert.equal(actor.root.userData.guardAmount, 1);
});

test("Measured seat-corner leaves retain complete columns without box-radius false contact", () => {
  const columns = rock.contacts.filter((c) => c.type === "capsule");
  const expectedLeaves = [6695, 6696, 6814, 6815, 6932, 6933, 7050, 7051].map(
    (id) => `titan_paw_rock_${id}`,
  );
  assert.equal(
    rock.metadata.contactFit.exactColumnLeaves,
    expectedLeaves.length,
  );
  assert.deepEqual(
    [...new Set(columns.map((c) => c.sourceLeaf))],
    expectedLeaves,
  );
  assert.ok(columns.length > 1 && columns.length < 1000);
  assert.equal(columns.length, rock.metadata.contactFit.exactColumnCapsules);
  assert.ok(rock.metadata.contactFit.maximumColumnEnvelope < 2);
  for (const c of columns) {
    assert.ok(expectedLeaves.includes(c.sourceLeaf));
    assert.ok(c.radius < 0.36);
    assert.ok(c.maximumEnvelope < 2);
    // 胶囊为凸集；包含每片三角的三顶点和三底点即包含完整可见实柱。
    for (const p of c.sourceTopTriangle) {
      assert.ok(contains(c, new THREE.Vector3(...p)));
      assert.ok(contains(c, new THREE.Vector3(p[0], c.a.y, p[2])));
    }
  }
  const previous = new THREE.Vector3(
      -198.4,
      -615.5995080528816,
      -1642.641271884381,
    ),
    desired = new THREE.Vector3(-198.4, -615.5995079883778, -1642.441271884381),
    body = {
      radius: 3.9,
      length: 30,
      forward: { x: 0, y: 0, z: 1 },
    },
    previousBox = {
      type: "box",
      x: -201.5,
      y: -626.0131929878146,
      z: -1629.6428833007812,
      halfSize: new THREE.Vector3(0.52, 6.536459589377046, 0.37711669921875),
      rotation: new THREE.Quaternion(),
    };
  assert.equal(
    isPositionBlocked(desired, { ...body, colliders: [previousBox] }),
    true,
  );
  assert.equal(
    isPositionBlocked(desired, { ...body, colliders: columns }),
    false,
  );
  assert.equal(
    castBodySegment(previous, desired, { ...body, colliders: columns }),
    null,
  );
});

test("Critical seat sampling keeps all original control vertices outside the approved channel, and preserves true support", () => {
  const old = original.body.geometry,
    geometry = rock.mesh.geometry,
    p = geometry.attributes.position,
    op = old.attributes.position,
    count = rock.metadata.topVertices;
  const oldSamples = new Map();
  for (let i = 0; i < op.count; i++)
    oldSamples.set(
      [op.getX(i), op.getZ(i), i >= original.metadata.topVertices].join("/"),
      op.getY(i),
    );
  let changedOriginal = 0,
    maximumLowering = 0;
  for (let i = 0; i < p.count; i++) {
    const oldY = oldSamples.get([p.getX(i), p.getZ(i), i >= count].join("/"));
    if (oldY === undefined) continue;
    const delta = oldY - p.getY(i);
    assert.ok(delta >= 0);
    if (i >= count) assert.equal(delta, 0);
    if (delta > 1e-6) {
      changedOriginal++;
      maximumLowering = Math.max(maximumLowering, delta);
    }
  }
  assert.ok(changedOriginal > 0 && changedOriginal <= 266);
  assert.ok(maximumLowering > 8 && maximumLowering < 8.5);
  const dzPeak = (-6.8 * 4) / 7,
    rows = [];
  for (let i = 0; i < count; i++)
    if (
      Math.abs(p.getX(i) - rock.relicPoint.x) < 1e-4 &&
      Math.abs(p.getZ(i) - rock.relicPoint.z - dzPeak) < 1e-4
    )
      rows.push(p.getY(i));
  assert.equal(rows.length, 1);
  assert.ok(rows[0] > -619.2 && rows[0] < -619.05);
  const originalFloor = (x, z) => Math.max(baseHeight(x, z), oldSurface(x, z)),
    map = new Map(actor.sourceVertexIds.map((raw, i) => [raw, i]));
  for (const raw of [12191, 13382, 31925, 125]) {
    actor.near
      .getVertexPosition(map.get(raw), point)
      .applyMatrix4(actor.near.matrixWorld);
    const now = rock.floorSurface(point.x, point.z),
      before = originalFloor(point.x, point.z);
    assert.ok(Math.abs(now - before) < 0.00002);
    assert.ok(
      point.y - now >= 0 && point.y - now < 0.35,
      `Lost true bearing raw${raw}`,
    );
  }
  const jewel = createBermudaTitanRelic();
  try {
    const positions = jewel.root.children[0].geometry.attributes.position;
    let nearest = Infinity;
    for (let i = 0; i < positions.count; i++) {
      point
        .fromBufferAttribute(positions, i)
        .applyQuaternion(rock.relicQuaternion)
        .add(rock.relicPoint);
      const now = rock.floorSurface(point.x, point.z),
        before = originalFloor(point.x, point.z);
      assert.equal(now, before, `Changed original jewel support at vertex${i}`);
      nearest = Math.min(nearest, point.y - now);
    }
    assert.ok(nearest > 0.099 && nearest < 0.101);
  } finally {
    jewel.dispose();
  }
});

test("All real top triangles and their full solid columns have fitted contact coverage", () => {
  // 可见index可剔除重复海床；完整物理源仍必须逐片覆盖，不能减少检查数。
  const geometry = rock.sourceGeometry,
    position = geometry.attributes.position,
    index = geometry.index,
    count = rock.metadata.topVertices,
    samples = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];
  let checked = 0;
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (ids.some((id) => id >= count)) continue;
    ids.forEach((id, j) => samples[j].fromBufferAttribute(position, id));
    samples[3]
      .copy(samples[0])
      .add(samples[1])
      .add(samples[2])
      .multiplyScalar(1 / 3);
    for (const p of samples) {
      assert.ok(
        grid.query(p).some((c) => contains(c, p)),
        `Uncovered top face ${i / 3} at ${p.toArray()}`,
      );
      point.copy(p);
      point.y -= 1;
      assert.ok(
        grid.query(point).some((c) => contains(c, point)),
        `Uncovered interior face ${i / 3}`,
      );
      assert.ok(Math.abs(rock.topAt(p.x, p.z) - p.y) < 0.00001);
      checked++;
    }
  }
  assert.equal(checked, rock.metadata.contactFit.sourceQuads * 8);
  assert.ok(
    rock.contacts.length < 40000,
    "Adaptive structured fitting must not become a blanket one metre grid",
  );
  assert.ok(rock.metadata.contactFit.maxEnvelope < 2);
  assert.ok(
    rock.metadata.contactFit.splits > 0,
    "The steep seated edge must actually be refined",
  );
});

test("Fitted exterior top corners remain within two metres of actual mesh or original terrain", () => {
  // 接触拟合的严格2m合同针对未改动的完整源三角，不把裁片误当丢失实体。
  const geometry = rock.sourceGeometry,
    position = geometry.attributes.position,
    index = geometry.index,
    count = rock.metadata.topVertices,
    triangles = [],
    buckets = new Map(),
    size = 8,
    nearest = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (ids.some((id) => id >= count)) continue;
    const row = ids.map((id) =>
      new THREE.Vector3().fromBufferAttribute(position, id),
    );
    const id = triangles.push(row) - 1;
    for (
      let x = Math.floor(Math.min(...row.map((p) => p.x)) / size);
      x <= Math.floor(Math.max(...row.map((p) => p.x)) / size);
      x++
    )
      for (
        let z = Math.floor(Math.min(...row.map((p) => p.z)) / size);
        z <= Math.floor(Math.max(...row.map((p) => p.z)) / size);
        z++
      ) {
        const key = x + "/" + z;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(id);
      }
  }
  let worst = 0,
    checked = 0;
  for (const contact of rock.contacts) {
    const samples = [];
    if (contact.type === "capsule") {
      for (const origin of [contact.a, contact.b])
        for (const latitude of [-Math.PI / 2, 0, Math.PI / 4, Math.PI / 2])
          for (let angle = 0; angle < 16; angle++) {
            const theta = (angle * Math.PI * 2) / 16;
            samples.push(
              new THREE.Vector3(
                origin.x +
                  Math.cos(theta) * Math.cos(latitude) * contact.radius,
                origin.y + Math.sin(latitude) * contact.radius,
                origin.z +
                  Math.sin(theta) * Math.cos(latitude) * contact.radius,
              ),
            );
          }
    } else
      for (const sx of [-1, 0, 1])
        for (const sz of [-1, 0, 1])
          samples.push(
            new THREE.Vector3(
              contact.x + sx * contact.halfSize.x,
              contact.y + contact.halfSize.y,
              contact.z + sz * contact.halfSize.z,
            ),
          );
    for (const sample of samples) {
      point.copy(sample);
      if (point.y <= baseHeight(point.x, point.z)) continue;
      if (
        contact.type === "capsule" &&
        point.y <= rock.topAt(point.x, point.z) + 1e-8
      )
        continue;
      let distance = Infinity;
      const candidates = new Set();
      for (
        let x = Math.floor((point.x - 2) / size);
        x <= Math.floor((point.x + 2) / size);
        x++
      )
        for (
          let z = Math.floor((point.z - 2) / size);
          z <= Math.floor((point.z + 2) / size);
          z++
        )
          for (const id of buckets.get(x + "/" + z) ?? []) candidates.add(id);
      for (const id of candidates) {
        triangle.set(...triangles[id]);
        triangle.closestPointToPoint(point, nearest);
        distance = Math.min(distance, point.distanceTo(nearest));
      }
      assert.ok(
        distance < 2,
        `Invisible exterior ${distance} m at ${contact.id} / ${point.toArray()}`,
      );
      worst = Math.max(worst, distance);
      checked++;
    }
  }
  console.log(
    JSON.stringify({
      exteriorChecked: checked,
      maximumMeasuredDistance: worst,
    }),
  );
  assert.ok(checked > 1000);
});

test("Actual ground/support uses the larger original/ledge surface and all private resources dispose once", () => {
  for (const [x, z] of [
    [-200.4, -1625],
    [-170, -1625],
    [-300, -1590],
    [-470, -1690],
    [-100, -1450],
  ]) {
    assert.equal(
      rock.floorSurface(x, z),
      Math.max(baseHeight(x, z), rock.topAt(x, z)),
    );
    for (const radius of [0, 1.2, 3.9])
      assert.equal(
        rock.floorSurface.supportHeight(x, z, radius),
        Math.max(
          baseHeight.supportHeight(x, z, radius),
          rock.topAt.supportHeight(x, z, radius),
        ),
      );
  }
  let geometryDisposals = 0,
    materialDisposals = 0;
  rock.mesh.geometry.addEventListener("dispose", () => geometryDisposals++);
  rock.mesh.material.addEventListener("dispose", () => materialDisposals++);
  rock.dispose();
  rock.dispose();
  assert.equal(geometryDisposals, 1);
  assert.equal(materialDisposals, 1);
  assert.equal(parent.children.length, 0);
  assert.equal(rock.floorSurface.stats.disposed, true);
  assert.equal(rock.floorSurface.stats.retainedTypedArrayBytes, 0);
  assert.ok(Number.isFinite(rock.floorSurface(-100, -1450)));
});
