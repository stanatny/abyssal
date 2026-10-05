import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  addSurfaceDetail,
  coralBranchGeometry,
  seaFanGeometry,
  moundCoralGeometry,
  ribbonGeometry,
  smoothCoincidentNormals,
} from "./ocean_visuals.js";

/** 海域私有共享几何与材质；所有缓存均交还本次地图的资源集合。 */
export function createOdysseyEnvironmentKit(keep, time) {
  const material = (name, color, kind, roughness = 0.9, metalness = 0) => {
    const m = keep(
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
    m.name = name;
    addSurfaceDetail(m, kind, kind === "wood" ? 0.16 : 0.65);
    return m;
  };
  const materials = {
    limestone: material("weathered_hellenic_limestone", "#bdc1ae", "stone"),
    marble: material("sea_worn_ivory_marble", "#ddd0aa", "stone"),
    darkStone: material("abyssal_basalt", "#48566b", "stone"),
    terracotta: material("fired_ochre_amphora", "#a66341", "stone"),
    bronze: material("sea_patinated_bronze", "#728b76", "metal", 0.62, 0.43),
    wood: material("salt_eroded_galley_oak", "#706151", "wood"),
    woodPale: material("broken_inner_ship_timber", "#9b8a6e", "wood"),
    coral: material("rose_branch_coral", "#bf584f", "coral"),
    fan: material("crimson_sea_fan", "#a94b63", "coral"),
    sponge: material("golden_encrusting_sponge", "#b59654", "coral"),
    grass: material("mediterranean_seagrass", "#53755e", "coral"),
  };
  materials.fan.side = THREE.DoubleSide;
  materials.grass.side = THREE.DoubleSide;
  const previous = materials.grass.onBeforeCompile;
  materials.grass.onBeforeCompile = (shader, renderer) => {
    previous.call(materials.grass, shader, renderer);
    shader.uniforms.odysseyTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float odysseyTime;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float anchor = max(0.0, position.y);
        transformed.x += sin(odysseyTime * .82 + position.y * 2.1) * anchor * .16;
        transformed.z += cos(odysseyTime * .67 + position.y * 1.7) * anchor * .11;`,
      );
  };
  materials.grass.customProgramCacheKey = () =>
    "odyssey_fixed_root_seagrass_v1";
  const rock = keep(new THREE.IcosahedronGeometry(1, 3));
  const p = rock.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const erosion =
      0.87 +
      0.1 * Math.sin(x * 8 + z * 5) * Math.cos(y * 11) +
      0.025 * Math.sin(y * 29 + x * 14);
    p.setXYZ(i, x * erosion, y * erosion, z * erosion);
  }
  rock.computeVertexNormals();
  smoothCoincidentNormals(rock);
  const column = keep(flutedColumnGeometry());
  const pot = keep(amphoraGeometry());
  const coral = keep(coralColonyGeometry());
  return {
    materials,
    rock,
    column,
    pot,
    coral,
    fan: keep(seaFanGeometry()),
    sponge: keep(moundCoralGeometry()),
    grass: keep(ribbonGeometry(true)),
    box: keep(new THREE.BoxGeometry(1, 1, 1)),
    torus: keep(new THREE.TorusGeometry(1, 0.065, 8, 24)),
    disk: keep(new THREE.CylinderGeometry(1, 1, 1, 24)),
  };
}

/** 合并静态分块，取消构造时仍由主资源集合释放尚未合并的临时几何。 */
export function createOdysseyMergeBucket(keep, resources) {
  const lists = new Map();
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  return {
    emit(
      geometry,
      material,
      position,
      scale = [1, 1, 1],
      rotation = [0, 0, 0],
    ) {
      p.set(...position);
      s.set(...scale);
      e.set(...rotation);
      q.setFromEuler(e);
      matrix.compose(p, q, s);
      const g = keep(geometry.clone());
      g.applyMatrix4(matrix);
      if (!lists.has(material)) lists.set(material, []);
      lists.get(material).push(g);
    },
    finish(parent, name) {
      const root = new THREE.Group();
      root.name = name;
      parent.add(root);
      for (const [material, list] of lists) {
        const geometry = keep(mergeGeometries(list));
        root.add(new THREE.Mesh(geometry, material));
        for (const g of list) {
          g.dispose();
          resources.delete(g);
        }
      }
      lists.clear();
      return root;
    },
  };
}

/** 肩腹、长颈、盘口分层的双耳陶罐，破损变体由摆放姿态提供。 */
function amphoraGeometry() {
  const profile = [
    [0.06, 0],
    [0.2, 0.1],
    [0.4, 0.5],
    [0.53, 0.95],
    [0.5, 1.2],
    [0.3, 1.5],
    [0.16, 1.68],
    [0.16, 1.95],
    [0.25, 2.02],
    [0.25, 2.08],
    [0.15, 2.08],
    [0.11, 1.72],
  ];
  const body = new THREE.LatheGeometry(
    profile.map(([x, y]) => new THREE.Vector2(x, y)),
    24,
  );
  const handle = new THREE.TorusGeometry(0.27, 0.065, 7, 16, Math.PI * 1.65);
  const pieces = [body];
  for (const side of [-1, 1]) {
    const h = handle.clone();
    h.rotateZ(side > 0 ? -0.52 : Math.PI + 0.52);
    h.translate(side * 0.27, 1.55, 0);
    pieces.push(h);
  }
  const merged = mergeGeometries(pieces);
  pieces.forEach((g) => g.dispose());
  handle.dispose();
  return merged;
}

/** 二十四道连续浅槽，不用几根细柱拼接希腊柱身。 */
function flutedColumnGeometry() {
  const g = new THREE.CylinderGeometry(1, 1.08, 1, 96, 8);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      z = p.getZ(i),
      y = p.getY(i);
    const angle = Math.atan2(z, x);
    const flute = 0.965 + 0.035 * Math.cos(angle * 24);
    const entasis = 1 + 0.025 * Math.sin((y + 0.5) * Math.PI);
    p.setXYZ(i, x * flute * entasis, y, z * flute * entasis);
  }
  g.computeVertexNormals();
  return g;
}

/** 珊瑚枝从厚重分叉根部逐层变细，独立共享而不是尖锥堆叠。 */
function coralColonyGeometry() {
  const branch = coralBranchGeometry();
  branch.translate(0, 0.5, 0);
  const pieces = [];
  const emit = (x, y, z, length, angle, lean) => {
    const g = branch.clone();
    g.scale(0.85, length, 0.85);
    g.rotateZ(lean);
    g.rotateY(angle);
    g.translate(x, y, z);
    pieces.push(g);
  };
  emit(0, 0, 0, 2.5, 0, 0.07);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.399,
      r = 0.02 + (i % 3) * 0.012;
    emit(
      Math.cos(a) * r,
      0.8 + (i % 4) * 0.3,
      Math.sin(a) * r,
      1.3 + (i % 3) * 0.25,
      a,
      0.5 + (i % 3) * 0.13,
    );
    const lean = 0.5 + (i % 3) * 0.13,
      reach = 0.65;
    emit(
      -Math.cos(a) * Math.sin(lean) * reach,
      0.8 + (i % 4) * 0.3 + Math.cos(lean) * reach,
      Math.sin(a) * Math.sin(lean) * reach,
      0.7 + (i % 2) * 0.25,
      a + 0.3,
      0.66,
    );
  }
  const g = mergeGeometries(pieces);
  branch.dispose();
  pieces.forEach((p) => p.dispose());
  return g;
}
