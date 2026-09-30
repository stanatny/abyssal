import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisOutskirts } from "../src/atlantis_outskirts.js";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { GEOMETRIES } from "../src/atlantis_art_geometry.js";
import { createStaticColliderGrid } from "../src/static_collider_grid.js";
import { castSegment, isPositionBlocked } from "../src/collision.js";
import { atlantisSeabedHeight as seabedHeight } from "../src/atlantis_terrain.js";
import { WORLD } from "../src/world_config.js";

test("Outskirts occupy legal peripheral clearings and leave nursery, avenue and arena open", () => {
  const scene = new THREE.Scene();
  const city = createAtlantisCity(scene, { heightAt: seabedHeight });
  const occupied = [
    ...city.colliders,
    { type: "sphere", x: -271, y: -100, z: -164, radius: 7 },
    {
      type: "box",
      x: 271,
      y: -200,
      z: -252,
      halfSize: { x: 12, y: 20, z: 12 },
    },
  ];
  const grid = createStaticColliderGrid(occupied);
  const outskirts = createAtlantisOutskirts(scene, {
    heightAt: seabedHeight,
    occupiedColliders: occupied,
  });
  assert.ok(outskirts.anchors.length >= 20);
  assert.equal(new Set(outskirts.anchors.map((anchor) => anchor.kind)).size, 3);
  for (const anchor of outskirts.anchors) {
    assert.ok(
      (Math.abs(anchor.x) >= 246 && anchor.z <= -164) || anchor.z < -1080,
      "No new scenery in the nursery or central city",
    );
    assert.ok(anchor.x - anchor.radius >= WORLD.minX);
    assert.ok(anchor.x + anchor.radius <= WORLD.maxX);
    assert.ok(anchor.z - anchor.radius >= WORLD.minZ);
    assert.equal(
      grid.query(anchor, undefined, { padding: anchor.radius }).length,
      0,
    );
  }
  for (let z = 120; z > -1080; z -= 10)
    for (const x of [-60, 0, 60])
      assert.equal(
        isPositionBlocked(
          { x, y: seabedHeight(x, z) + 15, z },
          {
            colliders: outskirts.colliders,
            radius: 6,
          },
        ),
        false,
      );
  assert.ok(outskirts.stats.pointLights === 0);
  assert.ok(outskirts.stats.meshes < 70);
  assert.ok(outskirts.stats.triangles < 220000);
  assert.ok(outskirts.stats.colliders < 150);
  outskirts.root.traverse((node) => assert.ok(!node.isLight));
  outskirts.dispose();
  city.dispose();
});

test("Fully occupied outskirts create no overlapping scenery", () => {
  const scene = new THREE.Scene();
  const outskirts = createAtlantisOutskirts(scene, {
    heightAt: seabedHeight,
    occupiedColliders: [
      {
        type: "box",
        x: 0,
        y: -300,
        z: -600,
        halfSize: { x: 310, y: 500, z: 600 },
      },
    ],
  });
  assert.equal(outskirts.anchors.length, 0);
  assert.equal(outskirts.colliders.length, 0);
  assert.equal(outskirts.stats.meshes, 0);
  outskirts.dispose();
});

test("Low ruins have close fitting collision, finite geometry and visible carved silhouettes", () => {
  const scene = new THREE.Scene();
  const outskirts = createAtlantisOutskirts(scene, { heightAt: () => -100 });
  scene.updateMatrixWorld(true);
  const solids = [];
  outskirts.root.traverse((node) => {
    if (!node.geometry) return;
    for (const attribute of Object.values(node.geometry.attributes))
      assert.ok(attribute.array.every(Number.isFinite));
    if (node.name === "outskirts_atlantis_stone") solids.push(node);
  });
  const ray = new THREE.Raycaster();
  for (const collider of outskirts.colliders) {
    const start = { x: collider.x, y: collider.y + 12, z: collider.z };
    const end = { ...start, y: collider.y - 12 };
    const hit = castSegment(start, end, outskirts.colliders);
    assert.ok(hit);
    ray.set(
      new THREE.Vector3(start.x, start.y, start.z),
      new THREE.Vector3(0, -1, 0),
    );
    const visible = ray.intersectObjects(solids)[0];
    assert.ok(
      visible,
      "Every remnant collider follows a visible stone surface",
    );
    assert.ok(
      Math.abs(visible.point.y - hit.point.y) < 0.6,
      "Collision follows stone relief within 0.6 world meters",
    );
  }
  const column = GEOMETRIES.get("outskirts_broken_column_v1");
  const stele = GEOMETRIES.get("outskirts_stele_v1");
  const sponge = GEOMETRIES.get("outskirts_hollow_sponge_v1");
  assert.ok(column.attributes.position.count > 300);
  assert.ok(stele.attributes.position.count > 100);
  assert.ok(sponge.attributes.position.count > 180);
  assert.ok(GEOMETRIES.get("outskirts_stele_inscription_v1"));
  outskirts.dispose();
});

test("Animation uses only supplied elapsed time and culling leaves nearby gardens visible", () => {
  const outskirts = createAtlantisOutskirts(new THREE.Scene(), {
    heightAt: seabedHeight,
  });
  const anchor = outskirts.anchors[0];
  let growth;
  outskirts.root.traverse((node) => {
    if (node.name === "outskirts_atlantis_growth") growth = node.material;
  });
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
  growth.onBeforeCompile(shader, null);
  outskirts.update(17, anchor, 1 / 60, true);
  assert.equal(shader.uniforms.outskirtsTime.value, 17);
  outskirts.update(17, anchor, 0, false);
  assert.equal(shader.uniforms.outskirtsTime.value, 17);
  assert.ok(outskirts.root.children.some((chunk) => chunk.visible));
  assert.ok(outskirts.root.children.some((chunk) => !chunk.visible));
  outskirts.update(18, anchor, 1 / 60, true);
  assert.equal(shader.uniforms.outskirtsTime.value, 18);
  outskirts.dispose();
  outskirts.update(999, anchor);
  assert.equal(shader.uniforms.outskirtsTime.value, 18);
});

test("Each outskirts releases private resources once while preserving cached parts and other instances", () => {
  const scene = new THREE.Scene();
  const first = createAtlantisOutskirts(scene, { heightAt: seabedHeight });
  const second = createAtlantisOutskirts(scene, { heightAt: seabedHeight });
  const resources = new Map();
  first.root.traverse((node) => {
    for (const resource of [node.geometry, node.material]) {
      if (!resource || resources.has(resource)) continue;
      resources.set(resource, 0);
      resource.addEventListener("dispose", () =>
        resources.set(resource, resources.get(resource) + 1),
      );
    }
  });
  let cachedDisposals = 0;
  const listener = () => cachedDisposals++;
  const shared = [...GEOMETRIES.values()];
  shared.forEach((geometry) => geometry.addEventListener("dispose", listener));
  first.dispose();
  first.dispose();
  assert.equal(first.root.parent, null);
  assert.equal(scene.children.length, 1);
  assert.equal(cachedDisposals, 0);
  for (const count of resources.values()) assert.equal(count, 1);
  second.update(5, second.anchors[0]);
  assert.ok(second.root.children.some((chunk) => chunk.visible));
  second.dispose();
  assert.equal(scene.children.length, 0);
  assert.equal(cachedDisposals, 0);
  shared.forEach((geometry) =>
    geometry.removeEventListener("dispose", listener),
  );
});
