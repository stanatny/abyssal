import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { PENGLAI_LANDMARK_SITES } from "../src/penglai_landmark_sites.js";
import { PENGLAI_GUARDIANS } from "../src/penglai_config.js";
import { resolveMotion, bodyRadius } from "../src/collision.js";
import { setLanguage, t } from "../src/i18n.js";

test("All three guardian landmarks are grounded in rendered terrain, opaque and bounded", () => {
  const o = createPenglaiOcean(new THREE.Group());
  let meshes = 0,
    triangles = 0;
  try {
    for (const site of PENGLAI_LANDMARK_SITES) {
      const root = o.root.getObjectByName(site.id);
      assert.ok(root);
      root.updateMatrixWorld(true);
      assert.ok(o.landmarks.some((l) => l.name === site.name));
      for (const f of root.userData.foundations) {
        for (let x = -f.w / 2; x <= f.w / 2; x += 3)
          for (let z = -f.d / 2; z <= f.d / 2; z += 3) {
            if (f.round && (x / (f.w / 2)) ** 2 + (z / (f.d / 2)) ** 2 > 1)
              continue;
            const p = root.localToWorld(new THREE.Vector3(f.x + x, 0, f.z + z)),
              h = o.groundHeightAt(p.x, p.z);
            assert.ok(
              h > f.low - 0.1 && h < f.top + 0.1,
              `${site.id} support ${x},${z}: ${h}`,
            );
          }
      }
      root.traverse((n) => {
        if (!n.isMesh) return;
        meshes++;
        triangles +=
          (n.geometry.index?.count ?? n.geometry.attributes.position.count) / 3;
        assert.equal(n.material.transparent, false);
        assert.equal(n.material.depthWrite, true);
        for (const key of ["position", "normal"])
          assert.ok(
            [...n.geometry.attributes[key].array].every(Number.isFinite),
          );
      });
    }
    assert.ok(meshes <= 18, `meshes ${meshes}`);
    assert.ok(triangles < 80000, `triangles ${triangles}`);
  } finally {
    o.dispose();
  }
});

test("Thirty-metre bodies traverse both open gates and guardian homes stay clear of new solids", () => {
  const o = createPenglaiOcean(new THREE.Group());
  try {
    const own = o.colliders.filter((c) =>
      c.kind?.startsWith("guardian_landmark_"),
    );
    for (const guardian of PENGLAI_GUARDIANS) {
      const [x, y, z] = guardian.home,
        p = { x, y, z },
        r = resolveMotion(p, p, {
          colliders: own,
          length: 30,
          radius: bodyRadius(30),
          forward: { x: 0, y: 0, z: 1 },
        });
      assert.equal(r.recovered, false, guardian.id);
      assert.equal(r.stuck, false, guardian.id);
    }
    for (const site of PENGLAI_LANDMARK_SITES.slice(0, 2)) {
      const root = o.root.getObjectByName(site.id);
      root.updateMatrixWorld(true);
      const y = site.id === "azure_cloud_gate" ? 270 : 103;
      for (const direction of [-1, 1]) {
        const a = root.localToWorld(new THREE.Vector3(0, y, direction * 60)),
          b = root.localToWorld(new THREE.Vector3(0, y, -direction * 60)),
          forward = b.clone().sub(a).normalize();
        const motion = resolveMotion(a, b, {
          colliders: o.colliders,
          length: 30,
          radius: bodyRadius(30),
          forward,
        });
        assert.ok(
          new THREE.Vector3(
            motion.position.x,
            motion.position.y,
            motion.position.z,
          ).distanceTo(b) < 0.01,
          `${site.id} gate blocked`,
        );
      }
    }
  } finally {
    o.dispose();
  }
});

test("Landmark resources dispose once; a second region stays valid; bilingual names use shared translations", () => {
  const a = createPenglaiOcean(new THREE.Group()),
    b = createPenglaiOcean(new THREE.Group()),
    resources = new Set(),
    counts = new Map();
  try {
    for (const s of PENGLAI_LANDMARK_SITES)
      a.root.getObjectByName(s.id).traverse((n) => {
        if (n.isMesh) {
          resources.add(n.geometry);
          resources.add(n.material);
        }
      });
    for (const r of resources) {
      counts.set(r, 0);
      r.addEventListener("dispose", () => counts.set(r, counts.get(r) + 1));
    }
    for (const lang of ["en", "zh-CN"]) {
      setLanguage(lang);
      for (const s of PENGLAI_LANDMARK_SITES)
        assert.equal(/[\u4e00-\u9fff]/.test(t(s.name)), lang === "zh-CN");
    }
    a.dispose();
    a.dispose();
    assert.ok([...counts.values()].every((n) => n === 1));
    for (const s of PENGLAI_LANDMARK_SITES)
      b.root.getObjectByName(s.id).traverse((n) => {
        if (n.isMesh) {
          assert.ok(!resources.has(n.geometry));
          assert.ok(!resources.has(n.material));
        }
      });
  } finally {
    a.dispose();
    b.dispose();
    setLanguage("zh-CN");
  }
});
