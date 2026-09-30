import * as THREE from "three";

/** 连续截面雕刻；截面按高度排列，轮廓采用三次曲线而非逐段鼓包。 */
export function carvedLoft(sections, options = {}) {
  const { sculpt } = options;
  const radial = Math.max(12, Math.round((options.radial ?? 72) * 0.75));
  const rows = Math.max(8, Math.round((options.rows ?? 100) * 0.75));
  const data = sections.map((s) => ({ x: 0, z: 0, ...s }));
  const positions = [],
    indices = [];
  for (let i = 0; i <= rows; i++) {
    const y = THREE.MathUtils.lerp(data[0].y, data.at(-1).y, i / rows);
    let k = 0;
    while (k < data.length - 2 && y > data[k + 1].y) k++;
    const t = (y - data[k].y) / (data[k + 1].y - data[k].y);
    const value = (key) =>
      cubic(
        data[Math.max(0, k - 1)][key],
        data[k][key],
        data[k + 1][key],
        data[Math.min(data.length - 1, k + 2)][key],
        t,
      );
    const rx = Math.max(0.015, value("rx")),
      rz = Math.max(0.015, value("rz"));
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      let p = [value("x") + Math.cos(a) * rx, y, value("z") + Math.sin(a) * rz];
      if (sculpt) p = sculpt(p, a, i / rows);
      positions.push(...p);
    }
  }
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  for (const row of [0, rows]) {
    const offset = row * (radial + 1),
      center = positions.length / 3;
    const section = row === 0 ? data[0] : data.at(-1);
    positions.push(section.x, section.y, section.z);
    for (let j = 0; j < radial; j++) {
      if (row === 0) indices.push(center, offset + j, offset + j + 1);
      else indices.push(center, offset + j + 1, offset + j);
    }
  }
  const geometry = mesh(positions, indices);
  smoothSeam(geometry, rows, radial);
  return geometry;
}

/** 肌肉和发绺采用椭圆截面扫掠；半径与路径使用相同参数，避免弯肘错位。 */
export function carvedSweep(points, radii, options = {}) {
  const { flatten = 1, groove = 0 } = options;
  const radial = Math.max(6, Math.round((options.radial ?? 14) * 0.8));
  const samples = Math.max(10, Math.round((options.samples ?? 36) * 0.8));
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "catmullrom",
    0.35,
  );
  const tangent0 = curve.getTangent(0).normalize();
  const reference =
    Math.abs(tangent0.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
  let transported = new THREE.Vector3()
    .crossVectors(tangent0, reference)
    .normalize();
  let previousTangent = tangent0;
  const positions = [],
    indices = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = curve.getPoint(t),
      index = Math.min(radii.length - 2, Math.floor(t * (radii.length - 1))),
      u = t * (radii.length - 1) - index;
    const r = Math.max(
      0.01,
      cubic(
        radii[Math.max(0, index - 1)],
        radii[index],
        radii[index + 1],
        radii[Math.min(radii.length - 1, index + 2)],
        u,
      ),
    );
    // 法向按同一参数的切线平行运输，消除弯肘和卷发上的截面扭折。
    const tangent = curve.getTangent(t).normalize();
    const rotation = new THREE.Quaternion().setFromUnitVectors(
      previousTangent,
      tangent,
    );
    transported.applyQuaternion(rotation).normalize();
    const n = transported;
    const b = new THREE.Vector3().crossVectors(tangent, n).normalize();
    previousTangent = tangent;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const radius = r * (1 + groove * Math.cos(a * 4 + t * 2));
      positions.push(
        p.x + radius * (Math.cos(a) * n.x + Math.sin(a) * b.x * flatten),
        p.y + radius * (Math.cos(a) * n.y + Math.sin(a) * b.y * flatten),
        p.z + radius * (Math.cos(a) * n.z + Math.sin(a) * b.z * flatten),
      );
    }
  }
  for (let i = 0; i < samples; i++)
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j,
        b = a + radial + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  for (const row of [0, samples]) {
    const offset = row * (radial + 1),
      center = positions.length / 3;
    positions.push(...points[row === 0 ? 0 : points.length - 1]);
    for (let j = 0; j < radial; j++) {
      if (row === 0) indices.push(center, offset + j + 1, offset + j);
      else indices.push(center, offset + j, offset + j + 1);
    }
  }
  const geometry = mesh(positions, indices);
  smoothSeam(geometry, samples, radial);
  return geometry;
}

/** 石质饰叶和戟刃具有前后厚度、中央脊线及锋利轮廓。 */
export function carvedBlade(outline, depth = 0.25) {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) =>
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y),
  );
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: depth * 0.35,
    bevelSize: depth * 0.45,
    bevelSegments: 2,
    steps: 1,
    curveSegments: 5,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** 褶裥为有厚度的单片布面；两侧封边，保留真实开衩。 */
export function carvedCloth(sample, rows = 74, cols = 90, thickness = 0.13) {
  rows = Math.max(10, Math.round(rows * 0.7));
  cols = Math.max(12, Math.round(cols * 0.75));
  const positions = [],
    indices = [];
  const stride = cols + 1,
    layer = (rows + 1) * stride;
  for (let side = 0; side < 2; side++)
    for (let y = 0; y <= rows; y++)
      for (let x = 0; x <= cols; x++) {
        const p = sample(x / cols, y / rows);
        const offset = side ? -thickness : 0;
        const len = Math.hypot(p[0], p[2]) || 1;
        positions.push(
          p[0] + (offset * p[0]) / len,
          p[1],
          p[2] + (offset * p[2]) / len,
        );
      }
  for (let side = 0; side < 2; side++)
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const a = side * layer + y * stride + x,
          b = a + stride;
        if (side === 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
        else indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
  const stitch = (a, b, flip) => {
    if (flip) indices.push(a, b, a + layer, b, b + layer, a + layer);
    else indices.push(a, a + layer, b, b, a + layer, b + layer);
  };
  for (let y = 0; y < rows; y++) {
    stitch(y * stride, (y + 1) * stride, false);
    stitch(y * stride + cols, (y + 1) * stride + cols, true);
  }
  for (let x = 0; x < cols; x++) {
    stitch(x, x + 1, true);
    stitch(rows * stride + x, rows * stride + x + 1, false);
  }
  return mesh(positions, indices);
}

export function gaussian(value, center, width) {
  return Math.exp(-(((value - center) / width) ** 2));
}

function cubic(a, b, c, d, t) {
  return (
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t * t +
      (-a + 3 * b - 3 * c + d) * t * t * t)
  );
}

function mesh(positions, indices) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function smoothSeam(geometry, rows, radial) {
  const normal = geometry.attributes.normal,
    v = new THREE.Vector3();
  for (let i = 0; i <= rows; i++) {
    const a = i * (radial + 1),
      b = a + radial;
    v.set(
      normal.getX(a) + normal.getX(b),
      normal.getY(a) + normal.getY(b),
      normal.getZ(a) + normal.getZ(b),
    ).normalize();
    normal.setXYZ(a, v.x, v.y, v.z);
    normal.setXYZ(b, v.x, v.y, v.z);
  }
}
