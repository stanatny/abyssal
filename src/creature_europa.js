import { refineEuropaAnatomy } from "./creature_europa_refinement.js";
import { bindSerpentineMotion } from "./serpentine_motion.js";
import * as THREE from "three";
import { EUROPA_SPECIES } from "./europa_species.js";
import { buildEuropaShellForm } from "./creature_europa_shells.js";
import { buildEuropaRadialForm } from "./creature_europa_radial.js";
import { buildEuropaRibbonForm } from "./creature_europa_ribbons.js";
import { batchEuropaAnatomy } from "./creature_europa_batch.js";
import {
  alienPart,
  alienMaterial,
  cachedAlienGeometry,
  alienTrunk,
  alienMembrane,
  alienTube,
  alienRing,
  alienTaperedTube,
} from "./creature_europa_geometry.js";
export const EUROPA_CREATURE_KINDS = new Set(EUROPA_SPECIES.map((s) => s.kind));
const palettes = {
  glass_seed: ["#528b9a", "#deb46f"],
  ribbon_spore: ["#817aaa", "#bcd6c1"],
  tripod_bloom: ["#b67a69", "#8fc5b0"],
  sail_crawler: ["#60716c", "#c4a87a"],
  lantern_pod: ["#716387", "#d1b876"],
  veil_glider: ["#6a879b", "#b8a8ba"],
  forkjaw_stalker: ["#4a5d72", "#c89378"],
  crown_filterer: ["#a07182", "#dac29e"],
  prism_hunter: ["#546c91", "#aac9d5"],
  bell_carrier: ["#638d83", "#b9a5cb"],
  siphon_colossus: ["#8c7b66", "#c3b393"],
  spiral_grazer: ["#647f88", "#c9b48c"],
  rift_reaver: ["#625968", "#ba8979"],
  void_siphon: ["#414a68", "#a397b6"],
  brine_rosette: ["#927252", "#bdc5a4"],
  hinge_walker: ["#607b6e", "#bd956e"],
};
/** 外星生命按硬甲、多腕、放射、长带等独立解剖构建，不再共享一套软体轮廓。 */
export function buildEuropaCreature(kind, root, motions) {
  if (!EUROPA_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown Europa creature: ${kind}`);
  const [color, accent] = palettes[kind],
    anatomy = new THREE.Group();
  anatomy.name = `${kind}_anatomy`;
  root.add(anatomy);
  let hunterPhase = "idle";
  root.userData.setHunterPhase = (phase) => (hunterPhase = phase);
  const ctx = {
    kind,
    root,
    anatomy,
    motions,
    phase: () => hunterPhase,
    skin: alienMaterial(color),
    edge: alienMaterial(accent),
    organ: alienMaterial(accent, 0.22),
    dark: alienMaterial("#142432"),
    geometry: (key, make) => cachedAlienGeometry(`${kind}_${key}`, make),
    part: (key, geometry, material, pos = [0, 0, 0], parent = anatomy) =>
      alienPart(parent, geometry, material, key, pos),
    trunk: (key, profile, folds = 0, lobes = 0) =>
      alienTrunk(`${kind}_${key}`, profile, folds, lobes),
    tube: (key, points, radius = 0.01, segments = 16) =>
      alienTube(`${kind}_${key}`, points, radius, segments),
    tapered: (key, points, radius, end = 0.001, segments = 16) =>
      alienTaperedTube(`${kind}_${key}`, points, radius, end, segments),
    ring: (key, radius, thickness, arc) =>
      alienRing(`${kind}_${key}`, radius, thickness, arc),
    membrane: (key, outline, thickness = 0.01) =>
      alienMembrane(`${kind}_${key}`, outline, thickness),
    group: (name, pos = [0, 0, 0], parent = anatomy) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.fromArray(pos);
      parent.add(g);
      return g;
    },
    moving: (object, update) => {
      object.userData.keepSeparate = true;
      motions.push((t, e) => update(object, t, e));
      return object;
    },
  };
  ctx.oval = (key, pos, axes, material = ctx.skin, parent = anatomy) => {
    const m = ctx.part(
      key,
      ctx.geometry("oval", () => new THREE.SphereGeometry(1, 16, 10)),
      material,
      pos,
      parent,
    );
    m.scale.fromArray(axes);
    return m;
  };
  if (
    !buildEuropaShellForm(ctx) &&
    !buildEuropaRadialForm(ctx) &&
    !buildEuropaRibbonForm(ctx)
  )
    throw new Error(`Missing Europa anatomy: ${kind}`);
  refineEuropaAnatomy(ctx);
  batchEuropaAnatomy(anatomy, kind);
  if (kind === "rift_reaver") {
    const tail = anatomy.getObjectByName("articulated_serpent_tail");
    // 合批后的肉体、甲片和背刺共用同一波形，长尾不再像硬杆绕尾根摇动。
    for (const mesh of [...tail.children])
      if (mesh.isMesh)
        bindSerpentineMotion(mesh, motions, {
          headZ: 0,
          tailZ: 0.8,
          segments: 12,
          frequency: 0.7,
          waves: 1.15,
          amplitude: 0.6,
        });
  }
  // 只归一化纵向体长；宽体、长腕、扁平体态保留各自比例，捕食/生态配置不变。
  const bounds = new THREE.Box3().setFromObject(anatomy),
    axis = bounds.max.z - bounds.min.z,
    scale = 1 / axis;
  anatomy.scale.setScalar(scale);
  anatomy.position.z = -(bounds.min.z + bounds.max.z) / 2 / axis;
  const hard = [
    "glass_seed",
    "sail_crawler",
    "forkjaw_stalker",
    "prism_hunter",
    "spiral_grazer",
    "hinge_walker",
    "brine_rosette",
  ].includes(kind);
  motions.push((t) => {
    anatomy.rotation.z = Math.sin(t * 0.47) * (hard ? 0.012 : 0.028);
    anatomy.scale.y = scale * (1 + Math.sin(t * 0.9) * (hard ? 0.007 : 0.026));
  });
}
