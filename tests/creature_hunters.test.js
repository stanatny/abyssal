import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildHunterCreature,
  HUNTER_CREATURE_KINDS,
} from "../src/creature_hunters.js";

function specimen(kind) {
  const root = new THREE.Group(),
    motions = [];
  buildHunterCreature(kind, root, motions);
  return {
    root,
    animate: (phase, effort = 1) => motions.forEach((m) => m(phase, effort)),
  };
}
function meshes(root) {
  const list = [];
  root.traverse((node) => {
    if (node.isMesh) list.push(node);
  });
  return list;
}
function posedBounds(root) {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3(),
    p = new THREE.Vector3();
  for (const node of meshes(root)) {
    if (node.isSkinnedMesh) node.skeleton.update();
    for (let i = 0; i < node.geometry.attributes.position.count; i++) {
      node.getVertexPosition(i, p).applyMatrix4(node.matrixWorld);
      assert.ok(p.toArray().every(Number.isFinite));
      bounds.expandByPoint(p);
    }
  }
  return bounds;
}

test("五种现代猎手居中、精确单位长度、有效极值姿态且在预算内", () => {
  assert.equal(HUNTER_CREATURE_KINDS.size, 5);
  for (const kind of HUNTER_CREATURE_KINDS) {
    const { root, animate } = specimen(kind),
      rest = posedBounds(root),
      objects = meshes(root);
    assert.equal(root.userData.normalizedLength, 1);
    assert.equal(root.userData.hunterAnatomy, kind);
    assert.ok(Math.abs(rest.getSize(new THREE.Vector3()).z - 1) < 1e-6, kind);
    assert.ok(rest.getCenter(new THREE.Vector3()).length() < 1e-6, kind);
    assert.ok(
      objects.length <= (kind === "octopus" ? 18 : 12),
      `${kind}: draw budget`,
    );
    const triangles = objects.reduce(
      (sum, n) =>
        sum +
        (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3,
      0,
    );
    assert.ok(
      triangles <= (kind === "octopus" ? 26000 : 15000),
      `${kind}: triangle budget`,
    );
    for (const [t, e] of [
      [0, 0],
      [0.7, 3],
      [2, 1],
      [9, 3],
      [10000, 0.15],
    ]) {
      animate(t, e);
      const size = posedBounds(root).getSize(new THREE.Vector3());
      assert.ok(size.z > 0.85 && size.z < 1.1, `${kind}: posed length`);
      assert.ok(size.x > 0.2 && size.x < 0.85, `${kind}: posed width`);
      assert.ok(size.y > 0.15 && size.y < 0.65, `${kind}: posed height`);
    }
  }
});

test("现代猎手共享几何与材质，独立关节真正变形且不会写坏缓存", () => {
  for (const kind of HUNTER_CREATURE_KINDS) {
    const a = specimen(kind),
      b = specimen(kind),
      left = meshes(a.root),
      right = meshes(b.root);
    left.forEach((node, i) => {
      assert.equal(node.geometry, right[i].geometry);
      assert.equal(node.material, right[i].material);
    });
    const source = left.map((n) =>
      n.geometry.attributes.position.array.slice(),
    );
    const before = posedBounds(a.root),
      neighbor = posedBounds(b.root);
    a.animate(2.7, 3);
    const after = posedBounds(a.root);
    assert.notDeepEqual(after, before, kind);
    assert.deepEqual(posedBounds(b.root), neighbor, kind);
    left.forEach((node, i) =>
      assert.deepEqual(node.geometry.attributes.position.array, source[i]),
    );
    const torso = left.find((n) => n.isSkinnedMesh);
    if (torso) {
      const other = right.find((n) => n.isSkinnedMesh);
      assert.notEqual(torso.skeleton, other.skeleton);
      const position = torso.geometry.attributes.position;
      let vertex = 0;
      for (let i = 1; i < position.count; i++)
        if (
          kind === "octopus"
            ? torso.geometry.attributes.skinIndex.getX(i) >
              torso.geometry.attributes.skinIndex.getX(vertex)
            : position.getZ(i) > position.getZ(vertex)
        )
          vertex = i;
      assert.ok(
        torso
          .getVertexPosition(vertex, new THREE.Vector3())
          .distanceTo(other.getVertexPosition(vertex, new THREE.Vector3())) >
          0.0001,
      );
      if (kind !== "octopus")
        assert.equal(
          a.root.getObjectByName(`${kind}_tail`).parent,
          torso.skeleton.bones[2],
        );
    }
  }
});

test("全部猎手经世界缩放旋转与动作后保留实际网格射线命中", () => {
  for (const kind of HUNTER_CREATURE_KINDS) {
    const { root, animate } = specimen(kind);
    root.position.set(11, -7, -13);
    root.rotation.y = 0.45;
    root.scale.setScalar(4);
    animate(1.2, 3);
    posedBounds(root);
    const anatomy = root.children[0],
      target = anatomy.localToWorld(
        new THREE.Vector3(
          0,
          0,
          kind === "angler" ? -0.1 : kind === "octopus" ? 0.13 : 0,
        ),
      );
    const ray = new THREE.Raycaster(
      target.clone().add(new THREE.Vector3(5, 0, 0)),
      new THREE.Vector3(-1, 0, 0),
    );
    const hits = ray.intersectObject(root, true);
    assert.ok(hits.length > 0, kind);
    assert.ok(
      hits.every((hit) => Number.isFinite(hit.distance)),
      kind,
    );
  }
});

test("鮟鱇宽口上下齿列与前突下颌包围可射入的真实深口腔", () => {
  const { root } = specimen("angler"),
    body = root.children[0];
  posedBounds(root);
  const source = body.localToWorld(new THREE.Vector3(0, 0.008, -1)),
    direction = new THREE.Vector3(0, 0, 1);
  const ray = new THREE.Raycaster(source, direction),
    hit = ray
      .intersectObject(root, true)
      .find((h) => h.object.name === "angler_open_body");
  assert.ok(hit);
  const local = body.worldToLocal(hit.point.clone());
  assert.ok(local.z > -0.23 && local.z < -0.15, `real mouth depth: ${local.z}`);
  const teeth = root.getObjectByName("angler_lip_dentition"),
    bounds = new THREE.Box3().setFromBufferAttribute(
      teeth.geometry.attributes.position,
    );
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x > 0.31);
  assert.ok(size.y > 0.19 && size.y < 0.23);
  assert.ok(size.x > size.y * 1.4);
  let upperFront = Infinity,
    lowerFront = Infinity;
  const dental = teeth.geometry.attributes.position;
  for (let i = 0; i < dental.count; i++) {
    if (dental.getY(i) > 0.025)
      upperFront = Math.min(upperFront, dental.getZ(i));
    if (dental.getY(i) < -0.09)
      lowerFront = Math.min(lowerFront, dental.getZ(i));
  }
  assert.ok(lowerFront < upperFront - 0.035);
  const esca = root.getObjectByName("angler_luminous_esca");
  assert.ok(esca.material.emissiveIntensity > 1);
  let lightCount = 0;
  root.traverse((node) => {
    if (node.isLight) lightCount++;
  });
  assert.equal(lightCount, 0);
});

test("五种动物侧视时瞳孔没有埋进头颅，实际射线先命中眼睛", () => {
  for (const kind of HUNTER_CREATURE_KINDS) {
    const { root } = specimen(kind);
    root.updateMatrixWorld(true);
    const anatomy = root.children[0],
      pupils = root.getObjectByName(`${kind}_pupils`);
    const eyeBounds = new THREE.Box3().setFromBufferAttribute(
      pupils.geometry.attributes.position,
    );
    for (const side of [-1, 1]) {
      const source = eyeBounds.getCenter(new THREE.Vector3());
      source.x = side;
      anatomy.localToWorld(source);
      const ray = new THREE.Raycaster(source, new THREE.Vector3(-side, 0, 0));
      assert.equal(
        ray.intersectObject(root, true)[0].object.name,
        `${kind}_pupils`,
      );
    }
  }
});

test("锤头两端眼睛、灰背白腹白鲨、水平鲸尾和章鱼八腕保持种间辨识", () => {
  const hammer = specimen("hammerhead").root;
  const eyeBounds = new THREE.Box3().setFromBufferAttribute(
    hammer.getObjectByName("hammerhead_eyes").geometry.attributes.position,
  );
  assert.ok(eyeBounds.min.x < -0.22 && eyeBounds.max.x > 0.22);
  const shark = specimen("shark").root,
    torso = shark.getObjectByName("shark_continuous_body"),
    p = torso.geometry.attributes.position,
    c = torso.geometry.attributes.color;
  let top = 0,
    bottom = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getY(i) > p.getY(top)) top = i;
    if (p.getY(i) < p.getY(bottom)) bottom = i;
  }
  assert.ok(c.getX(bottom) > c.getX(top) * 2);
  const whale = specimen("sperm_whale").root,
    tail = whale.getObjectByName("sperm_whale_caudal"),
    tailBounds = new THREE.Box3().setFromBufferAttribute(
      tail.geometry.attributes.position,
    ),
    size = tailBounds.getSize(new THREE.Vector3());
  assert.ok(size.x > size.y * 10);
  assert.equal(whale.getObjectByName("sperm_whale_upper_teeth"), undefined);
  const octopus = specimen("octopus").root;
  for (let i = 1; i <= 8; i++)
    assert.ok(octopus.getObjectByName(`octopus_arm_${i}`));
  assert.equal(octopus.getObjectByName("octopus_arm_9"), undefined);
  for (const node of meshes(octopus).filter((n) =>
    n.name.startsWith("octopus_continuous_arm_"),
  )) {
    assert.ok(node.geometry.attributes.color);
    assert.ok(node.geometry.attributes.position.count > 6000);
  }
});
