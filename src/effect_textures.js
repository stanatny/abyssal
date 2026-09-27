import * as THREE from "three";

/**
 * 生成供血雾、墨云和水沫共用的有限纹理，所有纹理均可在无 DOM 环境中创建。
 * @param {string} kind mist、ink、bubble 或 foam，决定透明度的空间分布。
 * @returns {THREE.DataTexture} 确定性纹理，调用方负责释放。
 */
export function createFluidTexture(kind = "mist") {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const dx = u * 2 - 1;
      const dy = v * 2 - 1;
      const radius = Math.hypot(dx, dy);
      let alpha;
      if (kind === "bubble") {
        const rim = Math.exp(-((radius - 0.75) ** 2) * 260) * 0.65;
        const glint = Math.exp(-((dx + 0.31) ** 2 + (dy - 0.49) ** 2) * 75);
        alpha =
          (rim + glint * 0.9 + Math.max(0, 1 - radius) * 0.035) *
          smooth(1, 0.88, radius);
      } else {
        const warp = fractal(u * 3.2 + 17, v * 3.2 + 3);
        const curl = fractal(u * 9 + warp * 3.5, v * 9 - warp * 2.8);
        const detail = fractal(u * 23, v * 23 + curl * 2.2);
        const envelope = smooth(1, 0.15, radius + (warp - 0.5) * 0.22);
        if (kind === "foam") {
          alpha = envelope * smooth(0.33, 0.7, curl) * (0.45 + detail * 0.7);
        } else {
          const filaments = Math.pow(
            Math.max(0, 1 - Math.abs(curl - 0.53) * 4),
            2,
          );
          alpha =
            envelope *
            (0.12 + curl * 0.65 + filaments * 0.28) *
            (0.55 + detail * 0.5);
          if (kind === "ink") alpha = Math.min(1, alpha * 1.32);
        }
      }
      const offset = (y * size + x) * 4;
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255;
      pixels[offset + 3] = Math.round(THREE.MathUtils.clamp(alpha, 0, 1) * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function smooth(a, b, value) {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}
function noise(x, y) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const hash = (a, b) => {
    const value = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const fx = x - ix,
    fy = y - iy;
  const tx = fx * fx * (3 - 2 * fx),
    ty = fy * fy * (3 - 2 * fy);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), tx),
    THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), tx),
    ty,
  );
}
function fractal(x, y) {
  return (
    noise(x, y) * 0.56 +
    noise(x * 2.03, y * 2.03) * 0.28 +
    noise(x * 4.07, y * 4.07) * 0.12 +
    noise(x * 8.13, y * 8.13) * 0.04
  );
}
