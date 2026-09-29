import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { GEOMETRIES } from "../src/atlantis_art_geometry.js";
import {
  ATLANTIS_CITY_BOUNDS,
  ATLANTIS_DISTRICTS,
  atlantisDistrict,
  cityCoverage,
  cityLots,
} from "../src/atlantis_city_plan.js";
import { seabedHeight } from "../src/ocean.js";
import { WORLD } from "../src/world_config.js";
import { getExpedition } from "../src/expedition_config.js";
import {
  castSegment,
  isPositionBlocked,
  bodyRadius,
  resolveMotion,
} from "../src/collision.js";

const scene = new THREE.Scene();
const city = createAtlantisCity(scene, { heightAt: seabedHeight });
scene.updateMatrixWorld(true);
const forward = { x: 0, y: 0, z: -1 };
const grownBody = {
  colliders: city.colliders,
  length: 30,
  radius: bodyRadius(30),
  forward,
};
const buildings = city.buildings.filter(
  (building) =>
    !["column", "amphora", "obelisk", "pearl"].includes(building.kind),
);

test("Actual paved districts cover at least two thirds of the horizontal sea without overlapping tiles", () => {
  const tiles = city.root.children.filter(
    (mesh) => mesh.name === "city_paved_district",
  );
  assert.ok(tiles.length >= 20);
  const boxes = tiles.map((tile) => {
    tile.geometry.computeBoundingBox();
    return tile.geometry.boundingBox;
  });
  let area = 0;
  for (const [index, box] of boxes.entries()) {
    area += (box.max.x - box.min.x) * (box.max.z - box.min.z);
    assert.ok(box.min.x >= WORLD.minX && box.max.x <= WORLD.maxX);
    assert.ok(box.min.z >= WORLD.minZ && box.max.z <= WORLD.maxZ);
    for (const other of boxes.slice(index + 1)) {
      const overlapX =
        Math.min(box.max.x, other.max.x) - Math.max(box.min.x, other.min.x);
      const overlapZ =
        Math.min(box.max.z, other.max.z) - Math.max(box.min.z, other.min.z);
      assert.ok(
        overlapX <= 0.001 || overlapZ <= 0.001,
        "Paved tiles must not double-count map coverage",
      );
    }
  }
  const ratio = area / ((WORLD.maxX - WORLD.minX) * (WORLD.maxZ - WORLD.minZ));
  assert.ok(ratio >= 2 / 3 && ratio < 0.8);
  assert.ok(Math.abs(ratio - cityCoverage()) < 1e-6);
  assert.equal(city.stats.coverage, cityCoverage());
  assert.deepEqual(city.stats.bounds, ATLANTIS_CITY_BOUNDS);
  assert.equal(
    city.root.children.some((mesh) => mesh.name.startsWith("atlantis_cliff_")),
    false,
    "No old internal cliff should hide the expanded city",
  );
});

test("Every district contains real architecture across both sides, not only an expanded boundary", () => {
  assert.equal(ATLANTIS_DISTRICTS.length, 5);
  assert.equal(city.stats.buildings, buildings.length);
  assert.ok(buildings.length >= 180);
  assert.ok(cityLots().length >= 95);
  for (const district of ATLANTIS_DISTRICTS) {
    const members = buildings.filter(
      (building) =>
        atlantisDistrict(building.x, building.z)?.id === district.id,
    );
    assert.ok(members.length >= 24, `${district.id} needs inhabited streets`);
    assert.ok(
      Math.min(...members.map((building) => building.x)) < -220,
      district.id,
    );
    assert.ok(
      Math.max(...members.map((building) => building.x)) > 220,
      district.id,
    );
    assert.ok(
      Math.max(...members.map((building) => building.z)) -
        Math.min(...members.map((building) => building.z)) >
        130,
      district.id,
    );
    assert.ok(
      new Set(members.map((building) => building.kind)).size >= 3,
      `${district.id} architectural variety`,
    );
  }
  for (const kind of [
    "temple",
    "gateway",
    "tower",
    "rotunda",
    "stoa",
    "courtyard",
    "villa",
    "ruins",
  ])
    assert.ok(
      buildings.some((building) => building.kind === kind),
      kind,
    );
});

test("Paved surfaces and substantial foundations follow the real seabed without floating supports", () => {
  for (const mesh of city.root.children.filter(
    (entry) => entry.name === "city_paved_district",
  )) {
    const position = mesh.geometry.attributes.position;
    for (let index = 0; index < position.count; index++) {
      assert.ok(
        Math.abs(
          position.getY(index) -
            seabedHeight(position.getX(index), position.getZ(index)) -
            0.22,
        ) < 0.001,
      );
    }
  }
  const foundations = city.colliders.filter(
    (entry) => entry.kind === "city_foundation",
  );
  assert.ok(foundations.length >= buildings.length);
  for (const foundation of foundations) {
    const bottom = foundation.y - foundation.halfSize.y;
    const top = foundation.y + foundation.halfSize.y;
    for (const u of [-1, -0.5, 0, 0.5, 1]) {
      for (const v of [-1, -0.5, 0, 0.5, 1]) {
        const floor = seabedHeight(
          foundation.x + u * foundation.halfSize.x,
          foundation.z + v * foundation.halfSize.z,
        );
        assert.ok(
          bottom <= floor + 0.001,
          `Floating support at ${foundation.x}, ${foundation.z}`,
        );
        assert.ok(
          top >= floor - 0.01,
          `Foundation top below floor at ${foundation.x}, ${foundation.z}`,
        );
      }
    }
    const hit = castSegment(
      { x: foundation.x, y: top + 1, z: foundation.z },
      { x: foundation.x, y: bottom - 1, z: foundation.z },
      [foundation],
    );
    assert.ok(hit && Math.abs(hit.point.y - top) < 0.001);
  }
});

test("All four gateways admit a 30 m body while their side masonry blocks continuous crossings", () => {
  const gates = city.buildings.filter((entry) => entry.kind === "gateway");
  assert.equal(gates.length, 4);
  for (const gate of gates) {
    const y = gate.y + gate.height * 0.5;
    const start = { x: 0, y, z: gate.z + 15 };
    const end = { x: 0, y, z: gate.z - 15 };
    assert.equal(
      isPositionBlocked(start, grownBody),
      false,
      `${gate.z} approach begins clear`,
    );
    assert.equal(
      isPositionBlocked(end, grownBody),
      false,
      `${gate.z} exit ends clear`,
    );
    const opening = resolveMotion(start, end, grownBody);
    assert.equal(opening.blocked, false, `${gate.z} opening`);
    assert.ok(Math.abs(opening.position.z - end.z) < 0.001);
    const scale = gate.width / 62;
    const pillar = resolveMotion(
      { x: 0, y, z: gate.z },
      { x: 25 * scale, y, z: gate.z },
      { colliders: city.colliders, radius: bodyRadius(3) },
    );
    assert.equal(pillar.blocked, true, `${gate.z} solid side`);
    assert.equal(pillar.stuck, false);
    assert.ok(pillar.position.x < 20 * scale);
  }
});

test("The 30 m approach avenue and Kraken battle volume remain genuinely open", () => {
  const gates = city.buildings.filter((entry) => entry.kind === "gateway");
  // 主街顺坡，城门前抬高到真实台基以上；不把埋进门基的定高路径误判为通道。
  let previous;
  for (let z = -125; z >= -805; z -= 4) {
    const y = Math.max(
      seabedHeight(0, z) + 25,
      ...gates.map(
        (gate) =>
          gate.y +
          gate.height * 0.5 -
          Math.max(0, Math.abs(z - gate.z) - 20) * 1.8,
      ),
    );
    const point = { x: 0, y, z };
    assert.equal(isPositionBlocked(point, grownBody), false, `Avenue at ${z}`);
    if (previous)
      assert.equal(
        resolveMotion(previous, point, grownBody).blocked,
        false,
        `Continuous avenue approach at ${z}`,
      );
    previous = point;
  }
  const [homeX, homeY, homeZ] =
    getExpedition("atlantis").region.bossHomes.kraken;
  assert.deepEqual([homeX, homeY, homeZ], [0, -420, -730]);
  for (const y of [homeY - 25, homeY, homeY + 25]) {
    for (const x of [-65, -30, 0, 30, 65]) {
      for (const z of [homeZ - 65, homeZ - 30, homeZ, homeZ + 30, homeZ + 65]) {
        assert.equal(
          isPositionBlocked({ x, y, z }, grownBody),
          false,
          `Battle volume ${x},${y},${z}`,
        );
      }
    }
  }
  const seats = city.colliders.filter((entry) => entry.kind === "arena_seat");
  assert.ok(seats.length >= 32);
  assert.ok(seats.every((seat) => Math.abs(seat.x) > 100));
});

test("Rotunda roofs block a dive while the visible annular colonnade stays open", () => {
  for (const rotunda of city.buildings.filter(
    (entry) => entry.kind === "rotunda",
  )) {
    const scale = rotunda.width / 32;
    const point = {
      x: rotunda.x + 9 * scale,
      y: rotunda.y + 10 * scale,
      z: rotunda.z,
    };
    assert.equal(
      isPositionBlocked(point, {
        colliders: city.colliders,
        radius: bodyRadius(3),
        length: 3,
        forward,
      }),
      false,
      `Colonnade at ${rotunda.x},${rotunda.z} must not be filled by its thin base's collision`,
    );
    const roof = castSegment(
      { x: rotunda.x, y: rotunda.y + 42 * scale, z: rotunda.z },
      { x: rotunda.x, y: rotunda.y + 26 * scale, z: rotunda.z },
      city.colliders,
      bodyRadius(3),
    );
    assert.ok(roof, `Rotunda ${rotunda.x},${rotunda.z} roof`);
    assert.equal(roof.collider.kind, "city_dome");
    assert.ok(
      Math.abs(roof.point.y - bodyRadius(3) - (rotunda.y + 33.61 * scale)) <
        1.3 * scale,
      "Dome collision follows the curved roof, not a filled entire building",
    );
  }
});

test("City disposal releases private geometry and instance buffers once, preserving shared kits and the second city", () => {
  const parent = new THREE.Scene();
  const first = createAtlantisCity(parent, { heightAt: seabedHeight });
  const second = createAtlantisCity(parent, { heightAt: seabedHeight });
  const shared = new Set(GEOMETRIES.values());
  const geometries = new Map();
  const materials = new Map();
  const instances = new Map();
  first.root.traverse((node) => {
    for (const [resource, counters] of [
      [node.geometry, geometries],
      [node.material, materials],
      [node.isInstancedMesh ? node : null, instances],
    ]) {
      if (!resource || counters.has(resource)) continue;
      counters.set(resource, 0);
      resource.addEventListener("dispose", () =>
        counters.set(resource, counters.get(resource) + 1),
      );
    }
  });
  assert.ok(instances.size > 20);
  first.dispose();
  first.dispose();
  assert.equal(first.root.parent, null);
  assert.equal(parent.children.length, 1);
  for (const [geometry, count] of geometries)
    assert.equal(count, shared.has(geometry) ? 0 : 1, geometry.name);
  for (const count of instances.values()) assert.equal(count, 1);
  for (const count of materials.values()) assert.equal(count, 0);
  second.update(30, 1 / 60, new THREE.Vector3(0, -420, -730), false);
  second.root.traverse((node) => {
    if (node.geometry)
      for (const attribute of Object.values(node.geometry.attributes))
        assert.ok(attribute.array.every(Number.isFinite));
  });
  second.dispose();
  assert.equal(parent.children.length, 0);
});

test("Pearl habitats mark the city route while keeping building entrances and the central avenue clear", () => {
  const lanterns = city.buildings.filter((r) => r.kind === "pearl");
  assert.equal(city.stats.pearlHabitats, lanterns.length);
  assert.ok(lanterns.length >= 40);
  for (const district of ATLANTIS_DISTRICTS)
    assert.ok(
      lanterns.some((r) => atlantisDistrict(r.x, r.z)?.id === district.id),
      district.id,
    );
  for (const lantern of lanterns) {
    assert.ok(Math.abs(lantern.x) >= 20, "Keep the grown player's route open");
    assert.ok(lantern.y > seabedHeight(lantern.x, lantern.z));
    for (const building of buildings)
      assert.ok(
        Math.abs(lantern.x - building.x) >= building.width / 2 + 3 ||
          Math.abs(lantern.z - building.z) >= building.depth / 2 + 3,
        "Pearl habitat must not stand inside masonry",
      );
  }
});

test("Travel reuses a fixed light pool with readable warm local marine glow at both quality levels", () => {
  const lamps = city.root.children.filter((n) => n.isPointLight);
  assert.equal(lamps.length, 5);
  for (const highQuality of [true, false]) {
    for (const z of [-200, -500, -730, -1000]) {
      const position = new THREE.Vector3(0, seabedHeight(0, z) + 18, z);
      city.update(13, 1 / 60, position, highQuality);
      assert.equal(city.root.children.filter((n) => n.isPointLight).length, 5);
      assert.equal(lamps.filter((l) => l.visible).length, highQuality ? 5 : 3);
      assert.ok(
        lamps.some(
          (l) =>
            l.visible &&
            l.position.distanceTo(position) < 120 &&
            l.position.distanceTo(position) < l.distance &&
            l.color.r > l.color.b &&
            l.intensity > 20,
        ),
      );
    }
  }
});

test.after(() => city.dispose());
