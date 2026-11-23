import test from "node:test";
import assert from "node:assert/strict";
import * as T from "three";
import { acquireBermudaTitanWholeAsset } from "../src/bermuda_titan_whole_asset.js";
import {
  BERMUDA_TITAN_HAZARDS,
  createTitanLavaSheet,
  createTitanLavaPath,
  titanHazardSeed,
} from "../src/bermuda_titan_hazards.js";
import { mouthSectionIntrusions } from "./helpers/titan_mouth_geometry.js";

test("The measured unchanged-mouth outlet and following flare do not occupy actual HF teeth, lips or cheeks", () => {
  const a = acquireBermudaTitanWholeAsset(),
    mouth = a.mouthLocal.clone().multiplyScalar(280),
    direction = a.mouthDirection;
  try {
    for (const width of [18, 48])
      for (const yaw of [0, -0.2, 0.2]) {
        const forward = direction
            .clone()
            .setY(0)
            .normalize()
            .applyAxisAngle(new T.Vector3(0, 1, 0), yaw),
          impact = mouth.clone().addScaledVector(forward, 65);
        impact.y -= 25;
        const s = createTitanLavaSheet(
            mouth,
            direction,
            {
              id: "gape",
              impact,
              normal: { x: 0, y: 1, z: 0 },
              floorAt: () => impact.y - 0.12,
            },
            { width, seed: 81, lift: 20 },
          ),
          proof = mouthSectionIntrusions(a.geometry, s);
        assert.ok(
          proof.candidatePairs > 100,
          "The independent volume check must actually test nearby retained skin",
        );
        assert.equal(
          proof.hits.length,
          0,
          `Actual first-two-row intrusion at width ${width}/yaw ${yaw}: ${JSON.stringify(proof.hits.slice(0, 3))}`,
        );
        assert.equal(s.cells.length, 140);
        assert.equal(s.tetrahedra.length, 840);
        assert.ok(
          new T.Vector3().copy(s.points[0]).distanceTo(mouth) < 1e-10,
          "The outlet may not move outside the actual mouth",
        );
        assert.ok(
          new T.Vector3()
            .copy(s.points[1])
            .sub(mouth)
            .normalize()
            .distanceTo(direction) < 1e-10,
        );
      }
  } finally {
    a.release();
  }
});

test("Only the mouth section tapers; all downstream width, thickness, landing footprint and damage remain unchanged", () => {
  const mouth = new T.Vector3(0, 30, 0),
    direction = new T.Vector3(0.8, -0.6, 0),
    site = {
      id: "ground",
      impact: new T.Vector3(65, 0.12, 0),
      normal: { x: 0, y: 1, z: 0 },
      floorAt: () => 0,
    },
    s = createTitanLavaSheet(mouth, direction, site, {
      width: 48,
      lift: 20,
      seed: 81,
    }),
    center = createTitanLavaPath(mouth, direction, site, {
      lift: 20,
      radius: 1.75,
    }).points,
    phase = (titanHazardSeed(81) / 0x100000000) * Math.PI * 2;
  center[12] = { x: 65, y: 2.12, z: 0 };
  for (let row = 2; row < 15; row++)
    for (let col = 0; col < 11; col++)
      for (let layer = 0; layer < 2; layer++) {
        const t = Math.min(row, 12) / 12,
          u = (col / 10) * 2 - 1,
          c =
            row <= 12
              ? center[row]
              : { ...center[12], x: center[12].x + (row - 12) * 6 },
          half = 3 + 21 * Math.sin((t * Math.PI) / 2) ** 0.85,
          roll =
            Math.sin(u * Math.PI * 1.5 + phase) * Math.sin(t * Math.PI) * 0.8,
          outline = row >= 12 ? Math.sin(u * 2.6 + phase) * 1.5 : 0,
          expected = new T.Vector3(
            c.x + outline,
            (row >= 12 ? 2.12 : c.y + roll) + (layer ? 2 : -2),
            c.z + u * half,
          ),
          actual = s.vertices[layer * 165 + row * 11 + col];
        assert.ok(
          expected.distanceTo(new T.Vector3().copy(actual)) < 1e-10,
          `Downstream geometry changed at ${row}/${col}/${layer}`,
        );
      }
  const rowWidth = (row) =>
    Math.hypot(
      s.vertices[row * 11].x - s.vertices[row * 11 + 10].x,
      s.vertices[row * 11].z - s.vertices[row * 11 + 10].z,
    );
  assert.ok(
    Math.abs(rowWidth(0) - 2.4) < 1e-10 && Math.abs(rowWidth(1) - 2.4) < 1e-10,
  );
  assert.equal(BERMUDA_TITAN_HAZARDS.lavaDamage, 40);
  assert.equal(BERMUDA_TITAN_HAZARDS.hitInterval, 1);
});
