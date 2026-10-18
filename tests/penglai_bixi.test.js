import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import {
  PENGLAI_BIXI,
  PENGLAI_PEAKS,
  PENGLAI_WORLD,
  PENGLAI_GUARDIANS,
  penglaiHeightAt,
} from "../src/penglai_config.js";
import { PENGLAI_SUMMIT_ROUTES } from "../src/penglai_routes.js";
import { setLanguage, t } from "../src/i18n.js";

test("Bixi's complete foundation is supported by the rendered shore and faces the monastery inside the original map", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    const site = PENGLAI_BIXI,
      root = ocean.root.getObjectByName("xuanming_bixi_stele");
    assert.ok(root);
    for (let x = -26; x <= 26; x += 6.5)
      for (let z = -35; z <= 35; z += 7) {
        const floor = ocean.groundHeightAt(site.x + x, site.z + z);
        assert.ok(
          floor >= site.platformY - 4.5 && floor < site.platformY + 2,
          `foundation ${x},${z}: ${floor}`,
        );
      }
    const own = ocean.colliders.filter((c) => c.kind.startsWith("bixi_"));
    assert.ok(own.length >= 10);
    assert.ok(
      own.every(
        (c) => Math.abs(c.x) < 100 && c.z > -1400 && c.y > site.terrainY,
      ),
    );
    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    assert.ok(bounds.max.y > site.platformY + 60 && bounds.min.z < site.z - 33);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      root.quaternion,
    );
    const towardMonastery = new THREE.Vector3(
      -site.x,
      0,
      -650 - site.z,
    ).normalize();
    assert.ok(forward.dot(towardMonastery) > 0.99);
    // 北岳留在原地图北缘，石雕朝道观一侧。
    const peak = PENGLAI_PEAKS[3];
    assert.ok(penglaiHeightAt(peak.x, peak.z) > 170);
  } finally {
    ocean.dispose();
  }
});

test("Bixi stone is finite, merged and disposed once with its region; language updates reuse it", () => {
  const ocean = createPenglaiOcean(new THREE.Group()),
    root = ocean.root.getObjectByName("xuanming_bixi_stele"),
    resources = new Set();
  let meshes = 0,
    triangles = 0,
    disposed = 0;
  try {
    root.traverse((n) => {
      if (!n.isMesh) return;
      meshes++;
      resources.add(n.geometry);
      resources.add(n.material);
      triangles +=
        (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
      assert.ok(
        [...n.geometry.attributes.position.array].every(Number.isFinite),
      );
      assert.ok([...n.geometry.attributes.normal.array].every(Number.isFinite));
    });
    assert.equal(meshes, 5);
    assert.ok(triangles < 50000);
    for (const r of resources) r.addEventListener("dispose", () => disposed++);
    for (const lang of ["en", "zh-CN", "en"]) {
      setLanguage(lang);
      ocean.update(0, new THREE.Vector3(-25, 140, -1180), 0, true);
      assert.equal(root.userData.language, lang);
      assert.equal(
        /[\u4e00-\u9fff]/.test(root.userData.inscription),
        lang === "zh-CN",
      );
      assert.equal(/[\u4e00-\u9fff]/.test(t("赑屃镇渊碑")), lang === "zh-CN");
      assert.equal(root.children.length, 5);
    }
    ocean.dispose();
    ocean.dispose();
    assert.equal(disposed, resources.size);
  } finally {
    ocean.dispose();
    setLanguage("zh-CN");
  }
});

test("Penglai keeps its original radar footprint and cardinal guardian layout, including real summit paths", () => {
  assert.deepEqual(
    [
      PENGLAI_WORLD.minX,
      PENGLAI_WORLD.maxX,
      PENGLAI_WORLD.minZ,
      PENGLAI_WORLD.maxZ,
    ],
    [-600, 600, -1400, 160],
  );
  const north = PENGLAI_GUARDIANS.find((b) => b.kind === "black_tortoise");
  assert.deepEqual(north.home, [0, -195, -1030]);
  for (const route of PENGLAI_SUMMIT_ROUTES)
    for (const p of route.points) {
      assert.ok(p.x > PENGLAI_WORLD.minX + 3 && p.x < PENGLAI_WORLD.maxX - 3);
      assert.ok(p.z > PENGLAI_WORLD.minZ + 3 && p.z < PENGLAI_WORLD.maxZ - 3);
    }
});

test("Bixi inscription has one opaque front-facing surface without distant depth conflicts", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    const root = ocean.root.getObjectByName("xuanming_bixi_stele");
    root.updateMatrixWorld(true);
    const face = root.getObjectByName("bixi_bilingual_inscription");
    assert.equal(face.material.transparent, false);
    assert.equal(face.material.depthWrite, true);
    assert.equal(face.material.depthTest, true);
    for (const side of [-1, 1])
      for (const x of [-4, 0, 4])
        for (const y of [28, 38, 48]) {
          const origin = root.localToWorld(
            new THREE.Vector3(x, y, 3 + side * 100),
          );
          const direction = new THREE.Vector3(0, 0, -side).applyQuaternion(
            root.quaternion,
          );
          const hits = new THREE.Raycaster(
            origin,
            direction,
            0,
            110,
          ).intersectObject(root, true);
          const layers = new Set(hits.map((h) => h.distance.toFixed(4)));
          assert.equal(
            layers.size,
            1,
            `overlapping inscription ${side}/${x}/${y}`,
          );
          assert.ok(hits.every((h) => h.object === face));
        }
  } finally {
    ocean.dispose();
  }
});
