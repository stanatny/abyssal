import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaRefuge } from "../src/mariana_refuge.js";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import {
  MARIANA_REFUGE,
  MARIANA_WORLD as W,
  marianaSeabedHeight,
} from "../src/mariana_config.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";

// 支撑直接检查最终海域的渲染三角形，不以中心高度替代完整占地。
// 此海域与每项检查的独立避难所分离。
const terrain = createMarianaOcean(new THREE.Scene());
terrain.root.updateMatrixWorld(true);
const ground = terrain.root.getObjectByName("mariana_lowest_ground");
assert.ok(ground?.isMesh);
const sharedDisposal = [];
after(() => {
  terrain.dispose();
  for (const [resource, read] of sharedDisposal)
    assert.equal(read(), 1, resource.name);
});

function fixture() {
  const owned = new Set(),
    scene = new THREE.Scene(),
    refuge = createMarianaRefuge(scene, {
      keep: (resource) => (owned.add(resource), resource),
      heightAt: marianaSeabedHeight,
    });
  scene.updateMatrixWorld(true);
  return {
    ...refuge,
    scene,
    owned,
    dispose() {
      for (const resource of owned) resource.dispose();
      scene.clear();
    },
  };
}

function vertices(root, material) {
  const result = [];
  root.traverse((mesh) => {
    if (!mesh.isMesh || (material && mesh.material.name !== material)) return;
    const position = mesh.geometry.attributes.position;
    if (mesh.isSkinnedMesh) mesh.skeleton.update();
    for (let i = 0; i < position.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(position, i);
      if (mesh.isSkinnedMesh) mesh.applyBoneTransform(i, point);
      result.push(point.applyMatrix4(mesh.matrixWorld));
    }
  });
  return result;
}

function uniquePoints(points) {
  return [
    ...new Map(
      points.map((p) => [
        p
          .toArray()
          .map((n) => n.toFixed(5))
          .join(","),
        p,
      ]),
    ).values(),
  ];
}

function architecture(f, material) {
  return f.root.children.filter(
    (mesh) => mesh.isMesh && (!material || mesh.material.name === material),
  );
}

function rayHeight(meshes, x, z, fromY) {
  const ray = new THREE.Raycaster(
    new THREE.Vector3(x, fromY, z),
    new THREE.Vector3(0, -1, 0),
  );
  return ray.intersectObjects(meshes, false)[0]?.point.y;
}

function supportAt(f, point, tolerance = 0.01) {
  const top = f.colliders.find((c) => c.id === "refuge_plinth");
  assert.ok(top);
  const plane = top.y + top.halfSize.y;
  const y = rayHeight(architecture(f), point.x, point.z, plane + 0.01);
  assert.ok(Number.isFinite(y), `unsupported footprint ${point.toArray()}`);
  assert.ok(
    Math.abs(y - plane) <= tolerance,
    `expected plaza at ${point.toArray()}, found ${y}`,
  );
  return plane;
}

test("The whole plaza, foundations, arch feet have rendered support", () => {
  const f = fixture();
  try {
    const plinth = f.colliders.find((c) => c.id === "refuge_plinth"),
      top = plinth.y + plinth.halfSize.y,
      bottom = plinth.y - plinth.halfSize.y;
    assert.ok(plinth.halfSize.x * 2 >= 160);
    assert.ok(plinth.halfSize.z * 2 >= 170);
    for (let x = -1; x <= 1.001; x += 0.0625)
      for (let z = -1; z <= 1.001; z += 0.0625) {
        const px = plinth.x + x * plinth.halfSize.x,
          pz = plinth.z + z * plinth.halfSize.z,
          floor = rayHeight([ground], px, pz, top + 20);
        assert.ok(Number.isFinite(floor));
        assert.ok(bottom <= floor, `plaza floats at ${px},${pz}`);
        assert.ok(top > floor, `plaza buried at ${px},${pz}`);
      }
    const foundations = f.colliders.filter(
      (c) =>
        c.type === "box" &&
        c !== plinth &&
        Math.abs(c.y - c.halfSize.y - top) < 0.001,
    );
    assert.ok(foundations.length >= 3);
    for (const c of foundations)
      for (let x = -1; x <= 1; x += 0.5)
        for (let z = -1; z <= 1; z += 0.5) {
          const point = new THREE.Vector3(
            c.x + x * c.halfSize.x,
            top,
            c.z + z * c.halfSize.z,
          );
          supportAt(f, point);
          const ray = new THREE.Raycaster(
              point.clone().add(new THREE.Vector3(0, -0.01, 0)),
              new THREE.Vector3(0, 1, 0),
            ),
            renderedBase = ray.intersectObjects(architecture(f), false)[0];
          assert.ok(renderedBase, "foundation has a real rendered bottom");
          assert.ok(
            Math.abs(renderedBase.point.y - top) < 0.001,
            "rendered foundation bottom agrees with contact",
          );
        }
    const sand = architecture(f, "refuge_sand").flatMap((mesh) =>
        vertices(mesh),
      ),
      feet = sand.filter(
        (p) =>
          Math.abs(p.x) > 70.9 &&
          p.y < top + 1 &&
          p.z > f.root.position.z - 20 &&
          p.z < f.root.position.z + 45,
      );
    assert.ok(feet.length >= 32, "both actual arch-end rings");
    for (const p of feet) supportAt(f, p);
    for (const side of [-1, 1])
      for (const end of [-1, 1]) {
        const ring = feet.filter(
            (p) =>
              Math.sign(p.x) === side &&
              Math.sign(p.z - f.root.position.z - 12) === end,
          ),
          bottom = Math.min(...ring.map((p) => p.y));
        assert.ok(ring.length >= 8, "each arch has two real end rings");
        assert.ok(
          bottom <= top + 0.1 && bottom > top - 0.5,
          "each arch end meets the plaza",
        );
      }
    const flowers = architecture(f, "leaf_green")
      .flatMap((mesh) => vertices(mesh))
      .filter((p) => p.y < top + 0.4);
    assert.ok(flowers.length >= 100);
    for (const p of flowers) supportAt(f, p);
  } finally {
    f.dispose();
  }
});

test("All four HF buildings are uniformly fitted and their full low base is supported", () => {
  const f = fixture();
  try {
    const owner = f.root.userData.refugeBuildings;
    assert.equal(owner.placements.length, 4);
    for (const row of owner.placements) {
      const mesh = f.root.getObjectByName(`refuge_${row.kind}_house_hf`);
      assert.equal(mesh.scale.x, mesh.scale.y);
      assert.equal(mesh.scale.x, mesh.scale.z);
      const bounds = new THREE.Box3().setFromObject(mesh),
        points = vertices(mesh);
      const base = points.filter((p) => p.y < bounds.min.y + 0.5);
      assert.ok(base.length > 10);
      for (const p of base) {
        const y = rayHeight(
          architecture(f),
          p.x,
          p.z,
          row.base + f.root.position.y + 0.01,
        );
        assert.ok(
          Number.isFinite(y),
          `${row.kind}: missing rendered base support`,
        );
        assert.ok(
          p.y - y < 0.5 && p.y - y > -0.5,
          `${row.kind}: floating/buried base ${p.y - y}`,
        );
      }
      assert.ok(
        bounds.min.x > 30 || bounds.max.x < -30,
        "central adult corridor stays open",
      );
    }
  } finally {
    f.dispose();
  }
});

test("Transformed resident feet remain planted throughout their complete idle cycles", () => {
  const f = fixture();
  try {
    for (let i = 0; i <= 64; i++) {
      f.update((i / 64) * 24, new THREE.Vector3(0, -2735, -430));
      f.scene.updateMatrixWorld(true);
      for (const [name, material] of [
        ["yellow_sponge_easter_egg", "refuge_sponge_hf"],
        ["refuge_starfish_resident", "refuge_starfish_hf"],
        ["refuge_snail_resident", "refuge_snail_hf"],
      ]) {
        const points = vertices(f.root.getObjectByName(name), material),
          bottom = Math.min(...points.map((p) => p.y)),
          feet = uniquePoints(points.filter((p) => p.y < bottom + 0.025));
        assert.ok(feet.length > 0, "actual skinned feet were sampled");
        for (const p of feet)
          assert.ok(
            Math.abs(p.y - supportAt(f, p)) < 0.06,
            `${name} unsupported foot at t=${i}: ${p.toArray()}`,
          );
      }
    }
  } finally {
    f.dispose();
  }
});

test("HF building surfaces and replacement residents have registered contact", () => {
  const f = fixture();
  try {
    assert.equal(
      new Set(f.colliders.map((c) => c.id)).size,
      f.colliders.length,
    );
    for (const id of ["refuge_sponge", "refuge_starfish", "refuge_snail"])
      assert.ok(f.colliders.some((c) => c.id === id));
    for (const row of f.root.userData.refugeBuildings.placements) {
      const mesh = f.root.getObjectByName(`refuge_${row.kind}_house_hf`),
        points = vertices(mesh);
      for (let i = 0; i < points.length; i += 7)
        assert.equal(
          isPositionBlocked(points[i], {
            colliders: f.colliders,
            radius: 0.03,
          }),
          true,
          `${row.kind}: unprotected visible surface ${points[i].toArray()}`,
        );
    }
  } finally {
    f.dispose();
  }
});

test("The arrival sphere, 32m lane and 20m turning loop remain clear in both directions", () => {
  const f = fixture();
  try {
    const center = new THREE.Vector3(
      MARIANA_REFUGE.x,
      MARIANA_REFUGE.y,
      MARIANA_REFUGE.z,
    );
    assert.equal(
      isPositionBlocked(center, {
        colliders: f.colliders,
        radius: MARIANA_REFUGE.radius,
      }),
      false,
    );
    const grid = createStaticColliderGrid(terrain.colliders),
      options = (forward) => ({
        colliders: grid.query,
        length: 32,
        radius: bodyRadius(32),
        forward,
        bounds: {
          minX: W.minX,
          maxX: W.maxX,
          minZ: W.minZ,
          maxZ: W.maxZ,
          minY: -W.maxDepth,
          maxY: 4,
        },
        floorHeight: (x, z) =>
          rayHeight([ground], x, z, -2600) + bodyRadius(32),
      });
    for (const y of [-2735, f.root.position.y + 16])
      for (const direction of [-1, 1]) {
        const from = new THREE.Vector3(0, y, direction > 0 ? -455 : -340),
          to = new THREE.Vector3(0, y, direction > 0 ? -340 : -455),
          result = resolveMotion(
            from,
            to,
            options(to.clone().sub(from).normalize()),
          );
        assert.equal(
          result.blocked,
          false,
          "uninterrupted full adult arrival lane",
        );
        assert.equal(result.stuck, false);
        assert.ok(
          new THREE.Vector3().copy(result.position).distanceTo(to) < 0.001,
        );
      }
    // 外圈每个位置都检查完整转向，不能仅沿有利的切线方向通过。
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2,
        point = center
          .clone()
          .add(
            new THREE.Vector3(Math.cos(angle) * 20, 0, Math.sin(angle) * 20),
          );
      for (let j = 0; j < 72; j++) {
        const yaw = (j / 72) * Math.PI * 2,
          forward = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
        assert.equal(
          isPositionBlocked(point, options(forward)),
          false,
          `adult turn ${i}/${j}`,
        );
      }
      for (const direction of [-1, 1]) {
        const next = angle + (direction * Math.PI * 2) / 72,
          target = center
            .clone()
            .add(
              new THREE.Vector3(Math.cos(next) * 20, 0, Math.sin(next) * 20),
            ),
          forward = target.clone().sub(point).normalize(),
          result = resolveMotion(point, target, options(forward));
        assert.equal(
          result.blocked,
          false,
          `adult loop travel ${i}/${direction}`,
        );
        assert.ok(
          new THREE.Vector3().copy(result.position).distanceTo(target) < 0.001,
        );
      }
    }
  } finally {
    f.dispose();
  }
});

test("Merged refuge resources stay finite, bounded and stable; the real ocean disposes them once", () => {
  const f = fixture();
  try {
    const meshes = [],
      geometries = new Set(),
      materials = new Set(),
      mergedPairs = new Set();
    let triangles = 0,
      bytes = 0;
    f.root.traverse((mesh) => {
      if (!mesh.isMesh) return;
      meshes.push(mesh);
      geometries.add(mesh.geometry);
      materials.add(mesh.material);
      assert.ok(
        f.owned.has(mesh.geometry) ||
          [
            ...f.root.userData.refugeBuildings.assets.values(),
            ...f.root.userData.refugeResidents.assets.values(),
          ]
            .flatMap((a) => [a, ...(a.details || [])])
            .some((a) => a.geometry === mesh.geometry),
      );
      assert.ok(
        f.owned.has(mesh.material) ||
          [
            ...f.root.userData.refugeBuildings.assets.values(),
            ...f.root.userData.refugeResidents.assets.values(),
          ]
            .flatMap((a) => [a, ...(a.details || [])])
            .some((a) => a.material === mesh.material),
      );
      const pair = `${mesh.parent.uuid}:${mesh.material.uuid}`;
      assert.ok(
        !mergedPairs.has(pair),
        "one material batch per static/articulated group",
      );
      mergedPairs.add(pair);
      for (const attribute of Object.values(mesh.geometry.attributes)) {
        bytes += attribute.array.byteLength;
        assert.ok(attribute.array.every(Number.isFinite));
      }
      const index = mesh.geometry.index,
        count = mesh.geometry.attributes.position.count;
      assert.ok(index && index.count % 3 === 0);
      assert.ok(index.array.every((value) => value >= 0 && value < count));
      bytes += index.array.byteLength;
      triangles += index.count / 3;
      const normal = mesh.geometry.attributes.normal;
      for (let i = 0; i < normal.count; i++)
        assert.ok(
          Math.abs(
            new THREE.Vector3().fromBufferAttribute(normal, i).length() - 1,
          ) < 0.001,
        );
    });
    assert.ok(meshes.length <= 40);
    assert.ok(materials.size <= 24);
    assert.ok(triangles <= 90000);
    assert.ok(bytes <= 4 * 1024 * 1024);
    assert.ok(f.owned.has(f.root.userData.refugeResidents));
    const children = [];
    f.root.traverse((node) => children.push(node));
    const resourceCount = f.owned.size;
    for (let i = 0; i < 1200; i++)
      f.update(i / 30, new THREE.Vector3(0, -2735, -430));
    const afterChildren = [];
    f.root.traverse((node) => afterChildren.push(node));
    assert.deepEqual(afterChildren, children);
    assert.equal(f.owned.size, resourceCount);
  } finally {
    f.dispose();
  }
  const scene = new THREE.Scene(),
    ocean = createMarianaOcean(scene),
    refuge = ocean.root.getObjectByName("mariana_bottom_refuge"),
    disposal = new Map(),
    lamps = [],
    nodes = [];
  ocean.root.traverse((node) => {
    nodes.push(node);
    if (node.isPointLight) lamps.push(node);
  });
  assert.equal(lamps.length, 3, "refuge reuses the regional three-lamp pool");
  const poses = () =>
    nodes.map((node) => [
      ...node.position.toArray(),
      ...node.quaternion.toArray(),
      ...node.scale.toArray(),
      node.visible,
    ]);
  refuge.traverse((node) => {
    for (const resource of [node.geometry, node.material].filter(Boolean))
      if (!disposal.has(resource)) {
        disposal.set(resource, 0);
        resource.addEventListener("dispose", () =>
          disposal.set(resource, disposal.get(resource) + 1),
        );
      }
  });
  try {
    for (const [index, position] of [
      [0, new THREE.Vector3(0, -80, 0)],
      [1, new THREE.Vector3(0, -920, -420)],
      [2, new THREE.Vector3(0, -2000, -350)],
      [3, new THREE.Vector3(0, -2735, -430)],
    ]) {
      ocean.update(index, position, 0.04, index % 2 === 0);
      const current = [],
        currentLamps = [];
      ocean.root.traverse((node) => {
        current.push(node);
        if (node.isPointLight) currentLamps.push(node);
      });
      assert.deepEqual(current, nodes);
      assert.deepEqual(currentLamps, lamps);
      for (const lamp of lamps)
        assert.ok(
          [...lamp.position.toArray(), lamp.intensity, lamp.distance].every(
            Number.isFinite,
          ),
        );
    }
    const position = new THREE.Vector3(0, -2735, -430);
    ocean.update(4, position, 0.04, true);
    const animated = poses();
    ocean.update(4, position, 0.5, true);
    assert.deepEqual(
      poses(),
      animated,
      "same supplied clock freezes idle poses",
    );
    ocean.update(5, position, 0, true);
    assert.notDeepEqual(
      poses(),
      animated,
      "caller elapsed time advances articulated residents",
    );
    ocean.dispose();
    const disposedPoses = poses();
    ocean.update(30, position, 0.04, true);
    ocean.dispose();
    assert.deepEqual(
      poses(),
      disposedPoses,
      "disposed owner ignores future animation updates",
    );
    for (const [resource, count] of disposal) {
      const shared = [
        ...terrain.root
          .getObjectByName("mariana_bottom_refuge")
          .userData.refugeBuildings.assets.values(),
        ...terrain.root
          .getObjectByName("mariana_bottom_refuge")
          .userData.refugeResidents.assets.values(),
      ]
        .flatMap((a) => [a, ...(a.details || [])])
        .some((a) => a.geometry === resource || a.material === resource);
      assert.equal(count, shared ? 0 : 1, resource.name);
      if (shared) sharedDisposal.push([resource, () => disposal.get(resource)]);
    }
    assert.equal(ocean.root.children.length, 0);
    assert.equal(ocean.colliders.length, 0);
    assert.equal(ocean.barriers.length, 0);
    assert.equal(ocean.root.parent, null);
    assert.equal(scene.children.length, 0);
  } finally {
    ocean.dispose();
  }
});
