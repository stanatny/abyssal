import test from "node:test";
import assert from "node:assert/strict";
import { bodyOffsets, bodyRadius, resolveMotion } from "../src/collision.js";
import { bodyTerrainFloor, clipTerrainCamera } from "../src/terrain_contact.js";

function plane(gx = 0, gz = 0) {
  const height = (x, z) => gx * x + gz * z - 80;
  height.supportHeight = (x, z, r) => height(x, z) + r * Math.hypot(1, gx, gz);
  return height;
}

test("whole-body support follows both ends, width and pitch on a slope in every heading", () => {
  const heightAt = plane(0.35, 0.72);
  for (const length of [3, 6, 30, 32])
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2])
      for (const pitch of [-0.8, 0, 0.8]) {
        const forward = {
            x: Math.sin(yaw) * Math.cos(pitch),
            y: Math.sin(pitch),
            z: Math.cos(yaw) * Math.cos(pitch),
          },
          radius = bodyRadius(length),
          floor = bodyTerrainFloor(0, 0, {
            heightAt,
            radius,
            length,
            forward,
          }),
          actual = resolveMotion(
            { x: 0, y: floor + 1, z: 0 },
            { x: 0, y: floor - 5, z: 0 },
            {
              radius,
              length,
              forward,
              floorHeight: (x, z) =>
                bodyTerrainFloor(x, z, {
                  heightAt,
                  radius,
                  length,
                  forward,
                }),
            },
          );
        assert.ok(Math.abs(actual.position.y - floor) < 1e-8);
        for (const o of bodyOffsets({ radius, length, forward }))
          assert.ok(
            actual.position.y + o.y >=
              heightAt.supportHeight(o.x, o.z, radius) + 0.4 - 1e-8,
          );
      }
});

test("flat support preserves the previous center clearance, including vertical bodies", () => {
  const heightAt = plane();
  for (const length of [3, 6, 30])
    for (const pitch of [0, -0.4, 1.2]) {
      const radius = bodyRadius(length),
        actual = bodyTerrainFloor(2, 4, {
          heightAt,
          radius,
          length,
          forward: { x: 0, y: Math.sin(pitch), z: Math.cos(pitch) },
        }),
        expected =
          -80 +
          radius +
          Math.abs(Math.sin(pitch)) * Math.max(0, length * 0.42 - radius) +
          0.4;
      assert.ok(Math.abs(actual - expected) < 1e-8);
    }
});

test("a camera ending below the slope is clipped and an interpolated crossing cannot hide underground", () => {
  const heightAt = plane(0, 1);
  const start = { x: 0, y: -70, z: 0 },
    desired = { x: 0, y: -65, z: 30 },
    clipped = clipTerrainCamera(start, desired, heightAt);
  assert.ok(clipped.z > 0 && clipped.z < desired.z);
  assert.ok(
    clipped.y >= heightAt.supportHeight(clipped.x, clipped.z, 0.6) + 0.04,
  );
  const safe = { x: 2, y: -60, z: 3 };
  assert.deepEqual(clipTerrainCamera(start, safe, heightAt), safe);
  assert.deepEqual(clipTerrainCamera(start, start, heightAt), start);
});

test("camera checks the line as well as the final point across a narrow ridge", () => {
  const heightAt = (x, z) => -80 + 20 * Math.max(0, 1 - Math.abs(z - 5));
  const start = { x: 0, y: -70, z: 0 },
    end = { x: 0, y: -70, z: 10 },
    clipped = clipTerrainCamera(start, end, heightAt);
  assert.ok(clipped.z > 4 && clipped.z < 5);
  assert.ok(clipped.y >= heightAt(clipped.x, clipped.z) + 0.64);
});

test("floor-only model-length support clears four real skins at the original uphill witness without enlarging collision bodies", async () => {
  const THREE = await import("three"),
    { createOcean, seabedHeight } = await import("../src/ocean.js"),
    { createTerrainSurface } = await import("../src/terrain_surface.js"),
    { createCreature } = await import("../src/creatures.js"),
    ocean = createOcean(new THREE.Scene()),
    heightAt = createTerrainSurface(ocean.root, { fallback: seabedHeight });
  try {
    for (const kind of ["orca", "squid", "zombie_shark", "mechanical_shark"]) {
      const length = 30,
        model = createCreature(kind, length, 7),
        forward = { x: 0, y: 0, z: 1 },
        radius = bodyRadius(length),
        physicalOffsets = bodyOffsets({ radius, length, forward }),
        y = bodyTerrainFloor(10, -40, {
          heightAt,
          radius,
          length: (length * 0.52) / 0.42,
          forward,
        });
      model.userData.animate?.(0, 1, {
        dt: 1 / 60,
        speed: 12,
        boosting: false,
      });
      model.position.set(10, y, -40);
      model.rotation.y = Math.PI;
      model.updateMatrixWorld(true);
      const vertex = new THREE.Vector3();
      let minimum = Infinity;
      model.traverse((mesh) => {
        if (!mesh.isMesh) return;
        for (let node = mesh; node; node = node.parent)
          if (!node.visible) return;
        mesh.skeleton?.update();
        const p = mesh.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          if (mesh.isSkinnedMesh) mesh.getVertexPosition(i, vertex);
          else vertex.fromBufferAttribute(p, i);
          vertex.applyMatrix4(mesh.matrixWorld);
          minimum = Math.min(minimum, vertex.y - heightAt(vertex.x, vertex.z));
        }
      });
      assert.ok(minimum >= 0.4, `${kind}: ${minimum}`);
      assert.deepEqual(
        bodyOffsets({ radius, length, forward }),
        physicalOffsets,
      );
      model.userData.disposeLocalMotion?.();
    }
  } finally {
    heightAt.dispose();
    ocean.dispose();
  }
});

test("scaled jaw clearance keeps the two posed broken-mandible witnesses above the slope", async () => {
  const THREE = await import("three"),
    { createOcean, seabedHeight } = await import("../src/ocean.js"),
    { createTerrainSurface } = await import("../src/terrain_surface.js"),
    { createCreature } = await import("../src/creatures.js"),
    ocean = createOcean(new THREE.Scene()),
    surface = createTerrainSurface(ocean.root, { fallback: seabedHeight }),
    length = 30,
    model = createCreature("zombie_shark", length, 7);
  try {
    model.userData.animate?.(0, 1, { dt: 1 / 60, speed: 12, boosting: false });
    for (const [yaw, pitch] of [
      [45, -30],
      [180, 30],
    ]) {
      model.quaternion.setFromEuler(
        new THREE.Euler(
          (pitch * Math.PI) / 180,
          (yaw * Math.PI) / 180,
          0,
          "YXZ",
        ),
      );
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
        model.quaternion,
      );
      const y = bodyTerrainFloor(10, -40, {
        heightAt: surface,
        radius: bodyRadius(length),
        length: (length * 0.52) / 0.42,
        margin: 0.4 + length * 0.008,
        forward,
      });
      model.position.set(10, y, -40);
      model.updateMatrixWorld(true);
      let count = 0;
      model.traverse((mesh) => {
        if (!mesh.isSkinnedMesh) return;
        mesh.skeleton?.update();
        const p = mesh.geometry.attributes.position,
          vertex = new THREE.Vector3();
        const ids = mesh.geometry.attributes.skinIndex,
          weights = mesh.geometry.attributes.skinWeight;
        for (let i = 0; i < p.count; i++) {
          let jawWeight = 0;
          for (let j = 0; j < 4; j++)
            if (
              mesh.skeleton.bones[ids.array[i * 4 + j]].name.includes(
                "broken_mandible",
              )
            )
              jawWeight += weights.array[i * 4 + j];
          if (jawWeight < 0.95) continue;
          mesh.getVertexPosition(i, vertex);
          vertex.applyMatrix4(mesh.matrixWorld);
          assert.ok(vertex.y > surface(vertex.x, vertex.z), `${yaw}/${pitch}`);
          count++;
        }
      });
      assert.ok(count > 0);
    }
  } finally {
    model.userData.disposeLocalMotion?.();
    surface.dispose();
    ocean.dispose();
  }
});
