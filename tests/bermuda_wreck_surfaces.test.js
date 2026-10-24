import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaWreckSurfaces } from "../src/bermuda_wreck_surfaces.js";

// UV 变化不能改变实体顶点或法线，也不能污染同场景的其他材质。
test("Wreck surface projection preserves geometry and isolates unrelated materials", () => {
  const surface = createBermudaWreckSurfaces(),
    root = new THREE.Group(),
    material = new THREE.MeshStandardMaterial({ color: 0x665544 }),
    plain = new THREE.MeshStandardMaterial(),
    geometry = new THREE.BoxGeometry(10, 2, 20),
    untouched = geometry.clone();
  const p = geometry.attributes.position.array.slice(),
    n = geometry.attributes.normal.array.slice(),
    indices = geometry.index.array.slice(),
    oldUV = untouched.attributes.uv.array.slice();
  root.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(untouched, plain),
  );
  surface.apply(material, "deck");
  surface.project(root);
  assert.deepEqual(geometry.attributes.position.array, p);
  assert.deepEqual(geometry.attributes.normal.array, n);
  assert.deepEqual(geometry.index.array, indices);
  assert.deepEqual(untouched.attributes.uv.array, oldUV);
  assert.ok([...geometry.attributes.uv.array].every(Number.isFinite));
  assert.notDeepEqual(geometry.attributes.uv.array, oldUV);
  assert.equal(material.color.getHex(), 0x665544);
  assert.equal(material.map, null);
  assert.equal(plain.userData.wreckSurfaceKind, undefined);
  assert.equal(surface.groups.get("deck").materials.size, 1);
  surface.dispose();
  surface.dispose();
  assert.equal(surface.prepare.state, "disposed");
  assert.equal(surface.groups.get("deck").materials.size, 0);
  geometry.dispose();
  untouched.dispose();
  material.dispose();
  plain.dispose();
});

test("Curved hull keeps a continuous Z/Y texture projection across normal changes", () => {
  const surface = createBermudaWreckSurfaces(),
    material = new THREE.MeshStandardMaterial(),
    geometry = new THREE.BufferGeometry(),
    root = new THREE.Group();
  material.name = "double_hull";
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([4, 3, 2, 4, 3, 2], 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 0, 1], 3),
  );
  root.add(new THREE.Mesh(geometry, material));
  surface.apply(material, "hull");
  surface.project(root);
  assert.equal(geometry.attributes.uv.getX(0), geometry.attributes.uv.getX(1));
  assert.equal(geometry.attributes.uv.getY(0), geometry.attributes.uv.getY(1));
  surface.dispose();
  material.dispose();
  geometry.dispose();
});
