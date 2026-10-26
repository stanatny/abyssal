import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createEuropaOcean } from "../src/europa_ocean.js";
import { createCreature } from "../src/creatures.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import { getExpedition } from "../src/expedition_config.js";
import {
  createLordNavigation,
  lordMoveClear,
  lordHeadingQuaternion,
} from "../src/lord_navigation.js";
import { castBodySegment } from "../src/collision.js";

test("The existing Lumen lord guards the wreck bow with a clear body-sized patrol and solid hull obstruction", () => {
  const ocean = createEuropaOcean(new T.Group());
  const region = getExpedition("europa").region;
  const species = BOSS_SPECIES.find((s) => s.kind === "lumen_stalker");
  const site = region.bossInstances.find((b) => b.kind === species.kind);
  const mesh = createCreature(species.kind, species.length, 31);
  try {
    assert.equal(region.bossInstances.length, 3);
    assert.equal(
      region.bossInstances.filter((b) => b.kind === species.kind).length,
      1,
    );
    assert.equal(species.worldNavigation, true);
    const entry = {
      mesh,
      state: { species },
      home: new T.Vector3(...site.home),
      radius: site.radius,
      maxCenterY: site.maxCenterY,
    };
    entry.navigation = createLordNavigation(mesh, species);
    const blocked = (a, b, r) =>
      !!castBodySegment(a, b, { colliders: ocean.colliders, radius: r });
    assert.ok(entry.navigation.probes.length >= 3);
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const p = entry.home
        .clone()
        .add(
          new T.Vector3(
            Math.sin(a) * 30.4,
            Math.sin(a * 0.75) * 2.4,
            Math.cos(a) * 38,
          ),
        );
      const q = lordHeadingQuaternion(
        new T.Quaternion(),
        new T.Vector3(Math.cos(a), 0, -Math.sin(a)),
        true,
      );
      assert.ok(
        lordMoveClear(entry, p, p, q, ocean.heightAt, blocked, q),
        `patrol ${i}`,
      );
    }
    const root = ocean.researchWreck.root;
    const approach = root.localToWorld(new T.Vector3(0, 21, -98.4));
    assert.ok(approach.distanceTo(entry.home) < site.radius);
    const hull = root.localToWorld(new T.Vector3(-31, 21, -78));
    assert.equal(
      lordMoveClear(
        entry,
        hull,
        hull,
        root.quaternion,
        ocean.heightAt,
        blocked,
        root.quaternion,
      ),
      false,
    );
    // 门外能接战，进入错位舱室后隔墙能切断领主技能视线。
    const inner = root.localToWorld(new T.Vector3(0, 21, -37.2));
    assert.ok(blocked(approach, inner, 0.05));
  } finally {
    mesh.userData.disposeLocalMotion?.();
    ocean.dispose();
  }
});
