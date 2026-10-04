/**
 * 直接查询规则地形网格的实际三角面高度，不重复求原始噪声，也不把双线性曲面当成三角面。
 * @param {object} geometry 顶点已位于世界 XZ 平面的 PlaneGeometry。
 * @returns {(x:number,z:number)=>number|null} 网格内的精确高度；网格外返回 null。
 */
export function terrainMeshHeight(geometry) {
  const { widthSegments: nx, heightSegments: nz } = geometry.parameters;
  const p = geometry.attributes.position;
  const data = p.array,
    stride = p.itemSize,
    row = nx + 1;
  const minX = p.getX(0),
    minZ = p.getZ(0);
  const dx = (p.getX(nx) - minX) / nx,
    dz = (p.getZ(nz * row) - minZ) / nz;
  return (x, z) => {
    const u = (x - minX) / dx,
      v = (z - minZ) / dz;
    if (u < 0 || v < 0 || u > nx || v > nz) return null;
    const ix = Math.min(nx - 1, Math.floor(u)),
      iz = Math.min(nz - 1, Math.floor(v));
    const fx = u - ix,
      fz = v - iz,
      index = (iz * row + ix) * stride + 1;
    const a = data[index],
      b = data[index + row * stride],
      d = data[index + stride],
      c = data[index + (row + 1) * stride];
    return fx + fz <= 1
      ? a + (d - a) * fx + (b - a) * fz
      : c + (b - c) * (1 - fx) + (d - c) * (1 - fz);
  };
}
