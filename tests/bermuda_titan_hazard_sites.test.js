import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaTitanHazardSites } from "../src/bermuda_titan_hazard_sites.js";
import { createBermudaTitanHazards } from "../src/bermuda_titan_hazards.js";
import { createBermudaTitanState } from "../src/bermuda_titan_rules.js";

function fixture() {
  const shell = new T.Mesh(
    new T.PlaneGeometry(500, 500),
    new T.MeshBasicMaterial({ side: T.DoubleSide }),
  );
  shell.rotation.x = -Math.PI / 2;
  shell.position.y = 80;
  const mouth = new T.Vector3(0, 0, 0),
    direction = new T.Vector3(1, 0, 0),
    wall = {
      id: "off_centre_landing_rock",
      type: "box",
      x: 30,
      y: -37.5,
      z: 8,
      halfSize: new T.Vector3(2, 3.5, 2),
    },
    cave = {
      shell,
      portals: [],
      contains: () => true,
      interiorAt: () => new T.Vector3(30, -35, 0),
    },
    sites = createBermudaTitanHazardSites({
      cave,
      heightAt: () => -40,
      colliders: [wall],
      mouth,
      direction,
    });
  shell.geometry.dispose();
  shell.material.dispose();
  return { sites, mouth, direction };
}

test("An off-centre landing obstruction excludes lava without deleting its real roof-rock site", () => {
  const { sites } = fixture(),
    original = sites.find((s) => s.impact.x === 30 && s.impact.z === 0);
  assert.ok(original, "point clearance alone would admit this original site");
  assert.equal(original.lavaEligible, false);
  assert.equal(original.roof.y, 80);
  assert.ok(sites.some((s) => s.lavaEligible));
  assert.ok(
    sites.some((s) => s.lavaEligible && s.impact.x <= 44),
    "real close and middle landings accompany the far cave grid",
  );
});

test("Seeded lava selection skips ineligible footprints while retaining full sheets and the original attempt budget", () => {
  const { sites, mouth, direction } = fixture();
  for (const seed of [1, 7, 23, 81]) {
    const controller = createBermudaTitanHazards({ sites, seed }),
      state = createBermudaTitanState();
    state.phase = "charging";
    state.phaseDuration = 2.5;
    state.remaining = 1;
    controller.step(0, { state, mouth, direction });
    const lava = controller.snapshot.lava;
    assert.equal(lava.warningSheets.length, 1);
    const sheet = lava.warningSheets[0];
    assert.equal(sites.find((s) => s.id === sheet.siteId).lavaEligible, true);
    assert.equal(sheet.cells.length, 140);
    assert.equal(sheet.tetrahedra.length, 840);
    assert.ok(lava.validation.candidates <= 8);
    assert.ok(lava.validation.attempts <= 48);
  }
});

test("A lava-ineligible roof remains eligible for an ordinary warned falling rock", () => {
  const { sites, mouth, direction } = fixture(),
    site = sites.find((s) => s.lavaEligible === false),
    controller = createBermudaTitanHazards({ sites: [site] }),
    state = createBermudaTitanState();
  controller.step(8, { state, mouth, direction });
  assert.equal(controller.snapshot.lava.warningSheets.length, 0);
  assert.equal(controller.snapshot.rocks.length, 1);
  assert.equal(controller.snapshot.rocks[0].phase, "warning");
  assert.deepEqual(controller.snapshot.rocks[0].warningPoint, site.impact);
});
