import * as THREE from "three";

/**
 * 构建巨型章鱼模型：圆润外套膜、八条卷曲腕足，头部朝向 -Z。
 * @param {THREE.Group} body 上层负责统一长度归一化的解剖节点。
 * @param {Function[]} motions 统一动画时钟调用的动作列表。
 * @returns {void} 几何与材质按部件缓存，动画只更新节点变换。
 */
export function buildOctopus(body, motions) {
  const mantle = new THREE.Mesh(mantleGeometry(), SKIN);
  mantle.name = "octopus_rounded_mantle";
  mantle.position.set(0, 0.06, 0.17);
  mantle.scale.set(0.19, 0.2, 0.245);
  body.add(mantle);
  blob(body, RUST, [0, -0.004, -0.071], [0.147, 0.105, 0.134]);

  for (const side of [-1, 1]) {
    // 眼睛位于头部两侧；章鱼的横向瞳孔与乌贼的巨大圆眼区别明显。
    blob(body, RUST, [side * 0.123, 0.039, -0.1], [0.045, 0.047, 0.051]);
    blob(body, AMBER, [side * 0.156, 0.043, -0.117], [0.012, 0.026, 0.032]);
    blob(body, PUPIL, [side * 0.165, 0.043, -0.12], [0.006, 0.008, 0.026]);
    blob(body, CREAM, [side * 0.168, 0.053, -0.133], [0.003, 0.004, 0.006]);
    // 眼上小乳突仅形成柔软皮肤起伏，不使用领主模型的骨冠与棘刺。
    blob(body, RUST, [side * 0.117, 0.084, -0.089], [0.025, 0.026, 0.029]);
  }
  blob(body, DARK_RUST, [0.09, -0.083, -0.097], [0.043, 0.025, 0.057]);

  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const radialX = Math.cos(angle),
      radialY = Math.sin(angle);
    const arm = new THREE.Group();
    arm.name = `octopus_arm_${index + 1}`;
    arm.position.set(radialX * 0.085, radialY * 0.059 - 0.015, -0.16);
    body.add(arm);
    const curve = armCurve(index);
    arm.add(new THREE.Mesh(armGeometry(index, curve), RUST));

    // 两列吸盘随着腕足一起运动；每条腕足合并为静态材质批次。
    for (let row = 0; row < 2; row++) {
      for (let cup = 0; cup < 6; cup++) {
        const progress = 0.13 + cup * 0.108;
        const center = curve.getPointAt(progress);
        const radius = armRadius(progress);
        const size = 0.0125 * (1 - progress * 0.68);
        const disc = new THREE.Mesh(SUCKER, CREAM);
        disc.position.copy(center);
        disc.position.x += (row ? 1 : -1) * radius * 0.4;
        disc.position.y -= radius * 0.91;
        disc.scale.setScalar(size);
        arm.add(disc);
      }
    }
    motions.push((time, effort) => {
      const amplitude = 0.13 + effort * 0.023;
      arm.rotation.x = Math.sin(time * 0.55 + angle) * amplitude;
      arm.rotation.y = Math.cos(time * 0.48 + angle * 1.3) * amplitude * 0.85;
      arm.rotation.z = Math.sin(time * 0.39 + angle * 0.8) * 0.09;
    });
  }
  motions.push((time, effort) => {
    const breath = Math.sin(time * (0.48 + effort * 0.05)) * 0.02;
    mantle.scale.set(0.19 * (1 + breath), 0.2 * (1 + breath), 0.245);
  });
}

const GEOMETRIES = new Map();
const SPHERE = new THREE.SphereGeometry(1, 16, 12);
const SUCKER = new THREE.TorusGeometry(0.73, 0.27, 5, 10);
SUCKER.rotateX(Math.PI / 2);
const SKIN = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.64,
  metalness: 0.01,
});
const RUST = material("#bd553a"),
  DARK_RUST = material("#823e31"),
  CREAM = material("#edbe99"),
  AMBER = material("#d09b49"),
  PUPIL = material("#111418", 0.28);

function material(color, roughness = 0.58) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.01 });
}

function blob(parent, mat, position, scale) {
  const mesh = new THREE.Mesh(SPHERE, mat);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function mantleGeometry() {
  if (GEOMETRIES.has("mantle")) return GEOMETRIES.get("mantle");
  const geometry = new THREE.SphereGeometry(1, 24, 18);
  const positions = geometry.getAttribute("position");
  const colors = [];
  const rust = new THREE.Color("#c5603e"),
    dark = new THREE.Color("#803e30"),
    pale = new THREE.Color("#dda17a"),
    shade = new THREE.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      y = positions.getY(i),
      z = positions.getZ(i);
    const mottling =
      Math.sin(x * 19 + Math.sin(z * 9)) *
      Math.sin(y * 17 - z * 7) *
      Math.sin(z * 21 + y * 5);
    const bump = 1 + Math.max(0, mottling) * 0.047;
    positions.setXYZ(i, x * bump, y * bump, z * bump);
    shade
      .copy(rust)
      .lerp(dark, Math.max(0, mottling) * 0.6)
      .lerp(pale, THREE.MathUtils.smoothstep(-y, 0.2, 0.85) * 0.6);
    colors.push(shade.r, shade.g, shade.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  GEOMETRIES.set("mantle", geometry);
  return geometry;
}

function armCurve(index) {
  const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
  const x = Math.cos(angle),
    y = Math.sin(angle),
    curl = index % 2 ? 1 : -1;
  return new THREE.CatmullRomCurve3(
    [
      [0, 0, 0],
      [x * 0.055, y * 0.045 - 0.025, -0.11],
      [x * 0.15, y * 0.082 - 0.035, -0.25],
      [x * 0.2 + curl * 0.027, y * 0.1 - 0.014, -0.39],
      [x * 0.18 + curl * 0.045, y * 0.082 + 0.035, -0.45],
      [x * 0.135 + curl * 0.042, y * 0.065 + 0.064, -0.414],
      [x * 0.13 + curl * 0.017, y * 0.061 + 0.047, -0.377],
    ].map((point) => new THREE.Vector3(...point)),
  );
}

function armRadius(progress) {
  return THREE.MathUtils.lerp(0.037, 0.0025, progress ** 0.85);
}

function armGeometry(index, curve) {
  const key = `arm_${index}`;
  if (GEOMETRIES.has(key)) return GEOMETRIES.get(key);
  const segments = 32,
    sides = 8;
  const geometry = new THREE.TubeGeometry(curve, segments, 1, sides, false);
  const positions = geometry.getAttribute("position");
  for (let ring = 0; ring <= segments; ring++) {
    const progress = ring / segments;
    const center = curve.getPointAt(progress),
      radius = armRadius(progress);
    for (let side = 0; side <= sides; side++) {
      const i = ring * (sides + 1) + side;
      positions.setXYZ(
        i,
        center.x + (positions.getX(i) - center.x) * radius,
        center.y + (positions.getY(i) - center.y) * radius,
        center.z + (positions.getZ(i) - center.z) * radius,
      );
    }
  }
  geometry.computeVertexNormals();
  GEOMETRIES.set(key, geometry);
  return geometry;
}
