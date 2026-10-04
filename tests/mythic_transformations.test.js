import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { registerHooks } from "node:module";
import {
  prepareMythicTransformations,
  restoreMythicForm,
  stepMythicTransformation,
} from "../src/mythic_transformations.js";
import { PENGLAI_SPECIES } from "../src/penglai_species.js";
import {
  PENGLAI_TRANSFORMATION_FORMS,
  DRAGON_GATE,
} from "../src/penglai_transformation_species.js";
import { createCreature } from "../src/creatures.js";
import { getRegionSpecies } from "../src/region_ecology.js";
import { canPredatorRetaliate } from "../src/predator_combat.js";
import { getCreatureBackground } from "../src/creature_backgrounds.js";
import { t } from "../src/i18n.js";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { castSegment } from "../src/collision.js";
const hooks = registerHooks({
  load(url, context, next) {
    if (url.endsWith(".css"))
      return { format: "module", source: "", shortCircuit: true };
    return next(url, context);
  },
});
const { buildOceanCatalog, filterOceanCatalog } = await import(
  "../src/ocean_guide.js"
);
hooks.deregister();
const specimen = (kind, index = 0) => {
  const species = PENGLAI_SPECIES.find((s) => s.kind === kind),
    mesh = createCreature(kind, species.length, 17);
  mesh.position.fromArray(species.spawnAnchors?.[0] || [0, 0, 0]);
  return {
    species,
    mesh,
    populationIndex: index,
    seed: 17,
    velocity: new THREE.Vector3(),
    hiddenFor: 0,
    chase: 0,
  };
};
function finishRise(e, context = {}) {
  const p = e.mesh.position.clone().add(new THREE.Vector3(40, 5, 30));
  e.transformation.wait = 0;
  for (let i = 0; i < 360 && e.transformation.phase !== "formed"; i++)
    stepMythicTransformation(e, 1 / 60, p, context);
  assert.equal(e.transformation.phase, "formed");
  return p;
}

test("forms have bilingual individual Guide records but no extra regional spawning", () => {
  for (const s of PENGLAI_TRANSFORMATION_FORMS) {
    assert.ok(!getRegionSpecies("penglai").some((x) => x.kind === s.kind));
    assert.ok(
      filterOceanCatalog(buildOceanCatalog(), { regionId: "penglai" }).some(
        (x) => x.kind === s.kind,
      ),
    );
    for (const id of [
      "hawaii",
      "atlantis",
      "bermuda",
      "mariana",
      "amazon",
      "europa",
    ])
      assert.ok(
        !filterOceanCatalog(buildOceanCatalog(), { regionId: id }).some(
          (x) => x.kind === s.kind,
        ),
      );
    for (const copy of [
      s.label,
      s.description,
      s.ability,
      s.counter,
      getCreatureBackground(s.kind).background,
    ])
      assert.ok(!/[\u3400-\u9fff]/u.test(t(copy, [], "en")), s.kind);
  }
});
test("only two existing carp and four existing Kun receive bounded alternate models", () => {
  const entities = [
    ...Array.from({ length: 4 }, (_, i) => specimen("dragon_carp", i)),
    ...Array.from({ length: 5 }, (_, i) => specimen("kun", i)),
  ];
  prepareMythicTransformations(entities);
  assert.equal(entities.filter((e) => e.transformation).length, 6);
  assert.equal(entities.length, 9);
  const models = entities.map((e) => e.transformation?.alternate);
  prepareMythicTransformations(entities);
  assert.deepEqual(
    entities.map((e) => e.transformation?.alternate),
    models,
  );
});
test("leap, full transformation and return keep entity identity, anatomy scale and base habitat", () => {
  for (const kind of ["dragon_carp", "kun"]) {
    const e = specimen(kind);
    prepareMythicTransformations([e]);
    const root = e.mesh,
      s = e.transformation,
      scale = s.scales[0].clone();
    finishRise(e);
    assert.equal(e.species.kind, s.rule.form);
    assert.equal(e.mesh, root);
    assert.equal(e.mesh.scale.x, e.species.length);
    assert.ok(s.children.every((c) => !c.visible));
    assert.ok(s.alternate.visible);
    stepMythicTransformation(
      e,
      s.rule.hold + 1,
      e.mesh.position.clone().addScalar(200),
    );
    stepMythicTransformation(
      e,
      s.rule.reveal + 1,
      e.mesh.position.clone().addScalar(200),
    );
    assert.equal(e.species.kind, kind);
    assert.equal(s.phase, "idle");
    assert.deepEqual(s.children[0].scale, scale);
    assert.equal(s.alternate.visible, false);
    assert.equal(e.mesh.scale.x, s.sourceSpecies.length);
  }
});
test("hidden, offscreen and pursuing creatures do not trigger a leap; interruption never teleports through solids", () => {
  const e = specimen("dragon_carp");
  prepareMythicTransformations([e]);
  e.transformation.wait = 0;
  stepMythicTransformation(e, 1, new THREE.Vector3(1000, 1000, 1000));
  assert.equal(e.transformation.phase, "idle");
  e.hiddenFor = 3;
  stepMythicTransformation(e, 1, e.mesh.position);
  assert.equal(e.transformation.phase, "idle");
  e.hiddenFor = 0;
  e.chase = 4;
  stepMythicTransformation(e, 1, e.mesh.position);
  assert.equal(e.transformation.phase, "idle");
  e.chase = 0;
  const position = e.mesh.position.clone();
  stepMythicTransformation(e, 1, e.mesh.position, { blocked: () => true });
  assert.deepEqual(e.mesh.position, position);
  assert.equal(e.transformation.phase, "idle");
});
test("home reset and repeated reinitialization never accumulate alternate model children or retain hunter form", () => {
  const e = specimen("kun");
  prepareMythicTransformations([e]);
  const root = e.mesh,
    count = root.children.length;
  for (let n = 0; n < 5; n++) {
    finishRise(e);
    restoreMythicForm(e);
    e.species = e.transformation.sourceSpecies;
    prepareMythicTransformations([e]);
    assert.equal(e.species.kind, "kun");
    assert.equal(root.children.length, count);
    assert.equal(e.chase, 0);
  }
});
test("cloud dragon cannot retaliate at or above 25m, independently of the shared 5m margin", () => {
  assert.ok(canPredatorRetaliate(24.999, 24, 25));
  assert.equal(canPredatorRetaliate(25, 24, 25), false);
  assert.equal(canPredatorRetaliate(30, 24, 25), false);
  assert.ok(canPredatorRetaliate(25, 24));
});
test("new forms use distinct attached anatomy, immutable geometry and bounded ordinary-creature costs", () => {
  for (const kind of ["kun", "peng", "gate_dragon"]) {
    const a = createCreature(kind, 10, 4),
      b = createCreature(kind, 10, 4),
      box = new THREE.Box3().setFromObject(a, true);
    assert.ok(Math.abs(box.getSize(new THREE.Vector3()).z - 10) < 0.001, kind);
    let tris = 0,
      draws = 0;
    const arrays = [];
    a.traverse((n) => {
      if (n.isMesh) {
        draws++;
        tris +=
          (n.geometry.index?.count || n.geometry.attributes.position.count) / 3;
        arrays.push([n.geometry, n.geometry.attributes.position.array.slice()]);
      }
    });
    assert.ok(tris < 90000, `${kind} ${tris}`);
    assert.ok(draws < 70, `${kind} ${draws}`);
    const independent = new THREE.Box3().setFromObject(b, true);
    for (let time = 0; time < 12; time += 0.2) {
      a.userData.animate(time, 3);
      a.updateMatrixWorld(true);
      a.traverse((n) =>
        assert.ok(n.matrixWorld.elements.every(Number.isFinite)),
      );
    }
    assert.deepEqual(new THREE.Box3().setFromObject(b, true), independent);
    for (const [geometry, positions] of arrays)
      assert.deepEqual(geometry.attributes.position.array, positions);
  }
});
test("both real Dragon Gate paths fit between actual pillars without crossing terrain or structures", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    for (const i of [0, 1]) {
      const e = specimen("dragon_carp", i);
      prepareMythicTransformations([e]);
      const context = {
        heightAt: ocean.heightAt,
        blocked: (a, b, radius) => !!castSegment(a, b, ocean.colliders, radius),
      };
      finishRise(e, context);
      assert.ok(e.mesh.position.z < DRAGON_GATE.z);
    }
  } finally {
    ocean.dispose();
  }
});
