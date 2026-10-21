/**
 * 解码离线打包的 Base64 数组；旧浏览器逐字节复制，不建立字符串迭代中间数组。
 * @param {string} value 离线生成的 Base64 字节串。
 * @param {Function} Type 对应数据格式的 TypedArray 构造器。
 * @returns {TypedArray} 独立拥有解码缓冲区的数组视图。
 */
export function decodePackedArray(value, Type) {
  let bytes;
  if (typeof Uint8Array.fromBase64 === "function") {
    bytes = Uint8Array.fromBase64(value);
  } else {
    const binary = atob(value);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  }
  return new Type(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / Type.BYTES_PER_ELEMENT,
  );
}
