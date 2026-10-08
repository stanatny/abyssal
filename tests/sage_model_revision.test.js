import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import { buildPenglaiSage } from "../src/creature_penglai_sage.js";
import { pgDrape, pgMaterial } from "../src/creature_penglai_art.js";
import { createCreature } from "../src/creatures.js";

function makeSage() {
  const root = new THREE.Group(),
    body = new THREE.Group(),
    motions = [];
  root.add(body);
  buildPenglaiSage(body, motions, root);
  const animate = (time) => {
    for (const motion of motions) motion(time, 1);
    root.updateMatrixWorld(true);
  };
  animate(0);
  return { root, body, animate };
}

function meshIntegrity(geometry) {
  const positions = geometry.attributes.position,
    indices = geometry.index.array,
    vertices = [],
    welded = new Map(),
    edges = new Map();
  for (let i = 0; i < positions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, i);
    assert.ok(point.toArray().every(Number.isFinite));
    const key = point
      .toArray()
      .map((value) => Math.round(value / 1e-7))
      .join(",");
    if (!welded.has(key)) welded.set(key, welded.size);
    vertices.push(welded.get(key));
  }
  let volume = 0;
  for (let i = 0; i < indices.length; i += 3) {
    const points = [0, 1, 2].map((offset) =>
        new THREE.Vector3().fromBufferAttribute(positions, indices[i + offset]),
      ),
      normal = points[1]
        .clone()
        .sub(points[0])
        .cross(points[2].clone().sub(points[0]));
    assert.ok(normal.lengthSq() > 1e-24, "No collapsed triangles");
    volume += points[0].dot(points[1].clone().cross(points[2])) / 6;
    for (let j = 0; j < 3; j++) {
      const a = vertices[indices[i + j]],
        b = vertices[indices[i + ((j + 1) % 3)]],
        key = [a, b].sort((x, y) => x - y).join(",");
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  return { volume, edgeCounts: [...edges.values()] };
}

function fingerprint(geometry) {
  const hash = createHash("sha256");
  for (const attribute of [
    geometry.attributes.position,
    geometry.attributes.normal,
  ])
    hash.update(new Uint8Array(attribute.array.buffer));
  hash.update(new Uint8Array(geometry.index.array.buffer));
  return hash.digest("hex");
}

test("Sage head is a closed opaque surface from every sampled viewing direction", () => {
  const { body } = makeSage(),
    head = body.getObjectByName("sculpted_human_head"),
    integrity = meshIntegrity(head.geometry);
  assert.ok(integrity.edgeCounts.every((count) => count === 2));
  assert.ok(integrity.volume > 0);
  assert.equal(head.material.transparent, false);
  assert.equal(head.material.opacity, 1);
  assert.equal(head.material.depthWrite, true);
  for (const elevation of [-0.9, -0.5, 0, 0.5, 0.9])
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2,
        direction = new THREE.Vector3(
          Math.cos(angle),
          elevation,
          Math.sin(angle),
        ).normalize(),
        origin = direction.clone().multiplyScalar(0.3).add(head.position),
        ray = new THREE.Raycaster(origin, direction.clone().negate()),
        hits = ray.intersectObject(head, false);
      assert.ok(hits.length, "The exterior head must occlude its center");
      assert.ok(hits[0].distance < 0.3);
    }
});

test("Descending folded robes expose their exterior rather than inner back faces", () => {
  const drape = pgDrape(
      new THREE.Group(),
      pgMaterial("#244c59", 3),
      "sage_winding_test",
      [
        [0.08, 0.115, 0.065],
        [-0.08, 0.14, 0.082],
        [-0.42, 0.245, 0.15],
      ],
      16,
    ),
    positions = drape.geometry.attributes.position,
    indices = drape.geometry.index.array;
  for (let i = 0; i < indices.length; i += 3) {
    const [a, b, c] = [0, 1, 2].map((offset) =>
        new THREE.Vector3().fromBufferAttribute(positions, indices[i + offset]),
      ),
      normal = b.clone().sub(a).cross(c.clone().sub(a)),
      center = a
        .clone()
        .add(b)
        .add(c)
        .multiplyScalar(1 / 3);
    assert.ok(normal.dot(new THREE.Vector3(center.x, 0, center.z)) > 0);
  }
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2,
      radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)),
      origin = radial.clone().multiplyScalar(0.5).setY(-0.2),
      ray = new THREE.Raycaster(origin, radial.clone().negate()),
      hit = ray.intersectObject(drape, false)[0];
    assert.ok(
      hit && hit.distance < 0.5,
      "The near exterior must face the viewer",
    );
  }
});

test("Eye and socket attachments sit against the actual curved skull instead of floating in front", () => {
  const { body } = makeSage(),
    head = body.getObjectByName("sculpted_human_head"),
    attachments = [];
  body.traverse((node) => {
    if (
      ["deep_eye_socket", "narrow_forward_eye", "focused_human_iris"].includes(
        node.name,
      )
    )
      attachments.push(node);
  });
  assert.equal(attachments.length, 6);
  for (const attachment of attachments) {
    const normal = new THREE.Vector3(0, 0, -1).applyQuaternion(
        attachment.quaternion,
      ),
      ray = new THREE.Raycaster(
        attachment.position.clone().addScaledVector(normal, 0.02),
        normal.clone().negate(),
      ),
      hit = ray.intersectObject(head, false)[0];
    assert.ok(hit, "Every eye attachment needs underlying skin support");
    assert.ok(Math.abs(hit.distance - 0.02) < 0.003);
  }
});

test("Both staggered boot soles remain supported by the actual greatsword through complete motion cycles", () => {
  const { root, body, animate } = makeSage(),
    boots = [];
  body.traverse((node) => {
    if (node.name === "raised_toe_cloth_boot") boots.push(node);
  });
  assert.equal(boots.length, 2);
  assert.ok(Math.abs(boots[0].position.z - boots[1].position.z) > 0.05);
  const blade = root.userData.ridingSword.getObjectByName("sword_blade"),
    soles = boots.map((boot) => {
      const geometry = boot.geometry,
        integrity = meshIntegrity(geometry),
        positions = geometry.attributes.position,
        points = [];
      assert.ok(integrity.edgeCounts.every((count) => count === 2));
      assert.ok(integrity.volume > 0);
      for (let i = 0; i < positions.count; i++)
        if (positions.getY(i) < 1e-8)
          points.push(new THREE.Vector3().fromBufferAttribute(positions, i));
      assert.ok(points.length > 20, "Each sole must have a real support patch");
      return points;
    });
  for (let frame = 0; frame <= 64; frame++) {
    animate((frame / 64) * ((Math.PI * 2) / 0.12));
    for (let foot = 0; foot < boots.length; foot++)
      for (const point of soles[foot]) {
        const world = point.clone().applyMatrix4(boots[foot].matrixWorld),
          ray = new THREE.Raycaster(
            world.clone().add(new THREE.Vector3(0, 0.05, 0)),
            new THREE.Vector3(0, -1, 0),
          ),
          hit = ray.intersectObject(blade, false)[0];
        assert.ok(hit, "Sole support must not overhang the sword blade");
        assert.ok(Math.abs(hit.point.y - world.y) < 1e-6);
      }
  }
  assert.deepEqual(root.userData.headAnchor.toArray(), [0, 0.33, -0.078]);
  assert.deepEqual(root.position.toArray(), [0, 0, 0]);
  assert.deepEqual(root.quaternion.toArray(), [0, 0, 0, 1]);
});

test("Sage instances share immutable geometry while keeping independent motion and unit length", () => {
  const a = makeSage(),
    b = makeSage(),
    headA = a.body.getObjectByName("sculpted_human_head"),
    headB = b.body.getObjectByName("sculpted_human_head"),
    beforeGeometry = fingerprint(headA.geometry),
    ringB = b.body.getObjectByName("orbiting_sword_array"),
    beforeRing = ringB.matrixWorld.clone();
  assert.equal(headA.geometry, headB.geometry);
  assert.notEqual(a.root.userData.ridingSword, b.root.userData.ridingSword);
  a.animate(4);
  assert.ok(ringB.matrixWorld.equals(beforeRing));
  assert.equal(fingerprint(headA.geometry), beforeGeometry);
  const built = createCreature("sword_sage", 52);
  assert.ok(
    Math.abs(
      new THREE.Box3().setFromObject(built, true).getSize(new THREE.Vector3())
        .z - 52,
    ) < 1e-6,
  );
  assert.equal(built.userData.normalizedLength, 1);
});
