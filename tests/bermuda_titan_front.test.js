import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import packed from "../src/assets/models/bermuda_titan_head_hf_mesh.json" with { type: "json" };
import {
  acquireBermudaTitanHeadAsset,
  TITAN_ARM_RIG,
  titanArmPose,
  TITAN_BREATH_LIFT,
} from "../src/bermuda_titan_head_asset.js";
import { createCreature } from "../src/creatures.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import {
  createBermudaTitanFront,
  TITAN_FRONT_MOUTH,
  TITAN_FRONT_EYELIDS,
} from "../src/bermuda_titan_front.js";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";
import { isPositionBlocked, castSegment } from "../src/collision.js";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("Crossed titan retains the inspected HF source, original PBR and bounded distinct LODs", async () => {
  const a = acquireBermudaTitanHeadAsset();
  try {
    assert.equal(
      packed.sourceSha256,
      "a510c4ea2fccfff6bc9ec5d0e7bc7921e25c475bab3610c5eccab03b13280e7b",
    );
    assert.equal(packed.sourceNormalization.yaw, Math.PI);
    assert.ok(
      Math.abs(a.geometry.boundingBox.getSize(new THREE.Vector3()).x - 1) <
        0.002,
    );
    assert.ok(a.geometry.index.count / 3 <= 37000);
    assert.ok(a.farGeometry.index.count / 3 <= 3000);
    assert.equal(
      a.geometry.attributes.skinWeight,
      a.farGeometry.attributes.skinWeight,
    );
    assert.ok(a.contacts.length < 6000);
    assert.equal(packed.conversion.collisionMode, "close6");
    for (const texture of Object.values(packed.pbr.textures)) {
      const bytes = await readFile(
        new URL(`../src/assets/models/${texture.file}`, import.meta.url),
      );
      assert.equal(hash(bytes), texture.sourceSha256);
      assert.equal(hash(bytes), texture.sha256);
    }
    const weights = a.geometry.attributes.skinWeight,
      positions = a.geometry.attributes.position,
      seen = new Map();
    for (let i = 0; i < weights.count; i++) {
      const w = [
        weights.getX(i),
        weights.getY(i),
        weights.getZ(i),
        weights.getW(i),
      ];
      assert.ok(w.every((x) => x >= 0 && x <= 1));
      assert.ok(Math.abs(w.reduce((n, x) => n + x, 0) - 1) < 1e-6);
      const key = [
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i),
      ].join(",");
      if (seen.has(key))
        assert.deepEqual(
          w,
          seen.get(key),
          "UV seam copies must deform identically",
        );
      else seen.set(key, w);
    }
  } finally {
    a.release();
  }
});

test("Inhalation raises the continuous forequarters and independently releases both shoulders without moving the root", (t) => {
  const parent = new THREE.Group(),
    front = createBermudaTitanFront(parent),
    p = new THREE.Vector3(),
    q = new THREE.Vector3();
  try {
    const root = front.root.matrixWorld.toArray(),
      mouth = front.getMouthPose().position.clone();
    const closed = [];
    for (let i = 0; i < front.near.geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(front.near.geometry.attributes.position, i);
      front.near.getVertexPosition(i, p);
      closed.push(p.clone());
    }
    let moved = 0,
      max = 0;
    front.setGuard(0);
    front.update(0);
    for (let i = 0; i < front.near.geometry.attributes.position.count; i++) {
      p.fromBufferAttribute(front.near.geometry.attributes.position, i);
      q.copy(p);
      front.near.getVertexPosition(i, q);
      const distance = closed[i].distanceTo(q) * 120;
      if (distance > 0.2) moved++;
      max = Math.max(max, distance);
      assert.ok(q.distanceTo(front.deformLocal(p, new THREE.Vector3())) < 1e-6);
    }
    assert.ok(moved > 1000);
    assert.ok(max > 4 && max < TITAN_ARM_RIG.maximumMotion * 120);
    t.diagnostic(
      JSON.stringify({
        contacts: front.restContacts.length,
        dynamic: front.dynamicRestContacts.length,
        fixed: front.staticContacts.length,
        closedToOpenMetres: max,
      }),
    );
    assert.notEqual(front.bones.leftArm, front.bones.rightArm);
    assert.ok(
      front.bones.leftArm.quaternion.angleTo(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(titanArmPose(0).pitch, titanArmPose(0).yaw, 0, "YXZ"),
        ),
      ) < 1e-8,
    );
    assert.ok(
      front.bones.rightArm.quaternion.angleTo(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            titanArmPose(0).pitch,
            titanArmPose(0).rightYaw,
            0,
            "YXZ",
          ),
        ),
      ) < 1e-8,
    );
    assert.deepEqual(front.root.matrixWorld.toArray(), root);
    assert.ok(
      Math.abs(
        front.getMouthPose().position.y -
          mouth.y -
          TITAN_BREATH_LIFT.height * 120,
      ) < 1e-8,
    );
    assert.ok(
      front.getMouthPose().direction.distanceTo(new THREE.Vector3(0, 0, -1)) <
        1e-8,
    );
    front.setAwareness(1);
    front.update(1);
    assert.ok(front.getMouthPose().position.y > mouth.y + 0.5);
    assert.ok(front.getMouthPose().direction.y > 0);
    const posed = front.getAnchorWorld(new THREE.Vector3(...TITAN_FRONT_MOUTH));
    assert.ok(posed.distanceTo(front.getMouthPose().position) < 1e-8);
    assert.deepEqual(front.root.matrixWorld.toArray(), root);
    front.setAwareness(0);
    front.setGuard(1);
    front.update(0);
    assert.ok(front.getMouthPose().position.distanceTo(mouth) < 1e-8);
  } finally {
    front.dispose();
  }
  assert.equal(parent.children.length, 0);
});

test("Every actual posed vertex has a corresponding local contact without mutating the rest grid", () => {
  const front = createBermudaTitanFront(new THREE.Group()),
    p = new THREE.Vector3();
  const before = JSON.stringify(front.restContacts),
    point = front.near.geometry.attributes.position;
  try {
    for (const [guard, awareness] of [
      [1, 0],
      [0.5, 0],
      [0, 0],
      [0, 1],
    ]) {
      front.setGuard(guard);
      front.setAwareness(awareness);
      front.update(0);
      // 离线覆盖oracle按本姿态建精确空间索引；生产不可变rest索引另有逐接触包络/查询回归。
      const actualContacts = createStaticColliderGrid(
        [
          ...front.staticContacts,
          ...front.dynamicRestContacts.map((c) =>
            front.getPosedContact(c.index),
          ),
        ],
        { cellSize: 0.04, maxCellsPerCollider: 128 },
      );
      for (let i = 0; i < point.count; i++) {
        p.fromBufferAttribute(point, i);
        front.near.getVertexPosition(i, p);
        const cs = actualContacts.query(p);
        assert.ok(
          isPositionBlocked(p, { radius: 0.00025, colliders: cs }),
          `Uncovered posed vertex ${i} at ${guard}/${awareness}`,
        );
      }
    }
    assert.equal(JSON.stringify(front.restContacts), before);
    assert.ok(front.queryDynamicContacts({ x: 4, y: 4, z: 4 }).length === 0);
    assert.ok(
      front.staticContacts.length > 0 && front.dynamicRestContacts.length > 0,
    );
  } finally {
    front.dispose();
  }
});

test("Front instances share geometry but preserve independent skeletons, guard state and resources", () => {
  const a = createBermudaTitanFront(new THREE.Group()),
    b = createBermudaTitanFront(new THREE.Group());
  let disposed = 0;
  for (const resource of [
    a.asset.geometry,
    a.asset.farGeometry,
    a.asset.material,
    a.asset.farMaterial,
  ])
    resource.addEventListener("dispose", () => disposed++);
  try {
    assert.equal(a.near.geometry, b.near.geometry);
    assert.notEqual(a.skeleton, b.skeleton);
    assert.notEqual(a.near.material, b.near.material);
    a.setGuard(0);
    assert.equal(b.bones.leftArm.position.y, -0.06);
    assert.ok(
      b.bones.leftArm.quaternion.angleTo(a.bones.leftArm.quaternion) > 0.1,
    );
    a.dispose();
    a.dispose();
    assert.equal(disposed, 0);
    b.dispose();
    assert.equal(disposed, 4);
  } finally {
    a.dispose();
    b.dispose();
  }
});

test("Preparing an already-instantiated front applies the original maps to its private material", async () => {
  const old = {
      window: globalThis.window,
      fetch: globalThis.fetch,
      createImageBitmap: globalThis.createImageBitmap,
    },
    front = createBermudaTitanFront(new THREE.Group());
  let requests = 0,
    closed = 0;
  globalThis.window = { addEventListener() {} };
  globalThis.fetch = async () => {
    requests++;
    return { ok: true, blob: async () => ({}) };
  };
  globalThis.createImageBitmap = async () => ({
    width: 1,
    height: 1,
    close() {
      closed++;
    },
  });
  try {
    assert.equal(front.near.material.map, null);
    assert.equal(await front.prepare({ priority: 100 }), true);
    assert.equal(requests, 2);
    assert.equal(front.near.material.map, front.asset.material.map);
    assert.equal(front.near.material.map.colorSpace, THREE.SRGBColorSpace);
    assert.equal(
      front.near.material.metalnessMap,
      front.near.material.roughnessMap,
    );
    assert.equal(
      front.near.material.roughnessMap.colorSpace,
      THREE.NoColorSpace,
    );
    assert.equal(front.near.material.vertexColors, false);
    assert.equal(front.far.material.map, null);
    await front.prepare();
    assert.equal(requests, 2);
    front.dispose();
    assert.equal(closed, 2);
  } finally {
    front.dispose();
    for (const [k, v] of Object.entries(old))
      if (v === undefined) delete globalThis[k];
      else globalThis[k] = v;
  }
});

test("Real posed triangles retain their winding through brace and head motion", () => {
  const front = createBermudaTitanFront(new THREE.Group()),
    g = front.near.geometry,
    p = g.attributes.position,
    index = g.index,
    rest = new THREE.Triangle(),
    posed = new THREE.Triangle(),
    nr = new THREE.Vector3(),
    np = new THREE.Vector3();
  try {
    for (const guard of [0, 0.5, 1])
      for (const awareness of [0, 1]) {
        front.setGuard(guard);
        front.setAwareness(awareness);
        front.update(0);
        for (let i = 0; i < index.count; i += 3) {
          for (let k = 0; k < 3; k++) {
            rest[["a", "b", "c"][k]].fromBufferAttribute(p, index.getX(i + k));
            front.deformLocal(
              rest[["a", "b", "c"][k]],
              posed[["a", "b", "c"][k]],
            );
          }
          if (rest.getArea() < 1e-8) continue;
          assert.ok(
            rest.getNormal(nr).dot(posed.getNormal(np)) > 0,
            `Folded skin triangle ${i / 3} at ${guard}/${awareness}`,
          );
          assert.ok(
            posed.getArea() > rest.getArea() * 0.2,
            `Collapsed triangle ${i / 3}`,
          );
        }
      }
  } finally {
    front.dispose();
  }
});

test("Mouth and asymmetric eyelid anchors lie on the actual inspected skin", () => {
  const asset = acquireBermudaTitanHeadAsset(),
    p = asset.geometry.attributes.position,
    index = asset.geometry.index,
    tri = new THREE.Triangle(),
    nearest = new THREE.Vector3();
  try {
    for (const [anchor, limit] of [
      [TITAN_FRONT_MOUTH, 0.5],
      ...TITAN_FRONT_EYELIDS.flat().map((p) => [p, 0.01]),
    ]) {
      const point = new THREE.Vector3(...anchor);
      let distance = Infinity;
      for (let i = 0; i < index.count; i += 3) {
        tri.a.fromBufferAttribute(p, index.getX(i));
        tri.b.fromBufferAttribute(p, index.getX(i + 1));
        tri.c.fromBufferAttribute(p, index.getX(i + 2));
        distance = Math.min(
          distance,
          tri.closestPointToPoint(point, nearest).distanceTo(point) * 120,
        );
      }
      assert.ok(
        distance < limit,
        `Anchor ${anchor} is ${distance}m from real skin`,
      );
    }
  } finally {
    asset.release();
  }
});

test("A grown 32m body approaches and retreats from an actual held crystal surface through the open hands", () => {
  const front = createBermudaTitanFront(new THREE.Group()),
    asset = createBermudaTitanRelic(),
    avatar = createCreature("orca", 6),
    closedPoint = new THREE.Vector3(0, -0.241, -0.34),
    open = new THREE.Vector3(0, -0.2038, -0.5071666666666667),
    forward = new THREE.Vector3(0, 0, 1),
    wait = open.clone().addScaledVector(forward, -18 / 120),
    ray = new THREE.Raycaster(),
    dimensions = { length: 32 / 120, forward, radius: (32 * 0.13) / 120 },
    grid = createStaticColliderGrid(front.staticContacts, {
      cellSize: 0.09,
      maxCellsPerCollider: 128,
    });
  const contacts = (point) => [
    ...grid.query(point, point, { padding: (32 * 0.6) / 120 }),
    ...front.queryDynamicContacts(point, point, { padding: (32 * 0.6) / 120 }),
  ];
  try {
    front.setGuard(1);
    assert.equal(
      isPositionBlocked(wait, { ...dimensions, colliders: contacts(wait) }),
      false,
    );
    assert.equal(
      isPositionBlocked(open, { ...dimensions, colliders: contacts(open) }),
      true,
      "Closed sleeping anatomy physically blocks the adult dock",
    );
    front.setGuard(0);
    front.update(0);
    for (let i = 0; i <= 36; i++) {
      const point = wait.clone().lerp(open, i / 36);
      assert.equal(
        isPositionBlocked(point, { ...dimensions, colliders: contacts(point) }),
        false,
        `Real open approach/retreat point ${i}`,
      );
    }
    asset.root.position.copy(closedPoint).multiplyScalar(120);
    avatar.scale.setScalar(32);
    avatar.position.copy(open).multiplyScalar(120);
    avatar.rotation.set(
      Math.asin(forward.y),
      Math.atan2(-forward.x, -forward.z),
      0,
      "YXZ",
    );
    avatar.userData.animate?.(0, 0.9, { dt: 0 });
    avatar.updateMatrixWorld(true);
    avatar.traverse((node) => node.skeleton?.update());
    const intake = avatar.userData.getFeedingMouth(new THREE.Vector3());
    assert.ok(intake.distanceTo(asset.root.position) <= 8);
    assert.ok(
      asset.getPickupSurfacePoints(intake).some((point) => {
        const direction = point.clone().sub(intake),
          distance = direction.length();
        if (distance > 8) return false;
        ray.set(intake, direction.normalize());
        ray.near = 0.01;
        ray.far = distance - 0.0001;
        return ray.intersectObject(front.near, false).length === 0;
      }),
      "At least one actual visible crystal surface satisfies the same eight-metre intake gate",
    );
  } finally {
    asset.dispose();
    avatar.userData.dispose?.();
    front.dispose();
  }
});

const leanExtremes = () => {
  const poses = [];
  for (const guard of [0, 1])
    for (const awareness of [0, 1])
      for (const yaw of [-0.035, 0.035])
        for (const pitch of [-0.035, 0])
          poses.push({ guard, awareness, yaw, pitch });
  return poses;
};

test("Tiny breath lean clamps radians and composes with awareness without moving the root", () => {
  const front = createBermudaTitanFront(new THREE.Group()),
    other = createBermudaTitanFront(new THREE.Group());
  try {
    const root = front.root.matrixWorld.toArray(),
      initial = front.getMouthPose();
    front.setBreathLean(100, -100);
    front.setAwareness(1);
    const expected = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-0.035 + 0.045, 0.035, 0, "YXZ"),
    );
    assert.ok(front.bones.head.quaternion.angleTo(expected) < 1e-7);
    assert.equal(other.bones.head.rotation.x, 0);
    assert.equal(other.bones.head.rotation.y, 0);
    const posed = front.getMouthPose(),
      exact = front.getAnchorWorld(new THREE.Vector3(...TITAN_FRONT_MOUTH));
    assert.ok(exact.distanceTo(posed.position) < 1e-7);
    assert.ok(posed.position.distanceTo(initial.position) > 0.5);
    assert.ok(
      posed.direction.distanceTo(
        new THREE.Vector3(0, 0, -1).applyQuaternion(expected),
      ) < 1e-7,
    );
    front.setAwareness(0);
    assert.ok(Math.abs(front.bones.head.rotation.x + 0.035) < 1e-12);
    assert.ok(Math.abs(front.bones.head.rotation.y - 0.035) < 1e-12);
    front.setBreathLean(-100, 100);
    assert.ok(Math.abs(front.bones.head.rotation.y + 0.035) < 1e-12);
    assert.equal(front.bones.head.rotation.x, 0);
    front.setBreathLean(0, 0);
    front.update(0);
    assert.ok(
      front.getMouthPose().position.distanceTo(initial.position) < 1e-8,
    );
    assert.deepEqual(front.root.matrixWorld.toArray(), root);
  } finally {
    front.dispose();
    other.dispose();
  }
});

test("All lean extrema retain real head skin contacts, mouth alignment, winding and resting support", (t) => {
  const front = createBermudaTitanFront(new THREE.Group()),
    geometry = front.near.geometry,
    p = geometry.attributes.position,
    w = geometry.attributes.skinWeight,
    index = geometry.index,
    rest = new THREE.Vector3(),
    posed = new THREE.Vector3(),
    oracle = new THREE.Vector3(),
    a = new THREE.Triangle(),
    b = new THREE.Triangle(),
    na = new THREE.Vector3(),
    nb = new THREE.Vector3();
  const restGrid = JSON.stringify(front.restContacts);
  let checked = 0,
    maxHead = 0,
    maxAll = 0;
  try {
    for (const pose of leanExtremes()) {
      front.setGuard(pose.guard);
      front.setAwareness(pose.awareness);
      front.setBreathLean(pose.yaw, pose.pitch);
      front.update(0);
      const actualContacts = createStaticColliderGrid(
        [
          ...front.staticContacts,
          ...front.dynamicRestContacts.map((c) =>
            front.getPosedContact(c.index),
          ),
        ],
        { cellSize: 0.04, maxCellsPerCollider: 128 },
      );
      for (let i = 0; i < p.count; i++) {
        rest.fromBufferAttribute(p, i);
        posed.copy(rest);
        front.near.getVertexPosition(i, posed);
        assert.ok(
          posed.y >= geometry.boundingBox.min.y - 1e-6,
          "Head lean must not lower the fixed resting support",
        );
        maxAll = Math.max(maxAll, rest.distanceTo(posed) * 120);
        if (w.getZ(i) <= 1e-8) continue;
        front.deformLocal(rest, oracle);
        assert.ok(
          oracle.distanceTo(posed) < 1e-6,
          "Physics deformation must match actual skinned vertices",
        );
        if (w.getZ(i) > 0.99)
          maxHead = Math.max(maxHead, rest.distanceTo(posed) * 120);
        assert.ok(
          isPositionBlocked(posed, {
            radius: 0.00025,
            colliders: actualContacts.query(posed),
          }),
          `Head skin leak ${i}: ${JSON.stringify(pose)}`,
        );
        checked++;
      }
      for (let i = 0; i < index.count; i += 3) {
        const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        if (ids.every((id) => w.getZ(id) <= 1e-8)) continue;
        for (let k = 0; k < 3; k++) {
          a[["a", "b", "c"][k]].fromBufferAttribute(p, ids[k]);
          b[["a", "b", "c"][k]].copy(a[["a", "b", "c"][k]]);
          front.near.getVertexPosition(ids[k], b[["a", "b", "c"][k]]);
        }
        if (a.getArea() < 1e-8) continue;
        assert.ok(
          a.getNormal(na).dot(b.getNormal(nb)) > 0,
          `Lean folds actual triangle ${i / 3}: ${JSON.stringify(pose)}`,
        );
        assert.ok(b.getArea() > a.getArea() * 0.2);
      }
      const actual = front.getMouthPose(),
        anchor = front.getAnchorWorld(new THREE.Vector3(...TITAN_FRONT_MOUTH));
      assert.ok(actual.position.distanceTo(anchor) < 1e-7);
    }
    assert.ok(
      maxHead < 4 + TITAN_BREATH_LIFT.height * 120 &&
        maxHead > TITAN_BREATH_LIFT.height * 120,
      "Actual head displacement fits the breathing rise plus the unchanged four-metre lean envelope",
    );
    assert.ok(
      maxAll < TITAN_ARM_RIG.maximumMotion * 120 && maxAll > 13,
      "Actual breathing and independent arm motion remain within the declared query and rendering envelope",
    );
    assert.ok(checked > 10000);
    assert.equal(JSON.stringify(front.restContacts), restGrid);
    t.diagnostic(
      JSON.stringify({
        changedHeadVerticesChecked: checked,
        maxHeadMetres: maxHead,
        maxAllMetres: maxAll,
        conditioning: geometry.userData.rigConditioning,
      }),
    );
  } finally {
    front.dispose();
  }
});

test("Awareness stays on actual eyelids and warms dorsal charge without added eye balls, lights or brace motion", () => {
  const front = createBermudaTitanFront(new THREE.Group());
  try {
    front.setGuard(0);
    const brace = front.bones.brace.position.clone(),
      root = front.root.matrixWorld.toArray(),
      shader = {
        uniforms: {},
        vertexShader: "#include <begin_vertex>",
        fragmentShader: "#include <emissivemap_fragment>",
      };
    front.near.material.onBeforeCompile(shader);
    front.setAwareness(1);
    front.setCharge(1);
    front.update(3);
    assert.equal(front.bones.head.rotation.x, 0.045);
    assert.ok(Math.abs(front.bones.head.position.y - 0.018) < 1e-12);
    assert.equal(shader.uniforms.titanAwareness.value, 1);
    assert.equal(shader.uniforms.titanCharge.value, 1);
    assert.equal(shader.uniforms.titanTime.value, 3);
    const color = front.near.material.emissive;
    assert.ok(color.r > color.g * 2 && color.g > color.b);
    assert.match(shader.fragmentShader, /lidHeat/);
    assert.match(shader.fragmentShader, /dorsalHeat/);
    assert.deepEqual(front.bones.brace.position.toArray(), brace.toArray());
    assert.deepEqual(front.root.matrixWorld.toArray(), root);
    assert.equal(front.root.children.filter((m) => m.isMesh).length, 2);
    assert.equal(
      front.root.children.some((m) => m.isLight),
      false,
    );
  } finally {
    front.dispose();
  }
});

function auditLeanExterior(front, pose) {
  front.setGuard(pose.guard);
  front.setAwareness(pose.awareness);
  front.setBreathLean(pose.yaw, pose.pitch);
  front.update(0);
  const geometry = front.near.geometry.clone(),
    positions = geometry.attributes.position,
    index = geometry.index,
    point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    front.near.getVertexPosition(i, point);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  geometry.computeBoundingBox();
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    mesh = new THREE.Mesh(geometry, material),
    ray = new THREE.Raycaster(),
    grid = createStaticColliderGrid(front.staticContacts, {
      cellSize: 0.09,
      maxCellsPerCollider: 128,
    }),
    triangles = [],
    nearest = new THREE.Vector3(),
    triangle = new THREE.Triangle(),
    box = geometry.boundingBox;
  mesh.updateMatrixWorld();
  for (let i = 0; i < index.count; i += 3) {
    triangle.a.fromBufferAttribute(positions, index.getX(i));
    triangle.b.fromBufferAttribute(positions, index.getX(i + 1));
    triangle.c.fromBufferAttribute(positions, index.getX(i + 2));
    triangles.push([
      Math.min(triangle.a.x, triangle.b.x, triangle.c.x),
      Math.max(triangle.a.x, triangle.b.x, triangle.c.x),
      Math.min(triangle.a.y, triangle.b.y, triangle.c.y),
      Math.max(triangle.a.y, triangle.b.y, triangle.c.y),
      Math.min(triangle.a.z, triangle.b.z, triangle.c.z),
      Math.max(triangle.a.z, triangle.b.z, triangle.c.z),
      i,
    ]);
  }
  let checked = 0,
    maximum = 0;
  try {
    for (let axis = 0; axis < 3; axis++)
      for (const side of [-1, 1])
        for (let u = 1; u < 6; u++)
          for (let v = 1; v < 6; v++) {
            const others = [0, 1, 2].filter((value) => value !== axis),
              start = new THREE.Vector3(),
              end = new THREE.Vector3();
            for (let k = 0; k < 2; k++) {
              const value = THREE.MathUtils.lerp(
                box.min.getComponent(others[k]),
                box.max.getComponent(others[k]),
                [u / 6, v / 6][k],
              );
              start.setComponent(others[k], value);
              end.setComponent(others[k], value);
            }
            start.setComponent(
              axis,
              side < 0
                ? box.min.getComponent(axis) - 0.1
                : box.max.getComponent(axis) + 0.1,
            );
            end.setComponent(
              axis,
              side < 0
                ? box.max.getComponent(axis) + 0.1
                : box.min.getComponent(axis) - 0.1,
            );
            ray.set(start, end.clone().sub(start).normalize());
            const visible = ray.intersectObject(mesh, false)[0];
            if (!visible) continue;
            const hit = castSegment(
              start,
              end,
              [
                ...grid.query(start, end),
                ...front.queryDynamicContacts(start, end),
              ],
              0,
            );
            assert.ok(hit, "Actual lean skin requires a contact");
            point.copy(hit.point);
            let distance = Infinity;
            // 距离阈值邻域的真实三角AABB筛选不改变2m几何标准；失败时才全扫给出准确误差。
            const bound = 2 / 120 + 1e-7;
            for (const row of triangles) {
              if (
                row[0] > point.x + bound ||
                row[1] < point.x - bound ||
                row[2] > point.y + bound ||
                row[3] < point.y - bound ||
                row[4] > point.z + bound ||
                row[5] < point.z - bound
              )
                continue;
              const i = row[6];
              triangle.a.fromBufferAttribute(positions, index.getX(i));
              triangle.b.fromBufferAttribute(positions, index.getX(i + 1));
              triangle.c.fromBufferAttribute(positions, index.getX(i + 2));
              distance = Math.min(
                distance,
                triangle.closestPointToPoint(point, nearest).distanceTo(point),
              );
            }
            if (!Number.isFinite(distance))
              for (let i = 0; i < index.count; i += 3) {
                triangle.a.fromBufferAttribute(positions, index.getX(i));
                triangle.b.fromBufferAttribute(positions, index.getX(i + 1));
                triangle.c.fromBufferAttribute(positions, index.getX(i + 2));
                distance = Math.min(
                  distance,
                  triangle
                    .closestPointToPoint(point, nearest)
                    .distanceTo(point),
                );
              }
            assert.ok(
              distance * 120 <= 2,
              `Lean contact ${distance * 120}m from actual skin: ${JSON.stringify(pose)}, id=${hit.collider?.id}, p=${JSON.stringify(point)}`,
            );
            maximum = Math.max(maximum, distance * 120);
            checked++;
          }
  } finally {
    geometry.dispose();
    material.dispose();
  }
  return { checked, maximum };
}

test("New lean extrema retain the unchanged two-metre actual exterior-water contact envelope", (t) => {
  const front = createBermudaTitanFront(new THREE.Group());
  let checked = 0,
    maximum = 0;
  try {
    for (const pose of leanExtremes()) {
      const result = auditLeanExterior(front, pose);
      assert.ok(result.checked > 80);
      checked += result.checked;
      maximum = Math.max(maximum, result.maximum);
    }
    t.diagnostic(
      JSON.stringify({ exteriorWaterRays: checked, maximumMetres: maximum }),
    );
  } finally {
    front.dispose();
  }
});
