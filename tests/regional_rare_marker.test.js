import test from "node:test";
import assert from "node:assert/strict";
import { rareShimmerVisibility } from "../src/regional_rare_marker.js";

test("rare shimmer is bounded, fades continuously and cannot reveal a distant individual", () => {
  const distances = [0, 20, 65, 80, 120, 160, 180, 300];
  const values = distances.map(rareShimmerVisibility);
  assert.equal(values[0], 1);
  assert.equal(values.at(-1), 0);
  assert.equal(rareShimmerVisibility(180), 0);
  values.forEach((value, i) => {
    assert.ok(value >= 0 && value <= 1);
    if (i) assert.ok(value <= values[i - 1]);
  });
  assert.ok(
    Math.abs(
      rareShimmerVisibility(65 - 0.001) - rareShimmerVisibility(65 + 0.001),
    ) < 1e-6,
  );
  assert.ok(
    Math.abs(
      rareShimmerVisibility(180 - 0.001) - rareShimmerVisibility(180 + 0.001),
    ) < 1e-6,
  );
});
