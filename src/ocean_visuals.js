import * as THREE from "three";

/**
 * 为共享材质加入无贴图的微表面纹理；实例复用同一程序，细节不改变实体轮廓。
 * @param {THREE.MeshStandardMaterial} material 目标材质。
 * @param {'stone'|'coral'|'wood'|'metal'} kind 纹理类别。
 * @param {number} scale 物体局部纹理密度。
 * @returns {THREE.MeshStandardMaterial} 原材质。
 */
export function addSurfaceDetail(material, kind = "stone", scale = 1) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vSurfaceDetail;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vec4 detailPosition = vec4(position, 1.0);
      #ifdef USE_INSTANCING
        detailPosition = instanceMatrix * detailPosition;
      #endif
      vSurfaceDetail = detailPosition.xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
      varying vec3 vSurfaceDetail;
      float detailHash(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.yzx + 33.33); return fract((p.x + p.y) * p.z); }
      float detailNoise(vec3 p) {
        vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(detailHash(i),detailHash(i+vec3(1,0,0)),f.x),mix(detailHash(i+vec3(0,1,0)),detailHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(detailHash(i+vec3(0,0,1)),detailHash(i+vec3(1,0,1)),f.x),mix(detailHash(i+vec3(0,1,1)),detailHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }`,
    );
    const patterns = {
      stone: `float broad = detailNoise(p * 0.65); float grain = detailNoise(p * 8.0);
        float strata = pow(0.5 + 0.5 * sin(p.y * 7.0 + broad * 8.0), 7.0);
        float pits = smoothstep(0.65, 0.84, grain);
        float relief = broad * 0.07 + grain * 0.028 - strata * 0.024;
        diffuseColor.rgb *= 0.83 + broad * 0.20 + grain * 0.12 - strata * 0.09 - pits * 0.10;
        diffuseColor.rgb += vec3(0.04, 0.039, 0.027) * smoothstep(0.53, 0.81, broad);`,
      coral: `float grain = detailNoise(p * 12.0); float pores = pow(0.5 + 0.5 * sin(p.x * 21.0 + sin(p.z * 18.0)) * sin(p.y * 25.0 + p.z * 7.0), 5.0);
        float relief = grain * 0.05 - pores * 0.04;
        diffuseColor.rgb *= 0.88 + grain * 0.2 - pores * 0.30;`,
      wood: `float grain = detailNoise(vec3(p.x * 7.0, p.y * 3.0, p.z * 0.6));
        float plank = abs(fract(p.x * 2.8) - 0.5);
        float joint = smoothstep(0.46, 0.497, plank);
        float relief = grain * 0.014 - joint * 0.016;
        diffuseColor.rgb *= 0.79 + grain * 0.36 - joint * 0.36;`,
      metal: `float grain = detailNoise(p * 60.0);
        float relief = grain * 0.0005;
        diffuseColor.rgb *= 0.94 + grain * 0.08;`,
    };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        vec3 p = vSurfaceDetail * ${Number(scale).toFixed(3)};
        ${patterns[kind] || patterns.stone}
      `,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        vec3 detailDx = dFdx(-vViewPosition), detailDy = dFdy(-vViewPosition);
        vec3 detailR1 = cross(detailDy, normal), detailR2 = cross(normal, detailDx);
        float detailDet = dot(detailDx, detailR1);
        vec3 detailGradient = sign(detailDet) * (dFdx(relief) * detailR1 + dFdy(relief) * detailR2);
        normal = normalize(abs(detailDet) * normal - detailGradient * 0.24 + normal * 0.000001);
      `,
      );
  };
  material.customProgramCacheKey = () => `abyssal_surface_${kind}_${scale}_v6`;
  return material;
}

/** 创建底部固定、逐渐弯曲变细的带状叶片；tuft=true 时合并五片海草。 */
export function ribbonGeometry(tuft = false) {
  const positions = [],
    indices = [],
    uvs = [];
  const blades = tuft ? 3 : 1,
    rows = 10,
    columns = 3;
  for (let blade = 0; blade < blades; blade++) {
    const base = positions.length / 3,
      angle = blade * 2.399,
      height = tuft ? 0.72 + blade * 0.07 : 1;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      const width =
        (tuft ? 0.085 : 0.2) * Math.pow(Math.sin(Math.PI * t), 0.62) + 0.002;
      for (let column = 0; column < columns; column++) {
        const side = column - 1;
        const x = side * width + Math.sin(t * 2.2) * t * (tuft ? 0.58 : 0.38);
        const z =
          Math.sin(t * 5.2) * t * 0.11 +
          Math.abs(side) * Math.sin(t * Math.PI) * 0.028;
        positions.push(
          x * Math.cos(angle) - z * Math.sin(angle),
          (t - 0.2 * t * t) * height,
          x * Math.sin(angle) + z * Math.cos(angle),
        );
        uvs.push(column / 2, t);
        if (row < rows && column < columns - 1) {
          const a = base + row * columns + column;
          indices.push(
            a,
            a + columns,
            a + 1,
            a + 1,
            a + columns,
            a + columns + 1,
          );
        }
      }
    }
  }
  return geometryFrom(positions, indices, uvs);
}

/** 圆润枝状珊瑚的单枝，多个实例仍沿原来固定的分叉位置组合。 */
export function coralBranchGeometry() {
  const positions = [],
    indices = [],
    rows = 8,
    sides = 7;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    const radius =
      (0.15 - t * 0.032) *
      Math.pow(Math.max(0.004, Math.sin(Math.PI * t)), 0.28);
    for (let side = 0; side < sides; side++) {
      const a = (side / sides) * Math.PI * 2;
      const r = radius * (1 + Math.sin(a * 3 + t * 14) * 0.09);
      positions.push(
        Math.cos(a) * r + Math.sin(t * 4) * 0.07,
        t - 0.5,
        Math.sin(a) * r + Math.sin(t * 7) * 0.035,
      );
      if (row < rows) {
        const p = row * sides + side,
          n = row * sides + ((side + 1) % sides);
        indices.push(p, p + sides, n, n, p + sides, n + sides);
      }
    }
  }
  return geometryFrom(positions, indices);
}

/** 海扇以分叉细带和横向连接构成真实孔隙，不使用整张透明扇面。 */
export function seaFanGeometry() {
  const positions = [],
    indices = [];
  const segment = (a, b, radius) => {
    const d = new THREE.Vector3().subVectors(b, a).normalize();
    const p = new THREE.Vector3(-d.y, d.x, 0).multiplyScalar(radius);
    const base = positions.length / 3;
    for (const q of [
      a.clone().add(p),
      a.clone().sub(p),
      b.clone().addScaledVector(p, 0.68),
      b.clone().addScaledVector(p, -0.68),
    ])
      positions.push(q.x, q.y, q.z);
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  };
  segment(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.3, 0), 0.045);
  const ribs = [];
  for (let rib = 0; rib < 17; rib++) {
    const theta = -1.32 + (rib / 16) * 2.64 + Math.sin(rib * 7.3) * 0.017,
      nodes = [new THREE.Vector3(0, 0.2, 0)];
    for (let step = 1; step <= 9; step++) {
      const t = step / 9;
      const point = new THREE.Vector3(
        Math.sin(theta) * t * 0.9 +
          Math.sin(step * 1.8 + rib * 2.3) * t * 0.023,
        0.2 + Math.cos(theta * 0.78) * t * (1.02 + Math.sin(rib * 3.1) * 0.055),
        Math.sin(t * 5 + theta) * t * 0.065,
      );
      segment(nodes.at(-1), point, 0.018 * (1 - t * 0.55));
      if (rib && step > 2 && (rib + step) % 3 !== 0)
        segment(point, ribs[rib - 1][step - (step % 2)], 0.007);
      nodes.push(point);
    }
    ribs.push(nodes);
  }
  return geometryFrom(positions, indices);
}

/** 团簇脑珊瑚保持圆润轮廓，沟壑来自共享程序材质而非尖锐低面球。 */
export function moundCoralGeometry() {
  const geometry = new THREE.SphereGeometry(1, 16, 10);
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const r = 1 + 0.1 * Math.sin(x * 7 + y * 3) * Math.sin(z * 8 - y * 4);
    p.setXYZ(i, x * r, y * r, z * r);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** 按相同顶点位置平均法线，仅修正岩石光照，不移动任何碰撞包络顶点。 */
export function smoothCoincidentNormals(geometry) {
  const p = geometry.attributes.position,
    n = geometry.attributes.normal,
    groups = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(5)},${p.getY(i).toFixed(5)},${p.getZ(i).toFixed(5)}`;
    if (!groups.has(key))
      groups.set(key, { normal: new THREE.Vector3(), indices: [] });
    const group = groups.get(key);
    group.indices.push(i);
    group.normal.add(new THREE.Vector3().fromBufferAttribute(n, i));
  }
  for (const group of groups.values()) {
    group.normal.normalize();
    for (const i of group.indices)
      n.setXYZ(i, group.normal.x, group.normal.y, group.normal.z);
  }
  return geometry;
}

function geometryFrom(positions, indices, uvs) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  if (uvs)
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** 将大片植被按空间块拆为共享几何的实例批次，使视锥剔除只提交附近叶片。 */
export function clusterInstances(source, cellSize = 90) {
  const groups = new Map(),
    matrix = new THREE.Matrix4(),
    point = new THREE.Vector3(),
    color = new THREE.Color();
  for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, matrix);
    point.setFromMatrixPosition(matrix);
    const key = `${Math.floor(point.x / cellSize)}_${Math.floor(point.z / cellSize)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(i);
  }
  const root = new THREE.Group();
  root.name = `${source.name || "vegetation"}_clusters`;
  for (const indices of groups.values()) {
    const batch = new THREE.InstancedMesh(
      source.geometry,
      source.material,
      indices.length,
    );
    for (let i = 0; i < indices.length; i++) {
      source.getMatrixAt(indices[i], matrix);
      batch.setMatrixAt(i, matrix);
      if (source.instanceColor) {
        source.getColorAt(indices[i], color);
        batch.setColorAt(i, color);
      }
    }
    batch.computeBoundingSphere();
    batch.boundingSphere.radius += 3;
    root.add(batch);
  }
  source.dispose();
  return root;
}

/** 叶片根部自然变暗、叶缘透亮，并用低对比细脉帮助近景阅读。 */
export function addLeafDetail(material) {
  const previous = material.onBeforeCompile,
    previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vLeafDetail;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvLeafDetail = uv;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vLeafDetail;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      float midrib = exp(-abs(vLeafDetail.x - 0.5) * 65.0);
      float veins = sin(vLeafDetail.y * 95.0 + abs(vLeafDetail.x - 0.5) * 19.0) * 0.025;
      diffuseColor.rgb *= 0.64 + vLeafDetail.y * 0.42 + midrib * 0.18 + veins;
    `,
      );
  };
  material.customProgramCacheKey = () => `${previousKey}_leaf_v6`;
  return material;
}
