import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const cache = new Map(),
  materials = new Map();
/** 不可变美术资源共用；每个实例的关节与动作独立。 */
export function pgGeometry(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}
export function pgMaterial(color, pattern = 0, glow = 0) {
  const key = `${color}_${pattern}_${glow}`;
  if (!materials.has(key)) {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: pattern === 4 ? 0.48 : 0.79,
      metalness: pattern === 4 ? 0.44 : 0.02,
      emissive: color,
      emissiveIntensity: glow,
    });
    m.onBeforeCompile = (s) => {
      s.vertexShader = "varying vec3 vMythPosition;\n" + s.vertexShader;
      s.vertexShader = s.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMythPosition=position;",
      );
      s.fragmentShader = "varying vec3 vMythPosition;\n" + s.fragmentShader;
      const mark =
        pattern === 1
          ? "float line=pow(0.5+0.5*sin(vMythPosition.z*92.0+sin(vMythPosition.y*45.0)*2.0),8.0); diffuseColor.rgb*=1.0-line*0.72;"
          : pattern === 5
            ? "vec3 p=vMythPosition*28.0; float spot=smoothstep(.22,.08,length(fract(p.xz)-.5));diffuseColor.rgb*=1.0-spot*.62;"
            : pattern === 6
              ? "float strand=sin(vMythPosition.z*460.0+sin(vMythPosition.y*250.0)*.8);diffuseColor.rgb*=.92+.08*strand;"
              : pattern === 2
                ? "vec2 cell=fract(vec2(vMythPosition.z*90.0,vMythPosition.y*90.0)); float edge=smoothstep(0.7,0.96,length(cell-0.5)*1.4); diffuseColor.rgb*=0.76+0.24*(1.0-edge);"
                : pattern === 3
                  ? "float line=pow(0.5+0.5*sin(vMythPosition.x*105.0+vMythPosition.z*95.0),14.0); diffuseColor.rgb*=0.78+0.22*(1.0-line);"
                  : pattern === 4
                    ? "float line=pow(0.5+0.5*sin(vMythPosition.z*120.0),24.0); diffuseColor.rgb*=0.85+0.15*line;"
                    : "";
      s.fragmentShader = s.fragmentShader.replace(
        "#include <color_fragment>",
        "#include <color_fragment>\n" + mark,
      );
    };
    m.customProgramCacheKey = () => `penglai_skin_${pattern}`;
    materials.set(key, m);
  }
  return materials.get(key);
}
export function pgPart(
  parent,
  geometry,
  material,
  p = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
  name = "myth_detail",
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...p);
  mesh.scale.set(...scale);
  mesh.rotation.set(...(rotation.length === 3 ? rotation : [0, 0, 0]));
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}
export function pgOval(parent, material, p, scale, name) {
  return pgPart(
    parent,
    pgGeometry("oval", () => new THREE.SphereGeometry(1, 24, 16)),
    material,
    p,
    scale,
    [0, 0, 0],
    name,
  );
}
export function pgCone(parent, material, p, scale, rotation = [0, 0, 0], name) {
  return pgPart(
    parent,
    pgGeometry("cone", () => new THREE.ConeGeometry(1, 1, 10)),
    material,
    p,
    scale,
    rotation,
    name,
  );
}
export function pgCurve(
  parent,
  material,
  points,
  radius = 0.01,
  name = "curved_detail",
) {
  const key = `curve_${radius}_${points.flat().join("_")}`;
  return pgPart(
    parent,
    pgGeometry(
      key,
      () =>
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(
            points.map((p) => new THREE.Vector3(...p)),
          ),
          Math.max(12, points.length * 7),
          radius,
          6,
          false,
        ),
    ),
    material,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    name,
  );
}
/** 放样体躯避免球体堆叠的轮廓；截面提供位置和两个方向半径。 */
export function pgLoft(parent, key, material, sections) {
  return pgPart(
    parent,
    pgGeometry(key, () => {
      const p = [],
        indices = [],
        n = 24;
      const profile = new THREE.CatmullRomCurve3(
        sections.map(([z, rx, ry, cy = 0]) => new THREE.Vector3(rx, ry, cy)),
        false,
        "catmullrom",
        0.25,
      );
      const rings = Math.max(28, sections.length * 5);
      for (let i = 0; i <= rings; i++) {
        const t = (i / rings) * (sections.length - 1),
          k = Math.min(sections.length - 2, Math.floor(t)),
          f = t - k;
        const z = THREE.MathUtils.lerp(sections[k][0], sections[k + 1][0], f),
          r = profile.getPoint(i / rings);
        for (let j = 0; j < n; j++) {
          const a = (j / n) * Math.PI * 2;
          p.push(
            Math.cos(a) * Math.max(0.0008, r.x),
            Math.sin(a) * Math.max(0.0008, r.y) + r.z,
            z,
          );
        }
      }
      for (let i = 0; i < rings; i++)
        for (let j = 0; j < n; j++) {
          const a = i * n + j,
            b = i * n + ((j + 1) % n),
            c = b + n,
            d = a + n;
          indices.push(a, b, d, b, c, d);
        }
      for (const end of [0, rings]) {
        const center = p.length / 3,
          base = end * n;
        p.push(
          0,
          sections[end ? sections.length - 1 : 0][3] || 0,
          sections[end ? sections.length - 1 : 0][0],
        );
        for (let j = 0; j < n; j++)
          end
            ? indices.push(center, base + j, base + ((j + 1) % n))
            : indices.push(center, base + ((j + 1) % n), base + j);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }),
    material,
  );
}
export function pgFin(
  parent,
  material,
  outline,
  depth = 0.012,
  name = "sculpted_fin",
) {
  const curved = [
    "curved_pectoral_membrane",
    "flowing_bilobed_caudal",
    "swept_dorsal_fin",
    "anatomical_ear",
  ].includes(name);
  const key = `fin_${outline.flat().join("_")}_${depth}_${curved}`;
  return pgPart(
    parent,
    pgGeometry(key, () => {
      const s = new THREE.Shape();
      if (!curved)
        outline.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
      else {
        const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        s.moveTo(...midpoint(outline.at(-1), outline[0]));
        outline.forEach((p, i) =>
          s.quadraticCurveTo(
            ...p,
            ...midpoint(p, outline[(i + 1) % outline.length]),
          ),
        );
      }
      s.closePath();
      const g = new THREE.ExtrudeGeometry(s, {
        depth,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: depth * 0.45,
        bevelThickness: depth * 0.4,
      });
      g.translate(0, 0, -depth / 2);
      return g;
    }),
    material,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    name,
  );
}
export function pgEyes(parent, x, y, z, scale = 0.013, fierce = false) {
  for (const side of [-1, 1]) {
    pgOval(
      parent,
      pgMaterial("#6a6c47"),
      [side * x, y, z],
      [scale * 1.1, scale * 0.65, scale * 1.1],
      "gold_eye_rim",
    );
    pgOval(
      parent,
      pgMaterial("#151e25"),
      [side * (x + scale * 0.65), y, z - scale * 0.15],
      [scale * 0.75, scale * (fierce ? 0.34 : 0.6), scale * 0.85],
      "living_eye",
    );
    pgOval(
      parent,
      pgMaterial("#fff0cc", 0, 0.15),
      [side * (x + scale * 1.1), y + scale * 0.22, z - scale * 0.35],
      [scale * 0.19, scale * 0.19, scale * 0.19],
      "eye_glint",
    );
    if (fierce)
      pgCurve(
        parent,
        pgMaterial("#2b3b3a"),
        [
          [side * (x - 0.005), y + scale * 0.8, z + 0.02],
          [side * (x + 0.015), y + scale * 0.6, z],
          [side * (x + 0.012), y + scale * 1.2, z - 0.03],
        ],
        scale * 0.3,
        "fierce_brow",
      );
  }
}
export function pgSword(parent, p = [0, 0, 0], scale = 1) {
  const g = new THREE.Group();
  g.name = "forged_flying_sword";
  g.position.set(...p);
  g.scale.setScalar(scale);
  parent.add(g);
  pgFin(
    g,
    pgMaterial("#b1ced2", 4),
    [
      [-0.019, -0.12],
      [-0.024, 0.22],
      [0, 0.37],
      [0.024, 0.22],
      [0.019, -0.12],
    ],
    0.01,
    "sword_blade",
  );
  pgOval(
    g,
    pgMaterial("#b89856", 4),
    [0, -0.14, 0],
    [0.085, 0.018, 0.015],
    "sword_guard",
  );
  pgPart(
    g,
    pgGeometry("hilt", () => new THREE.CylinderGeometry(0.014, 0.014, 0.13, 8)),
    pgMaterial("#4d7778"),
    [0, -0.215, 0],
  );
  pgOval(
    g,
    pgMaterial("#ceb76b"),
    [0, -0.285, 0],
    [0.025, 0.025, 0.025],
    "pommel",
  );
  return g;
}

/** 半径沿弧长收尖的连续附肢；尖端不再是截断的等粗管。 */
export function pgTaper(
  parent,
  material,
  points,
  radii,
  name = "tapered_appendage",
) {
  const key = `taper_${points.flat().join("_")}_${radii.join("_")}`;
  return pgPart(
    parent,
    pgGeometry(key, () => {
      const path = new THREE.CatmullRomCurve3(
          points.map((p) => new THREE.Vector3(...p)),
        ),
        count = Math.max(24, points.length * 9),
        radial = 10;
      const frames = path.computeFrenetFrames(count, false),
        positions = [],
        indices = [];
      for (let i = 0; i <= count; i++) {
        const t = i / count,
          center = path.getPointAt(t),
          u = t * (radii.length - 1),
          k = Math.min(radii.length - 2, Math.floor(u)),
          r = THREE.MathUtils.lerp(radii[k], radii[k + 1], u - k);
        for (let j = 0; j < radial; j++) {
          const a = (j / radial) * Math.PI * 2,
            q = center
              .clone()
              .addScaledVector(frames.normals[i], Math.cos(a) * r)
              .addScaledVector(frames.binormals[i], Math.sin(a) * r);
          positions.push(q.x, q.y, q.z);
          if (i < count) {
            const v = i * radial + j,
              w = i * radial + ((j + 1) % radial);
            indices.push(v, w, v + radial, w, w + radial, v + radial);
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    }),
    material,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    name,
  );
}
/** 羽片含弯曲羽轴、弧形羽缘与不对称展宽，避免纸板梳齿轮廓。 */
export function pgFeather(
  parent,
  material,
  length,
  width,
  bend = 0.04,
  name = "cambered_feather",
) {
  material.side = THREE.DoubleSide;
  const key = `feather_${length}_${width}_${bend}`;
  return pgPart(
    parent,
    pgGeometry(key, () => {
      const p = [],
        ix = [],
        rows = 14,
        cols = 6;
      for (let i = 0; i <= rows; i++)
        for (let j = 0; j <= cols; j++) {
          const t = i / rows,
            u = (j / cols) * 2 - 1,
            w =
              width * Math.sin(Math.PI * Math.pow(t, 0.7)) * (u < 0 ? 0.62 : 1);
          p.push(
            u * w,
            bend * Math.sin(t * Math.PI) - width * 0.14 * u * u,
            t * length,
          );
          if (i < rows && j < cols) {
            const a = i * (cols + 1) + j;
            ix.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
          }
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setIndex(ix);
      g.computeVertexNormals();
      return g;
    }),
    material,
    [0, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
    name,
  );
}
/** 衣摆通过连续环截面与纵向褶皱成形，摆动由父关节驱动。 */
export function pgDrape(parent, material, key, profiles, folds = 12) {
  return pgPart(
    parent,
    pgGeometry(`drape_${key}`, () => {
      const p = [],
        ix = [],
        rings = 32,
        sides = 48;
      for (let i = 0; i <= rings; i++) {
        const u = (i / rings) * (profiles.length - 1),
          k = Math.min(profiles.length - 2, Math.floor(u)),
          f = u - k;
        const [ya, xa, za] = profiles[k],
          [yb, xb, zb] = profiles[k + 1],
          y = THREE.MathUtils.lerp(ya, yb, f),
          rx = THREE.MathUtils.lerp(xa, xb, f),
          rz = THREE.MathUtils.lerp(za, zb, f);
        for (let j = 0; j <= sides; j++) {
          const a = (j / sides) * Math.PI * 2,
            crease = 1 + Math.sin(a * folds + i * 0.075) * 0.055 * (i / rings);
          p.push(
            Math.cos(a) * rx * crease,
            y + Math.sin(a * 3) * 0.014 * (i / rings) ** 3,
            Math.sin(a) * rz * crease,
          );
          if (i < rings && j < sides) {
            const v = i * (sides + 1) + j;
            ix.push(
              v,
              v + sides + 1,
              v + 1,
              v + 1,
              v + sides + 1,
              v + sides + 2,
            );
          }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      g.setIndex(ix);
      g.computeVertexNormals();
      return g;
    }),
    material,
  );
}

/** 每个刚性节点按材质合并，不合并关节；重建实例复用合并后几何。 */
export function pgBakeStatic(body, kind) {
  const groups = [];
  body.traverse((node) => {
    if (node.isGroup) groups.push(node);
  });
  groups.forEach((group, index) => {
    const buckets = new Map();
    for (const mesh of group.children)
      if (
        mesh.isMesh &&
        !mesh.userData.articulated &&
        !Array.isArray(mesh.material)
      ) {
        const key = mesh.material.uuid;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(mesh);
      }
    for (const [materialId, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const geometry = pgGeometry(
        `rigid_batch_${kind}_${index}_${materialId}`,
        () => {
          const parts = meshes.map((mesh) => {
            mesh.updateMatrix();
            let g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
            if (g.index) {
              const indexed = g;
              g = indexed.toNonIndexed();
              indexed.dispose();
            }
            for (const attribute of Object.keys(g.attributes))
              if (!["position", "normal"].includes(attribute))
                g.deleteAttribute(attribute);
            return g;
          });
          const result = mergeGeometries(parts);
          parts.forEach((g) => g.dispose());
          return result;
        },
      );
      const batch = new THREE.Mesh(geometry, meshes[0].material);
      batch.name = "rigid_anatomy_batch";
      batch.userData.details = meshes.map((m) => m.name);
      group.add(batch);
      meshes.forEach((m) => group.remove(m));
    }
  });
}
