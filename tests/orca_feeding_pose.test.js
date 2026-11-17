import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

function skin(root) {
  const mesh = root.getObjectByName("orca_hf_body");
  root.updateWorldMatrix(true, false);
  // 与实际渲染器一致地调用蒙皮节点覆盖方法，更新变换父级下的绑定逆矩阵。
  root.updateMatrixWorld(true);
  mesh.skeleton.update();
  return Array.from(
    { length: mesh.geometry.attributes.position.count },
    (_, i) => mesh.getVertexPosition(i, new THREE.Vector3()),
  );
}

function pairedAdvance(control, feeding, frame, dt = 1 / 120, extras = {}) {
  const input = { dt, speed: 12, ...extras };
  control.userData.animate(frame * dt, 1, input);
  feeding.userData.animate(frame * dt, 1, input);
}

function rootPose(root) {
  return [...root.position, ...root.quaternion, ...root.scale];
}

test("a real single meal visibly opens bounded cheek and neck sides while preserving the nose, outer flippers and rear body", () => {
  const control = createCreature("orca", 1, 17),
    feeding = createCreature("orca", 1, 17),
    body = feeding.getObjectByName("orca_hf_body"),
    source = body.geometry.attributes.position,
    initialPositions = Array.from(source.array),
    initialIndices = Array.from(body.geometry.index.array),
    initialUv = Array.from(body.geometry.attributes.uv.array);
  pairedAdvance(control, feeding, 0, 0);
  feeding.userData.triggerFeed();
  let previousJaw = 0,
    peak = 0;
  for (let i = 1; i <= 19; i++) {
    pairedAdvance(control, feeding, i);
    const angle = feeding.userData.pose.jawOpen;
    assert.ok(Math.abs(angle - previousJaw) < 0.05, "no first-frame jaw snap");
    previousJaw = angle;
    peak = Math.max(peak, angle);
  }
  assert.ok(peak > THREE.MathUtils.degToRad(7));
  assert.ok(peak < THREE.MathUtils.degToRad(10));
  const before = skin(control),
    after = skin(feeding),
    jawDrops = [],
    cheekRatios = [];
  for (let i = 0; i < source.count; i++) {
    const x = source.getX(i),
      y = source.getY(i),
      z = source.getZ(i);
    if (
      z > -0.06 ||
      (z < -0.47 && y > 0.015) ||
      (z > -0.27 && z < -0.17 && Math.abs(x) > 0.14 && y < -0.12)
    )
      assert.ok(
        before[i].distanceTo(after[i]) < 1e-12,
        "unrelated skin keeps its swimming pose",
      );
    if (z < -0.47)
      assert.ok(
        Math.abs(before[i].x - after[i].x) < 1e-12,
        "the nose and front jaw cannot balloon sideways",
      );
    if (z > -0.46 && z < -0.37 && y < -0.045)
      jawDrops.push(before[i].y - after[i].y);
    if (z > -0.4 && z < -0.335 && Math.abs(x) > 0.045 && y > -0.02 && y < 0.025)
      cheekRatios.push(Math.abs(after[i].x / before[i].x));
  }
  assert.ok(jawDrops.length > 50 && cheekRatios.length > 100);
  assert.ok(Math.max(...jawDrops) > 0.015 && Math.max(...jawDrops) < 0.03);
  assert.ok(Math.min(...cheekRatios) > 1.13);
  assert.ok(
    Math.max(...cheekRatios) < 1.22,
    "the readable local opening stays bounded",
  );
  assert.deepEqual(Array.from(source.array), initialPositions);
  assert.deepEqual(Array.from(body.geometry.index.array), initialIndices);
  assert.deepEqual(Array.from(body.geometry.attributes.uv.array), initialUv);
});

test("the continuous mouth surface retains seam alignment and non-inverted triangles through the full feeding pulse", () => {
  const control = createCreature("orca", 1, 21),
    feeding = createCreature("orca", 1, 21),
    body = feeding.getObjectByName("orca_hf_body"),
    source = body.geometry.attributes.position,
    index = body.geometry.index.array,
    duplicate = new Map(),
    pairs = [];
  for (let i = 0; i < source.count; i++) {
    if (source.getZ(i) >= -0.06) continue;
    const key = [source.getX(i), source.getY(i), source.getZ(i)].join(",");
    if (duplicate.has(key)) pairs.push([duplicate.get(key), i]);
    else duplicate.set(key, i);
  }
  assert.ok(pairs.length > 10, "fixture includes real UV seam duplicates");
  pairedAdvance(control, feeding, 0, 0);
  feeding.userData.triggerFeed();
  const triangle = new THREE.Triangle(),
    other = new THREE.Triangle(),
    normal = new THREE.Vector3(),
    otherNormal = new THREE.Vector3();
  for (let i = 1; i <= 180; i++) {
    pairedAdvance(control, feeding, i);
    if (![1, 8, 19, 32, 60, 120, 180].includes(i)) continue;
    const before = skin(control),
      after = skin(feeding);
    assert.ok(after.every((point) => point.toArray().every(Number.isFinite)));
    for (const [a, b] of pairs)
      assert.ok(
        after[a].distanceTo(after[b]) < 1e-10,
        "coincident lips and UV seams cannot tear",
      );
    for (let j = 0; j < index.length; j += 3) {
      const ids = [index[j], index[j + 1], index[j + 2]];
      if (!ids.some((id) => source.getZ(id) < -0.06)) continue;
      triangle.set(...ids.map((id) => before[id]));
      other.set(...ids.map((id) => after[id]));
      if (triangle.getArea() < 1e-8) continue;
      assert.ok(
        other.getArea() > 1e-10,
        "the head surface cannot collapse into a slit",
      );
      triangle.getNormal(normal);
      other.getNormal(otherNormal);
      assert.ok(
        normal.dot(otherNormal) > 0,
        "feeding cannot turn the mouth lining inside out",
      );
    }
  }
});

function rearContour(root, camera) {
  const mesh = root.getObjectByName("orca_hf_body"),
    vertices = skin(root).map((point) => {
      point.applyMatrix4(mesh.matrixWorld).project(camera);
      return [(point.x * 0.5 + 0.5) * 1280, (0.5 - point.y * 0.5) * 800];
    }),
    indices = mesh.geometry.index.array,
    rows = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [
        vertices[indices[i]],
        vertices[indices[i + 1]],
        vertices[indices[i + 2]],
      ],
      low = Math.ceil(Math.min(...triangle.map((point) => point[1]))),
      high = Math.floor(Math.max(...triangle.map((point) => point[1])));
    for (let y = low; y <= high; y++) {
      const xs = [];
      for (let edge = 0; edge < 3; edge++) {
        const a = triangle[edge],
          b = triangle[(edge + 1) % 3];
        if (
          y >= Math.min(a[1], b[1]) &&
          y <= Math.max(a[1], b[1]) &&
          Math.abs(b[1] - a[1]) > 1e-8
        )
          xs.push(a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]));
      }
      if (xs.length < 2) continue;
      const previous = rows.get(y) || [Infinity, -Infinity];
      rows.set(y, [Math.min(previous[0], ...xs), Math.max(previous[1], ...xs)]);
    }
  }
  return rows;
}

test("the held meal clears the actual rear body contour at normal 8m follow-camera scale", () => {
  const control = createCreature("orca", 8, 17),
    feeding = createCreature("orca", 8, 17),
    camera = new THREE.PerspectiveCamera(60, 1280 / 800, 0.1, 1500);
  // 8米、普通巡游的实际桌面后视距离；不放大角色或更换近景镜头。
  camera.position.set(0, 6, 16.5);
  camera.lookAt(0, 1.1, -11.6666666667);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  pairedAdvance(control, feeding, 0, 0);
  feeding.userData.triggerFeed();
  let heldFrames = 0;
  for (let frame = 1; frame <= 120; frame++) {
    pairedAdvance(control, feeding, frame);
    if (feeding.userData.pose.feeding > 0.95) heldFrames++;
    if (frame !== 40) continue;
    const before = rearContour(control, camera),
      after = rearContour(feeding, camera),
      widening = [];
    for (const [y, [left, right]] of after) {
      const old = before.get(y);
      if (old) widening.push(right - left - (old[1] - old[0]));
    }
    assert.ok(
      Math.max(...widening) >= 8,
      "the full skin must widen beyond the rear shoulder outline by at least 8px",
    );
    assert.ok(
      widening.filter((width) => width >= 8).length >= 6,
      "the visible change cannot be a single isolated vertex or row",
    );
  }
  assert.ok(
    heldFrames >= 30,
    "one real meal must retain the readable full pose for at least a quarter second",
  );
});

test("the mouth remains attached to the deformed jaw through growth and transformed parents, without moving the gameplay root", () => {
  for (const length of [3, 15, 30]) {
    const parent = new THREE.Group(),
      root = createCreature("orca", length, 2);
    parent.position.set(9, -7, 4);
    parent.rotation.set(0.2, -0.7, 0.1);
    parent.scale.setScalar(1.4);
    parent.add(root);
    root.position.set(1, -2, 3);
    root.rotation.set(-0.2, 0.4, -0.1);
    const unchanged = rootPose(root),
      restMouth = root.worldToLocal(
        root.userData.getFeedingMouth(new THREE.Vector3()),
      );
    assert.ok(
      restMouth.distanceTo(new THREE.Vector3(0, -0.052, -0.43)) < 1e-12,
    );
    root.userData.triggerFeed();
    let last = restMouth.clone();
    for (let i = 1; i <= 19; i++) {
      root.userData.animate(i / 120, 1, {
        dt: 1 / 120,
        speed: 32,
        boosting: true,
        turn: 0.7,
      });
      const mouth = root.worldToLocal(
        root.userData.getFeedingMouth(new THREE.Vector3()),
      );
      assert.ok(
        mouth.distanceTo(last) < 0.007,
        "jaw anchor must move continuously",
      );
      last = mouth;
    }
    assert.ok(last.y < restMouth.y - 0.015);
    const positions = skin(root),
      mesh = root.getObjectByName("orca_hf_body"),
      mouthInSkin = mesh.worldToLocal(
        root.userData.getFeedingMouth(new THREE.Vector3()),
      );
    assert.ok(
      Math.min(...positions.map((point) => point.distanceTo(mouthInSkin))) <
        0.015,
      "the intake stays at actual lower-mouth skin",
    );
    assert.strictEqual(
      root.getObjectByName("feeding_mouth").parent,
      root.getObjectByName("orca_lower_jaw"),
    );
    assert.deepEqual(rootPose(root), unchanged);
  }
});

test("feeding pose shares immutable art while independent instances freeze on pause and restore normal skin on reset", () => {
  const left = createCreature("orca", 6, 8),
    right = createCreature("orca", 6, 8),
    leftMesh = left.getObjectByName("orca_hf_body"),
    rightMesh = right.getObjectByName("orca_hf_body");
  assert.strictEqual(leftMesh.geometry, rightMesh.geometry);
  assert.strictEqual(leftMesh.material, rightMesh.material);
  assert.notStrictEqual(leftMesh.skeleton, rightMesh.skeleton);
  left.userData.resetMotion();
  right.userData.resetMotion();
  const untouched = skin(right),
    weights = Array.from(leftMesh.geometry.attributes.skinWeight.array);
  left.userData.triggerFeed();
  for (let i = 1; i <= 19; i++)
    left.userData.animate(i / 120, 1, { dt: 1 / 120, speed: 12 });
  assert.deepEqual(skin(right), untouched);
  const frozen = skin(left),
    anchor = left.userData.getFeedingMouth(new THREE.Vector3()),
    pose = { ...left.userData.pose };
  left.userData.animate(99, 3, { dt: 0, speed: 32, boosting: true, turn: -1 });
  assert.deepEqual(skin(left), frozen);
  assert.deepEqual(left.userData.pose, pose);
  assert.ok(
    left.userData.getFeedingMouth(new THREE.Vector3()).distanceTo(anchor) <
      1e-12,
  );
  for (let i = 0; i < 120; i++) {
    left.userData.triggerFeed();
    left.userData.animate(i / 60, 1, { dt: 1 / 60, speed: 12 });
    assert.ok(left.userData.pose.jawOpen < THREE.MathUtils.degToRad(10));
  }
  left.userData.resetMotion();
  assert.equal(left.userData.pose.feeding, 0);
  assert.equal(left.userData.pose.jawOpen, 0);
  assert.deepEqual(skin(left), untouched);
  assert.deepEqual(
    Array.from(leftMesh.geometry.attributes.skinWeight.array),
    weights,
  );
});
