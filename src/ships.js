import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { WORLD } from "./world_config.js";
import { createSurfaceShipImpact } from "./surface_ship_impact.js";

/**
 * 创建三艘原创船舶，真实船壳可按共享体型、速度与独立接触门槛被冲撞破坏。
 * @param {THREE.Scene} scene 主场景。
 * @param {object} options 世界遮挡查询与 onImpact/onContact 回调。
 * @returns {object} ships、colliders、onMovement、update(time, playerPosition)、reset 与 dispose。
 */
export function createShips(scene, options = {}) {
  const group = new THREE.Group();
  group.name = "surface_ships";
  scene.add(group);
  const resources = new Set();
  const keep = (resource) => {
    resources.add(resource);
    return resource;
  };
  const sailTexture = keep(makeSailTexture());
  const materials = {
    hull: keep(
      new THREE.MeshStandardMaterial({
        color: "#163b50",
        roughness: 0.27,
        metalness: 0.28,
      }),
    ),
    band: keep(
      new THREE.MeshStandardMaterial({ color: "#0c1826", roughness: 0.6 }),
    ),
    white: keep(
      new THREE.MeshStandardMaterial({ color: "#e7e6da", roughness: 0.38 }),
    ),
    glass: keep(
      new THREE.MeshStandardMaterial({
        color: "#163c48",
        roughness: 0.18,
        metalness: 0.3,
        emissive: "#2a6b7d",
        emissiveIntensity: 0.13,
      }),
    ),
    trim: keep(
      new THREE.MeshStandardMaterial({ color: "#d36b47", roughness: 0.6 }),
    ),
    pool: keep(
      new THREE.MeshStandardMaterial({
        color: "#3f9fd8",
        roughness: 0.25,
        emissive: "#1c5f8f",
        emissiveIntensity: 0.35,
      }),
    ),
    wood: keep(
      new THREE.MeshStandardMaterial({ color: "#b28c5d", roughness: 0.76 }),
    ),
    sail: keep(
      new THREE.MeshStandardMaterial({
        color: "#f5ecd2",
        map: sailTexture,
        roughness: 0.88,
        side: THREE.DoubleSide,
      }),
    ),
    sailBlue: keep(
      new THREE.MeshStandardMaterial({
        color: "#9dc6d8",
        map: sailTexture,
        roughness: 0.82,
        side: THREE.DoubleSide,
      }),
    ),
    ropes: keep(
      new THREE.LineBasicMaterial({
        color: "#2d424c",
        transparent: true,
        opacity: 0.85,
      }),
    ),
  };
  addSurfaceDetail(materials.wood, "wood", 1.0);
  addSurfaceDetail(materials.hull, "metal", 0.5);
  addSurfaceDetail(materials.white, "metal", 0.4);
  const timeUniform = { value: 0 };
  const wakeMaterial = keep(
    new THREE.ShaderMaterial({
      uniforms: { time: timeUniform },
      vertexShader: `varying vec2 vUv; varying vec3 vWorld;
      void main() { vUv = uv; vec4 p = modelMatrix * vec4(position, 1.0); vWorld = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `uniform float time; varying vec2 vUv; varying vec3 vWorld;
      void main() {
        float edge = pow(max(0.0, sin(vUv.x * 3.14159)), 0.65);
        float tail = 1.0 - smoothstep(0.4, 1.0, vUv.y);
        float streak = pow(0.5 + 0.5 * sin(vUv.y * 67.0 - time * 2.6 + sin(vUv.x * 19.0 + time * 0.2) * 2.0), 2.0);
        streak = mix(streak, 0.13, vUv.y);
        float distanceFade = exp(-distance(cameraPosition, vWorld) * 0.0035);
        gl_FragColor = vec4(0.79, 0.89, 0.84, edge * tail * streak * distanceFade * 0.53);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const configs = [
    {
      kind: "cruise",
      label: "白潮号游轮",
      length: 64,
      width: 11,
      anchor: [-76, -86],
      radiusX: 24,
      radiusZ: 59,
      phase: 0.4,
      rate: 0.011,
    },
    {
      kind: "schooner",
      label: "双桅远航帆船",
      length: 29,
      width: 6.4,
      anchor: [25, 5],
      radiusX: 22,
      radiusZ: 32,
      phase: 1.8,
      rate: 0.015,
    },
    {
      kind: "sloop",
      label: "蓝帆探索号",
      length: 21,
      width: 5.1,
      anchor: [115, -355],
      radiusX: 38,
      radiusZ: 52,
      phase: 2.6,
      rate: 0.012,
    },
  ];
  const colliders = [];
  const ships = configs.map((config) => {
    const root = new THREE.Group();
    root.name = config.kind;
    group.add(root);
    const ship = {
      ...config,
      root,
      anchor: new THREE.Vector3(
        config.anchor[0],
        WORLD.surfaceY,
        config.anchor[1],
      ),
      heading: 0,
      edible: false,
      collidable: true,
      colliders: [],
    };
    buildHull(root, ship, materials, keep);
    if (config.kind === "cruise") buildCruise(root, ship, materials, keep);
    else buildSailboat(root, ship, materials, keep);
    addShipDetails(root, ship, materials, keep);
    batchShipMeshes(root, keep);
    const wake = new THREE.Mesh(
      keep(makeWakeGeometry(config.length, config.width)),
      wakeMaterial,
    );
    wake.name = "ship_wake";
    wake.renderOrder = 2;
    root.add(wake);
    ship.wake = wake;
    // 船壳沿艏艉分段收窄，吃水只有 1.8 米；深潜可以从船底穿行。
    const hullStations = [
      [0.49, 0.64],
      [0.32, 1],
      [-0.17, 1],
      [-0.36, 0.72],
      [-0.51, 0.04],
    ];
    const addCollider = (size, position, kind = "ship_hull") => {
      const collider = {
        type: "box",
        kind,
        shipKind: ship.kind,
        x: 0,
        y: 0,
        z: 0,
        halfSize: { x: size[0] / 2, y: size[1] / 2, z: size[2] / 2 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        localPosition: new THREE.Vector3(...position),
      };
      ship.colliders.push(collider);
      colliders.push(collider);
    };
    for (let index = 1; index < hullStations.length; index++) {
      const [frontZ, frontBeam] = hullStations[index],
        [backZ, backBeam] = hullStations[index - 1];
      // 艏部较窄，以两段近似每个截面，减少看不见的矩形拐角。
      for (let half = 0; half < 2; half++) {
        const t0 = half / 2,
          t1 = (half + 1) / 2;
        const z0 = frontZ + (backZ - frontZ) * t0,
          z1 = frontZ + (backZ - frontZ) * t1;
        const beam0 = frontBeam + (backBeam - frontBeam) * t0,
          beam1 = frontBeam + (backBeam - frontBeam) * t1;
        addCollider(
          [ship.width * Math.max(beam0, beam1), 3.6, ship.length * (z1 - z0)],
          [0, 0, (ship.length * (z0 + z1)) / 2],
        );
      }
    }
    if (ship.kind === "cruise") {
      for (let deck = 0; deck < 3; deck++)
        addCollider(
          [
            ship.width * [0.83, 0.74, 0.62][deck],
            1.65,
            ship.length * (0.66 - deck * 0.075),
          ],
          [0, 2.3 + deck * 1.62, ship.length * 0.025],
          "ship_deck",
        );
      addCollider([6, 1.5, 6.8], [0, 7.2, -13], "ship_bridge");
      for (const z of [4, 11])
        addCollider([2.4, 3.3, 3.6], [0, 7.7, z], "ship_funnel");
    } else {
      addCollider(
        [ship.width * 0.53, 1.3, ship.length * 0.23],
        [0, 2.2, ship.length * 0.14],
        "ship_cabin",
      );
    }
    return ship;
  });
  const impact = createSurfaceShipImpact(scene, ships, colliders, options);
  const colliderPoint = new THREE.Vector3();
  let disposed = false;
  function update(time, playerPosition = null) {
    if (disposed) return;
    timeUniform.value = time;
    for (const ship of ships) {
      if (ship.state.destroyed) continue;
      const phase = time * ship.rate + ship.phase;
      ship.root.position.set(
        THREE.MathUtils.clamp(
          ship.anchor.x + Math.sin(phase) * ship.radiusX,
          WORLD.minX + 70,
          WORLD.maxX - 70,
        ),
        WORLD.surfaceY - 0.05 + Math.sin(time * 0.63 + ship.phase) * 0.1,
        THREE.MathUtils.clamp(
          ship.anchor.z + Math.cos(phase) * ship.radiusZ,
          WORLD.minZ + 100,
          WORLD.maxZ - 90,
        ),
      );
      ship.heading = Math.atan2(
        -Math.cos(phase) * ship.radiusX,
        Math.sin(phase) * ship.radiusZ,
      );
      ship.root.rotation.set(
        Math.sin(time * 0.48 + ship.phase) * 0.007,
        ship.heading,
        Math.sin(time * 0.39 + ship.phase) * 0.009,
      );
      ship.root.visible =
        !playerPosition ||
        (playerPosition.y > -65 &&
          ship.root.position.distanceTo(playerPosition) < 500);
    }
    impact.update(time, playerPosition);
    for (const ship of ships) {
      if (ship.state.destroyed) continue;
      ship.root.updateWorldMatrix(true, false);
      for (const collider of ship.colliders) {
        ship.root.localToWorld(colliderPoint.copy(collider.localPosition));
        collider.x = colliderPoint.x;
        collider.y = colliderPoint.y;
        collider.z = colliderPoint.z;
        collider.rotation.x = ship.root.quaternion.x;
        collider.rotation.y = ship.root.quaternion.y;
        collider.rotation.z = ship.root.quaternion.z;
        collider.rotation.w = ship.root.quaternion.w;
      }
    }
  }
  update(0);
  return {
    ships,
    colliders,
    onMovement: impact.onMovement,
    update,
    reset() {
      if (disposed) return;
      impact.reset();
      update(0);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      impact.dispose();
      scene.remove(group);
      group.traverse((node) => {
        if (node.isInstancedMesh) node.dispose();
      });
      for (const resource of resources) resource.dispose();
    },
  };
}

/*********************************************
 * 原创几何建模
 ********************************************/

function mesh(root, geometry, material, keep, position, scale) {
  const result = new THREE.Mesh(keep(geometry), material);
  if (position) result.position.set(...position);
  if (scale) result.scale.set(...scale);
  root.add(result);
  return result;
}

function box(root, material, keep, size, position) {
  return mesh(
    root,
    new RoundedBoxGeometry(
      ...size,
      2,
      Math.min(0.16, Math.min(...size) * 0.18),
    ),
    material,
    keep,
    position,
  );
}

function buildHull(root, ship, materials, keep) {
  const { length, width } = ship;
  const positions = [],
    indices = [];
  const stations = [
    [0.49, 0.64],
    [0.32, 1],
    [-0.17, 1],
    [-0.36, 0.72],
    [-0.51, 0.04],
  ];
  // 分段截面仍在原碰撞盒内，圆弧龙骨替换硬折线，法线沿船体连续。
  const profile = [
    [-1, 1.3],
    [-0.99, 0.7],
    [-0.95, 0],
    [-0.83, -0.8],
    [-0.62, -1.4],
    [-0.33, -1.72],
    [0, -1.8],
    [0.33, -1.72],
    [0.62, -1.4],
    [0.83, -0.8],
    [0.95, 0],
    [0.99, 0.7],
    [1, 1.3],
  ];
  for (const [z, beam] of stations) {
    const half = width * beam * 0.5;
    const bowLift = z < -0.35 ? 0.5 : 0;
    for (const [x, y] of profile)
      positions.push(x * half, y + bowLift * Math.max(0, y / 1.3), z * length);
  }
  const count = profile.length;
  for (let station = 0; station < stations.length - 1; station++) {
    for (let side = 0; side < count; side++) {
      const a = station * count + side,
        b = station * count + ((side + 1) % count);
      indices.push(a, a + count, b, b, a + count, b + count);
    }
  }
  for (let i = 1; i < count - 1; i++) indices.push(0, i, i + 1);
  for (let i = 1; i < count - 1; i++) {
    const a = (stations.length - 1) * count;
    indices.push(a, a + i + 1, a + i);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  mesh(root, geometry, materials.hull, keep);
  box(
    root,
    materials.white,
    keep,
    [width * 0.91, 0.35, length * 0.64],
    [0, 1.42, length * 0.03],
  );
  box(
    root,
    materials.wood,
    keep,
    [width * 0.83, 0.08, length * 0.62],
    [0, 1.63, length * 0.03],
  );
  for (const side of [-1, 1]) {
    const strip = (y, height, mat) => {
      const vertices = [],
        ids = [];
      for (const [z, beam] of stations) {
        const x = side * width * beam * 0.5 * (y > 0.5 ? 0.996 : 0.95);
        vertices.push(
          x,
          y - height / 2,
          z * length,
          x,
          y + height / 2,
          z * length,
        );
      }
      for (let i = 0; i < stations.length - 1; i++) {
        const a = i * 2;
        if (side > 0) ids.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        else ids.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const stripe = new THREE.BufferGeometry();
      stripe.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3),
      );
      stripe.setIndex(ids);
      stripe.computeVertexNormals();
      mesh(root, stripe, mat, keep);
    };
    strip(0.93, 0.16, materials.trim);
    strip(0.02, 0.28, materials.band);
  }
}

function buildCruise(root, ship, materials, keep) {
  const { length, width } = ship;
  const deckWidths = [0.83, 0.74, 0.62];
  for (let deck = 0; deck < 3; deck += 1) {
    const zLength = length * (0.66 - deck * 0.075);
    const y = 2.3 + deck * 1.62;
    box(
      root,
      materials.white,
      keep,
      [width * deckWidths[deck], 1.45, zLength],
      [0, y, length * 0.025],
    );
    box(
      root,
      materials.white,
      keep,
      [width * (deckWidths[deck] + 0.045), 0.15, zLength + 0.8],
      [0, y + 0.8, length * 0.025],
    );
  }
  const windowGeometry = keep(new THREE.BoxGeometry(0.72, 0.53, 0.035));
  const windows = new THREE.InstancedMesh(windowGeometry, materials.glass, 96);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let deck = 0; deck < 3; deck += 1) {
    for (const side of [-1, 1]) {
      for (let windowIndex = 0; windowIndex < 16; windowIndex += 1) {
        dummy.position.set(
          side * (width * deckWidths[deck] * 0.5 + 0.025),
          2.5 + deck * 1.62,
          (windowIndex - 7.5) * 1.85 + 1,
        );
        dummy.rotation.y = Math.PI / 2;
        dummy.updateMatrix();
        windows.setMatrixAt(index++, dummy.matrix);
      }
    }
  }
  root.add(windows);
  box(root, materials.white, keep, [6, 1.5, 6.8], [0, 7.2, -13]);
  box(root, materials.glass, keep, [6.2, 0.67, 0.14], [0, 7.43, -16.45]);
  // 顶层泳池、雷达罩与烟囱条纹补充游轮剪影。
  box(root, materials.white, keep, [4.85, 0.12, 6.65], [0, 6.47, -3]);
  box(root, materials.pool, keep, [4.6, 0.08, 6.4], [0, 6.53, -3]);
  mesh(
    root,
    new THREE.SphereGeometry(0.8, 10, 8),
    materials.white,
    keep,
    [0, 8.1, -14.6],
    [1, 0.72, 1],
  );
  for (const z of [4, 11]) {
    box(root, materials.trim, keep, [2.4, 3.3, 3.6], [0, 7.7, z]);
    box(root, materials.hull, keep, [2.6, 0.45, 3.9], [0, 9.3, z]);
    box(root, materials.band, keep, [2.44, 0.5, 3.64], [0, 8.6, z]);
  }
  for (const side of [-1, 1]) {
    for (const z of [-5, 3, 11]) {
      mesh(
        root,
        new THREE.SphereGeometry(1, 8, 5),
        materials.trim,
        keep,
        [side * 5.15, 3.5, z],
        [0.68, 0.62, 2.1],
      );
    }
  }
  mesh(
    root,
    new THREE.CylinderGeometry(0.07, 0.12, 4.4, 6),
    materials.white,
    keep,
    [0, 9.9, -12],
  );
  box(root, materials.white, keep, [4.5, 0.12, 0.16], [0, 10.9, -12]);
  const railPoints = [];
  for (const side of [-1, 1]) {
    const x = side * width * 0.44;
    railPoints.push(x, 2.25, -length * 0.27, x, 2.25, length * 0.33);
    for (let z = -15; z <= 19; z += 3) railPoints.push(x, 1.7, z, x, 2.25, z);
  }
  const rails = keep(new THREE.BufferGeometry());
  rails.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(railPoints, 3),
  );
  root.add(new THREE.LineSegments(rails, materials.ropes));
}

function buildSailboat(root, ship, materials, keep) {
  const { length, width, kind } = ship;
  box(
    root,
    materials.white,
    keep,
    [width * 0.53, 1.3, length * 0.23],
    [0, 2.2, length * 0.14],
  );
  box(
    root,
    materials.glass,
    keep,
    [width * 0.47, 0.5, 0.12],
    [0, 2.45, length * 0.015],
  );
  // 船体分色腰线与座舱沿口让两艘帆船在远处即可区分。
  const accent = kind === "schooner" ? materials.trim : materials.pool;
  for (const side of [-1, 1]) {
    box(
      root,
      accent,
      keep,
      [0.09, 0.2, length * 0.6],
      [side * width * 0.46, 1.16, length * 0.05],
    );
  }
  box(
    root,
    materials.wood,
    keep,
    [width * 0.4, 0.14, length * 0.16],
    [0, 1.78, -length * 0.16],
  );
  const masts =
    kind === "schooner" ? [-length * 0.14, length * 0.2] : [-length * 0.05];
  for (let index = 0; index < masts.length; index += 1) {
    const z = masts[index],
      height = length * (index ? 0.62 : 0.79);
    mesh(
      root,
      new THREE.CylinderGeometry(0.055, 0.14, height, 7),
      materials.wood,
      keep,
      [0, 1.7 + height * 0.5, z],
    );
    box(
      root,
      materials.wood,
      keep,
      [0.12, 0.12, length * 0.29],
      [0, 2.8, z + length * 0.12],
    );
    const sail = keep(
      makeSail(
        [0, height + 1.5, z],
        [0, 2.8, z + 0.1],
        [0, 2.8, z + length * (index ? 0.28 : 0.32)],
      ),
    );
    mesh(
      root,
      sail,
      kind === "sloop" ? materials.sailBlue : materials.sail,
      keep,
    );
  }
  mesh(
    root,
    makeSail(
      [0, length * 0.69, masts[0]],
      [0, 2.4, -length * 0.43],
      [0, 2.5, masts[0] - 0.2],
    ),
    materials.sail,
    keep,
  );
  const ropeGeometry = keep(new THREE.BufferGeometry());
  const points = [];
  for (const z of masts) {
    for (const side of [-1, 1])
      points.push(0, length * 0.73, z, side * width * 0.42, 1.8, z + 2);
  }
  points.push(0, length * 0.73, masts[0], 0, 1.9, -length * 0.47);
  ropeGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points, 3),
  );
  root.add(new THREE.LineSegments(ropeGeometry, materials.ropes));
}

function makeSailTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f4f0e4";
  context.fillRect(0, 0, 128, 128);
  // 帆面缝制筋线与轻微脏旧，近看不再是纯白塑料片。
  context.strokeStyle = "rgba(120,110,88,0.4)";
  context.lineWidth = 1.4;
  for (let x = 16; x < 128; x += 16) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, 128);
    context.stroke();
  }
  context.strokeStyle = "rgba(120,110,88,0.25)";
  for (let y = 32; y < 128; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(128, y);
    context.stroke();
  }
  for (let i = 0; i < 12; i += 1) {
    const x = Math.random() * 128,
      y = Math.random() * 128,
      r = 4 + Math.random() * 12;
    const gradient = context.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, "rgba(110,96,70,0.12)");
    gradient.addColorStop(1, "rgba(110,96,70,0)");
    context.fillStyle = gradient;
    context.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSail(a, b, c) {
  const positions = [],
    uvs = [],
    indices = [],
    rows = 12,
    offsets = [];
  for (let row = 0; row <= rows; row++) {
    offsets.push(positions.length / 3);
    for (let column = 0; column <= rows - row; column++) {
      const u = row / rows,
        v = column / rows,
        w = 1 - u - v;
      const billow =
        Math.sin(Math.PI * u) *
        Math.sin(Math.PI * v) *
        Math.sin(Math.PI * w) *
        1.9;
      positions.push(
        a[0] * w + b[0] * u + c[0] * v + billow,
        a[1] * w + b[1] * u + c[1] * v,
        a[2] * w + b[2] * u + c[2] * v,
      );
      uvs.push(u, v);
    }
  }
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < rows - row; column++) {
      const p = offsets[row] + column,
        q = offsets[row + 1] + column;
      indices.push(p, q, p + 1);
      if (column < rows - row - 1) indices.push(p + 1, q, q + 1);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function makeWakeGeometry(length, width) {
  const positions = [],
    uvs = [],
    indices = [];
  const ribbon = (start, end, fromWidth, toWidth) => {
    const dx = end[0] - start[0],
      dz = end[1] - start[1],
      distance = Math.hypot(dx, dz);
    const nx = dz / distance,
      nz = -dx / distance,
      offset = positions.length / 3;
    for (const [x, z, half, u, v] of [
      [start[0], start[1], -fromWidth, 0, 0],
      [start[0], start[1], fromWidth, 1, 0],
      [end[0], end[1], -toWidth, 0, 1],
      [end[0], end[1], toWidth, 1, 1],
    ]) {
      positions.push(x + nx * half, 0.22, z + nz * half);
      uvs.push(u, v);
    }
    indices.push(
      offset,
      offset + 2,
      offset + 1,
      offset + 1,
      offset + 2,
      offset + 3,
    );
  };
  ribbon([0, length * 0.45], [0, length * 1.45], width * 0.28, width * 0.66);
  for (const side of [-1, 1]) {
    ribbon(
      [side * width * 0.43, -length * 0.17],
      [side * width * 1.5, length * 0.83],
      0.18,
      1.3,
    );
    // 船艏两侧挤出的白色泡沫弧。
    ribbon(
      [0, -length * 0.47],
      [side * width * 1.05, -length * 0.08],
      0.16,
      0.95,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// 小型附着件按材质合批，不为每根栏杆、每个舷窗增加绘制调用。
function addShipDetails(root, ship, materials, keep) {
  const { length, width, kind } = ship;
  const rail = [];
  const points = [
    [0.44, 0.63],
    [0.31, 0.91],
    [-0.17, 0.91],
    [-0.35, 0.65],
    [-0.48, 0.05],
  ];
  for (const side of [-1, 1]) {
    for (let i = 0; i < points.length - 1; i++) {
      const [z0, b0] = points[i],
        [z1, b1] = points[i + 1];
      for (const y of [1.94, 2.28])
        rail.push(
          side * width * b0 * 0.5,
          y,
          z0 * length,
          side * width * b1 * 0.5,
          y,
          z1 * length,
        );
      const steps = Math.ceil(((z0 - z1) * length) / 2.2);
      for (let j = 0; j <= steps; j++) {
        const t = j / steps,
          x = side * width * (b0 + (b1 - b0) * t) * 0.5,
          z = (z0 + (z1 - z0) * t) * length;
        rail.push(x, 1.55, z, x, 2.28, z);
      }
    }
  }
  const railGeometry = keep(new THREE.BufferGeometry());
  railGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(rail, 3),
  );
  root.add(new THREE.LineSegments(railGeometry, materials.ropes));
  const frameGeometry = keep(
    new THREE.TorusGeometry(kind === "cruise" ? 0.22 : 0.16, 0.035, 5, 14),
  );
  const glassGeometry = keep(
    new THREE.CircleGeometry(kind === "cruise" ? 0.18 : 0.12, 14),
  );
  for (const side of [-1, 1])
    for (let i = 0; i < (kind === "cruise" ? 15 : 6); i++) {
      const z = length * (-0.12 + i * (kind === "cruise" ? 0.025 : 0.065));
      const frame = mesh(root, frameGeometry, materials.white, keep, [
        side * width * 0.496,
        0.7,
        z,
      ]);
      frame.rotation.y = (side * Math.PI) / 2;
      const glass = mesh(root, glassGeometry, materials.glass, keep, [
        side * width * 0.498,
        0.7,
        z,
      ]);
      glass.rotation.y = (side * Math.PI) / 2;
    }
  if (kind === "cruise") {
    const framing = keep(new THREE.BoxGeometry(0.035, 0.64, 0.84));
    const frames = new THREE.InstancedMesh(framing, materials.band, 96),
      dummy = new THREE.Object3D();
    let i = 0;
    for (let deck = 0; deck < 3; deck++)
      for (const side of [-1, 1])
        for (let window = 0; window < 16; window++) {
          dummy.position.set(
            side * (width * [0.83, 0.74, 0.62][deck] * 0.5 + 0.01),
            2.5 + deck * 1.62,
            (window - 7.5) * 1.85 + 1,
          );
          dummy.updateMatrix();
          frames.setMatrixAt(i++, dummy.matrix);
        }
    const endWindows = new THREE.InstancedMesh(
      keep(new THREE.BoxGeometry(0.7, 0.5, 0.045)),
      materials.glass,
      36,
    );
    let endIndex = 0;
    for (let deck = 0; deck < 3; deck++)
      for (const side of [-1, 1])
        for (let window = 0; window < 6; window++) {
          dummy.position.set(
            (window - 2.5) * 0.96,
            2.5 + deck * 1.62,
            length * 0.025 +
              side * (length * (0.66 - deck * 0.075) * 0.5 + 0.025),
          );
          dummy.updateMatrix();
          endWindows.setMatrixAt(endIndex++, dummy.matrix);
        }
    root.add(endWindows);
    root.add(frames);
    // 顶层日光甲板及躺椅保持在既有甲板轮廓里。
    box(
      root,
      materials.wood,
      keep,
      [width * 0.6, 0.025, length * 0.47],
      [0, 6.427, length * 0.025],
    );
    for (const side of [-1, 1])
      for (const z of [-6, -3, 0, 3]) {
        box(
          root,
          materials.white,
          keep,
          [0.68, 0.09, 1.6],
          [side * 2.45, 6.49, z],
        );
        const back = box(
          root,
          materials.wood,
          keep,
          [0.58, 0.06, 0.72],
          [side * 2.45, 6.72, z + 0.48],
        );
        back.rotation.x = -0.45;
      }
  } else {
    for (const side of [-1, 1])
      for (const z of [-length * 0.24, length * 0.25])
        mesh(
          root,
          new THREE.TorusGeometry(0.22, 0.065, 6, 18),
          materials.white,
          keep,
          [side * width * 0.38, 1.87, z],
        ).rotation.y = Math.PI / 2;
    for (const side of [-1, 1])
      mesh(
        root,
        new THREE.CylinderGeometry(0.14, 0.18, 0.3, 12),
        materials.band,
        keep,
        [side * width * 0.27, 1.85, length * 0.22],
      );
  }
}

function batchShipMeshes(root, keep) {
  const groups = new Map();
  for (const child of root.children) {
    if (!child.isMesh || child.isInstancedMesh) continue;
    if (!groups.has(child.material)) groups.set(child.material, []);
    groups.get(child.material).push(child);
  }
  for (const [material, children] of groups) {
    const geometries = children.map((child) => {
      child.updateMatrix();
      const g = child.geometry.index
        ? child.geometry.toNonIndexed()
        : child.geometry.clone();
      g.applyMatrix4(child.matrix);
      if (!material.map) g.deleteAttribute("uv");
      return g;
    });
    const merged = keep(mergeGeometries(geometries));
    for (const g of geometries) g.dispose();
    for (const child of children) root.remove(child);
    const batch = new THREE.Mesh(merged, material);
    batch.name = "ship_detail_batch";
    root.add(batch);
  }
}
