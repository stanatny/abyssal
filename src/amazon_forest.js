import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  amazonChannels,
  amazonSurfaceHeight,
  AMAZON_WORLD as W,
} from "./amazon_config.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 分块雨林、板根和淹没木材；资源归地图所有，动画仅更新共享时间。 */
export function* createAmazonForestSteps(parent, resources, colliders) {
  const keep = (r) => (resources.add(r), r);
  const root = new THREE.Group();
  root.name = "amazon_rainforest";
  parent.add(root);
  const wood = keep(
    new THREE.MeshStandardMaterial({ color: "#685a39", roughness: 0.94 }),
  );
  const leaf = keep(
    new THREE.MeshStandardMaterial({
      color: "#427633",
      roughness: 0.81,
      side: THREE.DoubleSide,
    }),
  );
  addSurfaceDetail(wood, "wood", 0.4);
  const time = { value: 0 };
  const baseCompile = leaf.onBeforeCompile;
  leaf.onBeforeCompile = (shader) => {
    baseCompile?.(shader);
    shader.uniforms.forestTime = time;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform float forestTime;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.x += sin(forestTime * 0.8 + position.z * 0.2) * 0.17 * max(0.0, position.y - 12.0);",
      );
  };
  leaf.customProgramCacheKey = () => "amazon_canopy_v2";
  const trunkParts = [],
    foliage = [];
  const segment = (a, b, ra, rb) => {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b),
      direction = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(rb, ra, direction.length(), 8, 3);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      ),
    );
    g.translate(...from.add(to).multiplyScalar(0.5).toArray());
    trunkParts.push(g);
  };
  segment([0, 0, 0], [0.6, 22, 0.4], 1.6, 0.55);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.399,
      dx = Math.cos(angle),
      dz = Math.sin(angle);
    segment([dx * 6, 0.1, dz * 6], [dx * 0.8, 7.5, dz * 0.8], 0.15, 0.58);
    segment(
      [0.4, 16 + (i % 3), 0.2],
      [dx * 10, 22 + (i % 3) * 2, dz * 10],
      0.65,
      0.14,
    );
    for (let j = 0; j < 18; j++) {
      const a = angle + j * 0.8,
        r = 3 + (j % 5) * 2;
      const g = broadLeafGeometry(7.5, 2.5);
      g.rotateZ(((j % 3) - 1) * 0.16);
      g.rotateY(a);
      g.translate(
        dx * 4 + Math.cos(a) * r,
        19 + Math.sin(j * 2) * 5 + (j % 3) * 2,
        dz * 4 + Math.sin(a) * r,
      );
      foliage.push(g);
    }
  }
  // 绳状藤蔓从分枝垂落；同树干合并，避免为每条藤增加绘制。
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const vine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 6, 23, Math.sin(a) * 6),
      new THREE.Vector3(Math.cos(a) * 7, 14, Math.sin(a) * 7),
      new THREE.Vector3(Math.cos(a) * 5, 4 + (i % 3), Math.sin(a) * 5),
    ]);
    trunkParts.push(new THREE.TubeGeometry(vine, 10, 0.09, 4, false));
  }
  const underParts = [];
  for (let i = 0; i < 26; i++) {
    const g = broadLeafGeometry(4.8, 1.15);
    g.rotateX(-0.65 + (i % 3) * 0.13);
    g.rotateY(i * 2.399);
    g.translate(
      Math.cos(i * 1.3) * 4,
      0.4 + (i % 4) * 0.7,
      Math.sin(i * 1.3) * 4,
    );
    underParts.push(g);
  }
  const understory = keep(mergeGeometries(underParts));
  underParts.forEach((g) => g.dispose());
  const trunk = keep(mergeGeometries(trunkParts)),
    crown = keep(mergeGeometries(foliage));
  trunkParts.forEach((g) => g.dispose());
  foliage.forEach((g) => g.dispose());
  const chunks = [],
    dummy = new THREE.Object3D();
  let seed = 74523;
  const rand = () => (seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296;
  for (let z = W.minZ; z < W.maxZ; z += 100) {
    for (let x = W.minX - 30; x < W.maxX + 30; x += 100) {
      const placements = [];
      for (let i = 0; i < 20; i++) {
        const px = x + rand() * 100,
          pz = z + rand() * 100,
          y = amazonSurfaceHeight(px, pz);
        if (y < 6) continue;
        placements.push([
          px,
          y - 0.2,
          pz,
          0.65 + rand() * 1.2,
          rand() * Math.PI * 2,
        ]);
      }
      if (!placements.length) continue;
      const group = new THREE.Group();
      group.name = "rainforest_chunk";
      root.add(group);
      for (const [geo, mat] of [
        [trunk, wood],
        [crown, leaf],
        [understory, leaf],
      ]) {
        const instances = new THREE.InstancedMesh(geo, mat, placements.length);
        placements.forEach(([px, y, pz, size, yaw], i) => {
          dummy.position.set(px, y, pz);
          dummy.rotation.set(0, yaw, 0);
          dummy.scale.set(size * 0.9, size, size * 0.9);
          dummy.updateMatrix();
          instances.setMatrixAt(i, dummy.matrix);
          instances.setColorAt(
            i,
            new THREE.Color().setHSL(
              mat === leaf ? 0.27 + rand() * 0.055 : 0.095,
              mat === leaf ? 0.36 : 0.22,
              0.5 + rand() * 0.2,
            ),
          );
        });
        instances.computeBoundingSphere();
        group.add(instances);
      }
      chunks.push({ root: group, x: x + 50, z: z + 50 });
    }
    yield "rainforest-canopy";
  }
  const submerged = new THREE.Group();
  submerged.name = "flooded_buttress_roots";
  root.add(submerged);
  const rootParts = [],
    rockParts = [];
  const rockMaterial = keep(
    new THREE.MeshStandardMaterial({ color: "#8f7251", roughness: 0.96 }),
  );
  addSurfaceDetail(rockMaterial, "stone", 0.7);
  for (let index = 0; index < 28; index++) {
    const z = -185 - index * 39;
    for (const channel of amazonChannels(z)) {
      const edge =
        channel.center + (index % 2 ? 1 : -1) * channel.halfWidth * 1.02;
      const ground = amazonSurfaceHeight(edge, z);
      const start = new THREE.Vector3(
        edge + (index % 2 ? 7 : -7),
        Math.max(8, ground) + 4,
        z,
      );
      const points = [
        start,
        new THREE.Vector3(edge, Math.max(3, ground) - 3, z - 7),
        new THREE.Vector3(
          edge + (index % 2 ? -10 : 10),
          Math.max(-24, ground - 20),
          z - 14,
        ),
      ];
      const curve = new THREE.CatmullRomCurve3(points);
      const g = new THREE.TubeGeometry(
        curve,
        14,
        0.9 + (index % 3) * 0.3,
        7,
        false,
      );
      rootParts.push(keep(g));
      let previous = curve.getPoint(0);
      for (let i = 1; i <= 8; i++) {
        const point = curve.getPoint(i / 8);
        colliders.push({
          type: "capsule",
          kind: "flooded_root",
          a: previous.clone(),
          b: point.clone(),
          radius: 1.0 + (index % 3) * 0.3,
        });
        previous = point;
      }
      // 礁状河石只沿坡脚出现，主河道保持宽敞。
      const rock = new THREE.IcosahedronGeometry(1, 2);
      rock.scale(4 + (index % 4), 2.5, 5);
      rock.translate(edge, ground + 1, z + 9);
      rockParts.push(keep(rock));
      colliders.push({
        type: "ellipsoid",
        x: edge,
        y: ground + 1,
        z: z + 9,
        axes: { x: 4 + (index % 4), y: 2.5, z: 5 },
      });
    }
    if (index % 4 === 3) yield "flooded-roots";
  }
  for (const [parts, mat] of [
    [rootParts, wood],
    [rockParts, rockMaterial],
  ]) {
    const geometry = keep(mergeGeometries(parts));
    parts.forEach((g) => {
      g.dispose();
      resources.delete(g);
    });
    submerged.add(new THREE.Mesh(geometry, mat));
  }
  return {
    root,
    update(t, position) {
      time.value = t;
      const distance = position.y > -8 ? 560 : 220;
      for (const chunk of chunks)
        chunk.root.visible =
          Math.hypot(chunk.x - position.x, chunk.z - position.z) < distance;
    },
    stats: { chunks: chunks.length },
  };
}

/** 带中脊、侧脉和下垂边缘的阔叶，不以圆球冒充树冠。 */
export function broadLeafGeometry(length = 1, width = 0.3) {
  const p = [],
    uv = [],
    index = [];
  for (let r = 0; r <= 10; r++) {
    const t = r / 10,
      half = Math.sin(Math.PI * t) * width;
    for (let s = 0; s < 3; s++) {
      p.push(
        (s - 1) * half,
        Math.sin(t * Math.PI) * 0.14 * length - Math.abs(s - 1) * half * 0.18,
        t * length,
      );
      uv.push(s * 0.5, t);
    }
  }
  for (let r = 0; r < 10; r++)
    for (let s = 0; s < 2; s++) {
      const i = r * 3 + s;
      index.push(i, i + 3, i + 1, i + 1, i + 3, i + 4);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
