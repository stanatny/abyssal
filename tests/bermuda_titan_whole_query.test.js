import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import contactCache from "../src/assets/models/bermuda_titan_whole_contacts.json" with { type: "json" };
import { createBermudaTitanWhole } from "../src/bermuda_titan_whole.js";
import {
  TITAN_WHOLE_MAX_MOTION,
  TITAN_WHOLE_WRIST_PITCH,
  TITAN_WHOLE_WRIST_PIVOT,
} from "../src/bermuda_titan_whole_asset.js";
import {
  castSegment,
  castBodySegment,
  isPositionBlocked,
  resolveMotion,
} from "../src/collision.js";

const WIDTH = 280;
const worldPoint = (p) => new T.Vector3(p.x, p.y, p.z).multiplyScalar(WIDTH);
const localPoint = (p) => new T.Vector3(p.x, p.y, p.z).divideScalar(WIDTH);
const hitRecord = (hit) =>
  hit
    ? { index: hit.collider.index, time: hit.time, normal: hit.normal }
    : null;
const motionRecord = (motion) => ({
  ...motion,
  contacts: motion.contacts.map(hitRecord),
});

test("Whole moving query keeps exact solver outcomes, full-height volumes and finite far rejection", async (t) => {
  const f = createBermudaTitanWhole(new T.Group(), { contactCache }),
    pivot = new T.Vector3(...TITAN_WHOLE_WRIST_PIVOT),
    positions = f.asset.geometry.attributes.position;
  try {
    await t.test(
      "The immutable far envelope contains all real wrist motion",
      () => {
        let maximumMotion = 0;
        for (let i = 0; i < positions.count; i++) {
          const p = new T.Vector3().fromBufferAttribute(positions, i);
          maximumMotion = Math.max(
            maximumMotion,
            2 *
              f.asset.weights[i] *
              p.distanceTo(pivot) *
              Math.sin(TITAN_WHOLE_WRIST_PITCH / 2),
          );
        }
        assert.ok(maximumMotion < TITAN_WHOLE_MAX_MOTION);
        const getVertexPosition = f.near.getVertexPosition;
        let posedVertices = 0;
        f.near.getVertexPosition = function (...args) {
          posedVertices++;
          return getVertexPosition.apply(this, args);
        };
        try {
          f.setGuard(0.75);
          assert.deepEqual(f.queryDynamicContacts({ x: 8, y: 8, z: 8 }), []);
          assert.deepEqual(
            f.queryDynamicContacts({ x: 8, z: 8 }, undefined, {
              radius: 0.1,
              padding: 0.2,
            }),
            [],
          );
          assert.equal(
            posedVertices,
            0,
            "Far queries must reject before fitting or rebuilding moving contacts",
          );
        } finally {
          f.near.getVertexPosition = getVertexPosition;
        }
      },
    );

    await t.test(
      "Actual rays and complete body sweeps match the full current sphere set",
      () => {
        let rayHits = 0,
          bodyHits = 0,
          reducedQueries = 0;
        for (const guard of [1, 0.98, 0.5, 0]) {
          f.setGuard(guard);
          const fullLocal = f.dynamicRestContacts.map((c) =>
              f.getPosedContact(c.index),
            ),
            worldContacts = new Map(
              fullLocal.map((c) => [
                c.index,
                {
                  ...c,
                  ...worldPoint(c),
                  radius: c.radius * WIDTH,
                },
              ]),
            ),
            full = [...worldContacts.values()],
            query = (start, end, dimensions = {}) =>
              f
                .queryDynamicContacts(localPoint(start), localPoint(end), {
                  radius: (dimensions.radius ?? 0) / WIDTH,
                  padding: (dimensions.padding ?? 0) / WIDTH,
                  segment: true,
                })
                .map((c) => worldContacts.get(c.index));
          for (const fraction of [0.1, 0.35, 0.65, 0.9]) {
            const c = full[Math.floor((full.length - 1) * fraction)],
              start = new T.Vector3(c.x + 18, c.y + 12, c.z - 14),
              end = new T.Vector3(c.x - 8, c.y - 3, c.z + 9),
              selected = query(start, end),
              ray = castSegment(start, end, full),
              options = {
                radius: 3.9,
                length: 30,
                forward: new T.Vector3(-1, -0.1, 0.2).normalize(),
              },
              body = castBodySegment(start, end, {
                ...options,
                colliders: full,
              });
            assert.deepEqual(
              hitRecord(castSegment(start, end, selected)),
              hitRecord(ray),
            );
            assert.deepEqual(
              hitRecord(
                castBodySegment(start, end, {
                  ...options,
                  colliders: query,
                }),
              ),
              hitRecord(body),
            );
            assert.equal(
              isPositionBlocked(start, { ...options, colliders: query }),
              isPositionBlocked(start, { ...options, colliders: full }),
            );
            rayHits += Number(Boolean(ray));
            bodyHits += Number(Boolean(body));
            reducedQueries += Number(selected.length < full.length);
            for (let i = 1; i < selected.length; i++)
              assert.ok(selected[i - 1].index < selected[i].index);
          }
          // 同一真实表面外侧的小步滑移，脱困与后续滑动必须重新查询。
          const c = full[Math.floor(full.length / 2)],
            start = new T.Vector3(c.x, c.y + c.radius + 0.4, c.z),
            end = start.clone().add(new T.Vector3(1.1, -0.5, 0.6)),
            options = { radius: 0.2 };
          assert.deepEqual(
            motionRecord(
              resolveMotion(start, end, { ...options, colliders: query }),
            ),
            motionRecord(
              resolveMotion(start, end, { ...options, colliders: full }),
            ),
          );
          for (const c of fullLocal)
            for (const axis of ["x", "y", "z"])
              assert.ok(
                c[axis] - c.radius >= f.dynamicBounds.min[axis] &&
                  c[axis] + c.radius <= f.dynamicBounds.max[axis],
                `Current sphere ${c.index} escaped the immutable ${axis} envelope`,
              );
        }
        assert.ok(rayHits > 0 && bodyHits > 0);
        assert.ok(reducedQueries > 0, "The exact postfilter must not be inert");
      },
    );

    await t.test(
      "Missing Y stays full-height and AABB volumes do not become segments",
      () => {
        const c = f.getPosedContact(
            f.dynamicRestContacts[Math.floor(f.dynamicRestContacts.length / 2)]
              .index,
          ),
          p = { x: c.x, z: c.z },
          fullHeight = f.queryDynamicContacts(p, p, { segment: true }),
          high = { ...p, y: 10 };
        assert.ok(fullHeight.some((hit) => hit.index === c.index));
        assert.deepEqual(f.queryDynamicContacts(high), []);
        const min = { x: c.x - 0.03, y: c.y - 0.02, z: c.z - 0.02 },
          max = { x: c.x + 0.03, y: c.y + 0.02, z: c.z + 0.02 },
          volume = f.queryDynamicContacts(min, max, { segment: false }),
          expected = f.dynamicRestContacts
            .map((row) => f.getPosedContact(row.index))
            .filter(
              (s) =>
                s.x + s.radius >= min.x &&
                s.x - s.radius <= max.x &&
                s.y + s.radius >= min.y &&
                s.y - s.radius <= max.y &&
                s.z + s.radius >= min.z &&
                s.z - s.radius <= max.z,
            );
        assert.deepEqual(
          volume.map((s) => s.index),
          expected.map((s) => s.index),
        );
      },
    );
  } finally {
    f.dispose();
  }
});
