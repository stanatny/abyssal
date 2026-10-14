import { fittedLordArmor } from "./creature_lord_armor.js";
import * as THREE from "three";
import {
  amazonLoft,
  amazonMesh,
  amazonFin,
  amazonEyes,
  amazonEllipsoid,
  amazonTube,
  amazonSpike,
} from "./amazon_anatomy.js";
import { bindSerpentineMotion } from "./serpentine_motion.js";
import {
  alienMaterial,
  alienPart,
  alienTaperedTube,
} from "./creature_europa_geometry.js";

/** 幻想河底鲶王：宽颅、六须、厚鳃盖、连续侧摆尾；不是现实电鲶的复原。 */
export function buildThunderbarbel(root, motions) {
  const body = new THREE.Group();
  body.name = "thunderbarbel_river_anatomy";
  root.add(body);
  const back = "#344b3e",
    belly = "#c0b080",
    bronze = "#8b8751";
  const profile = [
    [-0.46, 0.1, 0.035, -0.01],
    [-0.41, 0.19, 0.07, 0],
    [-0.3, 0.21, 0.11, 0.006],
    [-0.14, 0.18, 0.15, 0],
    [0.04, 0.14, 0.13, 0],
    [0.24, 0.08, 0.08, 0],
    [0.39, 0.025, 0.045, 0],
    [0.47, 0.012, 0.028, 0],
  ];
  const torso = amazonMesh(
    body,
    amazonLoft(
      "thunderbarbel_lord_body",
      profile,
      back,
      belly,
      (x, y, z) => (y > 0 && Math.sin(z * 92 + x * 23) > 0.72 ? 0.28 : 0),
      90,
      36,
    ),
    "#ffffff",
    [0, 0, 0],
    "thunderbarbel_sculpted_core",
    true,
  );
  const swim = {
    headZ: -0.18,
    tailZ: 0.53,
    segments: 10,
    amplitude: 0.24,
    frequency: 0.72,
    waves: 0.65,
  };
  const skins = [bindSerpentineMotion(torso, motions, swim)];
  const armor = amazonMesh(
    body,
    fittedLordArmor("thunderbarbel_armored_scutes", profile, {
      count: 10,
      start: -0.27,
      end: 0.34,
      color: "#40513a",
      edge: "#939264",
      relief: 0.009,
    }),
    "#ffffff",
    [0, 0, 0],
    "fitted_dorsal_scutes",
    true,
  );
  skins.push(bindSerpentineMotion(armor, motions, swim));
  amazonEyes(body, 0.185, 0.036, -0.333, 0.018, "#d7bc64");
  for (const s of [-1, 1]) {
    amazonTube(
      body,
      `thunderbarbel_brow_${s}`,
      [
        [s * 0.17, 0.061, -0.39],
        [s * 0.188, 0.069, -0.347],
        [s * 0.191, 0.054, -0.31],
      ],
      0.009,
      bronze,
    );
    amazonEllipsoid(
      body,
      back,
      [s * 0.164, 0.008, -0.225],
      [0.035, 0.087, 0.08],
      "thick_gill_cover",
    );
    for (let i = 0; i < 4; i++)
      amazonTube(
        body,
        `thunderbarbel_gill_fold_${s}_${i}`,
        [
          [s * 0.181, 0.058, -0.268 + i * 0.014],
          [s * 0.203, 0.005, -0.255 + i * 0.014],
          [s * 0.178, -0.055, -0.241 + i * 0.014],
        ],
        0.0038,
        belly,
      );
    const fin = new THREE.Group();
    fin.position.set(s * 0.18, -0.012, -0.19);
    body.add(fin);
    amazonFin(
      fin,
      `thunderbarbel_pectoral_${s}`,
      [
        [0, 0],
        [0.04, s * 0.12],
        [0.2, s * 0.29],
        [0.25, s * 0.24],
        [0.23, s * 0.09],
        [0.07, 0],
      ],
      bronze,
      "horizontal",
    );
    amazonSpike(
      fin,
      `thunderbarbel_fin_spine_${s}`,
      [
        [0, 0, 0],
        [s * 0.13, 0.003, 0.05],
        [s * 0.28, 0, 0.18],
      ],
      0.013,
      belly,
    );
    motions.push((t) => {
      fin.rotation.z = s * (0.12 + Math.sin(t * 0.7) * 0.11);
      fin.rotation.y = s * Math.sin(t * 0.7) * 0.08;
    });
    const pelvic = new THREE.Group();
    pelvic.position.set(s * 0.08, -0.05, 0.17);
    body.add(pelvic);
    amazonFin(
      pelvic,
      `thunderbarbel_pelvic_${s}`,
      [
        [0, 0],
        [0.04, s * 0.1],
        [0.16, s * 0.12],
        [0.14, 0],
      ],
      bronze,
      "horizontal",
    );
    motions.push((t) => {
      pelvic.rotation.z = s * (0.1 + Math.sin(t * 0.72 - 1) * 0.07);
    });
  }
  const dorsal = amazonFin(
    body,
    "thunderbarbel_sail",
    [
      [-0.2, 0.11],
      [-0.16, 0.27],
      [-0.1, 0.29],
      [0.015, 0.23],
      [0.13, 0.13],
      [0.19, 0.075],
      [0.03, 0.112],
      [-0.11, 0.14],
    ],
    bronze,
  );
  skins.push(bindSerpentineMotion(dorsal, motions, swim));
  const tail = amazonFin(
    body,
    "thunderbarbel_forked_tail",
    [
      [0.39, 0.025],
      [0.49, 0.15],
      [0.63, 0.23],
      [0.59, 0.065],
      [0.54, 0],
      [0.59, -0.065],
      [0.63, -0.23],
      [0.49, -0.15],
      [0.39, -0.025],
    ],
    "#9b7145",
  );
  skins.push(bindSerpentineMotion(tail, motions, swim));
  // 下颌在真实口腔边缘转动，暗色口腔留在双唇内部。
  amazonEllipsoid(
    body,
    "#171e19",
    [0, -0.012, -0.462],
    [0.104, 0.032, 0.017],
    "recessed_catfish_mouth",
  );
  amazonTube(
    body,
    "thunderbarbel_upper_lip",
    [
      [-0.1, -0.006, -0.453],
      [0, 0.017, -0.474],
      [0.1, -0.006, -0.453],
    ],
    0.009,
    belly,
  );
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.022, -0.39);
  body.add(jaw);
  amazonEllipsoid(
    jaw,
    belly,
    [0, -0.005, -0.041],
    [0.105, 0.018, 0.05],
    "broad_lower_jaw",
  );
  const conductive = alienMaterial("#d7dca4", 0.3).clone();
  const anchors = [],
    barbels = [];
  for (const s of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      g.position.set(s * (0.09 - i * 0.018), -0.012 - i * 0.018, -0.448);
      body.add(g);
      const points = [
        [0, 0, 0],
        [s * (0.09 + i * 0.025), -0.018, -0.055],
        [s * (0.17 + i * 0.035), -0.027, 0.01],
        [s * (0.24 + i * 0.025), -0.006, 0.12 + i * 0.045],
      ];
      alienPart(
        g,
        alienTaperedTube(
          `thunderbarbel_barbel_${s}_${i}`,
          points,
          0.008 - i * 0.001,
          0.0018,
          30,
        ),
        alienMaterial(belly),
        "muscular_conductive_barbel",
      );
      // 三处放电端对应已存在的三发非追踪弹道。
      const tip = new THREE.Object3D();
      tip.position.fromArray(points[3]);
      g.add(tip);
      if (i === 0) anchors.push(tip);
      const gland = alienPart(
        g,
        alienTaperedTube(
          `thunderbarbel_glow_${s}_${i}`,
          points.map(([x, y, z], n) => [
            x,
            y + 0.006 * (1 - n / 3) + 0.0018,
            z,
          ]),
          0.003,
          0.001,
          20,
        ),
        conductive,
        "barbel_conductive_seam",
      );
      void gland;
      barbels.push({ g, s, i });
    }
  const center = new THREE.Object3D();
  center.position.set(0, -0.01, -0.48);
  body.add(center);
  root.userData.mouthAnchors = [anchors[0], center, anchors[1]];
  let phase = "dormant",
    previous,
    tension = 0;
  root.userData.setBossPhase = (p) => (phase = p);
  motions.push((t) => {
    const dt =
      previous === undefined ? 0 : Math.max(0, Math.min(0.2, t - previous));
    previous = t;
    tension +=
      ((phase === "windup" ? 1 : phase === "attack" ? 0.7 : 0) - tension) *
      (1 - Math.exp(-dt * 6));
    conductive.emissiveIntensity = 0.3 + tension * 1.8;
    jaw.rotation.x = -0.04 - tension * 0.16 - Math.sin(t * 0.6) * 0.025;
    for (const { g, s, i } of barbels) {
      g.rotation.y = s * (Math.sin(t * 0.6 - i * 0.5) * 0.08 - tension * 0.28);
      g.rotation.z = s * Math.sin(t * 0.7 + i) * 0.04;
    }
  });
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body),
    scale = 1 / bounds.getSize(new THREE.Vector3()).z;
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    for (const skin of skins) skin.skeleton.dispose();
    conductive.dispose();
  };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "thunderbarbel_v1";
  root.userData.aquaticUpright = true;
}
