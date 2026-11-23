import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import {
  castSegment,
  bodyRadius,
  isPositionBlocked,
} from "../src/collision.js";
import {
  castIndexedSegment,
  queryStaticColliders,
} from "../src/static_collider_grid.js";
import { isTitanLavaCellBlocked } from "../src/bermuda_titan_hazards.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import { createBermudaTitanHazardSites } from "../src/bermuda_titan_hazard_sites.js";
let live;
after(() => live?.dispose());
function world() {
  live ??= createBermudaOcean(new T.Group());
  assert.ok(live.root.parent && live.colliders.length);
  live.reset();
  return live;
}
const wait = new T.Vector3(-131.131368891, -607.393985305, -1604.682573228),
  forward = new T.Vector3(-0.623879596709, 0, 0.781520472419),
  safeAway = new T.Vector3(-20, -450, -1250);
function set(q, phase, awake = false) {
  Object.assign(q.state, {
    phase,
    phaseDuration: phase === "charging" ? 2.5 : 3,
    remaining: phase === "charging" ? 1 : 3,
    relicHeld: awake,
    awareness: awake ? 0.5 : 0,
  });
}
function step(q, position = wait) {
  return q.step(0, { position, previous: position, playerLength: 30, forward });
}
function clear(w, point, direction, length = 30) {
  const radius = bodyRadius(length),
    all = [
      ...queryStaticColliders(w.colliders, point, point, {
        radius,
        padding: length * 0.52,
      }),
      ...w.dynamicContacts(point, point, { radius, padding: length * 0.52 }),
    ];
  return !isPositionBlocked(point, {
    radius,
    length: (length * 0.52) / 0.42,
    forward: direction,
    colliders: all,
  });
}

test("Real sleeping/aware cave salvos select complete accessible arcs, keep locked warning targets, and never clip into partial beams", (t) => {
  const w = world(),
    q = w.titanQuest,
    sectors = new Set(),
    landingSites = new Set();
  for (const seed of [1, 7, 23, 81])
    for (const awake of [false, true]) {
      q.reset({ seed });
      set(q, "charging", awake);
      step(q);
      const warning = structuredClone(q.hazards.lava.warningSheets);
      assert.equal(
        warning.length,
        1,
        "real whole-path clearance must not disable the encounter",
      );
      const targets = warning.map((p) => p.impact);
      set(q, "breath", awake);
      step(q);
      assert.equal(q.hazards.lava.paths.length, 0);
      for (let i = 0; i < 11; i++)
        q.step(0.1, {
          activeTimeDt: 0.1,
          position: safeAway,
          previous: safeAway,
          forward,
          playerLength: 30,
        });
      assert.deepEqual(
        q.hazards.lava.paths.map((p) => p.impact),
        targets,
      );
      assert.equal(
        q.hazards.lava.pools.length,
        1,
        "A broad landed spray retains its visible hot pool",
      );
      for (const path of q.hazards.lava.paths) {
        sectors.add(path.sector);
        landingSites.add(path.siteId);
        assert.equal(path.points.length, 13);
        assert.ok(
          new T.Vector3().copy(path.points[0]).distanceTo(w.titan.mouth) < 1e-8,
        );
        assert.equal(path.impactHeight, 4);
        assert.equal(path.type, "molten_sheet");
        const transverse = new T.Vector3(
            -(path.impact.z - path.mouth.z),
            0,
            path.impact.x - path.mouth.x,
          ).normalize(),
          samples = [];
        for (let offset = -220; offset <= 220; offset++) {
          const sample = new T.Vector3()
            .copy(path.impact)
            .addScaledVector(transverse, offset);
          sample.y = w.contactSurface(sample.x, sample.z) + 5;
          if (w.caves.records[0].contains(sample, 0)) samples.push(offset);
        }
        const chamberSpan = samples.at(-1) - samples[0];
        assert.ok(chamberSpan > 220, "Actual main chamber cross-section");
        assert.ok(
          path.width >= chamberSpan * 0.6,
          `Spray covers most of the real chamber width: ${path.width}/${chamberSpan}`,
        );
        assert.equal(path.tetrahedra.length, path.cells.length * 6);
        assert.equal(path.flow.to, 1);
        for (const cell of path.cells) {
          const center = new T.Vector3()
              .addVectors(cell.bounds.min, cell.bounds.max)
              .multiplyScalar(0.5),
            radius =
              new T.Vector3()
                .subVectors(cell.bounds.max, cell.bounds.min)
                .length() / 2,
            source = queryStaticColliders(w.colliders, center, center, {
              radius,
            }),
            contacts = cell.nearMouth
              ? source.filter((c) => !c.titanBreathIgnore)
              : [
                  ...source,
                  ...w.dynamicContacts(center, center, { radius, padding: 0 }),
                ];
          assert.equal(
            isTitanLavaCellBlocked(cell, contacts),
            false,
            `${seed}/${awake}/${cell.row}/${cell.column}: actual static/current posed cover`,
          );
          for (const p of cell.vertices.slice(0, 4))
            assert.ok(
              p.y >=
                w.contactSurface(p.x, p.z) - (cell.allowLanding ? 0.21 : 0.025),
              "full lower skin follows the actual seabed",
            );
        }
      }

      const exits = new Set(
        q.hazards.lava.paths
          .map((p) => p.sector)
          .filter((s) => s === "north" || s === "south"),
      );
      assert.ok(exits.size <= 1);
      set(q, "cooldown", awake);
      q.state.remaining = q.state.phaseDuration = 5;
      step(q);
      assert.equal(q.hazards.lava.emitting, false);
      for (let i = 0; i < 47; i++)
        q.step(0.1, {
          activeTimeDt: 0.1,
          position: safeAway,
          previous: safeAway,
          forward,
          playerLength: 30,
        });
      assert.equal(q.hazards.lava.paths.length, 0);
      assert.equal(q.hazards.lava.pools.length, 0);
    }
  assert.ok(
    landingSites.size >= 2,
    "Seeded room-scale salvos retain multiple real landing sites",
  );
  t.diagnostic(
    JSON.stringify({
      landingSectors: [...sectors],
      landingSites: [...landingSites],
    }),
  );
});

test(
  "The current physical thirty-metre approach volume can take real lava damage while retaining a natural waiting shelter",
  {
    todo: "Known pre-forepaw direct-lava pocket coverage; the accepted guarded wait is behind the forward-facing mouth. See docs/release_v0_11_32.md.",
  },
  (t) => {
    const w = world(),
      q = w.titanQuest,
      actualWait = w.titan.waitPoint.clone(),
      actualForward = w.titan.approachForward.clone();
    const siteOptions = {
        cave: w.caves.records[0],
        heightAt: w.contactSurface,
        colliders: w.colliders,
        dynamicContacts: w.titan.dynamicContacts,
        anchors: [w.titan.waitPoint, w.titan.approachPoint],
      },
      originalRoofSites = createBermudaTitanHazardSites(siteOptions),
      expandedSites = createBermudaTitanHazardSites({
        ...siteOptions,
        mouth: w.titan.mouth,
        direction: w.titan.direction,
      }),
      key = (s) => JSON.stringify([s.impact, s.roof]),
      expandedKeys = new Set(expandedSites.map(key));
    assert.ok(originalRoofSites.length >= 74);
    assert.ok(
      originalRoofSites.every((s) => expandedKeys.has(key(s))),
      "Every original roof/impact coordinate remains in the new point union",
    );
    // 与main真实移动/q判伤相同length=30；旧landing helper另加了可见全长保守外包。
    const movementClear = (p, F) =>
      !isPositionBlocked(p, {
        length: 30,
        radius: bodyRadius(30),
        forward: F,
        colliders: [
          ...queryStaticColliders(w.colliders, p, p, {
            radius: bodyRadius(30),
            padding: 30 * 0.52,
          }),
          ...w.dynamicContacts(p, p, {
            radius: bodyRadius(30),
            padding: 30 * 0.52,
          }),
        ],
      });
    assert.equal(movementClear(actualWait, actualForward), true);
    const status = {
      wait: actualWait.toArray(),
      approach: w.titan.approachPoint.toArray(),
      approachClosedBodyClear: movementClear(
        w.titan.approachPoint,
        actualForward,
      ),
      historicalGBodyClear: movementClear(wait, forward),
      originalRoofCount: originalRoofSites.length,
      expandedSiteCount: expandedSites.length,
      originalRoofCoordinatesPreserved: true,
    };
    const across = new T.Vector3(-actualForward.z, 0, actualForward.x),
      samples = [
        { name: "wait", point: actualWait.clone() },
        ...[2, 4, 6].map((y) => ({
          name: `wait+${y}m`,
          point: actualWait.clone().add(new T.Vector3(0, y, 0)),
        })),
        ...[-6, 6].map((d) => ({
          name: `longitudinal ${d}m`,
          point: actualWait
            .clone()
            .addScaledVector(actualForward, d)
            .add(new T.Vector3(0, 4, 0)),
        })),
        ...[-6, 6].map((d) => ({
          name: `lateral ${d}m`,
          point: actualWait
            .clone()
            .addScaledVector(across, d)
            .add(new T.Vector3(0, 4, 0)),
        })),
      ];
    let proved = false;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      q.reset({ seed });
      set(q, "charging");
      const options = {
        position: actualWait,
        previous: actualWait,
        forward: actualForward,
        playerLength: 30,
      };
      assert.equal(
        q.step(0, options).some((e) => e.damage),
        false,
      );
      assert.equal(q.hazards.lava.warningSheets.length, 1);
      const targets = q.hazards.lava.warningSheets.map((s) => s.siteId);
      set(q, "breath");
      q.step(0, options);
      for (let i = 0; i < 11; i++)
        q.step(0.1, { ...options, activeTimeDt: 0.1 });
      for (const { name, point } of samples) {
        assert.ok(point.distanceTo(actualWait) <= 15);
        if (!movementClear(point, actualForward)) continue;
        const minimumY = bodyTerrainFloor(point.x, point.z, {
          heightAt: w.contactSurface,
          radius: bodyRadius(30),
          length: (30 * 0.52) / 0.42,
          margin: 0.4,
          forward: actualForward,
        });
        if (point.y < minimumY) continue;
        const hit = q
          .step(0, { ...options, position: point, previous: point })
          .find((e) => e.source === "lava" && e.damage);
        if (name === "wait") status.exactWaitDamage = hit?.damage ?? 0;
        if (!hit) continue;
        assert.equal(hit.damage, 40);
        assert.deepEqual(
          q.hazards.lava.paths.map((s) => s.siteId),
          targets,
          "Locked landing cannot follow these volume probes",
        );
        status.seed = seed;
        status.damage = hit.damage;
        status.hitSample = name;
        status.hitPosition = point.toArray();
        proved = true;
        break;
      }
      if (proved) break;
    }
    t.diagnostic(JSON.stringify(status));
    assert.equal(
      proved,
      true,
      "The actual legal waiting approach must have a threatened nearby body position, not only far water",
    );
  },
);

test("At least one real legal thirty-metre body takes advertised landing damage and warning/calm never hides lava damage", () => {
  const w = world(),
    q = w.titanQuest;
  let proved = false;
  search: for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    q.reset({ seed });
    set(q, "charging");
    step(q);
    const paths = structuredClone(q.hazards.lava.warningSheets);
    for (const path of paths)
      for (const d of [
        forward,
        new T.Vector3(0, 0, -1),
        new T.Vector3(1, 0, 0),
      ]) {
        // 每个姿态都从同一有种子的预警重来，避免前一尝试的真实热池污染下一次预警。
        q.reset({ seed });
        set(q, "charging");
        step(q);
        assert.deepEqual(
          q.hazards.lava.warningSheets.map((s) => s.siteId),
          paths.map((s) => s.siteId),
        );
        const point = new T.Vector3(path.impact.x, 0, path.impact.z);
        point.y = bodyTerrainFloor(point.x, point.z, {
          heightAt: w.contactSurface,
          radius: bodyRadius(30),
          length: (30 * 0.52) / 0.42,
          forward: d,
          margin: 0.4,
        });
        if (!clear(w, point, d)) continue;
        set(q, "charging");
        const warning = q.step(0, {
          position: point,
          previous: point,
          forward: d,
          playerLength: 30,
        });
        assert.equal(
          warning.some((e) => e.damage),
          false,
        );
        set(q, "breath");
        step(q);
        for (let i = 0; i < 11; i++)
          q.step(0.1, {
            activeTimeDt: 0.1,
            position: safeAway,
            previous: safeAway,
            forward,
            playerLength: 30,
          });
        const active = q.step(0, {
          position: point,
          previous: point,
          forward: d,
          playerLength: 30,
        });
        if (
          active.some(
            (e) =>
              e.kind === "hazard_hit" && e.source === "lava" && e.damage === 40,
          )
        ) {
          proved = true;
          break search;
        }
      }
    if (proved) break;
  }
  assert.ok(
    proved,
    "actual body/floor/posed-arm legal location, no mocked geometry or oversized pickup radius",
  );
});

test("Real rock warnings detach from actual roof, preserve true swept volume and terminal eruption stays local after exact expiry", () => {
  const w = world(),
    q = w.titanQuest;
  q.reset({ seed: 91 });
  for (let i = 0; i < 75; i++)
    q.step(0.1, {
      activeTimeDt: 0.1,
      position: wait,
      previous: wait,
      forward,
      playerLength: 30,
    });
  assert.ok(
    q.hazards.rocks.length > 0 &&
      q.hazards.rocks.every((r) => r.phase === "warning"),
  );
  for (const rock of q.hazards.rocks) {
    const bottom = {
        ...rock.warningPoint,
        y: rock.warningPoint.y + rock.radius + 0.15,
      },
      hit = castIndexedSegment(rock.position, bottom, {
        staticColliders: w.colliders,
        radius: rock.radius - 0.01,
      });
    assert.equal(hit, null, "the whole falling sphere has a real clear column");
  }
  q.state.relicHeld = true;
  q.state.escaping = true;
  q.state.escapeRemaining = 0.05;
  const events = q.step(0.05, {
    activeTimeDt: 0.05,
    position: wait,
    previous: wait,
    forward,
    playerLength: 30,
  });
  assert.ok(events.some((e) => e.kind === "entombed" && e.fatal));
  assert.equal(q.state.secured, false);
  assert.equal(q.hazards.terminal.active, true);
  assert.deepEqual(q.hazards.terminal.center, {
    x: wait.x,
    y: wait.y,
    z: wait.z,
  });
  assert.equal(q.hazards.terminal.ground.y, w.contactSurface(wait.x, wait.z));
  assert.ok(q.hazards.terminal.roof.y > q.hazards.terminal.ground.y + 30);
  q.presentTerminal(0.6);
  assert.equal(q.hazards.terminal.progress, 0.5);
  const escape = q.state.escapeRemaining;
  q.update(1, wait, { terminalDt: 0.6 });
  assert.equal(q.hazards.terminal.progress, 1);
  assert.equal(q.state.escapeRemaining, escape);
  assert.equal(q.state.secured, false);
  q.reset();
  assert.equal(q.hazards.terminal.active, false);
  assert.equal(w.caves.isSealed, false);
});
