import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { acquireBermudaSleepingTitanAsset } from "../src/bermuda_sleeping_titan_asset.js";
import {
  acquireBermudaTitanWholeAsset,
  TITAN_WHOLE_WRIST_PITCH,
} from "../src/bermuda_titan_whole_asset.js";
import { createBermudaTitanWhole } from "../src/bermuda_titan_whole.js";

test("Whole titan derives only verified detached-prop and exact reverse-face cleanup", () => {
  const source = acquireBermudaSleepingTitanAsset(),
    whole = acquireBermudaTitanWholeAsset();
  try {
    assert.equal(source.geometry.attributes.position.count, 33719);
    assert.equal(source.geometry.index.count / 3, 29998);
    assert.equal(whole.geometry.attributes.position.count, 32265);
    assert.equal(whole.geometry.index.count / 3, 28842);
    assert.equal(whole.farGeometry.index.count / 3, 4706);
    assert.deepEqual(
      whole.metadata.reverseDuplicateCleanup.near.pairs
        .map((p) => p.removedFaces)
        .flat(),
      [14390, 18382],
    );
    for (const name of ["position", "normal", "uv", "color"]) {
      const a = source.geometry.attributes[name],
        b = whole.geometry.attributes[name];
      if (!a) continue;
      for (let i = 0; i < whole.sourceVertexIds.length; i++)
        for (let k = 0; k < a.itemSize; k++)
          assert.equal(
            b.getComponent(i, k),
            Math.fround(a.getComponent(whole.sourceVertexIds[i], k)),
            `Original ${name} changed`,
          );
    }
    for (const id of [30994, 11462, 12894, 24122, 4794, 4935])
      assert.ok(
        whole.sourceToCompact.has(id),
        `Protected real foot/jaw ${id} removed`,
      );
    assert.ok(
      !whole.sourceToCompact.has(30092),
      "Verified detached fifth-foot prop survived",
    );
    assert.equal(
      whole.geometry.attributes.skinWeight,
      whole.farGeometry.attributes.skinWeight,
    );
  } finally {
    whole.release();
    source.release();
  }
});

test("Real whole wrist preserves the head and other feet and has no reversed faces through release", () => {
  const f = createBermudaTitanWhole(new T.Group(), { inspectionOnly: true }),
    p = f.asset.geometry.attributes.position,
    index = f.asset.geometry.index,
    baseline = new Map(
      [4794, 4935, 2499, 8587].map((id) => [
        id,
        f.near.getVertexPosition(
          f.asset.sourceToCompact.get(id),
          new T.Vector3(),
        ),
      ]),
    ),
    points = Array.from({ length: p.count }, () => new T.Vector3()),
    axis = new T.Vector3(1, 0, 0);
  try {
    let worst = Infinity;
    for (const guard of [1, 0.75, 0.5, 0.25, 0]) {
      f.setGuard(guard);
      for (let i = 0; i < p.count; i++) f.near.getVertexPosition(i, points[i]);
      for (const [id, initial] of baseline)
        assert.deepEqual(
          points[f.asset.sourceToCompact.get(id)].toArray(),
          initial.toArray(),
          `Foot motion moved true head ${id}`,
        );
      for (let j = 0; j < index.count; j += 3) {
        const ids = [index.getX(j), index.getX(j + 1), index.getX(j + 2)],
          v = ids.map((i) => new T.Vector3().fromBufferAttribute(p, i)),
          normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])),
          area = normal.length();
        if (area < 1e-12) continue;
        const weight = ids.reduce((sum, i) => sum + f.asset.weights[i], 0) / 3;
        normal.applyAxisAngle(
          axis,
          TITAN_WHOLE_WRIST_PITCH * (1 - guard) * weight,
        );
        const posed = points[ids[1]]
          .clone()
          .sub(points[ids[0]])
          .cross(points[ids[2]].clone().sub(points[ids[0]]));
        assert.ok(
          normal.dot(posed) > 0,
          `Actual wrist face ${j / 3} reversed at guard ${guard}`,
        );
        worst = Math.min(worst, posed.length() / area);
      }
    }
    assert.ok(worst >= 0.16, `Actual wrist collapsed a face: ${worst}`);
    const heel = f.asset.sourceToCompact.get(24122),
      restHeel = new T.Vector3().fromBufferAttribute(p, heel);
    assert.ok(
      f.near.getVertexPosition(heel, new T.Vector3()).distanceTo(restHeel) *
        280 <
        0.001,
      "Actual planted wrist pivot drifted",
    );
  } finally {
    f.dispose();
  }
});

test("Whole mouth anchor is the true lip-aperture incenter and emits through its front plane", () => {
  const f = createBermudaTitanWhole(new T.Group(), { inspectionOnly: true });
  try {
    const a = f.asset,
      vertices = [6509, 4859, 4794].map((id) =>
        new T.Vector3().fromBufferAttribute(
          a.geometry.attributes.position,
          a.sourceToCompact.get(id),
        ),
      ),
      center = a.mouthLocal,
      distances = vertices.map((v, i) =>
        new T.Line3(v, vertices[(i + 1) % 3])
          .closestPointToPoint(center, true, new T.Vector3())
          .distanceTo(center),
      ),
      plane = new T.Plane().setFromCoplanarPoints(...vertices);
    assert.ok(Math.abs(plane.distanceToPoint(center)) < 1e-12);
    for (const d of distances)
      assert.ok(Math.abs(d - a.apertureRadius) < 1e-12);
    assert.ok(a.apertureRadius * 280 > 2.5);
    assert.ok(a.lipPlaneNormal.z < -0.99 && a.lipPlaneNormal.y < 0);
    assert.ok(
      a.mouthDirection.dot(a.lipPlaneNormal) > 0.75 &&
        a.mouthDirection.y < -0.64,
      "Actual outflow must use the measured forward/down channel below projecting teeth",
    );
    const before = f.getMouthPose();
    f.setGuard(0);
    f.setAwareness(0.95);
    f.setBreathLean(-0.035, -0.035);
    const after = f.getMouthPose();
    assert.deepEqual(
      after.position.toArray(),
      before.position.toArray(),
      "Stable real head must not expose a fake moving mouth",
    );
    assert.deepEqual(after.direction.toArray(), before.direction.toArray());
  } finally {
    f.dispose();
  }
});

test("Whole titan rejects production construction without its new verified contacts", () => {
  assert.throws(
    () => createBermudaTitanWhole(new T.Group()),
    /verified derived contact cache/,
  );
});
