import * as THREE from "three";

// 破口与移除的原薄壁共用范围；保留原右舷主入口，增加左舷开放口和小型侵蚀洞。
export const WRECK_BREACHES = Object.freeze([
  { side: 1, z0: 24, z1: 72, y0: 9.5, y1: 28.5, original: true },
  { side: -1, z0: -78, z1: -30, y0: 9.5, y1: 28.5 },
  { side: 1, z0: -78, z1: -54, y0: 9.5, y1: 19 },
]);

export function wreckWallMissing(side, z, level) {
  return WRECK_BREACHES.some(
    (h) =>
      h.side === side &&
      z > h.z0 &&
      z < h.z1 &&
      level * 9.5 >= h.y0 &&
      (level + 1) * 9.5 <= h.y1,
  );
}

export function wreckHullX(side, z, y) {
  return (
    side *
    27 *
    Math.min(1, Math.max(0.03, (120 - Math.abs(z)) / 28.8)) *
    (0.55 +
      Math.sin(((Math.max(0, Math.min(38, y)) / 38) * Math.PI) / 2) * 0.45)
  );
}

function breachOutline(h) {
  const points = [],
    w = h.z1 - h.z0,
    height = h.y1 - h.y0;
  // 锯齿只进入缺口边缘约1.5米，中央净通道保持；不做规则方孔或黑色贴片。
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    points.push(
      new THREE.Vector2(
        h.z0 + w * t,
        h.y0 + (((i * 7 + 3) % 11) * 0.13 + 0.12),
      ),
    );
  }
  for (let i = 1; i <= 5; i++)
    points.push(
      new THREE.Vector2(h.z1 - (i % 2 ? 0.9 : 0.1), h.y0 + (height * i) / 6),
    );
  for (let i = 10; i >= 0; i--)
    points.push(
      new THREE.Vector2(
        h.z0 + (w * i) / 10,
        h.y1 - (((i * 5 + 1) % 9) * 0.15 + 0.15),
      ),
    );
  for (let i = 5; i >= 1; i--)
    points.push(
      new THREE.Vector2(h.z0 + (i % 2 ? 0.2 : 1), h.y0 + (height * i) / 6),
    );
  return points;
}

/** 带真实洞口和薄板断面的独立沉船船壳，不改变其他船只共用几何。 */
export function decayedWreckHull(side) {
  const outline = [new THREE.Vector2(-120, 0), new THREE.Vector2(120, 0)];
  for (let i = 60; i >= 0; i--) {
    const z = -120 + i * 4;
    const notch = i % 11 === 3 ? 3.5 : i % 5 === 1 ? 1.7 : 0.3;
    outline.push(new THREE.Vector2(z, Math.abs(z) < 6 ? 38 : 38 - notch));
  }
  const holes = WRECK_BREACHES.filter((h) => h.side === side).map(
    breachOutline,
  );
  const vertices = [...outline, ...holes.flat()].map((p) => [p.x, p.y]);
  const triangles = THREE.ShapeUtils.triangulateShape(outline, holes);
  const midpoints = new Map(),
    faces = [];
  const middle = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (midpoints.has(key)) return midpoints.get(key);
    const index = vertices.length;
    vertices.push([
      (vertices[a][0] + vertices[b][0]) / 2,
      (vertices[a][1] + vertices[b][1]) / 2,
    ]);
    midpoints.set(key, index);
    return index;
  };
  const length2 = (a, b) =>
    (vertices[a][0] - vertices[b][0]) ** 2 +
    (vertices[a][1] - vertices[b][1]) ** 2;
  function split(a, b, c, depth = 0) {
    const ab = length2(a, b),
      bc = length2(b, c),
      ca = length2(c, a);
    if (Math.max(ab, bc, ca) <= 36 || depth >= 16) {
      faces.push(a, b, c);
      return;
    }
    if (ab >= bc && ab >= ca) {
      const m = middle(a, b);
      split(a, m, c, depth + 1);
      split(m, b, c, depth + 1);
    } else if (bc >= ca) {
      const m = middle(b, c);
      split(b, m, a, depth + 1);
      split(m, c, a, depth + 1);
    } else {
      const m = middle(c, a);
      split(c, m, b, depth + 1);
      split(m, a, b, depth + 1);
    }
  }
  for (const f of triangles) split(...f);
  const p = [],
    idx = [],
    count = vertices.length;
  for (const inset of [0, 0.38])
    for (const [z, y] of vertices)
      p.push(wreckHullX(side, z, y) - side * inset, y, z);
  for (let i = 0; i < faces.length; i += 3) {
    const [a, b, c] = faces.slice(i, i + 3);
    idx.push(a, b, c, c + count, b + count, a + count);
  }
  let start = 0;
  for (const ring of [outline, ...holes]) {
    for (let i = 0; i < ring.length; i++) {
      const a = start + i,
        b = start + ((i + 1) % ring.length);
      idx.push(a, b, b + count, a, b + count, a + count);
    }
    start += ring.length;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geometry.setIndex(idx);
  removeCollapsedTriangles(geometry);
  geometry.computeVertexNormals();
  return geometry;
}

/** 腐蚀挂须依附船壳断边；轻量静态合批，不进入既有宽主航道。 */
export function addWreckRusticles(b, m) {
  for (const side of [-1, 1])
    for (let i = 0; i < 62; i++) {
      const z = -108 + i * 3.5,
        y = [37, 28.5, 9.5][i % 3];
      const x = wreckHullX(side, z, y) + side * 0.18;
      if (
        WRECK_BREACHES.some(
          (h) =>
            h.side === side &&
            z > h.z0 + 2 &&
            z < h.z1 - 2 &&
            y > h.y0 + 0.1 &&
            y < h.y1 - 0.1,
        )
      )
        continue;
      const length = 1.2 + ((i * 17) % 13) * 0.26;
      const geometry = new THREE.ConeGeometry(
        0.18 + (i % 4) * 0.065,
        length,
        5,
        1,
      );
      geometry.rotateZ(Math.PI);
      b.add(geometry, m.rust, [x, y - length / 2, z], [0, 0, side * 0.08]);
    }
  for (const h of WRECK_BREACHES)
    for (const z of [h.z0 + 0.7, h.z1 - 0.7]) {
      const y = h.y1 - 1;
      b.beam(
        m.rust,
        [wreckHullX(h.side, z, y), y, z],
        [wreckHullX(h.side, z, y) - h.side * 0.6, y - 2.2, z + 0.8],
        0.16,
        5,
      );
    }
}

/** 在已生成的底色上加入区域一致的锈蚀和长条水痕，不增加透明叠面或额外绘制。 */
export function applyWreckCorrosion(material, kind) {
  material.roughness = 0.97;
  material.metalness = kind === "hull" ? 0.025 : 0;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vWreckSurface;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvWreckSurface=position;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
      varying vec3 vWreckSurface;
      float wreckHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float wreckNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(wreckHash(i),wreckHash(i+vec2(1,0)),f.x),mix(wreckHash(i+vec2(0,1)),wreckHash(i+vec2(1,1)),f.x),f.y);}
    `,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      vec2 wp=${kind === "deck" ? "vWreckSurface.xz" : "vWreckSurface.zy"};
      float coarse=wreckNoise(wp*.11+vec2(4.2,2.7));
      float flakes=wreckNoise(wp*2.7);
      float streak=pow(wreckNoise(vec2(wp.x*.85,wp.y*.035)),3.);
      float mask=smoothstep(${kind === "hull" ? ".34,.61" : ".47,.71"},coarse*.78+flakes*.18+streak*.25);
      vec3 oxide=diffuseColor.rgb*vec3(2.35,1.02,.46)+vec3(.014,.004,.001);
      oxide*=.76+flakes*.40;
      diffuseColor.rgb=mix(diffuseColor.rgb*${kind === "deck" ? ".79" : ".92"},${kind === "deck" ? "diffuseColor.rgb*vec3(.42,.47,.35)" : "oxide"},mask*${kind === "enamel" ? ".78" : ".89"});
    `,
      );
  };
  material.customProgramCacheKey = () => `bermuda_corrosion_${kind}_v1`;
}

/** 舱壁断面有真实厚度和碎边；孔中央不保留整块隐形墙。 */
export function tornWreckBulkhead(side, z0, z1, brokenEnd) {
  const end = brokenEnd === 1 ? z1 : z0,
    points = [];
  points.push(new THREE.Vector2(brokenEnd === 1 ? z0 : z1, 43));
  for (let i = 0; i <= 12; i++) {
    const y = 43 + (i * 20) / 12,
      inset = ((i * 7 + 3) % 11) * 0.11;
    points.push(new THREE.Vector2(end - brokenEnd * inset, y));
  }
  points.push(new THREE.Vector2(brokenEnd === 1 ? z0 : z1, 63));
  const shape = new THREE.Shape(points),
    g = new THREE.ExtrudeGeometry(shape, {
      depth: 1.1,
      steps: 1,
      bevelEnabled: false,
    });
  const p = g.attributes.position,
    n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const z = p.getX(i),
      y = p.getY(i),
      x = p.getZ(i);
    p.setXYZ(i, side * 22 + x - 0.55, y, z);
    const nx = n.getX(i),
      ny = n.getY(i),
      nz = n.getZ(i);
    n.setXYZ(i, nz, ny, nx);
  }
  // 轴交换改变了手性，翻转每个三角形的绕序。
  g.setIndex(
    Array.from({ length: p.count }, (_, i) =>
      i % 3 === 0 ? i : i % 3 === 1 ? i + 1 : i - 1,
    ),
  );
  removeCollapsedTriangles(g);
  return g;
}

// Earcut 的共线断边和细分中点在 Float32 舍入后可能重合；只删除零面积面，保留可见断口。
function removeCollapsedTriangles(g) {
  const p = g.attributes.position,
    indices = g.index.array,
    kept = [],
    a = new THREE.Vector3(),
    b = new THREE.Vector3(),
    c = new THREE.Vector3();
  for (let i = 0; i < indices.length; i += 3) {
    a.fromBufferAttribute(p, indices[i]);
    b.fromBufferAttribute(p, indices[i + 1]);
    c.fromBufferAttribute(p, indices[i + 2]);
    if (b.sub(a).cross(c.sub(a)).lengthSq() > 1e-12)
      kept.push(indices[i], indices[i + 1], indices[i + 2]);
  }
  g.setIndex(kept);
}
