import * as THREE from "three";
import { acquireHawaiiShipAsset } from "./hawaii_ship_asset.js";
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
    const asset = acquireHawaiiShipAsset(config.kind);
    const body = new THREE.Mesh(asset.geometry, asset.material);
    body.name = `${config.kind}_hf_body`;
    body.scale.setScalar(config.length);
    root.add(body);
    if (asset.riggingGeometry) {
      const rigging = new THREE.Mesh(
        asset.riggingGeometry,
        asset.riggingMaterial,
      );
      rigging.name = `${config.kind}_continuous_rigging`;
      rigging.scale.setScalar(config.length);
      root.add(rigging);
    }
    root.userData.artRevision = "hawaii-surface-ships-hf-20261020";
    root.userData.prepareMaterials = asset.prepare;
    root.userData.shipArt = { body };
    ship.releaseArt = asset.release;
    asset.prepare();
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
      for (const ship of ships) ship.releaseArt();
      for (const resource of resources) resource.dispose();
    },
  };
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
