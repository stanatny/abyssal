import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createCreature } from "../src/creatures.js";
import { readFileSync } from "node:fs";
const kinds = ["gate_dragon", "peng", "gilded_cloud_carp", "taotie"];
const posed = (r, m) => {
  r.updateMatrixWorld(true);
  m.skeleton.update();
  return Array.from({ length: m.geometry.attributes.position.count }, (_, i) =>
    m.getVertexPosition(i, new T.Vector3()),
  );
};
for (const kind of kinds) {
  test(`${kind}: shared generated surface, private skeleton and bounded resource ownership`, () => {
    const a = createCreature(kind, 1, 31),
      b = createCreature(kind, 1, 31),
      m = a.userData.hfRig.mesh,
      g = m.geometry;
    assert.equal(a.userData.artRevision, "trellis_penglai_final_20261027");
    assert.equal(g, b.userData.hfRig.mesh.geometry);
    assert.notEqual(m.skeleton, b.userData.hfRig.mesh.skeleton);
    assert.equal(m.material, b.userData.hfRig.mesh.material);
    assert.ok(
      g.index.count / 3 <= (kind === "gilded_cloud_carp" ? 13000 : 18000),
    );
    assert.ok(Math.abs(g.boundingBox.max.z - g.boundingBox.min.z - 1) < 1e-6);
    const p = g.attributes.position,
      n = g.attributes.normal,
      w = g.attributes.skinWeight,
      ids = g.attributes.skinIndex;
    for (let i = 0; i < p.count; i++) {
      assert.ok(
        Math.abs(w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i) - 1) < 1e-6,
      );
      assert.ok(
        Math.abs(new T.Vector3().fromBufferAttribute(n, i).length() - 1) <
          0.002,
      );
      for (let j = 0; j < 4; j++)
        assert.ok(ids.array[i * 4 + j] < m.skeleton.bones.length);
    }
    const head = a.userData.getHeadWorldPositions?.()[0];
    if (head)
      assert.ok(
        posed(a, m).some((p) => p.distanceTo(head) < 0.045),
        "visible muzzle must agree with bite anchor",
      );
    const before = posed(b, b.userData.hfRig.mesh);
    a.userData.animate(1, 3);
    assert.deepEqual(posed(b, b.userData.hfRig.mesh), before);
    let freed = 0;
    m.skeleton.computeBoneTexture();
    m.skeleton.boneTexture.addEventListener("dispose", () => freed++);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(freed, 1);
    assert.ok(b.userData.hfRig.mesh.geometry.attributes.position);
    b.userData.disposeLocalMotion();
  });
  test(`${kind}: the real surface moves continuously without tears, UV separation or pause drift`, () => {
    const r = createCreature(kind, 1, 31),
      { mesh, chains, bones } = r.userData.hfRig,
      g = mesh.geometry,
      rest = Array.from({ length: g.attributes.position.count }, (_, i) =>
        new T.Vector3().fromBufferAttribute(g.attributes.position, i),
      ),
      idx = g.index.array;
    const edges = [];
    for (let i = 0; i < idx.length; i += 3)
      for (let j = 0; j < 3; j++) {
        const a = idx[i + j],
          b = idx[i + ((j + 1) % 3)],
          d = rest[a].distanceTo(rest[b]);
        if (d > 0.0001) edges.push([a, b, d]);
      }
    const tipIds = chains.map((c) => {
      let id = -1,
        dist = -1;
      for (let i = 0; i < rest.length; i++) {
        let w = 0;
        for (let j = 0; j < 4; j++)
          if (c.ids.includes(g.attributes.skinIndex.array[i * 4 + j]))
            w += g.attributes.skinWeight.array[i * 4 + j];
        const d = rest[i].distanceToSquared(new T.Vector3(...c.points[0]));
        if (w > 0.6 && d > dist) {
          dist = d;
          id = i;
        }
      }
      assert.ok(id >= 0, c.name);
      return id;
    });
    const tips = tipIds.map(() => []);
    let previous;
    for (let f = 0; f < 120; f++) {
      r.userData.animate(f / 30, f < 40 ? 0.7 : f < 80 ? 3 : 0.7);
      const skin = posed(r, mesh);
      if (f % 5 === 0)
        for (const [a, b, d] of edges)
          assert.ok(
            skin[a].distanceTo(skin[b]) / d < 2.5,
            kind + " surface tear",
          );
      tipIds.forEach((id, i) => {
        tips[i].push(skin[id]);
        assert.ok(mesh.boundingSphere.containsPoint(skin[id]));
        if (previous)
          assert.ok(
            skin[id].distanceTo(previous[id]) < 0.05,
            kind + " pose jump",
          );
      });
      previous = skin;
    }
    for (const points of tips)
      assert.ok(
        new T.Box3().setFromPoints(points).getSize(new T.Vector3()).length() >
          0.001,
        "actual appendage must move",
      );
    const snapshot = bones.map((b) => ({
      q: b.quaternion.toArray(),
      p: b.position.toArray(),
      s: b.scale.toArray(),
    }));
    r.userData.animate(119 / 30, 3);
    assert.deepEqual(
      bones.map((b) => ({
        q: b.quaternion.toArray(),
        p: b.position.toArray(),
        s: b.scale.toArray(),
      })),
      snapshot,
    );
    const map = new Map();
    for (let i = 0; i < rest.length; i++) {
      const k = rest[i].toArray().join(",");
      if (map.has(k))
        assert.ok(previous[i].distanceTo(previous[map.get(k)]) < 1e-7);
      else map.set(k, i);
    }
    r.userData.disposeLocalMotion();
  });
}
test("four final Penglai atlases preserve one source chart per triangle and recorded HF provenance", () => {
  for (const kind of kinds) {
    const d = JSON.parse(
      readFileSync(
        new URL(`../src/assets/models/${kind}_hf_mesh.json`, import.meta.url),
      ),
    );
    assert.equal(d.source, "Microsoft TRELLIS.2-4B");
    assert.equal(d.textureBake.sourceSha256, d.sourceSha256);
    const dec = (s) =>
        new Uint16Array(Uint8Array.from(Buffer.from(s, "base64")).buffer),
      i = dec(d.index),
      c = dec(d.uvChart);
    for (let n = 0; n < i.length; n += 3) {
      assert.equal(c[i[n]], c[i[n + 1]]);
      assert.equal(c[i[n]], c[i[n + 2]]);
    }
  }
});

test("Taotie adds only two Penglai ground hunters, can threaten 30m, and is not an expedition lord", async () => {
  const { getRegionSpecies } = await import("../src/region_ecology.js");
  const { REGIONS } = await import("../src/expedition_config.js");
  const { canPredatorRetaliate } = await import("../src/predator_combat.js");
  const species = getRegionSpecies("penglai").find((s) => s.kind === "taotie");
  assert.equal(species.population, 2);
  assert.equal(species.length, 32);
  assert.ok(
    species.groundbound && species.predator && species.independentMovement,
  );
  assert.equal(species.spawnAnchors.length, 2);
  assert.ok(species.spawnAnchors.every((p) => p[2] <= -500));
  assert.ok(
    canPredatorRetaliate(30, species.length, species.threatCeilingLength),
  );
  for (const region of REGIONS) {
    assert.ok(!region.bossKinds.includes("taotie"));
    if (region.id !== "penglai")
      assert.ok(!getRegionSpecies(region.id).some((s) => s.kind === "taotie"));
  }
});

test("Taotie's four actual paws step, lift and plant instead of remaining attached to the belly", () => {
  const r = createCreature("taotie", 1, 31),
    { mesh, legs, bones } = r.userData.hfRig;
  const p = mesh.geometry.attributes.position;
  const feet = legs.map((c) => {
    const center = new T.Vector3(...c.points.at(-1));
    let index = 0,
      distance = Infinity;
    for (let i = 0; i < p.count; i++) {
      const d = new T.Vector3()
        .fromBufferAttribute(p, i)
        .distanceToSquared(center);
      if (d < distance) {
        distance = d;
        index = i;
      }
    }
    let owned = 0;
    for (let j = 0; j < 4; j++)
      if (
        c.ids.includes(mesh.geometry.attributes.skinIndex.array[index * 4 + j])
      )
        owned += mesh.geometry.attributes.skinWeight.array[index * 4 + j];
    assert.ok(owned > 0.95, c.name + ": paw must be owned by its leg");
    return { index, positions: [] };
  });
  for (let f = 0; f <= 180; f++) {
    r.userData.animate(f / 60, 1, {
      gaitPhase: ((f / 180) * Math.PI * 2) / 1.5,
      speed: 0.244,
      phase: "walk",
    });
    r.updateMatrixWorld(true);
    mesh.skeleton.update();
    feet.forEach((foot) =>
      foot.positions.push(mesh.getVertexPosition(foot.index, new T.Vector3())),
    );
  }
  for (const foot of feet) {
    const size = new T.Box3()
      .setFromPoints(foot.positions)
      .getSize(new T.Vector3());
    assert.ok(size.z > 0.14 && size.z < 0.16, "visible full fore/aft step");
    assert.ok(
      size.y > 0.045 && size.y < 0.055,
      "paw recovery lifts clear of stance",
    );
    assert.ok(size.x < 1e-6, "no lateral paw skating");
  }
  const snapshot = legs.map((c) =>
    c.ids.map((id) => bones[id].quaternion.toArray()),
  );
  r.userData.animate(4, 1, {
    gaitPhase: (Math.PI * 2) / 1.5,
    speed: 0,
    phase: "walk",
  });
  assert.deepEqual(
    legs.map((c) => c.ids.map((id) => bones[id].quaternion.toArray())),
    snapshot,
    "blocked travel must keep the planted stance",
  );
  r.userData.disposeLocalMotion();
});

test("Dragon head leads the axial wave and the mouth anchor follows the visible face", () => {
  const r = createCreature("gate_dragon", 1, 31),
    { mesh } = r.userData.hfRig,
    p = mesh.geometry.attributes.position;
  let index = 0,
    distance = Infinity;
  for (let i = 0; i < p.count; i++) {
    const d = new T.Vector3()
      .fromBufferAttribute(p, i)
      .distanceTo(new T.Vector3(-0.013, -0.02, -0.5));
    if (d < distance) {
      distance = d;
      index = i;
    }
  }
  const points = [];
  for (let f = 0; f < 240; f++) {
    r.userData.animate(f / 60, 1.4);
    r.updateMatrixWorld(true);
    mesh.skeleton.update();
    const point = mesh.getVertexPosition(index, new T.Vector3());
    points.push(point);
    assert.ok(
      point.distanceTo(r.userData.getHeadWorldPositions()[0]) < 0.025,
      "contact remains at the mouth",
    );
    assert.ok(mesh.boundingSphere.containsPoint(point));
  }
  const range = new T.Box3().setFromPoints(points).getSize(new T.Vector3());
  assert.ok(
    range.x > 0.065 && range.x < 0.09,
    "head no longer fixed while the body swims",
  );
  assert.ok(range.y > 0.025 && range.y < 0.04, "bounded neck lift");
  r.userData.disposeLocalMotion();
});
