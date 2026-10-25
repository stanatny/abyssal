import * as THREE from "three";
import {
  amazonChannels,
  amazonSurfaceHeight,
  AMAZON_WORLD as W,
} from "./amazon_config.js";
import {
  acquireAmazonCanopy,
  createAmazonCanopyMaterial,
} from "./amazon_canopy_asset.js";

/** 保留树数与随机序列；宽根跨出陡岸的个体有界移向岸内，两种树冠按区块合批。 */
export function* createAmazonCanopySteps(
  root,
  resources,
  time,
  understory,
  leaf,
) {
  const assets = {},
    finishes = {},
    baseSamples = {},
    chunks = [],
    trees = [],
    dummy = new THREE.Object3D();
  for (const kind of ["kapok", "kapokFar", "palm"]) {
    const asset = acquireAmazonCanopy(kind);
    assets[kind] = asset;
    resources.add({ dispose: asset.release });
    finishes[kind] = createAmazonCanopyMaterial(asset, time, resources);
    void finishes[kind].prepare();
    const p = asset.geometry.attributes.position;
    baseSamples[kind] = [[0, 0]];
    for (let i = 0; i < p.count; i++)
      if (p.getY(i) < 0.8) baseSamples[kind].push([p.getX(i), p.getZ(i)]);
  }
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
      // 旧树干和冠层耗用的随机数仍按原顺序推进，防止后续区块换位。
      placements.forEach(() => rand());
      placements.forEach(() => {
        rand();
        rand();
      });
      const classified = { kapok: [], palm: [] },
        fittedPlacements = [];
      for (const [px, y, pz, size, yaw] of placements) {
        const hash =
            ((Math.floor(px * 51) * 73856093) ^
              (Math.floor(pz * 37) * 19349663)) >>>
            0,
          kind = hash % 100 < 27 ? "palm" : "kapok",
          sin = Math.sin(yaw),
          cos = Math.cos(yaw);
        const channel = amazonChannels(pz).sort(
            (a, b) => Math.abs(px - a.center) - Math.abs(px - b.center),
          )[0],
          inland = Math.sign(px - channel.center) || 1;
        const clampX = (v) => THREE.MathUtils.clamp(v, -465, 465),
          clampZ = (v) => THREE.MathUtils.clamp(v, W.minZ + 15, W.maxZ - 15),
          originX = clampX(px),
          originZ = clampZ(pz);
        let fittedX = originX,
          fittedZ = originZ,
          baseY = amazonSurfaceHeight(originX, originZ) - 0.25,
          bestDrop = Infinity;
        const candidates = [[originX, originZ]];
        for (const step of [2, 4, 8, 12, 18, 24, 32]) {
          candidates.push([clampX(originX + inland * step), originZ]);
          candidates.push(
            [originX, clampZ(originZ - step)],
            [originX, clampZ(originZ + step)],
          );
        }
        for (const [candidateX, candidateZ] of candidates) {
          const centerY = amazonSurfaceHeight(candidateX, candidateZ);
          if (centerY < 6) continue;
          let low = centerY;
          for (const [sx, sz] of baseSamples[kind])
            low = Math.min(
              low,
              amazonSurfaceHeight(
                candidateX + (sx * cos + sz * sin) * size * 0.9,
                candidateZ + (sz * cos - sx * sin) * size * 0.9,
              ),
            );
          const drop = centerY - low;
          if (drop < bestDrop) {
            bestDrop = drop;
            fittedX = candidateX;
            fittedZ = candidateZ;
            baseY = low - 0.25;
          }
          if (drop <= 2.5) break;
        }
        const tree = {
          x: fittedX,
          originalX: px,
          originalZ: pz,
          y: baseY,
          z: fittedZ,
          size,
          yaw,
          kind,
          height: assets[kind].height,
        };
        fittedPlacements.push(tree);
        trees.push(tree);
        classified[kind].push(tree);
      }
      const levels = {};
      for (const kind of ["kapok", "palm"]) {
        const list = classified[kind];
        if (!list.length) continue;
        for (const level of kind === "kapok"
          ? ["kapok", "kapokFar"]
          : ["palm"]) {
          const mesh = new THREE.InstancedMesh(
            assets[level].geometry,
            finishes[level].material,
            list.length,
          );
          mesh.name =
            level === "kapokFar"
              ? "rainforest_kapok_far_hf"
              : `rainforest_${kind}_hf`;
          mesh.userData.prepareMaterials = finishes[level].prepare;
          list.forEach((tree, i) => {
            dummy.position.set(tree.x, tree.y, tree.z);
            dummy.rotation.set(0, tree.yaw, 0);
            dummy.scale.set(tree.size * 0.9, tree.size, tree.size * 0.9);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            tree.matrix = dummy.matrix.clone();
          });
          mesh.computeBoundingBox();
          mesh.boundingBox.expandByScalar(0.6);
          mesh.boundingSphere = mesh.boundingBox.getBoundingSphere(
            new THREE.Sphere(),
          );
          mesh.visible = level !== "kapok";
          levels[level] = mesh;
          group.add(mesh);
        }
      }
      const under = new THREE.InstancedMesh(
        understory,
        leaf,
        placements.length,
      );
      under.name = "rainforest_understory";
      fittedPlacements.forEach(({ x: px, z: pz, size, yaw }, i) => {
        dummy.position.set(px, amazonSurfaceHeight(px, pz) - 0.2, pz);
        dummy.rotation.set(0, yaw, 0);
        dummy.scale.set(size * 0.9, size, size * 0.9);
        dummy.updateMatrix();
        under.setMatrixAt(i, dummy.matrix);
        under.setColorAt(
          i,
          new THREE.Color().setHSL(
            0.27 + rand() * 0.055,
            0.36,
            0.5 + rand() * 0.2,
          ),
        );
      });
      under.computeBoundingSphere();
      group.add(under);
      chunks.push({ root: group, x: x + 50, z: z + 50, levels, near: false });
    }
    yield "rainforest-canopy";
  }
  return { chunks, trees, assets };
}
