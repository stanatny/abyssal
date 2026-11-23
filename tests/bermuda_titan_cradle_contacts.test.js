import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as T from "three";
import cache from "../src/assets/models/bermuda_titan_cradle_contacts.json" with { type: "json" };
import { createBermudaTitanFront } from "../src/bermuda_titan_front.js";
import { TITAN_ARM_RIG } from "../src/bermuda_titan_head_asset.js";

let front;
before(() => {
  front = createBermudaTitanFront(new T.Group());
});
after(() => front?.dispose());
const bytesHash = (array) =>
  createHash("sha256")
    .update(Buffer.from(array.buffer, array.byteOffset, array.byteLength))
    .digest("hex");

test("The cradle contact bake identifies the actual conditioned rendered surface, not just unchanged HF input bytes", () => {
  const g = front.near.geometry,
    proof = cache.conditionedSurfaceProvenance;
  assert.ok(
    proof,
    "A derived collision bake must record its conditioned surface",
  );
  assert.equal(bytesHash(g.attributes.position.array), proof.positionHash);
  assert.equal(bytesHash(g.index.array), proof.indexHash);
  assert.equal(g.attributes.position.count, proof.vertices);
  assert.equal(g.index.count / 3, proof.nearTriangles);
  const unique = new Map();
  for (const patch of front.asset.cradleSurfaceTiles)
    unique.set(patch.sourceFace, patch);
  assert.equal(unique.size, cache.faceCount);
  for (const [sourceFace, patch] of unique) {
    for (let k = 0; k < 3; k++) {
      const point = new T.Vector3().fromBufferAttribute(
        g.attributes.position,
        g.index.getX(sourceFace * 3 + k),
      );
      assert.deepEqual(
        point.toArray(),
        patch.faceVertices[k],
        `Derived source face ${sourceFace} must remain exact`,
      );
    }
  }
});

test("Every refined actual posed subtriangle is fully enclosed by its exact sphere within a bounded surface margin", () => {
  const rows = front.restContacts.filter((c) => c.type === "sphere"),
    patches = front.asset.cradleSurfaceTiles,
    g = front.near.geometry,
    center = new T.Vector3(),
    point = new T.Vector3(),
    corners = [new T.Vector3(), new T.Vector3(), new T.Vector3()];
  assert.equal(rows.length, patches.length);
  assert.equal(rows.length, cache.tileCount);
  for (const [guard, awareness, yaw, pitch] of [
    [1, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 1, -0.035, -0.035],
    [0.5, 1, 0.035, -0.035],
  ]) {
    front.setGuard(guard);
    front.setAwareness(awareness);
    front.setBreathLean(yaw, pitch);
    const faces = new Map();
    for (let i = 0; i < rows.length; i++) {
      const tile = patches[i],
        contact = front.getPosedContact(rows[i].index);
      assert.equal(contact.type, "sphere");
      assert.ok(
        contact.radius * front.width < 0.6,
        "The local surface fix cannot introduce a broad invisible envelope",
      );
      center.set(contact.x, contact.y, contact.z);
      for (const axis of ["x", "y", "z"])
        assert.ok(
          Math.abs(contact[axis] - rows[i][axis]) + contact.radius <=
            Math.max(rows[i].radius, 2 / front.width) +
              TITAN_ARM_RIG.maximumMotion +
              1e-8,
          "Every actual sphere remains inside its immutable rest-index query envelope",
        );
      if (!faces.has(tile.sourceFace)) {
        for (let k = 0; k < 3; k++)
          front.near.getVertexPosition(
            g.index.getX(tile.sourceFace * 3 + k),
            corners[k],
          );
        faces.set(
          tile.sourceFace,
          corners.map((p) => p.clone()),
        );
      }
      const posed = faces.get(tile.sourceFace);
      for (const weights of tile.barycentric) {
        point.set(0, 0, 0);
        for (let k = 0; k < 3; k++) point.addScaledVector(posed[k], weights[k]);
        assert.ok(
          point.distanceTo(center) <= contact.radius + 1e-6,
          `Actual posed skin patch ${i} at ${guard}/${awareness}/${yaw}/${pitch}`,
        );
      }
    }
  }
});

test("Moving cradle spheres are queried in their actual pose while the broad-phase rest records remain immutable", () => {
  const rows = front.restContacts.filter((c) => c.type === "sphere"),
    rest = rows.map((c) => [c.index, c.x, c.y, c.z, c.radius]),
    p = new T.Vector3();
  for (const guard of [1, 0, 0.5]) {
    front.setGuard(guard);
    front.setAwareness(0);
    front.setBreathLean(0, 0);
    for (let i = 0; i < rows.length; i += 307) {
      const current = front.getPosedContact(rows[i].index);
      p.set(current.x, current.y, current.z);
      const queried = front.queryDynamicContacts(p, p, { radius: 0.0001 });
      assert.ok(
        queried.some((c) => c.index === current.index),
        `Moving surface ${i} must remain discoverable by the immutable index`,
      );
      assert.ok(current.radius * front.width < 0.6);
    }
  }
  assert.deepEqual(
    rows.map((c) => [c.index, c.x, c.y, c.z, c.radius]),
    rest,
  );
});
