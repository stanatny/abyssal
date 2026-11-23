import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import {
  BERMUDA_CAVE_SITES,
  BERMUDA_TITAN_LAYOUT,
  BERMUDA_TITAN_NAVIGATION,
  BERMUDA_TITAN_REAR_ANNEX,
} from "../src/bermuda_cave_config.js";
import { BERMUDA_WORLD as W } from "../src/bermuda_config.js";
import { WRECK_BED } from "../src/bermuda_sites.js";
import { getExpedition } from "../src/expedition_config.js";
import { BOSS_SPECIES } from "../src/boss_rules.js";
import {
  OCEAN_CURRENT_RULES,
  oceanCurrentRoutes,
} from "../src/ocean_current_rules.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { createBermudaOuterBiomes } from "../src/bermuda_outer_biomes.js";
import { createBermudaWreck } from "../src/bermuda_wreck.js";

function siteBox(site, minimum = 0, maximum = 1) {
  return new T.Box3(
    new T.Vector3(-site.width / 2, minimum, -site.depth / 2),
    new T.Vector3(site.width / 2, maximum, site.depth / 2),
  ).applyMatrix4(
    new T.Matrix4().compose(
      new T.Vector3(site.x, 0, site.z),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), site.yaw),
      new T.Vector3(1, 1, 1),
    ),
  );
}

function contactBox(contact) {
  const half =
    contact.halfSize ||
    contact.axes ||
    new T.Vector3(contact.radius, contact.radius, contact.radius);
  assert.ok(
    half.toArray().every(Number.isFinite),
    `supported existing contact ${contact.id}`,
  );
  return new T.Box3(half.clone().negate(), half.clone()).applyMatrix4(
    new T.Matrix4().compose(
      new T.Vector3(contact.x, contact.y, contact.z),
      new T.Quaternion(
        contact.rotation?.x || 0,
        contact.rotation?.y || 0,
        contact.rotation?.z || 0,
        contact.rotation?.w ?? 1,
      ),
      new T.Vector3(1, 1, 1),
    ),
  );
}

test("Three immutable cave sites reserve distinct above-floor deep-water landmarks", () => {
  assert.ok(Object.isFrozen(BERMUDA_CAVE_SITES));
  assert.equal(BERMUDA_CAVE_SITES.length, 3);
  assert.equal(new Set(BERMUDA_CAVE_SITES.map((s) => s.id)).size, 3);
  assert.deepEqual(
    new Set(BERMUDA_CAVE_SITES.map((s) => s.theme)),
    new Set(["kaiju_lair", "luminous_grotto", "fossil_passage"]),
  );
  for (const site of BERMUDA_CAVE_SITES) {
    assert.ok(Object.isFrozen(site));
    assert.ok(
      [
        site.x,
        site.z,
        site.yaw,
        site.width,
        site.depth,
        site.height,
        site.floorMin,
        site.floorMax,
      ].every(Number.isFinite),
    );
    for (const key of ["id", "name", "code", "description"])
      assert.ok(site[key]?.length > 0, key);
    assert.ok(!/[\u3400-\u9fff]/.test(site.code), "world code remains English");
    const box = siteBox(site, 0, 1);
    assert.ok(box.min.x >= W.minX + 20 && box.max.x <= W.maxX - 20);
    assert.ok(box.min.z >= W.minZ + 20 && box.max.z < -1000);
    assert.ok(site.width >= 90 && site.depth >= 100 && site.height >= 120);
    const bed = new T.Box3(
      new T.Vector3(
        WRECK_BED.minX - WRECK_BED.blend,
        0,
        WRECK_BED.minZ - WRECK_BED.blend,
      ),
      new T.Vector3(
        WRECK_BED.maxX + WRECK_BED.blend,
        1,
        WRECK_BED.maxZ + WRECK_BED.blend,
      ),
    );
    assert.equal(
      box.intersectsBox(bed),
      false,
      "liner and support-bed reservation",
    );
  }
  const main = BERMUDA_CAVE_SITES.find((s) => s.theme === "kaiju_lair");
  assert.deepEqual(
    [main.x, main.z, main.width, main.depth, main.height],
    [-85, -1555, 300, 280, 180],
    "approved enlarged lair",
  );
  assert.deepEqual(
    BERMUDA_CAVE_SITES.filter((s) => s.theme !== "kaiju_lair").map((s) => [
      s.id,
      s.x,
      s.z,
      s.width,
      s.depth,
      s.height,
    ]),
    [
      ["luminous_grotto", -430, -1070, 90, 100, 120],
      ["fossil_passage", 435, -1635, 90, 110, 120],
    ],
    "the two accepted side caves remain fixed",
  );
  const mainBox = siteBox(main),
    reservation = BERMUDA_TITAN_NAVIGATION.monsterReservation;
  for (const [x, z] of [
    [reservation.minX, reservation.minZ],
    [reservation.maxX, reservation.maxZ],
    ...BERMUDA_TITAN_NAVIGATION.routeXZ,
    ...BERMUDA_TITAN_LAYOUT.seals.map((s) => [s.x, s.z]),
    [BERMUDA_TITAN_LAYOUT.treasure.x, BERMUDA_TITAN_LAYOUT.treasure.z],
    [BERMUDA_TITAN_LAYOUT.breathEnd.x, BERMUDA_TITAN_LAYOUT.breathEnd.z],
  ])
    assert.ok(mainBox.containsPoint(new T.Vector3(x, 0, z)));
  // 南口外至少二十米的中心航段仍要容纳全长身体与反向正常跟随镜头。
  for (const site of BERMUDA_CAVE_SITES) {
    assert.equal(
      site.yaw,
      0,
      "staged bidirectional routes use north/south portals",
    );
    for (const sign of site.id === "kaiju_lair" ? [1] : [-1, 1]) {
      const stageZ = site.z + sign * (site.depth / 2 + 20);
      assert.ok(
        stageZ - 16 > W.minZ && stageZ + 16 < W.maxZ,
        `${site.id}: 32 m full body outside the portal`,
      );
      assert.ok(
        stageZ - 32 > W.minZ && stageZ + 32 < W.maxZ,
        `${site.id}: normal reverse follow camera remains inside world`,
      );
    }
  }
});

test("Cave footprints stay outside each lord's conservative patrol/hunt/body reservation", () => {
  assert.deepEqual(
    getExpedition("bermuda").region.bossInstances.map((b) => [b.id, b.home]),
    [
      ["bermuda_hydra", [-290, -18, -450]],
      ["bermuda_kraken", [-245, -390, -730]],
      ["bermuda_maja", [300, -505, -1080]],
      ["bermuda_leviathan", [230, -610, -1570]],
    ],
    "all four current landmark-linked lord homes remain fixed",
  );
  for (const site of BERMUDA_CAVE_SITES) {
    const box = siteBox(site, 0, 1);
    for (const boss of getExpedition("bermuda").region.bossInstances) {
      const species = BOSS_SPECIES.find((s) => s.kind === boss.kind),
        dx = Math.max(box.min.x - boss.home[0], boss.home[0] - box.max.x, 0),
        dz = Math.max(box.min.z - boss.home[2], boss.home[2] - box.max.z, 0),
        reserve = boss.radius + 22 + species.length * 0.6 + 8;
      assert.ok(
        Math.hypot(dx, dz) > reserve,
        `${site.id} / ${boss.id}: reserved full encounter envelope`,
      );
    }
  }
});

test("Final terrain preserves both strict side caves, exact 288 plant roots and only the approved main-lair scenery moves", () => {
  const root = new T.Group(),
    geometry = createBermudaTerrainMesh(),
    material = new T.MeshBasicMaterial(),
    floor = new T.Mesh(geometry, material);
  floor.userData.terrainContact = true;
  root.add(floor);
  const heightAt = createTerrainSurface(root, {
      fallback() {
        throw new Error("Cave reservation outside final terrain");
      },
    }),
    outer = createBermudaOuterBiomes(root, { heightAt }),
    wreck = createBermudaWreck(root, { heightAt });
  try {
    const colonies = outer.reefFields.batches.flatMap((batch) =>
      batch.rows
        .filter((row) => row.kind.startsWith("reef_"))
        .map((row) => ({
          id: row.id,
          box: batch.asset.geometry.boundingBox
            .clone()
            .applyMatrix4(row.matrix)
            .union(
              batch.asset.farGeometry.boundingBox
                .clone()
                .applyMatrix4(row.matrix),
            ),
        })),
    );
    assert.equal(colonies.length, 288);
    assert.deepEqual(
      oceanCurrentRoutes("bermuda").map((r) => r.id),
      ["outbound", "inbound", "deep_west", "deep_east"],
      "all four accepted current corridors are still present",
    );
    // 基线来自本轮前已核验源 ada783bf.../f2af6837...，逐项排除获准迁位，并非新输出重录。
    const plantRoots = outer.reefFields.placements
        .filter((r) => r.kind.startsWith("reef_"))
        .map((r) => ({
          id: r.id,
          x: r.x,
          y: r.y,
          z: r.z,
          matrix: r.matrix.toArray(),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      hash = (value) =>
        createHash("sha256").update(JSON.stringify(value)).digest("hex");
    assert.equal(
      hash(plantRoots),
      "40681a0ed7deaf8fbcd8f03ecd7691bafd1fa988fd0d55e95e0f4898532b79b0",
      "all 288 accepted plant roots and complete posed transforms remain exact",
    );
    const approvedMove = (id) =>
        id === "outer_salvage_cargo_2" ||
        id.startsWith("outer_gate_south_deep_") ||
        id.startsWith("outer_southern_return_grove_rock_2_") ||
        id.startsWith("outer_southern_return_grove_spire_7_"),
      fixedContacts = outer.colliders
        .filter((r) => !approvedMove(r.id))
        .map((r) => ({
          id: r.id,
          type: r.type,
          position: [r.x, r.y, r.z],
          halfSize: r.halfSize?.toArray(),
          rotation: r.rotation?.toArray(),
          radius: r.radius,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    // 唯一新增抬地边缘重座岩：与抬地前真实三角面逐 ID 对账，XZ、形体和全部其余接触体严格保持。
    for (let i = 0; i < 4; i++) {
      const row = fixedContacts.find(
          (r) => r.id === `outer_central_coral_ridge_rock_2_${i}`,
        ),
        originalY = -633.9436523409456 + i * 2.75;
      assert.ok(
        Math.abs(row.position[1] - originalY - 0.5913221524168648) < 1e-9,
      );
      row.position[1] = originalY;
    }
    assert.equal(outer.colliders.length, 589);
    assert.equal(fixedContacts.length, 540);
    assert.equal(
      hash(fixedContacts),
      "7c0d4bf6397c9c8e8e7022c82aec430ef603787a52d3891e2d1e1e12e6423f47",
      "all original contact transforms remain exact after auditing the one entry-terrace rock Y re-seat",
    );
    assert.equal(outer.arches.length, 4);
    const movedGate = outer.arches.find(
      (r) => r.id === "outer_gate_south_deep",
    );
    assert.deepEqual(
      [movedGate.x, movedGate.z, movedGate.yaw],
      [-420, -1525, Math.PI / 2],
    );
    const movedCargo = outer.colliders.find(
      (c) => c.id === "outer_salvage_cargo_2",
    );
    assert.deepEqual([movedCargo.x, movedCargo.z], [-317, -1508]);
    assert.equal(
      outer.colliders.filter((c) => c.id.startsWith("outer_gate_south_deep_"))
        .length,
      40,
      "the complete original aperture retains all its contacts",
    );
    for (const [id, x, z] of [
      ["southern_return_grove_rock_2", -155, -1450],
      ["southern_return_grove_spire_7", -115, -1435],
    ]) {
      const row = outer.reefFields.placements.find((r) => r.id === id);
      assert.deepEqual([row.x, row.z], [x, z]);
    }
    const contacts = [...outer.colliders, ...wreck.colliders].map((c) => ({
      id: c.id,
      box: contactBox(c),
    }));
    for (const site of BERMUDA_CAVE_SITES) {
      const footprint = siteBox(site, 0, 1);
      let low = Infinity,
        high = -Infinity;
      for (let x = footprint.min.x; x <= footprint.max.x; x += 2.5)
        for (let z = footprint.min.z; z <= footprint.max.z; z += 2.5) {
          const y = heightAt(x, z);
          low = Math.min(low, y);
          high = Math.max(high, y);
        }
      assert.ok(
        low > -W.maxDepth && high < -500,
        `${site.id}: deep supported floor`,
      );
      assert.ok(
        low >= site.floorMin && high <= site.floorMax,
        `${site.id}: HUD bounds enclose the final triangle floor`,
      );
      assert.ok(
        low < site.floorMin + 1.5 && high > site.floorMax - 1.5,
        `${site.id}: audited floor bounds remain current`,
      );
      const volume = siteBox(site, low - 2, high + site.height);
      for (const contact of contacts) {
        if (
          site.theme === "kaiju_lair" &&
          /^outer_(southern_return_grove|abyssal_fan_bridge)_/.test(contact.id)
        )
          continue;
        assert.equal(
          volume.intersectsBox(contact.box),
          false,
          `${site.id}: preserves ${contact.id}`,
        );
      }
      for (const colony of site.theme === "kaiju_lair" ? [] : colonies)
        assert.equal(
          footprint.intersectsBox(
            new T.Box3(
              new T.Vector3(colony.box.min.x, 0, colony.box.min.z),
              new T.Vector3(colony.box.max.x, 1, colony.box.max.z),
            ),
          ),
          false,
          `${site.id}: preserves ${colony.id}`,
        );
      for (const route of oceanCurrentRoutes("bermuda"))
        for (const point of route.points)
          assert.ok(
            volume.distanceToPoint(point) >
              OCEAN_CURRENT_RULES.radius + 32 * 0.5 + 5,
            `${site.id}: clear whole-body ${route.id} corridor`,
          );
    }
  } finally {
    outer.dispose();
    wreck.dispose();
    heightAt.dispose();
    geometry.dispose();
    material.dispose();
    root.clear();
  }
});

test("The continuous west den reserves a genuine wide join and an in-world hidden rear", () => {
  const annex = BERMUDA_TITAN_REAR_ANNEX;
  assert.ok(Object.isFrozen(annex));
  assert.equal(annex.westX, -465);
  assert.equal(annex.innerWidth, 164);
  assert.equal(annex.outerWidth, 184);
  assert.equal(annex.farInnerWidth, 144);
  assert.equal(annex.farOuterWidth, 164);
  assert.ok(annex.westX - 10 >= W.minX + 20);
  assert.ok(annex.westAxisZ - annex.outerWidth / 2 > W.minZ + 20);
  assert.ok(annex.portalEndRow > annex.portalStartRow);
  assert.deepEqual(annex.neckXZ, [-215, -1590]);
  assert.deepEqual(annex.tailXZ, [-405, -1620]);
  assert.deepEqual(annex.rearGate, { x: -420, z: -1525, yaw: Math.PI / 2 });
  assert.ok(
    annex.innerWidth > 110 + 32,
    "actual rear breadth plus adult water margin",
  );
});
