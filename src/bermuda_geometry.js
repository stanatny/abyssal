import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 地图几何按材质合批；临时几何合并后释放，碰撞与装饰拥有明确边界。 */
export function createBermudaBuilder(root, keep, origin = new THREE.Vector3()) {
  const buckets = new Map(),
    colliders = [];
  let sequence = 0;
  function add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(matrix);
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        "uv",
        new THREE.BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 2),
          2,
        ),
      );
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(geometry);
  }
  function box(material, center, size, solid = false, rotation = 0) {
    const angles = Array.isArray(rotation) ? rotation : [0, rotation, 0];
    add(new THREE.BoxGeometry(...size), material, center, angles);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...angles));
    if (solid)
      colliders.push({
        type: "box",
        id: `${root.name}_${sequence++}`,
        x: center[0] + origin.x,
        y: center[1] + origin.y,
        z: center[2] + origin.z,
        halfSize: new THREE.Vector3(...size).multiplyScalar(0.5),
        rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
      });
  }
  function beam(material, a, b, radius = 0.15, sides = 8) {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      direction = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      direction.length(),
      sides,
    );
    geometry.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    );
    add(geometry, material, from.add(to).multiplyScalar(0.5).toArray());
  }
  function finish() {
    for (const [material, geometries] of buckets) {
      const geometry = keep(mergeGeometries(geometries));
      for (const temporary of geometries) temporary.dispose();
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${root.name}_${material.name}`;
      root.add(mesh);
    }
    buckets.clear();
    return colliders;
  }
  return { add, box, beam, finish, colliders };
}

/** 腐蚀钢、木材、铜和生物冷光，细节由现有表面着色器生成。 */
export function bermudaMaterials(keep) {
  function mat(name, color, roughness = 0.8, metalness = 0) {
    const material = keep(
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
    material.name = name;
    return material;
  }
  const palette = {
    steel: mat("corroded_steel", "#526169", 0.78, 0.3),
    rust: mat("oxide", "#8a4d31", 0.9, 0.15),
    pale: mat("aged_enamel", "#b2b9af", 0.75),
    wood: mat("waterlogged_wood", "#544537", 0.94),
    brass: mat("verdigris_brass", "#66847a", 0.56, 0.48),
    dark: mat("charcoal", "#141f28", 0.84),
    red: mat("funnel_ochre", "#a77349", 0.85),
    glass: mat("broken_glass", "#263f49", 0.3, 0.25),
    coral: mat("red_coral", "#ad4842", 0.78),
    pearl: mat("bioluminescence", "#77bdb1", 0.5),
  };
  for (const key of ["steel", "rust", "brass", "pale"])
    addSurfaceDetail(palette[key], "metal", key === "rust" ? 0.9 : 0.35);
  addSurfaceDetail(palette.wood, "wood", 0.75);
  palette.pearl.emissive.set("#5ee9d0");
  palette.pearl.emissiveIntensity = 1.4;
  return palette;
}

/** 分段截面的船壳，保留上方开口和指定舷侧破口，法线与真实薄壁一致。 */
export function hullStripGeometry(
  length,
  width,
  height,
  { side = 1, broken = false } = {},
) {
  const p = [],
    indices = [],
    steps = 64;
  for (let row = 0; row <= steps; row++) {
    const z = (row / steps - 0.5) * length;
    const taper = Math.min(
      1,
      Math.max(0.03, (length / 2 - Math.abs(z)) / (length * 0.12)),
    );
    for (let level = 0; level < 5; level++) {
      const y = (height * level) / 4;
      const flare = 0.55 + Math.sin(((level / 4) * Math.PI) / 2) * 0.45;
      p.push(((side * width) / 2) * taper * flare, y, z);
    }
  }
  for (let row = 0; row < steps; row++) {
    const z = ((row + 0.5) / steps - 0.5) * length;
    for (let level = 0; level < 4; level++) {
      if (broken && side === 1 && z > 30 && z < 68 && level >= 1 && level <= 2)
        continue;
      const a = row * 5 + level,
        b = a + 5;
      const faces =
        side === 1
          ? [a, b, a + 1, b, b + 1, a + 1]
          : [a, a + 1, b, b, a + 1, b + 1];
      indices.push(...faces);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
