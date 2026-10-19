import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// 左右发动机固定在躯干后段：胸鳍后方、尾关节之前，不随尾摆扫进尾鳍。
export const MECHANICAL_JET_BONE = 0;
export const MECHANICAL_JETS = [
  [-0.112, 0.022, 0.095],
  [0.112, 0.022, 0.095],
];
export const MECHANICAL_JET_YAWS = [-0.055, 0.055];
export const MECHANICAL_ENERGY = new THREE.MeshStandardMaterial({
  color: 0xff8b3f,
  emissive: 0xe8470b,
  emissiveIntensity: 0.8,
  metalness: 0.35,
  roughness: 0.3,
});
// 仅喷口采用冷蓝能量色；眼部、导弹口及铜色机械细节保持原样。
const JET_ENERGY = new THREE.MeshStandardMaterial({
  color: 0x9de0ff,
  emissive: 0x3896dd,
  emissiveIntensity: 1.1,
  metalness: 0.3,
  roughness: 0.3,
});
/** 将单位模型坐标中的硬件位置换算到真实支撑关节的局部空间。 */
export function placeMechanicalPart(root, part, bone, location) {
  part.position.copy(
    bone.worldToLocal(root.localToWorld(new THREE.Vector3(...location))),
  );
  bone.add(part);
}
const STEEL = new THREE.MeshStandardMaterial({
  color: 0x858986,
  metalness: 0.65,
  roughness: 0.43,
});
const DARK = new THREE.MeshStandardMaterial({
  color: 0x242527,
  metalness: 0.45,
  roughness: 0.55,
});
const POD_METAL = new THREE.MeshStandardMaterial({
  vertexColors: true,
  metalness: 0.65,
  roughness: 0.56,
});
function coloredPart(geometry, color) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute("uv");
  g.computeVertexNormals();
  const c = new THREE.Color(color),
    values = [];
  for (let i = 0; i < g.attributes.position.count; i++)
    values.push(c.r, c.g, c.b);
  g.setAttribute("color", new THREE.Float32BufferAttribute(values, 3));
  return g;
}
// 六道截面构成有厚度的八边形装甲舱，前端收尖、后端套住喷口。
// 挂架与壳体合批；两侧只镜像挂架，仍共享材质，不增加逐帧几何构造。
function casing(side) {
  const section = [
    [-0.17, 0.01],
    [-0.147, 0.027],
    [-0.125, 0.033],
    [-0.035, 0.033],
    [-0.017, 0.027],
    [0, 0.023],
  ];
  const positions = [],
    indices = [];
  for (const [z, radius] of section)
    for (let k = 0; k < 8; k++) {
      const angle = ((k + 0.5) * Math.PI) / 4;
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
    }
  for (let row = 0; row < section.length - 1; row++)
    for (let k = 0; k < 8; k++) {
      const a = row * 8 + k,
        b = row * 8 + ((k + 1) % 8);
      indices.push(a, b, a + 8, b, b + 8, a + 8);
    }
  // 前盖闭合；后端开放给内部涡轮和火焰。
  positions.push(0, 0, section[0][0]);
  for (let k = 0; k < 8; k++) indices.push(48, (k + 1) % 8, k);
  const shell = new THREE.BufferGeometry();
  shell.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  shell.setIndex(indices);
  const parts = [coloredPart(shell, 0x999e9d)];
  for (const z of [-0.12, -0.055]) {
    parts.push(
      coloredPart(
        new THREE.BoxGeometry(0.052, 0.023, 0.026).translate(
          -side * 0.042,
          -0.007,
          z,
        ),
        0x555d5c,
      ),
    );
    parts.push(
      coloredPart(
        new THREE.CylinderGeometry(0.0345, 0.0345, 0.009, 8, 1, true)
          .rotateY(Math.PI / 8)
          .rotateX(Math.PI / 2)
          .translate(0, 0, z),
        0x343b3d,
      ),
    );
    for (const sign of [-1, 1])
      parts.push(
        coloredPart(
          new THREE.BoxGeometry(0.006, 0.004, 0.011).translate(
            side * 0.0295,
            sign * 0.013,
            z,
          ),
          0x967459,
        ),
      );
  }
  parts.push(
    coloredPart(
      new THREE.CylinderGeometry(0.022, 0.019, 0.026, 16, 1, true)
        .rotateX(Math.PI / 2)
        .translate(0, 0, -0.012),
      0x272f31,
    ),
  );
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}
const CASINGS = [casing(-1), casing(1)];
const HUB = new THREE.CylinderGeometry(0.009, 0.009, 0.014, 6).rotateZ(
  Math.PI / 2,
);
const RIM = new THREE.TorusGeometry(0.022, 0.002, 6, 24);
const blades = [];
for (let i = 0; i < 7; i++)
  blades.push(
    new THREE.BoxGeometry(0.004, 0.017, 0.003)
      .translate(0, 0.009, 0)
      .rotateZ((i * Math.PI * 2) / 7),
  );
const ROTOR = mergeGeometries(blades);
blades.forEach((g) => g.dispose());
/** 成对侧置装甲推进舱、真实喷口内构与鳍根轴承。 */
export function addMechanicalHardware(root, bones, motions) {
  const rotors = [];
  for (const [index, location] of MECHANICAL_JETS.entries()) {
    const pod = new THREE.Mesh(CASINGS[index], POD_METAL);
    pod.name = "waterjet_housing";
    placeMechanicalPart(root, pod, bones[MECHANICAL_JET_BONE], location);
    pod.rotation.y = MECHANICAL_JET_YAWS[index];
    const rim = new THREE.Mesh(RIM, JET_ENERGY);
    rim.name = "waterjet_exit_ring";
    pod.add(rim);
    const rotor = new THREE.Mesh(ROTOR, DARK);
    rotor.name = "intake_turbine";
    rotor.position.z = -0.003;
    pod.add(rotor);
    rotors.push(rotor);
  }
  for (const bone of bones.slice(5)) {
    const hub = new THREE.Mesh(HUB, STEEL);
    hub.name = "pectoral_servo_hub";
    bone.add(hub);
  }
  motions.push((phase) =>
    rotors.forEach((r, i) => {
      r.rotation.z = phase * 8 * (i ? -1 : 1);
    }),
  );
}
