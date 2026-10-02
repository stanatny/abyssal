import * as THREE from "three";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { addEuropaColonySurface } from "./europa_environment_geometry.js";

/** 盐矿结晶与附生薄膜：原位附着、实例共享、远距离消隐微光，固体只覆盖大晶柱。 */
export function* createEuropaGeochemistrySteps(
  parent,
  { heightAt, keep, time },
) {
  const crystal = keep(
    new THREE.LatheGeometry(
      [
        [0, 0],
        [0.65, 0],
        [1, 0.18],
        [0.82, 0.8],
        [0, 1.14],
      ].map(([r, y]) => new THREE.Vector2(r, y)),
      6,
    ),
  );
  crystal.computeVertexNormals();
  const crust = keep(new THREE.SphereGeometry(1, 12, 8));
  const mineral = keep(
    new THREE.MeshStandardMaterial({
      color: "#668b94",
      roughness: 0.37,
      metalness: 0.12,
      flatShading: true,
    }),
  );
  const salt = keep(
    new THREE.MeshStandardMaterial({
      color: "#ad9b7b",
      roughness: 0.52,
      metalness: 0.08,
      flatShading: true,
    }),
  );
  const base = keep(
    new THREE.MeshStandardMaterial({ color: "#5d6c6a", roughness: 0.95 }),
  );
  const bio = keep(
    new THREE.MeshStandardMaterial({
      color: "#638e87",
      roughness: 0.87,
      emissive: "#769d8b",
      emissiveIntensity: 0.17,
    }),
  );
  for (const m of [mineral, salt, base, bio]) addSurfaceDetail(m, "stone", 0.2);
  addEuropaColonySurface(bio, time);
  const colliders = [],
    chunks = [],
    sources = [],
    clusters = [],
    dummy = new THREE.Object3D();
  for (const [index, [x, z]] of [
    [170, -95],
    [160, -240],
    [-175, -365],
    [175, -470],
    [175, -610],
    [-185, -710],
    [160, -810],
    [-140, -870],
  ].entries()) {
    const y = heightAt(x, z),
      group = new THREE.Group();
    group.name = `europa_mineral_habitat_${index}`;
    parent.add(group);
    const main = new THREE.InstancedMesh(crystal, mineral, 9),
      shards = new THREE.InstancedMesh(crystal, salt, 15),
      roots = new THREE.InstancedMesh(crust, base, 6),
      films = new THREE.InstancedMesh(crust, bio, 12);
    group.add(main, shards, roots, films);
    const normalAt = (px, pz) =>
      new THREE.Vector3(
        heightAt(px - 0.5, pz) - heightAt(px + 0.5, pz),
        1,
        heightAt(px, pz - 0.5) - heightAt(px, pz + 0.5),
      ).normalize();
    for (let n = 0; n < 9; n++) {
      const a = n * 2.399,
        r = 2 + (n % 4) * 2.1,
        px = x + Math.cos(a) * r,
        pz = z + Math.sin(a) * r,
        h = 5 + (n % 4) * 2.2,
        width = 0.75 + (n % 3) * 0.28;
      dummy.position.set(px, heightAt(px, pz) - 0.15, pz);
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normalAt(px, pz),
      );
      dummy.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 0, 1),
          Math.sin(n) * 0.16,
        ),
      );
      dummy.scale.set(width, h, width);
      dummy.updateMatrix();
      main.setMatrixAt(n, dummy.matrix);
      const end = new THREE.Vector3(0, h * 0.92, 0)
        .applyQuaternion(dummy.quaternion)
        .add(dummy.position);
      colliders.push({
        type: "capsule",
        id: `europa_crystal_${index}_${n}`,
        a: dummy.position.clone(),
        b: end,
        radius: width * 0.82,
      });
    }
    for (let n = 0; n < 15; n++) {
      const a = n * 2.399,
        px = x + Math.cos(a) * (5 + (n % 4)),
        pz = z + Math.sin(a) * (5 + (n % 4));
      dummy.position.set(px, heightAt(px, pz) - 0.2, pz);
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normalAt(px, pz),
      );
      dummy.scale.set(0.4 + (n % 3) * 0.15, 1.2 + (n % 4) * 0.6, 0.45);
      dummy.updateMatrix();
      shards.setMatrixAt(n, dummy.matrix);
    }
    for (let n = 0; n < 6; n++) {
      const px = x + Math.cos(n) * 3,
        pz = z + Math.sin(n) * 3;
      dummy.position.set(px, heightAt(px, pz) - 0.3, pz);
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normalAt(px, pz),
      );
      dummy.scale.set(3, 0.6, 2.5);
      dummy.updateMatrix();
      roots.setMatrixAt(n, dummy.matrix);
    }
    for (let n = 0; n < 12; n++) {
      const px = x + Math.cos(n * 2.399) * (6 + (n % 3)),
        pz = z + Math.sin(n * 2.399) * (6 + (n % 3));
      dummy.position.set(px, heightAt(px, pz) + 0.05, pz);
      dummy.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        normalAt(px, pz),
      );
      dummy.scale.set(1.1 + (n % 3) * 0.25, 0.16, 0.8);
      dummy.updateMatrix();
      films.setMatrixAt(n, dummy.matrix);
    }
    for (const mesh of [main, shards, roots, films]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    const center = new THREE.Vector3(x, y + 3, z);
    sources.push({
      position: center,
      color: 0x799c91,
      intensity: 30,
      distance: 50,
    });
    chunks.push({ root: group, center });
    clusters.push({ x, y, z });
    yield "mineral-habitat";
  }
  return {
    colliders,
    chunks,
    lightSources: sources,
    clusters,
    landmark: {
      name: "化学能源与矿物结晶",
      position: new THREE.Vector3(-100, heightAt(-100, -590) + 35, -590),
    },
  };
}
