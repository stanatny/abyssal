import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

let CachedAsset;
const CONTACT_RADIUS = 0.5;

/**
 * 创建球形接触水雷，length为含触角的直径，兼容旧torpedo模型标识。
 * 几何和静态材质按引用共享，警示灯材质由实例独占，动画不会移动碰撞中心。
 * @param {number} length 含触角的世界直径。
 * @returns {THREE.Group} userData含contactRadius、animate(time)和幂等dispose()。
 */
export function createContactMine(length = 1) {
  const asset = (CachedAsset ||= buildAsset());
  asset.references++;
  const root = new THREE.Group();
  root.name = "torpedo";
  const warning = new THREE.MeshStandardMaterial({
    color: "#a84432",
    emissive: "#e54a2d",
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.18,
  });
  for (const part of asset.parts) {
    const mesh = new THREE.Mesh(part.geometry, part.material || warning);
    mesh.name = `contact_mine_${part.name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  }
  root.scale.setScalar(length);
  root.userData.kind = "torpedo";
  root.userData.length = length;
  root.userData.contactRadius = length * CONTACT_RADIUS;
  let disposed = false;
  root.userData.animate = (time) => {
    if (disposed || !Number.isFinite(time)) return;
    // 小面积缓慢明灭，保留金属球体的轮廓，不让高亮覆盖接缝。
    warning.emissiveIntensity = 0.5 + (Math.sin(time * 3.5) + 1) * 0.4;
  };
  root.userData.dispose = () => {
    if (disposed) return;
    disposed = true;
    root.removeFromParent();
    warning.dispose();
    if (--asset.references === 0) {
      for (const part of asset.parts) {
        part.geometry.dispose();
        part.material?.dispose();
      }
      CachedAsset = undefined;
    }
  };
  return root;
}

// 这是风格化游戏危险物；触角、检修盖与吊环只用于外形识别。
function buildAsset() {
  const groups = new Map();
  const materials = {
    shell: addSurfaceDetail(
      new THREE.MeshStandardMaterial({
        color: "#82918b",
        vertexColors: true,
        roughness: 0.69,
        metalness: 0.48,
      }),
      "metal",
      2,
    ),
    seams: new THREE.MeshStandardMaterial({
      color: "#243535",
      roughness: 0.76,
      metalness: 0.42,
    }),
    hardware: addSurfaceDetail(
      new THREE.MeshStandardMaterial({
        color: "#a08c67",
        roughness: 0.63,
        metalness: 0.58,
      }),
      "metal",
      2,
    ),
    horns: addSurfaceDetail(
      new THREE.MeshStandardMaterial({
        color: "#73857f",
        roughness: 0.54,
        metalness: 0.64,
      }),
      "metal",
      2,
    ),
  };
  const axis = new THREE.Vector3(0, 1, 0);
  const identity = new THREE.Quaternion();
  const unit = new THREE.Vector3(1, 1, 1);
  function add(
    name,
    geometry,
    position = new THREE.Vector3(),
    rotation = identity,
  ) {
    const matrix = new THREE.Matrix4().compose(position, rotation, unit);
    const transformed = geometry.index
      ? geometry.toNonIndexed()
      : geometry.clone();
    transformed.applyMatrix4(matrix);
    transformed.deleteAttribute("uv");
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(transformed);
    geometry.dispose();
  }
  function radial(name, geometry, direction, radius) {
    add(
      name,
      geometry,
      direction.clone().multiplyScalar(radius),
      new THREE.Quaternion().setFromUnitVectors(axis, direction),
    );
  }
  function ring(name, radius, tube, y = 0) {
    const geometry = new THREE.TorusGeometry(radius, tube, 6, 48);
    geometry.rotateX(Math.PI / 2);
    add(name, geometry, new THREE.Vector3(0, y, 0));
  }
  const shell = new THREE.SphereGeometry(0.345, 40, 28);
  const shellColors = [];
  const position = shell.getAttribute("position");
  const color = new THREE.Color();
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index),
      y = position.getY(index),
      z = position.getZ(index);
    const shade = 0.36 + (y / 0.345 + 1) * 0.075;
    const patina =
      Math.sin(x * 38 + z * 21) * Math.sin(y * 43 - x * 19) * 0.014;
    color.setRGB(shade + patina, shade + 0.045 + patina, shade + 0.033);
    shellColors.push(color.r, color.g, color.b);
  }
  shell.setAttribute("color", new THREE.Float32BufferAttribute(shellColors, 3));
  add("shell", shell);

  // 两半壳的赤道连接带：暗槽夹在两条窄压边之间。
  ring("seams", 0.344, 0.01);
  ring("hardware", 0.345, 0.0035, -0.011);
  ring("hardware", 0.345, 0.0035, 0.011);
  for (const angle of [0, Math.PI / 2]) {
    const seam = new THREE.TorusGeometry(0.344, 0.0021, 5, 64);
    seam.rotateY(angle);
    add("seams", seam);
  }
  for (let index = 0; index < 16; index++) {
    const angle = (index / 16) * Math.PI * 2 + Math.PI / 16;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    radial(
      "hardware",
      new THREE.CylinderGeometry(0.004, 0.004, 0.009, 6),
      direction,
      0.35,
    );
  }

  const directions = [];
  for (let index = 0; index < 4; index++) {
    const angle = (index / 4) * Math.PI * 2;
    directions.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
    for (const y of [-0.67, 0.67]) {
      const diagonal = angle + Math.PI / 4;
      directions.push(
        new THREE.Vector3(
          Math.cos(diagonal) * 0.74,
          y,
          Math.sin(diagonal) * 0.74,
        ).normalize(),
      );
    }
  }
  for (const direction of directions) {
    radial(
      "seams",
      new THREE.CylinderGeometry(0.037, 0.043, 0.009, 12),
      direction,
      0.344,
    );
    radial(
      "hardware",
      new THREE.CylinderGeometry(0.031, 0.036, 0.018, 12),
      direction,
      0.353,
    );
    const horn = new THREE.LatheGeometry(
      [
        [0.022, 0.357],
        [0.022, 0.368],
        [0.017, 0.375],
        [0.014, 0.465],
        [0.012, 0.483],
        [0.007, 0.495],
        [0, 0.5],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      12,
    );
    radial("horns", horn, direction, 0);
    radial(
      "seams",
      new THREE.CylinderGeometry(0.021, 0.021, 0.004, 12),
      direction,
      0.37,
    );
  }

  // 顶部盖板与底部吊环构成不对称的机械细节，整体仍保持球形读感。
  add(
    "seams",
    new THREE.CylinderGeometry(0.075, 0.077, 0.015, 24),
    new THREE.Vector3(0, 0.34, 0),
  );
  add(
    "hardware",
    new THREE.CylinderGeometry(0.065, 0.07, 0.012, 24),
    new THREE.Vector3(0, 0.35, 0),
  );
  for (let index = 0; index < 6; index++) {
    const angle = (index / 6) * Math.PI * 2;
    add(
      "horns",
      new THREE.CylinderGeometry(0.007, 0.007, 0.008, 6),
      new THREE.Vector3(Math.cos(angle) * 0.048, 0.36, Math.sin(angle) * 0.048),
    );
  }
  add(
    "horns",
    new THREE.TorusGeometry(0.031, 0.008, 8, 20, Math.PI),
    new THREE.Vector3(0, 0.358, 0),
  );
  add(
    "seams",
    new THREE.CylinderGeometry(0.043, 0.038, 0.022, 16),
    new THREE.Vector3(0, -0.343, 0),
  );
  add(
    "hardware",
    new THREE.TorusGeometry(0.031, 0.009, 8, 20),
    new THREE.Vector3(0, -0.378, 0),
  );

  for (let index = 0; index < 3; index++) {
    const angle = (index / 3) * Math.PI * 2 + Math.PI / 6;
    const direction = new THREE.Vector3(
      Math.cos(angle),
      0.22,
      Math.sin(angle),
    ).normalize();
    radial(
      "seams",
      new THREE.CylinderGeometry(0.026, 0.027, 0.012, 16),
      direction,
      0.347,
    );
    radial(
      "hardware",
      new THREE.CylinderGeometry(0.02, 0.022, 0.008, 16),
      direction,
      0.354,
    );
    radial(
      "warning",
      new THREE.SphereGeometry(0.016, 12, 8).scale(1, 0.42, 1),
      direction,
      0.36,
    );
  }
  const parts = [];
  for (const [name, geometries] of groups) {
    const geometry = mergeGeometries(geometries);
    // 旋转体在钝头极点会生成重合顶点三角形；只保留有面积的表面。
    const vertices = geometry.getAttribute("position");
    const indices = [];
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    for (let index = 0; index < vertices.count; index += 3) {
      a.fromBufferAttribute(vertices, index);
      b.fromBufferAttribute(vertices, index + 1);
      c.fromBufferAttribute(vertices, index + 2);
      if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-18)
        indices.push(index, index + 1, index + 2);
    }
    geometry.setIndex(indices);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    for (const source of geometries) source.dispose();
    parts.push({ name, geometry, material: materials[name] });
  }
  return { parts, references: 0 };
}
