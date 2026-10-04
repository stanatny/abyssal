import * as THREE from "three";
import { bindTentacleMotion } from "./tentacle_motion.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  bindAxialMotion,
  sampleSection,
  sculptedFin,
  skinMaterial,
} from "./creature_surface.js";

/** 亚特兰蒂斯区域七种独有生物，每种独立解剖与动作，非既有鱼换色。 */
export const ATLANTIS_CREATURE_KINDS = new Set([
  "spadefish",
  "seahorse",
  "cuttlefish",
  "blue_shark",
  "swordfish",
  "ichthyosaur",
  "helicoprion",
]);

/**
 * 创建头朝 -Z、尺寸归一且包围盒居中的亚特兰蒂斯生物；海马按直立高度计量。
 * @param {string} kind 已注册的区域物种标识。
 * @param {THREE.Group} root 调用方负责世界缩放与最终合批的空根节点。
 * @param {Function[]} motions 接收游泳相位及推进力度的独立动作列表。
 * @returns {void} 向根节点添加共享资源模型及 normalizedLength 标记。
 */
export function buildAtlantisCreature(kind, root, motions) {
  if (!ATLANTIS_CREATURE_KINDS.has(kind))
    throw new Error(`Unknown atlantis creature: ${kind}`);
  const body = new THREE.Group();
  body.name = `${kind}_atlantis_anatomy`;
  root.add(body);
  if (kind === "spadefish") buildSpadefish(body, motions);
  else if (kind === "seahorse") buildSeahorse(body, motions);
  else if (kind === "cuttlefish") buildCuttlefish(body, motions);
  else buildPredator(kind, body, motions);
  body.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(body);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 1 / (kind === "seahorse" ? size.y : size.z);
  body.scale.setScalar(scale);
  body.position
    .copy(bounds.getCenter(new THREE.Vector3()))
    .multiplyScalar(-scale);
  root.userData.normalizedLength = 1;
  root.userData.atlantisAnatomy = kind;
}

const GEOMETRIES = new Map();
const SURFACE = skinMaterial({
  vertexColors: true,
  roughness: 0.42,
  pattern: 0.055,
});
const FIN = skinMaterial({
  vertexColors: true,
  roughness: 0.5,
  side: THREE.DoubleSide,
  pattern: 0.03,
});
const SEAHORSE_SKIN = skinMaterial({
  vertexColors: true,
  roughness: 0.69,
  clearcoat: 0.03,
  pattern: 0.13,
});
const TEETH = skinMaterial({ color: "#e3dcc4", roughness: 0.38 });
const DARK = skinMaterial({ color: "#10181c", roughness: 0.3, pattern: 0.004 });

/**
 * 沿轮廓放样带三色反荫顶点色的躯干，colorize 回调叠加物种斑纹。
 * @param {number[][]} profile 每行依次为纵向位置、横半径、竖半径和可选竖偏移。
 * @param {object} c back/side/belly 颜色与可选 cut 口腔参数。
 * @param {object} options rings/sides/square/cut/colorize 细节控制。
 * @returns {THREE.BufferGeometry} 带平滑法线与顶点色的躯干几何。
 */
function loft(profile, c, options = {}) {
  const rings = options.rings || 56,
    sides = options.sides || 36,
    positions = [],
    colors = [],
    indices = [];
  const top = new THREE.Color(c.back),
    mid = c.side ? new THREE.Color(c.side) : null,
    bottom = new THREE.Color(c.belly),
    shade = new THREE.Color(),
    inside = new THREE.Color("#352b2e");
  for (let row = 0; row <= rings; row++) {
    const z = THREE.MathUtils.lerp(
        profile[0][0],
        profile.at(-1)[0],
        row / rings,
      ),
      [rx, ry, cy] = sampleSection(profile, z);
    for (let col = 0; col <= sides; col++) {
      const a = (col / sides) * Math.PI * 2,
        s = Math.sin(a),
        cos = Math.cos(a),
        power = THREE.MathUtils.lerp(
          options.square || 1,
          1,
          THREE.MathUtils.smoothstep(z, -0.2, 0.1),
        );
      const x = Math.sign(cos) * Math.abs(cos) ** power * rx;
      let y = cy + Math.sign(s) * Math.abs(s) ** power * ry;
      const opening = options.cut
        ? 1 - THREE.MathUtils.smoothstep(z, c.hinge - 0.015, c.hinge + 0.035)
        : 0;
      if (options.cut)
        y = THREE.MathUtils.lerp(y, Math.max(y, c.roof), opening);
      positions.push(x, y, z);
      if (mid) {
        if (s < -0.5) shade.copy(bottom);
        else {
          shade
            .copy(bottom)
            .lerp(mid, THREE.MathUtils.smoothstep(s, -0.5, -0.08));
          shade.lerp(top, THREE.MathUtils.smoothstep(s, 0.02, 0.55));
        }
      } else {
        shade
          .copy(top)
          .lerp(bottom, 1 - THREE.MathUtils.smoothstep(s, -0.45, 0.08));
      }
      if ((options.jaw && s > 0.45) || (opening > 0.85 && s < -0.4))
        shade.lerp(inside, 0.96);
      shade.multiplyScalar(
        1 + 0.025 * Math.sin(z * 127 + cos * 17) * Math.sin(s * 31 - z * 67),
      );
      if (options.colorize) options.colorize(z, s, cos, shade);
      colors.push(shade.r, shade.g, shade.b);
      if (row < rings && col < sides) {
        const n = row * (sides + 1) + col;
        indices.push(
          n,
          n + 1,
          n + sides + 1,
          n + 1,
          n + sides + 2,
          n + sides + 1,
        );
      }
    }
  }
  for (const end of [0, 1]) {
    const row = end ? rings : 0,
      z = profile[end ? profile.length - 1 : 0][0],
      n = positions.length / 3;
    let y = sampleSection(profile, z)[2];
    if (options.cut && z < c.hinge) y = Math.max(y, c.roof);
    positions.push(0, y, z);
    colors.push(top.r, top.g, top.b);
    for (let col = 0; col < sides; col++) {
      const p = row * (sides + 1) + col;
      indices.push(n, end ? p : p + 1, end ? p + 1 : p);
    }
  }
  return geometry(positions, indices, colors);
}

/**
 * 为带状裙鳍安装沿纵向串联的骨骼，实例各自保存行波姿态。
 * @param {THREE.Mesh} mesh 已烘焙蒙皮属性的裙鳍网格。
 * @param {Function[]} motions 动作回调列表。
 * @param {object} options 骨骼数量、频率、幅度、相位差与摆动轴。
 * @returns {THREE.SkinnedMesh} 替换原网格后的蒙皮裙鳍。
 */
function bindRibbonWave(mesh, motions, options = {}) {
  const {
    count = 6,
    frequency = 1.6,
    amplitude = 0.055,
    lag = 0.85,
    z0 = -0.12,
    z1 = 0.4,
    side = 1,
  } = options;
  const geometry = mesh.geometry,
    bones = [];
  let previous = null;
  for (let i = 0; i < count; i++) {
    const bone = new THREE.Bone();
    if (previous) {
      bone.position.z = (z1 - z0) / (count - 1);
      previous.add(bone);
    } else {
      bone.position.z = z0;
    }
    bones.push(bone);
    previous = bone;
  }
  const skinned = new THREE.SkinnedMesh(geometry, mesh.material);
  skinned.name = mesh.name;
  skinned.userData.keepSeparate = true;
  skinned.add(bones[0]);
  skinned.bind(new THREE.Skeleton(bones));
  geometry.computeBoundingSphere();
  skinned.boundingSphere = geometry.boundingSphere.clone();
  skinned.boundingSphere.radius += amplitude * count * (z1 - z0) * 0.5;
  const parent = mesh.parent;
  parent.remove(mesh);
  parent.add(skinned);
  motions.push((time, effort) => {
    const power = amplitude * (0.65 + Math.min(effort, 3) * 0.25);
    for (let i = 1; i < count; i++) {
      bones[i].rotation.z =
        side * power * Math.sin(time * frequency - i * lag) * (1 + i * 0.12);
      bones[i].rotation.x =
        side * power * 0.35 * Math.sin(time * frequency - i * lag - 0.55);
    }
  });
  return skinned;
}

/** 沿 z 给条带顶点烘焙串联骨骼的帐篷权重，首尾各留刚性过渡。 */
function ribbonSkin(p, count, z0, z1) {
  const indices = [],
    weights = [];
  for (let i = 0; i < p.count; i++) {
    const f = THREE.MathUtils.clamp(
      ((p.getZ(i) - z0) / (z1 - z0)) * (count - 1),
      0,
      count - 1,
    );
    const slots = [0, 0, 0, 0],
      loads = [0, 0, 0, 0];
    let written = 0;
    for (let k = -1; k <= 2 && written < 4; k++) {
      const b = Math.round(f) + k;
      if (b < 0 || b >= count) continue;
      const w = Math.max(0, 1 - Math.abs(f - b));
      if (w <= 0) continue;
      slots[written] = b;
      loads[written] = w;
      written++;
    }
    const total = loads.reduce((sum, w) => sum + w, 0) || 1;
    indices.push(...slots);
    weights.push(...loads.map((w) => w / total));
  }
  return { indices, weights };
}

function eyes(parent, kind, [x, y, z, r], iris, horizontal = false) {
  add(
    parent,
    `${kind}_eyes`,
    () =>
      merge(
        [-1, 1].map((side) =>
          paint(blob([side * x, y, z], [r * 0.55, r, r * 1.12]), iris),
        ),
      ),
    SURFACE,
  );
  add(
    parent,
    `${kind}_pupils`,
    () =>
      merge(
        [-1, 1].map((side) => {
          if (kind === "cuttlefish") {
            const points = [
              [-0.8, 0.12],
              [-0.44, -0.24],
              [0, 0.1],
              [0.44, -0.24],
              [0.8, 0.12],
            ].map(([f, h]) => [
              side * (x + r * 0.55 * Math.sqrt(1 - f * f * 0.7)),
              y + r * h,
              z + r * f,
            ]);
            return tube(points, r * 0.11, 20, 6);
          }
          return blob(
            [side * (x + r * 0.46), y, z - 0.001],
            [
              r * 0.17,
              r * (horizontal ? 0.23 : 0.7),
              r * (horizontal ? 0.92 : 0.7),
            ],
          );
        }),
      ),
    DARK,
  );
}

function tooth(size, up, broad) {
  const g = new THREE.ConeGeometry(
    size * (broad ? 0.44 : 0.13),
    size,
    broad ? 4 : 6,
    1,
  );
  g.translate(0, size * 0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setXYZ(
      i,
      p.getX(i) * (broad ? 1.15 : 1),
      y * (up ? 1 : -1),
      p.getZ(i) * (broad ? 0.3 : 1) + ((y * y) / size) * 0.13,
    );
  }
  g.computeVertexNormals();
  return g;
}

function geometry(positions, indices, colors) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  if (colors)
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function paint(g, top, bottom = top) {
  const a = new THREE.Color(top),
    b = new THREE.Color(bottom),
    c = new THREE.Color(),
    colors = [],
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    c.copy(a).lerp(b, p.getY(i) < 0 ? 0.65 : 0);
    colors.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  return g;
}

function add(parent, key, make, material) {
  if (!GEOMETRIES.has(key)) GEOMETRIES.set(key, make());
  const mesh = new THREE.Mesh(GEOMETRIES.get(key), material);
  mesh.name = key;
  parent.add(mesh);
  return mesh;
}

function merge(parts) {
  const ready = parts.map((part) => {
    const g = part.index ? part.toNonIndexed() : part.clone();
    g.deleteAttribute("uv");
    part.dispose();
    return g;
  });
  const merged = mergeGeometries(ready);
  ready.forEach((g) => g.dispose());
  return merged;
}

function blob(position, scale) {
  const g = new THREE.SphereGeometry(1, 12, 8);
  g.scale(...scale);
  g.translate(...position);
  return g;
}

function tube(points, radius, segments = 14, sides = 5) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    segments,
    radius,
    sides,
    false,
  );
}

function reverse(g) {
  const index = g.index;
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i);
    index.setX(i, index.getX(i + 2));
    index.setX(i + 2, a);
  }
  g.computeVertexNormals();
  return g;
}

function mirror(g) {
  g.scale(-1, 1, 1);
  return reverse(g);
}

/** 大西洋白鲳：高侧扁圆盘身、五条黑竖纹、背臀鳍前缘长鳍条，群游廉价预算。 */
function buildSpadefish(body, motions) {
  const kind = "spadefish",
    c = {
      back: "#8f9aa0",
      belly: "#e8ece9",
      fin: "#5c666c",
      profile: [
        [-0.47, 0.01, 0.014, 0.004],
        [-0.451, 0.028, 0.059, 0.006],
        [-0.401, 0.042, 0.135, 0.004],
        [-0.28, 0.055, 0.2, 0],
        [-0.14, 0.066, 0.263, -0.005],
        [0.0, 0.068, 0.285, -0.007],
        [0.14, 0.06, 0.26, -0.005],
        [0.27, 0.04, 0.185, 0],
        [0.36, 0.018, 0.095, 0],
        [0.4, 0.011, 0.045, 0],
      ],
    };
  // 成鱼银灰体侧五条黑竖带，第一条穿过眼睛，带缘做柔和过渡。
  const bars = [
    [-0.425, -0.385],
    [-0.27, -0.215],
    [-0.11, -0.05],
    [0.05, 0.11],
    [0.2, 0.25],
  ];
  const dark = new THREE.Color("#15181b");
  const torso = add(
    body,
    `${kind}_torso`,
    () =>
      loft(c.profile, c, {
        rings: 40,
        sides: 16,
        colorize: (z, s, cos, shade) => {
          let band = 0;
          for (const [z0, z1] of bars) {
            const inside =
              THREE.MathUtils.smoothstep(z, z0 - 0.008, z0 + 0.008) *
              (1 - THREE.MathUtils.smoothstep(z, z1 - 0.008, z1 + 0.008));
            band = Math.max(band, inside);
          }
          shade.lerp(dark, band * 0.88);
        },
      }),
    SURFACE,
  );
  const swimming = bindAxialMotion(torso, motions, {
    axis: "y",
    frequency: 1.2,
    amplitude: 0.045,
  });
  swimming.name = `${kind}_continuous_body`;
  eyes(body, kind, [0.048, 0.03, -0.405, 0.016], "#2b2f26");
  add(
    body,
    `${kind}_lips`,
    () =>
      paint(
        tube(
          [
            [0, 0.002, -0.469],
            [0, 0.006, -0.472],
          ],
          0.006,
          4,
          6,
        ),
        "#4a5257",
      ),
    SURFACE,
  );
  // 棘背鳍低矮分离，软背鳍与臀鳍前缘鳍条显著伸长构成铁锹轮廓；
  // 鳍基贴合体缘曲线，只有伸出轮廓的部分参与剪影。
  add(
    body,
    `${kind}_median_fins`,
    () => {
      const parts = [
        paint(
          sculptedFin(
            [
              [-0.2, 0.235],
              [-0.12, 0.296],
              [-0.04, 0.3],
              [-0.06, 0.24],
            ],
            0.006,
            "vertical",
            { detail: 0 },
          ),
          c.fin,
        ),
        paint(
          sculptedFin(
            [
              [-0.03, 0.26],
              [0.02, 0.35],
              [0.06, 0.385],
              [0.1, 0.315],
              [0.18, 0.265],
              [0.25, 0.215],
              [0.22, 0.195],
              [0.12, 0.235],
              [0.02, 0.255],
            ],
            0.007,
            "vertical",
            { detail: 1 },
          ),
          c.fin,
        ),
        paint(
          sculptedFin(
            [
              [-0.02, -0.26],
              [0.02, -0.345],
              [0.06, -0.375],
              [0.1, -0.31],
              [0.18, -0.26],
              [0.25, -0.21],
              [0.22, -0.19],
              [0.12, -0.23],
              [0.02, -0.25],
            ],
            0.007,
            "vertical",
            { detail: 1 },
          ),
          c.fin,
        ),
      ];
      for (const side of [-1, 1]) {
        const pelvic = paint(
          sculptedFin(
            [
              [-0.31, -0.16],
              [-0.28, -0.296],
              [-0.235, -0.315],
              [-0.18, -0.17],
            ],
            0.005,
            "vertical",
            { detail: 0 },
          ),
          c.fin,
        );
        pelvic.translate(side * 0.017, 0, 0);
        parts.push(pelvic);
      }
      return merge(parts);
    },
    FIN,
  );
  const tail = new THREE.Group();
  tail.name = `${kind}_tail`;
  swimming.skeleton.bones[2].add(tail);
  tail.position.set(0, 0, 0.135);
  add(
    tail,
    `${kind}_caudal`,
    () =>
      paint(
        sculptedFin(
          [
            [-0.015, 0.052],
            [0.04, 0.115],
            [0.085, 0.128],
            [0.07, 0.07],
            [0.045, 0.012],
            [0.07, -0.058],
            [0.085, -0.118],
            [0.04, -0.11],
            [-0.015, -0.05],
          ],
          0.008,
          "vertical",
          { detail: 1 },
        ),
        c.fin,
      ),
    FIN,
  );
  motions.push((t, e) => {
    tail.rotation.y = Math.sin(t * 1.2 - 1.35) * (0.1 + Math.min(e, 3) * 0.02);
  });
  // 白鲳以胸鳍划水辅助推进，群游时双鳍交替扇动。
  for (const side of [-1, 1]) {
    const joint = new THREE.Group();
    joint.name = `${kind}_pectoral_${side}`;
    joint.position.set(side * 0.045, -0.02, -0.175);
    body.add(joint);
    add(
      joint,
      `${kind}_pectoral_mesh_${side}`,
      () => {
        const g = paint(
          sculptedFin(
            [
              [-0.03, -0.012],
              [-0.024, 0.04],
              [0.024, 0.1],
              [0.064, 0.115],
              [0.058, 0.052],
              [0.024, 0.0],
            ],
            0.005,
            "horizontal",
            { detail: 1 },
          ),
          c.fin,
          c.belly,
        );
        return side < 0 ? mirror(g) : g;
      },
      FIN,
    );
    motions.push((t, e) => {
      joint.rotation.z =
        side *
        (-0.35 +
          Math.sin(t * 2.4 + (side < 0 ? Math.PI : 0)) *
            (0.22 + Math.min(e, 3) * 0.03));
      joint.rotation.y = side * Math.cos(t * 2.4) * 0.06;
    });
  }
}

/** 短吻海马：短管吻、弯颈、骨环躯干与内收卷尾，背鳍高频扇动推进。 */
function buildSeahorse(body, motions) {
  const kind = "seahorse";
  // 脊柱中心线自吻端至卷尾尖，整体位于正中矢状面内。
  const sections = [
    // 短吻不足头长三分之一；从额头经后颈折入丰满的躯干。
    [0.291, -0.247, 0.01],
    [0.287, -0.226, 0.012],
    [0.301, -0.204, 0.018],
    [0.337, -0.17, 0.04],
    [0.329, -0.126, 0.033],
    [0.298, -0.094, 0.027],
    [0.257, -0.086, 0.025],
    [0.194, -0.107, 0.041],
    [0.119, -0.126, 0.066],
    [0.04, -0.107, 0.075],
    [-0.045, -0.069, 0.057],
    [-0.119, -0.043, 0.035],
    [-0.186, -0.028, 0.023],
    [-0.252, -0.043, 0.019],
    [-0.295, -0.092, 0.015],
    [-0.284, -0.153, 0.012],
    [-0.236, -0.181, 0.0095],
    [-0.197, -0.151, 0.0075],
    [-0.205, -0.116, 0.0058],
    [-0.235, -0.109, 0.004],
    [-0.25, -0.134, 0.0018],
  ];
  const spine = new THREE.CatmullRomCurve3(
    sections.map(([y, z]) => new THREE.Vector3(0, y, z)),
  );
  const radius = sections.map((section, i) => [
    i / (sections.length - 1),
    section[2],
  ]);
  const posture = new THREE.Group();
  posture.name = `${kind}_posture`;
  body.add(posture);
  const back = new THREE.Color("#68513b"),
    belly = new THREE.Color("#b69b70"),
    band = new THREE.Color("#47382c"),
    shade = new THREE.Color();
  // 骨板躯干沿脊柱放样，环状骨脊与腹侧浅色由顶点色一次成型。
  const trunkGeometry = (t0, t1, key, caps = { start: true, end: true }) => {
    const segments = Math.ceil((t1 - t0) * 240),
      sides = 24,
      positions = [],
      colors = [],
      indices = [];
    const binormal = new THREE.Vector3(1, 0, 0),
      center = new THREE.Vector3(),
      tangent = new THREE.Vector3(),
      normal = new THREE.Vector3();
    for (let row = 0; row <= segments; row++) {
      const t = THREE.MathUtils.lerp(t0, t1, row / segments);
      spine.getPoint(t, center);
      spine.getTangent(t, tangent);
      normal.crossVectors(binormal, tangent).normalize();
      const [r] = sampleSection(radius, t),
        // 躯干至尾部骨环起伏，吻部保持光滑细管。
        ridge =
          1 +
          0.018 *
            Math.cos(t * 80 * Math.PI) *
            THREE.MathUtils.smoothstep(t, 0.28, 0.36) *
            (1 - THREE.MathUtils.smoothstep(t, 0.9, 1));
      for (let col = 0; col <= sides; col++) {
        const a = (col / sides) * Math.PI * 2,
          s = Math.sin(a),
          cos = Math.cos(a);
        // 侧扁的骨板截面：纵棱维持棱角，横向骨环只作轻微起伏。
        const armored = THREE.MathUtils.smoothstep(t, 0.24, 0.34),
          plate = 1 + armored * 0.035 * Math.cos(a * 6),
          lateral = THREE.MathUtils.lerp(0.82, 0.64, armored),
          sy = Math.sign(s) * Math.abs(s) ** (1 - armored * 0.16);
        positions.push(
          center.x + cos * r * lateral * ridge * plate,
          center.y + normal.y * sy * r * 1.08 * ridge * plate,
          center.z + normal.z * sy * r * 1.08 * ridge * plate,
        );
        const facing = normal.z * s;
        shade
          .copy(back)
          .lerp(belly, 1 - THREE.MathUtils.smoothstep(facing, -0.55, 0.15));
        const ringBand = 0.5 + 0.5 * Math.cos(t * 80 * Math.PI + 1.1);
        shade.lerp(band, ringBand ** 8 * 0.23 * armored);
        // 斑驳与浅色骨结分布在甲片交界，腹部保留较柔和的底色。
        const fleck =
          Math.sin(t * 307 + Math.sin(a * 11)) * Math.sin(a * 23 + t * 191);
        shade.multiplyScalar(1 + fleck * 0.13);
        const node =
          Math.max(0, Math.cos(a * 6)) ** 12 * ringBand ** 6 * armored;
        shade.lerp(belly, node * 0.72);
        colors.push(shade.r, shade.g, shade.b);
        if (row < segments && col < sides) {
          const n = row * (sides + 1) + col;
          indices.push(
            n,
            n + 1,
            n + sides + 1,
            n + 1,
            n + sides + 2,
            n + sides + 1,
          );
        }
      }
    }
    for (const end of [0, 1]) {
      if (end && !caps.end) continue;
      if (!end && !caps.start) continue;
      const t = end ? t1 : t0,
        n = positions.length / 3;
      spine.getPoint(t, center);
      positions.push(center.x, center.y, center.z);
      colors.push(back.r, back.g, back.b);
      const base = (end ? segments : 0) * (sides + 1);
      for (let col = 0; col < sides; col++)
        indices.push(
          n,
          end ? base + col : base + col + 1,
          end ? base + col + 1 : base + col,
        );
    }
    const g = reverse(geometry(positions, indices, colors));
    // 分段连接圈使用同一个解析径向法线，消除闭合几何上的光照接缝。
    if (t0 === 0.6 || t1 === 0.6) {
      const row = t0 === 0.6 ? 0 : segments;
      normal.crossVectors(binormal, spine.getTangent(0.6)).normalize();
      const normals = g.attributes.normal;
      for (let col = 0; col <= sides; col++) {
        const a = (col / sides) * Math.PI * 2;
        const n = new THREE.Vector3(
          Math.cos(a) / 0.64,
          (normal.y * Math.sin(a)) / 1.08,
          (normal.z * Math.sin(a)) / 1.08,
        ).normalize();
        normals.setXYZ(row * (sides + 1) + col, n.x, n.y, n.z);
      }
    }
    g.name = key;
    return g;
  };
  add(
    posture,
    `${kind}_trunk`,
    () => {
      const parts = [
        trunkGeometry(0, 0.6, "trunk", { start: true, end: false }),
      ];
      // 骨甲由纵向棱线与细小结节交错组成，不把整圈腹部吹胀成手风琴。
      for (const side of [-1, 1]) {
        for (const face of [-1, 1]) {
          const ridgePoints = [];
          for (let row = 0; row <= 14; row++) {
            const t = 0.285 + row * 0.02,
              center = spine.getPoint(t),
              normal = new THREE.Vector3()
                .crossVectors(new THREE.Vector3(1, 0, 0), spine.getTangent(t))
                .normalize(),
              [r] = sampleSection(radius, t);
            const at = [
              side * r * 0.49,
              center.y + normal.y * face * r * 0.79,
              center.z + normal.z * face * r * 0.79,
            ];
            ridgePoints.push(at);
            const node = new THREE.IcosahedronGeometry(r * 0.072, 0);
            node.scale(0.7, 0.8, 1.25);
            node.translate(...at);
            parts.push(paint(node, "#ad926b", "#9e845f"));
          }
          parts.push(paint(tube(ridgePoints, 0.0011, 42, 4), "#a18a66"));
        }
      }
      // 短吻海马无长颈鬃；保留低冠及双眼上方的骨棘。
      const crown = sculptedFin(
        [
          [-0.167, 0.365],
          [-0.159, 0.387],
          [-0.151, 0.394],
          [-0.141, 0.381],
          [-0.126, 0.392],
          [-0.118, 0.376],
          [-0.1, 0.362],
          [-0.121, 0.35],
        ],
        0.026,
        "vertical",
        { detail: 1, smooth: false },
      );
      parts.push(paint(crown, "#735d43", "#9a825e"));
      for (const side of [-1, 1]) {
        const brow = tooth(0.014, true, true);
        brow.translate(side * 0.027, 0.349, -0.181);
        parts.push(paint(brow, "#ad936c"));
        // 颊部鳃盖与下颌构成独立头部平面，避免头像细管端头。
        parts.push(
          paint(
            blob([side * 0.02, 0.317, -0.158], [0.01, 0.021, 0.026]),
            "#967b56",
            "#b49b75",
          ),
        );
      }
      parts.push(
        paint(blob([0, 0.292, -0.248], [0.006, 0.006, 0.0015]), "#30251c"),
      );
      return merge(parts);
    },
    SEAHORSE_SKIN,
  );
  // 卷尾根部固定，连续权重仅弯曲远端；连接圈不会被刚性关节掰开。
  const tailJoint = new THREE.Group();
  tailJoint.name = `${kind}_tail`;
  const tailBase = spine.getPoint(0.6);
  tailJoint.position.copy(tailBase);
  posture.add(tailJoint);
  const tail = add(
    tailJoint,
    `${kind}_tail_mesh`,
    () => {
      const g = trunkGeometry(0.6, 1, "tail", {
        start: false,
        end: true,
      }).translate(-tailBase.x, -tailBase.y, -tailBase.z);
      const joints = [],
        weights = [],
        p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        // 以环序而非回卷后的坐标取权重，确保尾尖回到躯干前方时仍正确变形。
        const t = Math.min(1, Math.floor(i / 25) / 96);
        const w = THREE.MathUtils.smoothstep(t, 0.12, 0.75);
        joints.push(0, 1, 0, 0);
        weights.push(1 - w, w, 0, 0);
      }
      g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(joints, 4));
      g.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(weights, 4),
      );
      return g;
    },
    SEAHORSE_SKIN,
  );
  const curled = new THREE.SkinnedMesh(tail.geometry, tail.material);
  curled.name = tail.name;
  curled.userData.keepSeparate = true;
  const anchor = new THREE.Bone(),
    grip = new THREE.Bone();
  anchor.add(grip);
  curled.add(anchor);
  curled.bind(new THREE.Skeleton([anchor, grip]));
  tailJoint.remove(tail);
  tailJoint.add(curled);
  motions.push((t, e) => {
    grip.rotation.x =
      Math.sin(t * 0.9 - 0.7) * (0.025 + Math.min(e, 3) * 0.004);
  });
  // 眼睛直接按脊柱头段中心与局部半径外贴，避免埋进头颅。
  eyes(posture, kind, [0.032, 0.335, -0.184, 0.012], "#a99054");
  // 背鳍单枚扇形，以远高于身体摇摆的频率扇动推进；胸鳍耳状辅助转向。
  const dorsal = new THREE.Group();
  dorsal.name = `${kind}_dorsal_fin`;
  const dorsalAt = spine.getPoint(0.48),
    dorsalOut = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(1, 0, 0), spine.getTangent(0.48))
      .normalize();
  dorsal.position.set(
    dorsalAt.x,
    dorsalAt.y + dorsalOut.y * -0.057,
    dorsalAt.z + dorsalOut.z * -0.057,
  );
  posture.add(dorsal);
  add(
    dorsal,
    `${kind}_dorsal_mesh`,
    () => {
      const outline = [
        [-0.008, -0.047],
        [0.029, -0.036],
        [0.049, -0.012],
        [0.047, 0.025],
        [0.025, 0.048],
        [-0.009, 0.038],
      ];
      const membrane = paint(
        sculptedFin(outline, 0.002, "vertical", { detail: 2, camber: 0.0002 }),
        "#b29b61",
        "#d0bb87",
      );
      const parts = [membrane];
      // 鳍条从长条鳍基向后缘展开；与薄膜合批，保持细薄扇鳍而非实心叶片。
      for (let i = 0; i < 16; i++) {
        const u = i / 15,
          y = -0.036 + u * 0.074;
        const z = 0.027 + Math.sin(u * Math.PI) * 0.019;
        for (const side of [-1, 1])
          parts.push(
            paint(
              tube(
                [
                  [side * 0.001, y * 0.88, -0.006],
                  [side * 0.0017, y, z * 0.52],
                  [side * 0.0014, y, z],
                ],
                0.00055,
                6,
                4,
              ),
              "#7f744b",
            ),
          );
      }
      return merge(parts);
    },
    FIN,
  );
  motions.push((t, e) => {
    const flutter = 0.42 * (0.45 + Math.min(e, 3) * 0.22);
    dorsal.rotation.x = Math.sin(t * 6.2) * flutter;
    dorsal.rotation.y = Math.cos(t * 6.2) * flutter * 0.3;
  });
  for (const side of [-1, 1]) {
    const fin = new THREE.Group();
    fin.name = `${kind}_pectoral_${side}`;
    fin.position.set(side * 0.031, 0.307, -0.132);
    fin.scale.setScalar(0.62);
    posture.add(fin);
    add(
      fin,
      `${kind}_pectoral_mesh_${side}`,
      () => {
        const g = paint(
          sculptedFin(
            [
              [-0.006, 0],
              [0.008, 0.012],
              [0.026, 0.026],
              [0.034, 0.02],
              [0.02, 0.004],
              [0.004, -0.004],
            ],
            0.0035,
            "horizontal",
            { detail: 1 },
          ),
          "#caa964",
          "#c5a971",
        );
        return side < 0 ? mirror(g) : g;
      },
      FIN,
    );
    motions.push((t, e) => {
      fin.rotation.y =
        side * Math.sin(t * 6.2 - 0.9) * 0.5 * (0.4 + Math.min(e, 3) * 0.2);
    });
  }
  // 慢游散居姿态：整体轻摇与浮沉由内部姿态组承担，根节点不动。
  motions.push((t, e) => {
    posture.rotation.z = Math.sin(t * 0.9) * 0.028;
    posture.rotation.x = Math.sin(t * 0.45 + 0.6) * 0.018;
    posture.position.y =
      Math.sin(t * 1.7) * 0.006 * (0.6 + Math.min(e, 3) * 0.15);
  });
}

/** 普通乌贼：扁椭圆外套膜配全长波浪裙鳍，8 短腕与 2 触腕收束头前。 */
function buildCuttlefish(body, motions) {
  const kind = "cuttlefish",
    c = {
      back: "#6d5138",
      belly: "#cbb894",
      profile: [
        [-0.305, 0.038, 0.036, -0.002],
        [-0.28, 0.062, 0.052, 0],
        [-0.22, 0.095, 0.066, 0.002],
        [-0.12, 0.132, 0.078, 0.004],
        [0.0, 0.152, 0.084, 0.006],
        [0.12, 0.148, 0.082, 0.006],
        [0.24, 0.122, 0.068, 0.004],
        [0.34, 0.078, 0.046, 0.002],
        [0.42, 0.02, 0.014, 0],
        [0.455, 0.004, 0.006, 0],
      ],
    };
  // 成体背侧不规则斑马带随外套膜横向延展，腹面保持浅沙色。
  const bands = [
    [-0.06, -0.01],
    [0.08, 0.13],
    [0.2, 0.25],
    [0.31, 0.36],
  ];
  const bandColor = new THREE.Color("#332416");
  const mantle = add(
    body,
    `${kind}_mantle`,
    () =>
      loft(c.profile, c, {
        rings: 52,
        sides: 36,
        colorize: (z, s, cos, shade) => {
          if (s < 0.15) return;
          let band = 0;
          for (const [z0, z1] of bands) {
            const wobble = Math.sin(cos * 5.1 + z * 19) * 0.025;
            const inside =
              THREE.MathUtils.smoothstep(
                z,
                z0 + wobble - 0.01,
                z0 + wobble + 0.01,
              ) *
              (1 -
                THREE.MathUtils.smoothstep(
                  z,
                  z1 + wobble - 0.01,
                  z1 + wobble + 0.01,
                ));
            band = Math.max(band, inside);
          }
          shade.lerp(
            bandColor,
            band * 0.62 * THREE.MathUtils.smoothstep(s, 0.15, 0.6),
          );
          const marble =
            Math.sin(z * 173 + Math.sin(cos * 39)) *
            Math.sin(cos * 63 + z * 91);
          shade.multiplyScalar(
            1 + marble * 0.22 * THREE.MathUtils.smoothstep(s, 0.15, 0.6),
          );
        },
      }),
    SURFACE,
  );
  eyes(body, kind, [0.088, 0.015, -0.24, 0.026], "#7a5c30", true);
  // 漏斗管位于头腹面，是喷射推进的出口，静止时朝向前下方。
  add(
    body,
    `${kind}_siphon`,
    () =>
      paint(
        tube(
          [
            [0, -0.028, -0.23],
            [0, -0.052, -0.262],
            [0, -0.06, -0.298],
          ],
          0.009,
          10,
          6,
        ),
        "#b39b72",
        "#cbb894",
      ),
    SURFACE,
  );
  // 裙鳍沿外套膜两侧全长展开，行波自前向后传递，是乌贼属的巡游标志。
  for (const side of [-1, 1]) {
    const strip = add(
      body,
      `${kind}_skirt_${side}`,
      () => {
        const rows = 46,
          cols = 6,
          z0 = -0.19,
          z1 = 0.38,
          positions = [],
          colors = [],
          indices = [];
        const base = new THREE.Color("#7a5a3c"),
          rim = new THREE.Color("#c9b58c"),
          margin = new THREE.Color("#4a3826"),
          fc = new THREE.Color();
        for (let row = 0; row <= rows; row++) {
          const z = THREE.MathUtils.lerp(z0, z1, row / rows),
            [rx, ry, cy] = sampleSection(c.profile, z),
            u = (z - z0) / (z1 - z0),
            w =
              0.072 *
              (0.9 + 0.25 * Math.sin(u * Math.PI)) *
              THREE.MathUtils.smoothstep(u, 0, 0.12) *
              (1 - THREE.MathUtils.smoothstep(u, 0.82, 1));
          for (let col = 0; col <= cols; col++) {
            const v = col / cols;
            // 裙鳍贴体侧中线展开，根部深插体内、外缘微垂形成受光弧面。
            positions.push(
              side * (rx * 0.88 + v * w),
              cy + ry * 0.04 + Math.sin(v * Math.PI) * 0.008 - v * v * 0.018,
              z,
            );
            fc.copy(base);
            if (v > 0.86)
              fc.lerp(rim, THREE.MathUtils.smoothstep(v, 0.86, 0.95));
            else if (v > 0.72)
              fc.lerp(margin, THREE.MathUtils.smoothstep(v, 0.72, 0.86));
            fc.multiplyScalar(1 + Math.sin(z * 90 + v * 6) * 0.03);
            colors.push(fc.r, fc.g, fc.b);
            if (row < rows && col < cols) {
              const n = row * (cols + 1) + col;
              indices.push(
                n,
                n + 1,
                n + cols + 1,
                n + 1,
                n + cols + 2,
                n + cols + 1,
              );
            }
          }
        }
        const upper = geometry(positions, indices, colors),
          lower = upper.clone();
        lower.translate(0, -0.0016, 0);
        reverse(lower);
        const merged = merge([upper, lower]),
          skin = ribbonSkin(merged.attributes.position, 6, z0, z1);
        merged.setAttribute(
          "skinIndex",
          new THREE.Uint16BufferAttribute(skin.indices, 4),
        );
        merged.setAttribute(
          "skinWeight",
          new THREE.Float32BufferAttribute(skin.weights, 4),
        );
        return merged;
      },
      FIN,
    );
    strip.name = `${kind}_skirt_${side}`;
    bindRibbonWave(strip, motions, {
      count: 6,
      frequency: 1.7,
      amplitude: 0.045,
      lag: 0.85,
      z0: -0.19,
      z1: 0.38,
      side,
    });
  }
  // 八条短腕环绕头前，另两条触腕半收于腕间，捕食时才弹出。
  const arms = [];
  for (let i = 0; i < 10; i++) {
    const tentacle = i >= 8,
      a = tentacle
        ? -Math.PI / 2 + (i === 8 ? -0.55 : 0.55)
        : (i / 8) * Math.PI * 2 + Math.PI / 8,
      base = new THREE.Vector3(
        Math.cos(a) * (tentacle ? 0.024 : 0.03),
        Math.sin(a) * (tentacle ? 0.016 : 0.022) - 0.008,
        -0.29,
      ),
      reach = tentacle ? 0.09 : 0.135,
      lift = tentacle ? 0.012 : 0;
    const group = new THREE.Group();
    group.name = tentacle
      ? `${kind}_tentacle_${i - 7}`
      : `${kind}_arm_${i + 1}`;
    group.position.copy(base);
    body.add(group);
    add(
      group,
      tentacle ? `${kind}_tentacle_mesh_${i - 7}` : `${kind}_arm_mesh_${i}`,
      () => {
        const curve = new THREE.CatmullRomCurve3(
          [
            [0, 0, 0],
            [
              Math.cos(a) * 0.018,
              Math.sin(a) * 0.011 + lift * 0.3 - 0.006,
              -reach * 0.36,
            ],
            [
              Math.cos(a) * 0.042,
              Math.sin(a) * 0.02 - 0.018 + lift * 0.7,
              -reach * 0.7,
            ],
            [Math.cos(a) * 0.037, Math.sin(a) * 0.017 - 0.024 + lift, -reach],
          ].map((p) => new THREE.Vector3(...p)),
        );
        const segments = 30,
          sides = 8,
          g = new THREE.TubeGeometry(curve, segments, 1, sides, false),
          p = g.attributes.position,
          colors = [];
        const rust = new THREE.Color("#8a6a4a"),
          pale = new THREE.Color("#cbb894"),
          shade = new THREE.Color();
        for (let ring = 0; ring <= segments; ring++) {
          const t = ring / segments,
            center = curve.getPointAt(t),
            r = (tentacle ? 0.0105 : 0.0108) * (1 - t * 0.85) ** 1.1 + 0.0012;
          for (let side = 0; side <= sides; side++) {
            const n = ring * (sides + 1) + side,
              direction = new THREE.Vector3()
                .fromBufferAttribute(p, n)
                .sub(center);
            p.setXYZ(
              n,
              center.x + direction.x * r,
              center.y + direction.y * r,
              center.z + direction.z * r,
            );
            shade
              .copy(rust)
              .lerp(
                pale,
                THREE.MathUtils.smoothstep(-direction.y, 0, 0.7) * 0.6,
              )
              .multiplyScalar(1 + Math.sin(t * 90 + side * 2.7) * 0.05);
            colors.push(shade.r, shade.g, shade.b);
          }
        }
        g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        g.computeVertexNormals();
        const parts = [g];
        if (tentacle) {
          // 触腕末端勺状腕穗带小型吸盘，是收拢状态仍可见的捕食器官。
          const tip = curve.getPointAt(1),
            club = paint(
              blob([0, 0, 0], [0.0075, 0.0045, 0.021]),
              "#96714b",
              "#d6c39c",
            );
          club.translate(tip.x, tip.y, tip.z - 0.014);
          parts.push(club);
          for (let row = 0; row < 2; row++)
            for (let cup = 0; cup < 4; cup++) {
              const sucker = paint(
                new THREE.TorusGeometry(0.0022, 0.0009, 4, 7),
                "#e2d3b0",
              );
              sucker.translate(
                tip.x + (row ? 0.0034 : -0.0034),
                tip.y - 0.0038,
                tip.z - 0.004 - cup * 0.0055,
              );
              parts.push(sucker);
            }
        }
        return merge(parts);
      },
      SURFACE,
    );
    const curve = new THREE.CatmullRomCurve3(
      [
        [0, 0, 0],
        [
          Math.cos(a) * 0.018,
          Math.sin(a) * 0.011 + lift * 0.3 - 0.006,
          -reach * 0.36,
        ],
        [
          Math.cos(a) * 0.042,
          Math.sin(a) * 0.02 - 0.018 + lift * 0.7,
          -reach * 0.7,
        ],
        [Math.cos(a) * 0.037, Math.sin(a) * 0.017 - 0.024 + lift, -reach],
      ].map((p) => new THREE.Vector3(...p)),
    );
    bindTentacleMotion(group, `${kind}_soft_arm_${i}`, curve, motions, {
      count: 6,
      phase: a,
      amplitude: tentacle ? 0.12 : 0.18,
    });
    arms.push({ group, a, tentacle });
  }
  motions.push((time, effort) => {
    const gather = THREE.MathUtils.smoothstep(effort, 1.2, 2.6);
    for (const { group, a, tentacle } of arms) {
      const spread = tentacle ? 0.04 : 0.08,
        sway = (1 - gather * 0.75) * 0.045,
        // 背侧腕额外下垂，静止时腕群收成头前下方的一束。
        droop =
          (tentacle ? 0.02 : 0.05 + 0.03 * Math.max(0, Math.sin(a))) *
          (1 - gather);
      group.rotation.x =
        THREE.MathUtils.lerp(
          Math.sin(a) * spread,
          -Math.sin(a) * 0.05,
          gather,
        ) +
        Math.sin(time * 0.8 + a) * sway * (tentacle ? 0.4 : 1) -
        droop;
      group.rotation.y =
        THREE.MathUtils.lerp(
          -Math.cos(a) * spread,
          Math.cos(a) * 0.05,
          gather,
        ) +
        Math.cos(time * 0.7 + a) * sway * (tentacle ? 0.4 : 1);
    }
    // 高推进力度下外套膜节律收缩，裙鳍波动之外的短促喷射。
    const pulse = gather * Math.max(0, Math.sin(time * 2.2));
    mantle.scale.set(1 - 0.035 * pulse, 1 - 0.05 * pulse, 1 + 0.018 * pulse);
  });
}

/** 四种掠食者的共享配置：同一体架构下保持各自独立比例与鳍式。 */
const PREDATORS = {
  blue_shark: {
    back: "#16336b",
    side: "#2e6ab5",
    belly: "#eef2ee",
    fin: "#1d3f7a",
    iris: "#253341",
    roof: -0.032,
    hinge: -0.305,
    front: -0.4,
    gap: 0.002,
    jawRy: 0.011,
    freq: 0.8,
    amp: 0.055,
    eye: [0.062, 0.02, -0.355, 0.0125],
    teeth: { count: 9, size: 0.004 },
    profile: [
      [-0.5, 0.005, 0.007, -0.002],
      [-0.465, 0.016, 0.02, 0],
      [-0.41, 0.03, 0.037, 0.003],
      [-0.33, 0.047, 0.056, 0.005],
      [-0.22, 0.062, 0.072, 0.004],
      [-0.08, 0.072, 0.08, 0],
      [0.08, 0.064, 0.07, -0.002],
      [0.22, 0.044, 0.05, -0.004],
      [0.33, 0.02, 0.027, -0.003],
      [0.39, 0.011, 0.017, -0.002],
      [0.42, 0.007, 0.012, -0.002],
    ],
  },
  swordfish: {
    back: "#2d4258",
    side: "#54687e",
    belly: "#cfd6d0",
    fin: "#2c3a48",
    iris: "#3a3f46",
    roof: -0.024,
    hinge: -0.255,
    front: -0.345,
    gap: 0.001,
    jawRy: 0.008,
    jawBase: -0.002,
    freq: 1.1,
    amp: 0.03,
    eye: [0.057, 0.008, -0.247, 0.017],
    teeth: null,
    profile: [
      [-0.38, 0.017, 0.012, -0.008],
      [-0.33, 0.033, 0.031, -0.002],
      [-0.26, 0.055, 0.051, 0.002],
      [-0.15, 0.077, 0.073, 0.003],
      [-0.02, 0.081, 0.08, 0],
      [0.13, 0.069, 0.071, -0.002],
      [0.25, 0.047, 0.05, -0.002],
      [0.34, 0.027, 0.029, 0],
      [0.4, 0.014, 0.016, 0],
      [0.43, 0.01, 0.013, 0],
    ],
  },
  ichthyosaur: {
    back: "#3c4a55",
    side: "#5c6f7a",
    belly: "#ccd2c8",
    fin: "#44525c",
    iris: "#4a4436",
    roof: -0.03,
    hinge: -0.27,
    front: -0.525,
    gap: 0.014,
    jawRy: 0.013,
    freq: 0.72,
    amp: 0.05,
    eye: [0.066, 0.022, -0.235, 0.03],
    teeth: { count: 13, size: 0.0105, splay: 0.16 },
    profile: [
      [-0.54, 0.008, 0.01, 0],
      [-0.48, 0.022, 0.026, 0.001],
      [-0.4, 0.038, 0.044, 0.002],
      [-0.3, 0.055, 0.064, 0.003],
      [-0.21, 0.072, 0.082, 0.003],
      [-0.08, 0.094, 0.104, 0],
      [0.06, 0.106, 0.112, -0.002],
      [0.18, 0.088, 0.094, -0.006],
      [0.29, 0.058, 0.064, -0.016],
      [0.38, 0.032, 0.04, -0.03],
      [0.45, 0.015, 0.022, -0.047],
      [0.49, 0.007, 0.012, -0.058],
    ],
  },
  helicoprion: {
    back: "#46545e",
    side: "#5f7280",
    belly: "#d5d9cf",
    fin: "#4e5d68",
    iris: "#2c3438",
    roof: -0.024,
    hinge: -0.295,
    front: -0.47,
    gap: 0.02,
    jawRy: 0.034,
    jawPouch: true,
    jawBase: -0.1,
    freq: 0.85,
    amp: 0.06,
    eye: [0.068, 0.026, -0.36, 0.011],
    teeth: null,
    profile: [
      [-0.5, 0.01, 0.012, 0],
      [-0.44, 0.038, 0.042, 0.004],
      [-0.34, 0.066, 0.072, 0.005],
      [-0.22, 0.09, 0.098, 0.002],
      [-0.06, 0.108, 0.112, 0],
      [0.1, 0.096, 0.1, -0.002],
      [0.24, 0.06, 0.064, -0.002],
      [0.35, 0.026, 0.032, 0],
      [0.41, 0.012, 0.018, 0],
    ],
  },
};

/** 四种轴向推进掠食者共享躯干、颌与尾柄架构，细节按物种分派。 */
function buildPredator(kind, body, motions) {
  const c = PREDATORS[kind];
  const torso = add(
    body,
    `${kind}_torso`,
    () => {
      const bodyLoft = loft(c.profile, c, {
        rings: 52,
        sides: 34,
        cut: true,
      });
      // 剑鱼扁平剑吻与躯干同一几何，截面椭圆扁、约占全长三分之一。
      if (kind !== "swordfish") return bodyLoft;
      const bill = loft(
        [
          [-0.66, 0.0035, 0.0016, -0.012],
          [-0.59, 0.009, 0.003, -0.011],
          [-0.51, 0.016, 0.0055, -0.009],
          [-0.43, 0.024, 0.009, -0.006],
          [-0.36, 0.033, 0.014, -0.003],
          [-0.3, 0.047, 0.033, 0],
        ],
        { back: "#2c3e56", belly: "#8fa2b2" },
        { rings: 22, sides: 14 },
      );
      return merge([bodyLoft, bill]);
    },
    SURFACE,
  );
  const swimming = bindAxialMotion(torso, motions, {
    axis: "y",
    amplitude: c.amp,
    frequency: c.freq,
  });
  swimming.name = `${kind}_continuous_body`;
  eyes(body, kind, c.eye, c.iris);
  if (kind === "ichthyosaur")
    add(
      body,
      `${kind}_sclerotic_rings`,
      () =>
        merge(
          [-1, 1].map((side) => {
            const ring = new THREE.TorusGeometry(0.029, 0.004, 6, 20);
            ring.rotateY(Math.PI / 2);
            ring.translate(side * 0.0675, c.eye[1], c.eye[2]);
            return paint(ring, "#586568");
          }),
        ),
      SURFACE,
    );
  const jaw = new THREE.Group();
  jaw.name = `${kind}_jaw`;
  jaw.position.set(0, c.roof, c.hinge);
  body.add(jaw);
  add(
    jaw,
    `${kind}_mandible`,
    () => {
      const profile = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12,
          z = THREE.MathUtils.lerp(c.front, c.hinge + 0.025, t),
          [rx] = sampleSection(c.profile, z);
        // 旋齿鲨下颌在齿旋处加深成软骨囊，前缘薄、联合部厚。
        const ry = c.jawPouch
          ? THREE.MathUtils.lerp(
              (c.jawRy || 0.013) * 0.5,
              c.jawRy,
              THREE.MathUtils.smoothstep(t, 0.1, 0.8),
            )
          : c.jawRy || 0.013;
        profile.push([
          z,
          rx *
            THREE.MathUtils.lerp(
              0.18,
              0.86,
              THREE.MathUtils.smoothstep(t, 0, 0.18),
            ),
          ry *
            THREE.MathUtils.lerp(
              0.35,
              1,
              THREE.MathUtils.smoothstep(t, 0, 0.16),
            ),
          c.roof -
            c.gap * (1 - THREE.MathUtils.smoothstep(t, 0.55, 1)) -
            0.009 -
            (c.jawPouch ? 0.012 * Math.exp(-(((t - 0.42) / 0.3) ** 2)) : 0),
        ]);
      }
      return loft(profile, c, { jaw: true, rings: 28, sides: 24 }).translate(
        0,
        -c.roof,
        -c.hinge,
      );
    },
    SURFACE,
  );
  if (c.teeth) {
    add(
      jaw,
      `${kind}_lower_teeth`,
      () => dentition(kind, c, true).translate(0, -c.roof, -c.hinge),
      TEETH,
    );
    add(body, `${kind}_upper_teeth`, () => dentition(kind, c, false), TEETH);
  }
  // 旋齿鲨的螺旋齿列长在下颌中线内侧口腔中，上颌无齿；轮齿随下颌关节联动。
  if (kind === "helicoprion")
    add(jaw, `${kind}_tooth_whorl`, whorlGeometry, TEETH);
  motions.push((t, e) => {
    jaw.rotation.x =
      (c.jawBase ?? -0.012) -
      Math.sin(t * 0.43) * (0.012 + Math.min(e, 3) * 0.003);
  });
  add(body, `${kind}_head_details`, () => headDetails(kind, c), DARK);
  fins(kind, body, swimming, c, motions);
}

function dentition(kind, c, lower) {
  const parts = [],
    count = c.teeth.count;
  for (const side of [-1, 1])
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count,
        z = THREE.MathUtils.lerp(c.front + 0.02, c.hinge - 0.015, t),
        [rx] = sampleSection(c.profile, z),
        size = c.teeth.size * (0.75 + Math.sin(t * Math.PI) * 0.25),
        g = tooth(size, lower, false);
      // 鱼龙牙齿微向外撇，闭口时仍从唇缘露出。
      if (c.teeth.splay) g.rotateZ(side * c.teeth.splay);
      g.translate(
        side * rx * 0.82,
        c.roof -
          (lower
            ? c.gap * (1 - THREE.MathUtils.smoothstep(t, 0.55, 1)) + 0.001
            : 0),
        z,
      );
      parts.push(g);
    }
  return merge(parts);
}

/**
 * 旋齿鲨齿旋：约 2.4 圈对数螺旋的三角齿冠列，整体位于下颌联合处。
 * 复原依据 Tapanila 2013 的 CT 重建：齿旋完全包在口腔内，不外露于颌端。
 */
function whorlGeometry() {
  const parts = [],
    center = new THREE.Vector3(0, -0.024, -0.105),
    count = 22,
    spiral = [];
  for (let i = 0; i < count; i++) {
    const phi = THREE.MathUtils.degToRad(115 - 38 * i),
      r = 0.042 * 0.928 ** i,
      position = new THREE.Vector3(
        0,
        center.y + Math.sin(phi) * r,
        center.z + Math.cos(phi) * r,
      );
    spiral.push(position.clone());
    const size = 0.0195 * (r / 0.042) ** 0.7 + 0.0035,
      g = tooth(size, true, true);
    g.scale(0.55, 1, 1);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, Math.sin(phi), Math.cos(phi)).normalize(),
      ),
    );
    g.translate(position.x, position.y, position.z);
    parts.push(g);
  }
  // 齿冠共用的螺旋齿根带没入下颌软骨，外圈可见一截。
  const rootPoints = spiral
    .filter((_, i) => i % 2 === 0)
    .map((p, i) => p.clone().lerp(center, 0.18 + i * 0.01));
  const root = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(rootPoints),
    40,
    0.0058,
    6,
    false,
  );
  parts.push(root);
  const g = merge(parts);
  // 几何缓存于下颌局部坐标，构建时平移到颌关节原点。
  return g;
}

/** 吻端鼻孔与鳃裂细节；旋齿鲨按全头类重建为单个鳃盖裂。 */
function headDetails(kind, c) {
  const parts = [];
  const nostril = {
    blue_shark: [0.026, -0.002, -0.44],
    swordfish: [0.03, 0.014, -0.288],
    ichthyosaur: [0.016, 0.026, -0.478],
    helicoprion: [0.026, -0.002, -0.44],
  }[kind];
  for (const side of [-1, 1])
    parts.push(
      blob(
        [side * nostril[0], nostril[1], nostril[2]],
        kind === "ichthyosaur"
          ? [0.003, 0.002, 0.004]
          : [0.007, 0.0022, 0.0035],
      ),
    );
  if (kind === "ichthyosaur") return merge(parts);
  if (kind === "helicoprion") {
    // 全头类鳃裂被皮褶鳃盖覆盖，只留一道弧形鳃盖缝。
    for (const side of [-1, 1])
      parts.push(
        tube(
          [
            [side * 0.088, 0.032, -0.248],
            [side * 0.097, 0.0, -0.238],
            [side * 0.091, -0.028, -0.228],
          ],
          0.0016,
        ),
      );
    return merge(parts);
  }
  if (kind === "swordfish") {
    // 硬骨鱼只有一道鳃盖后缘；曲线沿各高度的真实椭圆截面贴合。
    for (const side of [-1, 1]) {
      const points = [
        [0.68, -0.163],
        [0.4, -0.14],
        [0, -0.129],
        [-0.38, -0.141],
        [-0.65, -0.169],
      ].map(([f, z]) => {
        const [rx, ry, cy] = sampleSection(c.profile, z);
        return [side * (rx * Math.sqrt(1 - f * f) + 0.0008), cy + f * ry, z];
      });
      parts.push(tube(points, 0.0012, 24, 6));
    }
    return merge(parts);
  }
  // 蓝鲨的五道短鳃裂逐条贴合躯干表面。
  const slitZ = -0.212,
    slitCount = 5;
  for (const side of [-1, 1])
    for (let i = 0; i < slitCount; i++) {
      const z = slitZ + i * 0.013,
        [rx, ry, cy] = sampleSection(c.profile, z);
      const points = [0.3, 0.12, -0.08, -0.25].map((f) => {
        const y = cy + f * ry;
        return [
          side *
            (rx * Math.sqrt(Math.max(0.05, 1 - ((y - cy) / ry) ** 2)) + 0.001),
          y,
          z + (f < 0 ? 0.004 : 0),
        ];
      });
      parts.push(tube(points, kind === "blue_shark" ? 0.0011 : 0.0009));
    }
  return merge(parts);
}

/** 各物种差异化鳍式：胸鳍独立关节，正鳍与尾鳍按解剖轮廓成型。 */
function fins(kind, body, swimming, c, motions) {
  const pectoral = {
    blue_shark: {
      joint: [0.068, -0.05, -0.19],
      outline: [
        [-0.03, -0.01],
        [-0.02, 0.055],
        [0.05, 0.2],
        [0.13, 0.29],
        [0.185, 0.305],
        [0.175, 0.235],
        [0.105, 0.055],
        [0.04, -0.005],
      ],
      thickness: 0.014,
      flap: 0.035,
      base: -0.28,
    },
    swordfish: {
      joint: [0.06, -0.048, -0.13],
      outline: [
        [-0.037, -0.012],
        [-0.028, 0.04],
        [0.063, 0.172],
        [0.132, 0.207],
        [0.144, 0.155],
        [0.08, 0.029],
        [0.052, -0.01],
      ],
      thickness: 0.012,
      flap: 0.06,
      base: -0.16,
    },
    helicoprion: {
      joint: [0.1, -0.055, -0.15],
      outline: [
        [-0.04, -0.014],
        [-0.033, 0.045],
        [0.04, 0.17],
        [0.1, 0.2],
        [0.115, 0.15],
        [0.07, 0.03],
        [0.05, -0.012],
      ],
      thickness: 0.014,
      flap: 0.05,
      base: -0.2,
    },
  }[kind];
  if (pectoral) {
    for (const side of [-1, 1]) {
      const joint = new THREE.Group();
      joint.name = `${kind}_pectoral_${side}`;
      joint.position.set(
        side * pectoral.joint[0],
        pectoral.joint[1],
        pectoral.joint[2],
      );
      body.add(joint);
      add(
        joint,
        `${kind}_pectoral_mesh_${side}`,
        () => {
          const g = paint(
            sculptedFin(pectoral.outline, pectoral.thickness, "horizontal", {
              detail: 1,
              camber: 0.003,
            }),
            c.fin,
            c.side || c.belly,
          );
          return side < 0 ? mirror(g) : g;
        },
        SURFACE,
      );
      motions.push((t, e) => {
        joint.rotation.z =
          side *
          (pectoral.base +
            Math.sin(t * c.freq) *
              (pectoral.flap * 0.5 + Math.min(e, 3) * 0.012));
        joint.rotation.y = side * Math.cos(t * c.freq) * 0.025;
      });
    }
  }
  // 鱼龙四肢特化为两对鳍状肢，前肢明显大于后肢，仅作姿态微调。
  if (kind === "ichthyosaur") {
    const pairs = [
      { joint: [0.09, -0.075, -0.06], scale: 1.45, phase: 0, base: -0.3 },
      { joint: [0.076, -0.068, 0.2], scale: 0.82, phase: 1.4, base: -0.18 },
    ];
    for (const [index, limb] of pairs.entries())
      for (const side of [-1, 1]) {
        const joint = new THREE.Group();
        joint.name = `${kind}_${index === 0 ? "fore" : "hind"}_flipper_${side}`;
        joint.position.set(side * limb.joint[0], limb.joint[1], limb.joint[2]);
        body.add(joint);
        add(
          joint,
          `${kind}_flipper_mesh_${index}_${side}`,
          () => {
            const outline = [
              [-0.045, -0.016],
              [-0.04, 0.03],
              [0.0, 0.1],
              [0.05, 0.16],
              [0.09, 0.165],
              [0.1, 0.1],
              [0.06, 0.02],
              [0.02, -0.014],
            ].map(([z, y]) => [z * limb.scale, y * limb.scale]);
            const g = paint(
              sculptedFin(outline, 0.016 * limb.scale, "horizontal", {
                detail: 1,
                camber: 0.003,
              }),
              c.fin,
              c.side,
            );
            return side < 0 ? mirror(g) : g;
          },
          SURFACE,
        );
        motions.push((t, e) => {
          joint.rotation.x =
            Math.sin(t * c.freq * 0.5 + limb.phase) *
            (0.05 + Math.min(e, 3) * 0.01);
          joint.rotation.z =
            side *
            (limb.base + Math.sin(t * c.freq * 0.5 + limb.phase + 0.8) * 0.035);
        });
      }
  }
  add(
    body,
    `${kind}_median_fins`,
    () => {
      const parts = [];
      const fin = (outline, thickness = 0.011, options = { detail: 1 }) =>
        parts.push(
          paint(sculptedFin(outline, thickness, "vertical", options), c.fin),
        );
      if (kind === "blue_shark") {
        fin([
          [-0.01, 0.062],
          [0.035, 0.138],
          [0.075, 0.128],
          [0.09, 0.055],
          [0.11, 0.046],
        ]);
        fin([
          [0.28, 0.02],
          [0.305, 0.046],
          [0.325, 0.018],
        ]);
        fin([
          [0.17, -0.042],
          [0.2, -0.066],
          [0.23, -0.038],
        ]);
        fin([
          [0.28, -0.018],
          [0.31, -0.042],
          [0.33, -0.016],
        ]);
      } else if (kind === "swordfish") {
        // 成年剑鱼第一背鳍高而镰弯，无腹鳍，尾柄两侧各一枚大尾 keel。
        fin([
          [-0.145, 0.06],
          [-0.068, 0.213],
          [-0.03, 0.232],
          [-0.039, 0.167],
          [-0.003, 0.101],
          [0.07, 0.069],
        ]);
        fin([
          [0.33, 0.02],
          [0.355, 0.046],
          [0.375, 0.018],
        ]);
        fin([
          [0.01, -0.069],
          [0.085, -0.143],
          [0.102, -0.142],
          [0.105, -0.105],
          [0.18, -0.054],
        ]);
        fin([
          [0.34, -0.018],
          [0.36, -0.042],
          [0.375, -0.016],
        ]);
        for (const side of [-1, 1]) {
          const keel = paint(
            sculptedFin(
              [
                [0.345, 0.008],
                [0.365, 0.034],
                [0.41, 0.028],
                [0.42, 0.008],
              ],
              0.006,
              "horizontal",
              { detail: 0 },
            ),
            c.fin,
          );
          if (side < 0) mirror(keel);
          keel.translate(side * 0.008, 0, 0);
          parts.push(keel);
        }
      } else if (kind === "ichthyosaur") {
        fin([
          [0.02, 0.1],
          [0.08, 0.158],
          [0.16, 0.096],
        ]);
      } else if (kind === "helicoprion") {
        fin([
          [-0.06, 0.098],
          [0.0, 0.178],
          [0.05, 0.162],
          [0.07, 0.092],
        ]);
        fin([
          [0.16, 0.056],
          [0.21, 0.102],
          [0.25, 0.05],
        ]);
        fin([
          [0.15, -0.046],
          [0.19, -0.076],
          [0.23, -0.042],
        ]);
        fin([
          [0.27, -0.02],
          [0.3, -0.046],
          [0.33, -0.018],
        ]);
      }
      return merge(parts);
    },
    SURFACE,
  );
  const tail = new THREE.Group();
  tail.name = `${kind}_tail`;
  swimming.skeleton.bones[2].add(tail);
  tail.position.set(
    0,
    kind === "ichthyosaur" ? -0.058 : 0,
    c.profile.at(-1)[0] - 0.265,
  );
  add(
    tail,
    `${kind}_caudal`,
    () => {
      const outline =
        kind === "swordfish"
          ? [
              [-0.015, -0.02],
              [0.06, -0.1],
              [0.1, -0.155],
              [0.115, -0.14],
              [0.085, -0.06],
              [0.065, -0.01],
              [0.085, 0.05],
              [0.115, 0.14],
              [0.1, 0.155],
              [0.06, 0.1],
              [-0.015, 0.025],
            ]
          : kind === "ichthyosaur"
            ? [
                [-0.023, -0.023],
                [0.052, -0.086],
                [0.098, -0.121],
                [0.115, -0.109],
                [0.08, -0.046],
                [0.058, -0.006],
                [0.08, 0.052],
                [0.115, 0.115],
                [0.132, 0.132],
                [0.104, 0.069],
                [0.058, 0.023],
                [-0.023, 0.012],
              ]
            : [
                [-0.02, -0.008],
                [0.075, -0.115],
                [0.105, -0.135],
                [0.1, -0.085],
                [0.055, -0.012],
                [0.06, 0.02],
                [0.16, 0.19],
                [0.2, 0.225],
                [0.185, 0.16],
                [0.1, 0.075],
                [0.045, 0.05],
                [-0.02, 0.015],
              ];
      return paint(
        sculptedFin(outline, kind === "swordfish" ? 0.013 : 0.015, "vertical", {
          detail: 1,
          camber: 0.001,
        }),
        c.fin,
        c.side,
      );
    },
    SURFACE,
  );
  motions.push((t, e) => {
    tail.rotation.y =
      Math.sin(t * c.freq - 1.5) *
      (0.085 + Math.min(e, 3) * 0.014) *
      (kind === "swordfish" ? 1.15 : 1);
  });
}
