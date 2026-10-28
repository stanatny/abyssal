import * as T from "three";
import { decodePackedArray } from "./packed_array.js";
import {
  ODYSSEY_HF_LORD_DATA,
  odysseyLordHFAsset,
} from "./odyssey_lord_hf_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import { nearestChain, prepareLordSkinChunks } from "./hawaii_lord_rig.js";
import { bindKarkinosGrounding } from "./creature_odyssey_crab_grounding.js";
/** 巨蟹使用拟合后的实体硬甲与真实关节；保留八足海床解算和双螯攻击接口。 */
export function buildKarkinosHF(root, motions) {
  const body = new T.Group();
  body.name = "karkinos_odyssean_anatomy";
  body.position.y = -0.09;
  root.add(body);
  const shell = new T.Bone();
  shell.name = "karkinos_suspended_thorax";
  body.add(shell);
  const bones = [shell],
    chains = [],
    legs = [],
    claws = [];
  const add = (name, points) => {
    const chain = { name, points, ids: [] };
    points.forEach((p, i) => {
      const b = new T.Bone();
      b.name = `${name}_${i}`;
      b.position.fromArray(p);
      if (i) b.position.sub(new T.Vector3(...points[i - 1]));
      (i ? bones[chain.ids[i - 1]] : shell).add(b);
      chain.ids.push(bones.length);
      bones.push(b);
    });
    chains.push(chain);
    return chain;
  };
  const rows = [
    [
      [0.19, -0.035, -0.13],
      [0.35, 0.025, -0.235],
      [0.44, -0.155, -0.3],
    ],
    [
      [0.23, -0.03, -0.015],
      [0.39, 0.045, -0.035],
      [0.55, -0.155, -0.12],
    ],
    [
      [0.21, -0.03, 0.13],
      [0.39, 0.04, 0.205],
      [0.53, -0.155, 0.235],
    ],
    [
      [0.12, -0.035, 0.245],
      [0.245, 0.045, 0.365],
      [0.39, -0.155, 0.445],
    ],
  ];
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const points = rows[i].map((p) => [p[0] * side, p[1], p[2]]),
        hipPoint = new T.Vector3(...points[0]),
        kneePoint = new T.Vector3(...points[1]),
        solePoint = new T.Vector3(...points[2]);
      const measured = [
        [-0.419, -0.143, -0.382],
        [-0.575, -0.153, -0.155],
        [-0.568, -0.172, 0.238],
        [-0.466, -0.162, 0.454],
        [0.461, -0.138, -0.382],
        [0.575, -0.154, -0.116],
        [0.576, -0.136, 0.255],
        [0.449, -0.16, 0.495],
      ][(side < 0 ? 0 : 4) + i];
      const bends = [
        [-0.345, 0.08, -0.133],
        [-0.366, 0.08, 0.005],
        [-0.334, 0.08, 0.189],
        [-0.262, 0.08, 0.365],
        [0.347, 0.08, -0.126],
        [0.375, 0.08, 0.005],
        [0.344, 0.085, 0.191],
        [0.264, 0.085, 0.375],
      ][(side < 0 ? 0 : 4) + i];
      solePoint.fromArray(measured);
      kneePoint.fromArray(bends);
      points[1] = bends;
      const anklePoint = kneePoint.clone().lerp(solePoint, 0.86);
      const chain = add(`karkinos_leg_${side}_${i}`, [
        points[0],
        points[1],
        anklePoint.toArray(),
      ]);
      const hip = bones[chain.ids[0]],
        knee = bones[chain.ids[1]],
        ankle = bones[chain.ids[2]],
        sole = new T.Object3D();
      sole.name = `karkinos_sole_${side}_${i}`;
      sole.position.copy(solePoint).sub(anklePoint);
      ankle.add(sole);
      const leg = {
        ...chain,
        side,
        index: i,
        hip,
        knee,
        ankle,
        sole,
        restSole: solePoint,
        gaitTarget: solePoint.clone(),
        gaitLift: 0,
        gaitSwing: false,
      };
      leg.restPole = kneePoint.clone().sub(hipPoint);
      const direction = solePoint.clone().sub(hipPoint).normalize();
      leg.restPole
        .addScaledVector(direction, -leg.restPole.dot(direction))
        .normalize();
      legs.push(leg);
    }
  for (const side of [-1, 1]) {
    const points = [
        [side * 0.11, -0.045, -0.17],
        [side * 0.205, -0.045, -0.255],
        [side * 0.19, -0.04, -0.36],
      ],
      chain = add(`karkinos_claw_${side}`, points);
    const shoulder = bones[chain.ids[0]],
      elbow = bones[chain.ids[1]],
      wrist = bones[chain.ids[2]],
      finger = new T.Bone();
    finger.position.set(0, -0.045, 0.005);
    wrist.add(finger);
    const fingerId = bones.length;
    bones.push(finger);
    const tip = new T.Object3D(),
      innerTip = new T.Object3D();
    tip.position.set(-side * 0.16, -0.005, -0.11);
    innerTip.position.set(-side * 0.1, 0, -0.1);
    wrist.add(tip);
    finger.add(innerTip);
    claws.push({
      ...chain,
      side,
      shoulder,
      elbow,
      wrist,
      finger,
      fingerId,
      tip,
      innerTip,
    });
  }
  const point = new T.Vector3(),
    smooth = (a, b, x) => T.MathUtils.smoothstep(x, a, b);
  const ownership = decodePackedArray(
    ODYSSEY_HF_LORD_DATA.karkinos.anatomyPart,
    Uint8Array,
  );
  const bind = (x, y, z, ids, w, o, index) => {
    const part = ownership[index];
    if (!part) {
      w[o] = 1;
      return;
    }
    point.set(x, y, z);
    const chain = chains[part - 1],
      near = nearestChain(point, chain),
      blend = smooth(1.1, 1.38, Math.hypot(x / 0.25, (z - 0.04) / 0.3));
    let a = near.a,
      b = near.b,
      t = smooth(0.67, 1, near.t);
    if (part >= 9 && z < -0.35) {
      a = chain.ids[2];
      b = claws[part - 9].fingerId;
      t = smooth(0.02, 0.07, -y) * smooth(0.35, 0.42, -z);
    }
    ids[o] = 0;
    ids[o + 1] = a;
    ids[o + 2] = b;
    w[o] = 1 - blend;
    w[o + 1] = blend * (1 - t);
    w[o + 2] = blend * t;
  };
  const asset = odysseyLordHFAsset("karkinos", bind),
    mesh = bindOrganicBody(
      body,
      "karkinos_hf_body",
      asset.geometry,
      asset.material,
      bones,
      0.2,
    );
  const pos = asset.geometry.attributes.position,
    parts = Array.from({ length: 5 }, () => []);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    if (Math.abs(x) < 0.26 && z > -0.19 && z < 0.31)
      parts[Math.min(4, Math.max(0, Math.floor(((z + 0.19) / 0.5) * 5)))].push(
        i,
      );
  }
  mesh.userData.lordCoreParts = parts;
  prepareLordSkinChunks(mesh);
  const mouth = new T.Object3D();
  mouth.position.set(0, -0.03, -0.18);
  mouth.name = "karkinos_recessed_mouth";
  shell.add(mouth);
  const ground = bindKarkinosGrounding(body, shell, legs),
    combat = { phase: "dormant", ability: "", progress: 0 };
  root.userData.setKarkinosCombat = (state = {}) =>
    Object.assign(combat, state);
  for (const key of [
    "fitKarkinosTerrain",
    "karkinosFootAnchors",
    "karkinosFootRestPositions",
    "karkinosGrounding",
    "karkinosGroundingContract",
  ])
    root.userData[key] = body.userData[key];
  Object.assign(root.userData, {
    mouthAnchors: [mouth],
    combatAnchor: mouth,
    clawAnchors: claws.map((c) => c.tip),
    clawInnerAnchors: claws.map((c) => c.innerTip),
    karkinosRig: { shell, legs, claws, eyes: [], mouth: { anchor: mouth } },
    hfRig: { asset, mesh, bones, chains, legs, claws },
    anatomy: {
      walkingLegs: 8,
      articulatedSegmentsPerLeg: 3,
      chelipeds: 2,
      asymmetricClaws: true,
      stalkedEyes: 2,
      mouthparts: 4,
      tentacles: 0,
      crabCarapace: true,
      recessedCrabMouth: true,
    },
    normalizedLength: 1,
    odysseyAnatomy: "karkinos",
    artRevision: "odyssey_lords_hf_v1",
    prepareMaterials: asset.prepare,
    guideRadius: 0.9,
  });
  void asset.prepare();
  let last,
    attack = 0,
    windup = 0,
    travel = null,
    gait = 0,
    disposed = false;
  root.userData.setGroundTravel = (d, dt) => {
    if (dt > 0) travel = Math.max(0, d / dt);
  };
  root.userData.disposeLocalMotion = () => {
    if (!disposed) {
      disposed = true;
      mesh.skeleton.dispose();
    }
  };
  motions.push((time, effort = 1, state) => {
    const dt =
      last === undefined ? 0 : Math.max(0, Math.min(0.12, time - last));
    last = time;
    const alpha = 1 - Math.exp(-dt * 7),
      phase = state?.phase || combat.phase,
      ability = state?.ability || combat.ability;
    attack += ((phase === "attack" ? 1 : 0) - attack) * alpha;
    windup += ((phase === "windup" ? 1 : 0) - windup) * alpha;
    const drive =
      travel === null
        ? Math.min(1.5, Math.max(0.1, effort))
        : T.MathUtils.clamp(travel / 19, 0, 1.5);
    gait += dt * (1.8 + drive * 1.6) * drive;
    shell.position.y = Math.sin(time * 1.1) * 0.003 - attack * 0.009;
    shell.rotation.set(0, 0, Math.sin(time * 0.6) * 0.004);
    for (const leg of legs) {
      const wave = gait + leg.index * Math.PI * 0.75 + leg.side * 0.8,
        step = Math.sin(wave);
      leg.gaitLift = Math.max(0, Math.cos(wave)) * 0.035 * drive;
      leg.gaitSwing = Math.cos(wave) > 0 && drive > 0.01;
      leg.gaitTarget.copy(leg.restSole);
      leg.gaitTarget.z += step * 0.025 * drive;
      leg.gaitTarget.y += leg.gaitLift;
      ground.solveLeg(leg, leg.gaitTarget);
    }
    const closing =
      attack * (ability === "claw" || ability === "pincer" ? 1 : 0);
    for (const c of claws) {
      c.shoulder.rotation.y =
        c.side *
        (Math.sin(time * 0.5 + c.side) * 0.02 - windup * 0.12 + closing * 0.24);
      c.shoulder.rotation.x = windup * 0.09 + attack * 0.06;
      c.elbow.rotation.y = c.side * closing * 0.04;
      c.wrist.rotation.z = c.side * Math.sin(time * 0.5) * 0.02;
      c.finger.rotation.x = -windup * 0.12 + closing * 0.18;
    }
  });
}
