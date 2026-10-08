import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  addMarianaLandmarks,
  MARIANA_LANDMARK_SITES,
  MARIANA_LANDMARK_SPINE,
  MARIANA_LANDMARK_RESERVATIONS,
} from "../src/mariana_landmarks.js";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import { MARIANA_GATES, MARIANA_WORLD as W } from "../src/mariana_config.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";

function fixture() {
  const root = new THREE.Group(),
    owned = new Set(),
    chunks = [];
  const keep = (resource) => (owned.add(resource), resource);
  const materials = {
    basalt: keep(new THREE.MeshStandardMaterial({ color: 0x71828d })),
    pale: keep(new THREE.MeshStandardMaterial({ color: 0x9caaa0 })),
  };
  const result = addMarianaLandmarks({
    root,
    keep,
    materials,
    group(name, y) {
      const g = new THREE.Group();
      g.name = name;
      root.add(g);
      chunks.push({ g, y });
      return g;
    },
  });
  root.updateMatrixWorld(true);
  return {
    root,
    owned,
    chunks,
    ...result,
    dispose() {
      for (const resource of owned) resource.dispose();
      owned.clear();
      root.clear();
    },
  };
}

function colliderBounds(collider) {
  if (collider.type === "box") {
    const center = new THREE.Vector3(collider.x, collider.y, collider.z);
    return new THREE.Box3(
      center.clone().sub(collider.halfSize),
      center.clone().add(collider.halfSize),
    );
  }
  assert.equal(collider.type, "capsule");
  return new THREE.Box3()
    .setFromPoints([collider.a, collider.b])
    .expandByScalar(collider.radius);
}

const bounds = {
  minX: W.minX + 5,
  maxX: W.maxX - 5,
  minZ: W.minZ + 5,
  maxZ: W.maxZ - 5,
  minY: -W.maxDepth,
  maxY: 4,
};

test("Five sculpted side bays remain bounded, closed and owned by regional culling", () => {
  const f = fixture();
  try {
    assert.equal(f.chunks.length, 5);
    assert.equal(
      new Set(MARIANA_LANDMARK_SITES.map((site) => site.shape)).size,
      5,
    );
    assert.ok(f.stats.triangles <= 100000);
    assert.ok(f.stats.meshes <= 16);
    assert.ok(f.colliders.length <= 300);
    assert.equal(
      new Set(f.colliders.map((c) => c.id)).size,
      f.colliders.length,
    );
    let triangles = 0,
      meshes = 0;
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3(),
      cross = new THREE.Vector3();
    for (const { g, y } of f.chunks) {
      assert.ok(Number.isFinite(y));
      assert.equal(g.children.length, 3);
      for (const mesh of g.children) {
        assert.ok(f.owned.has(mesh.geometry));
        assert.ok(f.owned.has(mesh.material));
        assert.equal(mesh.material.side, THREE.FrontSide);
        const geometry = mesh.geometry,
          position = geometry.attributes.position,
          edges = new Map();
        let volume = 0;
        const key = (index) =>
          [position.getX(index), position.getY(index), position.getZ(index)]
            .map((value) => Math.round(value * 1000))
            .join(",");
        for (let i = 0; i < geometry.index.count; i += 3) {
          const ids = [0, 1, 2].map((offset) =>
            geometry.index.getX(i + offset),
          );
          a.fromBufferAttribute(position, ids[0]);
          b.fromBufferAttribute(position, ids[1]);
          c.fromBufferAttribute(position, ids[2]);
          cross.copy(b).sub(a).cross(c.clone().sub(a));
          assert.ok(
            cross.lengthSq() > 1e-9,
            `${mesh.name} degenerate triangle ${i / 3}`,
          );
          volume += a.dot(b.clone().cross(c)) / 6;
          for (let edge = 0; edge < 3; edge++) {
            const pair = [key(ids[edge]), key(ids[(edge + 1) % 3])]
              .sort()
              .join("|");
            edges.set(pair, (edges.get(pair) || 0) + 1);
          }
        }
        assert.ok(volume > 0, `${mesh.name} inward surface`);
        assert.ok(
          [...edges.values()].every((count) => count % 2 === 0),
          `${mesh.name} open surface`,
        );
        triangles += geometry.index.count / 3;
        meshes++;
      }
    }
    assert.equal(triangles, f.stats.triangles);
    assert.equal(meshes, f.stats.meshes);
    // 现有垂直窗口内最多展示相邻三个地点，不能让全部新地形常驻视野。
    for (const y of [-355, -710, -900, -1090, -1740, -2450]) {
      const visible = f.chunks.filter((chunk) => Math.abs(y - chunk.y) < 430);
      assert.ok(visible.length <= 3);
      assert.ok(
        visible
          .flatMap(({ g }) => g.children)
          .reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0) <
          35000,
      );
    }
    assert.equal(
      f.lightSources.some((source) => source.isLight),
      false,
    );
  } finally {
    f.dispose();
  }
});

test("Actual support roots and complete sculpture/fossil footprints sit on final rock triangles", () => {
  const f = fixture();
  try {
    assert.ok(f.supportRecords.length >= 45);
    const down = new THREE.Vector3(0, -1, 0),
      ray = new THREE.Raycaster();
    for (const record of f.supportRecords) {
      const host = f.root.getObjectByName(record.host);
      assert.ok(host, record.host);
      assert.ok(record.footprint?.length >= 13, record.id);
      for (const coordinate of [record.root, ...record.footprint]) {
        const point = new THREE.Vector3(...coordinate);
        ray.set(point.clone().addScaledVector(down, -0.08), down);
        ray.far = 0.16;
        const hit = ray
          .intersectObject(host, false)
          .find(
            (hit) =>
              hit.faceIndex >= record.hostFaceRange[0] &&
              hit.faceIndex < record.hostFaceRange[1],
          );
        assert.ok(hit, `${record.site}/${record.id} unsupported footprint`);
        assert.ok(hit.point.distanceTo(point) < 0.002);
        assert.ok(hit.face.normal.y > 0.98);
      }
    }
  } finally {
    f.dispose();
  }
});

test("Kraken spirals remain visible below the actual preceding terrace underside", () => {
  const f = fixture(),
    ocean = createMarianaOcean(new THREE.Scene());
  try {
    ocean.root.updateMatrixWorld(true);
    const ceiling = ocean.root.getObjectByName("trench_layer_mariana_hydra"),
      ray = new THREE.Raycaster(),
      up = new THREE.Vector3(0, 1, 0),
      point = new THREE.Vector3();
    assert.ok(ceiling);
    let checked = 0;
    for (const solid of f.solidRecords.filter(
      (record) =>
        record.site === "kraken_echo_gallery" &&
        record.id.startsWith("spiral_"),
    )) {
      const mesh = f.root.getObjectByName(solid.host),
        positions = mesh.geometry.attributes.position,
        indices = mesh.geometry.index;
      for (let face = solid.faceRange[0]; face < solid.faceRange[1]; face++)
        for (let corner = 0; corner < 3; corner++) {
          point.fromBufferAttribute(positions, indices.getX(face * 3 + corner));
          point.applyMatrix4(mesh.matrixWorld);
          // 从深处向上找同一 x/z 的最终底面，防止点已在岩层内时误测顶面。
          ray.set(new THREE.Vector3(point.x, -790, point.z), up);
          ray.far = 220;
          const hit = ray.intersectObject(ceiling, false)[0];
          assert.ok(hit, `${solid.id} has no preceding terrace`);
          assert.ok(
            hit.point.y - point.y >= 4,
            `${solid.id} buried in terrace`,
          );
          checked++;
        }
    }
    assert.ok(checked > 1000);
  } finally {
    f.dispose();
    ocean.dispose();
  }
});

test("Complete new collider bounds reserve guardians, resident prey and closed gate extrusions", () => {
  const f = fixture();
  try {
    for (const collider of f.colliders) {
      const box = colliderBounds(collider);
      for (const reserve of MARIANA_LANDMARK_RESERVATIONS)
        assert.ok(
          box.distanceToPoint(new THREE.Vector3(...reserve.center)) >=
            reserve.radius,
          `${collider.id} occupies ${reserve.id}`,
        );
      for (const gate of MARIANA_GATES) {
        if (box.max.y < -gate.depth - 80 || box.min.y > -gate.depth + 80)
          continue;
        const dx = Math.max(box.min.x - gate.x, gate.x - box.max.x, 0),
          dz = Math.max(box.min.z - gate.z, gate.z - box.max.z, 0),
          rx = gate.width * 0.5 * 1.19 + 18,
          rz = gate.depthSize * 0.5 * 1.19 + 18;
        assert.ok(
          (dx / rx) ** 2 + (dz / rz) ** 2 > 1,
          `${collider.id} narrows ${gate.id}`,
        );
      }
    }
  } finally {
    f.dispose();
  }
});

test("Core rendered surfaces have matching solids and support bridges enter final cliff triangles", () => {
  const f = fixture(),
    ocean = createMarianaOcean(new THREE.Scene());
  try {
    const byId = new Map(
      f.colliders.map((collider) => [collider.id, collider]),
    );
    const point = new THREE.Vector3(),
      triangle = new THREE.Triangle(),
      closest = new THREE.Vector3();
    function contains(collider, value) {
      if (collider.type === "box")
        return colliderBounds(collider)
          .expandByScalar(0.001)
          .containsPoint(value);
      new THREE.Line3(collider.a, collider.b).closestPointToPoint(
        value,
        true,
        closest,
      );
      return closest.distanceToSquared(value) <= (collider.radius + 0.001) ** 2;
    }
    for (const record of f.solidRecords) {
      const host = f.root.getObjectByName(record.host),
        geometry = host.geometry,
        vertices = geometry.attributes.position,
        colliders = record.colliderIds.map((id) => byId.get(id));
      assert.ok(colliders.every(Boolean));
      for (let i = record.vertexRange[0]; i < record.vertexRange[1]; i++) {
        point.fromBufferAttribute(vertices, i);
        assert.ok(
          colliders.some((collider) => contains(collider, point)),
          `${record.site}/${record.id} vertex ${i} has no solid`,
        );
      }
      for (let i = record.faceRange[0]; i < record.faceRange[1]; i++) {
        const ids = [0, 1, 2].map((offset) =>
          geometry.index.getX(i * 3 + offset),
        );
        triangle.a.fromBufferAttribute(vertices, ids[0]);
        triangle.b.fromBufferAttribute(vertices, ids[1]);
        triangle.c.fromBufferAttribute(vertices, ids[2]);
        triangle.getMidpoint(point);
        assert.ok(
          colliders.some((collider) => contains(collider, point)),
          `${record.site}/${record.id} triangle ${i} has no solid`,
        );
      }
    }
    ocean.root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    for (const site of MARIANA_LANDMARK_SITES) {
      const bridge = byId.get(`landmark_${site.id}_wall_support`),
        walls = [];
      ocean.root.traverse((node) => {
        if (node.isMesh && node.name.startsWith(`trench_side_${site.side}_`))
          walls.push(node);
      });
      ray.set(
        new THREE.Vector3(site.center[0], bridge.y, site.center[2]),
        new THREE.Vector3(site.side, 0, 0),
      );
      ray.far = 300;
      const hit = ray.intersectObjects(walls, false)[0];
      assert.ok(hit, `${site.id} missing supporting cliff`);
      const outerX = bridge.x + site.side * bridge.halfSize.x;
      assert.ok(
        (outerX - hit.point.x) * site.side > 0.25,
        `${site.id} detached support bridge`,
      );
      const a = new THREE.Vector3(
          site.center[0],
          site.center[1] - 10,
          site.center[2],
        ),
        b = a.clone().add(new THREE.Vector3(0, -40, 0));
      const result = resolveMotion(a, b, {
        colliders: f.colliders,
        length: 32,
        radius: bodyRadius(32),
        forward: new THREE.Vector3(0, -1, 0),
        bounds,
        floorHeight: (x, z) => ocean.heightAt(x, z) + bodyRadius(32),
      });
      assert.equal(
        result.blocked,
        true,
        `${site.id} visible apron fails to block descent`,
      );
      assert.equal(result.stuck, false);
      assert.ok(result.position.y > site.center[1] - 24);
    }
  } finally {
    f.dispose();
    ocean.dispose();
  }
});

test("Final solids and real lowest ground preserve 32m descent, reverse travel, loops and turns", () => {
  const f = fixture(),
    ocean = createMarianaOcean(new THREE.Scene());
  try {
    const colliders = ocean.root.userData.marianaLandmarkGeometry
      ? ocean.colliders
      : [...ocean.colliders, ...f.colliders];
    const options = (forward) => ({
      colliders,
      length: 32,
      radius: bodyRadius(32),
      forward,
      bounds,
      floorHeight: (x, z) => ocean.heightAt(x, z) + bodyRadius(32),
    });
    function travel(from, to, label) {
      const a = new THREE.Vector3(...from),
        b = new THREE.Vector3(...to),
        forward = b.clone().sub(a).normalize();
      const result = resolveMotion(a, b, options(forward));
      assert.equal(result.stuck, false, label);
      assert.equal(
        result.blocked,
        false,
        `${label}: ${result.contacts.map((c) => c.collider?.id).join(",")}`,
      );
      assert.ok(
        b.distanceTo(
          new THREE.Vector3(
            result.position.x,
            result.position.y,
            result.position.z,
          ),
        ) < 0.002,
        label,
      );
    }
    for (const direction of [-1, 1]) {
      const spine =
        direction > 0
          ? MARIANA_LANDMARK_SPINE
          : [...MARIANA_LANDMARK_SPINE].reverse();
      for (let i = 1; i < spine.length; i++)
        travel(spine[i - 1], spine[i], `spine ${direction}/${i}`);
      for (const route of f.routes) {
        travel(route.entrance, route.center, `${route.id} approach`);
        travel(route.center, route.entrance, `${route.id} exit`);
        let previous;
        for (let i = 0; i <= 128; i++) {
          const angle = direction * (i / 128) * Math.PI * 2,
            point = {
              x: route.center[0] + Math.cos(angle) * route.turnRadius,
              y: route.center[1],
              z: route.center[2] + Math.sin(angle) * route.turnRadius,
            },
            forward = {
              x: -Math.sin(angle) * direction,
              y: 0,
              z: Math.cos(angle) * direction,
            };
          assert.equal(
            isPositionBlocked(point, options(forward)),
            false,
            `${route.id} turn ${direction}/${i}`,
          );
          if (previous) {
            const result = resolveMotion(previous, point, options(forward));
            assert.equal(
              result.blocked,
              false,
              `${route.id} sweep ${direction}/${i}`,
            );
            assert.equal(result.stuck, false);
          }
          previous = point;
        }
      }
    }
    for (const gate of MARIANA_GATES) {
      const above = [gate.x, -gate.depth + 65, gate.z],
        below = [gate.x, -gate.depth - 65, gate.z];
      travel(above, below, `${gate.id} opened descent`);
      travel(below, above, `${gate.id} opened return`);
      const closed = resolveMotion(
        new THREE.Vector3(...above),
        new THREE.Vector3(...below),
        {
          ...options(new THREE.Vector3(0, -1, 0)),
          colliders: [...colliders, ...ocean.barriers],
        },
      );
      assert.equal(closed.blocked, true);
      assert.ok(closed.position.y > -gate.depth - 40);
    }
  } finally {
    f.dispose();
    ocean.dispose();
  }
});
