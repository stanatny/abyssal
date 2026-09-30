import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildLordCreature,
  buildLegacyMayanContact,
} from "../src/creature_lords.js";
import {
  granMajaHeadGeometry,
  granMajaHeadPoint,
} from "../src/creature_gran_maja_geometry.js";

function fixture() {
  const root = new THREE.Group(),
    motions = [];
  buildLordCreature("mayan", root, motions);
  return { root, motions };
}

function pose(root) {
  root.updateMatrixWorld(true);
  const values = [];
  root.traverse((part) => values.push(...part.matrixWorld.elements));
  return values;
}

test("格兰玛雅保持单位体长、扁宽头盘、单排六眼和环褶蛇体", () => {
  const { root, motions } = fixture();
  const anatomy = root.children[0];
  assert.equal(anatomy.userData.artIdentity, "gran_maja");
  const bounds = new THREE.Box3().setFromObject(root);
  assert.ok(Math.abs(bounds.max.z - bounds.min.z - 1) < 1e-6);
  assert.ok(Math.abs(bounds.max.z + bounds.min.z) < 1e-6);
  let eyes = 0,
    teeth = 0,
    triangles = 0;
  root.traverse((part) => {
    if (part.name === "gran_maja_eye_lens") eyes++;
    if (part.name.startsWith("gran_maja_tooth_")) teeth++;
    assert.ok(!/temple|pectoral|dorsal|caudal|gill_cover/.test(part.name));
    assert.ok(!part.isLight);
    if (!part.isMesh) return;
    triangles +=
      (part.geometry.index?.count || part.geometry.attributes.position.count) /
      3;
    assert.equal(part.material.transparent, false);
    for (const attribute of Object.values(part.geometry.attributes)) {
      assert.ok(attribute.array.every(Number.isFinite));
    }
  });
  assert.equal(eyes, 6);
  assert.equal(teeth, 60);
  assert.ok(triangles < 35000, `${triangles} triangles`);
  assert.equal(motions.length, 2);
  for (const name of [
    "lower_jaw",
    "upper_head_disc",
    "lower_head_disc",
    "upper_red_gum",
    "lower_red_gum",
  ]) {
    assert.ok(root.getObjectByName(`gran_maja_${name}`));
  }
  const left = granMajaHeadPoint(0, Math.PI),
    right = granMajaHeadPoint(0, 0);
  const mouthWidth = right.x - left.x;
  const headWidth = granMajaHeadPoint(0.31, 0).x * 2;
  assert.ok(mouthWidth / headWidth > 0.3 && mouthWidth / headWidth < 0.4);
  const lenses = [];
  root.traverse((part) => {
    if (part.name === "gran_maja_eye_lens") lenses.push(part);
  });
  assert.ok(
    lenses.every(
      (lens, index) =>
        index === 0 || lens.position.x > lenses[index - 1].position.x,
    ),
  );
  assert.ok(lenses[0].scale.x > lenses[2].scale.x);
  assert.ok(lenses[5].scale.x > lenses[3].scale.x);
  assert.equal(anatomy.userData.artRevision, "silver_six_eye_serpent");
});

test("口腔法线朝向口内，上下颌外皮法线朝外", () => {
  for (const lower of [false, true])
    for (const inner of [false, true]) {
      const geometry = granMajaHeadGeometry(lower, inner),
        normals = geometry.getAttribute("normal"),
        columns = inner ? 40 : 56,
        index = 5 * (columns + 1) + columns / 2,
        normal = new THREE.Vector3().fromBufferAttribute(normals, index);
      assert.ok(
        normal.y * (lower ? -1 : 1) * (inner ? -1 : 1) > 0.5,
        `${lower} ${inner}`,
      );
      geometry.dispose();
    }
});

test("外侧头盘闭合且呼吸只移动中央嘴部", () => {
  const { root, motions } = fixture(),
    upper = root.getObjectByName("gran_maja_upper_head_disc"),
    lower = root.getObjectByName("gran_maja_lower_head_disc"),
    jaw = root.getObjectByName("gran_maja_lower_jaw");
  pose(root);
  const upperPose = upper.matrixWorld.clone(),
    lowerPose = lower.matrixWorld.clone(),
    jawPose = jaw.matrixWorld.clone();
  for (const time of [0, 3, 42, 1000]) {
    motions.forEach((motion) => motion(time, 3));
    pose(root);
    assert.ok(upper.matrixWorld.equals(upperPose));
    assert.ok(lower.matrixWorld.equals(lowerPose));
  }
  assert.ok(!jaw.matrixWorld.equals(jawPose));
  for (let row = 0; row <= 30; row++) {
    for (const side of [0, 56]) {
      const a = row * 57 + side,
        b = row * 57 + 56 - side;
      for (const attribute of ["position", "normal"]) {
        const upperValue = new THREE.Vector3().fromBufferAttribute(
            upper.geometry.getAttribute(attribute),
            a,
          ),
          lowerValue = new THREE.Vector3().fromBufferAttribute(
            lower.geometry.getAttribute(attribute),
            b,
          );
        assert.ok(
          upperValue.distanceTo(lowerValue) < 1e-6,
          `Continuous head ${attribute}`,
        );
      }
    }
  }
});

test("蛇体重合的周向边界顶点具有连续法线", () => {
  const body = fixture().root.getObjectByName(
      "gran_maja_continuous_swimming_body",
    ),
    positions = body.geometry.getAttribute("position"),
    normals = body.geometry.getAttribute("normal"),
    seen = new Map();
  let duplicatePairs = 0;
  for (let i = 0; i < positions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, i),
      normal = new THREE.Vector3().fromBufferAttribute(normals, i),
      key = point
        .toArray()
        .map((value) => Math.round(value * 1e7))
        .join(",");
    if (seen.has(key)) {
      assert.ok(
        normal.dot(seen.get(key)) > 0.9999,
        `Continuous normal at ${key}`,
      );
      duplicatePairs++;
    } else seen.set(key, normal);
  }
  assert.ok(duplicatePairs > 100);
});

test("完整游泳周期实际弯曲尾部顶点，缓存网格和另一个实例保持不变", () => {
  const left = fixture(),
    right = fixture();
  const leftBody = left.root.getObjectByName(
      "gran_maja_continuous_swimming_body",
    ),
    rightBody = right.root.getObjectByName(
      "gran_maja_continuous_swimming_body",
    );
  assert.strictEqual(leftBody.geometry, rightBody.geometry);
  assert.strictEqual(leftBody.material, rightBody.material);
  assert.notStrictEqual(leftBody.skeleton, rightBody.skeleton);
  assert.equal(leftBody.skeleton.bones.length, 6);
  assert.notStrictEqual(
    leftBody.skeleton.bones[1],
    rightBody.skeleton.bones[1],
  );
  const buffers = Object.fromEntries(
    Object.entries(leftBody.geometry.attributes).map(([key, attr]) => [
      key,
      attr.array.slice(),
    ]),
  );
  const otherPose = pose(right.root),
    rootPose = left.root.matrix.clone();
  const positions = leftBody.geometry.getAttribute("position");
  let tailIndex = 0;
  for (let i = 1; i < positions.count; i++)
    if (positions.getZ(i) > positions.getZ(tailIndex)) tailIndex = i;
  const tailPositions = [];
  for (let step = 0; step <= 48; step++) {
    left.motions.forEach((motion) =>
      motion(((step / 48) * Math.PI * 2) / 0.32, step < 24 ? 0.4 : 3),
    );
    left.root.updateMatrixWorld(true);
    leftBody.skeleton.update();
    tailPositions.push(
      leftBody.getVertexPosition(tailIndex, new THREE.Vector3()),
    );
    assert.ok(pose(left.root).every(Number.isFinite));
    assert.ok(left.root.matrix.equals(rootPose));
    assert.deepEqual(pose(right.root), otherPose);
  }
  const swing = new THREE.Box3()
    .setFromPoints(tailPositions)
    .getSize(new THREE.Vector3());
  assert.ok(swing.x > 0.075, `Actual tail travel: ${swing.x}`);
  for (const [key, data] of Object.entries(buffers)) {
    assert.deepEqual(leftBody.geometry.getAttribute(key).array, data);
  }
  const lens = left.root.getObjectByName("gran_maja_eye_lens");
  assert.equal(lens.material.emissiveIntensity, 0.6);
});

test("旧玛雅兽代理保留原始归一化和三个实例动作", () => {
  const root = new THREE.Group(),
    motions = [],
    proxy = buildLegacyMayanContact(root, motions);
  assert.strictEqual(proxy.parent, root);
  assert.deepEqual(proxy.scale.toArray(), Array(3).fill(0.9216589831372263));
  assert.deepEqual(proxy.position.toArray(), [0, 0, 0.011520742233379398]);
  assert.equal(motions.length, 3);
  assert.ok(proxy.getObjectByName("mayan_carved_guardian_skull"));
  assert.ok(proxy.getObjectByName("mayan_sculpted_jaw"));
  assert.ok(proxy.getObjectByName("mayan_tail"));
  const before = pose(proxy);
  motions.forEach((motion) => motion(3, 2));
  assert.notDeepEqual(pose(proxy), before);
  assert.equal(
    proxy.getObjectByName("gran_maja_continuous_swimming_body"),
    undefined,
  );
});
