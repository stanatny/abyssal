import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  ATLANTIS_CREATURE_KINDS,
  buildAtlantisCreature,
} from "../src/creature_atlantis.js";
import { ATLANTIS_SPECIES } from "../src/atlantis_species.js";
import { createCreature } from "../src/creatures.js";

function specimen(kind) {
  const root = new THREE.Group();
  const motions = [];
  buildAtlantisCreature(kind, root, motions);
  return {
    root,
    animate(time, effort = 1) {
      for (const motion of motions) motion(time, effort);
    },
  };
}

function meshes(root) {
  const result = [];
  root.traverse((node) => {
    if (node.isMesh) result.push(node);
  });
  return result;
}

/** 逐顶点计算真实蒙皮姿态，避免静态包围盒掩盖动画异常。 */
function posedBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  const vertex = new THREE.Vector3();
  for (const mesh of meshes(root)) {
    if (mesh.isSkinnedMesh) mesh.skeleton.update();
    for (
      let index = 0;
      index < mesh.geometry.attributes.position.count;
      index++
    ) {
      mesh.getVertexPosition(index, vertex).applyMatrix4(mesh.matrixWorld);
      assert.ok(
        vertex.toArray().every(Number.isFinite),
        `${mesh.name}: posed vertex`,
      );
      bounds.expandByPoint(vertex);
    }
  }
  return bounds;
}

function pose(root) {
  const result = [];
  root.traverse((node) => {
    const transform = [
      ...node.position.toArray(),
      ...node.quaternion.toArray(),
      ...node.scale.toArray(),
    ];
    assert.ok(transform.every(Number.isFinite), `${node.name}: transform`);
    result.push(transform);
  });
  return result;
}

test("Every regional species has an explicit Atlantis renderer", () => {
  assert.deepEqual(
    [...ATLANTIS_CREATURE_KINDS].sort(),
    ATLANTIS_SPECIES.map((entry) => entry.kind).sort(),
  );
  assert.equal(ATLANTIS_CREATURE_KINDS.size, 7);
  assert.throws(
    () => buildAtlantisCreature("unknown", new THREE.Group(), []),
    /Unknown atlantis creature/,
  );
});

for (const species of ATLANTIS_SPECIES) {
  const { kind, length } = species;
  // 海马按图鉴声明的直立高度计量；其余物种含吻、尾或腕的纵长为体长。
  const lengthAxis = kind === "seahorse" ? "y" : "z";

  test(`${kind}: finite centered anatomy uses its actual catalog size and forward axis`, (t) => {
    const { root } = specimen(kind);
    assert.equal(root.userData.atlantisAnatomy, kind);
    assert.equal(root.userData.normalizedLength, 1);
    const rest = posedBounds(root);
    const dimensions = rest.getSize(new THREE.Vector3());
    assert.ok(
      Math.abs(dimensions[lengthAxis] - 1) < 1e-6,
      `${kind}: declared size axis ${lengthAxis} measures ${dimensions[lengthAxis]}, expected 1`,
    );
    assert.ok(rest.getCenter(new THREE.Vector3()).length() < 1e-5);
    assert.ok(dimensions.x > 0.025 && dimensions.x < 1.3);
    const objects = meshes(root);
    assert.ok(
      objects.length > 2 && objects.length <= 24,
      `${kind}: draw budget`,
    );
    let triangles = 0;
    for (const mesh of objects) {
      const geometry = mesh.geometry;
      const position = geometry.attributes.position;
      assert.ok(position.count >= 3, `${mesh.name}: nonempty geometry`);
      assert.ok(geometry.attributes.normal, `${mesh.name}: normals`);
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        assert.equal(
          attribute.count,
          position.count,
          `${mesh.name}: ${name} vertex count`,
        );
        assert.ok(
          attribute.array.every(Number.isFinite),
          `${mesh.name}: finite ${name}`,
        );
      }
      if (geometry.index) {
        assert.equal(geometry.index.count % 3, 0);
        assert.ok(
          geometry.index.array.every(
            (index) => index >= 0 && index < position.count,
          ),
        );
      }
      triangles += (geometry.index?.count ?? position.count) / 3;
      if (mesh.isSkinnedMesh) {
        const weights = geometry.attributes.skinWeight;
        const joints = geometry.attributes.skinIndex;
        assert.ok(weights && joints);
        for (let index = 0; index < position.count; index++) {
          const sum =
            weights.getX(index) +
            weights.getY(index) +
            weights.getZ(index) +
            weights.getW(index);
          assert.ok(
            Math.abs(sum - 1) < 1e-5,
            `${mesh.name}: normalized skin weights`,
          );
          for (let slot = 0; slot < 4; slot++) {
            const joint = joints.array[index * 4 + slot];
            assert.ok(
              Number.isInteger(joint) &&
                joint >= 0 &&
                joint < mesh.skeleton.bones.length,
            );
          }
        }
      }
    }
    assert.ok(
      triangles <= (species.schoolSize > 1 ? 9000 : 32000),
      `${kind}: triangle budget ${triangles}`,
    );
    const eyes = root.getObjectByName(`${kind}_eyes`);
    assert.ok(eyes?.isMesh, `${kind}: readable paired eyes`);
    const eyeCenter = new THREE.Box3()
      .setFromObject(eyes)
      .getCenter(new THREE.Vector3());
    if (kind === "seahorse") {
      // 直立动物的长吻会移动整体包围盒中心；比较头尾前后而非水平鱼的眼睛偏移量。
      const tailCenter = new THREE.Box3()
        .setFromObject(root.getObjectByName("seahorse_tail_mesh"))
        .getCenter(new THREE.Vector3());
      assert.ok(
        eyeCenter.z < tailCenter.z,
        "Seahorse head points ahead of its curled tail",
      );
    } else
      assert.ok(
        eyeCenter.z < -0.015,
        `${kind}: head faces travel direction -Z`,
      );

    const world = createCreature(kind, length, 19);
    assert.equal(world.userData.kind, kind);
    assert.equal(world.userData.atlantisAnatomy, kind);
    const worldBounds = posedBounds(world);
    assert.ok(
      Math.abs(worldBounds.getSize(new THREE.Vector3())[lengthAxis] - length) <
        1e-5,
    );
    assert.ok(worldBounds.getCenter(new THREE.Vector3()).length() < 1e-5);
    t.diagnostic(
      JSON.stringify({
        kind,
        length,
        lengthAxis,
        dimensions: dimensions.toArray(),
        meshes: objects.length,
        triangles,
      }),
    );
  });

  test(`${kind}: complete motion cycles preserve shared buffers and independent instances`, () => {
    const first = specimen(kind);
    const second = specimen(kind);
    const left = meshes(first.root);
    const right = meshes(second.root);
    assert.equal(left.length, right.length);
    const buffers = left.map((mesh, index) => {
      assert.equal(
        mesh.geometry,
        right[index].geometry,
        `${kind}: shared geometry`,
      );
      assert.equal(
        mesh.material,
        right[index].material,
        `${kind}: shared material`,
      );
      if (mesh.isSkinnedMesh) {
        assert.notEqual(mesh.skeleton, right[index].skeleton);
        mesh.skeleton.bones.forEach((bone, boneIndex) =>
          assert.notEqual(bone, right[index].skeleton.bones[boneIndex]),
        );
      }
      return Object.fromEntries(
        Object.entries(mesh.geometry.attributes).map(([name, attribute]) => [
          name,
          attribute.array.slice(),
        ]),
      );
    });
    const stillPose = pose(second.root);
    const stillBounds = posedBounds(second.root);
    const originalBounds = posedBounds(first.root);
    let motionDistance = 0;
    // 16秒覆盖本轮最慢的海马轻摇完整周期，同时采样巡游与高推进姿态。
    for (const effort of [0.15, 1, 3]) {
      for (let frame = 0; frame <= 48; frame++) {
        first.animate((frame * 16) / 48, effort);
        const bounds = posedBounds(first.root);
        const size = bounds.getSize(new THREE.Vector3());
        assert.ok(
          size[lengthAxis] > 0.78 && size[lengthAxis] < 1.2,
          `${kind}: bounded posed size ${size[lengthAxis]}`,
        );
        assert.ok(
          bounds.getCenter(new THREE.Vector3()).length() < 0.18,
          `${kind}: local motion stays near collision center`,
        );
        motionDistance = Math.max(
          motionDistance,
          bounds.min.distanceTo(originalBounds.min),
          bounds.max.distanceTo(originalBounds.max),
        );
        pose(first.root);
        assert.deepEqual(first.root.position.toArray(), [0, 0, 0]);
        assert.deepEqual(first.root.quaternion.toArray(), [0, 0, 0, 1]);
        assert.deepEqual(first.root.scale.toArray(), [1, 1, 1]);
      }
    }
    first.animate(10000, 3);
    posedBounds(first.root);
    assert.ok(motionDistance > 0.001, `${kind}: vertices actually change pose`);
    assert.deepEqual(
      pose(second.root),
      stillPose,
      `${kind}: neighboring pose is independent`,
    );
    assert.deepEqual(posedBounds(second.root), stillBounds);
    left.forEach((mesh, index) => {
      for (const [name, buffer] of Object.entries(buffers[index]))
        assert.deepEqual(
          mesh.geometry.attributes[name].array,
          buffer,
          `${mesh.name}: ${name} cache remains immutable`,
        );
    });

    // 实际主循环工厂会合批静态部件；双实例也必须保留独立动画和共享资源。
    const a = createCreature(kind, length, 7);
    const b = createCreature(kind, length, 7);
    const aMeshes = meshes(a);
    const bMeshes = meshes(b);
    aMeshes.forEach((mesh, index) => {
      assert.equal(mesh.geometry, bMeshes[index].geometry);
      assert.equal(mesh.material, bMeshes[index].material);
    });
    a.userData.animate(0, 1);
    b.userData.animate(0, 1);
    const parked = pose(b);
    for (let frame = 1; frame <= 60; frame++) a.userData.animate(frame / 30, 3);
    assert.deepEqual(pose(b), parked);
    const worldPose = posedBounds(a).getSize(new THREE.Vector3());
    assert.ok(
      worldPose[lengthAxis] > length * 0.78 &&
        worldPose[lengthAxis] < length * 1.2,
    );
  });
}

test("Shallow Atlantis species retain distinct disc, upright and skirt-fin silhouettes", () => {
  const spadefish = specimen("spadefish").root;
  const disc = posedBounds(spadefish).getSize(new THREE.Vector3());
  assert.ok(disc.y > disc.x * 1.6);
  const body = meshes(spadefish).find((mesh) => mesh.isSkinnedMesh);
  const color = body.geometry.attributes.color;
  const luminances = [];
  for (let index = 0; index < color.count; index++)
    luminances.push(
      color.getX(index) * 0.2126 +
        color.getY(index) * 0.7152 +
        color.getZ(index) * 0.0722,
    );
  assert.ok(Math.min(...luminances) < Math.max(...luminances) * 0.4);

  const seahorse = specimen("seahorse").root;
  const upright = posedBounds(seahorse).getSize(new THREE.Vector3());
  assert.ok(upright.y > upright.z * 1.3);
  assert.ok(upright.x < upright.y * 0.3);
  assert.ok(seahorse.getObjectByName("seahorse_tail"));
  assert.ok(seahorse.getObjectByName("seahorse_dorsal_fin"));

  const cuttlefish = specimen("cuttlefish").root;
  const flat = posedBounds(cuttlefish).getSize(new THREE.Vector3());
  assert.ok(flat.x > flat.y * 1.6);
  for (let index = 1; index <= 8; index++)
    assert.ok(cuttlefish.getObjectByName(`cuttlefish_arm_${index}`));
  assert.equal(cuttlefish.getObjectByName("cuttlefish_arm_9"), undefined);
  for (const index of [1, 2])
    assert.ok(cuttlefish.getObjectByName(`cuttlefish_tentacle_${index}`));
  for (const side of [-1, 1])
    assert.ok(
      cuttlefish.getObjectByName(`cuttlefish_skirt_${side}`).isSkinnedMesh,
    );
});

test("Paired eyes remain on the actual outer surface of all seven species", () => {
  for (const { kind } of ATLANTIS_SPECIES) {
    const { root } = specimen(kind);
    root.updateMatrixWorld(true);
    const pupils = root.getObjectByName(`${kind}_pupils`);
    assert.ok(pupils?.isMesh, `${kind}: named pupil surface`);
    const eyeBounds = new THREE.Box3().setFromBufferAttribute(
      pupils.geometry.attributes.position,
    );
    for (const side of [-1, 1]) {
      const source = eyeBounds.getCenter(new THREE.Vector3());
      if (kind === "cuttlefish") {
        // W 形瞳孔的包围盒中心是空白；沿凸面最外侧的真实瞳孔点发射射线。
        const positions = pupils.geometry.attributes.position;
        let outer = -Infinity;
        for (let index = 0; index < positions.count; index++) {
          const x = positions.getX(index) * side;
          if (x > outer) {
            outer = x;
            source.fromBufferAttribute(positions, index);
          }
        }
      }
      source.x = side;
      pupils.localToWorld(source);
      const ray = new THREE.Raycaster(source, new THREE.Vector3(-side, 0, 0));
      const hit = ray.intersectObject(root, true)[0];
      assert.equal(
        hit?.object.name,
        `${kind}_pupils`,
        `${kind}/${side}: pupils must not be buried inside body geometry`,
      );
    }
  }
});

test("Revised swordfish remains slender and cuttlefish tentacles rest inside the arm crown", () => {
  const swordfish = specimen("swordfish").root;
  const torso = swordfish.getObjectByName("swordfish_continuous_body");
  const size = new THREE.Box3()
    .setFromBufferAttribute(torso.geometry.attributes.position)
    .getSize(new THREE.Vector3());
  assert.ok(
    size.y / size.z < 0.18,
    "Swordfish torso must not return to a deep tuna silhouette",
  );
  assert.ok(
    size.x / size.z < 0.18,
    "Swordfish torso stays laterally streamlined",
  );
  const cuttlefish = specimen("cuttlefish").root;
  const arms = new THREE.Box3();
  for (let index = 1; index <= 8; index++)
    arms.union(
      new THREE.Box3().setFromObject(
        cuttlefish.getObjectByName(`cuttlefish_arm_${index}`),
      ),
    );
  for (let index = 1; index <= 2; index++) {
    const tentacle = new THREE.Box3().setFromObject(
      cuttlefish.getObjectByName(`cuttlefish_tentacle_${index}`),
    );
    assert.ok(
      tentacle.min.z >= arms.min.z,
      "Resting tentacle clubs remain retracted within the arms",
    );
  }
});
