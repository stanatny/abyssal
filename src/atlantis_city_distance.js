import * as THREE from "three";
import { cityLightBlend } from "./region_appearance.js";
import { WORLD } from "./world_config.js";

// 只处理城市实体材质；生物、地形、墨汁与全局雾的能见度保持原规则。
const fogOwners = new WeakMap();
// Three 会复用材质的已编译程序；重入场景时必须继续更新同一个 uniform 对象。
const fogUniforms = new WeakMap();
const cityFog = `
vec3 cityUnfogged = gl_FragColor.rgb;
#include <fog_fragment>
#if defined(USE_FOG) && defined(FOG_EXP2)
  float cityBaseFog = min(cityAmbientDensity, 0.00145);
  float cityInkFog = max(0.0, fogDensity - cityAmbientDensity);
  float cityDensity = cityBaseFog + cityInkFog;
  float cityFogFactor = 1.0 - exp(-cityDensity * cityDensity * vFogDepth * vFogDepth);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(cityUnfogged, fogColor, cityFogFactor),
    smoothstep(150.0, 300.0, vFogDepth));
#endif`;

/** 远近两层使用同一城市水雾，近处不变；引用计数避免重入城市叠加着色器。 */
function acquireCityFog(material) {
  let entry = fogOwners.get(material);
  if (!entry) {
    const compile = material.onBeforeCompile;
    const cacheKey = material.customProgramCacheKey;
    const key = cacheKey.call(material);
    const ambient = fogUniforms.get(material) ?? { value: 0.006 };
    fogUniforms.set(material, ambient);
    material.onBeforeCompile = function (shader, renderer) {
      shader.uniforms.cityAmbientDensity = ambient;
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <fog_pars_fragment>",
          "#include <fog_pars_fragment>\nuniform float cityAmbientDensity;",
        )
        .replace("#include <fog_fragment>", cityFog);
      // 先包裹，再让已有石材/贝珠雾逻辑展开内部 chunk，保留近处原貌。
      compile.call(this, shader, renderer);
    };
    material.customProgramCacheKey = () => `${key}:atlantis-city-distance-v1`;
    material.needsUpdate = true;
    entry = { count: 0, compile, cacheKey, ambient };
    fogOwners.set(material, entry);
  }
  entry.count++;
  return {
    ambient: entry.ambient,
    release() {
      if (--entry.count) return;
      material.onBeforeCompile = entry.compile;
      material.customProgramCacheKey = entry.cacheKey;
      material.needsUpdate = true;
      fogOwners.delete(material);
    },
  };
}

/** 顶点聚类保留真实屋顶、柱廊与拱门，远景不加载贴图、家具或新灯光。 */
export function simplifyCityGeometry(source, cell = 1.6) {
  const p = source.attributes.position;
  const grid = new Map(),
    cells = [],
    remap = new Uint32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const key = `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    let id = grid.get(key);
    if (id === undefined) {
      id = cells.length;
      grid.set(key, id);
      cells.push([0, 0, 0, 0]);
    }
    const v = cells[id];
    v[0] += x;
    v[1] += y;
    v[2] += z;
    v[3]++;
    remap[i] = id;
  }
  const positions = new Float32Array(cells.length * 3);
  cells.forEach((v, i) => {
    for (let a = 0; a < 3; a++) positions[i * 3 + a] = v[a] / v[3];
  });
  const indices = [],
    faces = new Set();
  const count = source.index?.count ?? p.count;
  for (let i = 0; i < count; i += 3) {
    const a = remap[source.index ? source.index.getX(i) : i];
    const b = remap[source.index ? source.index.getX(i + 1) : i + 1];
    const c = remap[source.index ? source.index.getX(i + 2) : i + 2];
    if (a === b || b === c || c === a) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(",");
    if (faces.has(key)) continue;
    faces.add(key);
    indices.push(a, b, c);
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  result.setIndex(indices);
  result.computeVertexNormals();
  return result;
}

/** 私有、可取消的远景层；每街区一个无纹理批次，使用原建筑的真实实例变换。 */
export function createAtlantisCityDistance(parent) {
  const root = new THREE.Group();
  root.name = "atlantis_distant_city";
  parent.add(root);
  const material = new THREE.MeshBasicMaterial({ vertexColors: true });
  material.name = "atlantis_city_silhouette";
  material.color.setRGB(0.36, 0.43, 0.45);
  const geometries = new Map(),
    releases = new Map(),
    entries = [];
  let disposed = false;
  const stats = { meshes: 0, triangles: 0, sourceTriangles: 0 };
  function fogFor(m) {
    if (!releases.has(m)) releases.set(m, acquireCityFog(m));
  }
  fogFor(material);
  function prepareMaterials(object) {
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      for (const m of Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material])
        fogFor(m);
    });
  }
  function* addSteps(
    source,
    name,
    { minY = -Infinity, include = () => true } = {},
  ) {
    const positions = [],
      colors = [],
      triangles = [];
    const matrix = new THREE.Matrix4(),
      local = new THREE.Matrix4();
    const a = new THREE.Vector3(),
      b = new THREE.Vector3(),
      c = new THREE.Vector3();
    const normal = new THREE.Vector3(),
      edge = new THREE.Vector3(),
      normalMatrix = new THREE.Matrix3();
    const color = new THREE.Color();
    source.updateWorldMatrix(true, true);
    const inverse = parent.matrixWorld.clone().invert();
    prepareMaterials(source);
    const meshes = [];
    source.traverse((m) => {
      if (m.isMesh && include(m)) meshes.push(m);
    });
    for (const mesh of meshes) {
      yield "city-distance-geometry";
      // 小构件由聚类压缩；主殿只传入主体网格，动画雕像保留原网格。
      if (mesh.isSkinnedMesh) continue;
      let geometry = geometries.get(mesh.geometry);
      if (!geometry) {
        geometry = simplifyCityGeometry(mesh.geometry);
        geometries.set(mesh.geometry, geometry);
      }
      const p = geometry.attributes.position,
        indices = geometry.index;
      const instances = mesh.isInstancedMesh ? mesh.count : 1;
      const base = (
        Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      ).color;
      color.copy(base ?? new THREE.Color(0xb8c5c2));
      for (let n = 0; n < instances; n++) {
        matrix.multiplyMatrices(inverse, mesh.matrixWorld);
        if (mesh.isInstancedMesh) {
          mesh.getMatrixAt(n, local);
          matrix.multiply(local);
        }
        stats.sourceTriangles +=
          (mesh.geometry.index?.count ??
            mesh.geometry.attributes.position.count) / 3;
        normalMatrix.getNormalMatrix(matrix);
        const used = new Map();
        const vertex = (id, v) => {
          if (used.has(id)) return used.get(id);
          const index = positions.length / 3;
          used.set(id, index);
          normal
            .fromBufferAttribute(geometry.attributes.normal, id)
            .applyNormalMatrix(normalMatrix);
          const shade =
            0.13 + 0.09 * Math.max(0, normal.y) + 0.04 * Math.max(0, normal.z);
          positions.push(v.x, v.y, v.z);
          colors.push(color.r * shade * 0.85, color.g * shade, color.b * shade);
          return index;
        };
        for (let i = 0; i < indices.count; i += 3) {
          const ia = indices.getX(i),
            ib = indices.getX(i + 1),
            ic = indices.getX(i + 2);
          a.fromBufferAttribute(p, ia).applyMatrix4(matrix);
          b.fromBufferAttribute(p, ib).applyMatrix4(matrix);
          c.fromBufferAttribute(p, ic).applyMatrix4(matrix);
          if (Math.max(a.y, b.y, c.y) < minY) continue;
          // 穿过地表切面的基墙截在地表以下，地下圣库不纳入远景。
          a.y = Math.max(a.y, minY);
          b.y = Math.max(b.y, minY);
          c.y = Math.max(c.y, minY);
          normal.subVectors(b, a).cross(edge.subVectors(c, a));
          if (normal.lengthSq() < 0.000001) continue;
          triangles.push(vertex(ia, a), vertex(ib, b), vertex(ic, c));
        }
      }
    }
    if (!positions.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(triangles);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `city_silhouette_${name}`;
    root.add(mesh);
    entries.push({ mesh, source });
    stats.meshes++;
    stats.triangles += triangles.length / 3;
  }
  return {
    root,
    stats,
    addSteps,
    prepareMaterials,
    finish() {
      for (const geometry of geometries.values()) geometry.dispose();
      geometries.clear();
    },
    update(position, cameraPosition = position) {
      if (position) {
        const depth = THREE.MathUtils.clamp((-position.y - 25) / 350, 0, 1);
        const base =
          cameraPosition.y > WORLD.surfaceY
            ? 0.00075
            : 0.006 + depth * 0.001 - cityLightBlend(position) * 0.0053;
        for (const owner of releases.values()) owner.ambient.value = base;
      }
      for (const { mesh, source } of entries) mesh.visible = !source.visible;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { mesh } of entries) mesh.geometry.dispose();
      for (const geometry of geometries.values()) geometry.dispose();
      for (const owner of releases.values()) owner.release();
      geometries.clear();
      releases.clear();
      entries.length = 0;
      material.dispose();
      root.removeFromParent();
      root.clear();
    },
  };
}
