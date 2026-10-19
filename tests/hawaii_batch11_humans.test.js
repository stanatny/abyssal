import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFileSync } from "node:fs";
import { createArticulatedHuman } from "../src/human_models.js";
for (const kind of ["swimmer", "diver"])
  for (const sex of ["male", "female"]) {
    test(`${kind}/${sex}: HF T-pose, garment finish and actual surface survive the complete swimming cycle`, () => {
      const packed = JSON.parse(
        readFileSync(
          new URL(
            `../src/assets/models/${kind}_${sex}_hf_mesh.json`,
            import.meta.url,
          ),
        ),
      );
      assert.equal(packed.textureBake.rigPose, "T");
      assert.match(packed.textureBake.garmentFinish, /Offline/);
      const m = createArticulatedHuman(kind, 1, sex),
        meshes = m.children.filter((x) => x.isSkinnedMesh),
        point = new THREE.Vector3();
      assert.equal(meshes.length, 3);
      assert.ok(meshes.every((part) => !part.name.includes("shoulder_joints")));
      assert.equal(m.userData.disposeLocalMotion, m.userData.dispose);
      const triangles = meshes.reduce(
        (n, s) => n + s.geometry.index.count / 3,
        0,
      );
      assert.ok(triangles < 12000);
      for (const mesh of meshes) {
        const g = mesh.geometry,
          w = g.attributes.skinWeight,
          n = g.attributes.normal;
        for (let i = 0; i < w.count; i++) {
          assert.ok(
            Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
          );
          assert.ok(
            Math.abs(point.fromBufferAttribute(n, i).length() - 1) < 0.002,
          );
        }
      }
      let maxEdge = 0,
        maxStep = 0;
      const previous = new Map();
      for (let f = 0; f < 240; f++) {
        m.userData.samplePose(f / 240);
        m.updateMatrixWorld(true);
        for (const mesh of meshes) {
          mesh.skeleton.update();
          const g = mesh.geometry,
            positions = [];
          for (let i = 0; i < g.attributes.position.count; i++) {
            mesh.getVertexPosition(i, point);
            assert.ok(point.toArray().every(Number.isFinite));
            assert.ok(mesh.boundingSphere.containsPoint(point));
            positions.push(point.clone());
            if (i % 47 === 0) {
              const key = mesh.name + ":" + i;
              if (previous.has(key))
                maxStep = Math.max(
                  maxStep,
                  point.distanceTo(previous.get(key)),
                );
              previous.set(key, point.clone());
            }
          }
          for (let j = 0; j < g.index.count; j += 3)
            for (let k = 0; k < 3; k++)
              maxEdge = Math.max(
                maxEdge,
                positions[g.index.array[j + k]].distanceTo(
                  positions[g.index.array[j + ((k + 1) % 3)]],
                ),
              );
        }
      }
      assert.ok(maxEdge < 0.26, `no stretched surface spikes: ${maxEdge}`);
      assert.ok(maxStep < 0.03, `continuous full cycle: ${maxStep}`);
      m.userData.dispose();
      m.userData.dispose();
    });
  }
