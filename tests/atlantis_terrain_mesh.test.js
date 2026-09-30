import test from "node:test";
import assert from "node:assert/strict";
import { createAtlantisTerrainMesh } from "../src/atlantis_terrain_mesh.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";

// 验证可见三角形内部而非只查顶点，防止低密度网格跨越下挖区。
test("Excavated terrain triangles follow the collision floor without map-wide refinement", () => {
  const geometry = createAtlantisTerrainMesh({
    minX: -360,
    maxX: 360,
    minZ: -1270,
    maxZ: 140,
    segmentsX: 144,
    segmentsZ: 282,
    heightAt: atlantisSeabedHeight,
  });
  const p = geometry.attributes.position,
    n = geometry.attributes.normal;
  const index = geometry.index;
  assert.ok(
    index.count / 3 < 220000,
    "Local excavation must retain a bounded geometry cost",
  );
  let largestError = 0;
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    for (const weights of [
      [1 / 3, 1 / 3, 1 / 3],
      [0.5, 0.5, 0],
      [0, 0.5, 0.5],
      [0.5, 0, 0.5],
    ]) {
      const x = ids.reduce((sum, id, k) => sum + p.getX(id) * weights[k], 0);
      const y = ids.reduce((sum, id, k) => sum + p.getY(id) * weights[k], 0);
      const z = ids.reduce((sum, id, k) => sum + p.getZ(id) * weights[k], 0);
      const error = Math.abs(y - atlantisSeabedHeight(x, z));
      largestError = Math.max(largestError, error);
      assert.ok(
        error < 1.5,
        `Rendered ground departs from its floor at ${x}, ${z}: ${error}`,
      );
    }
  }
  for (let i = 0; i < n.count; i++) {
    assert.ok(
      Number.isFinite(n.getX(i)) && n.getY(i) > 0 && Number.isFinite(n.getZ(i)),
    );
  }
  assert.ok(
    largestError > 0,
    "Check interpolation, not only exact sampled vertices",
  );
  geometry.dispose();
});
