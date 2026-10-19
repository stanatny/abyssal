import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { updateLordBody } from "../src/lord_body.js";
import { findBossContact } from "../src/encounters.js";

const kinds = ["kraken", "mayan", "hydra", "leviathan"];
const v = new THREE.Vector3(),
  w = new THREE.Vector3();
for (const kind of kinds) {
  test(`${kind}: HF skin weights, UV seams, independent lifetime and actual branch motion`, () => {
    const model = createCreature(kind, 1),
      other = createCreature(kind, 1);
    const { mesh, chains, bones } = model.userData.hfRig;
    const peer = other.userData.hfRig.mesh,
      g = mesh.geometry,
      p = g.attributes.position,
      weights = g.attributes.skinWeight,
      ids = g.attributes.skinIndex;
    assert.strictEqual(g, peer.geometry);
    assert.strictEqual(mesh.material, peer.material);
    assert.notStrictEqual(mesh.skeleton, peer.skeleton);
    const seams = new Map();
    let duplicates = 0;
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        v.fromBufferAttribute(g.attributes.normal, i).lengthSq() > 0.99,
        `${kind}: vertex ${i} must have a usable nonzero surface normal`,
      );
      let total = 0;
      for (let j = 0; j < 4; j++) {
        const weight = weights.array[i * 4 + j];
        assert.ok(weight >= 0 && weight <= 1);
        assert.ok(ids.array[i * 4 + j] < bones.length);
        total += weight;
      }
      assert.ok(Math.abs(total - 1) < 1e-6);
      const key = v.fromBufferAttribute(p, i).toArray().join(",");
      const signature = [
        ...ids.array.slice(i * 4, i * 4 + 4),
        ...weights.array.slice(i * 4, i * 4 + 4),
      ];
      if (seams.has(key)) {
        assert.deepEqual(signature, seams.get(key));
        duplicates++;
      } else seams.set(key, signature);
    }
    assert.ok(duplicates > 100);
    const tips = chains
      .filter((c) => c.type !== "jaw")
      .map((c) => {
        const tip = new THREE.Vector3(...c.points.at(-1));
        let index = 0,
          best = Infinity;
        for (let i = 0; i < p.count; i++) {
          const d = v.fromBufferAttribute(p, i).distanceToSquared(tip);
          if (d < best) {
            best = d;
            index = i;
          }
        }
        return { index, positions: [], name: c.name };
      });
    const otherMatrices = peer.skeleton.bones.map((b) =>
      b.matrixWorld.toArray(),
    );
    let maxJump = 0,
      last;
    for (let frame = 0; frame <= 600; frame++) {
      const phase = frame / 30;
      model.userData.animate(phase, frame < 240 ? 0.4 : 3, {
        gaitPhase: phase,
      });
      model.updateMatrixWorld(true);
      mesh.skeleton.update();
      for (const tip of tips)
        tip.positions.push(
          mesh.getVertexPosition(tip.index, new THREE.Vector3()),
        );
      const now = tips.map((t) => t.positions.at(-1));
      if (last)
        now.forEach(
          (p, i) => (maxJump = Math.max(maxJump, p.distanceTo(last[i]))),
        );
      last = now;
    }
    for (const tip of tips) {
      const size = new THREE.Box3()
        .setFromPoints(tip.positions)
        .getSize(v)
        .length();
      assert.ok(size > 0.002, `${tip.name}: actual tip excursion ${size}`);
    }
    assert.ok(maxJump < 0.025, `continuous deformation ${maxJump}`);
    assert.deepEqual(
      peer.skeleton.bones.map((b) => b.matrixWorld.toArray()),
      otherMatrices,
    );
    const frozen = mesh.skeleton.bones.map((b) => b.matrixWorld.toArray());
    model.userData.animate(20, 0, { gaitPhase: 20 });
    model.updateMatrixWorld(true);
    assert.deepEqual(
      mesh.skeleton.bones.map((b) => b.matrixWorld.toArray()),
      frozen,
    );
    let freed = 0;
    const original = mesh.skeleton.dispose.bind(mesh.skeleton);
    mesh.skeleton.dispose = () => {
      freed++;
      original();
    };
    model.userData.disposeLocalMotion();
    model.userData.disposeLocalMotion();
    assert.equal(freed, 1);
    assert.strictEqual(peer.geometry, g);
  });

  test(`${kind}: fitted solid sections lie inside the visible skin and mouth anchors follow real anatomy`, () => {
    const model = createCreature(kind, 1),
      mesh = model.userData.hfRig.mesh;
    const saved = mesh.material.side;
    mesh.material.side = THREE.DoubleSide;
    try {
      for (const phase of [0, 3, 8, 15]) {
        model.userData.animate(phase, 3, { gaitPhase: phase });
        const cores = updateLordBody(model);
        // 内外双层重建皮肤不是可穿过的躯干；每个实体中心都必须有双向真实表面包围。
        for (const core of cores) {
          const center = new THREE.Vector3(core.x, core.y, core.z);
          for (const sign of [-1, 1]) {
            const hits = new THREE.Raycaster(
              center,
              new THREE.Vector3(sign, 0, 0),
            ).intersectObject(mesh);
            assert.ok(
              hits.length > 0,
              `${kind}: core at ${center.toArray()} has no skin in direction ${sign}`,
            );
            assert.ok(hits[0].distance < 0.3);
          }
          assert.ok(findBossContact(model, center, 0, { visibleBody: true }));
        }
        for (const mouth of model.userData.mouthAnchors) {
          mouth.getWorldPosition(v);
          let nearest = Infinity;
          for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
            mesh.getVertexPosition(i, w).applyMatrix4(mesh.matrixWorld);
            nearest = Math.min(nearest, w.distanceTo(v));
          }
          assert.ok(nearest < 0.04, `${kind}: mouth detached by ${nearest}`);
        }
      }
    } finally {
      mesh.material.side = saved;
    }
  });
}
