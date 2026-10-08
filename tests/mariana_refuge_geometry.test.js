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
after(() => terrain.dispose());

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
    for (let i = 0; i < position.count; i++)
      result.push(
        new THREE.Vector3()
          .fromBufferAttribute(position, i)
          .applyMatrix4(mesh.matrixWorld),
      );
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

test("The whole plaza, foundations, arch feet and dome rim have rendered support", () => {
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
      ),
      rim = sand.filter(
        (p) =>
          p.x > -71 &&
          p.x < -35 &&
          p.z < f.root.position.z - 39 &&
          Math.abs(p.y - top) < 0.0001,
      );
    assert.ok(feet.length >= 32, "both actual arch-end rings");
    assert.ok(rim.length >= 32, "full rock-dome base rim");
    for (const p of [...feet, ...rim]) supportAt(f, p);
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

test("The scaled fruit base and every actual stair box meet their supporting surface", () => {
  const f = fixture();
  try {
    const pineapple = f.root.getObjectByName("refuge_pineapple_house"),
      fruit = vertices(pineapple, "pineapple_ochre"),
      bottom = Math.min(...fruit.map((p) => p.y)),
      base = fruit.filter((p) => Math.abs(p.y - bottom) < 0.0001);
    assert.ok(base.length >= 64);
    for (const p of base) {
      const y = rayHeight(architecture(f), p.x, p.z, bottom + 0.01);
      assert.ok(Math.abs(y - bottom) < 0.001, `fruit base ${p.toArray()}`);
    }
    const stairs = vertices(pineapple, "refuge_sand"),
      zFaces = [...new Set(stairs.map((p) => +p.z.toFixed(4)))].sort(
        (a, b) => a - b,
      );
    assert.ok(zFaces.length >= 8 && zFaces.length % 2 === 0);
    let lastTop = Infinity;
    for (let i = 0; i < zFaces.length; i += 2) {
      const box = stairs.filter(
          (p) => p.z >= zFaces[i] - 0.001 && p.z <= zFaces[i + 1] + 0.001,
        ),
        min = Math.min(...box.map((p) => p.y)),
        max = Math.max(...box.map((p) => p.y));
      assert.ok(max < lastTop, "steps descend continuously toward the street");
      lastTop = max;
      for (const p of box.filter((p) => Math.abs(p.y - min) < 0.0001))
        assert.ok(Math.abs(p.y - supportAt(f, p)) < 0.001);
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
        ["yellow_sponge_easter_egg", "shoe_black"],
        ["refuge_starfish_resident", "starfish_coral"],
        ["refuge_snail_resident", "snail_mint"],
      ]) {
        const points = vertices(f.root.getObjectByName(name), material),
          bottom = Math.min(...points.map((p) => p.y)),
          feet = uniquePoints(points.filter((p) => p.y < bottom + 0.025));
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

test("The fruit door and window collars actually connect to the rendered curved shell", () => {
  const f = fixture();
  try {
    const pineapple = f.root.getObjectByName("refuge_pineapple_house"),
      shell = pineapple.children.find(
        (mesh) => mesh.material?.name === "pineapple_ochre",
      ),
      blue = pineapple.children.find(
        (mesh) => mesh.material?.name === "door_ocean_blue",
      ),
      door = f.colliders.find((c) => c.id === "refuge_pineapple_door"),
      ray = new THREE.Raycaster(),
      size = new THREE.Box3().setFromObject(shell),
      actualDoor = new THREE.Box3().setFromPoints(
        vertices(blue).filter((p) => p.y <= door.y + door.halfSize.y + 0.001),
      );
    assert.ok(
      actualDoor
        .getCenter(new THREE.Vector3())
        .distanceTo(new THREE.Vector3(door.x, door.y, door.z)) < 0.001,
    );
    assert.ok(
      actualDoor
        .getSize(new THREE.Vector3())
        .multiplyScalar(0.5)
        .distanceTo(door.halfSize) < 0.001,
    );
    // 从正面投射果壳；真实门框的整个后沿（含底部两角）必须接上曲面。
    for (const x of [-1, -0.5, 0, 0.5, 1])
      for (const y of [-0.999, -0.5, 0, 0.999]) {
        const point = new THREE.Vector3(
          door.x + x * door.halfSize.x,
          door.y + y * door.halfSize.y,
          size.max.z + 1,
        );
        ray.set(point, new THREE.Vector3(0, 0, -1));
        const shellHit = ray.intersectObject(shell)[0];
        assert.ok(shellHit, `missing shell behind door ${point.toArray()}`);
        const rear = actualDoor.min.z;
        assert.ok(
          rear - shellHit.point.z <= 0.1,
          `detached door at ${point.toArray()}: gap ${rear - shellHit.point.z}`,
        );
      }
    for (const side of [-1, 1]) {
      const center = new THREE.Vector3(side * 4.3, 16, 4.72).applyMatrix4(
          pineapple.matrixWorld,
        ),
        collarRear = vertices(blue).filter(
          (p) =>
            Math.abs(p.x - center.x) <= 2.26 &&
            Math.abs(p.y - center.y) <= 2.26 &&
            p.z < center.z - 2,
        );
      assert.ok(collarRear.length >= 24, "window has a real depth collar");
      for (const p of collarRear) {
        ray.set(
          new THREE.Vector3(p.x, p.y, size.max.z + 1),
          new THREE.Vector3(0, 0, -1),
        );
        const shellHit = ray.intersectObject(shell)[0];
        assert.ok(shellHit);
        assert.ok(p.z <= shellHit.point.z + 0.1, "collar connects to shell");
      }
    }
  } finally {
    f.dispose();
  }
});

test("Substantial face fixtures and decorative residents have matching world-space contact", () => {
  const f = fixture();
  try {
    assert.equal(
      new Set(f.colliders.map((c) => c.id)).size,
      f.colliders.length,
    );
    for (const id of [
      "refuge_sponge",
      "refuge_starfish",
      "refuge_snail",
      "refuge_stone_nose",
      "refuge_stone_brow",
      "refuge_stone_eye_-1",
      "refuge_stone_eye_1",
    ])
      assert.ok(
        f.colliders.some((c) => c.id === id),
        id,
      );
    const fixtures = architecture(f)
      .filter((mesh) =>
        [
          "door_ocean_blue",
          "deep_recesses",
          "warm_windows",
          "pineapple_scales",
        ].includes(mesh.material.name),
      )
      .flatMap((mesh) => vertices(mesh))
      .filter(
        (p) =>
          p.x >= 44 &&
          p.x <= 64 &&
          p.y >= f.root.position.y + 17 &&
          p.y <= f.root.position.y + 37 &&
          p.z > f.root.position.z - 8.5 &&
          p.z < f.root.position.z - 1,
      );
    assert.ok(fixtures.length > 500);
    for (const point of fixtures)
      assert.equal(
        isPositionBlocked(point, { colliders: f.colliders, radius: 0.05 }),
        true,
        `rendered face fixture has no contact: ${point.toArray()}`,
      );
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
      assert.ok(f.owned.has(mesh.geometry));
      assert.ok(f.owned.has(mesh.material));
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
    assert.ok(triangles <= 70000);
    assert.ok(bytes <= 3 * 1024 * 1024);
    assert.equal(f.owned.size, geometries.size + materials.size);
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
    assert.ok([...disposal.values()].every((count) => count === 1));
    assert.equal(ocean.root.children.length, 0);
    assert.equal(ocean.colliders.length, 0);
    assert.equal(ocean.barriers.length, 0);
    assert.equal(ocean.root.parent, null);
    assert.equal(scene.children.length, 0);
  } finally {
    ocean.dispose();
  }
});
