import test, { after } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createBermudaCaves } from "../src/bermuda_caves.js";
import {
  BERMUDA_CAVE_SITES,
  BERMUDA_TITAN_ENTRANCE,
} from "../src/bermuda_cave_config.js";
import bones from "../src/assets/models/bermuda_titan_bones_hf_mesh.json" with { type: "json" };
import { createBermudaTerrainMesh } from "../src/bermuda_terrain_mesh.js";
import { createTerrainSurface } from "../src/terrain_surface.js";
import { bermudaSeabedHeight } from "../src/bermuda_terrain.js";
import {
  resolveMotion,
  bodyRadius,
  castSegment,
  isPositionBlocked,
} from "../src/collision.js";

const floorGeometry = createBermudaTerrainMesh(),
  floorMaterial = new THREE.MeshBasicMaterial(),
  floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.userData.terrainContact = true;
const heightAt = createTerrainSurface(floor, { fallback: bermudaSeabedHeight });
after(() => {
  heightAt.dispose();
  floorGeometry.dispose();
  floorMaterial.dispose();
});

function make(t) {
  const parent = new THREE.Group(),
    art = createBermudaCaves(parent, { heightAt });
  t.after(() => art.dispose());
  return { parent, art };
}

test("Three closed rock shells retain side-cave portals and the main lair’s single northern entrance", (t) => {
  const { art } = make(t);
  assert.equal(art.records.length, 3);
  assert.equal(art.landmarks.length, 3);
  assert.equal(art.lightSources.length, 9);
  assert.deepEqual(
    art.records.map((r) => r.id),
    BERMUDA_CAVE_SITES.map((s) => s.id),
  );
  art.root.traverse((m) => assert.notEqual(m.userData.terrainContact, true));
  for (const r of art.records) {
    const g = r.shell.geometry,
      p = g.attributes.position,
      edges = new Map();
    for (const v of p.array) assert.ok(Number.isFinite(v));
    for (let i = 0; i < g.index.count; i += 3)
      for (let j = 0; j < 3; j++) {
        const a = g.index.getX(i + j),
          b = g.index.getX(i + ((j + 1) % 3)),
          key = a < b ? `${a}:${b}` : `${b}:${a}`;
        edges.set(key, (edges.get(key) || 0) + 1);
      }
    assert.ok(
      [...edges.values()].every((n) => n === 2),
      r.id + " shell has no unclosed seams",
    );
    assert.ok(r.room.ceilingY - r.frameAt(0.5).floorY > 70);
    for (const [id, t0] of [
      ["south", 0],
      ["north", 1],
    ]) {
      const f = r.frameAt(t0);
      assert.equal(
        isPositionBlocked(
          { x: f.center.x, y: f.floorY + 30, z: f.center.z },
          { colliders: art.colliders, radius: bodyRadius(32) },
        ),
        r.id === "kaiju_lair" && id === "south",
        r.id + "/" + id,
      );
    }
    for (const t0 of [0.2, 0.5, 0.8])
      assert.equal(
        isPositionBlocked(r.interiorAt(t0, 0, 0.5), {
          colliders: art.colliders,
          radius: bodyRadius(32),
        }),
        false,
        r.id + " interior " + t0,
      );
  }
});

test("Both lower and upper passages support grown body motion in either direction and a continuous turn", (t) => {
  const { art } = make(t);
  for (const r of art.records)
    for (const length of [3, 32])
      for (const route of r.routes)
        for (const backwards of [false, true]) {
          const points = backwards ? [...route.points].reverse() : route.points;
          let p = points[0].clone();
          for (const target of points.slice(1)) {
            const direction = target.clone().sub(p).normalize();
            const m = resolveMotion(p, target, {
              colliders: art.colliders,
              radius: bodyRadius(length),
              length,
              forward: direction,
              floorHeight: (x, z) => heightAt(x, z) + bodyRadius(length),
            });
            assert.equal(
              m.blocked,
              false,
              `${r.id}/${route.id}/${length}/${backwards}/${target.toArray()}`,
            );
            assert.equal(m.stuck, false);
            p.copy(m.position);
            assert.ok(p.distanceTo(target) < 0.01);
          }
        }
  for (const r of art.records) {
    let p = r.turnPath[0].clone();
    for (const target of r.turnPath.slice(1)) {
      const m = resolveMotion(p, target, {
        colliders: art.colliders,
        radius: bodyRadius(32),
        length: 32,
        forward: target.clone().sub(p).normalize(),
        floorHeight: (x, z) => heightAt(x, z) + bodyRadius(32),
      });
      assert.equal(m.blocked, false, r.id + " turn");
      assert.equal(m.stuck, false);
      p.copy(m.position);
    }
  }
});

test("Exposed inner roof and wall faces agree with static contacts while native bed covers their low seams", (t) => {
  const { art } = make(t),
    ray = new THREE.Raycaster();
  art.root.updateMatrixWorld(true);
  for (const r of art.records) {
    const center = r.interiorAt(0.5, 0, 0.5),
      up = new THREE.Vector3(
        center.x,
        r.floorMaximum + r.height + 30,
        center.z,
      );
    ray.set(center, new THREE.Vector3(0, 1, 0));
    assert.ok(
      ray.intersectObject(r.shell).length,
      r.id + " visible inner roof",
    );
    assert.ok(
      castSegment(center, up, art.colliders, 0.2),
      r.id + " roof contact",
    );
    const side = center.clone().add(new THREE.Vector3(r.width, 0, 0));
    assert.ok(
      castSegment(center, side, art.colliders, 0.2),
      r.id + " side contact",
    );
    const g = r.shell.geometry,
      p = g.attributes.position,
      v = new THREE.Vector3();
    let floorSeamFaces = 0,
      exposedFaces = 0;
    for (let i = 0; i < g.index.count; i += 12) {
      v.set(0, 0, 0);
      for (let j = 0; j < 3; j++)
        v.add(new THREE.Vector3().fromBufferAttribute(p, g.index.getX(i + j)));
      v.multiplyScalar(1 / 3);
      // 与生产补面相同：贴床一米内的壳脚由真实海床阻挡，不能当成悬空岩壁漏洞。
      if (v.y < heightAt(v.x, v.z) + 1) {
        floorSeamFaces++;
        continue;
      }
      exposedFaces++;
      assert.equal(
        isPositionBlocked(v, { colliders: art.colliders, radius: 0.001 }),
        true,
        `${r.id} face ${i / 3}`,
      );
    }
    assert.ok(
      exposedFaces > 100,
      `${r.id}: exposed wall coverage remains substantial`,
    );
    assert.equal(floorSeamFaces + exposedFaces, Math.ceil(g.index.count / 12));
  }
});

test("Giant activity props remain floor seated and shared HF leases survive repeated disposal", (t) => {
  const parent = new THREE.Group(),
    a = createBermudaCaves(parent, { heightAt }),
    b = createBermudaCaves(parent, { heightAt });
  t.after(() => {
    a.dispose();
    b.dispose();
  });
  const p = new THREE.Vector3();
  a.root.updateMatrixWorld(true);
  for (const row of a.props.fossilRows) {
    let minimum = Infinity;
    const position = row.mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      p.fromBufferAttribute(position, i).applyMatrix4(row.matrix);
      minimum = Math.min(minimum, p.y - heightAt(p.x, p.z));
    }
    assert.ok(Math.abs(minimum + 0.18) < 0.001);
  }
  assert.equal(
    a.props.plateRows.length,
    0,
    "Discarded procedural titan plates must not return",
  );
  assert.ok(a.props.fossilRows.length >= 8);
  let lights = 0;
  a.root.traverse((m) => {
    if (m.isPointLight) lights++;
  });
  assert.equal(lights, 0);
  const source = a.props.fossilRows[0].mesh.geometry,
    boneSource = a.props.skeletons[0].mesh.geometry;
  assert.equal(source, b.props.fossilRows[0].mesh.geometry);
  assert.equal(boneSource, b.props.skeletons[0].mesh.geometry);
  let freed = 0;
  source.addEventListener("dispose", () => freed++);
  boneSource.addEventListener("dispose", () => freed++);
  a.dispose();
  a.dispose();
  assert.equal(freed, 0);
  assert.equal(a.colliders.length, 0);
  assert.equal(parent.children.length, 1);
  b.dispose();
  assert.equal(freed, 2);
  assert.equal(parent.children.length, 0);
});

test("Cave dressing uses real ribcage spans and bounded shared HF relief while all water lanes stay clear", (t) => {
  const { art } = make(t);
  assert.equal(art.props.skeletons.length, 2);
  assert.equal(art.root.getObjectByName("giant_prey_ribcages"), undefined);
  assert.deepEqual(
    art.props.skeletons.map((row) => row.length),
    [60, 44],
  );
  const boneBatch = art.props.detailBatches.find(
      (batch) => batch.kind === "titan_bones",
    ),
    point = new THREE.Vector3(),
    matrix = new THREE.Matrix4(),
    scale = new THREE.Vector3(),
    position = new THREE.Vector3(),
    rotation = new THREE.Quaternion();
  assert.ok(boneBatch);
  assert.equal(boneBatch.near.name, "bermuda_hf_bones_close");
  assert.equal(boneBatch.far.name, "bermuda_hf_bones_distant");
  assert.equal(boneBatch.near.geometry.index.count / 3, bones.triangles);
  assert.equal(boneBatch.far.geometry.index.count / 3, bones.farTriangles);
  assert.equal(boneBatch.nearMaterial, boneBatch.asset.material);
  art.root.traverse((node) =>
    assert.notEqual(node.geometry?.type, "TubeGeometry"),
  );
  for (const row of art.props.skeletons) {
    const contacts = art.colliders.filter((c) =>
      c.id.startsWith(`${row.site.id}_hf_bone_${row.index}_`),
    );
    assert.equal(contacts.length, bones.contacts.length);
    row.mesh.getMatrixAt(row.index, matrix);
    for (let i = 0; i < 16; i++)
      assert.ok(Math.abs(matrix.elements[i] - row.matrix.elements[i]) < 0.0001);
    row.farMesh.getMatrixAt(row.index, matrix);
    for (let i = 0; i < 16; i++)
      assert.ok(Math.abs(matrix.elements[i] - row.matrix.elements[i]) < 0.0001);
    row.matrix.decompose(position, rotation, scale);
    for (const component of scale.toArray())
      assert.ok(Math.abs(component - row.length) < 1e-8);
    const world = new THREE.Box3();
    let minimum = Infinity;
    for (const geometry of [row.mesh.geometry, row.farMesh.geometry]) {
      const p = geometry.attributes.position,
        ids = [...new Set(geometry.index.array)];
      for (const i of ids) {
        point.fromBufferAttribute(p, i).applyMatrix4(row.matrix);
        world.expandByPoint(point);
        minimum = Math.min(minimum, point.y - heightAt(point.x, point.z));
      }
      for (let j = 0; j < ids.length; j += 11) {
        point.fromBufferAttribute(p, ids[j]).applyMatrix4(row.matrix);
        assert.ok(
          isPositionBlocked(point, { colliders: contacts, radius: 0.03 }),
          `${row.site.id} real HF bone vertex ${ids[j]}`,
        );
      }
    }
    assert.ok(
      Math.abs(minimum + 0.18) < 0.005,
      row.site.id + " skeleton minimum floor seating",
    );
    assert.ok(
      world.getSize(point).z >= row.length * 0.9,
      row.site.id + " actual long-axis span",
    );
    assert.ok(
      world.getSize(point).x >= row.length * 0.35,
      row.site.id + " actual rib spread",
    );
    assert.ok(
      row.footSupports.length <= 10,
      row.site.id + " bounded natural bone supports",
    );
    assert.ok(
      row.maximumFootGap <= 3.5,
      row.site.id + " low bones must remain close to the real bed",
    );
    const p = row.mesh.geometry.attributes.position,
      ray = new THREE.Raycaster();
    for (const support of row.footSupports) {
      const x = support.position.x,
        z = support.position.z;
      let boneFootY = Infinity;
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i).applyMatrix4(row.matrix);
        if (Math.hypot(point.x - x, point.z - z) < 0.02)
          boneFootY = Math.min(boneFootY, point.y);
      }
      assert.ok(
        Number.isFinite(boneFootY),
        "Support must belong to an actual bone foot",
      );
      const batch = art.props.detailBatches.find((b) =>
          b.rows.includes(support),
        ),
        mesh = new THREE.Mesh(batch.near.geometry, batch.nearMaterial);
      mesh.matrix.copy(support.matrix);
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrixWorld(true);
      ray.set(
        new THREE.Vector3(x, boneFootY + 10, z),
        new THREE.Vector3(0, -1, 0),
      );
      const hit = ray.intersectObject(mesh)[0];
      assert.ok(
        hit,
        row.site.id + " actual HF rock must lie beneath its bone foot",
      );
      assert.ok(
        boneFootY - hit.point.y < 0.5,
        row.site.id + " visible rock-to-bone support gap",
      );
    }
  }
  const main = art.records.find((record) => record.id === "kaiju_lair"),
    mainBounds = new THREE.Box3().setFromBufferAttribute(
      main.shell.geometry.attributes.position,
    ),
    entryMaxZ = Math.max(
      ...BERMUDA_TITAN_ENTRANCE.layers.map((layer) => layer.z + layer.depth),
    );
  for (const batch of art.props.detailBatches) {
    if (!batch.geological) {
      assert.notEqual(batch.nearMaterial, batch.asset.material);
      assert.equal(batch.asset.material.emissive.getHex(), 0);
    }
    for (const row of batch.rows)
      for (const geometry of [batch.near.geometry, batch.far.geometry]) {
        const referenced = new Set(geometry.index.array);
        for (const i of referenced) {
          point
            .fromBufferAttribute(geometry.attributes.position, i)
            .applyMatrix4(row.matrix);
          const bounds = new THREE.Box3(
            new THREE.Vector3(
              row.site.x - row.site.width / 2,
              -Infinity,
              row.site.z - row.site.depth / 2,
            ),
            new THREE.Vector3(
              row.site.x + row.site.width / 2,
              Infinity,
              row.site.z + row.site.depth / 2,
            ),
          );
          if (row.site.id === "kaiju_lair") {
            bounds.min.x = Math.min(bounds.min.x, mainBounds.min.x);
            bounds.max.x = Math.max(bounds.max.x, mainBounds.max.x);
            bounds.min.z = Math.min(bounds.min.z, mainBounds.min.z);
            bounds.max.z = Math.max(bounds.max.z, entryMaxZ);
          }
          assert.ok(
            bounds.expandByScalar(0.01).containsPoint(point),
            `${row.site.id}/${batch.kind}: detail remains in its authored cave or entrance`,
          );
        }
      }
  }
  for (const r of art.records) {
    for (const portal of r.portals) {
      assert.ok(portal.width >= 55 && portal.width <= 110);
      if (r.id === "kaiju_lair") {
        assert.deepEqual(
          [portal.id, portal.width, portal.height],
          ["north", 100, 174],
        );
      } else assert.ok(portal.height >= 84 && portal.height <= 101);
    }
  }
});
