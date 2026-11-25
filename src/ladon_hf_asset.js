import * as T from "three";
import data from "./assets/models/ladon_hf_mesh.json" with { type: "json" };
import { decodeOrganicMesh, bindOrganicBody } from "./hf_organic_asset.js";
import { createMaterialPreparation } from "./material_loading.js";
import {
  createLordBones,
  chainWeights,
  prepareLordSkinChunks,
} from "./hawaii_lord_rig.js";

export const LADON_HF_DATA = data;
const textureURL = new URL(
  "./assets/models/ladon_hf_color.webp",
  import.meta.url,
);
let shared;
const smooth = (a, b, value) => T.MathUtils.smoothstep(value, a, b);

/** 原始 HF 表面只解码一次；骨架、动作和战斗锚点归各实例独立拥有。 */
function ladonAsset(chain) {
  if (shared) return shared;
  const point = new T.Vector3();
  const geometry = decodeOrganicMesh(
    data,
    (x, y, z, ids, weights, offset) => {
      point.set(x, y, z);
      chainWeights(chain, point, 1, ids, weights, offset);
    },
    (x, y, z, color) => color.set(y < -0.025 ? 0x85816b : 0x425344),
  );
  const material = new T.MeshStandardMaterial({
    roughness: 0.76,
    metalness: 0,
    vertexColors: true,
  });
  material.name = "ladon_hf_olive_gold_scales";
  const prepare = createMaterialPreparation(
    [
      {
        name: "color",
        url: textureURL,
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
  shared = { geometry, material, prepare };
  return shared;
}

/** 单首长躯海龙：-Z 向前，Y 向上，真实完整体表和轴向连续运动。 */
export function buildLadonHF(root, motions) {
  root.userData.aquaticUpright = true;
  root.userData.aquaticPitchLimit = 0.5;
  root.userData.aquaticTurnRate = 1.5;
  const body = new T.Group();
  body.name = "ladon_continuous_sea_dragon";
  root.add(body);
  const chain = {
    name: "ladon_spine",
    points: data.centerline,
  };
  const bones = createLordBones(body, [chain]);
  const asset = ladonAsset(chain);
  const mesh = bindOrganicBody(
    body,
    "ladon_hf_single_head_complete_body",
    asset.geometry,
    asset.material,
    bones,
    0.25,
  );
  const parts = Array.from({ length: 14 }, () => []);
  const positions = mesh.geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const z = positions.getZ(i);
    const bin = T.MathUtils.clamp(
      Math.floor((z + 0.5) * parts.length),
      0,
      parts.length - 1,
    );
    parts[bin].push(i);
  }
  mesh.userData.lordCoreParts = parts.filter((part) => part.length > 24);
  prepareLordSkinChunks(mesh);
  const mouth = new T.Object3D();
  mouth.name = "ladon_actual_snout_anchor";
  mouth.position.fromArray(data.mouthAnchor);
  mouth.position.sub(new T.Vector3(...chain.points[0]));
  bones[chain.ids[0]].add(mouth);
  const tailSweepAnchors = chain.ids
    .map((id, i) => ({ id, i }))
    .filter(({ i }) => chain.points[i][2] >= 0.015)
    .map(({ id, i }) => {
      const anchor = new T.Object3D();
      anchor.name = `ladon_tail_sweep_${i}`;
      anchor.userData.radius = data.centerlineRadii[i];
      bones[id].add(anchor);
      return anchor;
    });
  root.userData.mouthAnchors = [mouth];
  root.userData.combatAnchor = mouth;
  root.userData.getHeadWorldPositions = () => [
    mouth.getWorldPosition(new T.Vector3()),
  ];
  root.userData.tailSweepAnchors = tailSweepAnchors;
  root.userData.ladonTailRadii = tailSweepAnchors.map((anchor) => {
    const i = Number(anchor.name.split("_").at(-1));
    return data.centerlineRadii[i];
  });
  root.userData.normalizedLength = 1;
  root.userData.odysseyAnatomy = "ladon";
  root.userData.artRevision = "ladon_hf_v1";
  root.userData.anatomy = {
    singleHead: true,
    continuousBody: true,
    limbs: 0,
    centerlineLength: data.centerlineLength,
  };
  root.userData.guideRadius = 0.76;
  root.userData.prepareMaterials = asset.prepare;
  root.userData.hfRig = { asset, mesh, bones, chains: [chain], spine: chain };
  let combat = { phase: "dormant", ability: "", progress: 0 };
  let previous;
  let travelSpeed = 12;
  let sweep = 0;
  let disposed = false;
  root.userData.setLadonCombat = (state = {}) => {
    combat = {
      phase: state.phase || "dormant",
      ability: state.ability || "",
      progress: T.MathUtils.clamp(state.progress || 0, 0, 1),
    };
  };
  root.userData.setBossPhase = (phase, ability) => {
    if (phase !== combat.phase) combat.progress = 0;
    combat.phase = phase;
    combat.ability = ability;
  };
  root.userData.setSwimTravel = (distance, dt) => {
    if (dt > 0) travelSpeed = Math.max(0, distance / dt);
  };
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  void asset.prepare();
  motions.push((time, speed = 1) => {
    const dt =
      previous === undefined ? 0 : Math.max(0, Math.min(0.12, time - previous));
    previous = time;
    const p = smooth(0, 1, combat.progress);
    const target =
      combat.phase === "windup"
        ? 0.62 * p
        : combat.phase === "attack"
          ? T.MathUtils.lerp(0.62, -0.72, p)
          : combat.phase === "recover"
            ? -0.72 * (1 - p)
            : 0;
    sweep += (target - sweep) * (1 - Math.exp(-dt * 16));
    const drive =
      T.MathUtils.clamp(travelSpeed / 18, 0.18, 1.4) *
      T.MathUtils.clamp(speed, 0.2, 2);
    const waveScale = combat.phase === "attack" ? 0.045 : 0.12;
    let previousHeading = 0;
    chain.ids.forEach((id, i) => {
      const u = i / (chain.ids.length - 1);
      const wave =
        waveScale *
        drive *
        Math.pow(u, 1.4) *
        Math.sin(time * 1.65 - u * Math.PI * 2.2);
      const heading = wave + sweep * smooth(0.34, 1, u);
      bones[id].rotation.y = heading - previousHeading;
      bones[id].rotation.x = i < 3 ? 0.008 * Math.sin(time * 1.2 - i * 0.3) : 0;
      previousHeading = heading;
    });
  });
}
