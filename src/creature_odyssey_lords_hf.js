import * as T from "three";
import { odysseyLordHFAsset } from "./odyssey_lord_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  createLordBones,
  chainWeights,
  nearestChain,
  lordEffortSmoother,
  prepareLordSkinChunks,
} from "./hawaii_lord_rig.js";
import { buildKarkinosHF } from "./creature_odyssey_crab_hf.js";
import { buildScyllaHF } from "./creature_odyssey_scylla_hf.js";
export const ODYSSEY_HF_LORDS = new Set(["scylla", "charybdis", "karkinos"]);
const smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
/** 形体轴向、口腔和鳍裙均取实际源网格；沿用原领主状态机，不改变技能数值。 */
export function buildOdysseyLordHF(kind, root, motions) {
  if (kind === "scylla") return buildScyllaHF(root, motions);
  if (kind === "karkinos") return buildKarkinosHF(root, motions);
  if (kind !== "charybdis")
    throw Error(`Unsupported Odyssean HF lord: ${kind}`);
  const body = new T.Group();
  body.name = `${kind}_odyssean_anatomy`;
  root.add(body);
  const tail = {
    name: "charybdis_tail",
    type: "tail",
    points: [
      [0, -0.015, 0.06],
      [0, -0.015, 0.23],
      [0, -0.025, 0.39],
    ],
  };
  const mouth = {
    name: "charybdis_maw",
    points: [
      [0, 0.015, -0.27],
      [0, 0.015, -0.44],
    ],
  };
  const fins = [-1, 1].map((side) => ({
    name: `charybdis_fin_${side}`,
    side,
    points: [
      [side * 0.12, -0.125, -0.22],
      [side * 0.23, -0.21, -0.18],
    ],
  }));
  const chains = [mouth, tail, ...fins],
    bones = createLordBones(body, chains),
    p = new T.Vector3();
  const bind = (x, y, z, ids, w, o) => {
    p.set(x, y, z);
    if (z > 0.04) {
      chainWeights(tail, p, smooth(0.04, 0.22, z), ids, w, o);
      return;
    }
    const fin = fins[x < 0 ? 0 : 1],
      distance = nearestChain(p, fin).distance;
    const finBlend =
      smooth(0.11, 0.23, -y) *
      smooth(0.1, 0.22, Math.abs(x)) *
      (1 - smooth(0.008, 0.022, distance));
    const mainIds = new Uint16Array(4),
      mainWeights = new Float32Array(4),
      finIds = new Uint16Array(4),
      finWeights = new Float32Array(4);
    chainWeights(mouth, p, 1 - smooth(-0.36, -0.1, z), mainIds, mainWeights, 0);
    chainWeights(fin, p, 1, finIds, finWeights, 0);
    const mix = new Map();
    for (let j = 0; j < 4; j++) {
      mix.set(
        mainIds[j],
        (mix.get(mainIds[j]) || 0) + mainWeights[j] * (1 - finBlend),
      );
      mix.set(finIds[j], (mix.get(finIds[j]) || 0) + finWeights[j] * finBlend);
    }
    const terms = [...mix].sort((a, b) => b[1] - a[1]).slice(0, 4),
      sum = terms.reduce((n, c) => n + c[1], 0);
    for (let j = 0; j < terms.length; j++) {
      ids[o + j] = terms[j][0];
      w[o + j] = terms[j][1] / sum;
    }
  };
  const asset = odysseyLordHFAsset(kind, bind),
    mesh = bindOrganicBody(
      body,
      "charybdis_hf_annular_armored",
      asset.geometry,
      asset.material,
      bones,
      0.12,
    );
  // 前部按实体口缘分扇区，不能把口内空水域填成整块碰撞体；后躯仍为承重实体。
  const parts = Array.from({ length: 18 }, () => []),
    pos = asset.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    if (z < -0.1) {
      if (Math.hypot(x, y - 0.015) < 0.13) continue;
      const sector = Math.min(
        7,
        Math.floor(((Math.atan2(y - 0.015, x) + Math.PI) / (Math.PI * 2)) * 8),
      );
      parts[(z < -0.25 ? 0 : 8) + sector].push(i);
    } else if (z < 0.3) parts[z < 0.1 ? 16 : 17].push(i);
  }
  mesh.userData.lordCoreParts = parts.filter((a) => a.length > 24);
  prepareLordSkinChunks(mesh);
  const anchor = new T.Object3D();
  anchor.name = "charybdis_mouth_anchor";
  anchor.position.set(0, 0, -0.06);
  bones[mouth.ids.at(-1)].add(anchor);
  root.userData.mouthAnchors = [anchor];
  root.userData.combatAnchor = anchor;
  root.userData.getHeadWorldPositions = () => [
    anchor.getWorldPosition(new T.Vector3()),
  ];
  root.userData.anatomy = { annularMaw: true, recessedMaw: true, arms: 0 };
  root.userData.normalizedLength = 1;
  root.userData.odysseyAnatomy = kind;
  root.userData.prepareMaterials = asset.prepare;
  void asset.prepare();
  root.userData.artRevision = "odyssey_lords_hf_v1";
  root.userData.guideRadius = 0.85;
  root.userData.hfRig = { asset, mesh, bones, chains, mouth, tail, fins };
  let phase = "dormant",
    ability = "",
    previous,
    attack = 0,
    windup = 0,
    travelSpeed = null,
    disposed = false;
  const effort = lordEffortSmoother();
  root.userData.setBossPhase = (value, active) => {
    phase = value;
    ability = active;
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
  motions.push((time, speed = 1) => {
    const dt =
      previous === undefined ? 0 : Math.max(0, Math.min(0.12, time - previous));
    previous = time;
    const alpha = 1 - Math.exp(-dt * 5),
      e = effort(time, speed),
      drive =
        travelSpeed === null
          ? e
          : T.MathUtils.clamp(travelSpeed / 20, 0.08, 1.4);
    attack += ((phase === "attack" ? 1 : 0) - attack) * alpha;
    windup += ((phase === "windup" ? 1 : 0) - windup) * alpha;
    const inhale = ability === "undertow" ? attack : 0,
      exhale = ability === "surge" ? attack : 0;
    bones[mouth.ids[0]].scale.set(
      1 +
        0.025 * Math.sin(time * 1.6) +
        windup * 0.055 +
        inhale * 0.07 -
        exhale * 0.035,
      1 +
        0.03 * Math.sin(time * 1.6) +
        windup * 0.07 +
        inhale * 0.1 -
        exhale * 0.04,
      1,
    );
    bones[mouth.ids[1]].scale.set(
      1 + 0.025 * Math.sin(time * 1.6 - 0.45) + inhale * 0.035,
      1 + 0.025 * Math.sin(time * 1.6 - 0.45) + inhale * 0.035,
      1,
    );
    for (let i = 0; i < tail.ids.length; i++)
      bones[tail.ids[i]].rotation.y =
        (Math.sin(time * 2 - i * 0.65) * (0.025 + 0.045 * drive) * (i + 1)) / 3;
    for (const fin of fins) {
      bones[fin.ids[0]].rotation.z =
        fin.side *
        Math.sin(time * 1.9 + fin.side * 0.35) *
        (0.035 + 0.06 * drive);
      bones[fin.ids[1]].rotation.x = Math.sin(time * 1.9 - 0.6) * 0.04;
    }
  });
}
