/** 按实际位置与拓扑匹配离线截面；资产变更后旧索引自动失效。 */
export function creatureGeometryKey(geometry) {
  const position = geometry.attributes.position,
    index = geometry.index;
  if (!position) return "";
  let a = 2166136261,
    b = 5381;
  for (const attribute of [position, index].filter(Boolean)) {
    const array = attribute.array,
      bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (const byte of bytes) {
      a = Math.imul(a ^ byte, 16777619);
      b = (Math.imul(b, 33) ^ byte) >>> 0;
    }
  }
  return `${position.count}:${index?.count ?? 0}:${a >>> 0}:${b >>> 0}`;
}
