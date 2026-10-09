import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createMarianaOcean } from "../src/mariana_ocean.js";
import {
  MARIANA_OUTCROPS,
  MARIANA_MAZE_ROUTE,
} from "../src/mariana_outcrops.js";
import { MARIANA_LANDMARK_RESERVATIONS } from "../src/mariana_landmarks.js";
import { MARIANA_GATES, MARIANA_WORLD } from "../src/mariana_config.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";

function box(collider) {
  const center = new THREE.Vector3(collider.x, collider.y, collider.z);
  return new THREE.Box3(
    center.clone().sub(collider.halfSize),
    center.clone().add(collider.halfSize),
  );
}

test("Suspended strata are closed outward terrain with bounded solid contacts and protected encounter space", () => {
  const scene = new THREE.Scene(),
    ocean = createMarianaOcean(scene);
  try {
    scene.updateMatrixWorld(true);
    const meshes = ocean.root.children.filter((g) =>
      g.name.startsWith("trench_suspended_"),
    );
    const colliders = ocean.colliders.filter((c) =>
      c.id.startsWith("mariana_suspended_"),
    );
    assert.equal(ocean.root.userData.marianaOutcrops.count, 8);
    assert.equal(meshes.length, ocean.root.userData.marianaOutcrops.chunks);
    assert.equal(
      colliders.length,
      ocean.root.userData.marianaOutcrops.colliders,
    );
    let triangles = 0;
    for (const group of meshes) {
      assert.equal(group.children.length, 1);
      const mesh = group.children[0],
        geometry = mesh.geometry;
      assert.equal(mesh.material.side, THREE.FrontSide);
      const position = geometry.attributes.position,
        edges = new Map();
      let volume = 0;
      const a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3(),
        cross = new THREE.Vector3();
      const key = (i) =>
        [position.getX(i), position.getY(i), position.getZ(i)].join(",");
      for (let i = 0; i < geometry.index.count; i += 3) {
        const ids = [0, 1, 2].map((k) => geometry.index.getX(i + k));
        a.fromBufferAttribute(position, ids[0]);
        b.fromBufferAttribute(position, ids[1]);
        c.fromBufferAttribute(position, ids[2]);
        cross.copy(b).sub(a).cross(c.clone().sub(a));
        assert.ok(cross.lengthSq() > 1e-8, "No degenerate face");
        volume += a.dot(b.clone().cross(c)) / 6;
        for (let k = 0; k < 3; k++) {
          const from = key(ids[k]),
            to = key(ids[(k + 1) % 3]);
          const id = [from, to].sort().join("|");
          const record = edges.get(id) || { count: 0, direction: 0 };
          record.count++;
          record.direction += from < to ? 1 : -1;
          edges.set(id, record);
        }
        triangles++;
      }
      assert.ok(volume > 0, "Outward winding");
      for (const edge of edges.values()) {
        assert.equal(edge.count, 2, "Closed terrain edge");
        assert.equal(edge.direction, 0, "Adjacent faces agree");
      }
      const contacts = colliders.map(box);
      for (let i = 0; i < position.count; i++) {
        a.fromBufferAttribute(position, i);
        assert.ok(
          contacts.some((bounds) =>
            bounds.clone().expandByScalar(0.002).containsPoint(a),
          ),
          "Rendered surface has a contact boundary",
        );
      }
    }
    assert.equal(triangles, ocean.root.userData.marianaOutcrops.triangles);
    assert.ok(triangles < 10000);
    for (const collider of colliders) {
      const bounds = box(collider);
      assert.ok(
        bounds.min.x >= MARIANA_WORLD.minX + 5 &&
          bounds.max.x <= MARIANA_WORLD.maxX - 5,
      );
      assert.ok(
        bounds.min.z >= MARIANA_WORLD.minZ + 5 &&
          bounds.max.z <= MARIANA_WORLD.maxZ - 5,
      );
      assert.ok(bounds.min.y > -2600, "Final neighborhood remains clear");
      for (const reservation of MARIANA_LANDMARK_RESERVATIONS)
        assert.ok(
          bounds.distanceToPoint(new THREE.Vector3(...reservation.center)) >
            reservation.radius + 5,
          `${collider.id} enters ${reservation.id}`,
        );
      for (const gate of MARIANA_GATES)
        assert.ok(
          bounds.max.y < -gate.depth - 40 || bounds.min.y > -gate.depth + 40,
          "Existing terrace roof/floor remains separate",
        );
    }
    assert.equal(new Set(colliders.map((c) => c.id)).size, colliders.length);
    for (const reservation of MARIANA_LANDMARK_RESERVATIONS)
      assert.equal(
        isPositionBlocked(new THREE.Vector3(...reservation.center), {
          colliders,
          radius: reservation.radius,
        }),
        false,
        `${reservation.id} retains the actual runtime clearance`,
      );
    for (const site of MARIANA_OUTCROPS) {
      const contacts = colliders
        .filter((c) => c.id.startsWith(`${site.id}_`))
        .map(box);
      for (const t of [-0.9, -0.5, 0, 0.5, 0.9])
        assert.ok(
          contacts.some((b) =>
            b.containsPoint(
              new THREE.Vector3(
                site.center[0],
                site.center[1] + t * site.axes[1],
                site.center[2],
              ),
            ),
          ),
          "Rock cores cannot be entered",
        );
    }
  } finally {
    ocean.dispose();
  }
});

test("Giant staggered shelves interrupt real terrain sightlines and admit grown-body turns", () => {
  const ocean = createMarianaOcean(new THREE.Scene());
  try {
    ocean.root.updateMatrixWorld(true);
    const meshes = [];
    ocean.root.traverse((node) => {
      if (node.isMesh && node.parent.name.startsWith("trench_suspended_"))
        meshes.push(node);
    });
    const ray = new THREE.Raycaster();
    // 旧空旷段的远端现在被真实岩面遮住；不靠雾、相机或碰撞元数据假装成迷宫。
    for (const [name, from, to] of [
      ["upper", [0, -110, -390], [0, -380, -390]],
      ["echo", [0, -780, -390], [170, -700, -390]],
      ["middle", [0, -1180, -400], [-110, -1080, -290]],
      ["lower", [0, -1560, -390], [0, -1900, -390]],
      ["final", [0, -2220, -410], [0, -2590, -410]],
    ]) {
      const a = new THREE.Vector3(...from),
        b = new THREE.Vector3(...to);
      ray.set(a, b.clone().sub(a).normalize());
      ray.far = a.distanceTo(b);
      assert.ok(ray.intersectObjects(meshes, false).length > 0, name);
    }
    assert.ok(
      MARIANA_OUTCROPS.filter((site) => site.axes[0] >= 140).length >= 7,
      "Most shelves span a declared 280m or more instead of tiny islands",
    );
    for (const point of MARIANA_MAZE_ROUTE)
      for (const pitch of [-Math.PI / 2, 0, Math.PI / 2])
        for (let i = 0; i < 16; i++) {
          const yaw = (i / 16) * Math.PI * 2;
          assert.equal(
            isPositionBlocked(new THREE.Vector3(...point), {
              colliders: ocean.colliders,
              radius: bodyRadius(32),
              length: 32,
              forward: new THREE.Vector3(
                Math.sin(yaw) * Math.cos(pitch),
                Math.sin(pitch),
                Math.cos(yaw) * Math.cos(pitch),
              ),
            }),
            false,
            `32m turn at ${point}, yaw ${i}, pitch ${pitch}`,
          );
        }
  } finally {
    ocean.dispose();
  }
});

test("Suspended strata use existing depth culling and release each owned resource once", () => {
  const scene = new THREE.Scene(),
    ocean = createMarianaOcean(scene),
    disposed = new Map();
  const groups = ocean.root.children.filter((g) =>
    g.name.startsWith("trench_suspended_"),
  );
  for (const g of groups)
    g.traverse((n) => {
      for (const resource of [n.geometry, n.material])
        if (resource && !disposed.has(resource)) {
          disposed.set(resource, 0);
          resource.addEventListener("dispose", () =>
            disposed.set(resource, disposed.get(resource) + 1),
          );
        }
    });
  ocean.update(0, new THREE.Vector3(0, -250, -360), 0, true);
  assert.ok(groups.some((g) => g.visible) && groups.some((g) => !g.visible));
  ocean.update(1, new THREE.Vector3(0, -2735, -430), 0, false);
  assert.ok(groups.filter((g) => g.visible).length <= 3);
  assert.ok(
    groups
      .filter((g) => g.visible)
      .every((g) => new THREE.Box3().setFromObject(g).max.y < -2200),
  );
  ocean.dispose();
  ocean.dispose();
  assert.equal(scene.children.length, 0);
  for (const count of disposed.values()) assert.equal(count, 1);
});
