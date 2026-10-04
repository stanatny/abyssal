import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { skinMaterial, sampleSection } from "./creature_surface.js";
import { amazonGeometry, amazonLoft, amazonMesh } from "./amazon_anatomy.js";
import {
  appendCrocodilianAxialWeights,
  bindCrocodilianTail,
} from "./aquatic_reptile_motion.js";

const TYPES = {
  black_caiman: {
    w: 0.113,
    h: 0.077,
    snout: 0.092,
    nose: -0.64,
    back: "#303f38",
    belly: "#a28e6e",
    armor: "#455047",
    broad: true,
  },
  saltwater_crocodile: {
    w: 0.12,
    h: 0.081,
    snout: 0.078,
    nose: -0.68,
    back: "#706848",
    belly: "#b6a281",
    armor: "#867856",
  },
  purussaurus: {
    w: 0.154,
    h: 0.101,
    snout: 0.139,
    nose: -0.59,
    back: "#565b42",
    belly: "#aa9570",
    armor: "#77775a",
    broad: true,
  },
  rootback_colossus: {
    w: 0.172,
    h: 0.123,
    snout: 0.128,
    nose: -0.61,
    back: "#48533e",
    belly: "#958260",
    armor: "#74755c",
    giant: true,
    broad: true,
  },
  rootjaw: {
    w: 0.195,
    h: 0.135,
    snout: 0.166,
    nose: -0.67,
    back: "#354a40",
    belly: "#938063",
    armor: "#69785b",
    giant: true,
    lord: true,
    broad: true,
  },
};
const materials = new Map();
const WHITE = "#ffffff";

/**
 * 创建五种独立轮廓的鳄类；几何与材质共享，尾部和四肢骨架属于实例。
 * @param {string} kind 黑凯门鳄、湾鳄、普鲁斯鳄或两种幻想巨鳄的注册名称。
 * @param {THREE.Group} parent 已有亚马逊解剖根节点。
 * @param {Function[]} motions 由主循环调用的动作队列。
 * @returns {void} 将头颈、口器和带骨架的躯干加入已有节点。
 */
export function buildCrocodilian(kind, parent, motions) {
  const c = TYPES[kind];
  if (!c) throw new Error(`Unknown crocodilian anatomy: ${kind}`);
  const { w, h } = c;
  const profile = [
    [-0.26, w * 0.78, h * 0.82, 0.008],
    [-0.12, w, h, 0],
    [0.06, w * 1.02, h * 0.96, -0.003],
    [0.23, w * 0.84, h * 0.86, 0],
    [0.32, w * 0.55, h * 0.81, 0],
    [0.44, w * 0.32, h * 0.78, 0],
    [0.62, w * 0.17, h * 0.6, 0],
    [0.8, w * 0.063, h * 0.3, 0],
    [0.93, 0.0008, 0.002, 0],
  ];
  const assembly = new THREE.Group();
  part(
    assembly,
    amazonLoft(
      `croc_v3_${kind}_body`,
      profile,
      c.back,
      c.belly,
      (x, y, z, a) => {
        const band = Math.sin(z * 43 + Math.sin(a * 4) * 0.9);
        return (
          (y > 0 ? 0.08 : 0.02) +
          (kind === "black_caiman" && y < h * 0.5 && band > 0.4 ? 0.14 : 0)
        );
      },
      72,
      32,
    ),
  );
  for (let row = 0; row < 21; row++) {
    const z = -0.2 + row * 0.049,
      [rx, ry, cy] = sampleSection(profile, z);
    const columns = z > 0.53 ? [0] : z > 0.29 ? [-1, 1] : [-2, -1, 0, 1, 2];
    for (const column of columns) {
      const x = column * rx * (z > 0.29 ? 0.46 : 0.31);
      const y = cy + ry * Math.sqrt(1 - (x / rx) ** 2);
      const tile = part(
        assembly,
        plate(
          kind,
          row,
          column,
          Math.max(0.005, rx * 0.255),
          0.043,
          (z > 0.3 ? 0.018 : c.giant ? 0.017 : 0.008) *
            (1 - Math.max(0, z - 0.4)),
        ),
        c.armor,
      );
      tile.position.set(x, y - 0.003, z);
    }
  }
  // 巨鳄有厚重肩盾和根状棘冠，现代鳄类没有幻想装饰。
  if (c.giant)
    for (const side of [-1, 1])
      for (let i = 0; i < (c.lord ? 7 : 5); i++) {
        const z = -0.17 + i * 0.065,
          [rx, ry] = sampleSection(profile, z);
        const bone = part(
          assembly,
          curvedTooth(
            `croc_v3_${kind}_root_${side}_${i}`,
            [
              [side * rx * 0.66, ry * 0.8, z],
              [side * rx * 0.77, ry + 0.038, z + 0.01],
              [side * rx * 0.58, ry + (c.lord ? 0.091 : 0.068), z + 0.054],
            ],
            0.015,
          ),
          "#8b8b67",
        );
        bone.userData.armorRoot = true;
      }
  const limbs = [];
  for (const side of [-1, 1])
    for (let pair = 0; pair < 2; pair++) {
      const index = limbs.length,
        anchor = new THREE.Vector3(
          side * w * 0.79,
          -h * 0.36,
          pair ? 0.225 : -0.108,
        );
      const elbow = new THREE.Vector3(
        side * (c.giant ? 0.07 : 0.052),
        -0.022,
        0.026,
      );
      const upper = new THREE.Group(),
        lower = new THREE.Group();
      upper.position.copy(anchor);
      lower.position.copy(elbow);
      upper.add(lower);
      assembly.add(upper);
      const radius = c.giant ? 0.031 : 0.021;
      part(
        upper,
        taperedTube(
          `croc_v3_${kind}_upper_${index}`,
          [[0, 0, 0], [elbow.x * 0.55, -0.012, 0.007], elbow.toArray()],
          radius,
          radius * 0.84,
        ),
        c.back,
      );
      part(
        lower,
        taperedTube(
          `croc_v3_${kind}_lower_${index}`,
          [
            [0, 0, 0],
            [side * 0.019, -0.018, 0.022],
            [side * 0.03, -0.029, 0.062],
          ],
          radius * 0.86,
          radius * 0.58,
        ),
        c.back,
      );
      const count = pair ? 4 : 5;
      for (let digit = 0; digit < count; digit++) {
        const spread = (digit - (count - 1) / 2) * 0.012;
        const start = [side * (0.03 + spread * 0.36), -0.029, 0.057];
        const tip = [
          side * (0.035 + spread),
          -0.032,
          0.089 + (1 - Math.abs(spread) / 0.03) * 0.012,
        ];
        part(
          lower,
          taperedTube(
            `croc_v3_${kind}_toe_${index}_${digit}`,
            [start, [side * (0.034 + spread * 0.7), -0.032, 0.081], tip],
            0.0048,
            0.0027,
          ),
          c.back,
        );
        if (digit < 3)
          part(
            lower,
            curvedTooth(
              `croc_v3_${kind}_claw_${index}_${digit}`,
              [
                tip,
                [tip[0], tip[1] + 0.001, tip[2] + 0.009],
                [tip[0] - side * 0.003, tip[1] - 0.003, tip[2] + 0.015],
              ],
              0.0027,
            ),
            "#8c876d",
          );
      }
      if (pair) part(lower, footWeb(kind, index, side), c.back);
      limbs.push({ anchor, elbow, side, pair, upper, lower });
    }
  // 同一蒙皮包含躯干、骨甲和四肢，减少大量小部件绘制并保持关节接缝。
  assembly.updateMatrixWorld(true);
  const parts = [];
  assembly.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    geometry.deleteAttribute("uv");
    geometry.applyMatrix4(mesh.matrixWorld);
    const limbIndex = limbs.findIndex(
      (l) => mesh.parent === l.upper || mesh.parent === l.lower,
    );
    const positions = geometry.attributes.position,
      ids = [],
      weights = [];
    for (let i = 0; i < positions.count; i++) {
      if (limbIndex >= 0) {
        const limb = limbs[limbIndex],
          bone = 7 + limbIndex * 2 + (mesh.parent === limb.lower ? 1 : 0);
        ids.push(bone, 0, 0, 0);
        weights.push(1, 0, 0, 0);
      } else appendCrocodilianAxialWeights(positions.getZ(i), ids, weights);
    }
    geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(ids, 4));
    geometry.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
    parts.push(geometry);
  });
  const body = part(
    parent,
    amazonGeometry(`croc_v3_${kind}_rigged_armor`, () =>
      mergeGeometries(parts),
    ),
  );
  parts.forEach((g) => g.dispose());
  const skin = bindCrocodilianTail(body, motions, { limbs });
  skin.userData.crocodilianRig = true;
  const head = new THREE.Group();
  head.name = "crocodilian_head";
  parent.add(head);
  const skull = [
    [c.nose, c.snout * (c.broad ? 0.64 : 0.3), 0.011, 0.011],
    [c.nose + 0.037, c.snout * (c.broad ? 0.93 : 0.52), 0.028, 0.013],
    [-0.43, c.snout, 0.036, 0.018],
    [-0.34, w * 0.84, h * 0.73, 0.018],
    [-0.26, w * 0.89, h * 0.96, 0.012],
    [-0.205, w * 0.76, h * 0.75, 0.008],
  ];
  part(
    head,
    amazonLoft(
      `croc_v3_${kind}_skull`,
      skull,
      c.back,
      c.belly,
      (x, y, z) => 0.04 + Math.max(0, Math.sin(x * 89 + z * 101)) * 0.08,
      58,
      32,
    ),
  );
  // 后枕骨盾贴合头颈表面，保留眼眶与长吻的独立轮廓。
  for (let row = 0; row < 3; row++) {
    const z = -0.254 + row * 0.025,
      [rx, ry, cy] = sampleSection(skull, z);
    for (const side of [-1, 1]) {
      const x = side * rx * 0.34;
      const shield = part(
        head,
        plate(`${kind}_nape`, row, side, rx * 0.21, 0.023, 0.003),
        c.armor,
      );
      shield.position.set(x, cy + ry * Math.sqrt(1 - (x / rx) ** 2) - 0.001, z);
    }
  }
  const jaw = new THREE.Group();
  jaw.name = "crocodilian_jaw";
  jaw.position.set(0, -0.026, -0.225);
  head.add(jaw);
  const jawProfile = skull.map(([z, rx]) => [
    z + 0.225,
    rx * 0.94,
    z < -0.4 ? 0.016 : 0.027,
    0,
  ]);
  part(
    jaw,
    amazonLoft(
      `croc_v3_${kind}_jaw`,
      jawProfile,
      c.back,
      c.belly,
      () => 0.01,
      42,
      24,
    ),
  );
  const mouthProfile = skull
    .slice(0, -1)
    .map(([z, rx]) => [z + 0.225, rx * 0.78, 0.005, 0]);
  part(
    jaw,
    amazonLoft(
      `croc_v3_${kind}_palate`,
      mouthProfile,
      "#51423c",
      "#3c3631",
      () => 0.02,
      30,
      20,
    ),
    WHITE,
    [0, 0.014, 0],
  );
  part(
    head,
    amazonLoft(
      `croc_v3_${kind}_upper_palate`,
      mouthProfile.map(([z, rx, ry]) => [z - 0.225, rx, ry]),
      "#4b4036",
      "#4b4036",
      () => 0,
      30,
      20,
    ),
    WHITE,
    [0, -0.018, 0],
  );
  for (const side of [-1, 1]) {
    // 瞳孔沿外侧上方朝向，不能让眼睛埋在头里或像悬挂的圆珠。
    const eyeZ = -0.295,
      [rx, ry, cy] = sampleSection(skull, eyeZ),
      size = c.giant ? 0.016 : 0.01;
    const eye = ellipsoid(
      head,
      `croc_v3_${kind}_orbit_${side}`,
      c.back,
      [side * rx * 0.64, cy + ry * 0.77, eyeZ],
      [size * 1.5, size * 1.03, size * 1.42],
    );
    eye.name = `crocodilian_orbit_${side}`;
    const iris = ellipsoid(
      head,
      `croc_v3_${kind}_iris_${side}`,
      c.lord ? "#b89b45" : "#a38c49",
      [side * (rx * 0.64 + size * 0.68), cy + ry * 0.86, eyeZ - 0.001],
      [size * 0.66, size * 0.66, size * 0.92],
      "eye",
    );
    iris.name = `crocodilian_eye_${side}`;
    ellipsoid(
      head,
      `croc_v3_${kind}_pupil_${side}`,
      "#080d09",
      [side * (rx * 0.64 + size * 1.13), cy + ry * 0.89, eyeZ - 0.003],
      [size * 0.16, size * 0.56, size * 0.18],
      "eye",
    );
    ellipsoid(
      head,
      `croc_v3_${kind}_brow_${side}`,
      c.armor,
      [side * rx * 0.65, cy + ry * 0.95, eyeZ + 0.001],
      [size * 1.5, size * 0.43, size * 1.6],
    );
    const noseZ = c.nose + 0.044,
      [nx, ny, ncy] = sampleSection(skull, noseZ);
    ellipsoid(
      head,
      `croc_v3_${kind}_nose_mound_${side}`,
      c.back,
      [side * nx * 0.5, ncy + ny * 0.81, noseZ],
      [0.014, 0.008, 0.018],
    );
    ellipsoid(
      head,
      `croc_v3_${kind}_nostril_${side}`,
      "#152018",
      [side * nx * 0.5, ncy + ny * 0.99, noseZ - 0.004],
      [0.007, 0.0018, 0.008],
    );
    // 牙根贴合颌缘；湾鳄第四颗下齿较大，凯门鳄的下齿向内收。
    for (let i = 0; i < 17; i++) {
      const z = THREE.MathUtils.lerp(c.nose + 0.047, -0.25, i / 16),
        [x] = sampleSection(skull, z);
      const fang = (c.giant ? 0.018 : 0.009) * (i % 5 === 3 ? 1.25 : 0.7);
      const upper = curvedTooth(
        `croc_v3_${kind}_tooth_upper_${side}_${i}`,
        [
          [side * x * 0.92, -0.012, z],
          [side * x * 0.92, -0.014 - fang * 0.55, z - 0.001],
          [side * x * 0.89, -0.014 - fang, z + 0.004],
        ],
        fang * 0.21,
      );
      part(head, upper, "#bfb79d");
      const lowerFang =
          fang * (kind === "saltwater_crocodile" && i === 3 ? 1.75 : 1),
        lowerEdge = kind === "saltwater_crocodile" && i === 3 ? 0.965 : 0.89;
      const lower = curvedTooth(
        `croc_v3_${kind}_tooth_lower_${side}_${i}`,
        [
          [side * x * lowerEdge, 0.008, z + 0.225],
          [side * x * lowerEdge, 0.009 + lowerFang * 0.55, z + 0.226],
          [side * x * (lowerEdge - 0.03), 0.009 + lowerFang, z + 0.23],
        ],
        fang * 0.2,
      );
      part(jaw, lower, "#bfb79d");
    }
    if (c.lord) {
      part(
        head,
        curvedTooth(
          `croc_v3_rootjaw_cheek_${side}`,
          [
            [side * w * 0.7, h * 0.64, -0.23],
            [side * w * 0.98, h * 0.95, -0.16],
            [side * w * 1.19, h * 0.8, -0.105],
          ],
          0.021,
        ),
        "#8b8b67",
      );
      part(
        head,
        curvedTooth(
          `croc_v3_rootjaw_crown_${side}`,
          [
            [side * w * 0.53, h * 0.85, -0.28],
            [side * w * 0.63, h * 1.29, -0.22],
            [side * w * 0.76, h * 1.45, -0.15],
          ],
          0.021,
        ),
        "#8b8b67",
      );
    }
  }
  let attack = 0,
    previousPoseTime;
  parent.userData.setCrocodilianPhase = (phase) => {
    attack = phase === "attack" || phase === "windup" ? 1 : 0;
  };
  motions.push((t, e) => {
    const gape = (c.giant ? 0.12 : 0.025) + attack * (c.giant ? 0.13 : 0.09);
    const dt =
      previousPoseTime === undefined
        ? 0
        : Math.max(0, Math.min(0.12, (t - previousPoseTime) / (1.7 + e * 1.1)));
    jaw.rotation.x =
      previousPoseTime === undefined
        ? -gape
        : THREE.MathUtils.damp(jaw.rotation.x, -gape, 9, dt);
    previousPoseTime = t;
  });
}

function part(
  parent,
  geometry,
  color = WHITE,
  position = [0, 0, 0],
  type = "skin",
) {
  const mesh = amazonMesh(
    parent,
    geometry,
    color,
    position,
    "crocodilian_detail",
    color === WHITE,
  );
  if (!materials.has(type)) {
    const material = skinMaterial({
      color: WHITE,
      vertexColors: true,
      roughness: type === "eye" ? 0.22 : 0.64,
      clearcoat: type === "eye" ? 0.4 : 0.13,
      pattern: type === "eye" ? 0 : 0.027,
    });
    if (type !== "eye") {
      const compile = material.onBeforeCompile;
      material.onBeforeCompile = (shader) => {
        compile(shader);
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          vec2 crocGrid=vec2(vSkinPosition.z*108.0, atan(vSkinPosition.y,vSkinPosition.x)*18.0);
          crocGrid.x+=mod(floor(crocGrid.y),2.0)*0.5;
          vec2 crocCell=fract(crocGrid);
          float crocEdge=min(min(crocCell.x,1.0-crocCell.x),min(crocCell.y,1.0-crocCell.y));
          float crocFade=1.0-smoothstep(0.4,1.5,fwidth(crocGrid.x)+fwidth(crocGrid.y));
          float crocSeam=(1.0-smoothstep(0.025,0.15,crocEdge))*crocFade;
          float crocTone=fract(sin(dot(floor(crocGrid),vec2(127.1,311.7)))*43758.5453);
          diffuseColor.rgb*=1.0+(crocTone-0.5)*0.21*crocFade-crocSeam*0.16;
          normal=normalize(normal+vec3(dFdx(crocSeam),dFdy(crocSeam),0.0)*0.11);
        `,
        );
      };
      material.customProgramCacheKey = () => "amazon_crocodilian_scales_v3";
    }
    materials.set(type, material);
  }
  mesh.material = materials.get(type);
  return mesh;
}
function ellipsoid(parent, key, color, position, scale, type = "skin") {
  return part(
    parent,
    amazonGeometry(key, () => {
      const g = new THREE.SphereGeometry(1, 14, 10);
      g.scale(...scale);
      return g;
    }),
    color,
    position,
    type,
  );
}
function plate(kind, row, column, width, length, height) {
  return amazonGeometry(`croc_v3_${kind}_scute_${row}_${column}`, () => {
    const points = [
      [-width * 0.72, 0, -length * 0.46],
      [-width, 0, -length * 0.23],
      [-width, 0, length * 0.25],
      [-width * 0.63, 0, length * 0.48],
      [width * 0.63, 0, length * 0.48],
      [width, 0, length * 0.25],
      [width, 0, -length * 0.23],
      [width * 0.72, 0, -length * 0.46],
      [0, height, -length * 0.08],
      [0, -0.003, 0],
    ];
    const indices = [];
    for (let i = 0; i < 8; i++) {
      const n = (i + 1) % 8;
      indices.push(i, n, 8, i, 9, n);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points.flat(), 3),
    );
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  });
}
function taperedTube(key, points, startRadius, endRadius) {
  return amazonGeometry(key, () => {
    const curve = new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      g = new THREE.TubeGeometry(curve, 12, startRadius, 8, false),
      p = g.attributes.position,
      center = new THREE.Vector3(),
      v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / 9) / 12;
      curve.getPointAt(t, center);
      v.fromBufferAttribute(p, i)
        .sub(center)
        .multiplyScalar(THREE.MathUtils.lerp(1, endRadius / startRadius, t))
        .add(center);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
}
function curvedTooth(key, points, radius) {
  return amazonGeometry(key, () => {
    const curve = new THREE.CatmullRomCurve3(
        points.map((p) => new THREE.Vector3(...p)),
      ),
      g = new THREE.TubeGeometry(curve, 6, radius, 6, false),
      p = g.attributes.position,
      center = new THREE.Vector3(),
      v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / 7) / 6;
      curve.getPointAt(t, center);
      v.fromBufferAttribute(p, i)
        .sub(center)
        .multiplyScalar(Math.max(0.015, (1 - t) ** 0.75))
        .add(center);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
}
function footWeb(kind, index, side) {
  return amazonGeometry(`croc_v3_${kind}_web_${index}`, () => {
    const g = new THREE.BufferGeometry(),
      v = [
        [side * 0.02, -0.033, 0.063],
        [side * 0.013, -0.034, 0.09],
        [side * 0.025, -0.034, 0.102],
        [side * 0.039, -0.034, 0.102],
        [side * 0.053, -0.034, 0.09],
        [side * 0.04, -0.033, 0.063],
      ];
    const lower = v.map(([x, y, z]) => [x, y - 0.003, z]);
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([...v, ...lower].flat(), 3),
    );
    const idx = [];
    for (let i = 1; i < 5; i++) idx.push(0, i, i + 1, 6, 6 + i + 1, 6 + i);
    for (let i = 0; i < 6; i++) {
      const n = (i + 1) % 6;
      idx.push(i, 6 + i, n, n, 6 + i, 6 + n);
    }
    if (side < 0)
      for (let i = 0; i < idx.length; i += 3)
        [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
}
