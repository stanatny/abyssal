import * as THREE from "three";
import {
  createAtlantisKeyArt,
  createAtlantisQuestChest,
} from "./atlantis_quest_art.js";
import { ATLANTIS_RELIC } from "./expedition_objectives.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 地宫圣珠与雕纹宝箱；钥匙和守宝印记齐全后解封，不占用额外灯池。 */
export function createAtlantisRelic(parent, { records = [] } = {}) {
  const keyArt = createAtlantisKeyArt(parent, records);
  const root = new THREE.Group();
  root.name = "poseidon_sacred_pearl";
  root.position.set(ATLANTIS_RELIC.x, -709.5, ATLANTIS_RELIC.z);
  parent.add(root);
  const resources = new Set();
  const keep = (r) => (resources.add(r), r);
  const stone = keep(
    new THREE.MeshStandardMaterial({ color: 0x8ba59a, roughness: 0.89 }),
  );
  addSurfaceDetail(stone, "stone", 0.14);
  const bronze = keep(
    new THREE.MeshStandardMaterial({
      color: 0x9c9870,
      metalness: 0.58,
      roughness: 0.49,
    }),
  );
  const pearlMat = keep(
    new THREE.MeshStandardMaterial({
      color: 0xe0f3d7,
      emissive: 0x71dbce,
      emissiveIntensity: 0.1,
      metalness: 0.2,
      roughness: 0.17,
    }),
  );
  function mesh(geo, mat, name, p = [0, 0, 0]) {
    const m = new THREE.Mesh(keep(geo), mat);
    m.name = name;
    m.position.fromArray(p);
    root.add(m);
    return m;
  }
  mesh(
    new THREE.CylinderGeometry(5.1, 5.8, 1.4, 8),
    stone,
    "carved_octagonal_dais",
    [0, 0.7, 0],
  );
  mesh(
    new THREE.CylinderGeometry(4.3, 4.9, 0.9, 8),
    stone,
    "pearl_dais_upper",
    [0, 1.85, 0],
  );
  for (const y of [1.25, 2.2]) {
    const trim = mesh(
      new THREE.TorusGeometry(y > 2 ? 4.45 : 5.1, 0.08, 6, 8),
      bronze,
      "dais_bronze_inlay",
      [0, y, 0],
    );
    trim.rotation.x = Math.PI / 2;
    trim.rotation.z = Math.PI / 8;
  }
  const lid = createAtlantisQuestChest(root, keep, stone, bronze);
  const pearl = mesh(
    new THREE.SphereGeometry(2.25, 32, 24),
    pearlMat,
    "sacred_pearl",
    [0, ATLANTIS_RELIC.y - root.position.y, 0],
  );
  pearl.visible = false;
  const sealMat = keep(
    new THREE.MeshBasicMaterial({
      color: 0x6197b3,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
      depthWrite: false,
    }),
  );
  const seal = mesh(
    new THREE.IcosahedronGeometry(3.2, 1),
    sealMat,
    "guardian_seal",
    pearl.position.toArray(),
  );
  const crown = mesh(
    new THREE.TorusGeometry(3.1, 0.055, 6, 64),
    bronze,
    "pearl_orbit",
    pearl.position.toArray(),
  );
  crown.rotation.x = Math.PI / 2;
  let unlocked = false,
    collected = false,
    disposed = false,
    previousTime = null;
  return {
    root,
    keyArt,
    get unlocked() {
      return unlocked;
    },
    get collected() {
      return collected;
    },
    setState(state) {
      keyArt.setState(state);
      if (
        unlocked === state.relicUnlocked &&
        collected === state.relicCollected
      )
        return;
      unlocked = state.relicUnlocked;
      collected = state.relicCollected;
      seal.visible = !unlocked;
      pearl.visible = unlocked && !collected;
      crown.visible = !collected;
      pearlMat.emissiveIntensity = unlocked ? 0.65 : 0.1;
    },
    update(time, position, reducedMotion = false) {
      if (disposed) return;
      keyArt.update(time, position, reducedMotion);
      const dt =
        previousTime === null
          ? 0
          : THREE.MathUtils.clamp(time - previousTime, 0, 0.12);
      previousTime = time;
      lid.rotation.x = reducedMotion
        ? unlocked
          ? 1.2
          : 0
        : THREE.MathUtils.damp(lid.rotation.x, unlocked ? 1.2 : 0, 4, dt);
      root.visible = root.position.distanceToSquared(position) < 230 ** 2;
      seal.rotation.y = reducedMotion ? 0 : time * 0.09;
      crown.rotation.z = reducedMotion ? 0 : Math.sin(time * 0.6) * 0.15;
      // 核心接触点固定；呼吸只改变材质，不能令圣珠与拾取范围错位。
      if (unlocked)
        pearlMat.emissiveIntensity =
          0.65 + (reducedMotion ? 0 : Math.sin(time * 1.4) * 0.06);
    },
    reset() {
      keyArt.reset();
      this.setState({ relicUnlocked: false, relicCollected: false });
      lid.rotation.x = 0;
      previousTime = null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      keyArt.dispose();
      root.removeFromParent();
      for (const r of resources) r.dispose();
      resources.clear();
    },
  };
}
