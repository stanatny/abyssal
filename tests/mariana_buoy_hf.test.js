import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { acquireMarianaFleetAsset } from "../src/mariana_fleet_asset.js";
import { createMarianaFleet } from "../src/mariana_surface.js";

const locations = [
  [-130, -65],
  [132, -245],
  [-105, -430],
];

function observatories(fleet) {
  return locations.map((_, i) => {
    const root = fleet.root.getObjectByName(`trench_observatory_${i}`);
    assert.ok(root);
    return root;
  });
}

function near(actual, expected, label, tolerance = 1e-6) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: ${actual} differs from ${expected}`,
  );
}

test("HF survey buoy has bounded indexed geometry, unit normals and usable untextured colors", () => {
  const asset = acquireMarianaFleetAsset("buoy");
  try {
    const { geometry, material } = asset;
    const { position, normal, uv, color } = geometry.attributes;
    assert.ok(position.count > 0);
    assert.equal(normal.count, position.count);
    assert.equal(uv.count, position.count);
    assert.equal(color.count, position.count);
    assert.ok(geometry.index);
    assert.equal(geometry.index.count % 3, 0);
    assert.ok(geometry.index.count / 3 > 0);
    assert.ok(geometry.index.count / 3 <= 16500);
    for (const index of geometry.index.array) {
      assert.ok(
        Number.isInteger(index) && index >= 0 && index < position.count,
      );
    }
    const n = new THREE.Vector3();
    let minColor = Infinity,
      maxColor = -Infinity;
    for (let i = 0; i < position.count; i++) {
      for (const attribute of [position, normal, uv, color])
        for (let component = 0; component < attribute.itemSize; component++) {
          const value = attribute.getComponent(i, component);
          assert.ok(Number.isFinite(value));
          if (attribute === uv || attribute === color)
            assert.ok(value >= 0 && value <= 1);
        }
      near(n.fromBufferAttribute(normal, i).length(), 1, "normal", 0.001);
      for (const value of [color.getX(i), color.getY(i), color.getZ(i)]) {
        minColor = Math.min(minColor, value);
        maxColor = Math.max(maxColor, value);
      }
    }
    assert.ok(
      maxColor - minColor > 0.1,
      "fallback must retain visible contrast",
    );
    assert.equal(material.vertexColors, true);
    assert.equal(material.transparent, false);
    assert.equal(material.opacity, 1);
    const box = geometry.boundingBox,
      size = box.getSize(new THREE.Vector3());
    near(Math.max(size.x, size.z), 4, "float diameter", 0.01);
    near(box.min.x + box.max.x, 0, "float X center", 0.01);
    near(box.min.z + box.max.z, 0, "float Z center", 0.01);
    near(box.max.y, 5.8, "antenna height", 0.01);
    near(box.min.y, -1.35, "submerged keel", 0.03);
  } finally {
    asset.release();
  }
});

test("Survey float has actual opaque upper and submerged lower surfaces around its keel", () => {
  const asset = acquireMarianaFleetAsset("buoy");
  const mesh = new THREE.Mesh(asset.geometry, asset.material),
    ray = new THREE.Raycaster();
  mesh.updateMatrixWorld(true);
  try {
    for (const [x, z] of [
      [0.9, 0],
      [-0.9, 0],
      [0, 0.9],
      [0, -0.9],
    ]) {
      ray.set(new THREE.Vector3(x, -4, z), new THREE.Vector3(0, 1, 0));
      const bottom = ray.intersectObject(mesh)[0];
      ray.set(new THREE.Vector3(x, 1.5, z), new THREE.Vector3(0, -1, 0));
      const top = ray.intersectObject(mesh)[0];
      assert.ok(bottom && top, `missing float surface at ${x},${z}`);
      assert.ok(bottom.point.y < -0.1, "bottom must exist below the waterline");
      assert.ok(top.point.y > 0.1, "float deck must exist above the waterline");
      assert.ok(top.point.y - bottom.point.y > 0.4, "float is not a thin disc");
    }
    ray.set(new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0, -1, 0));
    ray.far = 6.4;
    const keel = ray.intersectObject(mesh)[0];
    assert.ok(keel, "retained cable must enter the visible central keel");
    assert.ok(keel.point.y >= -1.4 && keel.point.y < -0.6);
    assert.equal(asset.material.transparent, false);
    assert.equal(asset.material.opacity, 1);
  } finally {
    asset.release();
  }
});

test("Three buoy instances and separate fleets share art until the last owner leaves", () => {
  const scene = new THREE.Scene(),
    a = createMarianaFleet(scene),
    b = createMarianaFleet(scene);
  let replacement;
  try {
    const roots = [...observatories(a), ...observatories(b)],
      first = roots[0].userData.buoyArt.body,
      preparation = roots[0].userData.prepareMaterials,
      disposed = { geometry: 0, material: 0 };
    for (const root of roots) {
      const body = root.userData.buoyArt.body;
      assert.equal(body.name, "mariana_buoy_hf_surface");
      assert.equal(body.parent, root);
      assert.equal(body.geometry, first.geometry);
      assert.equal(body.material, first.material);
      assert.equal(root.userData.prepareMaterials, preparation);
      assert.deepEqual(body.scale.toArray(), [1, 1, 1]);
    }
    first.geometry.addEventListener("dispose", () => disposed.geometry++);
    first.material.addEventListener("dispose", () => disposed.material++);
    const aPose = observatories(a).map((root) => [
      ...root.position.toArray(),
      ...root.quaternion.toArray(),
    ]);
    b.update(47);
    assert.deepEqual(
      observatories(a).map((root) => [
        ...root.position.toArray(),
        ...root.quaternion.toArray(),
      ]),
      aPose,
      "another fleet's motion must not alter this fleet's buoy poses",
    );
    a.dispose();
    a.dispose();
    assert.deepEqual(disposed, { geometry: 0, material: 0 });
    assert.notEqual(preparation.state, "disposed");
    b.update(120);
    assert.ok(observatories(b)[0].userData.buoyArt.body.geometry.index.count);
    b.dispose();
    b.dispose();
    assert.deepEqual(disposed, { geometry: 1, material: 1 });
    assert.equal(preparation.state, "disposed");
    replacement = createMarianaFleet(scene);
    const fresh = observatories(replacement)[0].userData.buoyArt.body;
    assert.notEqual(fresh.geometry, first.geometry);
    assert.notEqual(fresh.material, first.material);
  } finally {
    a.dispose();
    b.dispose();
    replacement?.dispose();
  }
  assert.equal(scene.children.length, 0);
});

test("Survey buoy locations and gentle float poses retain sampled accepted motion and freeze with its clock", () => {
  const scene = new THREE.Scene(),
    fleet = createMarianaFleet(scene);
  // 旧程序化浮标的独立采样值；不在测试内重写运行时运动公式。
  const samples = [
    [
      0,
      [
        [4.297633904059763, -0.0496097207694062],
        [4.0169867478867385, 0.0026527537937135796],
        [4.310571290731995, -0.02326523097823567],
      ],
    ],
    [
      17.25,
      [
        [3.9875461274932027, 0.022278900917016425],
        [4.307176309540582, -0.0579655800822335],
        [4.029976160029161, 0.049002278180670746],
      ],
    ],
    [
      93.5,
      [
        [4.312137831543498, 0.05301351978136458],
        [3.834074705985285, -0.05423824679753208],
        [4.30006135689609, 0.05976855068115077],
      ],
    ],
  ];
  try {
    for (const [time, poses] of samples) {
      fleet.update(time);
      for (const [i, root] of observatories(fleet).entries()) {
        near(root.position.x, locations[i][0], "anchored X");
        near(root.position.z, locations[i][1], "anchored Z");
        near(root.position.y, poses[i][0], "accepted bob height");
        near(root.rotation.z, poses[i][1], "accepted roll");
      }
      const frozen = observatories(fleet).map((root) => [
        ...root.position.toArray(),
        ...root.quaternion.toArray(),
      ]);
      for (let frame = 0; frame < 30; frame++) fleet.update(time);
      assert.deepEqual(
        observatories(fleet).map((root) => [
          ...root.position.toArray(),
          ...root.quaternion.toArray(),
        ]),
        frozen,
      );
    }
  } finally {
    fleet.dispose();
  }
});

test("Buoy contacts and retained cable anchors survive roll and repeated fleet reset", () => {
  const scene = new THREE.Scene(),
    fleet = createMarianaFleet(scene),
    colliders = fleet.colliders,
    original = [...colliders],
    ids = original.map((collider) => collider.id);
  try {
    assert.equal(colliders.length, 25);
    for (const time of [0, 17.25, 93.5]) {
      fleet.update(time);
      scene.updateMatrixWorld(true);
      for (const [i, root] of observatories(fleet).entries()) {
        const collider = colliders.find((c) => c.id === `survey_buoy_${i}`);
        assert.equal(collider.type, "sphere");
        assert.equal(collider.radius, 2);
        near(collider.x, locations[i][0], "collision X");
        near(collider.z, locations[i][1], "collision Z");
        near(collider.y, root.position.y, "collision follows float");
        const cable = root.children.find(
          (node) => node.material?.name === "survey_cable",
        );
        assert.ok(cable);
        cable.geometry.computeBoundingBox();
        const box = cable.geometry.boundingBox;
        near(box.max.y, -0.6, "cable upper anchor");
        near(box.min.y, -7, "cable lower end");
        const visibleAnchor = cable.localToWorld(
            new THREE.Vector3(0, box.max.y, 0),
          ),
          retainedAnchor = root.localToWorld(new THREE.Vector3(0, -0.6, 0));
        assert.ok(visibleAnchor.distanceTo(retainedAnchor) < 1e-6);
      }
      fleet.reset();
      assert.equal(fleet.colliders, colliders);
      assert.equal(colliders.length, 25);
      assert.deepEqual(
        colliders.map((c) => c.id),
        ids,
      );
      for (let i = 0; i < original.length; i++)
        assert.equal(colliders[i], original[i]);
    }
  } finally {
    fleet.dispose();
    fleet.dispose();
  }
  assert.equal(colliders.length, 0);
  assert.equal(scene.children.length, 0);
});
