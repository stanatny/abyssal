import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  NAVAL_MINEFIELD_POPULATION,
  NAVAL_MINES_PER_FIELD,
  getNavalMinefields,
  navalMinefieldSlot,
} from "../src/naval_minefields.js";
import { REGIONS } from "../src/expedition_config.js";
import { createOcean, seabedHeight } from "../src/ocean.js";
import { createAtlantisOcean } from "../src/atlantis_ocean.js";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { isPositionBlocked } from "../src/collision.js";
import { isNursery } from "../src/nursery_rules.js";
import { resolveAtlantisKeySites } from "../src/atlantis_key_sites.js";
import { createLightLayout } from "../src/atlantis_light_rules.js";
import { createMuralLayout, MURAL_RULES } from "../src/atlantis_mural_rules.js";

const point = (p) => new THREE.Vector3(p.x, p.y, p.z);
const slots = (region) =>
  Array.from({ length: NAVAL_MINEFIELD_POPULATION }, (_, i) =>
    navalMinefieldSlot(region, i),
  );

test("Only existing mine-enabled seas receive bounded immutable fields and independent slots", () => {
  assert.equal(NAVAL_MINEFIELD_POPULATION, 48);
  assert.equal(NAVAL_MINES_PER_FIELD, 12);
  for (const region of REGIONS) {
    const enabled = region.humanActivity?.mines !== false;
    assert.equal(getNavalMinefields(region.id).length, enabled ? 4 : 0);
    assert.equal(navalMinefieldSlot(region.id, 0) !== null, enabled);
  }
  for (const id of ["", "unknown", "__proto__", "constructor", undefined]) {
    assert.deepEqual(getNavalMinefields(id), []);
    assert.equal(navalMinefieldSlot(id, 0), null);
  }
  for (const index of [-1, 0.5, NaN, Infinity, 48, 100])
    assert.equal(navalMinefieldSlot("hawaii", index), null);
  const original = navalMinefieldSlot("hawaii", 0);
  navalMinefieldSlot("hawaii", 0).x = 1000;
  assert.deepEqual(navalMinefieldSlot("hawaii", 0), original);
  assert.throws(() => (getNavalMinefields("hawaii")[0].center[0] = 1000));
});

test("Each field occupies an irregular three-dimensional volume instead of a flat or tilted sheet", () => {
  for (const region of ["hawaii", "atlantis", "bermuda"]) {
    const positions = slots(region).map(point);
    for (let field = 0; field < 4; field++) {
      const cloud = positions.slice(
          field * NAVAL_MINES_PER_FIELD,
          (field + 1) * NAVAL_MINES_PER_FIELD,
        ),
        bounds = new THREE.Box3().setFromPoints(cloud),
        size = bounds.getSize(new THREE.Vector3()),
        label = `${region}/${field}`;
      assert.ok(size.x >= 30, `${label} horizontal span ${size.x}`);
      assert.ok(size.y >= 40, `${label} vertical span ${size.y}`);
      assert.ok(size.z >= 24, `${label} longitudinal span ${size.z}`);
      for (const axis of ["x", "y", "z"])
        assert.ok(
          new Set(cloud.map((p) => p[axis])).size >= 6,
          `${label} must not form a few repeated ${axis} layers`,
        );
      assert.ok(
        normalizedVolume(cloud, size) > 0.2,
        `${label} must contain substantial noncoplanar volume`,
      );
    }
  }
});

// 用最大四面体占包围盒体积的比例排除倾斜平片，避免只检查Y跨度误判。
function normalizedVolume(cloud, size) {
  let largest = 0;
  const a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3(),
    cross = new THREE.Vector3();
  for (let i = 0; i < cloud.length - 3; i++)
    for (let j = i + 1; j < cloud.length - 2; j++)
      for (let k = j + 1; k < cloud.length - 1; k++)
        for (let l = k + 1; l < cloud.length; l++) {
          a.subVectors(cloud[j], cloud[i]);
          b.subVectors(cloud[k], cloud[i]);
          c.subVectors(cloud[l], cloud[i]);
          largest = Math.max(
            largest,
            Math.abs(cross.crossVectors(a, b).dot(c)),
          );
        }
  return largest / (size.x * size.y * size.z);
}

const fixtures = {
  hawaii: {
    create: createOcean,
    bypass: [
      [0, -165],
      [0, -290],
      [0, -420],
      [0, -555],
    ],
  },
  atlantis: {
    create: createAtlantisOcean,
    bypass: [
      [0, -160],
      [0, -235],
      [0, -390],
      [0, -460],
    ],
  },
  bermuda: {
    create: createBermudaOcean,
    bypass: [
      [0, -145],
      [0, -270],
      [-240, -360],
      [-240, -415],
    ],
  },
};

for (const [region, fixture] of Object.entries(fixtures))
  test(`${region}: 48 real mine positions clear final terrain and solids, retain spacing and a 60m local bypass`, (t) => {
    const ocean = fixture.create(new THREE.Group()),
      ground =
        ocean.contactSurface ??
        createTerrainSurface(ocean.root, {
          fallback: ocean.heightAt ?? seabedHeight,
        }),
      positions = slots(region).map(point);
    t.after(() => {
      if (!ocean.contactSurface) ground.dispose();
      ocean.dispose();
    });
    ocean.root.updateMatrixWorld(true);
    let minFloor = Infinity,
      minSpacing = Infinity;
    for (const [i, p] of positions.entries()) {
      assert.equal(isNursery(p), false);
      assert.equal(
        isPositionBlocked(p, { radius: 3, colliders: ocean.colliders }),
        false,
        `mine ${i} remains in open water`,
      );
      minFloor = Math.min(minFloor, p.y - ground(p.x, p.z));
      for (let j = 0; j < i; j++)
        minSpacing = Math.min(minSpacing, p.distanceTo(positions[j]));
    }
    assert.ok(minFloor > 5, `mine floor margin ${minFloor}`);
    assert.ok(minSpacing >= 12, `minimum center separation ${minSpacing}`);
    const fields = getNavalMinefields(region);
    fields.forEach((field, index) => {
      const [x, y] = fixture.bypass[index];
      for (let dz = -50; dz <= 50; dz += 5) {
        const p = new THREE.Vector3(x, y, field.center[2] + dz);
        assert.equal(
          isPositionBlocked(p, { radius: 30, colliders: ocean.colliders }),
          false,
          `${field.id} retains a diameter-60 local bypass`,
        );
        for (let a = 0; a < 16; a++) {
          const xx = p.x + Math.cos((a * Math.PI) / 8) * 30,
            zz = p.z + Math.sin((a * Math.PI) / 8) * 30;
          assert.ok(p.y - 30 > ground(xx, zz), field.id);
        }
        for (const mine of positions)
          assert.ok(mine.distanceTo(p) > 33, field.id);
      }
    });
    if (region === "hawaii" || region === "atlantis")
      assert.ok(
        positions.some((p) => Math.abs(p.x) < 70),
        "one field edge is visible within 70m of the central descent",
      );
    if (region === "atlantis") assertObjectiveClearance(ocean, positions);
    t.diagnostic(`minimum mine spacing ${minSpacing}; floor gap ${minFloor}`);
  });

function assertObjectiveClearance(ocean, positions) {
  const nearestPoint = (q) =>
      Math.min(...positions.map((m) => q.distanceTo(m))),
    closest = new THREE.Vector3();
  // 全部藏点的实际可往返路线保留；不把水雷塞进任务入口附近。
  for (const site of resolveAtlantisKeySites(ocean.city.underways.records))
    for (let i = 1; i < site.route.length; i++) {
      const segment = new THREE.Line3(
        point(site.route[i - 1]),
        point(site.route[i]),
      );
      for (const mine of positions) {
        segment.closestPointToPoint(mine, true, closest);
        assert.ok(closest.distanceTo(mine) > 60, site.id);
      }
    }
  for (const q of ocean.waterwheel.controls)
    assert.ok(nearestPoint(q) > 60, "waterwheel contact remains clear");
  for (let route = 0; route < 3; route++) {
    const light = createLightLayout(
      route,
      ocean.city.poseidon.target.toArray(),
    );
    for (const q of [
      light.source,
      ...light.mirrors.map((m) => m.point),
      light.target,
    ])
      assert.ok(nearestPoint(q) > 60, `light route ${route}`);
    for (const gate of createMuralLayout(route)) {
      const half = new THREE.Vector3(
          MURAL_RULES.halfWidth,
          MURAL_RULES.halfHeight,
          10,
        ),
        box = new THREE.Box3(
          gate.point.clone().sub(half),
          gate.point.clone().add(half),
        );
      for (const mine of positions)
        assert.ok(box.distanceToPoint(mine) > 60, `mural route ${route}`);
    }
  }
}
