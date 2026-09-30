import * as THREE from "three";

/**
 * createHawaiiSeabedLife 创建贴合深海沉积面的海笔与低矮矿物碎屑群落。
 * 参数：parent 为所属场景，heightAt 为海床采样器，seed 为布局种子，
 * worldUniforms 为共享时间，clearings 为需要保留的圆形地标空间。
 * 返回：根节点、更新和幂等释放方法，以及实际预算和每个实例的支撑元数据。
 */
export function createHawaiiSeabedLife(
  parent,
  { heightAt, seed = 73129, worldUniforms, clearings = [] },
) {
  if (typeof heightAt !== "function")
    throw new TypeError("heightAt is required");
  const root = new THREE.Group();
  root.name = "hawaii_seabed_life";
  const time = worldUniforms?.oceanTime ?? { value: 0 };
  const random = randomSource(seed);
  const penGeometry = seaPenGeometry();
  const rockGeometry = rubbleGeometry();
  const penMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    vertexColors: true,
    roughness: 0.88,
    emissive: "#79d9a2",
    emissiveIntensity: 0.72,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: "#777c73",
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });
  addPenMotion(penMaterial, time);
  const geometries = [penGeometry, rockGeometry];
  const materials = [penMaterial, rockMaterial];
  const placements = [];
  const chunks = new Map();
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const point = new THREE.Vector3();
  const isClear = (x, z, radius) =>
    !clearings.some((c) => Math.hypot(x - c.x, z - c.z) < c.radius + radius);

  // 群落保留中间水道；每个小型实例单独采样，不将平底群落跨放在斜坡上。
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      let center = null;
      for (let attempt = 0; attempt < 18; attempt += 1) {
        const x = -226 + column * 145 + (random() - 0.5) * 56;
        const z = -254 - row * 135 + (random() - 0.5) * 42;
        if (isClear(x, z, 15)) {
          center = { x, z };
          break;
        }
      }
      if (!center) continue;
      const colony = row * 4 + column;
      for (let i = 0; i < 11; i += 1) {
        const isPen = i < 3;
        const angle = random() * Math.PI * 2;
        const radius = isPen ? 0.9 + random() * 3.1 : 2.2 + random() * 8.5;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius * 0.62;
        const y = heightAt(x, z);
        if (!Number.isFinite(y) || y > -145 || z > -220 || z < -1120) continue;
        const yaw = random() * Math.PI * 2;
        const scale = isPen ? 0.9 + random() * 0.7 : 0.33 + random() * 0.59;
        const geometry = isPen ? penGeometry : rockGeometry;
        dummy.position.set(x, y, z);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(
          isPen ? scale : scale * 1.25,
          isPen ? scale : scale * 0.59,
          scale,
        );
        if (!isPen) {
          normal
            .set(
              heightAt(x - 0.2, z) - heightAt(x + 0.2, z),
              0.4,
              heightAt(x, z - 0.2) - heightAt(x, z + 0.2),
            )
            .normalize();
          dummy.quaternion.setFromUnitVectors(up, normal);
          dummy.rotateY(yaw);
        }
        dummy.updateMatrix();
        let maxBaseGap = -Infinity;
        const supports = [];
        for (const support of geometry.userData.supports) {
          point.fromArray(support).applyMatrix4(dummy.matrix);
          const floor = heightAt(point.x, point.z);
          maxBaseGap = Math.max(maxBaseGap, point.y - floor);
          supports.push({ x: point.x, y: point.y, z: point.z, floor });
        }
        if (!Number.isFinite(maxBaseGap)) continue;
        const sink = maxBaseGap + (isPen ? 0.1 : 0.045);
        dummy.position.y -= sink;
        dummy.updateMatrix();
        let maxHeight = -Infinity;
        const positions = geometry.attributes.position;
        for (let v = 0; v < positions.count; v += 1) {
          point.fromBufferAttribute(positions, v).applyMatrix4(dummy.matrix);
          maxHeight = Math.max(maxHeight, point.y - heightAt(point.x, point.z));
        }
        if (!isPen && maxHeight > 1.1) continue;
        const key = `${Math.floor((x + 300) / 150)}:${Math.floor((-z - 220) / 225)}`;
        if (!chunks.has(key))
          chunks.set(key, {
            key,
            pens: [],
            rocks: [],
            meshes: [],
            center: new THREE.Vector3(),
          });
        const chunk = chunks.get(key);
        (isPen ? chunk.pens : chunk.rocks).push(dummy.matrix.clone());
        placements.push({
          kind: isPen ? "sea_pen" : "basalt_nodule",
          colony,
          x,
          y: dummy.position.y,
          z,
          height: maxHeight,
          scale,
          supports: supports.map((s) => ({
            ...s,
            y: s.y - sink,
            gap: s.y - sink - s.floor,
          })),
          chunk: key,
        });
      }
    }
  }
  for (const chunk of chunks.values()) {
    const bounds = new THREE.Box3();
    for (const [matrices, geometry, material, label] of [
      [chunk.pens, penGeometry, penMaterial, "sea_pens"],
      [chunk.rocks, rockGeometry, rockMaterial, "basalt_nodules"],
    ]) {
      if (!matrices.length) continue;
      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
      mesh.name = `hawaii_${label}_${chunk.key}`;
      matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      // 顶端水摆幅度小于 0.15 米；包围体保留余量，防止边缘误剔除。
      mesh.boundingBox.expandByScalar(0.25);
      mesh.boundingSphere.radius += 0.25;
      bounds.union(mesh.boundingBox);
      chunk.meshes.push(mesh);
      root.add(mesh);
    }
    bounds.getCenter(chunk.center);
    chunk.radius = bounds.getSize(new THREE.Vector3()).length() / 2;
  }
  const stats = {
    colonies: new Set(placements.map((p) => p.colony)).size,
    seaPens: placements.filter((p) => p.kind === "sea_pen").length,
    rubble: placements.filter((p) => p.kind === "basalt_nodule").length,
    chunks: chunks.size,
    batches: root.children.length,
    maxVisibleBatches: 16,
    triangles: root.children.reduce(
      (n, m) => n + (m.geometry.attributes.position.count / 3) * m.count,
      0,
    ),
    geometries: geometries.length,
    materials: materials.length,
    textures: 0,
    lights: 0,
    visibleBatches: 0,
    disposed: false,
  };
  let disposed = false;
  const originFallback = new THREE.Vector3();
  const nearby = [...chunks.values()].map((chunk) => ({ chunk, distance: 0 }));
  const compareDistance = (a, b) => a.distance - b.distance;
  parent.add(root);
  const update = (elapsed, playerPosition) => {
    if (disposed) return;
    if (Number.isFinite(elapsed)) time.value = elapsed;
    const origin = playerPosition ?? originFallback;
    // 复用固定分块排序项，不分配逐帧对象或修改任何实例矩阵。
    for (const entry of nearby)
      entry.distance =
        entry.chunk.center.distanceTo(origin) - entry.chunk.radius;
    nearby.sort(compareDistance);
    stats.visibleBatches = 0;
    for (let index = 0; index < nearby.length; index += 1) {
      const { chunk, distance } = nearby[index];
      const visible = index < 8 && distance < 155;
      for (const mesh of chunk.meshes) mesh.visible = visible;
      if (visible) stats.visibleBatches += chunk.meshes.length;
    }
  };
  update(time.value);
  return {
    root,
    update,
    stats,
    placements,
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      root.children.forEach((mesh) => mesh.dispose());
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      root.clear();
      stats.disposed = true;
      stats.visibleBatches = 0;
    },
  };
}

// 自定义连续羽轴与分叶体积；发光只来自水螅体属性，而不是整根海笔。
function seaPenGeometry() {
  const positions = [],
    colors = [],
    glow = [];
  const stem = new THREE.Color("#958678"),
    leaf = new THREE.Color("#afad91"),
    polyp = new THREE.Color("#b6dab6");
  const tri = (a, b, c, color, emission = 0) => {
    positions.push(...a, ...b, ...c);
    for (let n = 0; n < 3; n += 1) {
      colors.push(color.r, color.g, color.b);
      glow.push(emission);
    }
  };
  const axis = (t) => [Math.sin(t * 2.2) * 0.14, t * 2.25, t * t * 0.12];
  const rings = [];
  for (let j = 0; j <= 7; j += 1) {
    const t = j / 7,
      p = axis(t),
      r = 0.044 * (1 - t * 0.8);
    rings.push(
      Array.from({ length: 5 }, (_, k) => [
        p[0] + Math.cos(k * Math.PI * 0.4) * r,
        p[1],
        p[2] + Math.sin(k * Math.PI * 0.4) * r,
      ]),
    );
    if (!j) continue;
    for (let k = 0; k < 5; k += 1) {
      const l = (k + 1) % 5;
      tri(rings[j - 1][k], rings[j][k], rings[j][l], stem);
      tri(rings[j - 1][k], rings[j][l], rings[j - 1][l], stem);
    }
  }
  for (let row = 0; row < 8; row += 1) {
    for (const side of [-1, 1]) {
      const t = 0.27 + row * 0.085,
        a = axis(t);
      const reach = 0.46 * Math.sin((t - 0.12) * Math.PI) * (1 - t * 0.24);
      const b = [a[0] + side * reach * 0.56, a[1] + 0.085, a[2] - 0.045];
      const c = [a[0] + side * reach, a[1] + 0.21, a[2] + 0.012];
      const rim = [
        [a[0], a[1] - 0.035, a[2]],
        [b[0], b[1] - 0.043, b[2]],
        c,
        [b[0], b[1] + 0.047, b[2]],
      ];
      const peak = [b[0], b[1], b[2] + 0.037];
      const back = [b[0], b[1], b[2] - 0.024];
      for (let k = 0; k < 4; k += 1) {
        tri(rim[k], rim[(k + 1) % 4], peak, leaf);
        tri(rim[(k + 1) % 4], rim[k], back, leaf);
      }
      const f = 0.86;
      const p = [a[0] + side * reach * f, a[1] + 0.21 * f + 0.035, a[2]];
      // 每个小水螅体保留八个细小触手，避免远景出现大片发光叶片。
      for (let k = 0; k < 8; k += 1) {
        const angle = (k * Math.PI) / 4;
        const q = [
          p[0] + Math.cos(angle) * 0.053,
          p[1] + 0.038,
          p[2] + Math.sin(angle) * 0.053,
        ];
        const r = [
          p[0] + Math.cos(angle + 0.36) * 0.019,
          p[1] + 0.021,
          p[2] + Math.sin(angle + 0.36) * 0.019,
        ];
        tri(p, q, r, polyp, 0.7 + row * 0.035);
      }
    }
  }
  const geometry = finishGeometry(positions, colors);
  geometry.setAttribute("polypGlow", new THREE.Float32BufferAttribute(glow, 1));
  geometry.userData.supports = rings[0];
  return geometry;
}

// 不规则低矮三层轮廓形成结核与破碎玄武岩的风化表面。
function rubbleGeometry() {
  const positions = [],
    colors = [],
    rings = [];
  const shades = ["#76776b", "#8c8875", "#686e67", "#a29b83"].map(
    (c) => new THREE.Color(c),
  );
  for (let row = 0; row < 3; row += 1) {
    rings.push(
      Array.from({ length: 7 }, (_, k) => {
        const angle = (k * Math.PI * 2) / 7;
        const radius =
          (row === 0 ? 0.73 : row === 1 ? 1 : 0.56) *
          (0.88 + Math.sin(k * 5.13 + row * 1.3) * 0.12);
        return [
          Math.cos(angle) * radius,
          row === 0
            ? 0
            : row === 1
              ? 0.31 + 0.1 * Math.sin(k * 2.9)
              : 0.78 + 0.12 * Math.sin(k * 2.3),
          Math.sin(angle) * radius,
        ];
      }),
    );
  }
  const tri = (a, b, c, shade) => {
    positions.push(...a, ...c, ...b);
    for (let i = 0; i < 3; i += 1) colors.push(shade.r, shade.g, shade.b);
  };
  for (let k = 0; k < 7; k += 1) {
    const l = (k + 1) % 7,
      shade = shades[k % shades.length];
    for (let row = 0; row < 2; row += 1) {
      tri(rings[row][k], rings[row + 1][l], rings[row + 1][k], shade);
      tri(rings[row][k], rings[row][l], rings[row + 1][l], shade);
    }
    tri(rings[2][k], rings[2][l], [0.1, 0.9, -0.1], shade);
    tri(rings[0][l], rings[0][k], [0, 0, 0], shade);
  }
  const geometry = finishGeometry(positions, colors);
  geometry.userData.supports = [...rings[0], [0, 0, 0]];
  for (let k = 0; k < 7; k += 1) {
    const a = rings[0][k],
      b = rings[0][(k + 1) % 7];
    geometry.userData.supports.push(
      [(a[0] + b[0]) / 2, 0, (a[2] + b[2]) / 2],
      [(a[0] + b[0]) / 3, 0, (a[2] + b[2]) / 3],
      [a[0] / 2, 0, a[2] / 2],
    );
  }
  return geometry;
}

function finishGeometry(positions, colors) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function addPenMotion(material, time) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.seabedTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
      uniform float seabedTime; attribute float polypGlow; varying float vPolypGlow;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
      vPolypGlow = polypGlow;
      float phase = instanceMatrix[3].x * 0.19 + instanceMatrix[3].z * 0.07;
      float bend = pow(clamp(position.y / 2.25, 0.0, 1.0), 2.0);
      transformed.x += sin(seabedTime * 0.62 + phase) * bend * 0.065;
      transformed.z += cos(seabedTime * 0.43 + phase) * bend * 0.038;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vPolypGlow;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vPolypGlow;",
      );
  };
  material.customProgramCacheKey = () => "hawaii_sea_pen_v1";
}

function randomSource(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
