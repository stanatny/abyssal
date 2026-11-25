import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import {
  buildPolyphemusHF,
  POLYPHEMUS_HF_DATA,
} from "../src/polyphemus_hf_asset.js";
import { createPolyphemusTurn } from "../src/polyphemus_turn.js";
import {
  POLYPHEMUS_EYE_FIT,
  polyphemusEyeFrame,
  polyphemusEyeTarget,
  findPolyphemusEyeContact,
  polyphemusEyeImpact,
} from "../src/polyphemus_weakpoint.js";

function fixture(t) {
  const root = new T.Group(),
    motions = [];
  buildPolyphemusHF(root, motions);
  root.position.set(-430, -355, -950);
  root.scale.setScalar(90);
  root.updateMatrixWorld(true);
  const turn = createPolyphemusTurn(root),
    { mesh, bones } = root.userData.hfRig;
  t.after(() => {
    turn.dispose();
    root.userData.disposeLocalMotion();
  });
  return { root, mesh, bones, turn, animate: motions[0] };
}
function nearestVertex(f, local) {
  const p = f.mesh.geometry.attributes.position,
    v = new T.Vector3();
  let best = 0,
    d = Infinity;
  for (let i = 0; i < p.count; i++) {
    const distance = v.fromBufferAttribute(p, i).distanceToSquared(local);
    if (distance < d) {
      best = i;
      d = distance;
    }
  }
  return f.mesh
    .getVertexPosition(best, new T.Vector3())
    .applyMatrix4(f.mesh.matrixWorld);
}
function frontContact(f, distance = 2, radius = 2.25) {
  const frame = polyphemusEyeFrame(f.root),
    mouth = frame.center.clone().addScaledVector(frame.normal, distance);
  return {
    frame,
    mouth,
    contact: findPolyphemusEyeContact(f.root, mouth, radius),
  };
}

test("The fitted weakpoint is a small real outer-eye triangle patch, not the head or an anchor sphere", (t) => {
  const f = fixture(t),
    { frame, mouth, contact } = frontContact(f);
  assert.equal(frame.radiusX, 2.25);
  assert.equal(frame.radiusY, 2.16);
  assert.equal(POLYPHEMUS_EYE_FIT.impactTolerance, 0.28);
  assert.ok(contact);
  assert.ok(
    contact.distanceTo(frame.center) < 1e-6,
    "The fitted centre is the actual outer eye skin",
  );
  const ray = new T.Raycaster(
    mouth,
    frame.center.clone().sub(mouth).normalize(),
    0,
    3,
  );
  const first = ray.intersectObject(f.mesh)[0];
  assert.ok(
    first?.point.distanceTo(contact) < 1e-6,
    "Melee contact must coincide with the first visible HF surface",
  );
  assert.ok(polyphemusEyeImpact(f.root, first.point, { origin: mouth }));
  // 相反朝向的内层在外眼皮后0.002087标准高度处；普通小球会误收穿头命中。
  const inner = f.root.localToWorld(
    new T.Vector3(0, 0.335, -0.2124259738007156),
  );
  assert.equal(polyphemusEyeImpact(f.root, inner), false);
  assert.equal(
    findPolyphemusEyeContact(
      f.root,
      frame.center.clone().addScaledVector(frame.normal, -0.2),
      2.25,
    ),
    null,
  );
  assert.equal(
    polyphemusEyeImpact(f.root, contact, {
      origin: frame.center.clone().addScaledVector(frame.normal, -20),
    }),
    false,
  );
  assert.equal(
    polyphemusEyeImpact(f.root, contact, { origin: mouth, tolerance: 14 }),
    false,
    "Blast size cannot become a direct-impact tolerance",
  );
});

test("Real chest, palm, calf, chin, brow and rear-head impacts stay armored and cover blocks the exposed eye", (t) => {
  const f = fixture(t),
    { frame, mouth, contact } = frontContact(f);
  for (const rest of [
    [0, 0.05, -0.2],
    [-0.425, -0.05, -0.168],
    [-0.22, -0.493, -0.05],
    [0, 0.23, -0.22],
    [0, 0.4, -0.18],
    [0, 0.335, 0.2],
  ]) {
    const actual = nearestVertex(f, new T.Vector3(...rest));
    assert.equal(
      polyphemusEyeImpact(f.root, actual),
      false,
      `Actual body skin ${rest}`,
    );
  }
  const tooFar = mouth.clone().addScaledVector(frame.normal, 1);
  assert.equal(findPolyphemusEyeContact(f.root, tooFar, 2.25), null);
  let checks = 0;
  assert.equal(
    findPolyphemusEyeContact(f.root, mouth, 2.25, {
      blocked: (from, to) => {
        checks++;
        assert.ok(from.equals(mouth));
        assert.ok(to.distanceTo(frame.center) < 3);
        return true;
      },
    }),
    null,
  );
  assert.ok(checks > 0);
  assert.equal(
    polyphemusEyeImpact(f.root, contact, {
      origin: mouth,
      blocked: () => true,
    }),
    false,
  );
  const frontBlast = frame.center.clone().addScaledVector(frame.normal, 10);
  assert.ok(
    findPolyphemusEyeContact(f.root, frontBlast, 14),
    "An actual clear blast sphere can reach the real eye",
  );
  assert.equal(
    findPolyphemusEyeContact(
      f.root,
      frame.center.clone().addScaledVector(frame.normal, -10),
      14,
    ),
    null,
    "A blast behind the skull cannot pass through it",
  );
  assert.equal(
    findPolyphemusEyeContact(
      f.root,
      frame.center.clone().addScaledVector(frame.normal, 20),
      14,
    ),
    null,
  );
});

test("Turning, gaze and the complete accepted throw carry eye contact with the actual posed skin and never advance it during a paused query", (t) => {
  const f = fixture(t),
    target = new T.Vector3(-930, -280, -950),
    rest = POLYPHEMUS_HF_DATA.rig.bones[5].point;
  const poses = [
    ["hunt", 0],
    ["windup", 0.8],
    ["attack", 0.42],
    ["recover", 0],
    ["recover", 0.5],
    ["recover", 1],
  ];
  for (let k = 0; k < poses.length; k++) {
    const [phase, progress] = poses[k];
    for (let i = 0; i < 25; i++)
      f.turn.update(1 / 60, target, { phase: "hunt" });
    f.root.userData.setPolyphemusTarget(target);
    f.root.userData.setPolyphemusCombat({
      phase,
      ability: "boulder",
      progress,
    });
    f.animate(k + 0.25);
    f.turn.applyPose();
    const { frame, mouth, contact } = frontContact(f);
    assert.ok(contact, `Posed real eye in ${phase}/${progress}`);
    const expected = new T.Vector3(...POLYPHEMUS_EYE_FIT.center).sub(
      new T.Vector3(...rest),
    );
    f.bones[5].localToWorld(expected);
    assert.ok(expected.distanceTo(frame.center) < 1e-6);
    const directRay = new T.Raycaster(
        mouth,
        contact.clone().sub(mouth).normalize(),
        0,
        3,
      ),
      first = directRay.intersectObject(f.mesh)[0];
    assert.ok(
      first?.point.distanceTo(contact) < 1e-5,
      "The new target must remain on the actual moving outer eye skin",
    );
    assert.ok(polyphemusEyeImpact(f.root, contact, { origin: mouth }));
    const frozen = f.bones.map((b) => b.quaternion.toArray()),
      rootQ = f.root.quaternion.toArray(),
      eye = polyphemusEyeTarget(f.root).clone();
    for (let i = 0; i < 10; i++) {
      assert.ok(polyphemusEyeTarget(f.root).equals(eye));
      assert.ok(findPolyphemusEyeContact(f.root, mouth, 2.25));
    }
    assert.deepEqual(
      f.bones.map((b) => b.quaternion.toArray()),
      frozen,
    );
    assert.deepEqual(f.root.quaternion.toArray(), rootQ);
  }
});

test("Weakpoint queries fail closed on malformed input and retain independent actor targets without editing geometry or resources", (t) => {
  const f = fixture(t),
    second = fixture(t),
    g = f.mesh.geometry;
  const before = {
    position: Array.from(g.attributes.position.array),
    index: Array.from(g.index.array),
    skin: Array.from(g.attributes.skinWeight.array),
  };
  const first = polyphemusEyeTarget(f.root).clone();
  second.root.position.x += 500;
  assert.ok(polyphemusEyeTarget(second.root).distanceTo(first) > 499);
  assert.ok(polyphemusEyeTarget(f.root).equals(first));
  assert.equal(polyphemusEyeTarget(new T.Group()), null);
  assert.equal(
    findPolyphemusEyeContact(f.root, new T.Vector3(NaN, 0, 0), 2.25),
    null,
  );
  for (const radius of [-1, NaN, Infinity])
    assert.equal(findPolyphemusEyeContact(f.root, first, radius), null);
  f.root.visible = false;
  assert.equal(polyphemusEyeImpact(f.root, first), false);
  f.root.visible = true;
  assert.deepEqual(Array.from(g.attributes.position.array), before.position);
  assert.deepEqual(Array.from(g.index.array), before.index);
  assert.deepEqual(Array.from(g.attributes.skinWeight.array), before.skin);
});
