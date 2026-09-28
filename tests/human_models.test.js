import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createHumanModel } from "../src/vehicle_models.js";

const meshes = (root) => {
  const result = [];
  root.traverse((object) => {
    if (object.isMesh) result.push(object);
  });
  return result;
};
function pose(root, time) {
  root.userData.animate(time);
  root.updateMatrixWorld(true);
  meshes(root).forEach((mesh) => mesh.skeleton.update());
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const mesh of meshes(root)) {
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
      assert.ok(point.toArray().every(Number.isFinite));
      bounds.expandByPoint(point);
    }
  }
  return bounds;
}

test("成年游泳者与潜水员的真实蒙皮姿态保持合理体长，重置时间可重复", () => {
  for (const kind of ["swimmer", "diver"]) {
    const root = createHumanModel(kind, 2);
    for (const mesh of meshes(root)) {
      for (const attribute of Object.values(mesh.geometry.attributes))
        assert.ok(attribute.array.every(Number.isFinite));
      const weights = mesh.geometry.attributes.skinWeight;
      for (let i = 0; i < weights.count; i++)
        assert.ok(
          Math.abs(
            weights.getX(i) +
              weights.getY(i) +
              weights.getZ(i) +
              weights.getW(i) -
              1,
          ) < 1e-6,
        );
    }
    const initial = pose(root, 0);
    for (const time of [0.4, 0.8, 1.2, 2, 5, 1e6, -1, 0]) {
      const size = pose(root, time).getSize(new THREE.Vector3());
      assert.ok(
        size.z > 1.5 && size.z < 2.35,
        `${kind}: body length remains bounded`,
      );
      assert.ok(size.x > 0.25 && size.x < 1.1);
      assert.ok(size.y > 0.1 && size.y < 1.8);
    }
    assert.deepEqual(pose(root, 0), initial);
    const before = root.userData.poseBones.left_elbow.rotation.x;
    root.userData.animate(NaN);
    assert.equal(root.userData.poseBones.left_elbow.rotation.x, before);
    root.userData.dispose();
  }
});

test("同类人形共享网格但独立动作，图鉴释放不会销毁场景模型", () => {
  for (const kind of ["swimmer", "diver"]) {
    const scene = createHumanModel(kind, 2),
      guide = createHumanModel(kind, 1);
    const sceneMeshes = meshes(scene),
      guideMeshes = meshes(guide);
    let disposed = 0;
    sceneMeshes.forEach((mesh, index) => {
      assert.equal(mesh.geometry, guideMeshes[index].geometry);
      assert.equal(mesh.material, guideMeshes[index].material);
      assert.notEqual(mesh.skeleton, guideMeshes[index].skeleton);
      mesh.geometry.addEventListener("dispose", () => disposed++);
      mesh.material.addEventListener("dispose", () => disposed++);
    });
    pose(scene, 0);
    const vertices = sceneMeshes[0].geometry.attributes.position.array.slice();
    const before = scene.userData.poseBones.left_shoulder.quaternion.toArray();
    pose(guide, 0.8);
    assert.deepEqual(
      scene.userData.poseBones.left_shoulder.quaternion.toArray(),
      before,
    );
    assert.notDeepEqual(
      guide.userData.poseBones.left_shoulder.quaternion.toArray(),
      before,
    );
    assert.deepEqual(
      sceneMeshes[0].geometry.attributes.position.array,
      vertices,
    );
    guide.userData.dispose();
    assert.equal(disposed, 0);
    pose(scene, 1.2);
    scene.userData.dispose();
    assert.equal(disposed, sceneMeshes.length * 2);
    scene.userData.dispose();
    assert.equal(disposed, sceneMeshes.length * 2);
  }
});

test("变换后的成年人躯干可由实际蒙皮射线命中", () => {
  for (const kind of ["swimmer", "diver"]) {
    const root = createHumanModel(kind, 2);
    root.position.set(15, -8, -20);
    root.rotation.y = 0.7;
    for (const time of [0, 0.7, 1.5]) {
      pose(root, time);
      const center = root.localToWorld(new THREE.Vector3(0, 0, -0.1));
      const direction = new THREE.Vector3(0, -1, 0);
      const ray = new THREE.Raycaster(
        center.clone().add(new THREE.Vector3(0, 3, 0)),
        direction,
      );
      assert.ok(
        ray
          .intersectObject(root, true)
          .some((hit) => hit.object.name.endsWith("_body")),
        `${kind}: posed torso must remain hittable`,
      );
    }
    root.userData.dispose();
  }
});

test("潜水员中性配平时肘与手留在躯干下方，前臂向前而非举过气瓶", () => {
  const root = createHumanModel("diver", 1);
  const elbow = new THREE.Vector3(),
    wrist = new THREE.Vector3();
  for (const time of [0, 0.4, 0.8, 1.2, 2, 3, 5]) {
    pose(root, time);
    for (const side of ["left", "right"]) {
      root.userData.poseBones[`${side}_elbow`].getWorldPosition(elbow);
      root.userData.poseBones[`${side}_wrist`].getWorldPosition(wrist);
      assert.ok(elbow.y < -0.025 && wrist.y < 0);
      assert.ok(wrist.z < elbow.z - 0.08);
    }
  }
  root.userData.dispose();
});

test("男女成年变体具有不同几何及服装，共用15骨骼契约和有限渲染预算", () => {
  for (const kind of ["swimmer", "diver"]) {
    const male = createHumanModel(kind, 2, "male");
    const female = createHumanModel(kind, 2, "female");
    try {
      const maleParts = meshes(male),
        femaleParts = meshes(female);
      assert.notDeepEqual(
        maleParts[0].geometry.attributes.position.array,
        femaleParts[0].geometry.attributes.position.array,
        `${kind}: shape differs beyond color`,
      );
      assert.notDeepEqual(
        maleParts[0].geometry.attributes.color.array,
        femaleParts[0].geometry.attributes.color.array,
        `${kind}: clothing differs`,
      );
      for (const [root, sex] of [
        [male, "male"],
        [female, "female"],
      ]) {
        assert.equal(root.userData.sex, sex);
        assert.equal(Object.keys(root.userData.poseBones).length, 15);
        const parts = meshes(root);
        assert.ok(parts.length >= 3 && parts.length <= 5);
        assert.ok(
          parts.reduce(
            (count, mesh) =>
              count +
              (mesh.geometry.index?.count ||
                mesh.geometry.attributes.position.count) /
                3,
            0,
          ) <= 12000,
        );
        for (const time of [0, 0.5, 1.1, 2.4, 100000]) {
          const size = pose(root, time).getSize(new THREE.Vector3());
          assert.ok(
            size.z > 1.5 && size.z < 2.35,
            `${kind}/${sex}: original length contract`,
          );
          assert.ok(size.x < 1.1 && size.y < 1.8);
        }
      }
    } finally {
      male.userData.dispose();
      female.userData.dispose();
    }
  }
});

test("缓存按种类和性别隔离，最后引用释放及再次创建不会复用已销毁资源", () => {
  for (const kind of ["swimmer", "diver"]) {
    const male = createHumanModel(kind);
    const female = createHumanModel(kind, 1, "female");
    const femaleGuide = createHumanModel(kind, 1, "female");
    const maleParts = meshes(male),
      femaleParts = meshes(female),
      guideParts = meshes(femaleGuide);
    let femaleDisposed = 0,
      maleDisposed = 0;
    for (let index = 0; index < femaleParts.length; index++) {
      assert.strictEqual(
        femaleParts[index].geometry,
        guideParts[index].geometry,
      );
      assert.strictEqual(
        femaleParts[index].material,
        guideParts[index].material,
      );
      assert.notStrictEqual(
        femaleParts[index].geometry,
        maleParts[index].geometry,
      );
      assert.notStrictEqual(
        femaleParts[index].skeleton,
        guideParts[index].skeleton,
      );
      femaleParts[index].geometry.addEventListener(
        "dispose",
        () => femaleDisposed++,
      );
      maleParts[index].geometry.addEventListener(
        "dispose",
        () => maleDisposed++,
      );
    }
    const stationary =
      female.userData.poseBones.left_shoulder.quaternion.toArray();
    pose(femaleGuide, 0.7);
    assert.deepEqual(
      female.userData.poseBones.left_shoulder.quaternion.toArray(),
      stationary,
    );
    femaleGuide.userData.dispose();
    assert.equal(femaleDisposed, 0);
    male.userData.dispose();
    assert.equal(maleDisposed, maleParts.length);
    assert.equal(femaleDisposed, 0);
    pose(female, 1.7);
    female.userData.dispose();
    female.userData.dispose();
    assert.equal(femaleDisposed, femaleParts.length);
    const recreated = createHumanModel(kind, 1, "female");
    assert.notStrictEqual(
      meshes(recreated)[0].geometry,
      femaleParts[0].geometry,
    );
    recreated.userData.dispose();
  }
});

function joint(root, name) {
  return root.userData.poseBones[name].getWorldPosition(new THREE.Vector3());
}

function samplePhase(root, phase) {
  root.userData.samplePose(phase);
  root.updateMatrixWorld(true);
  meshes(root).forEach((mesh) => mesh.skeleton.update());
}

test("男女自由泳完整周期的实际手腕在水下向脚侧推水、水上向头侧恢复", () => {
  for (const sex of ["male", "female"]) {
    const root = createHumanModel("swimmer", 2.4, sex);
    root.position.set(13, -8, -21);
    root.rotation.y = 1.1;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      root.quaternion,
    );
    try {
      for (const side of ["left", "right"]) {
        let previous;
        let underwater = 0,
          recovering = 0;
        for (let frame = 0; frame <= 240; frame++) {
          samplePhase(root, frame / 240);
          const wrist = joint(root, `${side}_wrist`);
          const elbow = root.userData.poseBones[`${side}_elbow`];
          assert.ok(elbow.rotation.x >= -2.23 && elbow.rotation.x <= -0.119);
          assert.ok(
            Math.abs(elbow.rotation.y) < 1e-8 &&
              Math.abs(elbow.rotation.z) < 1e-8,
            "Elbow keeps one flexion axis",
          );
          if (previous) {
            const motion = wrist.clone().sub(previous).dot(forward);
            const low = root.position.y - 0.025 * root.userData.length;
            const high = root.position.y + 0.025 * root.userData.length;
            if (wrist.y < low && previous.y < low) {
              assert.ok(
                motion < 0,
                `${sex}/${side}: underwater stroke must push toward feet`,
              );
              underwater++;
            }
            if (wrist.y > high && previous.y > high) {
              assert.ok(
                motion > 0,
                `${sex}/${side}: airborne hand must recover toward head`,
              );
              recovering++;
            }
          }
          previous = wrist;
        }
        assert.ok(
          underwater > 90 && recovering > 90,
          "Both complete stroke halves were observed",
        );
      }
    } finally {
      root.userData.dispose();
    }
  }
});

test("自由泳抓水与恢复具有高肘，前伸在头前且左右手相差半个周期", () => {
  for (const sex of ["male", "female"]) {
    const root = createHumanModel("swimmer", 1, sex);
    try {
      for (let side = 0; side < 2; side++) {
        const prefix = side ? "right" : "left";
        for (const phase of [0.2, 0.7, 0.75, 0.8]) {
          samplePhase(root, (phase + side * 0.5) % 1);
          const elbow = joint(root, `${prefix}_elbow`),
            wrist = joint(root, `${prefix}_wrist`);
          assert.ok(
            elbow.y > wrist.y + 0.012,
            `${sex}/${prefix}: elbow stays above wrist during catch and recovery`,
          );
        }
        samplePhase(root, side * 0.5);
        const entry = joint(root, `${prefix}_wrist`),
          head = joint(root, "head");
        assert.ok(entry.z < head.z - 0.1, "Hand enters ahead of head");
        const other = joint(root, `${side ? "left" : "right"}_wrist`);
        assert.ok(
          other.z > entry.z + 0.4,
          "Opposite arm is leaving the water at the feet side",
        );
      }
    } finally {
      root.userData.dispose();
    }
  }
});

test("归一化姿态采样与真实时钟一致，周期闭合且所有关节跨帧连续", () => {
  for (const kind of ["swimmer", "diver"]) {
    const root = createHumanModel(kind, 1, "female");
    const bones = Object.values(root.userData.poseBones);
    try {
      samplePhase(root, 0);
      const initial = bones.map((bone) => bone.matrixWorld.elements.slice());
      samplePhase(root, 1);
      assert.deepEqual(
        bones.map((bone) => bone.matrixWorld.elements.slice()),
        initial,
      );
      samplePhase(root, 0.37);
      const sampled = bones.map((bone) => bone.quaternion.toArray());
      root.userData.animate(root.userData.motionPeriod * 0.37);
      bones.forEach((bone, index) =>
        assert.ok(
          bone.quaternion.angleTo(new THREE.Quaternion(...sampled[index])) <
            1e-7,
        ),
      );
      let previous;
      for (let frame = 0; frame <= 241; frame++) {
        samplePhase(root, frame / 240);
        if (previous)
          bones.forEach((bone, index) =>
            assert.ok(
              bone.quaternion.angleTo(previous[index]) < 0.14,
              `${kind}/${bone.name}: no phase-boundary joint snap`,
            ),
          );
        previous = bones.map((bone) => bone.quaternion.clone());
      }
    } finally {
      root.userData.dispose();
    }
  }
});

test("男女潜水员双脚交替打水，真实脚蹼保持脚侧并限制膝关节反折", () => {
  for (const sex of ["male", "female"]) {
    const root = createHumanModel("diver", 1, sex);
    const equipment = meshes(root).find((mesh) =>
      mesh.name.endsWith("_equipment"),
    );
    const positions = equipment.geometry.attributes.position;
    const weights = equipment.geometry.attributes.skinIndex;
    const tips = {};
    for (const [side, boneIndex] of [
      ["left", 11],
      ["right", 14],
    ]) {
      let tip = -1;
      for (let index = 0; index < positions.count; index++)
        if (
          weights.getX(index) === boneIndex &&
          (tip < 0 || positions.getZ(index) > positions.getZ(tip))
        )
          tip = index;
      assert.ok(tip >= 0);
      tips[side] = tip;
    }
    let raisedLeft = 0,
      raisedRight = 0;
    try {
      for (let frame = 0; frame < 120; frame++) {
        samplePhase(root, frame / 120);
        const ankleLeft = joint(root, "left_ankle"),
          ankleRight = joint(root, "right_ankle");
        if (ankleLeft.y > ankleRight.y + 0.01) raisedLeft++;
        if (ankleRight.y > ankleLeft.y + 0.01) raisedRight++;
        for (const side of ["left", "right"]) {
          const ankle = joint(root, `${side}_ankle`),
            knee = root.userData.poseBones[`${side}_knee`];
          const tip = equipment
            .getVertexPosition(tips[side], new THREE.Vector3())
            .applyMatrix4(equipment.matrixWorld);
          assert.ok(
            tip.z > ankle.z + 0.1,
            `${sex}/${side}: fin extends toward feet, never head`,
          );
          assert.ok(
            knee.rotation.x <= -0.129 && knee.rotation.x >= -0.451,
            "Knee flexion remains anatomically bounded",
          );
        }
      }
      assert.ok(
        raisedLeft > 35 && raisedRight > 35,
        "Both legs alternate throughout the cycle",
      );
    } finally {
      root.userData.dispose();
    }
  }
});
