import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { cityArchitecture } from "../src/atlantis_architecture.js";
import { atlantisMaterials } from "../src/atlantis_art_geometry.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import { createAtlantisResidentialInteriors } from "../src/atlantis_residential_interiors.js";
import {
  planAtlantisResidentialInteriors,
  residentialFootprintSamples,
  residentialWorldPoint,
} from "../src/atlantis_residential_layout.js";
import {
  bodyRadius,
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";

const city = createAtlantisCity(new THREE.Group(), {
  heightAt: atlantisSeabedHeight,
});
// 集成后也只使用家具添加前的宿主快照，避免测试自身的第二套陈设。
const hostColliders = city.colliders.filter(
  (collider) => collider.kind !== "residential_furniture",
);
const hostGrid = createStaticColliderGrid(hostColliders);
test.after(() => city.dispose());

test("All genuinely enterable street homes contain a carved bench and chest within the total cost budget", (t) => {
  const furniture = cityFixture(t);
  assert.ok(furniture.stats.eligibleHomes >= 100);
  assert.equal(furniture.stats.furnishedHomes, furniture.stats.eligibleHomes);
  assert.equal(
    furniture.stats.fullyFurnishedHomes,
    furniture.stats.eligibleHomes,
  );
  assert.equal(furniture.stats.placed.bench, furniture.stats.eligibleHomes);
  assert.equal(furniture.stats.placed.chest, furniture.stats.eligibleHomes);
  assert.ok(furniture.stats.placed.table >= 20);
  assert.ok(furniture.stats.placed.amphora >= 20);
  assert.equal(furniture.stats.dropped.length, 0);
  assert.ok(furniture.stats.triangles < 300_000);
  assert.ok(furniture.stats.meshes <= 35);
  assert.equal(furniture.stats.districts.length, 5);
  assert.equal(furniture.lightSources.length, 0);
  assert.equal(furniture.landmarks.length, furniture.stats.eligibleHomes);
  for (const home of furniture.stats.layouts) {
    assert.ok(
      home.groups.some((item) => item.kind === "bench"),
      home.id,
    );
    assert.ok(
      home.groups.some((item) => item.kind === "chest"),
      home.id,
    );
    assert.equal(home.access.maxTestedLength, 3);
    assert.equal(
      home.floorY,
      home.record.y + home.floorLocal * home.record.scale,
    );
  }
  const meshes = furnitureMeshes(furniture.root);
  assert.equal(meshes.length, furniture.stats.meshes);
  assert.equal(new Set(meshes.map((mesh) => mesh.material.uuid)).size, 7);
  assert.ok(meshes.every((mesh) => mesh.geometry.attributes.color));
  assert.ok(
    furniture.colliders.every((c) => c.kind === "residential_furniture"),
  );
});

test("Complete transformed furniture footprints rest on the real floor and remain above the shared seabed", (t) => {
  const furniture = cityFixture(t);
  for (const home of furniture.stats.layouts)
    for (const item of home.groups)
      for (const point of residentialFootprintSamples(item, 8)) {
        assert.ok(atlantisSeabedHeight(point.x, point.z) < item.floor, item.id);
        const a = { ...point, y: item.floor + 0.04 };
        const b = { ...point, y: item.floor - 0.08 };
        const support = castSegment(a, b, hostGrid.query(a, b));
        assert.ok(support, `${item.id}: full-footprint support`);
        assert.ok(Math.abs(support.point.y - item.floor) < 0.025, item.id);
      }
});

test("Final combined colliders preserve every listed juvenile doorway route in both directions at low and high speed", (t) => {
  const furniture = cityFixture(t);
  const grid = createStaticColliderGrid([
    ...hostColliders,
    ...furniture.colliders,
  ]);
  const query = (a, b, options) => grid.query(a, b, options);
  for (const home of furniture.stats.layouts)
    for (const reverse of [false, true])
      for (const steps of [1, 12]) {
        const route = reverse
          ? [...home.access.route].reverse()
          : home.access.route;
        for (let i = 1; i < route.length; i += 1) {
          const a = new THREE.Vector3().copy(route[i - 1]);
          const b = new THREE.Vector3().copy(route[i]);
          const forward = b.clone().sub(a).normalize();
          let position = a;
          for (let step = 1; step <= steps; step += 1) {
            const target = a.clone().lerp(b, step / steps);
            const result = resolveMotion(position, target, {
              colliders: query,
              radius: bodyRadius(3),
              length: 3,
              forward,
              floorHeight: (x, z) =>
                atlantisSeabedHeight(x, z) + bodyRadius(3) + 0.1,
            });
            assert.equal(result.stuck, false, home.id);
            assert.equal(result.blocked, false, home.id);
            assert.ok(
              new THREE.Vector3().copy(result.position).distanceTo(target) <
                0.025,
              home.id,
            );
            position = result.position;
          }
        }
      }
  for (const home of furniture.stats.layouts)
    for (let i = 0; i <= 64; i += 1) {
      const angle = (i * Math.PI) / 32;
      assert.equal(
        isPositionBlocked(home.access.turningCenter, {
          colliders: query,
          radius: bodyRadius(3),
          length: 3,
          forward: { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
        }),
        false,
        `${home.id}: continuous turn`,
      );
    }
});

test("Both ordinary house models and every furniture variant follow scale, yaw and elevated floor transforms", (t) => {
  for (const kind of ["courtyard", "villa"])
    for (const scale of [0.7, 0.82, 0.94])
      for (const rotation of [-Math.PI / 2, 0.47, Math.PI / 2])
        for (const variant of [0, 1, 2, 3]) {
          const record = syntheticRecord(kind, scale, rotation);
          const hosts = architectureColliders(record);
          const scene = new THREE.Group();
          const furniture = createAtlantisResidentialInteriors(scene, {
            records: [record],
            hostColliders: hosts,
            heightAt: () => -24,
            seed: variant,
          });
          t.after(() => furniture.dispose());
          assert.equal(furniture.stats.eligibleHomes, 1);
          assert.equal(furniture.stats.fullyFurnishedHomes, 1);
          assert.equal(furniture.stats.dropped.length, 0);
          const home = furniture.stats.layouts[0];
          assert.equal(home.variant, variant);
          assert.equal(home.groups.length, variant % 2 ? 2 : 3);
          assert.ok(
            home.groups.every((g) => g.scale === scale && g.yaw === rotation),
          );
          for (const item of home.groups) {
            const expected = residentialWorldPoint(
              record,
              item.localX,
              home.floorLocal,
              item.localZ,
            );
            assert.equal(item.x, expected.x);
            assert.equal(item.floor, expected.y);
            assert.equal(item.z, expected.z);
            for (const p of residentialFootprintSamples(item))
              assert.ok(
                castSegment(
                  { ...p, y: p.y + 0.04 },
                  { ...p, y: p.y - 0.08 },
                  hosts,
                ),
              );
          }
          for (const item of home.groups.filter((g) =>
            ["bench", "chest"].includes(g.kind),
          )) {
            const y = item.kind === "bench" ? 1.42 : 2.1;
            const a = itemPoint(item, 0, y, -3);
            const b = itemPoint(item, 0, y, 3);
            const visual = visibleHit(furniture.root, a, b);
            const contact = castSegment(a, b, furniture.colliders);
            assert.ok(
              visual && contact,
              `${kind}/${variant}/${item.kind}: real transformed solid`,
            );
            assert.ok(
              Math.abs(visual.distance - contact.distance) < 0.085 * scale,
            );
          }
        }
});

test("Placement rejects unsupported footprint edges and a terrain ridge even when the center is supported", (t) => {
  const record = syntheticRecord("villa", 0.94, 0);
  const plan = planAtlantisResidentialInteriors([record], 1)[0];
  const bench = plan.groups.find((item) => item.kind === "bench");
  const corner = residentialFootprintSamples(bench).at(-1);
  const sloped = createAtlantisResidentialInteriors(new THREE.Group(), {
    records: [record],
    hostColliders: architectureColliders(record),
    seed: 1,
    heightAt: (x, z) =>
      // 两侧边缘的窄脊贯穿室内，所有有限备用位置的中心仍平坦、边缘仍被穿过。
      Math.abs(Math.abs(x - record.x) - Math.abs(corner.x - record.x)) < 0.05
        ? bench.floor + 0.3
        : -24,
  });
  t.after(() => sloped.dispose());
  assert.equal(sloped.stats.placed.bench, 0);
  assert.ok(
    sloped.stats.dropped.some(
      (item) => item.id === bench.id && item.reason === "terrain_intersection",
    ),
  );
  const noFloor = createAtlantisResidentialInteriors(new THREE.Group(), {
    records: [record],
    hostColliders: architectureColliders(record).filter(
      (collider) => collider.halfSize?.y !== 0.85 * record.scale,
    ),
    heightAt: () => -24,
  });
  t.after(() => noFloor.dispose());
  assert.equal(noFloor.stats.furnishedHomes, 0);
  assert.ok(
    noFloor.stats.dropped.every(
      (item) => item.reason === "missing_floor_support",
    ),
  );
});

test("A buried house is excluded honestly while the bounded fallback keeps the surviving room furnished", (t) => {
  const record = syntheticRecord("courtyard", 0.82, -Math.PI / 2);
  const floorY = record.y + 1.4 * record.scale;
  const buried = createAtlantisResidentialInteriors(new THREE.Group(), {
    records: [record],
    heightAt: () => -24,
    hostColliders: [
      ...architectureColliders(record),
      {
        type: "box",
        x: record.x,
        y: floorY + 3,
        z: record.z,
        halfSize: { x: 15, y: 8, z: 15 },
        kind: "foreign_foundation",
      },
    ],
  });
  t.after(() => buried.dispose());
  assert.equal(buried.stats.eligibleHomes, 0);
  assert.equal(buried.stats.furnishedHomes, 0);
  assert.equal(buried.stats.excludedHomes.length, 1);
  assert.equal(
    buried.stats.excludedHomes[0].reason,
    "blocked_existing_entrance",
  );
  const home = planAtlantisResidentialInteriors([record], 1)[0];
  for (const kind of ["bench", "chest"]) {
    const original = home.groups.find((item) => item.kind === kind);
    const hosts = [
      ...architectureColliders(record),
      {
        type: "box",
        x: original.x,
        y: floorY + 0.3,
        z: original.z,
        halfSize: { x: 1.3, y: 0.3, z: 1.3 },
        kind: "foreign_foundation",
      },
    ];
    const obstructed = createAtlantisResidentialInteriors(new THREE.Group(), {
      records: [record],
      heightAt: () => -24,
      seed: 1,
      hostColliders: hosts,
    });
    t.after(() => obstructed.dispose());
    assert.equal(obstructed.stats.fullyFurnishedHomes, 1);
    assert.equal(obstructed.stats.placed[kind], 1);
    assert.equal(obstructed.stats.dropped.length, 0);
    const moved = obstructed.stats.layouts[0].groups.find(
      (g) => g.kind === kind,
    );
    assert.notEqual(moved.localZ, original.localZ);
    for (const p of residentialFootprintSamples(moved, 8)) {
      const support = castSegment(
        { ...p, y: p.y + 0.04 },
        { ...p, y: p.y - 0.08 },
        hosts,
      );
      assert.ok(support);
      assert.ok(Math.abs(support.point.y - moved.floor) < 0.025);
    }
  }
});

test("Spatial culling follows all districts and both quality presets without changing stored collision data", (t) => {
  const furniture = cityFixture(t);
  const signature = JSON.stringify(furniture.colliders);
  furniture.update(0, 0, { x: 0, z: -130 }, true);
  const roots = furniture.root.children;
  assert.equal(
    roots.find((r) => r.name === "atlantis_residential_harbor").visible,
    true,
  );
  assert.equal(
    roots.find((r) => r.name === "atlantis_residential_necropolis").visible,
    false,
  );
  const bounds = furniture.stats.districts.find(
    (d) => d.id === "harbor",
  ).bounds;
  furniture.update(
    0,
    0,
    { x: bounds.maxX + 210, z: (bounds.minZ + bounds.maxZ) / 2 },
    true,
  );
  assert.equal(
    roots.find((r) => r.name === "atlantis_residential_harbor").visible,
    true,
  );
  furniture.update(
    0,
    0,
    { x: bounds.maxX + 210, z: (bounds.minZ + bounds.maxZ) / 2 },
    false,
  );
  assert.equal(
    roots.find((r) => r.name === "atlantis_residential_harbor").visible,
    false,
  );
  furniture.update(0, 0, undefined);
  assert.ok(roots.every((r) => r.visible));
  assert.equal(JSON.stringify(furniture.colliders), signature);
});

test("Order-independent layout and repeated lifecycle preserve shared materials and the other active scene", (t) => {
  const first = cityFixture(t);
  const second = cityFixture(t, { records: [...city.buildings].reverse() });
  assert.deepEqual(second.stats, first.stats);
  const firstMeshes = furnitureMeshes(first.root);
  const secondMeshes = furnitureMeshes(second.root);
  let firstDisposals = 0,
    secondDisposals = 0,
    materialDisposals = 0;
  for (const mesh of firstMeshes)
    mesh.geometry.addEventListener("dispose", () => firstDisposals++);
  for (const mesh of secondMeshes)
    mesh.geometry.addEventListener("dispose", () => secondDisposals++);
  const listeners = [];
  for (const material of Object.values(atlantisMaterials())) {
    const listener = () => materialDisposals++;
    material.addEventListener("dispose", listener);
    listeners.push([material, listener]);
  }
  const expected = structuredClone(first.stats);
  first.dispose();
  first.dispose();
  first.update(1, 1, { x: 0, z: 0 });
  assert.equal(firstDisposals, firstMeshes.length);
  assert.equal(secondDisposals, 0);
  assert.equal(materialDisposals, 0);
  assert.equal(first.root.parent, null);
  assert.equal(first.colliders.length, 0);
  assert.equal(first.landmarks.length, 0);
  assert.ok(second.root.parent);
  const recreated = cityFixture(t);
  assert.deepEqual(recreated.stats, expected);
  for (const [material, listener] of listeners)
    material.removeEventListener("dispose", listener);
});

test("Invalid residential transforms fail before attaching any partial scene", () => {
  for (const bad of [
    { scale: 0 },
    { scale: NaN },
    { rotation: undefined },
    { y: Infinity },
  ]) {
    const parent = new THREE.Group();
    assert.throws(
      () =>
        createAtlantisResidentialInteriors(parent, {
          records: [{ ...syntheticRecord("villa", 0.82, 0), ...bad }],
          heightAt: () => -24,
        }),
      /finite transforms/,
    );
    assert.equal(parent.children.length, 0);
  }
});

function cityFixture(t, options = {}) {
  const furniture = createAtlantisResidentialInteriors(new THREE.Group(), {
    records: city.buildings,
    heightAt: atlantisSeabedHeight,
    hostColliders,
    ...options,
  });
  t.after(() => furniture.dispose());
  return furniture;
}

function syntheticRecord(kind, scale, rotation) {
  const kit = cityArchitecture(kind);
  return {
    kind,
    x: 80,
    y: -20,
    z: -170,
    scale,
    rotation,
    width:
      (Math.abs(Math.cos(rotation)) * kit.width +
        Math.abs(Math.sin(rotation)) * kit.depth) *
      scale,
    depth:
      (Math.abs(Math.sin(rotation)) * kit.width +
        Math.abs(Math.cos(rotation)) * kit.depth) *
      scale,
  };
}

function architectureColliders(record) {
  const q = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    record.rotation,
  );
  const point = (p) => residentialWorldPoint(record, p.x, p.y, p.z);
  return cityArchitecture(record.kind).colliders.map((source) => {
    if (source.type === "capsule")
      return {
        ...source,
        a: point(source.a),
        b: point(source.b),
        radius: source.radius * record.scale,
      };
    const rotation = q.clone();
    if (source.rotation)
      rotation.multiply(
        new THREE.Quaternion(
          source.rotation.x,
          source.rotation.y,
          source.rotation.z,
          source.rotation.w,
        ),
      );
    const output = {
      ...source,
      ...point(source),
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    };
    if (source.halfSize)
      output.halfSize = Object.fromEntries(
        Object.entries(source.halfSize).map(([axis, value]) => [
          axis,
          value * record.scale,
        ]),
      );
    if (source.axes)
      output.axes = Object.fromEntries(
        Object.entries(source.axes).map(([axis, value]) => [
          axis,
          value * record.scale,
        ]),
      );
    return output;
  });
}

function itemPoint(item, x, y, z) {
  return residentialWorldPoint(
    {
      x: item.x,
      y: item.floor,
      z: item.z,
      rotation: item.yaw,
      scale: item.scale,
    },
    x,
    y,
    z,
  );
}

function furnitureMeshes(root) {
  const meshes = [];
  root.traverse((child) => {
    if (child.isMesh) meshes.push(child);
  });
  return meshes;
}

function visibleHit(root, from, to) {
  root.updateMatrixWorld(true);
  const start = new THREE.Vector3().copy(from);
  const end = new THREE.Vector3().copy(to);
  return new THREE.Raycaster(
    start,
    end.clone().sub(start).normalize(),
    0,
    start.distanceTo(end),
  ).intersectObject(root, true)[0];
}
