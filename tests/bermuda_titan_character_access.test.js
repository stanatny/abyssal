import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createCreature } from "../src/creatures.js";
import { preyCaptureOffsets } from "../src/prey_capture.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  queryStaticColliders,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";
import { BERMUDA_TITAN_DOCKS } from "./fixtures/bermuda_titan_docks.js";
import {
  actualSkinIndex,
  actualAvatarSkinContacts,
} from "./helpers/titan_surface_geometry.js";

let ocean;
after(() => ocean?.dispose());
function world() {
  ocean ??= createBermudaOcean(new T.Group());
  ocean.reset();
  return ocean;
}
function release(w) {
  const q = w.titanQuest;
  for (const seal of q.records.seals)
    q.step(0, { position: seal.point, previous: seal.point, playerLength: 30 });
  const away = new T.Vector3(20, -560, -1500);
  for (let i = 0; i < 45; i++) q.step(0.05, { position: away, previous: away });
  w.titan.setPose(q.state);
  assert.equal(q.state.guardOpen, true);
}

// Fixed witnesses come from ordinary main-style K5 approaches, not mouth-offset
// edits or a search for a convenient height. Thirty-two metres is an archived
// oversized stress case; the supported growth cap remains thirty metres.
for (const fixture of BERMUDA_TITAN_DOCKS)
  test(`${fixture.kind} ${fixture.length}m reaches the whole titan's real crystal through the shared world solver`, () => {
    assert.ok(fixture.localPosition, fixture.pending);
    const w = world(),
      q = w.titanQuest,
      L = fixture.length,
      radius = bodyRadius(L),
      F = new T.Vector3(...fixture.localForward).transformDirection(
        w.titan.pose.matrixWorld,
      ),
      wait = new T.Vector3(...fixture.localWait).applyMatrix4(
        w.titan.pose.matrixWorld,
      ),
      dock = new T.Vector3(...fixture.localPosition).applyMatrix4(
        w.titan.pose.matrixWorld,
      ),
      floorHeight = (x, z) =>
        bodyTerrainFloor(x, z, {
          heightAt: w.contactSurface,
          radius,
          length: (L * 0.52) / 0.42,
          margin: 0.4 + (fixture.kind === "zombie_shark" ? L * 0.008 : 0),
          forward: F,
        }),
      contacts = (s, e, d) => [
        ...queryStaticColliders(w.colliders, s, e, d),
        ...w.dynamicContacts(s, e, d),
      ],
      avatar = createCreature(fixture.kind, 6);
    avatar.scale.setScalar(L);
    avatar.rotation.set(Math.asin(F.y), Math.atan2(-F.x, -F.z), 0, "YXZ");
    const place = (p, time) => {
      avatar.position.copy(p);
      avatar.userData.animate?.(time, 0.9, {
        dt: 0.04,
        speed: 5,
        turn: 0,
        pitchInput: 0,
        airborne: false,
      });
      avatar.updateMatrixWorld(true);
      avatar.traverse((n) => n.skeleton?.update());
    };
    const intake = () => {
      if (fixture.kind !== "squid")
        return avatar.userData.getFeedingMouth(new T.Vector3());
      return preyCaptureOffsets("squid")
        .map((offset) =>
          new T.Vector3(0, 0, L * offset)
            .applyQuaternion(avatar.quaternion)
            .add(avatar.position),
        )
        .sort(
          (a, b) =>
            a.distanceToSquared(q.records.relic) -
            b.distanceToSquared(q.records.relic),
        )[0];
    };
    try {
      release(w);
      const hf = actualSkinIndex(w.titan.near),
        rock = actualSkinIndex(w.titan.treasureRock.mesh),
        geometry = (box) => [...hf(box), ...rock(box)],
        position = wait.clone();
      position.y = Math.max(position.y, floorHeight(position.x, position.z));
      for (let i = 1; i <= 24; i++) {
        const desired = wait.clone().lerp(dock, i / 24),
          step = resolveIndexedMotion(position, desired, {
            staticColliders: w.colliders,
            dynamicColliders: (s, e, d) => w.dynamicContacts(s, e, d),
            radius,
            length: L,
            forward: F,
            floorHeight,
          });
        assert.equal(step.stuck, false);
        position.copy(step.position);
        assert.ok(
          position.distanceTo(desired) < 1e-5,
          "The ordinary solver reaches the independently recorded approach",
        );
        if (i % 6 === 0) {
          place(position, ((fixture.entrySteps ?? 24) * 0.04 * i) / 24);
          const actual = actualAvatarSkinContacts(
            avatar,
            geometry,
            w.contactSurface,
          );
          assert.equal(actual.crossings, 0, JSON.stringify(actual.hits));
          assert.ok(
            actual.floorMargin >= -1e-5,
            `visible floor margin ${actual.floorMargin}`,
          );
        }
      }
      place(position, (fixture.entrySteps ?? 24) * 0.04);
      const mouth = intake();
      assert.ok(
        mouth.distanceTo(q.records.relic) <= 8,
        "Original real mouth/dual Squid intake and fixed 8m centre gate",
      );
      assert.equal(
        isPositionBlocked(position, {
          radius,
          length: L,
          forward: F,
          colliders: contacts,
        }),
        false,
      );
      const event = q
        .step(0, {
          position,
          previous: position,
          intakePoint: mouth,
          previousIntakePoint: mouth,
          forward: F,
          previousForward: F,
          playerLength: L,
        })
        .find((e) => e.kind === "relic_held");
      assert.ok(
        event,
        "Actual quest surface, static LOS and posed HF access callback must all pass",
      );
      assert.equal(
        q.state.relicCollected,
        false,
        "Picking up does not bypass escape and closure",
      );
    } finally {
      avatar.userData.dispose?.();
    }
  });
