import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";

for (const kind of ["kraken", "mayan", "hydra", "leviathan"])
  test(`${kind}: full swim / effort / Kraken-grip cycles preserve triangle edge lengths`, () => {
    const model = createCreature(kind, 1),
      { mesh, chains } = model.userData.hfRig,
      p = mesh.geometry.attributes.position,
      indices = mesh.geometry.index.array;
    if (kind === "kraken")
      assert.equal(chains.filter((c) => c.type === "arm").length, 8);
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      rest = new Float32Array(indices.length),
      posed = new Float32Array(p.count * 3);
    const next = (i) => i - (i % 3) + (((i % 3) + 1) % 3);
    for (let i = 0; i < indices.length; i++) {
      a.fromBufferAttribute(p, indices[i]);
      b.fromBufferAttribute(p, indices[next(i)]);
      rest[i] = a.distanceTo(b);
    }
    let maxStretch = 0;
    for (let phase = 0; phase <= 24; phase += 0.4) {
      model.userData.setKrakenGrip(phase > 8 && phase < 18 ? 1 : 0);
      model.userData.animate(phase, phase < 6 ? 0.4 : 3, { gaitPhase: phase });
      model.updateMatrixWorld(true);
      mesh.skeleton.update();
      for (let i = 0; i < p.count; i++)
        mesh.getVertexPosition(i, a).toArray(posed, i * 3);
      for (let i = 0; i < indices.length; i++) {
        if (rest[i] < 0.00001) continue;
        a.fromArray(posed, indices[i] * 3);
        b.fromArray(posed, indices[next(i)] * 3);
        maxStretch = Math.max(maxStretch, a.distanceTo(b) / rest[i]);
      }
    }
    assert.ok(maxStretch < 1.5, `Unnatural skin stretch: ${maxStretch}`);
    assert.deepEqual(model.position.toArray(), [0, 0, 0]);
    assert.deepEqual(model.quaternion.toArray(), [0, 0, 0, 1]);
  });
