import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// 生成模型把透明头盾烘成了不透明眼球：只整理其头盾表面，保留 HF 躯干/嘴，
// 并在罩内装配两只向上看的管状眼。无需折射渲染或额外灯光。
export function prepareBarreleyeHead(geometry, material) {
  const p = geometry.attributes.position,
    n = geometry.attributes.normal,
    normal = new Float32Array(n.count * 3),
    v = new THREE.Vector3(),
    q = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    q.fromBufferAttribute(n, i).toArray(normal, i * 3);
    const blend =
      THREE.MathUtils.smoothstep(-v.z, 0.303, 0.345) *
      THREE.MathUtils.smoothstep(v.y + 0.61 * v.z + 0.285, 0, 0.025);
    if (!blend) continue;
    const d = new THREE.Vector3(
      v.x / 0.135,
      (v.y + 0.018) / 0.146,
      (v.z + 0.303) / 0.195,
    ).normalize();
    v.lerp(
      new THREE.Vector3(d.x * 0.135, d.y * 0.146 - 0.018, d.z * 0.195 - 0.303),
      blend,
    );
    p.setXYZ(i, v.x, v.y, v.z);
    q.lerp(
      new THREE.Vector3(d.x / 0.135, d.y / 0.146, d.z / 0.195).normalize(),
      blend,
    )
      .normalize()
      .toArray(normal, i * 3);
  }
  geometry.setAttribute("normal", new THREE.BufferAttribute(normal, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  material.transparent = true;
  material.onBeforeCompile = (s) => {
    s.vertexShader = "varying vec3 deepRest;\n" + s.vertexShader;
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ndeepRest=position;",
    );
    s.fragmentShader = "varying vec3 deepRest;\n" + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float headShield=smoothstep(.303,.325,-deepRest.z)*smoothstep(0.0,.018,deepRest.y+.61*deepRest.z+.285);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.09,.17,.14),headShield);`,
    );
    s.fragmentShader = s.fragmentShader.replace(
      "#include <opaque_fragment>",
      `diffuseColor.a=mix(1.0,.18+.42*pow(1.0-abs(dot(normal,normalize(vViewPosition))),2.0),headShield);
      #include <opaque_fragment>`,
    );
  };
  material.customProgramCacheKey = () => "mariana_barreleye_fluid_head_v3";
  const tubes = [],
    lenses = [];
  for (const side of [-1, 1]) {
    const tube = new THREE.LatheGeometry(
      [
        [0, -0.05],
        [0.013, -0.05],
        [0.02, -0.035],
        [0.025, 0],
        [0.032, 0.025],
        [0.03, 0.045],
        [0.02, 0.054],
        [0, 0.055],
      ].map((p) => new THREE.Vector2(...p)),
      20,
    );
    tube.rotateX(-0.12);
    tube.translate(side * 0.055, -0.014, -0.382);
    tubes.push(tube);
    const lens = new THREE.SphereGeometry(0.029, 20, 12);
    lens.scale(1, 0.6, 1);
    lens.rotateX(-0.12);
    lens.translate(side * 0.055, 0.037, -0.389);
    lenses.push(lens);
  }
  const tubeGeometry = mergeGeometries(tubes),
    lensGeometry = mergeGeometries(lenses);
  [...tubes, ...lenses].forEach((g) => g.dispose());
  return {
    tubeGeometry,
    lensGeometry,
    tubeMaterial: new THREE.MeshStandardMaterial({
      color: 0x405630,
      roughness: 0.68,
    }),
    lensMaterial: new THREE.MeshStandardMaterial({
      color: 0x79a82e,
      roughness: 0.35,
      emissive: 0x263809,
      emissiveIntensity: 0.18,
    }),
  };
}
export function addBarreleyeHead(root, head) {
  const parts = [];
  for (const [name, g, m] of [
    ["tubular_eyes", head.tubeGeometry, head.tubeMaterial],
    ["eye_lenses", head.lensGeometry, head.lensMaterial],
  ]) {
    const mesh = new THREE.Mesh(g, m);
    mesh.name = `barreleye_${name}`;
    root.add(mesh);
    parts.push(mesh);
  }
  return parts;
}
