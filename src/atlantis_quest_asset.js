import * as THREE from "three";
import sluice from "./assets/models/quest_sluice_hf_mesh.json" with { type: "json" };
import key from "./assets/models/quest_key_hf_mesh.json" with { type: "json" };
import plaque from "./assets/models/quest_plaque_hf_mesh.json" with { type: "json" };
import chest from "./assets/models/quest_chest_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";

const definitions = {
  sluice: [
    sluice,
    new URL("./assets/models/quest_sluice_hf_color.webp", import.meta.url),
    [3.9, 2.7, 6],
  ],
  key: [
    key,
    new URL("./assets/models/quest_key_hf_color.webp", import.meta.url),
    [1.8, 4.5, 0.46],
  ],
  plaque: [
    plaque,
    new URL("./assets/models/quest_plaque_hf_color.webp", import.meta.url),
    [4.8, 5.8, 0.65],
  ],
  chest: [
    chest,
    new URL("./assets/models/quest_chest_hf_color.webp", import.meta.url),
    [7, 5.5, 4.7],
  ],
};
const cache = new Map();

/** 分开生成壳体的上下表面，裁切边插值全部属性，避免裂口处 UV 和法线跳变。 */
function chestSection(source, height, above) {
  const names = ["position", "normal", "uv", "color"],
    arrays = Object.fromEntries(names.map((n) => [n, []]));
  const vertex = (id) =>
    Object.fromEntries(
      names.map((name) => {
        const a = source.attributes[name];
        return [
          name,
          Array.from({ length: a.itemSize }, (_, k) => a.getComponent(id, k)),
        ];
      }),
    );
  const inside = (v) =>
    above ? v.position[1] >= height : v.position[1] <= height;
  const cross = (a, b) => {
    const t = (height - a.position[1]) / (b.position[1] - a.position[1]);
    return Object.fromEntries(
      names.map((name) => [
        name,
        a[name].map((v, k) => v + (b[name][k] - v) * t),
      ]),
    );
  };
  for (let i = 0; i < source.index.count; i += 3) {
    const tri = [0, 1, 2].map((k) => vertex(source.index.getX(i + k))),
      polygon = [];
    for (let k = 0; k < 3; k++) {
      const a = tri[k],
        b = tri[(k + 1) % 3];
      if (inside(a)) polygon.push(a);
      if (inside(a) !== inside(b)) polygon.push(cross(a, b));
    }
    for (let k = 1; k + 1 < polygon.length; k++) {
      for (const v of [polygon[0], polygon[k], polygon[k + 1]])
        for (const name of names) arrays[name].push(...v[name]);
    }
  }
  const g = new THREE.BufferGeometry();
  for (const name of names)
    g.setAttribute(
      name,
      new THREE.Float32BufferAttribute(
        arrays[name],
        source.attributes[name].itemSize,
      ),
    );
  g.normalizeNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

/** 道具独立引用计数；同类材质和网格共用，开盖关节属于各自实例。 */
export function acquireAtlantisQuestAsset(kind) {
  if (!definitions[kind]) throw Error(`Unknown Atlantis quest asset: ${kind}`);
  if (!cache.has(kind)) {
    const [packed, url, dimensions] = definitions[kind];
    const geometry = decodeOrganicMesh(packed, null, (x, y, z, c) =>
      c.set(0x8d9988),
    );
    geometry.deleteAttribute("skinIndex");
    geometry.deleteAttribute("skinWeight");
    const size = geometry.boundingBox.getSize(new THREE.Vector3());
    geometry.scale(...dimensions.map((v, i) => v / size.getComponent(i)));
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: kind === "key" ? 0.6 : 0.83,
      metalness: kind === "key" ? 0.18 : 0.12,
      emissive: kind === "key" || kind === "plaque" ? 0xffffff : 0x000000,
      emissiveIntensity: 0,
    });
    material.name = `atlantis_quest_${kind}_hf`;
    const prepare = createMaterialPreparation(
      [
        {
          name: "color",
          url,
          colorSpace: THREE.SRGBColorSpace,
          apply(texture) {
            material.map = texture;
            // 仅让任务浮雕保留微弱底色；不加灯、不改变环境照明和提示节奏。
            if (kind === "key" || kind === "plaque") {
              material.emissiveMap = texture;
              material.emissiveIntensity = kind === "key" ? 0.8 : 0.12;
            }
            material.vertexColors = false;
            material.needsUpdate = true;
          },
        },
      ],
      (ready) => {
        material.userData.texturesReady = ready;
      },
    );
    let parts;
    if (kind === "chest") {
      // 原箱底和后铰链保持不变；内部衬板由实例箱体提供。
      geometry.translate(0, 5.15, 0);
      const lower = chestSection(geometry, 5.6, false),
        upper = chestSection(geometry, 5.6, true);
      upper.translate(0, -5.6, -2.35);
      geometry.dispose();
      parts = [lower, upper];
    } else parts = [geometry];
    cache.set(kind, { parts, material, prepare, references: 0 });
  }
  const entry = cache.get(kind);
  entry.references++;
  let released = false;
  return {
    material: entry.material,
    prepare: entry.prepare,
    create(part = 0) {
      const mesh = new THREE.Mesh(entry.parts[part], entry.material);
      mesh.name = `atlantis_quest_${kind}_${part}_hf`;
      mesh.userData.artRevision = "trellis_atlantis_quest_20261022";
      mesh.userData.prepareMaterials = entry.prepare;
      return mesh;
    },
    release() {
      if (released) return;
      released = true;
      if (--entry.references) return;
      entry.prepare.dispose();
      entry.parts.forEach((g) => g.dispose());
      entry.material.dispose();
      cache.delete(kind);
    },
  };
}
