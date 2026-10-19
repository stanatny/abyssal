import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { hawaiiBatch10Asset } from "./hawaii_batch10_asset.js";
import { bindOrganicBody } from "./hf_organic_asset.js";
import {
  chainWeights,
  createLordBones,
  lordEffortSmoother,
  nearestChain,
} from "./hawaii_lord_rig.js";
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b),
  point = new THREE.Vector3();
let legGeometry, gonadGeometry;
const legPoints = (side, j) => [
  [side * 0.067, 0.025, -0.055 + j * 0.058],
  [side * (0.155 + (j < 3 ? j * 0.012 : 0)), 0.005, -0.105 + j * 0.078],
  [
    side * (0.23 + (j === 2 ? 0.065 : j === 1 || j === 3 ? 0.045 : 0)),
    -0.085,
    -0.12 + j * 0.105,
  ],
];
function walkingLegs() {
  if (legGeometry) return legGeometry;
  const parts = [];
  for (const side of [-1, 1])
    for (let j = 0; j < 5; j++) {
      const pts = legPoints(side, j).map((p) => new THREE.Vector3(...p));
      const g = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          18,
          0.0065,
          6,
          false,
        ),
        colors = [];
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const color = new THREE.Color().set(
          p.getY(i) < -0.065 ? 0xd1bd98 : 0xa18b6e,
        );
        color.toArray(colors, i * 3);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      parts.push(g);
      for (const [j, p] of pts.entries()) {
        const joint = new THREE.SphereGeometry(j === 1 ? 0.008 : 0.007, 8, 6);
        joint.translate(p.x, p.y, p.z);
        const c = new THREE.Color(0xb19b7d),
          rgb = new Float32Array(joint.attributes.position.count * 3);
        for (let i = 0; i < joint.attributes.position.count; i++)
          c.toArray(rgb, i * 3);
        joint.setAttribute("color", new THREE.BufferAttribute(rgb, 3));
        parts.push(joint);
      }
    }
  legGeometry = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return legGeometry;
}
function gonads() {
  if (gonadGeometry) return gonadGeometry;
  const parts = [];
  for (let j = 0; j < 4; j++) {
    const a = (j * Math.PI) / 2 + Math.PI / 4,
      pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = 0.35 + ((Math.PI * 2 - 0.7) * i) / 28;
      pts.push(
        new THREE.Vector3(
          Math.cos(a) * 0.13 + Math.cos(t) * 0.07,
          0.055,
          Math.sin(a) * 0.13 + Math.sin(t) * 0.07,
        ),
      );
    }
    parts.push(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts),
        28,
        0.008,
        6,
        false,
      ),
    );
  }
  gonadGeometry = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return gonadGeometry;
}
const legMaterial = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.78,
  }),
  organMaterial = new THREE.MeshStandardMaterial({
    color: 0xbba1b6,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    roughness: 0.9,
  });
function bindNativeLegs(chains) {
  const g = walkingLegs();
  if (g.attributes.skinIndex) return g;
  const ids = new Uint16Array(g.attributes.position.count * 4),
    w = new Float32Array(ids.length);
  for (let i = 0; i < g.attributes.position.count; i++) {
    point.fromBufferAttribute(g.attributes.position, i);
    let best,
      d = Infinity;
    for (const c of chains.filter((c) => c.type === "leg")) {
      const n = nearestChain(point, c);
      if (n.distance < d) {
        d = n.distance;
        best = c;
      }
    }
    chainWeights(best, point, 1, ids, w, i * 4);
  }
  g.setAttribute("skinIndex", new THREE.BufferAttribute(ids, 4));
  g.setAttribute("skinWeight", new THREE.BufferAttribute(w, 4));
  g.computeBoundingSphere();
  return g;
}
/** 同一工厂服务图鉴和四片海域；HF 实体保留原尺寸，缺损步足以十条连续肢体替换。 */
export function buildHawaiiBatch10HF(kind, root, motions) {
  const jelly = kind === "moon_jelly",
    lobster = kind === "spiny_lobster";
  // 只选择既有的背侧向上视觉转向；不改变速度、轨迹或捕食规则。
  if (jelly || lobster) root.userData.aquaticUpright = true;
  const anatomy = new THREE.Group();
  anatomy.name = `${kind}_anatomy`;
  root.add(anatomy);
  const chains = [];
  if (jelly) {
    chains.push({ name: "bell", type: "bell", points: [[0, 0.04, 0]] });
    for (let j = 0; j < 4; j++) {
      const a = (j * Math.PI) / 2;
      chains.push({
        name: `oral_arm_${j}`,
        type: "arm",
        points: [-0.025, -0.21, -0.4].map((y) => [
          Math.cos(a) * (0.08 - y * 0.18),
          y,
          Math.sin(a) * (0.08 - y * 0.18),
        ]),
      });
    }
  } else if (lobster) {
    chains.push({
      name: "tail",
      type: "tail",
      points: [
        [0, 0.07, 0.18],
        [-0.025, 0.05, 0.3],
        [-0.05, 0.025, 0.41],
      ],
    });
    for (const side of [-1, 1]) {
      for (let j = 0; j < 5; j++)
        chains.push({
          name: `walking_leg_${side}_${j}`,
          type: "leg",
          side,
          step: j,
          points: legPoints(side, j),
        });
      chains.push({
        name: `antenna_${side}`,
        type: "antenna",
        side,
        points: [
          [side * 0.047, 0.04, -0.08],
          [side * 0.14, -0.025, -0.27],
          [side * 0.22, -0.05, -0.46],
        ],
      });
    }
  } else {
    chains.push({
      name: "tail",
      type: "tail",
      points: [0.02, 0.19, 0.35].map((z) => [0, 0, z]),
    });
    const f =
      kind === "herring" ? [0.055, -0.028, -0.29] : [0.031, -0.025, -0.3];
    for (const side of [-1, 1])
      chains.push({
        name: `pectoral_${side}`,
        type: "pectoral",
        side,
        points: [[f[0] * side, f[1], f[2]]],
      });
  }
  const bones = createLordBones(anatomy, chains);
  bones[0].name = `${kind}_root`;
  const asset = hawaiiBatch10Asset(kind, (x, y, z, ids, w, o) => {
    ids[o] = 0;
    w[o] = 1;
    point.set(x, y, z);
    if (jelly) {
      if (y > -0.02) {
        ids[o] = chains[0].ids[0];
        return;
      }
      let best,
        d = Infinity;
      for (const c of chains.slice(1)) {
        const n = nearestChain(point, c);
        if (n.distance < d) {
          d = n.distance;
          best = c;
        }
      }
      chainWeights(best, point, smooth(0.02, 0.08, -y), ids, w, o);
    } else if (lobster) {
      if (z > 0.15)
        chainWeights(chains[0], point, smooth(0.15, 0.23, z), ids, w, o);
      if (z < -0.13) {
        const c = chains.find(
          (c) => c.type === "antenna" && c.side === (x < 0 ? -1 : 1),
        );
        chainWeights(c, point, smooth(0.12, 0.23, -z), ids, w, o);
      }
    } else {
      chainWeights(chains[0], point, smooth(-0.08, 0.12, z), ids, w, o);
      const c = chains[x < 0 ? 1 : 2],
        f = c.points[0],
        blend =
          smooth(
            Math.abs(f[0]) + 0.004,
            Math.abs(f[0]) + (kind === "anchovy" ? 0.014 : 0.026),
            Math.abs(x),
          ) *
          smooth(-0.34, -0.27, z) *
          (1 - smooth(-0.05, 0.07, z)) *
          (1 - smooth(0.015, 0.065, y)) *
          smooth(-0.115, -0.07, y);
      for (let j = 0; j < 3; j++) w[o + j] *= 1 - blend;
      ids[o + 3] = c.ids[0];
      w[o + 3] = blend;
    }
  });
  const mesh = bindOrganicBody(
      anatomy,
      `${kind}_hf_body`,
      asset.geometry,
      asset.material,
      bones,
      0.25,
    ),
    skins = [mesh];
  if (lobster)
    skins.push(
      bindOrganicBody(
        anatomy,
        "ten_articulated_walking_legs",
        bindNativeLegs(chains),
        legMaterial,
        bones,
        0.15,
      ),
    );
  if (jelly) {
    const organs = new THREE.Mesh(gonads(), organMaterial);
    organs.name = "four_horseshoe_gonads";
    bones[chains[0].ids[0]].add(organs);
    organs.position.y = -0.04;
    organs.userData.keepSeparate = true;
    root.userData.wildlifeAnatomy =
      "Aurelia spp. / four gonads, four oral arms, short fringe";
  }
  root.userData.hfRig = { kind, chains, bones, mesh, skins };
  root.userData.normalizedLength = 1;
  root.userData.artRevision = "trellis_hawaii_batch10_20261019";
  root.userData.prepareMaterials = asset.prepare;
  asset.prepare();
  let disposed = false;
  root.userData.disposeLocalMotion = () => {
    if (disposed) return;
    disposed = true;
    skins.forEach((m) => m.skeleton.dispose());
  };
  const effort = lordEffortSmoother();
  motions.push((t, speed) => {
    const e = smooth(0.5, 3, effort(t, speed));
    if (jelly) {
      const pulse = Math.sin(t * 0.9),
        bell = bones[chains[0].ids[0]];
      bell.scale.set(1 + pulse * 0.045, 1 - pulse * 0.1, 1 + pulse * 0.045);
      for (const c of chains.slice(1))
        c.ids.forEach((id, j) => {
          bones[id].rotation.x =
            Math.sin(t * 0.48 + j * 0.4 + c.points[0][0]) * 0.045;
          bones[id].rotation.z =
            Math.cos(t * 0.43 + j * 0.35 + c.points[0][2]) * 0.05;
        });
    } else if (lobster) {
      for (const c of chains) {
        if (c.type === "leg") {
          const p =
            t * 1.5 + c.step * Math.PI * 0.65 + (c.side === 1 ? Math.PI : 0);
          bones[c.ids[0]].rotation.y = Math.sin(p) * 0.14;
          bones[c.ids[1]].rotation.z = c.side * Math.max(0, Math.sin(p)) * 0.09;
        } else if (c.type === "antenna")
          c.ids.forEach((id, j) => {
            bones[id].rotation.y = c.side * Math.sin(t * 0.45 + j * 0.7) * 0.04;
            bones[id].rotation.x = Math.sin(t * 0.38 + j) * 0.025;
          });
        else
          c.ids.forEach((id, j) => {
            bones[id].rotation.x = Math.sin(t * 0.8 - j * 0.5) * 0.025;
          });
      }
    } else {
      const phase = t * 1.8;
      chains[0].ids.forEach(
        (id, j) =>
          (bones[id].rotation.y =
            ((Math.sin(phase - j * 0.55) * 0.055 * (j + 1)) / 2) *
            (1 + e * 0.45)),
      );
      for (const c of chains.slice(1)) {
        bones[c.ids[0]].rotation.y = -c.side * Math.sin(phase * 0.7) * 0.16;
        bones[c.ids[0]].rotation.z = c.side * Math.cos(phase * 0.7) * 0.09;
      }
    }
  });
}
