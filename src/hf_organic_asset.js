import { createMaterialPreparation } from "./material_loading.js";
import * as THREE from "three";

/** 解码离线量化的实体网格；绑定由各物种按实际解剖提供，避免共用错误转轴。 */
export function decodeOrganicMesh(packed, bind, fallbackColor) {
  const decode = (value, Type) => {
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    return new Type(bytes.buffer);
  };
  const quantized = decode(packed.position, Uint16Array);
  const positions = new Float32Array(quantized.length);
  const ids = packed.skinIndex
    ? decode(packed.skinIndex, Uint16Array)
    : new Uint16Array(packed.vertices * 4);
  const weights = new Float32Array(packed.vertices * 4);
  if (packed.skinWeight) {
    const quantizedWeights = decode(packed.skinWeight, Uint16Array);
    for (let i = 0; i < weights.length; i++)
      weights[i] = quantizedWeights[i] / 65535;
  }
  const colors = new Float32Array(positions.length);
  const color = new THREE.Color();
  for (let i = 0; i < positions.length; i++) {
    const axis = i % 3;
    positions[i] =
      packed.min[axis] +
      (quantized[i] / 65535) * (packed.max[axis] - packed.min[axis]);
  }
  for (let i = 0; i < packed.vertices; i++) {
    const x = positions[i * 3],
      y = positions[i * 3 + 1],
      z = positions[i * 3 + 2];
    if (bind) bind(x, y, z, ids, weights, i * 4, i);
    fallbackColor(x, y, z, color);
    color.toArray(colors, i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(decode(packed.normal, Int16Array), 3, true),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(decode(packed.uv, Uint16Array), 2, true),
  );
  geometry.setAttribute(
    "color",
    packed.color
      ? new THREE.BufferAttribute(decode(packed.color, Uint8Array), 3, true)
      : new THREE.BufferAttribute(colors, 3),
  );
  geometry.setAttribute("skinIndex", new THREE.BufferAttribute(ids, 4));
  geometry.setAttribute("skinWeight", new THREE.BufferAttribute(weights, 4));
  geometry.setIndex(
    new THREE.BufferAttribute(decode(packed.index, Uint16Array), 1),
  );
  for (const group of packed.groups || [])
    geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** 柔和的非金属湿润表皮；不使用额外清漆、发光或后处理掩盖纹理。 */
export function organicMaterial(roughness, vertexColors = true) {
  return new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness,
    metalness: 0,
    ior: 1.4,
    specularIntensity: 0.65,
    vertexColors,
  });
}

/** 保留原纹理的辨识花纹，压低生成图自带的明暗反差；真实光照继续参与着色。 */
function balanceOrganicAlbedo(material, kind) {
  const tint = new THREE.Color(kind === "orca" ? 0x17242c : 0xa1664d);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.organicTint = { value: tint };
    shader.vertexShader =
      "varying float organicLocalZ;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\norganicLocalZ = position.z;",
    );
    shader.fragmentShader =
      "uniform vec3 organicTint;\nvarying float organicLocalZ;\n" +
      shader.fragmentShader;
    const balance =
      kind === "orca"
        ? `float whiteMark = smoothstep(0.045, 0.5, organicLum);
          diffuseColor.rgb = mix(organicTint + diffuseColor.rgb * 0.35,
            diffuseColor.rgb * 0.88, whiteMark);`
        : `float eyeRegion = smoothstep(-0.015, 0.025, organicLocalZ);
          float darkEye = eyeRegion * (1.0 - smoothstep(0.008, 0.035, organicLum));
          diffuseColor.rgb = mix(mix(organicTint, diffuseColor.rgb, 0.48),
            diffuseColor.rgb, darkEye);`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      #ifdef USE_MAP
        float organicLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        ${balance}
      #endif`,
    );
  };
  material.customProgramCacheKey = () => `organic_albedo_v1_${kind}`;
}

/** 每个物种仅缓存一张色图；离线/超时保留实体和解剖配色，不阻塞进入游戏。 */
export function organicSurface(name, url, roughness, kind) {
  const material = organicMaterial(roughness);
  material.name = name;
  balanceOrganicAlbedo(material, kind);
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url,
        colorSpace: THREE.SRGBColorSpace,
        apply(texture) {
          material.map = texture;
          material.vertexColors = false;
          material.needsUpdate = true;
        },
      },
    ],
    (ready) => {
      material.userData.texturesReady = ready;
    },
  );
  return { material, prepare };
}

/** 每个实例有独立骨架；仅共享不可变几何和材质，沿用调用方的统一动画循环。 */
export function bindOrganicBody(root, name, geometry, material, bones, margin) {
  const body = new THREE.SkinnedMesh(geometry, material);
  body.name = name;
  body.userData.keepSeparate = true;
  root.add(body);
  root.updateMatrixWorld(true);
  body.bind(new THREE.Skeleton(bones));
  body.boundingSphere = geometry.boundingSphere.clone();
  body.boundingSphere.radius += margin;
  return body;
}
