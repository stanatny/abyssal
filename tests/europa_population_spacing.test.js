import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { getRegionSpecies } from "../src/region_ecology.js";
import { createEuropaOcean } from "../src/europa_ocean.js";
import { europaSeabedHeight } from "../src/europa_config.js";
import {
  habitatPosition,
  initialSpeciesAnchor,
  initialSchoolAnchor,
  schoolHabitat,
  schoolPopulationGroups,
  schoolSlot,
} from "../src/ecosystem_population.js";
import { createCreature } from "../src/creatures.js";

const kinds = [
  "brine_rosette",
  "hinge_walker",
  "lantern_pod",
  "veil_glider",
  "forkjaw_stalker",
  "prism_hunter",
  "crown_filterer",
  "bell_carrier",
  "siphon_colossus",
  "spiral_grazer",
];

test("Europa crowded birth homes and school slots retain all inhabitants without overlapping at terrain-valid positions", () => {
  const ocean = createEuropaOcean(new THREE.Group());
  try {
    for (const species of getRegionSpecies("europa").filter((s) =>
      kinds.includes(s.kind),
    )) {
      const occupied = [];
      const place = (habitat, anchor, populationIndex) => {
        const point = habitatPosition(habitat, {
          heightAt: europaSeabedHeight,
          colliders: ocean.colliders,
          anchor,
          populationIndex,
          occupied,
        });
        assert.ok(
          point,
          `${species.kind} ${populationIndex}: space must remain in its habitat`,
        );
        assert.ok(point.y <= -habitat.depthMin && point.y >= -habitat.depthMax);
        for (const other of occupied)
          assert.ok(
            point.distanceTo(other) >= species.populationSpacing - 1e-8,
            species.kind,
          );
        if (species.benthic) {
          assert.ok(
            Math.abs(
              point.y -
                europaSeabedHeight(point.x, point.z) -
                species.floorOffset,
            ) < 1e-8,
          );
          const home = initialSpeciesAnchor(species, populationIndex);
          assert.ok(
            Math.hypot(point.x - home.x, point.z - home.z) <=
              species.residentRadius + 1e-8,
          );
        }
        occupied.push(point);
        return point;
      };
      if (species.schoolSize > 1) {
        for (const group of schoolPopulationGroups(species)) {
          const habitat = schoolHabitat(species, group.index);
          const center = habitatPosition(habitat, {
            heightAt: europaSeabedHeight,
            colliders: ocean.colliders,
            anchor: initialSchoolAnchor(species, group.index),
          });
          assert.ok(center);
          for (let i = 0; i < group.count; i++)
            place(
              habitat,
              center.clone().add(schoolSlot(species, i)),
              group.start + i,
            );
        }
      } else
        for (let i = 0; i < species.population; i++)
          place(species, initialSpeciesAnchor(species, i), i);
      assert.equal(occupied.length, species.population);
    }
  } finally {
    ocean.dispose();
  }
});

test("Occupied homes find alternatives; a full legal habitat returns null instead of violating clearance, and unconfigured populations retain placement", () => {
  const species = {
    ...getRegionSpecies("europa").find((s) => s.kind === "brine_rosette"),
    residentRadius: 0.5,
    spawnAnchors: [[0, -20, 0]],
    floorOffset: 0.2,
  };
  const context = {
    heightAt: () => -20,
    occupied: [new THREE.Vector3(0, -19.8, 0)],
  };
  assert.equal(habitatPosition(species, context), null);
  const free = habitatPosition({ ...species, residentRadius: 8 }, context);
  assert.ok(
    free && free.distanceTo(context.occupied[0]) >= species.populationSpacing,
  );
  const unchanged = habitatPosition(
    { ...species, populationSpacing: undefined },
    context,
  );
  assert.deepEqual(unchanged.toArray(), [0, -19.8, 0]);
});

test("Configured birth clearance encloses actual independently deformed HF bodies, including Glider wings", () => {
  const point = new THREE.Vector3();
  for (const species of getRegionSpecies("europa").filter((s) =>
    kinds.includes(s.kind),
  )) {
    const model = createCreature(species.kind, species.length, 73);
    let radius = 0;
    try {
      for (let frame = 0; frame < 16; frame++) {
        model.userData.animate(frame * 0.37, frame % 2 ? 1.4 : 0.7);
        model.updateMatrixWorld(true);
        model.traverse((mesh) => {
          if (!mesh.isSkinnedMesh) return;
          mesh.skeleton.update();
          for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
            mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
            radius = Math.max(radius, point.length());
          }
        });
      }
      assert.ok(
        radius * 2 < species.populationSpacing,
        `${species.kind} posed diameter ${radius * 2} / clearance ${species.populationSpacing}`,
      );
    } finally {
      model.userData.disposeLocalMotion?.();
    }
  }
});

test("A swimming resident searches free depth when neighbours fill its home plane", () => {
  const species = {
    ...getRegionSpecies("europa").find((s) => s.kind === "crown_filterer"),
    spawnAnchors: [[0, -260, -360]],
    residentRadius: 18,
    depthMin: 230,
    depthMax: 290,
  };
  const occupied = [
    [0, 0],
    [15, 0],
    [-15, 0],
    [0, 15],
    [0, -15],
  ].map(([x, z]) => new THREE.Vector3(x, -260, -360 + z));
  const point = habitatPosition(species, { heightAt: () => -320, occupied });
  assert.ok(point);
  assert.ok(Math.abs(point.y + 260) > 10);
  assert.ok(point.distanceTo(new THREE.Vector3(0, -260, -360)) <= 18);
  assert.ok(
    occupied.every((p) => p.distanceTo(point) >= species.populationSpacing),
  );
});
