import { decodePackedArray } from "./packed_array.js";

/** 读取离线足根权重；共享几何只应用一次，游戏加载时无需重新求解蒙皮。 */
export function applyScyllaFootBinding(geometry, packed) {
  if (!packed || geometry.userData.scyllaFootRoots) return;
  const vertices = decodePackedArray(packed.vertices, Uint16Array),
    ids = decodePackedArray(packed.skinIndex, Uint16Array),
    weights = decodePackedArray(packed.skinWeight, Uint16Array);
  for (let i = 0; i < vertices.length; i++) {
    const sum =
      weights[i * 4] +
      weights[i * 4 + 1] +
      weights[i * 4 + 2] +
      weights[i * 4 + 3];
    for (let j = 0; j < 4; j++) {
      geometry.attributes.skinIndex.array[vertices[i] * 4 + j] = ids[i * 4 + j];
      geometry.attributes.skinWeight.array[vertices[i] * 4 + j] =
        weights[i * 4 + j] / sum;
    }
  }
  geometry.userData.scyllaFootRoots = true;
}
