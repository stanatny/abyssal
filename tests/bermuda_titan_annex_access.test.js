import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaOcean } from "../src/bermuda_ocean.js";
import { createCreature } from "../src/creatures.js";
import { bodyRadius, isPositionBlocked } from "../src/collision.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  castIndexedSegment,
  queryStaticColliders,
  resolveIndexedMotion,
} from "../src/static_collider_grid.js";
import { BERMUDA_TITAN_DOCKS } from "./fixtures/bermuda_titan_docks.js";
import {
  actualAvatarSkinContacts,
  actualSkinIndex,
} from "./helpers/titan_surface_geometry.js";

let ocean;
after(() => ocean?.dispose());
const world = () => (ocean ??= createBermudaOcean(new T.Group()));

test("The joined western den physically clears supported adults at the paw approach", () => {
  const w = world(),
    main = w.caves.records.find((record) => record.id === "kaiju_lair"),
    shell = actualSkinIndex(main.shell);
  w.reset();
  w.titan.setPose({ guardAmount: 0 });

  for (const fixture of BERMUDA_TITAN_DOCKS) {
    const label = `${fixture.kind}/${fixture.length}`,
      radius = bodyRadius(fixture.length),
      forward = new T.Vector3(...fixture.localForward).transformDirection(
        w.titan.pose.matrixWorld,
      ),
      wait = new T.Vector3(...fixture.localWait).applyMatrix4(
        w.titan.pose.matrixWorld,
      ),
      dock = fixture.localPosition
        ? new T.Vector3(...fixture.localPosition).applyMatrix4(
            w.titan.pose.matrixWorld,
          )
        : null,
      floorHeight = (x, z) =>
        bodyTerrainFloor(x, z, {
          heightAt: w.contactSurface,
          radius,
          length: (fixture.length * 0.52) / 0.42,
          margin:
            0.4 +
            (fixture.kind === "zombie_shark" ? fixture.length * 0.008 : 0),
          forward,
        }),
      avatar = createCreature(fixture.kind, 6);
    avatar.scale.setScalar(fixture.length);
    avatar.rotation.set(
      Math.asin(forward.y),
      Math.atan2(-forward.x, -forward.z),
      0,
      "YXZ",
    );
    try {
      for (const [name, point] of [
        ["wait", wait],
        ...(dock ? [["dock", dock]] : []),
      ]) {
        avatar.position.copy(point);
        avatar.userData.animate?.(0, 0.9, {
          dt: 0,
          speed: 5,
          turn: 0,
          pitchInput: 0,
          airborne: false,
        });
        avatar.updateMatrixWorld(true);
        const actual = actualAvatarSkinContacts(
          avatar,
          shell,
          w.contactSurface,
        );
        assert.equal(
          actual.crossings,
          0,
          `${label}/${name}: actual joined-shell faces ${JSON.stringify(actual.hits)}`,
        );
        assert.ok(actual.floorMargin >= 0, `${label}/${name}: original floor`);
        const caveCandidates = queryStaticColliders(
          w.caves.colliders,
          point,
          point,
          { radius, padding: fixture.length * 0.52 },
        );
        assert.equal(
          isPositionBlocked(point, {
            radius,
            length: fixture.length,
            forward,
            colliders: caveCandidates,
          }),
          false,
          `${label}/${name}: shell collision must agree with the visible opening`,
        );
      }

      // Squid30 has no accepted paw dock yet. Its legal waiting volume is
      // checked above without inventing a pickup or return fixture.
      if (!dock) continue;
      let position = wait.clone();
      for (let i = 1; i <= 24; i++) {
        const desired = wait.clone().lerp(dock, i / 24),
          result = resolveIndexedMotion(position, desired, {
            staticColliders: w.colliders,
            dynamicColliders: (start, end, dimensions) =>
              w.dynamicContacts(start, end, dimensions),
            radius,
            length: fixture.length,
            forward,
            floorHeight,
          });
        assert.equal(result.stuck, false, `${label}/step${i}: stuck`);
        assert.ok(
          new T.Vector3().copy(result.position).distanceTo(desired) < 1e-5,
          `${label}/step${i}: full-world solver displaced the legal approach`,
        );
        position.copy(result.position);
      }
    } finally {
      avatar.userData.dispose?.();
    }
  }
});

test("The wider inner junction retains the sole north exit and solid rear cap", () => {
  const w = world();
  assert.deepEqual(
    w.caves.exits.map((exit) => exit.id),
    ["north"],
  );
  assert.deepEqual(
    w.caves.escapeRoutes.map((route) => route.id),
    ["north"],
  );
  const y = w.contactSurface(-465, -1620) + 50,
    hit = castIndexedSegment(
      new T.Vector3(-440, y, -1620),
      new T.Vector3(-485, y, -1620),
      { staticColliders: w.caves.colliders, radius: 0.2 },
    );
  assert.ok(hit?.collider.id.startsWith("kaiju_lair_shell_annex_cap_"));
});
