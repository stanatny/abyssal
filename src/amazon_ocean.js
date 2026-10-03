import * as THREE from "three";
import {
  amazonSeabedHeight,
  amazonSurfaceHeight,
  amazonIslandBounds,
  amazonChannels,
  AMAZON_WORLD as W,
  AMAZON_BIOMES,
} from "./amazon_config.js";
import { createAmazonForestSteps, broadLeafGeometry } from "./amazon_forest.js";
import { createAmazonIslandSteps } from "./amazon_island.js";
import { createAmazonRiverbedSteps } from "./amazon_riverbed.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import {
  finishScenePreparation,
  prepareScene,
  constructionScope,
} from "./scene_preparation.js";

/** 亚马逊河床、陆地屏障与独立雨林；异步入口逐批让出主线程。 */
export function createAmazonOcean(parent) {
  return finishScenePreparation(createAmazonOceanSteps(parent));
}
export function createAmazonOceanAsync(parent, options) {
  return prepareScene(createAmazonOceanSteps(parent), options);
}
export function* createAmazonOceanSteps(parent) {
  const root = new THREE.Group();
  root.name = "amazon_river_environment";
  parent.add(root);
  const resources = new Set(),
    scope = constructionScope(root, resources),
    keep = (r) => (resources.add(r), r);
  const colliders = [],
    time = { value: 0 };
  let disposed = false;
  const floorMaterial = keep(
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98 }),
  );
  addSurfaceDetail(floorMaterial, "stone", 0.25);
  try {
    for (let z = W.minZ; z < W.maxZ; z += 65) {
      const size = Math.min(65, W.maxZ - z),
        geometry = keep(
          new THREE.PlaneGeometry(960, size, 240, Math.ceil(size / 3)),
        );
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0, z + size / 2);
      const p = geometry.attributes.position,
        colors = [],
        sand = new THREE.Color("#a5986e"),
        mud = new THREE.Color("#61563e"),
        land = new THREE.Color("#665b39"),
        c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i),
          zz = p.getZ(i),
          y = amazonSeabedHeight(x, zz);
        p.setY(i, y);
        c.copy(y > 4 ? land : sand).lerp(
          mud,
          (Math.sin(x * 0.04 + zz * 0.06) + 1) * 0.18 + (y < -170 ? 0.25 : 0),
        );
        if (y > -45 && y < 12)
          c.multiplyScalar(
            0.78 + Math.sin(y * 0.36 + Math.sin(zz * 0.1)) * 0.12,
          );
        c.toArray(colors, colors.length);
      }
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3),
      );
      geometry.computeVertexNormals();
      const floorMesh = new THREE.Mesh(geometry, floorMaterial);
      floorMesh.name = "river_lowest_floor";
      root.add(floorMesh);
      yield "riverbed";
    }
    // 外岸保留实心代理；中央岛的顶盖使用独立薄层碰撞，岛下可通行。
    for (let z = W.minZ + 4; z < W.maxZ; z += 8) {
      let start = null;
      for (let x = W.minX - 8; x <= W.maxX + 8; x += 4) {
        const channels = amazonChannels(z);
        const underIsland =
          amazonIslandBounds(z) &&
          x > channels[0].center &&
          x < channels[1].center;
        const solid = !underIsland && amazonSurfaceHeight(x, z) > 2;
        if (solid && start === null) start = x;
        if ((!solid || x === W.maxX + 8) && start !== null) {
          const end = x,
            half = (end - start) * 0.5;
          if (half > 1)
            colliders.push({
              type: "box",
              kind: "river_bank",
              x: start + half,
              y: -270,
              z,
              halfSize: { x: half, y: 304, z: 4.1 },
            });
          start = null;
        }
      }
    }
    yield "solid-river-banks";
    yield* createAmazonIslandSteps(root, resources, colliders);
    const forest = yield* createAmazonForestSteps(root, resources, colliders);
    const riverbed = yield* createAmazonRiverbedSteps(
      root,
      resources,
      colliders,
    );
    const plantMat = keep(
      new THREE.MeshStandardMaterial({
        color: "#587b39",
        roughness: 0.86,
        side: THREE.DoubleSide,
      }),
    );
    const waterMat = keep(
      new THREE.MeshStandardMaterial({
        color: "#547258",
        transparent: true,
        opacity: 0.53,
        roughness: 0.34,
        metalness: 0.06,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    waterMat.onBeforeCompile = (shader) => {
      shader.uniforms.riverTime = time;
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float riverTime;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\ntransformed.z += sin(position.x * 0.09 + riverTime * 1.4) * 0.15;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nuniform float riverTime;",
        )
        .replace(
          "#include <normal_fragment_begin>",
          "#include <normal_fragment_begin>\nnormal.x += sin(vViewPosition.x * 0.24 + riverTime * 1.2) * 0.09; normal.z += cos(vViewPosition.z * 0.21 + riverTime) * 0.06; normal = normalize(normal);",
        );
    };
    waterMat.customProgramCacheKey = () => "amazon_river_water_v1";
    const water = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(940, W.maxZ - W.minZ + 80, 32, 48)),
      waterMat,
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, W.surfaceY, (W.minZ + W.maxZ) * 0.5);
    root.add(water);
    const dummy = new THREE.Object3D(),
      leaf = keep(broadLeafGeometry(1, 0.26)),
      lilies = keep(new THREE.CircleGeometry(1, 22, 0.14, Math.PI * 2 - 0.3));
    const grasses = new THREE.InstancedMesh(leaf, plantMat, 900),
      pads = new THREE.InstancedMesh(lilies, plantMat, 230);
    let count = 0;
    for (let i = 0; i < 900; i++) {
      const z = 115 - ((i * 73.97) % 1380),
        channel = amazonChannels(z)[i % 2],
        x =
          channel.center +
          (i % 4 < 2 ? -1 : 1) * channel.halfWidth * (0.6 + (i % 9) * 0.017),
        y = amazonSeabedHeight(x, z);
      dummy.position.set(x, y + 0.5, z);
      dummy.rotation.set(-1.05, i * 2.399, 0.25);
      dummy.scale.set(1.5, 1, 3 + (i % 5));
      dummy.updateMatrix();
      grasses.setMatrixAt(i, dummy.matrix);
      if (count < 230 && y > -80) {
        dummy.position.y = 4.06;
        dummy.rotation.set(-Math.PI / 2, 0, i * 2.399);
        dummy.scale.setScalar(0.9 + (i % 5) * 0.25);
        dummy.updateMatrix();
        pads.setMatrixAt(count++, dummy.matrix);
      }
    }
    pads.count = count;
    grasses.computeBoundingSphere();
    pads.computeBoundingSphere();
    root.add(grasses, pads);
    yield "river-plants";
    const sediment = keep(new THREE.BufferGeometry()),
      points = [];
    for (let i = 0; i < 380; i++)
      points.push(
        Math.sin(i * 27.14) * 80,
        -Math.abs(Math.cos(i * 3.4)) * 90,
        Math.cos(i * 17.8) * 80,
      );
    sediment.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(points, 3),
    );
    const motes = new THREE.Points(
      sediment,
      keep(
        new THREE.PointsMaterial({
          color: "#b0a97b",
          size: 0.14,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        }),
      ),
    );
    root.add(motes);
    const radarPaths = [-1, 1].map((side) => {
      const points = [[0, 75]];
      for (let z = -135; z > -1200; z -= 20) {
        const ch = amazonChannels(z).find((c) => c.side === side);
        points.push([ch.center, z]);
      }
      points.push([0, -1270]);
      return points;
    });
    for (const z of [-330, -650, -940]) {
      const channels = amazonChannels(z);
      radarPaths.push([
        [channels[0].center, z],
        [0, z],
        [channels[1].center, z],
      ]);
    }
    return scope.finish({
      root,
      rewardAnchor(random = Math.random) {
        const z = -190 - random() * 1050,
          channel = amazonChannels(z)[random() < 0.5 ? 0 : 1],
          x = channel.center + (random() - 0.5) * 35;
        const depth = Math.min(
          -amazonSeabedHeight(x, z) - 12,
          28 + random() * 180,
        );
        return new THREE.Vector3(x, -depth, z);
      },
      colliders,
      navigationColliders: colliders,
      barriers: [],
      obstacles: [],
      heightAt: amazonSeabedHeight,
      landmarks: AMAZON_BIOMES.map((b) => ({
        name: b.name,
        position: new THREE.Vector3(...b.anchor),
      })),
      radarPaths,
      update(t, position) {
        time.value = t;
        forest.update(t, position);
        riverbed.update(t, position);
        motes.position.copy(position);
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        root.removeFromParent();
        root.traverse((n) => {
          if (n.isInstancedMesh) n.dispose();
        });
        for (const r of resources) r.dispose();
        resources.clear();
        colliders.length = 0;
        root.clear();
      },
    });
  } finally {
    scope.close();
  }
}
