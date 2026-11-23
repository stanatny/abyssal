import * as THREE from "three";
import { createBermudaAircraft } from "./bermuda_aircraft.js";
import { createBermudaCargo } from "./bermuda_cargo.js";
import { acquireBermudaGeologyAsset } from "./bermuda_geology_asset.js";
import { acquireBermudaWreckAsset } from "./bermuda_wreck_asset.js";
import { createBermudaBuilder } from "./bermuda_geometry.js";
import { createBermudaReefFields } from "./bermuda_reef_fields.js";
import archContacts from "./assets/models/bermuda_arch_contacts.json" with { type: "json" };

const UP = new THREE.Vector3(0, 1, 0);
export const BERMUDA_OUTER_SITES = Object.freeze([
  Object.freeze({
    id: "outer_reef_gates",
    name: "外海双礁门",
    x: -390,
    z: -500,
    radius: 125,
  }),
  Object.freeze({
    id: "outer_lost_flight",
    name: "失踪航线残骸带",
    x: 400,
    z: -1060,
    radius: 230,
  }),
  Object.freeze({
    id: "outer_salvage_wreck",
    name: "深沟货船遗址",
    x: -350,
    z: -1480,
    radius: 85,
  }),
  Object.freeze({
    id: "outer_cable_field",
    name: "断缆打捞场",
    x: 150,
    z: -1450,
    radius: 100,
  }),
  Object.freeze({
    id: "outer_sponge_terraces",
    name: "东侧海绵台地",
    x: 400,
    z: -1030,
    radius: 95,
  }),
  Object.freeze({
    id: "outer_coral_ridge",
    name: "深海珊瑚脊",
    x: 65,
    z: -1345,
    radius: 110,
  }),
  Object.freeze({
    id: "outer_fan_grove",
    name: "南部海扇林",
    x: -110,
    z: -1625,
    radius: 105,
  }),
  Object.freeze({
    id: "outer_trench_grotto",
    name: "东沟岩洞",
    x: 390,
    z: -1110,
    radius: 90,
  }),
]);

/** 外海航路复用已验收的 HF 岩礁、机群、货船与锅炉；新增足迹和旧核心各自独立。 */
export function createBermudaOuterBiomes(parent, { heightAt }) {
  const root = new THREE.Group();
  root.name = "bermuda_outer_biomes";
  parent.add(root);
  const owned = new Set(),
    keep = (r) => (owned.add(r), r),
    materials = {
      dark: keep(
        new THREE.MeshStandardMaterial({ color: "#141f28", roughness: 0.84 }),
      ),
    },
    builder = createBermudaBuilder(root, keep),
    colliders = [],
    assets = [],
    factories = [],
    placements = [],
    arches = [];
  const p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    matrix = new THREE.Matrix4();
  const landmarks = BERMUDA_OUTER_SITES.map((site) => ({
    ...site,
    position: new THREE.Vector3(site.x, heightAt(site.x, site.z) + 22, site.z),
  }));

  // 用同一坐标变换重定位外观与实体；贴坡查询先映射到目的地，避免复用旧高度。
  function relocate(factory, origin, target, yaw, id) {
    const rotation = new THREE.Quaternion().setFromAxisAngle(UP, yaw),
      source = new THREE.Vector3(origin[0], 0, origin[1]),
      destination = new THREE.Vector3(target[0], 0, target[1]),
      transform = (x, z) =>
        p.set(x, 0, z).sub(source).applyQuaternion(rotation).add(destination);
    const wrapper = new THREE.Group();
    wrapper.name = id;
    root.add(wrapper);
    const art = factory(wrapper, {
      heightAt(x, z) {
        const at = transform(x, z);
        return heightAt(at.x, at.z);
      },
    });
    wrapper.quaternion.copy(rotation);
    wrapper.position
      .copy(source)
      .applyQuaternion(rotation)
      .negate()
      .add(destination);
    wrapper.updateMatrixWorld(true);
    for (const contact of art.colliders || art.contacts) {
      const at = p
        .set(contact.x, contact.y, contact.z)
        .applyMatrix4(wrapper.matrixWorld);
      colliders.push({
        ...contact,
        id: `${id}_${contact.id}`,
        x: at.x,
        y: at.y,
        z: at.z,
        rotation: rotation.clone().multiply(contact.rotation),
      });
    }
    for (const box of art.boxes || []) {
      const at = p.fromArray(box.center).applyMatrix4(wrapper.matrixWorld);
      colliders.push({
        id: `${id}_wing_${colliders.length}`,
        type: "box",
        x: at.x,
        y: at.y,
        z: at.z,
        halfSize: new THREE.Vector3(...box.size).multiplyScalar(0.5),
        rotation: rotation
          .clone()
          .multiply(
            new THREE.Quaternion().setFromEuler(
              new THREE.Euler(...box.rotation),
            ),
          ),
      });
    }
    factories.push(art);
    placements.push({
      id,
      kind: "wreck",
      x: target[0],
      z: target[1],
      root: wrapper,
      art,
    });
  }
  relocate(
    createBermudaAircraft,
    [199, -555],
    [390, -850],
    0.65,
    "outer_flight_north",
  );
  relocate(
    createBermudaAircraft,
    [199, -555],
    [405, -1260],
    -0.8,
    "outer_flight_south",
  );
  relocate(
    createBermudaCargo,
    [165, -952],
    [-350, -1480],
    -0.5,
    "outer_salvage_hull",
  );

  const archAsset = acquireBermudaGeologyAsset("arch");
  assets.push(archAsset);
  for (const [id, x, z, yaw] of [
    ["outer_gate_north", -390, -420, 0.1],
    ["outer_gate_south", -390, -580, 0],
    ["outer_gate_east_deep", 390, -1110, 0.06],
    ["outer_gate_south_deep", -420, -1525, Math.PI / 2],
  ]) {
    const width = 144,
      box = archAsset.geometry.boundingBox,
      center = box.getCenter(new THREE.Vector3()),
      scale = width / (box.max.x - box.min.x),
      ratio = width / archContacts.width,
      rotation = new THREE.Quaternion().setFromAxisAngle(UP, yaw),
      meshes = [];
    for (const [source, material, suffix] of [
      [archAsset.geometry, archAsset.material, "close"],
      [archAsset.farGeometry, archAsset.farMaterial, "distant"],
    ]) {
      const geometry = keep(source.clone()),
        position = geometry.attributes.position,
        normals = new Float32Array(position.count * 3),
        normal = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        p.set(
          (position.getX(i) - center.x) * scale,
          (position.getY(i) - box.min.y) * scale,
          (position.getZ(i) - center.z) * scale,
        ).applyQuaternion(rotation);
        const px = x + p.x,
          pz = z + p.z,
          dx = (heightAt(px + 0.2, pz) - heightAt(px - 0.2, pz)) / 0.4,
          dz = (heightAt(px, pz + 0.2) - heightAt(px, pz - 0.2)) / 0.4;
        normal
          .fromBufferAttribute(source.attributes.normal, i)
          .applyQuaternion(rotation);
        normal
          .set(normal.x - dx * normal.y, normal.y, normal.z - dz * normal.y)
          .normalize()
          .toArray(normals, i * 3);
        position.setXYZ(i, px, heightAt(px, pz) + p.y - 0.5, pz);
      }
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${id}_${suffix}`;
      root.add(mesh);
      meshes.push(mesh);
    }
    meshes[0].visible = false;
    for (const [index, cell] of archContacts.boxes.entries()) {
      const size = cell.size.map((v) => v * ratio),
        center = cell.center.map((v) => v * ratio);
      let low = Infinity,
        high = -Infinity;
      const nx = Math.ceil(size[0]),
        nz = Math.ceil(size[2]);
      for (let u = 0; u <= nx; u++)
        for (let v = 0; v <= nz; v++) {
          p.set(
            center[0] + size[0] * (u / nx - 0.5),
            0,
            center[2] + size[2] * (v / nz - 0.5),
          ).applyQuaternion(rotation);
          const y = heightAt(x + p.x, z + p.z);
          low = Math.min(low, y);
          high = Math.max(high, y);
        }
      p.set(center[0], 0, center[2]).applyQuaternion(rotation);
      const minY = center[1] - size[1] / 2 + low - 0.7,
        maxY = center[1] + size[1] / 2 + high - 0.3;
      colliders.push({
        id: `${id}_${index}`,
        type: "box",
        x: x + p.x,
        y: (minY + maxY) / 2,
        z: z + p.z,
        halfSize: new THREE.Vector3(
          size[0] / 2 + 0.04,
          (maxY - minY) / 2,
          size[2] / 2 + 0.04,
        ),
        rotation: rotation.clone(),
      });
    }
    arches.push({
      id,
      x,
      z,
      yaw,
      y: heightAt(x, z) + 30,
      meshes,
      close: false,
    });
    placements.push({ id, kind: "arch", x, z, meshes });
  }

  const reefFields = createBermudaReefFields(root, { heightAt });
  root.userData.reefFields = reefFields;
  colliders.push(...reefFields.colliders);
  const batches = reefFields.batches;

  const boiler = acquireBermudaWreckAsset("wreck_boiler"),
    trunk = acquireBermudaWreckAsset("liner_trunk");
  assets.push(boiler, trunk);
  for (const [asset, kind, positions, size] of [
    [
      boiler,
      "boiler",
      [
        [115, -1440],
        [150, -1460],
        [185, -1440],
      ],
      18,
    ],
    [
      trunk,
      "cargo",
      [
        [-376, -1440],
        [-332, -1425],
        [-317, -1508],
        [112, -1408],
        [196, -1484],
      ],
      4,
    ],
  ]) {
    const mesh = new THREE.InstancedMesh(
        asset.geometry,
        asset.material,
        positions.length,
      ),
      box = asset.geometry.boundingBox,
      extent = box.getSize(new THREE.Vector3());
    mesh.name = `outer_salvage_${kind}`;
    keep(mesh);
    for (const [i, [x, z]] of positions.entries()) {
      const dx = (heightAt(x + 3, z) - heightAt(x - 3, z)) / 6,
        dz = (heightAt(x, z + 3) - heightAt(x, z - 3)) / 6;
      q.setFromUnitVectors(
        UP,
        new THREE.Vector3(-dx, 1, -dz).normalize(),
      ).multiply(new THREE.Quaternion().setFromAxisAngle(UP, i * 1.4));
      matrix.compose(
        new THREE.Vector3(x, 0, z),
        q,
        new THREE.Vector3(size, size, size),
      );
      let low = Infinity;
      for (let v = 0; v < asset.geometry.attributes.position.count; v++) {
        p.fromBufferAttribute(
          asset.geometry.attributes.position,
          v,
        ).applyMatrix4(matrix);
        low = Math.min(low, p.y - heightAt(p.x, p.z));
      }
      matrix.elements[13] -= low + 0.06;
      mesh.setMatrixAt(i, matrix);
      p.copy(box.getCenter(new THREE.Vector3())).applyMatrix4(matrix);
      colliders.push({
        id: `outer_salvage_${kind}_${i}`,
        type: "box",
        x: p.x,
        y: p.y,
        z: p.z,
        halfSize: extent.clone().multiplyScalar(size / 2),
        rotation: q.clone(),
      });
      placements.push({
        id: `outer_salvage_${kind}_${i}`,
        kind,
        x,
        z,
        mesh,
        instance: i,
      });
    }
    mesh.computeBoundingSphere();
    root.add(mesh);
  }
  // 断缆贴着海床走向打捞设备，细缆不冒充能阻挡成年角色的实体墙。
  for (let cable = 0; cable < 3; cable++) {
    let previous;
    for (let i = 0; i <= 40; i++) {
      const x = -238 + i * 10.7,
        z = -1350 - i * 3.1 + Math.sin(i * 0.5 + cable) * 3.5 + cable * 1.1,
        at = [x, heightAt(x, z) + 0.18, z];
      if (previous) builder.beam(materials.dark, previous, at, 0.15, 6);
      previous = at;
    }
  }
  for (const [x, z] of [
    [115, -1440],
    [185, -1440],
  ]) {
    const y = heightAt(x, z);
    for (let turn = 0; turn < 6; turn++)
      builder.add(
        new THREE.TorusGeometry(4.5 - turn * 0.43, 0.18, 6, 32),
        materials.dark,
        [x, y + 0.3 + turn * 0.06, z + 13],
        [Math.PI / 2, 0, 0],
      );
  }
  builder.finish();
  root.userData.placements = placements;
  const prepare = async (options) =>
    (
      await Promise.all(
        [...assets, ...factories, reefFields].map((a) => a.prepare(options)),
      )
    ).every(Boolean);
  root.userData.prepareMaterials = prepare;
  void prepare();
  let disposed = false,
    lastTime = -Infinity;
  return {
    root,
    colliders,
    landmarks,
    lightSources: [],
    placements,
    arches,
    batches,
    reefFields,
    assets,
    prepare,
    update(time, position, highQuality = true) {
      if (disposed || (time >= lastTime && time - lastTime < 0.4)) return;
      lastTime = time;
      // 在最稀薄的百慕大雾下也等到近乎不可见才裁掉整件残骸，避免近景突然显现。
      for (const row of placements) {
        if (row.kind !== "wreck") continue;
        row.root.visible =
          p.set(row.x, row.art.root.position.y, row.z).distanceTo(position) <
          (row.root.visible ? 850 : 800);
      }
      for (const row of arches) {
        row.close =
          p.set(row.x, row.y, row.z).distanceTo(position) <
          (row.close ? 180 : 160);
        row.meshes[0].visible = row.close;
        row.meshes[1].visible = !row.close;
      }
      reefFields.update(time, position, highQuality);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const art of factories) art.dispose();
      reefFields.dispose();
      root.removeFromParent();
      root.clear();
      for (const resource of owned) resource.dispose();
      for (const asset of assets) asset.release();
      colliders.length = 0;
    },
  };
}
