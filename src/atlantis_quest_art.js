import * as THREE from "three";
import { resolveAtlantisKeySites } from "./atlantis_key_sites.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { acquireAtlantisQuestAsset } from "./atlantis_quest_asset.js";

/**
 * 在真实公共建筑下层悬挂钥匙与铭文，不使用幼体专用住宅或新碰撞。
 * @param {THREE.Object3D} parent 海域根节点。
 * @param {object[]} records 已建成的上下层公共建筑记录。
 * @returns {object} 固定接触点、状态、主循环动画及幂等资源释放。
 */
export function createAtlantisKeyArt(parent, records = []) {
  const root = new THREE.Group();
  root.name = "atlantis_conch_key_and_inscriptions";
  parent.add(root);
  const owned = new Set();
  const keep = (r) => (owned.add(r), r);
  const bronze = keep(
    new THREE.MeshStandardMaterial({
      color: 0xb89c59,
      metalness: 0.65,
      roughness: 0.47,
      emissive: 0x392e0b,
      emissiveIntensity: 0.2,
    }),
  );
  addSurfaceDetail(bronze, "stone", 0.04);
  function mesh(group, geometry, material, point = [0, 0, 0], name = "") {
    const m = new THREE.Mesh(keep(geometry), material);
    m.position.fromArray(point);
    m.name = name;
    group.add(m);
    return m;
  }
  const locations = resolveAtlantisKeySites(records).map((site) => ({
    ...site,
    point: new THREE.Vector3(site.point.x, site.point.y, site.point.z),
  }));
  // 铭文保留三块，扩展藏点不增加网格、灯或每帧资源分配。
  const clues = records.map((r) => ({
    point: new THREE.Vector3(r.x, r.lowerY, r.z + 43),
    roofY: r.y - 4,
  }));
  const key = new THREE.Group();
  key.name = "conch_key";
  root.add(key);
  const keyAsset = acquireAtlantisQuestAsset("key"),
    plaqueAsset = acquireAtlantisQuestAsset("plaque");
  owned.add({ dispose: keyAsset.release });
  owned.add({ dispose: plaqueAsset.release });
  keyAsset.prepare();
  plaqueAsset.prepare();
  root.userData.prepareMaterials = async (options) =>
    (
      await Promise.all([
        keyAsset.prepare(options),
        plaqueAsset.prepare(options),
      ])
    ).every(Boolean);
  const keyModel = keyAsset.create();
  keyModel.position.y = -1.2;
  key.add(keyModel);
  // 程序化径向透明纹理没有矩形底；深度检测保留墙体遮挡，拾取后随钥匙一起消失。
  const glowPixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
      const offset = (y * 64 + x) * 4;
      glowPixels.set(
        [255, 255, 255, Math.round(255 * Math.max(0, 1 - radius) ** 2.2)],
        offset,
      );
    }
  const glowTexture = keep(new THREE.DataTexture(glowPixels, 64, 64));
  glowTexture.needsUpdate = true;
  glowTexture.magFilter = glowTexture.minFilter = THREE.LinearFilter;
  const glowMaterial = keep(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x83ffdc,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      transparent: false,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const glow = new THREE.Sprite(glowMaterial);
  glow.name = "conch_key_soft_glow";
  glow.renderOrder = -10;
  glow.position.y = -1.2;
  glow.scale.set(6.6, 7.5, 1);
  key.add(glow);
  const chain = new THREE.Group();
  chain.name = "key_roof_suspension";
  root.add(chain);
  const chainMesh = mesh(
    chain,
    new THREE.CylinderGeometry(0.055, 0.055, 1, 6),
    bronze,
  );
  const plaques = clues.map((site) => {
    const g = new THREE.Group();
    g.position.copy(site.point);
    root.add(g);
    const plaque = plaqueAsset.create();
    plaque.name = "conch_inscription";
    g.add(plaque);
    const hang = site.roofY - site.point.y - 2.9;
    if (hang > 0)
      mesh(g, new THREE.CylinderGeometry(0.06, 0.06, hang, 6), bronze, [
        0,
        2.9 + hang / 2,
        0,
      ]);
    return g;
  });
  let selected = null,
    collected = false,
    disposed = false,
    suspended = false;
  return {
    root,
    locations,
    clues,
    key,
    getPoint(id) {
      return locations.find((s) => s.id === id)?.point ?? null;
    },
    getGuidancePoint(id) {
      return locations.find((s) => s.id === id)?.guidance ?? null;
    },
    setState(state) {
      const site = locations.find((s) => s.id === state.keySiteId);
      if (site && selected !== site.id) {
        selected = site.id;
        key.position.copy(site.point);
        chain.position.copy(site.point);
        suspended = Number.isFinite(site.roofY);
        const height = suspended ? site.roofY - site.point.y - 0.9 : 0;
        chainMesh.scale.y = Math.max(0, height);
        chainMesh.position.y = 0.9 + height / 2;
      }
      collected = !!state.keyCollected;
    },
    update(time, position, reducedMotion) {
      const visible =
        !!selected &&
        !collected &&
        key.position.distanceToSquared(position) < 200 ** 2;
      key.visible = visible;
      chain.visible = visible && suspended;
      // 接触点保持固定，只摆动饰纹与材质，不让钥匙游出建筑。
      keyModel.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.6) * 0.025;
      glowMaterial.opacity = reducedMotion
        ? 0.18
        : 0.17 + 0.025 * Math.sin(time * 1.3);
      bronze.emissiveIntensity =
        0.2 + (reducedMotion ? 0 : (Math.sin(time * 1.3) + 1) * 0.12);
      plaques.forEach((p) => {
        p.visible = p.position.distanceToSquared(position) < 180 ** 2;
      });
    },
    reset() {
      selected = null;
      collected = false;
      key.visible = chain.visible = false;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      for (const r of owned) r.dispose();
      root.clear();
    },
  };
}

/** 真实宝箱的拱顶箱盖、铜箍、铆钉与钥孔，返回独立开盖关节。 */
export function createAtlantisQuestChest(root, keep, stone, bronze) {
  const asset = acquireAtlantisQuestAsset("chest");
  keep({ dispose: asset.release });
  asset.prepare();
  root.userData.prepareMaterials = asset.prepare;
  root.add(asset.create(0));
  const lining = keep(
    new THREE.MeshStandardMaterial({ color: 0x4b605b, roughness: 0.85 }),
  );
  addSurfaceDetail(lining, "stone", 0.06);
  function panel(parent, dimensions, point, material = lining) {
    const mesh = new THREE.Mesh(
      keep(new THREE.BoxGeometry(...dimensions)),
      material,
    );
    mesh.position.fromArray(point);
    parent.add(mesh);
    return mesh;
  }
  // 裁开 HF 外壳后补真实内衬与口沿，圣珠可见时不暴露背面空洞。
  panel(root, [6.2, 0.18, 3.5], [0, 2.8, 0]);
  for (const x of [-3.05, 3.05]) {
    panel(root, [0.16, 2.72, 3.5], [x, 4.16, 0]);
    panel(root, [0.23, 0.13, 3.65], [x, 5.55, 0], bronze);
  }
  for (const z of [-1.65, 1.65]) {
    panel(root, [6.2, 2.72, 0.16], [0, 4.16, z]);
    panel(root, [6.3, 0.13, 0.23], [0, 5.55, z], bronze);
  }
  const lid = new THREE.Group();
  lid.name = "sacred_chest_lid";
  lid.position.set(0, 5.6, 2.35);
  root.add(lid);
  lid.add(asset.create(1));
  panel(lid, [6.2, 0.09, 3.65], [0, 0.04, -2.35]);
  for (const x of [-3.05, 3.05])
    panel(lid, [0.22, 0.12, 3.65], [x, 0.02, -2.35], bronze);
  for (const z of [-4.05, -0.65])
    panel(lid, [6.3, 0.12, 0.22], [0, 0.02, z], bronze);
  return lid;
}
