import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisExplorationFurniture } from "../src/atlantis_exploration_furniture.js";
import {
  ATLANTIS_EXCAVATION_SITES,
  atlantisSeabedHeight,
} from "../src/atlantis_terrain.js";
import { GEOMETRIES } from "../src/atlantis_art_geometry.js";
import {
  bodyRadius,
  castSegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";

const SITE = ATLANTIS_EXCAVATION_SITES[0];

// 复现独立审查中的可见拱盖穿透，同时保护弧面上方原本开放的空间。
test("Carved chest lid collision follows the rendered arch and leaves its upper corners open", (t) => {
  const furniture = createFixture(t);
  for (const dz of [0, 0.35, 0.65, 0.79]) {
    const top = -194 + 1.58 + Math.sqrt(0.82 ** 2 - dz ** 2);
    const start = new THREE.Vector3(-206.2, -191, -226.4 + dz);
    const end = new THREE.Vector3(-206.2, -192.4, -226.4 + dz);
    const visual = visibleHit(furniture.root, start, end);
    const contact = castSegment(start, end, furniture.colliders);
    assert.ok(visual && contact, `Arch surface at depth offset ${dz}`);
    assert.ok(Math.abs(visual.point.y - top) < 0.01);
    assert.ok(Math.abs(visual.distance - contact.distance) < 0.073);
  }
  for (const reverse of [false, true]) {
    const a = { x: -209, y: -191.8, z: -226.4 };
    const b = { x: -203, y: -191.8, z: -226.4 };
    const start = reverse ? b : a;
    const end = reverse ? a : b;
    const visual = visibleHit(furniture.root, start, end);
    const contact = castSegment(start, end, furniture.colliders);
    assert.ok(visual && contact, "Previously penetrable upper end cap");
    assert.ok(Math.abs(visual.distance - contact.distance) < 0.01);
  }
  const openStart = { x: -209, y: -191.7, z: -225.65 };
  const openEnd = { x: -203, y: -191.7, z: -225.65 };
  assert.equal(visibleHit(furniture.root, openStart, openEnd), undefined);
  assert.equal(castSegment(openStart, openEnd, furniture.colliders), null);
});

test("Juvenile bodies cannot cross the previously unblocked chest lid at high or low speed", (t) => {
  const furniture = createFixture(t);
  for (const reverse of [false, true])
    for (const steps of [1, 60]) {
      const start = new THREE.Vector3(reverse ? -203 : -209, -191.5, -226.4);
      const end = new THREE.Vector3(reverse ? -209 : -203, -191.5, -226.4);
      const forward = end.clone().sub(start).normalize();
      let position = start;
      let blocked = false;
      for (let step = 1; step <= steps; step += 1) {
        const result = resolveMotion(
          position,
          start.clone().lerp(end, step / steps),
          {
            colliders: furniture.colliders,
            radius: bodyRadius(3),
            length: 3,
            forward,
          },
        );
        assert.equal(result.stuck, false);
        position = result.position;
        blocked ||= result.blocked;
        if (blocked) break;
      }
      assert.equal(blocked, true, `${steps} steps, reverse=${reverse}`);
      assert.ok(Math.abs(position.x - end.x) > 1);
    }
});

test("Bench rails and supports block their real surfaces while the space below the seat stays open", (t) => {
  const furniture = createFixture(t);
  for (const [x, y, solid] of [
    [-190.2, -192.58, true],
    [-188.75, -193.45, true],
    [-190.2, -193.45, false],
  ]) {
    const start = { x, y, z: -231 };
    const end = { x, y, z: -228 };
    const visual = visibleHit(furniture.root, start, end);
    const contact = castSegment(start, end, furniture.colliders);
    assert.equal(!!visual, solid, "Visible bench structure");
    assert.equal(!!contact, solid, "Matching bench contact");
    if (solid) assert.ok(Math.abs(visual.distance - contact.distance) < 0.001);
  }
});

test("Furniture placement checks identity, tilted and enclosed host boxes through their real transforms", (t) => {
  for (const quaternion of [
    new THREE.Quaternion(),
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0.4, Math.PI / 4, 0.25),
    ),
  ]) {
    const host = {
      type: "box",
      x: -193.8,
      y: -193,
      z: -228.4,
      halfSize: { x: 0.08, y: 1.5, z: 4 },
    };
    host.rotation = {
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w,
    };
    const furniture = createFixture(t, { hostColliders: [host] });
    assert.ok(
      furniture.stats.dropped.some(
        (item) => item.kind === "table" && item.x === -193.8,
      ),
    );
  }
  const enclosed = createFixture(t, {
    hostColliders: [
      {
        type: "box",
        x: -193.8,
        y: -193,
        z: -228.4,
        halfSize: { x: 0.1, y: 0.1, z: 0.1 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    ],
  });
  assert.ok(
    enclosed.stats.dropped.some(
      (item) => item.kind === "table" && item.x === -193.8,
    ),
  );
});

test("A supporting deck is allowed without skipping intersecting rotated walls", (t) => {
  const furniture = createFixture(t, {
    hostColliders: [
      {
        type: "box",
        x: -193.8,
        y: -195,
        z: -228.4,
        halfSize: { x: 4, y: 1, z: 4 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    ],
  });
  assert.equal(furniture.stats.placed.table, 2);
  assert.equal(furniture.stats.dropped.length, 0);
});

test("Rebuilding furniture reads a reused host's current transform and leaves host geometry unchanged", (t) => {
  const host = {
    type: "box",
    x: -193.8,
    y: -193,
    z: -228.4,
    halfSize: { x: 0.1, y: 0.1, z: 0.1 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
  };
  const before = structuredClone(host);
  const first = createFixture(t, { hostColliders: [host] });
  assert.ok(first.stats.dropped.some((item) => item.kind === "table"));
  assert.deepEqual(host, before);

  // 同一对象从桌内阻挡物改为支撑楼板，下一次构造不得保留旧棱边。
  host.y = -195;
  host.halfSize = { x: 4, y: 1, z: 4 };
  const moved = structuredClone(host);
  const second = createFixture(t, { hostColliders: [host] });
  const clear = createFixture(t);
  assert.deepEqual(second.stats, clear.stats);
  assert.deepEqual(second.colliders, clear.colliders);
  assert.deepEqual(host, moved);
});

test("Street amphora retreats past the projecting foundation and is supported across the real slope", (t) => {
  const facade = {
    center: { x: -251.83866066327317, z: -164.0639279592782 },
    normal: { x: 0, z: -1 },
  };
  const foundation = {
    type: "box",
    x: -251,
    y: -91,
    z: -154,
    halfSize: { x: 9.65, y: 9, z: 10.9 },
  };
  const furniture = createFixture(t, {
    facades: [facade],
    hostColliders: [foundation],
  });
  assert.equal(furniture.stats.placed.amphora, 2);
  assert.equal(furniture.stats.dropped.length, 0);
  const outside = furniture.colliders.filter((c) => c.x < -250 && c.z > -180);
  const support = outside.find((c) => c.y < -95.5);
  assert.ok(support, "A real stone footing must bridge the slope");
  assert.ok(support.z + 1.5 < foundation.z - foundation.halfSize.z);
  for (let ix = 0; ix <= 6; ix += 1)
    for (let iz = 0; iz <= 6; iz += 1) {
      const x = support.x + (ix / 6 - 0.5) * 3.38;
      const z = support.z + (iz / 6 - 0.5) * 2.58;
      const ground = atlantisSeabedHeight(x, z);
      assert.ok(support.y - support.halfSize.y < ground);
      assert.ok(support.y + support.halfSize.y > ground);
      assert.ok(
        isPositionBlocked(
          { x, y: ground + 0.005, z },
          { colliders: [support] },
        ),
      );
    }
  const start = { x: support.x - 3, y: support.y, z: support.z };
  const end = { x: support.x + 3, y: support.y, z: support.z };
  const visual = visibleHit(furniture.root, start, end);
  const contact = castSegment(start, end, [support]);
  assert.ok(visual && contact);
  assert.ok(Math.abs(visual.distance - contact.distance) < 0.001);
});

test("Facade amphora respects the shaft keep-out and host obstruction instead of bypassing validation", (t) => {
  const inShaft = createFixture(t, {
    heightAt: () => -194,
    facades: [{ center: { x: -198, z: -247 }, normal: { x: 1, z: 0 } }],
  });
  assert.equal(inShaft.stats.placed.amphora, 1);
  assert.ok(inShaft.stats.dropped.some((item) => item.kind === "amphora"));
  const obstructed = createFixture(t, {
    heightAt: () => -194,
    facades: [{ center: { x: -120, z: -180 }, normal: { x: 1, z: 0 } }],
    hostColliders: [
      {
        type: "box",
        x: -120,
        y: -193,
        z: -180,
        halfSize: { x: 10, y: 3, z: 10 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
    ],
  });
  assert.equal(obstructed.stats.placed.amphora, 1);
  assert.ok(obstructed.stats.dropped.some((item) => item.kind === "amphora"));
});

test("A translated future site moves furniture, scatter, landmarks and visibility together", (t) => {
  const delta = { x: 300, y: -25, z: -300 };
  const translatedSite = translateSite(SITE, delta);
  const original = createFixture(t);
  const translated = createFixture(t, {
    site: translatedSite,
    heightAt: (x, z) =>
      atlantisSeabedHeight(x - delta.x, z - delta.z) + delta.y,
  });
  assert.deepEqual(translated.stats.placed, original.stats.placed);
  assert.equal(translated.stats.scatter, original.stats.scatter);
  assert.equal(translated.colliders.length, original.colliders.length);
  for (const [i, collider] of original.colliders.entries()) {
    const moved = translated.colliders[i];
    for (const axis of ["x", "y", "z"])
      assert.ok(Math.abs(moved[axis] - collider[axis] - delta[axis]) < 1e-8);
    assert.deepEqual(moved.halfSize, collider.halfSize);
  }
  for (const [i, landmark] of original.landmarks.entries())
    for (const axis of ["x", "y", "z"])
      assert.ok(
        Math.abs(
          translated.landmarks[i].position[axis] -
            landmark.position[axis] -
            delta[axis],
        ) < 1e-8,
      );
  for (const [i, mesh] of original.root.children.entries()) {
    const moved = translated.root.children[i];
    const a = new THREE.Box3().setFromObject(mesh);
    const b = new THREE.Box3().setFromObject(moved);
    for (const axis of ["x", "y", "z"])
      for (const edge of ["min", "max"])
        assert.ok(
          Math.abs(b[edge][axis] - a[edge][axis] - delta[axis]) < 0.0001,
        );
  }
  translated.update(0, 0, { x: 85, z: -548 });
  assert.equal(translated.root.visible, true);
  translated.update(0, 0, { x: -215, z: -248 });
  assert.equal(translated.root.visible, false);
});

test("Disposing one furniture scene releases only its owned meshes and preserves another instance and cached geometry", (t) => {
  const first = createFixture(t);
  const second = createFixture(t);
  const stats = structuredClone(first.stats);
  const firstMeshes = [...first.root.children];
  const secondMeshes = [...second.root.children];
  let sharedDisposals = 0,
    firstDisposals = 0,
    secondDisposals = 0;
  const listeners = [];
  for (const geometry of GEOMETRIES.values()) {
    const listener = () => (sharedDisposals += 1);
    geometry.addEventListener("dispose", listener);
    listeners.push([geometry, listener]);
  }
  for (const mesh of firstMeshes)
    (mesh.isInstancedMesh ? mesh : mesh.geometry).addEventListener(
      "dispose",
      () => (firstDisposals += 1),
    );
  for (const mesh of secondMeshes)
    (mesh.isInstancedMesh ? mesh : mesh.geometry).addEventListener(
      "dispose",
      () => (secondDisposals += 1),
    );
  first.dispose();
  first.dispose();
  assert.equal(firstDisposals, firstMeshes.length);
  assert.equal(secondDisposals, 0);
  assert.equal(sharedDisposals, 0);
  assert.equal(first.root.parent, null);
  assert.equal(first.colliders.length, 0);
  assert.equal(first.landmarks.length, 0);
  assert.ok(second.root.parent);
  assert.ok(
    visibleHit(
      second.root,
      { x: -209, y: -191.8, z: -226.4 },
      { x: -203, y: -191.8, z: -226.4 },
    ),
  );
  const recreated = createFixture(t);
  assert.deepEqual(recreated.stats, stats);
  for (const [geometry, listener] of listeners)
    geometry.removeEventListener("dispose", listener);
});

function createFixture(t, options = {}) {
  const furniture = createAtlantisExplorationFurniture(new THREE.Group(), {
    heightAt: atlantisSeabedHeight,
    ...options,
  });
  t.after(() => furniture.dispose());
  return furniture;
}

function visibleHit(root, from, to) {
  root.updateMatrixWorld(true);
  const start = new THREE.Vector3(from.x, from.y, from.z);
  const end = new THREE.Vector3(to.x, to.y, to.z);
  return new THREE.Raycaster(
    start,
    end.clone().sub(start).normalize(),
    0,
    start.distanceTo(end),
  ).intersectObject(root, true)[0];
}

function translateSite(site, delta) {
  const copy = structuredClone(site);
  const move = (object) => {
    for (const [key, value] of Object.entries(object)) {
      if (value && typeof value === "object") move(value);
      else if (["x", "minX", "maxX"].includes(key)) object[key] += delta.x;
      else if (["z", "minZ", "maxZ", "topZ", "bottomZ"].includes(key))
        object[key] += delta.z;
      else if (
        ["y", "floorY", "ceilingY", "sillY", "topY", "bottomY"].includes(key)
      )
        object[key] += delta.y;
    }
  };
  move(copy);
  copy.id = "translated_future_halls";
  return copy;
}
