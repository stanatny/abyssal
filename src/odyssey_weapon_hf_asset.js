import * as T from "three";
import { decodeOrganicMesh } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import trident from "./assets/models/triton_trident_hf_mesh.json" with { type: "json" };
import spear from "./assets/models/naga_spear_hf_mesh.json" with { type: "json" };

const definitions = {
  triton_trident: {
    data: trident,
    length: 0.92,
    gripY: -0.1,
    direction: [0.07, 0.38, -0.92],
    url: new URL(
      "./assets/models/triton_trident_hf_color.webp",
      import.meta.url,
    ),
  },
  naga_spear: {
    data: spear,
    length: 0.9,
    gripY: -0.03,
    direction: [0.18, 0.86, -0.48],
    url: new URL("./assets/models/naga_spear_hf_color.webp", import.meta.url),
  },
};
const cache = new Map();

/** 兵器保持刚性；共享几何与贴图，实例仅拥有握持变换。 */
export function odysseyWeaponAsset(kind) {
  if (cache.has(kind)) return cache.get(kind);
  const def = definitions[kind];
  if (!def) throw Error("Unknown Odyssey weapon");
  const geometry = decodeOrganicMesh(def.data, null, (x, y, z, c) =>
    c.set(
      y > 0.12
        ? 0xc2b88f
        : Math.abs(y - def.gripY) < 0.055
          ? 0x314c4b
          : 0x71877b,
    ),
  );
  geometry.deleteAttribute("skinIndex");
  geometry.deleteAttribute("skinWeight");
  geometry.translate(0, -def.gripY, 0);
  geometry.scale(def.length, def.length, def.length);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.63,
    metalness: 0.26,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    side: T.FrontSide,
  });
  material.name = kind + "_shell_weathered_bronze";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: def.url,
        colorSpace: T.SRGBColorSpace,
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
  const asset = { geometry, material, prepare };
  cache.set(kind, asset);
  return asset;
}

export function createOdysseyWeapon(kind) {
  const asset = odysseyWeaponAsset(kind),
    mesh = new T.Mesh(asset.geometry, asset.material),
    y = new T.Vector3(...definitions[kind].direction).normalize(),
    x = y
      .clone()
      .cross(new T.Vector3(1, 0, 0))
      .normalize(),
    z = x.clone().cross(y).normalize();
  // 宽刃朝外，侧面游动时仍能看清轮廓；只旋转整个刚性兵器。
  mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  mesh.name = kind + "_hf_weapon";
  mesh.userData.visualOnly = true;
  mesh.userData.weaponAsset = asset;
  return mesh;
}

/** 同时等待身体与兵器，并把优先级和重试传到各自的共享队列。 */
export function withOdysseyWeaponMaterials(bodyPrepare, weapon) {
  const prepareWeapon = weapon.userData.weaponAsset.prepare,
    prepare = (options) =>
      Promise.all([bodyPrepare(options), prepareWeapon(options)]).then(
        (states) => states.every(Boolean),
      );
  Object.defineProperty(prepare, "state", {
    get() {
      const states = [bodyPrepare.state, prepareWeapon.state];
      return states.includes("error")
        ? "error"
        : states.every((s) => s === "ready")
          ? "ready"
          : states.includes("loading")
            ? "loading"
            : "idle";
    },
  });
  return prepare;
}
