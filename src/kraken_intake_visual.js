import * as THREE from "three";

const CENTER_Y = 0.015;
const fleshMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.58,
  side: THREE.DoubleSide,
});
const beakMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.4,
  side: THREE.DoubleSide,
});
let oralGeometry, beakGeometry;

/** 移除固定的小喙和被新口腔覆盖的前端皮肤；不修改外套、腕足和承重截面。 */
export function openKrakenOralSocket(geometry) {
  const p = geometry.attributes.position,
    indices = geometry.index.array,
    kept = [];
  for (let i = 0; i < indices.length; i += 3) {
    let x = 0,
      y = 0,
      z = 0;
    for (let j = 0; j < 3; j++) {
      const id = indices[i + j];
      x += p.getX(id) / 3;
      y += p.getY(id) / 3;
      z += p.getZ(id) / 3;
    }
    if (
      z > -0.12 &&
      z < 0.012 &&
      y > -0.032 &&
      ((x / 0.066) ** 2 + ((y - CENTER_Y) / 0.05) ** 2 < 1 ||
        (Math.abs(x) < 0.035 && y > 0.035 && y < 0.085 && z < -0.018))
    )
      continue;
    kept.push(indices[i], indices[i + 1], indices[i + 2]);
  }
  geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(kept), 1));
}

function makeOralGeometry() {
  const positions = [],
    open = [],
    colors = [],
    indices = [],
    sides = 48;
  const rings = [
    [0.102, 0.076, 0.012, 0],
    [0.09, 0.066, -0.022, 0],
    [0.074, 0.054, -0.057, 0.008],
    [0.054, 0.039, -0.061, 0.016],
    [0.036, 0.028, -0.035, 0.01],
    [0.018, 0.014, 0.005, 0.004],
    [0.001, 0.001, 0.028, 0],
  ];
  const palette = [
    0x49372d, 0x593c32, 0x654339, 0x392020, 0x211316, 0x100a0d, 0x08080c,
  ];
  const rows = 24;
  const sample = (t, component) => {
    const k = Math.min(rings.length - 2, Math.floor(t)),
      u = t - k;
    const p0 = rings[Math.max(0, k - 1)][component],
      p1 = rings[k][component],
      p2 = rings[k + 1][component],
      p3 = rings[Math.min(rings.length - 1, k + 2)][component];
    return (
      p1 +
      0.5 *
        u *
        (p2 -
          p0 +
          u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)))
    );
  };
  for (let row = 0; row <= rows; row++) {
    const t = (row / rows) * (rings.length - 1),
      rx = sample(t, 0),
      ry = sample(t, 1),
      z = sample(t, 2),
      expand = sample(t, 3);
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2,
        grain =
          Math.sin(angle * 17 + row * 1.37) * Math.cos(angle * 11 - row * 1.71),
        fold = 1 + Math.cos(angle * 9 + Math.sin(angle * 3)) * 0.012,
        bump = grain * 0.0008 * Math.sin((row / rows) * Math.PI);
      positions.push(
        Math.cos(angle) * rx * fold,
        CENTER_Y + Math.sin(angle) * ry * fold,
        z + bump,
      );
      open.push(
        Math.cos(angle) * (rx + expand) * fold,
        CENTER_Y + Math.sin(angle) * (ry + expand * 0.8) * fold,
        z + bump,
      );
      const k = Math.min(palette.length - 2, Math.floor(t));
      const color = new THREE.Color(palette[k])
        .lerp(new THREE.Color(palette[k + 1]), t - k)
        .multiplyScalar(0.86 + grain * 0.13 + 0.1 * Math.cos(angle * 9));
      colors.push(color.r, color.g, color.b);
      if (row && i) {
        const a = (row - 1) * (sides + 1) + i - 1,
          b = a + sides + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  const expanded = g.clone();
  expanded.setAttribute("position", new THREE.Float32BufferAttribute(open, 3));
  expanded.computeVertexNormals();
  g.morphAttributes.position = [expanded.attributes.position.clone()];
  g.morphAttributes.normal = [expanded.attributes.normal.clone()];
  expanded.dispose();
  return g;
}

function makeBeakGeometry() {
  const positions = [],
    colors = [],
    indices = [],
    rows = 12,
    sides = 24;
  for (let layer = 0; layer < 2; layer++)
    for (let row = 0; row <= rows; row++) {
      const u = row / rows,
        taper = Math.pow(Math.max(0.002, 1 - u), 0.65);
      for (let i = 0; i <= sides; i++) {
        const a = (i / sides) * Math.PI,
          thickness = layer ? 0.004 * (1 - u) : 0;
        const ridge = 1 + Math.cos(a * 4) * 0.008;
        positions.push(
          Math.cos(a) * (0.052 * taper - thickness) * ridge,
          Math.sin(a) * (0.032 * taper - thickness) * ridge - u * u * 0.014,
          -0.074 * u + (layer ? 0.003 : 0),
        );
        const c = new THREE.Color(layer ? 0x30221c : 0x443124);
        if (!layer)
          c.lerp(new THREE.Color(0x1b1011), u * 0.75).multiplyScalar(
            0.9 + 0.1 * Math.sin(a),
          );
        colors.push(c.r, c.g, c.b);
        if (row && i) {
          const a0 =
              layer * (rows + 1) * (sides + 1) +
              (row - 1) * (sides + 1) +
              i -
              1,
            b = a0 + sides + 1;
          if (layer) indices.push(a0, b, a0 + 1, a0 + 1, b, b + 1);
          else indices.push(a0, a0 + 1, b, a0 + 1, b + 1, b);
        }
      }
    }
  const offset = (rows + 1) * (sides + 1);
  for (let row = 0; row < rows; row++)
    for (const side of [0, sides]) {
      const a = row * (sides + 1) + side,
        b = a + sides + 1;
      indices.push(a, b, a + offset, b, b + offset, a + offset);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** 独立口器和水流实例；只读取实际缠腕/绞咬事件，不写入角色位移或伤害。 */
export function createKrakenIntake(parent) {
  oralGeometry ??= makeOralGeometry();
  beakGeometry ??= makeBeakGeometry();
  const cavity = new THREE.Mesh(oralGeometry, fleshMaterial);
  cavity.name = "kraken_folded_oral_cavity";
  cavity.userData.keepSeparate = true;
  parent.add(cavity);
  const jaws = [1, -1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0, CENTER_Y, -0.034);
    pivot.name =
      side > 0 ? "kraken_upper_beak_pivot" : "kraken_lower_beak_pivot";
    const mesh = new THREE.Mesh(beakGeometry, beakMaterial);
    mesh.name =
      side > 0 ? "kraken_upper_hooked_beak" : "kraken_lower_hooked_beak";
    mesh.userData.keepSeparate = true;
    if (side < 0) {
      mesh.rotation.z = Math.PI;
      mesh.scale.setScalar(0.9);
    }
    pivot.add(mesh);
    parent.add(pivot);
    return pivot;
  });
  const segments = 8,
    streams = 8,
    flowGeometry = new THREE.BufferGeometry();
  const points = new Float32Array(streams * segments * 18),
    tint = new Float32Array(points.length);
  flowGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(points, 3).setUsage(THREE.DynamicDrawUsage),
  );
  flowGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(tint, 3).setUsage(THREE.DynamicDrawUsage),
  );
  const flowMaterial = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  const flow = new THREE.Mesh(flowGeometry, flowMaterial);
  flow.name = "kraken_inward_water_ribbons";
  flow.userData.keepSeparate = true;
  flow.userData.visualOnly = true;
  flow.frustumCulled = false;
  flow.visible = false;
  parent.add(flow);
  const direction = new THREE.Vector3(),
    right = new THREE.Vector3(),
    up = new THREE.Vector3(),
    p = new THREE.Vector3(),
    q = new THREE.Vector3(),
    r = new THREE.Vector3();
  const mouth = new THREE.Vector3(0, CENTER_Y, -0.075),
    target = new THREE.Vector3();
  let clock = 0,
    biteAge = Infinity,
    driven = false,
    disposed = false;
  const state = { opening: 0, biting: false, held: false, biteAge: Infinity };
  function pose(opening) {
    state.opening = opening;
    cavity.morphTargetInfluences[0] = opening;
    jaws[0].rotation.x = 0.1 + opening * 0.85;
    jaws[1].rotation.x = -0.07 - opening * 0.8;
  }
  function water(phase, worldTarget) {
    parent.updateWorldMatrix(true, false);
    target.copy(worldTarget);
    parent.worldToLocal(target);
    direction.copy(target).sub(mouth);
    const reach = THREE.MathUtils.clamp(direction.length(), 0.18, 0.55);
    if (direction.lengthSq() < 1e-8) direction.set(0, 0, -1);
    else direction.normalize();
    up.set(0, 1, 0);
    if (Math.abs(up.dot(direction)) > 0.95) up.set(1, 0, 0);
    right.crossVectors(direction, up).normalize();
    up.crossVectors(right, direction).normalize();
    const at = (u, angle, result) =>
      result
        .copy(mouth)
        .addScaledVector(direction, 0.05 + u * reach)
        .addScaledVector(right, Math.cos(angle + u * 4.2) * (0.012 + u * 0.075))
        .addScaledVector(up, Math.sin(angle + u * 4.2) * (0.012 + u * 0.075));
    let cursor = 0;
    for (let i = 0; i < streams; i++)
      for (let j = 0; j < segments; j++) {
        const u = (((j / segments + i * 0.071 - phase * 0.9) % 1) + 1) % 1;
        const angle = (i / streams) * Math.PI * 2,
          width = 0.001 + u * 0.0025;
        at(u, angle, p);
        at(Math.min(1, u + 0.065), angle, q);
        r.copy(right).multiplyScalar(width);
        const strength = Math.sin(Math.PI * u) * 0.72;
        for (let vertex = 0; vertex < 6; vertex++) {
          const base = vertex === 0 || vertex === 1 || vertex === 3 ? p : q;
          const sign = vertex === 1 || vertex === 3 || vertex === 4 ? 1 : -1;
          points[cursor] = base.x + r.x * sign;
          points[cursor + 1] = base.y + r.y * sign;
          points[cursor + 2] = base.z + r.z * sign;
          tint[cursor] = strength * 0.55;
          tint[cursor + 1] = strength * 0.8;
          tint[cursor + 2] = strength;
          cursor += 3;
        }
      }
    flowGeometry.attributes.position.needsUpdate = true;
    flowGeometry.attributes.color.needsUpdate = true;
  }
  function reset() {
    clock = 0;
    biteAge = Infinity;
    driven = false;
    state.biting = false;
    state.held = false;
    state.biteAge = Infinity;
    flow.visible = false;
    pose(0.08);
  }
  reset();
  return {
    cavity,
    jaws,
    flow,
    state,
    idle(phase, grip = 0) {
      if (!driven) pose(0.08 + Math.sin(phase * 0.4) * 0.025 + grip * 0.75);
    },
    update(
      dt,
      { active = false, held = false, bite = false, target: worldTarget } = {},
    ) {
      driven = true;
      clock += Math.max(0, dt);
      biteAge = bite ? 0 : biteAge + Math.max(0, dt);
      let opening = held ? 1 : active ? 0.6 : 0.08;
      if (biteAge < 0.65) {
        opening =
          biteAge < 0.12
            ? 1 - THREE.MathUtils.smoothstep(biteAge, 0, 0.12)
            : biteAge < 0.28
              ? 0
              : THREE.MathUtils.smoothstep(biteAge, 0.28, 0.65) * 0.08;
      }
      state.biting = biteAge < 0.65;
      state.biteAge = biteAge;
      state.held = held;
      pose(
        state.biting
          ? opening
          : THREE.MathUtils.damp(state.opening, opening, 12, Math.max(0, dt)),
      );
      flow.visible = held && !!worldTarget && biteAge >= 0.65;
      if (flow.visible) water(clock, worldTarget);
    },
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      flowGeometry.dispose();
      flowMaterial.dispose();
    },
  };
}
