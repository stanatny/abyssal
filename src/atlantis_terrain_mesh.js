import { finishScenePreparation } from "./scene_preparation.js";
import * as THREE from "three";
import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";

/**
 * 只细分挖掘区附近的地表单元，防止原低密度三角形跨过坑口、穿入厅堂。
 * 外围仍沿用原网格密度；同一套采样可供海床和城市铺装使用。
 * @param {object} options 世界范围、原始分段数、共享高度函数与表面偏移。
 * @returns {Generator<string, THREE.BufferGeometry>} 逐行构造，结束值为世界坐标地表网格。
 */
export function* createAtlantisTerrainMeshSteps({
  minX,
  maxX,
  minZ,
  maxZ,
  segmentsX,
  segmentsZ,
  heightAt,
  offset = 0,
}) {
  const positions = [],
    uv = [],
    indices = [],
    normals = [];
  const vertices = new Map();
  function vertexAt(x, z) {
    const key = `${Math.round(x * 1e6)}:${Math.round(z * 1e6)}`;
    if (vertices.has(key)) return vertices.get(key);
    const index = positions.length / 3;
    positions.push(x, heightAt(x, z) + offset, z);
    uv.push((x - minX) / (maxX - minX), (z - minZ) / (maxZ - minZ));
    // 高低密度单元共用采样法线，避免挖掘区边缘形成可见的照明接缝。
    const nx = heightAt(x - 0.05, z) - heightAt(x + 0.05, z);
    const nz = heightAt(x, z - 0.05) - heightAt(x, z + 0.05);
    const inverse = 1 / Math.hypot(nx, 0.1, nz);
    normals.push(nx * inverse, 0.1 * inverse, nz * inverse);
    vertices.set(key, index);
    return index;
  }
  const dx = (maxX - minX) / segmentsX;
  const dz = (maxZ - minZ) / segmentsZ;
  const cuts = ATLANTIS_EXCAVATION_SITES.flatMap((site) => {
    const areas = [{ ...site.bounds, step: 0.5 }];
    if (site.blendMeters < 4) {
      // 更窄的衬墙需要陡而平滑的切口，只细分坑缘单元，保留平底密度。
      const b = site.bounds,
        w = site.blendMeters;
      areas.push(
        { ...b, maxX: b.minX + w, step: 0.25 },
        { ...b, minX: b.maxX - w, step: 0.25 },
        { ...b, maxZ: b.minZ + w, step: 0.25 },
        { ...b, minZ: b.maxZ - w, step: 0.25 },
      );
    }
    if (site.trench) {
      const t = site.trench;
      areas.push({
        minX: t.minX - t.edgeBlend,
        maxX: t.maxX + t.edgeBlend,
        minZ: t.minZ,
        maxZ: t.maxZ + 2,
      });
    }
    return areas;
  });
  for (let iz = 0; iz < segmentsZ; iz++) {
    yield "terrain-row";
    for (let ix = 0; ix < segmentsX; ix++) {
      const x0 = minX + ix * dx,
        z0 = minZ + iz * dz;
      const detailed = cuts.filter((b) => {
        const pad = b.step < 0.5 ? 0 : 1;
        return (
          x0 + dx > b.minX - pad &&
          x0 < b.maxX + pad &&
          z0 + dz > b.minZ - pad &&
          z0 < b.maxZ + pad
        );
      });
      const step = Math.min(...detailed.map((cut) => cut.step ?? 0.5));
      // 平底厅堂的整个单元都是同一平面，无须把不可见的平面再切成密集小格。
      // 仅在矩形完全落入坑内平底且实际采样一致时合并，陡坡与入口仍保持原密度。
      const flat = ATLANTIS_EXCAVATION_SITES.some((site) => {
        const b = site.bounds,
          margin = site.blendMeters;
        return (
          x0 >= b.minX + margin &&
          x0 + dx <= b.maxX - margin &&
          z0 >= b.minZ + margin &&
          z0 + dz <= b.maxZ - margin &&
          [
            [x0, z0],
            [x0 + dx, z0],
            [x0, z0 + dz],
            [x0 + dx, z0 + dz],
            [x0 + dx / 2, z0 + dz / 2],
          ].every(([x, z]) => Math.abs(heightAt(x, z) - site.floorY) < 1e-8)
        );
      });
      const nx = detailed.length && !flat ? Math.ceil(dx / step) : 1;
      const nz = detailed.length && !flat ? Math.ceil(dz / step) : 1;
      const cell = [];
      for (let j = 0; j <= nz; j++) {
        for (let i = 0; i <= nx; i++) {
          const x = x0 + (dx * i) / nx,
            z = z0 + (dz * j) / nz;
          cell.push(vertexAt(x, z));
        }
      }
      for (let j = 0; j < nz; j++) {
        for (let i = 0; i < nx; i++) {
          const a = j * (nx + 1) + i,
            b = a + 1,
            c = a + nx + 1,
            d = c + 1;
          const ids = [cell[a], cell[b], cell[c], cell[d]];
          const centerHeight =
            heightAt(x0 + (dx * (i + 0.5)) / nx, z0 + (dz * (j + 0.5)) / nz) +
            offset;
          const adError = Math.abs(
            (positions[ids[0] * 3 + 1] + positions[ids[3] * 3 + 1]) / 2 -
              centerHeight,
          );
          const bcError = Math.abs(
            (positions[ids[1] * 3 + 1] + positions[ids[2] * 3 + 1]) / 2 -
              centerHeight,
          );
          // 坑角的两段陡坡相交时，沿真实折线选对角线，避免跨坡搭出薄片。
          if (adError < bcError)
            indices.push(cell[a], cell[c], cell[d], cell[a], cell[d], cell[b]);
          else
            indices.push(cell[a], cell[c], cell[b], cell[b], cell[c], cell[d]);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  return geometry;
}

export function createAtlantisTerrainMesh(options) {
  return finishScenePreparation(createAtlantisTerrainMeshSteps(options));
}
