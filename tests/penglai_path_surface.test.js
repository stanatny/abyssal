import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createPenglaiOcean } from "../src/penglai_ocean.js";
import { PENGLAI_SUMMIT_ROUTES } from "../src/penglai_routes.js";
import { PENGLAI_WORLD as W } from "../src/penglai_config.js";

// 与实际线性纹理采样一致，沿全部路线检查连续覆盖，包含旧薄片穿山的北岳段。
function coverage(texture, x, z) {
  const { width, height, data } = texture.image,
    u = ((x - W.minX) / (W.maxX - W.minX)) * width - 0.5,
    v = ((z - W.minZ) / (W.maxZ - W.minZ)) * height - 0.5,
    ix = Math.floor(u),
    iz = Math.floor(v),
    fx = u - ix,
    fz = v - iz,
    at = (dx, dz) => data[(iz + dz) * width + ix + dx] / 255;
  return (
    (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fz) +
    (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fz
  );
}

test("All six summit paths continuously cover their real terrain, without overlay surfaces", () => {
  const ocean = createPenglaiOcean(new THREE.Group());
  try {
    const strips = ocean.root.children.filter(
        (n) => n.name === "same_source_mountain_floor",
      ),
      texture = strips[0].material.userData.summitPathTexture;
    assert.equal(strips.length, 20);
    assert.ok(
      strips.every((n) => n.material.userData.summitPathTexture === texture),
    );
    assert.equal(
      ocean.root.getObjectByName("continuous_summit_stone_paths"),
      undefined,
    );
    for (const [r, route] of PENGLAI_SUMMIT_ROUTES.entries()) {
      for (let i = 1; i < route.points.length; i++) {
        const a = route.points[i - 1],
          b = route.points[i],
          count = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) * 2);
        for (let j = 0; j <= count; j++) {
          const t = j / count,
            x = a.x + (b.x - a.x) * t,
            z = a.z + (b.z - a.z) * t;
          assert.ok(coverage(texture, x, z) > 0.95, `gap ${r}/${i}/${j}`);
        }
      }
    }
    assert.equal(coverage(texture, 0, -650), 0);
    assert.equal(coverage(texture, 0, -1030), 0);
    assert.equal(coverage(texture, -480, 0), 0);
  } finally {
    ocean.dispose();
  }
});

test("Stone paths use filtered bounded texture ownership and retain depth-tested terrain", () => {
  const ocean = createPenglaiOcean(new THREE.Group()),
    terrain = ocean.root.getObjectByName("same_source_mountain_floor"),
    texture = terrain.material.userData.summitPathTexture;
  assert.equal(texture.image.data.byteLength, 1024 * 1024);
  assert.equal(texture.format, THREE.RedFormat);
  assert.equal(texture.generateMipmaps, true);
  assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
  assert.equal(texture.magFilter, THREE.LinearFilter);
  assert.equal(terrain.material.depthTest, true);
  assert.equal(terrain.material.depthWrite, true);
  assert.equal(terrain.material.polygonOffset, false);
  let disposals = 0;
  texture.addEventListener("dispose", () => disposals++);
  ocean.dispose();
  ocean.dispose();
  assert.equal(disposals, 1);
  const replacement = createPenglaiOcean(new THREE.Group());
  try {
    assert.notEqual(
      replacement.root.getObjectByName("same_source_mountain_floor").material
        .userData.summitPathTexture,
      texture,
    );
  } finally {
    replacement.dispose();
  }
});
