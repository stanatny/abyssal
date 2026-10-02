import * as THREE from "three";

/** 连续环形沉积台地：椭圆喉道、起伏岩顶及同一网格导出的保守实体。 */
export function createMarianaLayer(parent, keep, { gate, material, bounds }) {
  const points = [],
    indices = [],
    colors = [],
    colliders = [];
  const segments = 96,
    rings = 9,
    thickness = 32;
  const rx = gate.width * 0.5,
    rz = gate.depthSize * 0.5;
  const pale = new THREE.Color(gate.color),
    dark = new THREE.Color(0x414653);
  const color = new THREE.Color();
  for (let layer = 0; layer < 2; layer++)
    for (let ring = 0; ring <= rings; ring++)
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2,
          c = Math.cos(a),
          s = Math.sin(a);
        const inner =
          1 + Math.sin(a * 3 + gate.depth) * 0.12 + Math.cos(a * 7) * 0.07;
        const innerX = rx * c * inner,
          innerZ = rz * s * inner;
        const reach = Math.min(
          Math.abs(c) < 1e-8
            ? Infinity
            : (c > 0 ? bounds.maxX - gate.x : gate.x - bounds.minX) /
                Math.abs(c),
          Math.abs(s) < 1e-8
            ? Infinity
            : (s > 0 ? bounds.maxZ - gate.z : gate.z - bounds.minZ) /
                Math.abs(s),
        );
        const t = ring / rings;
        const x = gate.x + THREE.MathUtils.lerp(innerX, c * (reach + 10), t);
        const z = gate.z + THREE.MathUtils.lerp(innerZ, s * (reach + 10), t);
        const relief =
          t *
          (Math.sin(x * 0.047 + z * 0.025) * 9 +
            Math.sin(z * 0.084 - x * 0.023) * 4);
        const y = -gate.depth + relief - layer * thickness;
        points.push(x, y, z);
        color
          .copy(dark)
          .lerp(
            pale,
            0.12 + (0.5 + 0.5 * Math.sin(z * 0.063 + x * 0.036)) * 0.25,
          );
        if (layer) color.multiplyScalar(0.75);
        color.toArray(colors, colors.length);
      }
  const row = segments + 1,
    stride = (rings + 1) * row;
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < segments; i++) {
      const a = j * row + i,
        b = a + row;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
      indices.push(
        a + stride,
        b + stride,
        a + 1 + stride,
        b + stride,
        b + 1 + stride,
        a + 1 + stride,
      );
      // 单元包络保守覆盖岩面，不把整个房间或下降口变为避障球。
      const ids = [a, a + 1, b, b + 1],
        lo = [Infinity, Infinity, Infinity],
        hi = [-Infinity, -Infinity, -Infinity];
      for (const id of ids)
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k], points[id * 3 + k]);
          hi[k] = Math.max(hi[k], points[id * 3 + k]);
        }
      lo[1] -= thickness;
      colliders.push({
        type: "box",
        id: `layer_${gate.id}_${j}_${i}`,
        x: (lo[0] + hi[0]) / 2,
        y: (lo[1] + hi[1]) / 2,
        z: (lo[2] + hi[2]) / 2,
        halfSize: new THREE.Vector3(
          (hi[0] - lo[0]) / 2,
          (hi[1] - lo[1]) / 2,
          (hi[2] - lo[2]) / 2,
        ),
      });
    }
  for (const ring of [0, rings])
    for (let i = 0; i < segments; i++) {
      const a = ring * row + i,
        b = a + 1;
      indices.push(a, b, a + stride, b, b + stride, a + stride);
    }
  const geometry = keep(new THREE.BufferGeometry());
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `trench_layer_${gate.id}`;
  parent.add(mesh);
  return colliders;
}

/** 波纹只留在自然椭圆入口，边缘渐隐，不绘制矩形平台或强烈同心靶标。 */
export function createMarianaSeal(parent, keep, gate, time) {
  const mat = keep(
    new THREE.MeshBasicMaterial({
      color: gate.color,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mat.onBeforeCompile = (s) => {
    s.uniforms.pressureTime = time;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 sealUv;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nsealUv=uv;",
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 sealUv;uniform float pressureTime;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
      vec2 q=(sealUv-.5)*2.;float r=length(q);
      float veil=.5+.5*sin(q.x*13.+sin(q.y*9.-pressureTime*.35)*2.+pressureTime*.5);
      float edge=smoothstep(.62,.91,r)*(1.-smoothstep(.91,1.,r));
      diffuseColor.a*=((.13+veil*.12)*(1.-smoothstep(.75,1.,r))+edge*.7);`,
      );
  };
  mat.customProgramCacheKey = () => "mariana_organic_seal_v2";
  const curtain = keep(new THREE.CircleGeometry(1, 96));
  const vertices = curtain.attributes.position;
  for (let i = 1; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i),
      a = Math.atan2(y, x);
    const shape =
      1 + Math.sin(a * 3 + gate.depth) * 0.12 + Math.cos(a * 7) * 0.07;
    vertices.setXY(i, x * shape, y * shape);
  }
  curtain.computeBoundingSphere();
  const membrane = new THREE.Mesh(curtain, mat);
  membrane.rotation.x = -Math.PI / 2;
  membrane.scale.set(gate.width * 0.5, gate.depthSize * 0.5, 1);
  membrane.position.set(gate.x, -gate.depth, gate.z);
  membrane.name = `pressure_seal_${gate.id}`;
  parent.add(membrane);
  const barrier = {
    type: "ellipsoid",
    id: `seal_${gate.id}`,
    x: gate.x,
    y: -gate.depth - 1,
    z: gate.z,
    axes: new THREE.Vector3(gate.width * 0.61, 3, gate.depthSize * 0.61),
  };
  return { gate, membrane, barrier };
}
