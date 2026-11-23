import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as THREE from "three";
import packed from "../src/assets/models/bermuda_sleeping_titan_hf_mesh.json" with { type: "json" };
import { acquireBermudaSleepingTitanAsset } from "../src/bermuda_sleeping_titan_asset.js";
import { createBermudaSleepingTitan } from "../src/bermuda_sleeping_titan.js";
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import { createBermudaTitanRelic } from "../src/bermuda_titan_relic.js";
import { castSegment, isPositionBlocked } from "../src/collision.js";

let terrain, terrainMesh, heightAt;
function floor() {
  if (!heightAt) {
    terrain = new THREE.Group();
    terrainMesh = new THREE.Mesh(createBermudaTerrainMesh());
    terrainMesh.userData.terrainContact = true;
    terrain.add(terrainMesh);
    heightAt = createTerrainSurface(terrain, { fallback: bermudaSeabedHeight });
  }
  return heightAt;
}
after(() => {
  heightAt?.dispose();
  terrainMesh?.geometry.dispose();
  terrainMesh?.material.dispose();
});
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("World dynamic contacts forward swept and explicit whole-AABB query semantics without changing dimensions", () => {
  const titan = createBermudaSleepingTitan(new THREE.Group(), {
      heightAt: floor(),
    }),
    original = titan.front.queryDynamicContacts,
    calls = [];
  titan.front.queryDynamicContacts = (a, b, dimensions) => {
    calls.push(dimensions);
    return [];
  };
  try {
    titan.dynamicContacts(titan.collectionDock, titan.collectionDock, {
      radius: 3,
      padding: 7,
    });
    titan.dynamicContacts(titan.collectionDock, titan.collectionDock, {
      radius: 0,
      padding: 0.25,
      segment: false,
    });
    assert.deepEqual(calls, [
      { radius: 3 / 280, padding: 7 / 280, segment: true },
      { radius: 0, padding: 0.25 / 280, segment: false },
    ]);
  } finally {
    titan.front.queryDynamicContacts = original;
    titan.dispose();
  }
});

test("Sleeping titan keeps its HF source, real geometry and bounded distant LOD", async () => {
  const asset = acquireBermudaSleepingTitanAsset();
  try {
    const span = asset.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(Math.abs(span.z - 1) < 0.002);
    assert.ok(span.x > 0.3 && span.x < 0.5);
    assert.ok(span.y > 0.15 && span.y < 0.3);
    assert.ok(asset.geometry.index.count / 3 <= 30000);
    assert.ok(asset.farGeometry.index.count / 3 <= 5100);
    assert.equal(
      asset.geometry.attributes.position,
      asset.farGeometry.attributes.position,
    );
    assert.equal(asset.geometry.attributes.skinIndex, undefined);
    for (const texture of Object.values(packed.pbr.textures)) {
      const bytes = await readFile(
        new URL(`../src/assets/models/${texture.file}`, import.meta.url),
      );
      assert.equal(hash(bytes), texture.sha256);
      assert.match(texture.sourceSha256, /^[a-f0-9]{64}$/);
    }
    assert.deepEqual(Object.keys(packed.pbr.textures).sort(), [
      "color",
      "metallic_roughness",
    ]);
    assert.equal(packed.sourceNormalization.yaw, Math.PI);
    assert.equal(
      packed.sourceSha256,
      "768a14520f4ac9f99231fb235d960da13ae140e92ab0b195dd2a679bf6eb03ff",
      "Keep the inspected second, single-tail HF candidate",
    );
  } finally {
    asset.release();
  }
});

test("Approved whole source is one continuous skinned body and fixed world contacts never move", () => {
  const titan = createBermudaSleepingTitan(new THREE.Group(), {
    heightAt: floor(),
  });
  try {
    titan.root.updateMatrixWorld(true);
    assert.equal(titan.near.isSkinnedMesh, true);
    assert.equal(titan.near.name, "bermuda_whole_hf_near");
    assert.equal(titan.near.geometry.index.count / 3, 28842);
    assert.equal(titan.near.geometry.attributes.position.count, 32265);
    assert.equal(titan.pose.scale.x, 280);
    assert.equal(
      titan.rearNear,
      null,
      "No assembled bust/rear seam or second visible body",
    );
    assert.equal(titan.rearFar, null);
    assert.equal(titan.beds.length, 1);
    assert.equal(titan.beds[0], titan.treasureRock);
    const before = JSON.stringify(titan.colliders),
      base = titan.pose.matrix.clone();
    for (const state of [
      { guardAmount: 0, awareness: 0 },
      { guardAmount: 1, awareness: 1 },
    ]) {
      titan.setPose(state);
      assert.equal(JSON.stringify(titan.colliders), before);
      assert.deepEqual(titan.pose.matrix.toArray(), base.toArray());
    }
    assert.ok(titan.colliders.every((c) => !c.dynamic));
    assert.ok(titan.colliders.every((c) => c.titanBreathIgnore));
    assert.ok(
      titan.dynamicContacts(titan.collectionDock, titan.collectionDock, {
        radius: 6,
        padding: 20,
      }).length > 0,
    );
    assert.deepEqual(
      titan.dynamicContacts(new THREE.Vector3(300, -20, -200)),
      [],
    );
  } finally {
    titan.dispose();
  }
});

test("Both resting rock surfaces have actual contact and do not form invisible water walls", () => {
  const titan = createBermudaSleepingTitan(new THREE.Group(), {
    heightAt: floor(),
  });
  try {
    titan.root.updateMatrixWorld(true);
    for (const bed of titan.beds) {
      const mesh = bed.mesh,
        pos = mesh.geometry.attributes.position,
        idx = mesh.geometry.index,
        t = new THREE.Triangle(),
        p = new THREE.Vector3(),
        normal = new THREE.Vector3(),
        ray = new THREE.Raycaster();
      let checked = 0;
      for (let i = 0; i < idx.count; i += 6) {
        t.a.fromBufferAttribute(pos, idx.getX(i));
        t.b.fromBufferAttribute(pos, idx.getX(i + 1));
        t.c.fromBufferAttribute(pos, idx.getX(i + 2));
        t.getMidpoint(p);
        t.getNormal(normal);
        if (p.y < floor()(p.x, p.z) + 2) continue;
        assert.ok(
          isPositionBlocked(p, { radius: 0.6, colliders: bed.contacts }),
        );
        const start = p.clone().addScaledVector(normal, 5),
          end = p.clone().addScaledVector(normal, -5);
        ray.set(start, end.clone().sub(start).normalize());
        ray.far = 10;
        const visible = ray.intersectObject(mesh)[0],
          hit = castSegment(start, end, bed.contacts);
        if (visible && hit && hit.distance < visible.distance) {
          // 凹岩床的面法线可走进相邻更高的实心岩体；体内点不是外部水域，也不是隐形墙。
          const actualTop = bed.topAt(hit.point.x, hit.point.z);
          if (actualTop !== null && hit.point.y <= actualTop + 1e-6) continue;
          let nearest = Infinity;
          if (visible.distance - hit.distance > 2.01) {
            const face = new THREE.Triangle(),
              q = new THREE.Vector3();
            for (let j = 0; j < idx.count; j += 3) {
              face.a.fromBufferAttribute(pos, idx.getX(j));
              face.b.fromBufferAttribute(pos, idx.getX(j + 1));
              face.c.fromBufferAttribute(pos, idx.getX(j + 2));
              nearest = Math.min(
                nearest,
                face
                  .closestPointToPoint(new THREE.Vector3().copy(hit.point), q)
                  .distanceTo(hit.point),
              );
            }
          }
          assert.ok(
            visible.distance - hit.distance <= 2.01 || nearest <= 2.01,
            `bed normal=${visible.distance - hit.distance}, nearest=${nearest}, contact=${hit.collider?.id}, point=${JSON.stringify(hit.point)}`,
          );
        }
        checked++;
      }
      assert.ok(checked > 10);
    }
  } finally {
    titan.dispose();
  }
});

test("The whole source rests on the actual original terrain while one visible fitted ledge supports its jewel", () => {
  const titan = createBermudaSleepingTitan(new THREE.Group(), {
      heightAt: floor(),
    }),
    gem = createBermudaTitanRelic(),
    point = new THREE.Vector3();
  try {
    const used = new Set(titan.near.geometry.index.array);
    let minimum = Infinity,
      bearings = 0;
    for (const id of used) {
      titan.near
        .getVertexPosition(id, point)
        .applyMatrix4(titan.near.matrixWorld);
      const gap = point.y - floor()(point.x, point.z);
      assert.ok(
        gap >= -0.15,
        `Actual whole skin enters the original terrain at vertex ${id}`,
      );
      minimum = Math.min(minimum, gap);
      if (gap <= 2) bearings++;
    }
    assert.ok(
      minimum >= 0.119 && minimum <= 0.121,
      `Whole-source support gap ${minimum}`,
    );
    assert.ok(bearings > 10, "The resting body has actual low terrain support");
    assert.equal(titan.beds.length, 1);
    const bed = titan.beds[0],
      positions = bed.mesh.geometry.attributes.position;
    let low = Infinity,
      high = -Infinity;
    for (let i = 0; i < positions.count; i++) {
      low = Math.min(low, positions.getY(i));
      high = Math.max(high, positions.getY(i));
    }
    assert.ok(
      high - low > 2,
      "The true ledge follows relief instead of a flat minimum-height platform",
    );
    let jewelLow = Infinity;
    const vertices = gem.root.children[0].geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++)
      jewelLow = Math.min(jewelLow, vertices.getY(i));
    const support = bed.topAt(titan.relicPoint.x, titan.relicPoint.z),
      gap = titan.relicPoint.y + jewelLow - support;
    assert.ok(Number.isFinite(support));
    assert.ok(
      gap >= 0.09 && gap <= 0.11,
      `Actual jewel/ledge support gap ${gap}`,
    );
    assert.ok(support > floor()(titan.relicPoint.x, titan.relicPoint.z));
  } finally {
    gem.dispose();
    titan.dispose();
  }
});

test("Actual visible skin clears the rendered seabed in closed, slack and aware poses", () => {
  const titan = createBermudaSleepingTitan(new THREE.Group(), {
    heightAt: floor(),
  });
  try {
    const p = new THREE.Vector3();
    for (const state of [
      { guardAmount: 1, awareness: 0 },
      { guardAmount: 0, awareness: 0 },
      { guardAmount: 0, awareness: 1 },
    ]) {
      titan.setPose(state);
      titan.root.updateMatrixWorld(true);
      for (
        let i = 0;
        i < titan.near.geometry.attributes.position.count;
        i += 7
      ) {
        titan.near.getVertexPosition(i, p);
        p.applyMatrix4(titan.near.matrixWorld);
        assert.ok(
          p.y >= floor()(p.x, p.z) - 0.15,
          `Front vertex ${i} clips the actual seabed`,
        );
      }
    }
    assert.equal(
      titan.rearNear,
      null,
      "The posterior is part of the same checked whole skin",
    );
  } finally {
    titan.dispose();
  }
});

test("Awakening and mouth charge use local material feedback without lifting the whole head, and reset restores rest", () => {
  const titan = createBermudaSleepingTitan(new THREE.Group(), {
    heightAt: floor(),
  });
  try {
    const mouth = titan.mouth.clone(),
      direction = titan.direction.clone(),
      matrix = titan.pose.matrixWorld.clone(),
      shader = {
        uniforms: {},
        vertexShader: "#include <begin_vertex>",
        fragmentShader: "#include <emissivemap_fragment>",
      };
    titan.near.material.onBeforeCompile(shader);
    assert.ok(Math.abs(direction.length() - 1) < 1e-12);
    titan.setBreathLean(0.035, -0.035);
    assert.ok(
      titan.mouth.distanceTo(mouth) < 1e-8,
      "Legacy lean must not reintroduce whole-body/head translation",
    );
    titan.setPose({
      guardAmount: 0,
      awareness: 1,
      sleeping: false,
      phase: "charging",
      phaseDuration: 2.5,
      remaining: 1,
    });
    assert.equal(shader.uniforms.titanAwareness.value, 1);
    assert.ok(Math.abs(shader.uniforms.titanCharge.value - 0.6) < 1e-12);
    assert.ok(
      titan.front.bones.paw.rotation.x > 0.3,
      "Only the original real wrist releases",
    );
    assert.equal(titan.root.userData.sleeping, false);
    assert.ok(titan.mouth.distanceTo(mouth) < 1e-8);
    assert.ok(titan.direction.distanceTo(direction) < 1e-8);
    assert.ok(
      titan.mouth.distanceTo(titan.front.getMouthPose().position) < 1e-8,
    );
    assert.deepEqual(titan.pose.matrixWorld.toArray(), matrix.toArray());
    titan.reset();
    assert.ok(titan.mouth.distanceTo(mouth) < 1e-8);
    assert.equal(titan.front.bones.paw.rotation.x, 0);
    assert.equal(shader.uniforms.titanAwareness.value, 0);
    assert.equal(shader.uniforms.titanCharge.value, 0);
    assert.equal(titan.root.userData.sleeping, true);
  } finally {
    titan.dispose();
  }
});
