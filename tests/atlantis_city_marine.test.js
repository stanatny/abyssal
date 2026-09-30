import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createAtlantisCity } from "../src/atlantis_city.js";
import { createAtlantisCityMarine } from "../src/atlantis_city_marine.js";
import { createAtlantisHarborRuins } from "../src/atlantis_exploration_harbor.js";
import { atlantisSeabedHeight } from "../src/atlantis_terrain.js";
import { castSegment } from "../src/collision.js";

test("Integrated marine growth remains visible and rooted on real hosts", (t) => {
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => city.dispose());
  const marine = city.marine;
  const hosts = city.colliders.filter((c) => c.kind !== "marine_growth");
  const instances = inspectInstances(marine.root);
  // 原交付十个实例完全埋入；修复必须保留场景丰富度，不能靠删掉大片内容过关。
  assert.ok(instances.length >= 150, "Preserve the populated marine slice");
  assert.deepEqual(Object.keys(marine.stats.perKind).sort(), [
    "anemone",
    "coral",
    "fan",
    "kelp",
    "sponge",
    "wallAnemone",
    "wallSponge",
  ]);
  assert.ok(marine.stats.triangles <= 110000, "Keep the bounded art budget");

  let triangles = 0;
  for (const instance of instances) {
    triangles += instance.triangles;
    const label = `${instance.name} at ${instance.position.toArray()}`;
    assert.ok(
      instance.buriedFraction < 0.6,
      `${label}: the visible crown must not disappear into the terrain`,
    );
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(
      instance.quaternion,
    );
    const start = instance.position.clone().addScaledVector(normal, 0.2);
    const end = instance.position.clone().addScaledVector(normal, -0.5);
    const onTerrain =
      Math.abs(
        instance.position.y -
          atlantisSeabedHeight(instance.position.x, instance.position.z),
      ) < 0.15;
    assert.ok(
      onTerrain || castSegment(start, end, hosts, 0),
      `${label}: attachment root must touch terrain or a real host`,
    );
  }
  assert.equal(triangles, marine.stats.triangles);
});

test("Marine capsules use the actual transformed prototype bounds", (t) => {
  const city = createAtlantisCity(new THREE.Scene(), {
    heightAt: atlantisSeabedHeight,
  });
  t.after(() => city.dispose());
  const instances = inspectInstances(city.marine.root);
  assert.ok(city.marine.colliders.length > 0);
  for (const collider of city.marine.colliders) {
    const matching = instances
      .filter((instance) =>
        instance.name.startsWith(`marine_${collider.species}_`),
      )
      .sort(
        (a, b) =>
          Math.hypot(a.position.x - collider.a.x, a.position.z - collider.a.z) -
          Math.hypot(b.position.x - collider.a.x, b.position.z - collider.a.z),
      )[0];
    assert.ok(matching, "Every collider must correspond to its actual variant");
    const { min, max } = matching.bounds;
    assert.ok(Math.abs(collider.a.y - collider.radius - min.y) < 0.00005);
    assert.ok(Math.abs(collider.b.y + collider.radius - max.y) < 0.00005);
    assert.ok(collider.a.x - collider.radius >= min.x - 0.00005);
    assert.ok(collider.a.x + collider.radius <= max.x + 0.00005);
    assert.ok(collider.a.z - collider.radius >= min.z - 0.00005);
    assert.ok(collider.a.z + collider.radius <= max.z + 0.00005);
    // 原碰撞顶端高出可见几何 0.87–1.37m，此处真实射线不能撞到空气。
    assert.equal(
      castSegment(
        { x: min.x - 1, y: max.y + 0.1, z: collider.a.z },
        { x: max.x + 1, y: max.y + 0.1, z: collider.a.z },
        [collider],
      ),
      null,
    );
  }
});

test("Marine instances keep separate clocks and dispose only owned resources", (t) => {
  const parent = new THREE.Scene();
  const harbor = createAtlantisHarborRuins(parent, {
    heightAt: atlantisSeabedHeight,
  });
  const options = {
    heightAt: atlantisSeabedHeight,
    hostColliders: harbor.colliders,
  };
  const first = createAtlantisCityMarine(parent, options);
  const second = createAtlantisCityMarine(parent, options);
  t.after(() => {
    first.dispose();
    second.dispose();
    harbor.dispose();
  });
  assert.deepEqual(second.stats, first.stats);
  const firstMeshes = meshes(first.root);
  const secondMeshes = meshes(second.root);
  const geometries = new Set(firstMeshes.map((mesh) => mesh.geometry));
  const materials = new Set(firstMeshes.map((mesh) => mesh.material));
  let geometryDisposals = 0;
  let materialDisposals = 0;
  let instanceDisposals = 0;
  for (const geometry of geometries)
    geometry.addEventListener("dispose", () => geometryDisposals++);
  for (const material of materials)
    material.addEventListener("dispose", () => materialDisposals++);
  for (const mesh of firstMeshes)
    mesh.addEventListener("dispose", () => instanceDisposals++);
  for (const mesh of secondMeshes) {
    assert.ok(geometries.has(mesh.geometry), "Prototype geometry stays shared");
    assert.ok(
      !materials.has(mesh.material),
      "Animation materials belong to an instance",
    );
  }
  for (const kind of ["fan", "kelp"]) {
    const firstMaterial = firstMeshes.find((mesh) =>
      mesh.name.startsWith(`marine_${kind}_`),
    ).material;
    const secondMaterial = secondMeshes.find((mesh) =>
      mesh.name.startsWith(`marine_${kind}_`),
    ).material;
    const firstShader = compileUniforms(firstMaterial);
    const secondShader = compileUniforms(secondMaterial);
    first.update(12, 0, null);
    second.update(37, 0, null);
    assert.equal(firstShader.marineTime.value, 12);
    assert.equal(secondShader.marineTime.value, 37);
    second.update(51, 0, null);
    assert.equal(
      firstShader.marineTime.value,
      12,
      "An idle instance stays paused",
    );
  }
  const expectedStats = structuredClone(first.stats);
  first.dispose();
  first.dispose();
  assert.equal(geometryDisposals, 0);
  assert.equal(materialDisposals, materials.size);
  assert.equal(instanceDisposals, firstMeshes.length);
  assert.equal(first.root.parent, null);
  assert.equal(first.root.children.length, 0);
  assert.equal(first.colliders.length, 0);
  assert.equal(first.landmarks.length, 0);
  assert.equal(second.root.parent, parent);
  const liveUniforms = compileUniforms(
    secondMeshes.find((mesh) => mesh.name.startsWith("marine_fan_")).material,
  );
  second.update(76, 0, null);
  assert.equal(liveUniforms.marineTime.value, 76);

  // 未来的第二座遗迹可以共享宿主集合，但不能把其他场地柱列也种进本切片。
  const rebuilt = createAtlantisCityMarine(parent, {
    ...options,
    hostColliders: [
      ...harbor.colliders,
      {
        type: "capsule",
        kind: "harbor_ruin_column",
        a: { x: 600, y: -193, z: 600 },
        b: { x: 600, y: -170, z: 600 },
        radius: 1,
      },
    ],
  });
  t.after(() => rebuilt.dispose());
  assert.deepEqual(rebuilt.stats, expectedStats);
  assert.ok(
    meshes(rebuilt.root).every((mesh) => geometries.has(mesh.geometry)),
  );
});

function meshes(root) {
  const result = [];
  root.traverse((node) => {
    if (node.isInstancedMesh) result.push(node);
  });
  return result;
}

function compileUniforms(material) {
  const shader = {
    uniforms: {},
    vertexShader: THREE.ShaderLib.standard.vertexShader,
    fragmentShader: THREE.ShaderLib.standard.fragmentShader,
  };
  material.onBeforeCompile(shader, {});
  return shader.uniforms;
}

function inspectInstances(root) {
  const result = [];
  const matrix = new THREE.Matrix4();
  const point = new THREE.Vector3();
  for (const mesh of meshes(root))
    for (let instance = 0; instance < mesh.count; instance++) {
      mesh.getMatrixAt(instance, matrix);
      const bounds = new THREE.Box3();
      let buried = 0;
      const vertices = mesh.geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        point.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
        bounds.expandByPoint(point);
        if (point.y < atlantisSeabedHeight(point.x, point.z) - 0.3) buried++;
      }
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      matrix.decompose(position, quaternion, new THREE.Vector3());
      result.push({
        name: mesh.name,
        position,
        quaternion,
        bounds,
        buriedFraction: buried / vertices.count,
        triangles: (mesh.geometry.index?.count ?? vertices.count) / 3,
      });
    }
  return result;
}
