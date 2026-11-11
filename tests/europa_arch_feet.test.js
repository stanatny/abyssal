import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as THREE from "three";
import {
  createEuropaOcean,
  createEuropaOceanAsync,
} from "../src/europa_ocean.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import {
  EUROPA_EXPANSE_SCALE as S,
  europaLayoutSeabedHeight,
} from "../src/europa_config.js";

const arches = [
  [-115, -170, 75],
  [115, -390, 135],
  [-110, -595, 205],
];

function originalArch(x, z, h) {
  const g = new THREE.TorusGeometry(85, 13, 12, 60, Math.PI);
  g.scale(1, h / 85, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2((p.getY(i) * 85) / h, p.getX(i)),
      variation = 1 + Math.sin(a * 7) * 0.012;
    p.setXYZ(i, p.getX(i) * variation, p.getY(i) * variation, p.getZ(i));
  }
  g.translate(x, europaLayoutSeabedHeight(x, z), z);
  g.computeVertexNormals();
  return g;
}

function distanceToCapsule(point, c) {
  const ab = new THREE.Vector3().subVectors(c.b, c.a),
    ap = new THREE.Vector3().subVectors(point, c.a),
    t = THREE.MathUtils.clamp(ap.dot(ab) / ab.lengthSq(), 0, 1);
  return point.distanceTo(new THREE.Vector3().copy(c.a).addScaledVector(ab, t));
}

test("Europa keeps all original arch curves and solids, closing only exposed feet into the actual floor", () => {
  const ocean = createEuropaOcean(new THREE.Group()),
    heightAt = createTerrainSurface(ocean.root, { fallback: ocean.heightAt }),
    v = new THREE.Vector3();
  try {
    const originalSolids = ocean.colliders.filter(
        (c) => c.kind !== "arch_foot",
      ),
      feetSolids = ocean.colliders.filter((c) => c.kind === "arch_foot");
    assert.equal(originalSolids.length, 822);
    assert.equal(
      createHash("sha256").update(JSON.stringify(originalSolids)).digest("hex"),
      "38b0685f78ace5a23cf81179bfd749b8c07157fde1814b14ce9f089952352127",
    );
    assert.deepEqual(ocean.colliders.slice(0, 822), originalSolids);
    assert.equal(feetSolids.length, 54);
    for (const [x, z, h] of arches) {
      const mesh = ocean.root.getObjectByName(`europa_continuous_arch_${z}`),
        g = mesh.geometry,
        original = originalArch(x, z, h),
        p = g.attributes.position,
        n = g.attributes.normal,
        uv = g.attributes.uv,
        originalCount = original.attributes.position.count;
      for (const key of ["position", "normal", "uv"])
        assert.deepEqual(
          g.attributes[key].array.slice(
            0,
            original.attributes[key].array.length,
          ),
          original.attributes[key].array,
          `${z}: original ${key} prefix`,
        );
      assert.deepEqual(
        g.index.array.slice(0, original.index.count),
        original.index.array,
      );
      assert.equal(mesh.userData.feet.length, 2);
      assert.equal(p.count, originalCount + 2 * 40);
      assert.equal(g.index.count, original.index.count + 2 * 108);
      for (let fi = 0; fi < 2; fi++) {
        const foot = mesh.userData.feet[fi],
          footColliders = feetSolids.filter((c) =>
            c.id.startsWith(`${foot.id}_foot_`),
          ),
          start = originalCount + fi * 40;
        assert.equal(footColliders.length, 9);
        assert.ok(foot.maximumOriginalGap > 20);
        for (let i = start; i < start + 40; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld);
          assert.ok(
            footColliders.some(
              (c) => distanceToCapsule(v, c) <= c.radius + 1e-5,
            ),
            `${z} foot ${fi}: visible vertex ${i} outside collision`,
          );
          assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)));
          assert.ok(
            Math.abs(n.getX(i) ** 2 + n.getY(i) ** 2 + n.getZ(i) ** 2 - 1) <
              1e-5,
          );
        }
        // 全椭圆支撑盘比十二边形底盖略大，逐点检查更保守的最终地面包覆。
        for (let dx = -13; dx <= 13; dx += 0.4)
          for (let dz = -26; dz <= 26; dz += 0.4) {
            if ((dx / 13) ** 2 + (dz / 26) ** 2 > 1) continue;
            v.set(foot.top[0] + dx, foot.bottom, foot.top[2] + dz).applyMatrix4(
              mesh.matrixWorld,
            );
            assert.ok(v.y < heightAt(v.x, v.z) - 1, `${z}: exposed cap`);
          }
        for (let j = 0; j <= 12; j++) {
          const originalId = j * 61 + (fi === 0 ? 0 : 60);
          for (const [a, count] of [
            [p, 3],
            [n, 3],
            [uv, 2],
          ])
            for (let k = 0; k < count; k++)
              assert.equal(
                a.array[(start + j) * count + k],
                a.array[originalId * count + k],
              );
        }
        // 连续椭圆边界也必须落在胶囊束内，而不是只包住少量网格顶点。
        for (let j = 0; j < 720; j++) {
          const a = (j / 720) * Math.PI * 2;
          v.set(
            foot.top[0] + Math.cos(a) * 13,
            (foot.top[1] + foot.bottom) / 2,
            foot.top[2] + Math.sin(a) * 26,
          ).applyMatrix4(mesh.matrixWorld);
          assert.ok(
            footColliders.some((c) => distanceToCapsule(v, c) <= c.radius),
          );
        }
        for (const c of footColliders) {
          assert.ok(c.radius < 13.11 * S);
          assert.ok(Math.abs(c.a.x - foot.top[0] * S) < 1e-6);
        }
      }
      const a = new THREE.Vector3(),
        b = new THREE.Vector3(),
        c = new THREE.Vector3(),
        expected = new THREE.Vector3(),
        normal = new THREE.Vector3();
      for (let i = original.index.count; i < g.index.count; i += 3) {
        const ids = [0, 1, 2].map((j) => g.index.getX(i + j));
        a.fromBufferAttribute(p, ids[0]);
        b.fromBufferAttribute(p, ids[1]);
        c.fromBufferAttribute(p, ids[2]);
        normal.subVectors(b, a).cross(c.clone().sub(a)).normalize();
        expected.set(0, 0, 0);
        for (const id of ids) expected.add(v.fromBufferAttribute(n, id));
        assert.ok(
          normal.dot(expected.normalize()) > 0.85,
          `${z}: inward foot triangle`,
        );
      }
      // 原拱下中心净高超过七十米，脚座只延续原脚盘，不侵入此洞口。
      const crown = new THREE.Vector3(
          x,
          europaLayoutSeabedHeight(x, z) + h * (1 - 13 / 85),
          z,
        ).applyMatrix4(mesh.matrixWorld),
        floor = heightAt(crown.x, crown.z);
      assert.ok(crown.y - floor > 70);
      assert.ok(
        !feetSolids.some((c) => distanceToCapsule(crown, c) < c.radius + 30),
      );
      original.dispose();
    }
  } finally {
    heightAt.dispose();
    ocean.dispose();
  }
});

test("Europa feet share original meshes/materials and release merged geometry exactly once, including canceled preparation", async () => {
  const parent = new THREE.Group(),
    ocean = createEuropaOcean(parent),
    meshes = arches.map(([, z]) =>
      ocean.root.getObjectByName(`europa_continuous_arch_${z}`),
    ),
    disposed = new Map();
  assert.equal(new Set(meshes.map((m) => m.material)).size, 1);
  for (const m of meshes)
    m.geometry.addEventListener("dispose", () =>
      disposed.set(m, (disposed.get(m) || 0) + 1),
    );
  ocean.dispose();
  ocean.dispose();
  assert.equal(parent.children.length, 0);
  assert.equal(ocean.colliders.length, 0);
  assert.equal(disposed.size, 3);
  assert.ok([...disposed.values()].every((n) => n === 1));
  const cancel = new THREE.Group();
  let lastLabel,
    canceledDisposals = 0;
  await assert.rejects(
    createEuropaOceanAsync(cancel, {
      budgetMs: 0,
      onStep(label) {
        lastLabel = label;
        if (label !== "arch") return;
        const mesh = cancel.getObjectByName("europa_continuous_arch_-170");
        mesh.geometry.addEventListener("dispose", () => canceledDisposals++);
      },
      yieldTask: async () => {
        if (lastLabel === "arch") throw new Error("arch-cancel");
      },
    }),
    /arch-cancel/,
  );
  assert.equal(cancel.children.length, 0);
  assert.equal(canceledDisposals, 1);
});
