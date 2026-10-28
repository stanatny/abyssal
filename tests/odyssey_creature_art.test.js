import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  ODYSSEY_CREATURE_KINDS,
  buildOdysseyCreature,
} from "../src/creature_odyssey.js";
import {
  tentacleChunkBounds,
  disposeTentacleMotion,
} from "../src/tentacle_motion.js";
function build(kind) {
  const root = new THREE.Group(),
    motions = [];
  buildOdysseyCreature(kind, root, motions);
  root.updateMatrixWorld(true);
  return { root, motions };
}
function pose({ root, motions }, t, e = 1) {
  for (const m of motions) m(t, e);
  root.updateMatrixWorld(true);
  root.traverse((p) => {
    if (p.isSkinnedMesh) p.skeleton.update();
  });
}
function meshes(root) {
  const out = [];
  root.traverse((p) => {
    if (p.isMesh) out.push(p);
  });
  return out;
}
const expected = [
  "ambrosia_sprat",
  "moon_scallop",
  "lyre_ray",
  "pearl_seahorse",
  "nereid",
  "hippocampus",
  "triton_guard",
  "siren_eel",
  "naga_huntress",
  "ketos",
  "bronze_turtle",
  "abyss_lamprey",
  "oracle_whale",
  "ceto_serpent",
  "scylla",
  "charybdis",
  "karkinos",
  "golden_argonaut",
  "iris_cuttlefish",
  "amphora_hermit",
  "aegean_jelly",
  "silver_pipefish",
  "aegis_sturgeon",
  "thalassa_manta",
  "cerulean_hound",
];
test("Odyssean factory covers twenty-one ordinary kinds, three new lords and the exclusive rare", () => {
  assert.deepEqual([...ODYSSEY_CREATURE_KINDS], expected);
  assert.throws(() => build("shark"), /Unknown Odyssean creature/);
});
for (const kind of expected)
  test(`${kind}: attached finite shared anatomy, unit length and independent motion`, () => {
    const a = build(kind),
      b = build(kind),
      am = meshes(a.root),
      bm = meshes(b.root);
    const box = new THREE.Box3().setFromObject(
        a.root.userData.visualWeapon ? a.root.userData.hfRig.mesh : a.root,
      ),
      size = box.getSize(new THREE.Vector3());
    assert.ok(
      Math.abs(size[a.root.userData.lengthAxis || "z"] - 1) < 1e-5,
      `${kind} longitudinal length ${size.z}`,
    );
    assert.ok(size.x > 0.01 && size.y > 0.01);
    assert.equal(
      a.root.userData.mouthAnchors.length,
      kind === "scylla" ? 6 : 1,
    );
    assert.deepEqual(
      am.map((p) => p.geometry),
      bm.map((p) => p.geometry),
    );
    const rootTransform = a.root.matrix.clone();
    let triangles = 0;
    for (const m of am) {
      triangles +=
        (m.geometry.index?.count || m.geometry.attributes.position.count) / 3;
      assert.ok(
        [...m.geometry.attributes.position.array].every(Number.isFinite),
      );
      assert.ok([...m.geometry.attributes.normal.array].every(Number.isFinite));
    }
    assert.ok(triangles < 115000, `${kind} model budget ${triangles}`);
    const skin = am.find((m) => m.isSkinnedMesh),
      secondSkin = bm.find((m) => m.isSkinnedMesh);
    // HF 索引顺序不代表解剖位置：选择实际尾端／后足，避免抽到不应摆动的躯干。
    const sampleIndex =
      skin && a.root.userData.hfRig
        ? Array.from(
            { length: skin.geometry.attributes.position.count },
            (_, i) => i,
          ).reduce(
            (best, i) =>
              skin.geometry.attributes.position[
                kind === "moon_scallop"
                  ? "getY"
                  : [
                        "amphora_hermit",
                        "iris_cuttlefish",
                        "thalassa_manta",
                        "bronze_turtle",
                      ].includes(kind)
                    ? "getX"
                    : "getZ"
              ](i) *
                (kind === "golden_argonaut" ? -1 : 1) >
              skin.geometry.attributes.position[
                kind === "moon_scallop"
                  ? "getY"
                  : [
                        "amphora_hermit",
                        "iris_cuttlefish",
                        "thalassa_manta",
                        "bronze_turtle",
                      ].includes(kind)
                    ? "getX"
                    : "getZ"
              ](best) *
                (kind === "golden_argonaut" ? -1 : 1)
                ? i
                : best,
            0,
          )
        : Math.floor((skin?.geometry.attributes.position.count || 0) * 0.92);
    const initial = skin?.getVertexPosition(sampleIndex, new THREE.Vector3());
    const second = secondSkin?.getVertexPosition(
      sampleIndex,
      new THREE.Vector3(),
    );
    let moved = 0;
    for (let frame = 0; frame <= 240; frame++) {
      pose(a, frame / 20, frame < 120 ? 1 : 3);
      if (frame % 20 === 0) {
        for (const mouth of a.root.userData.mouthAnchors)
          assert.ok(
            mouth
              .getWorldPosition(new THREE.Vector3())
              .toArray()
              .every(Number.isFinite),
          );
        if (skin) {
          const v = skin.getVertexPosition(sampleIndex, new THREE.Vector3());
          moved = Math.max(moved, v.distanceTo(initial));
          const world = v.clone().applyMatrix4(skin.matrixWorld),
            vertexIndex = sampleIndex,
            indexOffset = skin.geometry.index
              ? skin.geometry.index.array.indexOf(vertexIndex)
              : vertexIndex,
            chunk = skin.userData.tentacleChunks?.find(
              (c) => indexOffset >= c.start && indexOffset < c.end,
            );
          if (chunk)
            assert.ok(
              tentacleChunkBounds(skin, chunk, new THREE.Box3()).containsPoint(
                world,
              ),
            );
        }
      }
    }
    assert.deepEqual(a.root.matrix.elements, rootTransform.elements);
    if (skin) {
      assert.ok(moved > 0.001, "Actual deformed surface must move");
      assert.notEqual(skin.skeleton, secondSkin.skeleton);
      assert.deepEqual(
        secondSkin.getVertexPosition(sampleIndex, new THREE.Vector3()),
        second,
      );
    }
    const frozen = am.map((m) => m.matrixWorld.clone());
    pose(a, 12, 3);
    assert.deepEqual(
      am.map((m) => m.matrixWorld.elements),
      frozen.map((m) => m.elements),
    );
    disposeTentacleMotion(a.root);
    disposeTentacleMotion(b.root);
  });
test("Six Scylla mouths are attached to independently curved neck ends", () => {
  const s = build("scylla"),
    { heads, bones } = s.root.userData.hfRig;
  assert.equal(heads.length, 6);
  for (let i = 0; i < 6; i++) {
    const mouth = s.root.userData.mouthAnchors[i];
    assert.ok(mouth.name.includes(`head${i}`));
    assert.equal(mouth.parent, bones[heads[i].ids.at(-1)]);
  }
  pose(s, 3);
  assert.equal(new Set(s.root.userData.mouthAnchors).size, 6);
});
test("Charybdis has a deep physical mouth cavity rather than a painted aperture", () => {
  const c = build("charybdis");
  assert.equal(c.root.userData.anatomy.arms, 0);
  assert.equal(c.root.userData.combatAnchor, c.root.userData.mouthAnchors[0]);
  const ray = new THREE.Raycaster();
  const depth = (x) => {
    ray.set(new THREE.Vector3(x, 0, -1), new THREE.Vector3(0, 0, 1));
    return ray.intersectObject(c.root, true)[0]?.point.z;
  };
  const center = depth(0),
    left = depth(-0.2),
    right = depth(0.2);
  assert.ok([center, left, right].every(Number.isFinite));
  assert.ok(
    center - left > 0.2 && center - right > 0.2,
    "Central mouth surface must lie behind both physical rims",
  );
});
test("Upright Pearl Seahorse keeps a bounded observation height", () => {
  const s = build("pearl_seahorse"),
    size = new THREE.Box3().setFromObject(s.root).getSize(new THREE.Vector3());
  assert.ok(size.y < 1.35);
});

test("Karkinos eight real soles follow the sloping reef through heading and gait changes", async () => {
  const { odysseySeabedHeight } = await import("../src/odyssey_config.js");
  const { root, motions } = build("karkinos");
  root.scale.setScalar(52);
  assert.equal(root.userData.karkinosFootAnchors.length, 8);
  const beforeGeometry = meshes(root).map((m) => m.geometry);
  for (const heading of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    root.rotation.y = heading;
    for (let frame = 0; frame <= 120; frame++) {
      const z = -405 - frame * 0.015;
      root.position.set(120, odysseySeabedHeight(120, z) + 16, z);
      pose({ root, motions }, frame / 30, 1.2);
      const lift = root.userData.fitKarkinosTerrain(odysseySeabedHeight);
      if (lift > 0) {
        root.position.y += lift;
        root.userData.fitKarkinosTerrain(odysseySeabedHeight);
      }
      for (const sole of root.userData.karkinosFootAnchors) {
        const p = sole.getWorldPosition(new THREE.Vector3());
        assert.ok(
          p.y >= odysseySeabedHeight(p.x, p.z),
          `buried foot at ${p.toArray()}`,
        );
      }
      assert.ok(root.userData.karkinosGrounding.maxFitError < 0.06);
      assert.ok(root.userData.karkinosGrounding.terrainTilt <= 0.520001);
    }
  }
  assert.deepEqual(
    meshes(root).map((m) => m.geometry),
    beforeGeometry,
  );
});
