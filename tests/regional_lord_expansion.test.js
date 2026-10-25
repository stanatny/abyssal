import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createCreature } from "../src/creatures.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import { createAmazonOcean } from "../src/amazon_ocean.js";
import { getExpedition } from "../src/expedition_config.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { updateLordBody } from "../src/lord_body.js";
import { isPositionBlocked } from "../src/collision.js";
import { getCreatureBackground } from "../src/creature_backgrounds.js";
import { creatureGuideSkills } from "../src/creature_guide_skills.js";
import { t } from "../src/i18n.js";

const additions = [
  ["europa", "brine_regent", createEuropaOcean],
  ["amazon", "thunderbarbel", createAmazonOcean],
];
for (const [region, kind, makeOcean] of additions) {
  test(`${kind}: fits a distinct populated-map habitat, with a solid visible core and bilingual Guide`, (ctx) => {
    const ocean = makeOcean(new THREE.Scene());
    ctx.after(() => ocean.dispose());
    const config = getExpedition(region).region;
    const site = config.bossInstances.find((b) => b.kind === kind),
      species = BOSS_SPECIES.find((s) => s.kind === kind);
    assert.equal(config.bossInstances.length, 3);
    assert.ok(
      Math.hypot(
        site.home[0] - config.spawn[0],
        site.home[2] - config.spawn[2],
      ) > 300,
    );
    const mesh = createCreature(kind, species.length);
    ctx.after(() => mesh.userData.disposeLocalMotion?.());
    mesh.position.fromArray(site.home);
    for (const yaw of [0, Math.PI * 0.5, Math.PI]) {
      mesh.rotation.y = yaw;
      for (const c of updateLordBody(mesh))
        for (const x of [-0.8, 0, 0.8])
          for (const y of [-0.8, 0, 0.8])
            for (const z of [-0.8, 0, 0.8]) {
              if (x * x + y * y + z * z > 1) continue;
              const p = new THREE.Vector3(
                x * c.axes.x,
                y * c.axes.y,
                z * c.axes.z,
              )
                .applyQuaternion(c.rotation)
                .add(new THREE.Vector3(c.x, c.y, c.z));
              assert.ok(
                p.y > ocean.heightAt(p.x, p.z) + 0.4,
                `${kind}: core penetrates floor`,
              );
              assert.equal(
                isPositionBlocked(p, {
                  colliders: ocean.colliders,
                  radius: 0.3,
                }),
                false,
                `${kind}: core overlaps scenery at ${p.toArray()}`,
              );
            }
    }
    const background = getCreatureBackground(kind),
      skills = creatureGuideSkills(species);
    assert.ok(background?.background && skills.length);
    for (const text of [
      species.label,
      background.background,
      ...skills.flatMap((s) => [s.name, s.description, s.counter]),
    ].filter(Boolean))
      assert.doesNotMatch(t(text, [], "en"), /[\u3400-\u9fff]/u);
  });
  test(`${kind}: independent posed anatomy stays finite, bounded and pause-stable`, () => {
    const a = createCreature(kind, 1, 21),
      b = createCreature(kind, 1, 21);
    const pose = (m) => {
      m.updateMatrixWorld(true);
      const p = [];
      m.traverse((n) => {
        if (n.isMesh) {
          p.push(...n.matrixWorld.elements);
          if (n.isSkinnedMesh) {
            const v = new THREE.Vector3();
            n.getVertexPosition(
              Math.floor(n.geometry.attributes.position.count * 0.82),
              v,
            );
            p.push(...v);
          }
        }
      });
      return p;
    };
    a.userData.animate(0);
    b.userData.animate(0);
    const baseline = pose(b),
      initial = pose(a);
    a.userData.setBossPhase("windup");
    for (let frame = 1; frame <= 120; frame++)
      a.userData.animate(frame / 60, 1.5);
    const moved = pose(a);
    assert.notDeepEqual(moved, initial);
    assert.deepEqual(pose(b), baseline);
    a.userData.animate(2, 1.5);
    assert.deepEqual(pose(a), moved);
    let meshes = 0,
      triangles = 0;
    a.traverse((n) => {
      if (n.isMesh) {
        meshes++;
        triangles +=
          (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
        assert.ok(n.geometry.attributes.position.array.every(Number.isFinite));
      }
    });
    assert.ok(meshes < 35 && triangles < 40000);
    if (kind === "brine_regent") {
      let sensors = 0;
      a.traverse((n) => {
        if (n.name === "embedded_amber_sensor") sensors++;
      });
      assert.equal(
        sensors,
        2,
        "Both nested sensors must survive static batching",
      );
    }
    const glowName =
      kind === "brine_regent"
        ? "embedded_amber_sensor"
        : "barbel_conductive_seam";
    const glowA =
      a.userData.hfRig?.charged ?? a.getObjectByName(glowName).material;
    const glowB =
      b.userData.hfRig?.charged ?? b.getObjectByName(glowName).material;
    assert.notEqual(glowA, glowB, "Charge brightness belongs to each instance");
    assert.ok(glowA.emissiveIntensity > glowB.emissiveIntensity);
    let disposed = 0,
      skeletons = 0;
    glowA.addEventListener("dispose", () => disposed++);
    a.traverse((n) => {
      if (!n.isSkinnedMesh) return;
      skeletons++;
      n.skeleton.computeBoneTexture();
      n.skeleton.boneTexture.addEventListener("dispose", () => disposed++);
    });
    assert.equal(skeletons, kind === "thunderbarbel" ? 1 : 0);
    a.userData.disposeLocalMotion();
    a.userData.disposeLocalMotion();
    assert.equal(
      disposed,
      skeletons + 1,
      "Owned GPU resources release exactly once",
    );
    b.userData.disposeLocalMotion();
  });
}
