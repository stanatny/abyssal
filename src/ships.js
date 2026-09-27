import * as THREE from "three";
import { WORLD } from "./world_config.js";

/**
 * 创建三艘原创程序化环境船舶；船壳和上层建筑参与实体碰撞，不参与伤害或捕食。
 * 返回 ships 元数据、有限高度 colliders、update(time, playerPosition)、reset 与 dispose。
 */
export function createShips(scene) {
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
        color: "#1b4258",
        roughness: 0.48,
        metalness: 0.2,
      }),
    ),
    band: keep(
      new THREE.MeshStandardMaterial({ color: "#0c1826", roughness: 0.6 }),
    ),
    white: keep(
      new THREE.MeshStandardMaterial({ color: "#f0ead9", roughness: 0.6 }),
    ),
    glass: keep(
      new THREE.MeshStandardMaterial({
        color: "#0d415c",
        roughness: 0.18,
        metalness: 0.3,
        emissive: "#2a6b7d",
        emissiveIntensity: 0.5,
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
      new THREE.MeshStandardMaterial({ color: "#6e5a38", roughness: 0.8 }),
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
        float streak = 0.48 + 0.52 * sin(vUv.y * 57.0 - time * 2.1 + sin(vUv.x * 23.0));
        float distanceFade = exp(-distance(cameraPosition, vWorld) * 0.0035);
        gl_FragColor = vec4(0.82, 0.99, 0.97, edge * tail * streak * distanceFade * 0.5);
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
  function update(time, playerPosition = null) {
    timeUniform.value = time;
    for (const ship of ships) {
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
      ship.root.updateWorldMatrix(true, false);
      for (const collider of ship.colliders) {
        const point = ship.root.localToWorld(collider.localPosition.clone());
        collider.x = point.x;
        collider.y = point.y;
        collider.z = point.z;
        collider.rotation.x = ship.root.quaternion.x;
        collider.rotation.y = ship.root.quaternion.y;
        collider.rotation.z = ship.root.quaternion.z;
        collider.rotation.w = ship.root.quaternion.w;
      }
      ship.root.visible =
        !playerPosition ||
        (playerPosition.y > -65 &&
          ship.root.position.distanceTo(playerPosition) < 500);
    }
  }
  update(0);
  return {
    ships,
    colliders,
    update,
    reset() {
      update(0);
    },
    dispose() {
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
  return mesh(root, new THREE.BoxGeometry(...size), material, keep, position);
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
  for (const [z, beam] of stations) {
    const half = width * beam * 0.5;
    const bowLift = z < -0.35 ? 0.5 : 0;
    positions.push(
      -half,
      1.3 + bowLift,
      z * length,
      -half * 0.88,
      -0.5,
      z * length,
      -half * 0.55,
      -1.8,
      z * length,
      half * 0.55,
      -1.8,
      z * length,
      half * 0.88,
      -0.5,
      z * length,
      half,
      1.3 + bowLift,
      z * length,
    );
  }
  for (let station = 0; station < stations.length - 1; station += 1) {
    for (let side = 0; side < 6; side += 1) {
      const a = station * 6 + side,
        b = station * 6 + ((side + 1) % 6),
        c = a + 6,
        d = b + 6;
      indices.push(a, c, b, b, c, d);
    }
  }
  indices.push(0, 1, 5, 1, 4, 5, 1, 2, 4, 2, 3, 4);
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
    box(
      root,
      materials.trim,
      keep,
      [0.1, 0.26, length * 0.52],
      [side * width * 0.47, 0.88, length * 0.06],
    );
    box(
      root,
      materials.band,
      keep,
      [0.12, 0.62, length * 0.86],
      [side * width * 0.44, -0.05, length * 0.02],
    );
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
  box(root, materials.pool, keep, [4.6, 0.2, 6.4], [0, 7.28, 9]);
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
  const center = [
    (a[0] + b[0] + c[0]) / 3 + 0.8,
    (a[1] + b[1] + c[1]) / 3,
    (a[2] + b[2] + c[2]) / 3,
  ];
  const points = [a, b, c, center];
  const ys = points.map((p) => p[1]),
    zs = points.map((p) => p[2]);
  const minY = Math.min(...ys),
    rangeY = Math.max(...ys) - minY || 1;
  const minZ = Math.min(...zs),
    rangeZ = Math.max(...zs) - minZ || 1;
  const uvs = points.flatMap((p) => [
    (p[2] - minZ) / rangeZ,
    (p[1] - minY) / rangeY,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([...a, ...b, ...c, ...center], 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex([0, 1, 3, 1, 2, 3, 2, 0, 3]);
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
