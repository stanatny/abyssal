import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildPolyphemusHF,
  POLYPHEMUS_HF_DATA,
} from "../src/polyphemus_hf_asset.js";
import { preparedCreatureExterior } from "../src/creature_interior.js";
import { creatureGeometryKey } from "../src/creature_interior_key.js";
import topology from "../src/assets/models/creature_interior_topology.json" with { type: "json" };

function create() {
  const root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  return { root, animate: motions[0], ...root.userData.hfRig };
}
function pose(f, time, target) {
  const phase = time < 3 ? "windup" : time < 5 ? "attack" : "recover";
  const progress =
    phase === "windup"
      ? time / 3
      : phase === "attack"
        ? (time - 3) / 2
        : (time - 5) / 4.5;
  f.root.userData.setPolyphemusCombat({ phase, ability: "boulder", progress });
  if (target) f.root.userData.setPolyphemusTarget(target);
  f.animate(time);
  f.root.updateMatrixWorld(true);
  f.mesh.skeleton.update();
}
const world = (node) => node.getWorldPosition(new T.Vector3());

test("Throw loads the torso, counterbalances with the other arm, then follows through before settling", () => {
  const f = create(),
    rest = new T.Vector3(...POLYPHEMUS_HF_DATA.rig.anchors.rightPalm);
  pose(f, 0);
  const leftRest = world(f.root.userData.palmAnchors[1]);
  pose(f, 2.3);
  const loadedYaw = f.bones[2].rotation.y + f.bones[3].rotation.y;
  assert.ok(loadedYaw > 0.06);
  assert.ok(world(f.root.userData.palmAnchors[1]).distanceTo(leftRest) > 0.04);
  pose(f, 3.84);
  assert.equal(f.root.userData.throwReleaseProgress, 0.42);
  assert.equal(
    f.root.userData.throwAnchor.parent,
    f.root.userData.rightPalmAnchor,
  );
  pose(f, 4.4);
  assert.ok(f.bones[2].rotation.y + f.bones[3].rotation.y < -0.08);
  pose(f, 5);
  assert.ok(
    world(f.root.userData.rightPalmAnchor).distanceTo(rest) > 0.16,
    "hand must retain release momentum into recovery",
  );
  pose(f, 7);
  const settling = world(f.root.userData.rightPalmAnchor).distanceTo(rest);
  assert.ok(settling > 0.015 && settling < 0.16);
  pose(f, 9.5);
  assert.ok(world(f.root.userData.rightPalmAnchor).distanceTo(rest) < 0.003);
  f.root.userData.disposeLocalMotion();
});

test("Actual skin survives every throw phase while tracking the four extreme gaze directions", () => {
  for (const target of [
    [1, 1, -1],
    [-1, 1, -1],
    [1, -1, -1],
    [-1, -1, -1],
  ]) {
    const f = create(),
      g = f.mesh.geometry,
      p = g.attributes.position;
    const rest = Array.from({ length: p.count }, (_, i) =>
      new T.Vector3().fromBufferAttribute(p, i),
    );
    let worst = 0;
    for (let frame = 0; frame <= 570; frame++) {
      pose(f, frame / 60, new T.Vector3(...target));
      for (const id of [0, 1, 14, 15, 16, 17, 18, 19, 20, 21])
        assert.ok(f.bones[id].quaternion.equals(new T.Quaternion()));
      if (frame % 10 !== 0 && frame !== 230 && frame !== 264) continue;
      const now = rest.map((_, i) =>
        f.mesh.getVertexPosition(i, new T.Vector3()),
      );
      for (let i = 0; i < rest.length; i++) {
        assert.ok(now[i].toArray().every(Number.isFinite));
        if (rest[i].y < -0.3) assert.ok(now[i].distanceTo(rest[i]) < 1e-6);
      }
      for (let j = 0; j < g.index.count; j += 3)
        for (let q = 0; q < 3; q++) {
          const a = g.index.array[j + q],
            b = g.index.array[j + ((q + 1) % 3)],
            length = rest[a].distanceTo(rest[b]);
          if (length > 0.002)
            worst = Math.max(worst, now[a].distanceTo(now[b]) / length);
        }
    }
    assert.ok(worst < 2, `Skin stretch ${worst} for target ${target}`);
    assert.deepEqual(f.root.position.toArray(), [0, 0, 0]);
    f.root.userData.disposeLocalMotion();
  }
});

test("Gaze carries the actual eye and jaw together; pause and interrupted recovery remain continuous", () => {
  const f = create(),
    g = f.mesh.geometry,
    eye = new T.Vector3(...POLYPHEMUS_HF_DATA.rig.anchors.eye),
    mouth = new T.Vector3(...POLYPHEMUS_HF_DATA.rig.anchors.mouth);
  const closest = (anchor) => {
    let best = 0,
      distance = Infinity;
    for (let i = 0; i < g.attributes.position.count; i++) {
      const d = new T.Vector3()
        .fromBufferAttribute(g.attributes.position, i)
        .distanceToSquared(anchor);
      if (d < distance) {
        best = i;
        distance = d;
      }
    }
    return best;
  };
  const eyeVertex = closest(eye),
    mouthVertex = closest(mouth);
  for (let k = 0; k <= 180; k++) pose(f, k / 60, new T.Vector3(0.8, 0.8, -1));
  assert.ok(
    f.bones[5].rotation.y < -0.12,
    "head follows target instead of rotating only its crown",
  );
  for (const vertex of [eyeVertex, mouthVertex]) {
    const rest = new T.Vector3().fromBufferAttribute(
        g.attributes.position,
        vertex,
      ),
      expected = rest
        .clone()
        .applyMatrix4(f.mesh.bindMatrix)
        .applyMatrix4(f.mesh.skeleton.boneInverses[5])
        .applyMatrix4(f.bones[5].matrixWorld)
        .applyMatrix4(f.mesh.bindMatrixInverse);
    assert.ok(
      f.mesh.getVertexPosition(vertex, new T.Vector3()).distanceTo(expected) <
        1e-6,
      "face skin must follow its real head anchor",
    );
  }
  const frozen = f.bones.map((b) => b.quaternion.toArray());
  f.animate(3);
  assert.deepEqual(
    f.bones.map((b) => b.quaternion.toArray()),
    frozen,
  );
  const hand = world(f.root.userData.rightPalmAnchor);
  f.root.userData.setPolyphemusCombat({ phase: "return", progress: 0 });
  f.animate(3 + 1 / 60);
  f.root.updateMatrixWorld(true);
  assert.ok(
    world(f.root.userData.rightPalmAnchor).distanceTo(hand) < 0.01,
    "cancelled windup must ease down rather than snap",
  );
  for (let i = 2; i <= 40; i++) f.animate(3 + i / 60);
  f.root.updateMatrixWorld(true);
  assert.ok(
    world(f.root.userData.rightPalmAnchor).distanceTo(
      new T.Vector3(...POLYPHEMUS_HF_DATA.rig.anchors.rightPalm),
    ) < 0.005,
  );
  f.root.userData.disposeLocalMotion();
});

test("Prepared interior keeps its topology and copies the repaired live skin weights for the moving giant", () => {
  const f = create(),
    source = f.mesh.geometry,
    key = creatureGeometryKey(source),
    record = topology[key];
  assert.ok(record?.nearest);
  const nearest = new Uint16Array(
    Uint8Array.from(atob(record.nearest), (c) => c.charCodeAt(0)).buffer,
  );
  const exterior = preparedCreatureExterior(source);
  assert.ok(exterior);
  for (const name of ["skinIndex", "skinWeight"])
    for (let i = 0; i < nearest.length; i++)
      for (let q = 0; q < 4; q++)
        assert.equal(
          exterior.attributes[name].array[i * 4 + q],
          source.attributes[name].array[nearest[i] * 4 + q],
        );
  const proxy = new T.SkinnedMesh(exterior, f.mesh.material);
  proxy.bind(f.mesh.skeleton, f.mesh.bindMatrix);
  f.mesh.parent.add(proxy);
  for (const time of [0, 2.3, 3.84, 4.4, 5, 7, 9.5]) {
    pose(f, time, new T.Vector3(-1, -1, -1));
    for (let i = 0; i < exterior.attributes.position.count; i++)
      assert.ok(
        proxy
          .getVertexPosition(i, new T.Vector3())
          .toArray()
          .every(Number.isFinite),
      );
  }
  exterior.dispose();
  f.root.userData.disposeLocalMotion();
});
