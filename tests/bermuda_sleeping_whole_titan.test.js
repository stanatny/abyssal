import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { createBermudaSleepingTitan } from "../src/bermuda_sleeping_titan.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createCreature } from "../src/creatures.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import { bodyTerrainFloor } from "../src/terrain_contact.js";
import {
  bodyRadius,
  isPositionBlocked,
  resolveMotion,
  castSegment,
} from "../src/collision.js";
import { queryStaticColliders } from "../src/static_collider_grid.js";

test("Production whole actor preserves real guarded entry, shared floor and one pickup witness", async (t) => {
  const ground = new T.Group(),
    terrainMesh = new T.Mesh(createBermudaTerrainMesh());
  terrainMesh.userData.terrainContact = true;
  ground.add(terrainMesh);
  const terrain = createTerrainSurface(ground, {
      fallback: bermudaSeabedHeight,
    }),
    actor = createBermudaSleepingTitan(new T.Group(), { heightAt: terrain }),
    avatar = createCreature("orca", 6),
    gem = createBermudaTitanRelic(),
    forward = actor.approachForward.clone(),
    radius = bodyRadius(30),
    query = (start, end, dimensions) => [
      ...queryStaticColliders(actor.colliders, start, end, dimensions),
      ...actor.dynamicContacts(start, end, dimensions),
    ],
    floorHeight = (x, z) =>
      bodyTerrainFloor(x, z, {
        heightAt: actor.floorSurface,
        radius,
        length: (30 * 0.52) / 0.42,
        forward,
        margin: 0.4,
      }),
    body = { radius, length: 30, forward, colliders: query };
  avatar.scale.setScalar(30);
  avatar.userData.animate?.(0, 0.9, { dt: 0 });
  gem.root.position.copy(actor.relicPoint);
  gem.root.quaternion.copy(actor.relicQuaternion);
  gem.root.updateMatrixWorld(true);
  const place = (position) => {
    avatar.position.copy(position);
    avatar.rotation.set(
      Math.asin(forward.y),
      Math.atan2(-forward.x, -forward.z),
      0,
      "YXZ",
    );
    avatar.updateMatrixWorld(true);
    avatar.traverse((mesh) => mesh.skeleton?.update());
  };
  try {
    await t.test(
      "Public actor is the cleaned continuous whole body on actual terrain",
      () => {
        assert.equal(actor.near.geometry.attributes.position.count, 32265);
        assert.equal(actor.near.geometry.index.count / 3, 28842);
        assert.equal(actor.pose.scale.x, 280);
        assert.equal(actor.rearNear, null);
        assert.ok(actor.treasureRock.mesh.isMesh);
        assert.equal(actor.beds[0], actor.treasureRock);
        assert.equal(actor.turnPoint, null);
        assert.equal(actor.retreatPoint, null);
        assert.equal(actor.model.routePending, true);
        const actualQuaternion = actor.pose.getWorldQuaternion(
          new T.Quaternion(),
        );
        assert.ok(actor.relicQuaternion.angleTo(actualQuaternion) < 1e-12);
        assert.ok(forward.distanceTo(new T.Vector3(0, 0, 1)) < 1e-12);
      },
    );

    await t.test(
      "Closed actual palm blocks the pocket core without a guard flag",
      () => {
        actor.setPose({ guardAmount: 1 });
        const pocket = new T.Vector3(
          -0.1817857142857146,
          -0.10773646896253979,
          -0.32,
        ).applyMatrix4(actor.pose.matrixWorld);
        assert.equal(isPositionBlocked(pocket, body), true);
        assert.equal(isPositionBlocked(actor.waitPoint, body), false);
        // 早收点的可见鱼头超出标准球链；不能把它误记成每个8m外部姿态都被球链阻挡。
        assert.equal(isPositionBlocked(actor.collectionDock, body), false);
        actor.setPose({ guardAmount: 0 });
        assert.equal(isPositionBlocked(actor.collectionDock, body), false);
      },
    );

    await t.test(
      "Ordinary fresh shared solver reaches the real early pickup with main floor options",
      () => {
        actor.setPose({ guardAmount: 0 });
        let position = actor.waitPoint.clone();
        for (let i = 1; i <= 24; i++) {
          const desired = actor.waitPoint
              .clone()
              .lerp(actor.collectionDock, i / 24),
            result = resolveMotion(position, desired, { ...body, floorHeight });
          position.copy(result.position);
          assert.ok(position.distanceTo(desired) < 1e-9);
          assert.equal(result.stuck, false);
          assert.equal(result.contacts.length, 0);
        }
        assert.ok(position.distanceTo(actor.collectionDock) < 1e-9);
        place(position);
        const intake = avatar.userData.getFeedingMouth(new T.Vector3()),
          points = gem.getPickupSurfacePoints(intake),
          staticCleared = points.filter(
            (point) =>
              point.distanceTo(intake) <= 8.00001 &&
              !castSegment(
                intake,
                point,
                queryStaticColliders(actor.colliders, intake, point, {
                  radius: 0.2,
                }),
                0.2,
              ),
          );
        assert.ok(Math.abs(intake.distanceTo(actor.relicPoint) - 7.5) < 1e-8);
        assert.ok(staticCleared.length > 0);
        const access = (target, guardAmount) =>
          actor.canAccessRelic({
            position,
            intakePoint: intake,
            relicPoint: target,
            surfacePoints: staticCleared,
            playerLength: 30,
            forward,
            guardOpen: true,
            guardAmount,
          });
        assert.equal(access(actor.relicPoint, 0), true);
        assert.equal(access(actor.relicPoint, 1), false);
        const tooFar = intake
          .clone()
          .addScaledVector(
            actor.relicPoint.clone().sub(intake).normalize(),
            8.01,
          );
        assert.equal(access(tooFar, 0), false);
      },
    );

    await t.test(
      "Far world queries bypass the front while missing Y retains palm candidates",
      () => {
        const originalQuery = actor.front.queryDynamicContacts;
        let frontQueries = 0;
        actor.front.queryDynamicContacts = function (...args) {
          frontQueries++;
          return originalQuery.apply(this, args);
        };
        try {
          actor.setPose({ guardAmount: 0.75 });
          assert.deepEqual(actor.dynamicContacts({ x: 200, y: 0, z: 0 }), []);
          assert.equal(frontQueries, 0);
          const fullHeight = actor.dynamicContacts(
            { x: actor.collectionDock.x, z: actor.collectionDock.z },
            undefined,
            { radius, padding: 12 },
          );
          assert.ok(fullHeight.length > 0);
          assert.ok(frontQueries > 0);
          const first = actor.dynamicContacts(actor.collectionDock, undefined, {
            radius,
            padding: 12,
          });
          const second = actor.dynamicContacts(
            actor.collectionDock,
            undefined,
            {
              radius,
              padding: 12,
            },
          );
          assert.ok(first.length > 0);
          assert.equal(first[0], second[0]);
        } finally {
          actor.front.queryDynamicContacts = originalQuery;
        }
      },
    );
  } finally {
    avatar.userData.dispose?.();
    gem.dispose();
    actor.dispose();
    terrain.dispose();
    terrainMesh.geometry.dispose();
    terrainMesh.material.dispose();
  }
});
