import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { sageJianAsset } from "../src/sage_jian.js";

const inside = (v, c) => {
  const p = v.clone().sub(new T.Vector3(c.x, c.y, c.z));
  if (c.rotation) p.applyQuaternion(c.rotation.clone().invert());
  return ["x", "y", "z"].every((a) => Math.abs(p[a]) <= c.halfSize[a] + 0.001);
};

test("Greatsword and censer contacts follow their final surfaces; bases meet roof and terrace", () => {
  const o = createPenglaiOcean(new T.Group());
  try {
    o.root.updateMatrixWorld(true);
    const sword = o.root.getObjectByName("skybearer_sword_monument");
    assert.equal(sword.userData.height, 85);
    const part = sword.children[0],
      p = part.geometry.attributes.position;
    const contacts = o.colliders.filter((c) => c.kind === "skybearer_sword");
    assert.equal(contacts.length, 24);
    for (let i = 0; i < p.count; i++) {
      const v = new T.Vector3()
        .fromBufferAttribute(p, i)
        .applyMatrix4(part.matrixWorld);
      assert.ok(
        contacts.some((c) => inside(v, c)),
        `sword surface ${i}`,
      );
    }
    const support = o.root.getObjectByName("skybearer_ridge_support");
    const pedestal = o.root.getObjectByName("penglai_hf_sword_pedestal");
    const a = new T.Box3().setFromObject(support),
      b = new T.Box3().setFromObject(pedestal);
    assert.ok(Math.abs(a.max.y - b.min.y) < 0.01);
    assert.ok(sword.userData.baseY > b.min.y && sword.userData.baseY < b.max.y);
    const roof = o.root
      .getObjectsByProperty("name", "penglai_hf_temple_roof")
      .toSorted((a, b) => b.position.y - a.position.y)[0];
    const side = roof.material.side;
    roof.material.side = T.DoubleSide;
    const q = support.geometry.attributes.position;
    for (let i = 16; i < q.count; i++) {
      const v = new T.Vector3().fromBufferAttribute(q, i);
      const hit = new T.Raycaster(
        new T.Vector3(v.x, 400, v.z),
        new T.Vector3(0, -1, 0),
      ).intersectObject(roof)[0];
      assert.ok(hit && Math.abs(hit.point.y - v.y - 0.14) < 0.001);
    }
    roof.material.side = side;
    const censers = o.root.getObjectByName("penglai_hf_temple_censer"),
      m = new T.Matrix4();
    assert.equal(censers.count, 2);
    const cc = o.colliders.filter((c) => c.kind === "temple_censer");
    const terrace = o.colliders.find(
      (c) => c.kind === "monastery_platform" && c.x === 0 && c.z === -650,
    );
    for (let j = 0; j < 2; j++) {
      censers.getMatrixAt(j, m);
      const bb = censers.geometry.boundingBox.clone().applyMatrix4(m);
      assert.ok(Math.abs(bb.min.y - terrace.y - terrace.halfSize.y) < 0.001);
      assert.ok(
        bb.min.z >= terrace.z - terrace.halfSize.z &&
          bb.max.z <= terrace.z + terrace.halfSize.z,
      );
      const p = censers.geometry.attributes.position;
      for (let i = 0; i < p.count; i++)
        assert.ok(
          cc.some((c) =>
            inside(
              new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(m),
              c,
            ),
          ),
        );
    }
  } finally {
    o.dispose();
  }
});

test("Gate reuses temple carvings; disposing a region cannot dispose the Sage's sword kit", () => {
  const kit = sageJianAsset();
  let sharedDisposals = 0;
  const listener = () => sharedDisposals++;
  for (const r of [kit.geometry, kit.ridingGeometry, kit.material])
    r.addEventListener("dispose", listener);
  try {
    for (let i = 0; i < 2; i++) {
      const o = createPenglaiOcean(new T.Group());
      const gate = o.root.getObjectByName("penglai_dragon_gate_carved_pillars");
      const pillars = o.root.getObjectByName("penglai_hf_temple_pillar");
      assert.equal(gate.geometry, pillars.geometry);
      assert.equal(gate.material, pillars.material);
      const sword = o.root.getObjectByName("skybearer_sword_monument");
      assert.equal(sword.children[0].geometry, kit.ridingGeometry);
      assert.equal(sword.children[0].material, kit.material);
      const platform = o.root.getObjectByName("penglai_hf_sword_pedestal");
      let ownedDisposals = 0;
      platform.geometry.addEventListener("dispose", () => ownedDisposals++);
      o.dispose();
      o.dispose();
      assert.equal(ownedDisposals, 1);
      assert.equal(sharedDisposals, 0);
    }
  } finally {
    for (const r of [kit.geometry, kit.ridingGeometry, kit.material])
      r.removeEventListener("dispose", listener);
  }
});
