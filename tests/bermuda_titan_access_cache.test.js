import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import * as T from "three";
import cache from "../src/assets/models/bermuda_titan_whole_contacts.json" with { type: "json" };
import binding from "../src/assets/models/bermuda_titan_whole_binding.json" with { type: "json" };
import {
  acquireBermudaTitanWholeAsset,
  TITAN_WHOLE_WRIST_PIVOT,
  TITAN_WHOLE_WRIST_PITCH,
  TITAN_WHOLE_MAX_MOTION,
} from "../src/bermuda_titan_whole_asset.js";
import { createBermudaTitanWhole } from "../src/bermuda_titan_whole.js";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const arraySHA = (a) => sha(Buffer.from(a.buffer, a.byteOffset, a.byteLength));

test("Access cache proves the actual binding and entire supported wrist arc without changing rest skin", () => {
  const asset = acquireBermudaTitanWholeAsset();
  try {
    for (const [path, expected] of Object.entries(cache.header.sourceHashes))
      assert.equal(
        sha(readFileSync(new URL("../" + path, import.meta.url))),
        expected,
        path,
      );
    assert.deepEqual(cache.header.thetaRange, [0, TITAN_WHOLE_WRIST_PITCH]);
    const p = asset.geometry.attributes.position,
      skin = asset.geometry.attributes.skinWeight,
      pivot = new T.Vector3(...TITAN_WHOLE_WRIST_PIVOT),
      records = Array.from({ length: p.count }, (_, i) => {
        const v = new T.Vector3().fromBufferAttribute(p, i);
        return {
          c: v
            .clone()
            .multiplyScalar(skin.getX(i))
            .addScaledVector(pivot, skin.getY(i)),
          d: v.clone().sub(pivot).multiplyScalar(skin.getY(i)),
        };
      });
    assert.equal(arraySHA(p.array), cache.header.meshSHA.position);
    assert.equal(
      arraySHA(asset.geometry.index.array),
      cache.header.meshSHA.index,
    );
    assert.equal(arraySHA(skin.array), cache.header.meshSHA.skinWeights);
    const area = new Float64Array(cache.faces.length),
      fine = new Set(cache.header.candidateLocalRefinement.parents),
      axis = new T.Vector3(1, 0, 0);
    for (const row of cache.patches) {
      const face = cache.faces[row[0]],
        bary = [row.slice(1, 4), row.slice(4, 7), row.slice(7, 10)],
        moving = face.indices.some((i) => skin.getY(i) !== 0),
        limit = fine.has(row[0]) ? 0.25 : moving ? 1.6 : 2.6,
        points = bary.map((b) => {
          assert.equal(
            b.reduce((a, v) => a + v, 0),
            1,
          );
          assert.ok(b.every((v) => v >= 0 && v <= 1));
          const c = new T.Vector3(),
            d = new T.Vector3();
          for (let i = 0; i < 3; i++) {
            c.addScaledVector(records[face.indices[i]].c, b[i]);
            d.addScaledVector(records[face.indices[i]].d, b[i]);
          }
          return { c, d };
        });
      const [a, b, c] = bary,
        signed = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      assert.ok(signed > 0);
      area[row[0]] += signed;
      for (const [i, j] of [
        [0, 1],
        [1, 2],
        [2, 0],
      ]) {
        const C = points[i].c.clone().sub(points[j].c),
          D = points[i].d.clone().sub(points[j].d),
          A = C.y * D.y + C.z * D.z,
          B = C.z * D.y - C.y * D.z,
          phases = [0, TITAN_WHOLE_WRIST_PITCH];
        let stationary = Math.atan2(B, A);
        if (stationary < 0) stationary += Math.PI * 2;
        if (stationary > 0 && stationary < TITAN_WHOLE_WRIST_PITCH)
          phases.push(stationary);
        for (const theta of phases)
          assert.ok(
            D.clone().applyAxisAngle(axis, theta).add(C).length() * 280 <=
              limit + 1e-8,
          );
      }
    }
    for (const parentArea of area)
      assert.equal(parentArea, 1, "Every complete parent remains covered");
  } finally {
    asset.release();
  }
});

test("One thin wrist seam is conditioned by source-edge projection and release stays within render/contact bounds", () => {
  const correction = binding.metadata.accessSeamConditioning;
  assert.deepEqual(correction.raw, [12527, 12554, 12553]);
  assert.deepEqual(correction.changed, [12554]);
  assert.ok(correction.chosen.relativeAltitude < 0.021);
  const expected = T.MathUtils.lerp(
    binding.weights[12553],
    binding.weights[12527],
    correction.chosen.t,
  );
  assert.equal(binding.weights[12554], expected);
  const actor = createBermudaTitanWhole(new T.Group(), {
    inspectionOnly: true,
  });
  try {
    const p = actor.asset.geometry.attributes.position,
      rest = Array.from({ length: p.count }, (_, i) =>
        actor.near.getVertexPosition(i, new T.Vector3()),
      );
    for (const guard of [0.75, 0.5, 0.25, 0]) {
      actor.setGuard(guard);
      for (let i = 0; i < p.count; i++)
        assert.ok(
          actor.near.getVertexPosition(i, new T.Vector3()).distanceTo(rest[i]) <
            TITAN_WHOLE_MAX_MOTION,
        );
    }
  } finally {
    actor.dispose();
  }
});
