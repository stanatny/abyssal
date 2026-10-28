import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { ODYSSEY_HF_LORD_DATA } from "../src/odyssey_lord_hf_asset.js";
import { decodePackedArray } from "../src/packed_array.js";

for (const kind of ["scylla", "charybdis", "karkinos"])
  test(`${kind}: actual animated surface stays continuous through attack and recovery`, () => {
    const root = createCreature(kind, 1),
      other = createCreature(kind, 1),
      { mesh } = root.userData.hfRig,
      g = mesh.geometry,
      p = g.attributes.position,
      ix = g.index.array;
    assert.equal(g, other.userData.hfRig.mesh.geometry);
    assert.notEqual(mesh.skeleton, other.userData.hfRig.mesh.skeleton);
    const rest = Array.from({ length: p.count }, (_, i) =>
      new T.Vector3().fromBufferAttribute(p, i),
    );
    const seams = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = rest[i].toArray().join(","),
        weights = [];
      for (let j = 0; j < 4; j++)
        weights.push([
          g.attributes.skinIndex.array[i * 4 + j],
          g.attributes.skinWeight.array[i * 4 + j],
        ]);
      assert.ok(Math.abs(weights.reduce((s, w) => s + w[1], 0) - 1) < 1e-5);
      if (seams.has(key))
        assert.deepEqual(
          weights,
          seams.get(key),
          "UV duplicates must deform together",
        );
      else seams.set(key, weights);
    }
    let moved = 0,
      worst = 0;
    for (let frame = 0; frame < 240; frame++) {
      const phase =
        frame < 60
          ? "hunt"
          : frame < 110
            ? "windup"
            : frame < 165
              ? "attack"
              : "recover";
      root.userData.setBossPhase?.(phase, "undertow");
      root.userData.setKarkinosCombat?.({
        phase,
        ability: "claw",
        progress: 0.5,
      });
      root.userData.animate(frame / 60, 1);
      root.updateMatrixWorld(true);
      mesh.skeleton.update();
      if (frame % 10) continue;
      const now = rest.map((_, i) =>
        mesh.getVertexPosition(i, new T.Vector3()),
      );
      for (let i = 0; i < now.length; i++) {
        assert.ok(now[i].toArray().every(Number.isFinite));
        moved = Math.max(moved, now[i].distanceTo(rest[i]));
      }
      for (let j = 0; j < ix.length; j += 3)
        for (let k = 0; k < 3; k++) {
          const a = ix[j + k],
            b = ix[j + ((k + 1) % 3)],
            d = rest[a].distanceTo(rest[b]);
          if (d > 0.002) worst = Math.max(worst, now[a].distanceTo(now[b]) / d);
        }
    }
    assert.ok(moved > 0.01, "Actual skin, not only bones, must animate");
    assert.ok(worst < 1.8, `Anatomical boundary stretches by ${worst}`);
    assert.equal(
      other.userData.hfRig.mesh.skeleton.bones.every((b) =>
        b.quaternion.equals(new T.Quaternion()),
      ),
      true,
    );
    mesh.skeleton.computeBoneTexture();
    let releases = 0;
    mesh.skeleton.boneTexture.addEventListener("dispose", () => releases++);
    root.userData.disposeLocalMotion();
    root.userData.disposeLocalMotion();
    assert.equal(releases, 1);
    assert.equal(mesh.skeleton.boneTexture, null);
    assert.equal(other.userData.hfRig.mesh.geometry, g);
    other.userData.disposeLocalMotion();
  });
test("Scylla has six separate source head surfaces and twelve animated fin-foot chains", () => {
  const a = ODYSSEY_HF_LORD_DATA.scylla,
    parts = decodePackedArray(a.headPart, Uint8Array),
    root = createCreature("scylla", 1),
    rig = root.userData.hfRig;
  for (let h = 1; h <= 6; h++)
    assert.ok(parts.filter((v) => v === h).length > 500);
  assert.equal(rig.feet.length, 12);
  for (const foot of rig.feet) {
    let supported = 0;
    for (let i = 0; i < rig.asset.geometry.attributes.skinIndex.count; i++)
      for (let j = 0; j < 4; j++)
        if (
          foot.ids.includes(
            rig.asset.geometry.attributes.skinIndex.array[i * 4 + j],
          ) &&
          rig.asset.geometry.attributes.skinWeight.array[i * 4 + j] > 0.4
        )
          supported++;
    assert.ok(supported > 30, `${foot.name} must drive a real surface`);
  }
  root.userData.disposeLocalMotion();
});
