import { fittedLordArmor } from "./creature_lord_armor.js";
import { amazonMesh } from "./amazon_anatomy.js";
import { sampleSection } from "./creature_surface.js";
import * as THREE from "three";
import {
  alienPart as part,
  alienMaterial as mat,
  alienTrunk as trunk,
  alienRing as ring,
  alienMembrane as membrane,
  alienTaperedTube as taper,
} from "./creature_europa_geometry.js";

/** 原创盐脉甲兽：承重甲壳、放射口器及三对层鳍；不借用地球鱼的轮廓。 */
export function buildBrineRegent(root, motions) {
  const body = new THREE.Group();
  body.name = "brine_regent_anatomy";
  root.add(body);
  const shell = mat("#8295a3"),
    edge = mat("#c5b8a0"),
    dark = mat("#182833"),
    glow = mat("#dbbd84", 0.25).clone(),
    flesh = mat("#516675");
  const profile = [
    [-0.39, 0.08, 0.08, 0],
    [-0.32, 0.17, 0.11, 0.015],
    [-0.15, 0.235, 0.145, 0.02],
    [0.08, 0.22, 0.135, 0],
    [0.27, 0.12, 0.1, -0.01],
    [0.42, 0.025, 0.03, 0],
  ];
  part(
    body,
    trunk("brine_sculpted_core", profile, 0.014, 0.04),
    shell,
    "brine_segmented_core",
  );
  amazonMesh(
    body,
    fittedLordArmor("brine_mineral_plates_v2", profile, {
      count: 9,
      start: -0.31,
      end: 0.33,
      color: "#5f7884",
      edge: "#cbbf9e",
      relief: 0.023,
    }),
    "#ffffff",
    [0, 0, 0],
    "overlapping_mineral_plates",
    true,
  );
  const mouth = new THREE.Group();
  mouth.position.set(0, 0, -0.39);
  body.add(mouth);
  const cavity = part(
    mouth,
    trunk("brine_oral_well", [
      [-0.006, 0.076, 0.076, 0],
      [0.014, 0.065, 0.065, 0],
      [0.04, 0.024, 0.024, 0],
    ]),
    dark,
    "recessed_radial_throat",
  );
  void cavity;
  part(
    mouth,
    ring("brine_aperture_rim", 0.078, 0.012),
    edge,
    "mineral_mouth_rim",
  );
  const jaws = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3,
      g = new THREE.Group();
    g.rotation.z = a;
    mouth.add(g);
    part(
      g,
      taper(
        `brine_jaw_${i}`,
        [
          [0.064, 0, 0],
          [0.055, 0.016, -0.028],
          [0.028, 0.014, -0.044],
        ],
        0.014,
        0.0025,
        14,
      ),
      edge,
      "radial_jaw",
    );
    jaws.push(g);
  }
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const z = -0.2 + i * 0.16,
        g = new THREE.Group();
      g.position.set(s * (sampleSection(profile, z)[0] - 0.008), -0.012, z);
      body.add(g);
      const wing = part(
        g,
        membrane(
          `brine_lamellar_fin_${s}_${i}`,
          [
            [0, 0],
            [0.02, s * 0.13],
            [0.14, s * 0.24],
            [0.22, s * 0.18],
            [0.2, s * 0.045],
            [0.065, 0],
          ],
          0.014,
        ),
        flesh,
        "layered_propulsive_fin",
      );
      void wing;
      for (let j = 0; j < 5; j++) {
        const t = j / 4;
        part(
          g,
          taper(
            `brine_fin_ray_${s}_${i}_${j}`,
            [
              [0.005 * s, 0, 0.02 + t * 0.035],
              [s * (0.05 + t * 0.12), 0.005, 0.06 + t * 0.1],
              [s * (0.085 + t * 0.09), 0, 0.1 + t * 0.075],
            ],
            0.004,
            0.001,
            10,
          ),
          edge,
          "fin_support_ray",
        );
      }
      g.userData.keepSeparate = true;
      motions.push((t, e) => {
        g.rotation.z =
          s *
          (0.12 +
            Math.sin(t * 0.72 - i * 0.8) * (0.12 + Math.min(e, 2) * 0.025));
        g.rotation.y = s * Math.sin(t * 0.72 - i * 0.8) * 0.08;
      });
    }
    const sensor = new THREE.Group();
    sensor.position.set(s * 0.135, 0.07, -0.326);
    sensor.rotation.y = s * 0.65;
    body.add(sensor);
    part(
      sensor,
      trunk(`brine_sensor_socket_${s}`, [
        [-0.015, 0.025, 0.022, 0],
        [0.015, 0.03, 0.024, 0],
        [0.035, 0.012, 0.012, 0],
      ]),
      dark,
      "recessed_pressure_socket",
    );
    const lens = part(
      sensor,
      ring(`brine_sensor_lens_${s}`, 0.014, 0.008),
      glow,
      "embedded_amber_sensor",
      [0, 0, -0.016],
    );
    void lens;
    part(
      body,
      membrane(
        `brine_tail_fluke_${s}`,
        [
          [0.3, s * 0.01],
          [0.42, s * 0.14],
          [0.55, s * 0.19],
          [0.49, s * 0.055],
          [0.44, 0],
        ],
        0.012,
      ),
      flesh,
      "bifid_tail_membrane",
    );
  }
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
      (1 - Math.exp(-dt * 5));
    glow.emissiveIntensity = 0.25 + tension * 1.6;
    jaws.forEach((g, i) => {
      g.rotation.z = (i * Math.PI) / 3 + Math.sin(t * 0.7) * 0.02;
      g.rotation.y = tension * 0.28;
    });
    body.scale.y = scale * (1 + Math.sin(t * 0.55) * 0.012 + tension * 0.035);
  });
  body.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(body),
    scale = 1 / box.getSize(new THREE.Vector3()).z;
  body.scale.setScalar(scale);
  body.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    glow.dispose();
  };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "brine_regent_v1";
}
