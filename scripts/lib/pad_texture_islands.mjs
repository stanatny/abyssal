/**
 * 按实际UV三角形清除图集空白区的脏色，并用最近的有效纹素扩边。
 * 离线执行，保留图案内部像素；不改变UV、网格或运行时采样方式。
 */
export function padTextureIslands(rgba, width, height, uv, indices) {
  const count = width * height;
  const covered = new Uint8Array(count);
  for (let i = 0; i < indices.length; i += 3) {
    const points = [0, 1, 2].map((j) => {
      const v = indices[i + j] * 2;
      return [uv[v] * width - 0.5, uv[v + 1] * height - 0.5];
    });
    const [[ax, ay], [bx, by], [cx, cy]] = points;
    const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denom) < 1e-10) continue;
    const minX = Math.max(0, Math.ceil(Math.min(ax, bx, cx)));
    const maxX = Math.min(width - 1, Math.floor(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.ceil(Math.min(ay, by, cy)));
    const maxY = Math.min(height - 1, Math.floor(Math.max(ay, by, cy)));
    for (let y = minY; y <= maxY; y++)
      for (let x = minX; x <= maxX; x++) {
        const a = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / denom;
        const b = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / denom;
        if (a >= -1e-6 && b >= -1e-6 && a + b <= 1 + 1e-6)
          covered[y * width + x] = 1;
      }
  }
  const seeds = covered;
  const nearest = new Int32Array(count).fill(-1),
    queue = new Int32Array(count);
  let tail = 0;
  for (let i = 0; i < count; i++)
    if (seeds[i]) {
      nearest[i] = i;
      queue[tail++] = i;
    }
  if (!tail) throw new Error("Texture has no covered interior texels");
  for (let head = 0; head < tail; head++) {
    const i = queue[head],
      x = i % width,
      y = Math.floor(i / width);
    for (const n of [
      x > 0 ? i - 1 : -1,
      x + 1 < width ? i + 1 : -1,
      y > 0 ? i - width : -1,
      y + 1 < height ? i + width : -1,
    ]) {
      if (n >= 0 && nearest[n] < 0) {
        nearest[n] = nearest[i];
        queue[tail++] = n;
      }
    }
  }
  const data = new Uint8Array(rgba.length);
  let changed = 0,
    preserved = 0;
  for (let i = 0; i < count; i++) {
    const from = nearest[i] * 4;
    for (let c = 0; c < 4; c++) data[i * 4 + c] = rgba[from + c];
    if (seeds[i]) preserved++;
    if (
      data[i * 4] !== rgba[i * 4] ||
      data[i * 4 + 1] !== rgba[i * 4 + 1] ||
      data[i * 4 + 2] !== rgba[i * 4 + 2]
    )
      changed++;
  }
  return {
    data,
    covered,
    stats: { covered: covered.reduce((a, b) => a + b, 0), preserved, changed },
  };
}
