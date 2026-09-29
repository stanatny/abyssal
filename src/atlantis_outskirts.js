import * as THREE from "three";
import {
  MergeBucket,
  cachedGeometry,
  paintStone,
  seededRandom,
} from "./atlantis_art_geometry.js";
import { cityArchitecture } from "./atlantis_architecture.js";
import { addSurfaceDetail, seaFanGeometry } from "./ocean_visuals.js";
import { createStaticColliderGrid } from "./static_collider_grid.js";

/**
 * 在城外合法空地建造低矮沉物与冷色海底花园，主街、育幼区保持原样。
 * @param {THREE.Object3D} parent 场景父节点。
 * @param {object} options heightAt 为共享海床，occupiedColliders 为现有静态实体。
 * @returns {object} 根节点、碰撞体、避障体、检查锚点、统计及更新/释放接口。
 */
export function createAtlantisOutskirts(
  parent,
  { heightAt, occupiedColliders = [] } = {},
) {
  if (!parent?.add || typeof heightAt !== "function")
    throw new Error("Atlantis outskirts require a scene and seabed height");
  const root = new THREE.Group();
  root.name = "atlantis_dark_outskirts";
  parent.add(root);
  const time = { value: 0 };
  const materials = makeMaterials(time);
  const owned = new Set(Object.values(materials));
  const chunks = new Map();
  const colliders = [];
  const obstacles = [];
  const anchors = [];
  const random = seededRandom(918277);
  const grid = createStaticColliderGrid(occupiedColliders, { cellSize: 30 });
  const kits = sceneryKits();
  let disposed = false;

  function placePart(chunk, geometry, material, x, z, rotation, scale = 1) {
    geometry.computeBoundingBox();
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(x, 0, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(scale, scale, scale),
    );
    const bounds = geometry.boundingBox.clone().applyMatrix4(matrix);
    // 海床坡面采样后沉入少量底缘，防止罐底、碎石悬空。
    let floor = Infinity;
    for (const px of [bounds.min.x, x, bounds.max.x])
      for (const pz of [bounds.min.z, z, bounds.max.z])
        floor = Math.min(floor, heightAt(px, pz));
    // 海扇/海绵只有中心细根接地，冠幅包围盒不能把整株压到坡下。
    if (material === "growth") floor = heightAt(x, z);
    const y = floor - bounds.min.y - 0.12;
    chunk.bucket.add(geometry, material, {
      position: [x, y, z],
      euler: rotation,
      scale,
    });
    return { x, y, z, scale, rotation, bounds };
  }

  function solid(chunk, kit, x, z, angle, scale = 1) {
    const slope = kit.followSlope
      ? (heightAt(x + Math.sin(angle) * 3, z + Math.cos(angle) * 3) -
          heightAt(x - Math.sin(angle) * 3, z - Math.cos(angle) * 3)) /
        6
      : 0;
    const q = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      .multiply(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(1, 0, 0),
          -Math.atan(slope),
        ),
      );
    const euler = new THREE.Euler().setFromQuaternion(q);
    const rotation = [euler.x, euler.y, euler.z];
    const placed = placePart(
      chunk,
      kit.geometry,
      "stone",
      x,
      z,
      rotation,
      scale,
    );
    if (kit.detail)
      chunk.bucket.add(kit.detail, "groove", {
        position: [x, placed.y, z],
        euler: rotation,
        scale,
      });
    for (const local of kit.colliders) {
      const center = new THREE.Vector3(local.x, local.y, local.z)
        .multiplyScalar(scale)
        .applyQuaternion(q)
        .add(new THREE.Vector3(x, placed.y, z));
      colliders.push({
        type: "box",
        kind: "outskirts_remnant",
        x: center.x,
        y: center.y,
        z: center.z,
        halfSize: {
          x: local.halfSize.x * scale,
          y: local.halfSize.y * scale,
          z: local.halfSize.z * scale,
        },
        rotation: { x: q.x, y: q.y, z: q.z, w: q.w },
      });
    }
    obstacles.push({
      x,
      y: placed.y + 1.1 * scale,
      z,
      radius: kit.radius * scale,
    });
  }

  function garden(x, z, kind) {
    // 整个组合的水平包络限定在 5.4m 内，预筛也包含轻微海流摆幅。
    const radius = 5.4;
    if (grid.query({ x, z }, undefined, { padding: radius + 0.65 }).length)
      return false;
    if (anchors.some((anchor) => Math.hypot(x - anchor.x, z - anchor.z) < 18))
      return false;
    const key = `${Math.sign(x)}:${Math.floor(z / 180)}`;
    if (!chunks.has(key)) {
      const group = new THREE.Group();
      group.name = `outskirts_sector_${key}`;
      root.add(group);
      chunks.set(key, { group, bucket: new MergeBucket(), anchors: [] });
    }
    const chunk = chunks.get(key);
    const anchor = { kind, x, y: heightAt(x, z), z, radius };
    anchors.push(anchor);
    chunk.anchors.push(anchor);
    const angle = random() * Math.PI * 2;
    if (kind === "fallen_column") solid(chunk, kits.column, x, z, angle, 0.9);
    if (kind === "inscribed_stele") {
      solid(chunk, kits.stele, x, z, angle, 0.9);
      solid(chunk, kits.fragment, x + 2.1, z + 1.5, angle + 1.1, 0.65);
    }
    if (kind === "cargo_cache") {
      solid(chunk, kits.fragment, x - 0.8, z - 0.8, angle, 0.7);
      for (let i = 0; i < 5; i++) {
        const a = i * 2.399;
        const px = x + Math.sin(a) * (0.8 + i * 0.3);
        const pz = z + Math.cos(a) * (0.8 + i * 0.3);
        const tilt = i === 1 || i === 4 ? 1.28 : 0.1 + random() * 0.15;
        placePart(chunk, kits.amphora, "ceramic", px, pz, [tilt, a, 0], 0.7);
      }
    }
    for (let i = 0; i < 4; i++) {
      const a = angle + i * 1.75;
      const px = x + Math.cos(a) * (3.6 + random() * 0.3);
      const pz = z + Math.sin(a) * (3.6 + random() * 0.3);
      placePart(
        chunk,
        kits.fan,
        "growth",
        px,
        pz,
        [0, a + 0.3, 0],
        0.9 + random() * 0.65,
      );
    }
    for (let i = 0; i < 6; i++) {
      const a = angle + i * 2.399;
      const px = x + Math.cos(a) * (2.4 + random() * 1.7);
      const pz = z + Math.sin(a) * (2.4 + random() * 1.7);
      const scale = 0.5 + random() * 0.65;
      const placed = placePart(
        chunk,
        kits.sponge,
        "growth",
        px,
        pz,
        [0, a, 0],
        scale,
      );
      chunk.bucket.add(kits.lip, "tips", {
        position: [px, placed.y, pz],
        euler: [0, a, 0],
        scale,
      });
    }
    return true;
  }

  const kinds = ["inscribed_stele", "cargo_cache", "fallen_column"];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 11; row++) {
      const z = -164 - row * 88;
      for (const x of [258, 271, 246])
        if (garden(side * x, z, kinds[(row + (side > 0 ? 1 : 0)) % 3])) break;
    }
  }
  for (const [index, x] of [-248, -180, -110, -40, 40, 110, 180, 248].entries())
    garden(x, -1112 - (index % 2) * 8, kinds[index % 3]);

  let triangles = 0;
  let meshes = 0;
  for (const chunk of chunks.values()) {
    const built = chunk.bucket.build(materials, chunk.group, owned);
    for (const mesh of built) {
      mesh.name = `outskirts_${mesh.name}`;
      mesh.geometry.computeBoundingSphere();
      if (mesh.material === materials.growth)
        mesh.geometry.boundingSphere.radius += 0.15;
      triangles +=
        (mesh.geometry.index?.count ??
          mesh.geometry.attributes.position.count) / 3;
      meshes++;
    }
    chunk.bucket = null;
  }
  const stats = Object.freeze({
    source:
      "Original procedural outskirts; existing Atlantis amphora and ocean sea-fan geometry reused",
    clusters: anchors.length,
    remnants: anchors.filter((anchor) => anchor.kind !== "cargo_cache").length,
    cargoCaches: anchors.filter((anchor) => anchor.kind === "cargo_cache")
      .length,
    seaFans: anchors.length * 4,
    sponges: anchors.length * 6,
    meshes,
    triangles,
    colliders: colliders.length,
    pointLights: 0,
    chunks: chunks.size,
  });
  root.userData.outskirtsStats = stats;

  return {
    root,
    colliders,
    obstacles,
    anchors,
    stats,
    update(elapsed, position, dt = 0, highQuality = true) {
      if (disposed) return;
      time.value = elapsed;
      if (!position) return;
      const distance = highQuality ? 270 : 185;
      for (const chunk of chunks.values())
        chunk.group.visible = chunk.anchors.some(
          (anchor) =>
            Math.hypot(
              position.x - anchor.x,
              position.y - anchor.y,
              position.z - anchor.z,
            ) < distance,
        );
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const resource of owned) resource.dispose();
      owned.clear();
      root.clear();
      chunks.clear();
      colliders.length = 0;
      obstacles.length = 0;
      anchors.length = 0;
    },
  };
}

function makeMaterials(time) {
  const stone = addSurfaceDetail(
    new THREE.MeshStandardMaterial({
      color: "#839499",
      vertexColors: true,
      roughness: 0.98,
      metalness: 0.02,
    }),
    "stone",
    2,
  );
  const groove = new THREE.MeshStandardMaterial({
    color: "#304349",
    vertexColors: true,
    roughness: 1,
  });
  const ceramic = addSurfaceDetail(
    new THREE.MeshStandardMaterial({
      color: "#769093",
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
    "stone",
    3,
  );
  const growth = addSurfaceDetail(
    new THREE.MeshStandardMaterial({
      color: "#62787e",
      vertexColors: true,
      roughness: 0.93,
      side: THREE.DoubleSide,
    }),
    "coral",
    2.2,
  );
  const original = growth.onBeforeCompile;
  growth.onBeforeCompile = (shader, renderer) => {
    original.call(growth, shader, renderer);
    shader.uniforms.outskirtsTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float outskirtsTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        transformed.x += sin(position.z * 0.13 + outskirtsTime * 0.52) * uv.y * uv.y * 0.065;
        transformed.z += cos(position.x * 0.15 + outskirtsTime * 0.41) * uv.y * uv.y * 0.04;`,
      );
  };
  growth.customProgramCacheKey = () => "atlantis_outskirts_growth_v1";
  // 只有杯口一圈细窄组织发微光；原创幻想附生群落，不作真实物种声明。
  const tips = new THREE.MeshStandardMaterial({
    color: "#638b93",
    vertexColors: true,
    emissive: "#39777e",
    emissiveIntensity: 0.22,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  return { stone, groove, ceramic, growth, tips };
}

let KITS = null;

function sceneryKits() {
  if (KITS) return KITS;
  const fan = cachedGeometry("outskirts_fan_v1", () => {
    const geometry = seaFanGeometry();
    const p = geometry.attributes.position;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++)
      uv[i * 2 + 1] = Math.max(0, p.getY(i)) * 0.8;
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return paintStone(geometry, { base: "#8ea39e", algaeAmount: 0.12 });
  });
  const sponge = cachedGeometry("outskirts_hollow_sponge_v1", () =>
    spongeGeometry(false),
  );
  const lip = cachedGeometry("outskirts_sponge_lip_v1", () =>
    spongeGeometry(true),
  );
  const amphora = cityArchitecture("amphora").parts[0].geometry;
  KITS = {
    fan,
    sponge,
    lip,
    amphora,
    column: columnKit(),
    stele: steleKit(),
    fragment: fragmentKit(),
  };
  return KITS;
}

/** 断柱的沟槽贯穿柱身，斜断面、碎齿和两道柱箍属于真实轮廓。 */
function columnKit() {
  const geometry = cachedGeometry("outskirts_broken_column_v1", () => {
    const positions = [],
      indices = [];
    const sides = 48,
      rows = 7;
    for (let row = 0; row <= rows; row++) {
      const t = row / rows;
      for (let side = 0; side < sides; side++) {
        const a = (side / sides) * Math.PI * 2;
        const r =
          (0.79 - t * 0.07) * (1 + 0.07 * Math.cos(a * 16)) +
          (row === 1 || row === 5 ? 0.08 : 0);
        const end =
          row === rows ? Math.sin(a * 3 + 1) * 0.13 + Math.cos(a) * 0.18 : 0;
        positions.push(
          Math.cos(a) * r,
          0.87 + Math.sin(a) * r,
          -2.85 + t * 5.7 + end,
        );
        if (row < rows) {
          const k = row * sides + side,
            n = row * sides + ((side + 1) % sides);
          indices.push(k, n, k + sides, n, n + sides, k + sides);
        }
      }
    }
    for (const row of [0, rows]) {
      const center = positions.length / 3;
      positions.push(0, 0.87, row ? 2.85 : -2.85);
      for (let side = 0; side < sides; side++) {
        const a = row * sides + side,
          b = row * sides + ((side + 1) % sides);
        if (row) indices.push(center, a, b);
        else indices.push(center, b, a);
      }
    }
    return stoneGeometry(positions, indices, "#9ca9a3");
  });
  // 八条薄盒贴合柱身圆截面，保留扁平断口，不用膨胀的胶囊端帽。
  const colliders = [];
  for (let i = 0; i < 8; i++) {
    const x = -0.84 + (i + 0.5) * 0.21;
    const near = Math.max(0, Math.abs(x) - 0.105);
    colliders.push({
      x,
      y: 0.87,
      z: -0.03,
      halfSize: { x: 0.105, y: Math.sqrt(0.85 ** 2 - near ** 2), z: 2.86 },
    });
  }
  return { geometry, colliders, radius: 2.95, followSlope: true };
}

/** 缺角碑的分层边框和刻纹在近景仍有厚度，倾倒碎片沿用相同石工语言。 */
function steleKit() {
  const outline = [
    [-1.25, 0],
    [1.25, 0],
    [1.25, 3.15],
    [0.7, 3.42],
    [0.56, 4.42],
    [-0.38, 4.22],
    [-0.66, 3.72],
    [-1.25, 3.85],
  ];
  const geometry = cachedGeometry("outskirts_stele_v1", () => {
    const shape = new THREE.Shape(
      outline.map(([x, y]) => new THREE.Vector2(x, y)),
    );
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.6,
      bevelEnabled: true,
      bevelThickness: 0.07,
      bevelSize: 0.06,
      bevelSegments: 1,
      steps: 1,
    });
    result.translate(0, 0, -0.3);
    return paintStone(result, { base: "#a4b0a5", algaeAmount: 0.4 });
  });
  const detail = cachedGeometry("outskirts_stele_inscription_v1", () => {
    const bucket = new MergeBucket();
    const add = (geometry, position, euler = null) => {
      paintStone(geometry, { base: "#687c7b", algaeAmount: 0.15 });
      bucket.add(geometry, "detail", { position, euler });
      geometry.dispose();
    };
    for (const side of [-1, 1]) {
      add(new THREE.BoxGeometry(0.1, 2.72, 0.035), [side * 1.02, 1.61, 0.386]);
      add(new THREE.BoxGeometry(1.95, 0.1, 0.035), [
        0,
        side < 0 ? 0.26 : 2.93,
        0.386,
      ]);
    }
    add(
      new THREE.TorusGeometry(0.52, 0.035, 4, 30, Math.PI * 1.72),
      [0, 2.03, 0.392],
    );
    for (let i = 0; i < 7; i++) {
      const angle = (i * Math.PI) / 3.5;
      add(
        new THREE.BoxGeometry(0.037, 0.57, 0.027),
        [Math.sin(angle) * 0.21, 2.03 + Math.cos(angle) * 0.21, 0.396],
        [0, 0, -angle],
      );
    }
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 5 - row; col++)
        add(
          new THREE.BoxGeometry(0.16, 0.04, 0.027),
          [-0.65 + col * 0.29, 0.66 + row * 0.23, 0.396],
          [0, 0, ((col % 3) - 1) * 0.26],
        );
    const target = new THREE.Group();
    const temporary = new Set();
    bucket.build({ detail: null }, target, temporary);
    return target.children[0].geometry;
  });
  return {
    geometry,
    detail,
    radius: 2.5,
    colliders: [
      { x: 0, y: 1.55, z: 0, halfSize: { x: 1.29, y: 1.62, z: 0.37 } },
      { x: -0.21, y: 3.53, z: 0, halfSize: { x: 0.9, y: 0.36, z: 0.37 } },
      { x: 0, y: 4.04, z: 0, halfSize: { x: 0.56, y: 0.29, z: 0.37 } },
    ],
  };
}

function fragmentKit() {
  const geometry = cachedGeometry("outskirts_carved_fragment_v1", () => {
    const positions = [
      -1.65, 0, -0.88, 1.46, 0, -0.88, 1.54, 0, 0.85, -1.65, 0, 0.85, -1.22,
      0.74, -0.69, 1.18, 0.55, -0.79, 1.43, 0.87, 0.67, -1.44, 0.86, 0.77,
    ];
    const indices = [
      0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2,
      3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7,
    ];
    for (let i = 0; i < indices.length; i += 3)
      [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
    return stoneGeometry(positions, indices, "#829b95");
  });
  return {
    geometry,
    radius: 1.85,
    colliders: [
      { x: 0, y: 0.35, z: 0, halfSize: { x: 1.48, y: 0.35, z: 0.78 } },
    ],
  };
}

/** 连续双层杯壁与不规则口缘形成可见的空腔，杯底封闭。 */
function spongeGeometry(lipOnly) {
  const positions = [],
    indices = [],
    uvs = [];
  const rings = lipOnly
    ? [
        [0.97, 0.93],
        [1, 0.97],
        [1, 0.78],
        [0.97, 0.73],
      ]
    : [
        [0, 0.18],
        [0.16, 0.34],
        [0.5, 0.46],
        [0.79, 0.7],
        [1, 0.97],
        [1, 0.78],
        [0.77, 0.55],
        [0.47, 0.3],
        [0.23, 0.05],
      ];
  const sides = 24;
  for (let row = 0; row < rings.length; row++) {
    const [h, radius] = rings[row];
    for (let side = 0; side < sides; side++) {
      const a = (side / sides) * Math.PI * 2;
      const r = radius * 0.48 * (1 + Math.sin(a * 5 + h * 2) * 0.08);
      const y = h * 1.46 + Math.sin(a * 3 + 1) * 0.1 * h;
      positions.push(Math.cos(a) * r + h * h * 0.16, y, Math.sin(a) * r);
      uvs.push(side / sides, h * 0.2);
      if (row < rings.length - 1) {
        const k = row * sides + side,
          n = row * sides + ((side + 1) % sides);
        indices.push(k, k + sides, n, n, k + sides, n + sides);
      }
    }
  }
  if (!lipOnly) {
    const center = positions.length / 3;
    positions.push(0.23 * 0.23 * 0.16, 0.23 * 1.46, 0);
    uvs.push(0.5, 0);
    const start = (rings.length - 1) * sides;
    for (let side = 0; side < sides; side++)
      indices.push(center, start + ((side + 1) % sides), start + side);
  }
  const geometry = stoneGeometry(
    positions,
    indices,
    lipOnly ? "#89c0c2" : "#739998",
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geometry;
}

function stoneGeometry(positions, indices, base) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return paintStone(geometry, { base, algaeAmount: 0.28, seed: 9107 });
}
