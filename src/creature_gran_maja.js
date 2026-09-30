import * as THREE from "three";
import { skinMaterial } from "./creature_surface.js";
import {
  granMajaGeometry,
  granMajaHeadPoint,
  granMajaHeadGeometry,
  granMajaBodyGeometry,
  granMajaBodyCenter,
  granMajaTubeGeometry,
} from "./creature_gran_maja_geometry.js";

/**
 * 构造扁宽灰色头盘、六眼笑口和环褶蛇体的格兰玛雅外观。
 * @param {THREE.Group} body 由领主工厂归一化的外观组。
 * @param {Function[]} motions 接收累计相位和运动强度的实例动作。
 * @returns {void} 只定义外观，不定义技能、攻击范围或接触区域。
 */
export function buildGranMaja(body, motions) {
  body.userData.artIdentity = "gran_maja";
  body.userData.artRevision = "silver_six_eye_serpent";
  addBody(body, motions);
  addMesh(body, "upper_head_disc", () => granMajaHeadGeometry(false), SKIN);
  addMesh(body, "upper_palate", () => granMajaHeadGeometry(false, true), MOUTH);
  addMesh(body, "lower_palate", () => granMajaHeadGeometry(true, true), MOUTH);
  addMouth(body, false);
  addEyes(body);
  const jaw = new THREE.Group();
  jaw.name = "gran_maja_lower_jaw";
  jaw.position.set(0, -0.025, -0.24);
  body.add(jaw);
  // 外侧下头盘与上盘保持闭合，呼吸动作仅驱动中央唇、牙龈与牙齿。
  addMesh(body, "lower_head_disc", () => granMajaHeadGeometry(true), SKIN);
  const detail = new THREE.Group();
  detail.position.copy(jaw.position).multiplyScalar(-1);
  jaw.add(detail);
  addMouth(detail, true);
  const throat = addMesh(
    body,
    "throat",
    () => new THREE.SphereGeometry(1, 16, 8),
    THROAT,
  );
  throat.position.set(0, -0.038, -0.431);
  throat.scale.set(0.031, 0.016, 0.009);
  motions.push((time, effort) => {
    jaw.rotation.x =
      -0.003 - (0.005 + effort * 0.001) * (0.5 + Math.sin(time * 0.23) * 0.5);
  });
}

const SKIN = skinMaterial({
  vertexColors: true,
  roughness: 0.57,
  clearcoat: 0.08,
  pattern: 0.014,
});
const compileSkin = SKIN.onBeforeCompile;
SKIN.onBeforeCompile = (shader) => {
  compileSkin(shader);
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <normal_fragment_begin>",
    `#include <normal_fragment_begin>
    vec2 foldPoint = vec2(abs(vSkinPosition.x) - 0.125, (vSkinPosition.z + 0.405) * 1.22);
    foldPoint += vec2(sin(vSkinPosition.z * 31.0 + vSkinPosition.y * 17.0), sin(vSkinPosition.x * 29.0 - vSkinPosition.z * 13.0)) * 0.012;
    float foldPhase = length(foldPoint) * 290.0 + vSkinPosition.z * 185.0 + sin(vSkinPosition.x * 59.0 + vSkinPosition.z * 47.0) * 1.8;
    float micro = sin(vSkinPosition.x * 621.0 + vSkinPosition.z * 537.0 + sin(vSkinPosition.y * 71.0 - vSkinPosition.z * 61.0) * 3.0);
    float skinScale = length(dFdx(vViewPosition)) / max(0.000001, length(dFdx(vSkinPosition)));
    float skinHeight = (sin(foldPhase) * 0.00014 + sin(foldPhase * 2.0 + 0.4) * 0.000035 + micro * 0.000008) * skinScale;
    vec3 sx = dFdx(vViewPosition), sy = dFdy(vViewPosition);
    vec3 r1 = cross(sy, normal), r2 = cross(normal, sx);
    float det = dot(sx, r1);
    normal = normalize(abs(det) * normal - sign(det) * (dFdx(skinHeight) * r1 + dFdy(skinHeight) * r2));
  `,
  );
};
SKIN.customProgramCacheKey = () => "gran_maja_silver_wrinkled_skin_v2";
const MOUTH = skinMaterial({
  vertexColors: true,
  roughness: 0.8,
  clearcoat: 0,
  pattern: 0.03,
});
const GUM = skinMaterial({
  vertexColors: true,
  roughness: 0.42,
  clearcoat: 0.12,
  pattern: 0.02,
});
const TOOTH = skinMaterial({
  vertexColors: true,
  roughness: 0.37,
  clearcoat: 0.1,
  pattern: 0.015,
});
const THROAT = new THREE.MeshStandardMaterial({
  color: "#08080c",
  roughness: 1,
});
const SOCKET = skinMaterial({
  color: "#646a70",
  roughness: 0.64,
  pattern: 0.04,
});
const EYE = new THREE.MeshStandardMaterial({
  color: "#1856c2",
  emissive: "#0759da",
  emissiveIntensity: 0.6,
  roughness: 0.24,
});

function addMesh(parent, key, create, material = SKIN) {
  const mesh = new THREE.Mesh(granMajaGeometry(`v2_${key}`, create), material);
  mesh.name = `gran_maja_${key}`;
  parent.add(mesh);
  return mesh;
}
function addBody(body, motions) {
  const geometry = granMajaGeometry(
      "v2_ringed_serpent_body",
      granMajaBodyGeometry,
    ),
    mesh = new THREE.SkinnedMesh(geometry, SKIN),
    bones = Array.from({ length: 6 }, () => new THREE.Bone());
  mesh.name = "gran_maja_continuous_swimming_body";
  mesh.userData.keepSeparate = true;
  bones[0].position.copy(granMajaBodyCenter(-0.22));
  for (let i = 1; i < bones.length; i++) {
    bones[i].position
      .copy(granMajaBodyCenter(-0.22 + i * 0.154))
      .sub(granMajaBodyCenter(-0.22 + (i - 1) * 0.154));
    bones[i - 1].add(bones[i]);
  }
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.boundingSphere = geometry.boundingSphere.clone();
  mesh.boundingSphere.radius += 0.17;
  body.add(mesh);
  motions.push((time, effort) => {
    const beat = time * 0.32,
      power = 0.14 + effort * 0.024;
    for (let i = 1; i < bones.length; i++) {
      bones[i].rotation.y =
        Math.sin(beat - i * 1.06) * power * (0.58 + i * 0.1);
      bones[i].rotation.x = Math.sin(beat * 0.62 - i * 0.66) * 0.025;
    }
  });
}
function addMouth(parent, lower) {
  const half = lower ? Math.PI : 0,
    key = lower ? "lower" : "upper";
  const rim = Array.from({ length: 31 }, (_, i) =>
    granMajaHeadPoint(0, half + (i / 30) * Math.PI).toArray(),
  );
  addMesh(parent, `${key}_lip`, () =>
    granMajaTubeGeometry(rim, 0.0045, 0.004, "lip", 52),
  );
  const gum = Array.from({ length: 31 }, (_, i) =>
    (() => {
      const p = granMajaHeadPoint(0.033, half + (i / 30) * Math.PI, true);
      p.y += lower ? 0.005 : -0.005;
      p.z -= 0.001;
      return p.toArray();
    })(),
  );
  addMesh(
    parent,
    `${key}_red_gum`,
    () => granMajaTubeGeometry(gum, 0.0075, 0.007, "gum", 50),
    GUM,
  );
  for (let i = 0; i < 30; i++) {
    const a = half + 0.09 + (i / 29) * (Math.PI - 0.18),
      p = granMajaHeadPoint(0.02, a, true),
      length = 0.017 + Math.sin(a) ** 2 * 0.005 + (i % 3) * 0.0004,
      tip = p.clone();
    p.y += lower ? 0.004 : -0.004;
    tip.y += (lower ? 1 : -1) * (length + 0.004);
    tip.x *= 0.98;
    tip.z -= 0.001;
    const middle = p.clone().lerp(tip, 0.55);
    middle.z -= 0.0012;
    addMesh(
      parent,
      `tooth_${key}_${i}`,
      () =>
        granMajaTubeGeometry(
          [p.toArray(), middle.toArray(), tip.toArray()],
          0.0038,
          0.00135,
          "tooth",
          5,
        ),
      TOOTH,
    );
  }
}
function addEyes(body) {
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 0.035,
      t = 0.075,
      a = Math.acos(x / 0.144),
      p = granMajaHeadPoint(t, a),
      normal = new THREE.Vector3(x * 2.6, 0.52, -0.85).normalize(),
      size = i === 0 || i === 5 ? 1.15 : i === 1 || i === 4 ? 0.98 : 0.87;
    const socket = addMesh(
      body,
      "eye_socket",
      () => new THREE.SphereGeometry(1, 16, 10),
      SOCKET,
    );
    socket.position.copy(p).addScaledVector(normal, -0.0006);
    socket.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    socket.scale.set(0.014 * size, 0.0117 * size, 0.0045);
    const lens = addMesh(
      body,
      "eye_lens",
      () => new THREE.SphereGeometry(1, 16, 10),
      EYE,
    );
    lens.position.copy(p).addScaledVector(normal, 0.0019);
    lens.quaternion.copy(socket.quaternion);
    lens.scale.set(0.0108 * size, 0.009 * size, 0.0038);
    const lid = Array.from({ length: 13 }, (_, k) => {
      const angle = 0.06 + (k / 12) * (Math.PI - 0.12),
        q = new THREE.Vector3(
          Math.cos(angle) * 0.0132 * size,
          Math.sin(angle) * 0.0114 * size,
          0.0012,
        );
      q.applyQuaternion(socket.quaternion).add(p);
      return q.toArray();
    });
    addMesh(body, `eye_lid_${i}`, () =>
      granMajaTubeGeometry(lid, 0.0019, 0.0014, "skin", 14),
    );
  }
}
