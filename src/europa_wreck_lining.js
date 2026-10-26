/** 大舱内衬：承压肋、分层壁板和检修管道均有真实厚度，沿周界合批。 */
export function addPressureLining({ box, rod, flush, materials }) {
  const { hull, frame, foil, black, orange, blue } = materials;
  const rings = [-80, -66, -37.2, -10.8, 14.4, 39.6, 66, 80];
  // 隔舱墙已带完整承压框，此处不重复画同平面的翼缘。
  for (const z of rings) {
    for (const side of [-1, 1]) {
      // 折角承力框露出翼缘和肋腹，形成完整舱壁断面，而不是裸露平面。
      if (!(side > 0 && z > -12 && z < 20.4)) {
        box([side * 30.8, 20, z], [1.05, 27, 0.65], black, 0, false);
        for (const dz of [-0.48, 0.48])
          box([side * 30.65, 20, z + dz], [1.7, 27, 0.24], frame, 0, false);
        for (const y of [8, 14, 20, 26, 32]) {
          box([side * 29.72, y, z], [0.23, 0.7, 1.4], hull, 0, false);
          for (const dz of [-0.4, 0.4])
            box([side * 29.55, y, z + dz], [0.15, 0.32, 0.25], black, 0, false);
        }
      }
      rod([side * 31, 33.3, z], [side * 24.4, 39.9, z], 0.48, frame);
      box([side * 13, 39.9, z], [25.5, 0.75, 1.25], frame, 0, false);
      // 裸露管束置于斜肩下，支架与管线相接，不横穿主航道。
      for (const x of [26.5, 27.4]) {
        rod([side * x, 36, z - 0.8], [side * x, 36, z + 0.8], 0.44, black);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (const x of [26.5, 27.4])
      rod([side * x, 36, -80], [side * x, 36, 80], 0.27, x < 27 ? foil : frame);
    for (let z = -75; z <= 75; z += 10) {
      if (side > 0 && z > -16 && z < 24) continue;
      // 墙面采用暗色底槽、暖灰耐压面板、窄压条及机械锁扣。
      for (const y of [13, 25]) {
        box([side * 31.26, y, z], [0.12, 10.7, 8.9], black, 0, false);
        box([side * 31.08, y, z], [0.3, 10.2, 8.35], hull, 0, false);
        box([side * 30.84, y - 3.9, z], [0.16, 1.2, 6.8], frame, 0, false);
        for (const dz of [-3.45, 3.45]) {
          box([side * 30.8, y, z + dz], [0.22, 7.8, 0.18], frame, 0, false);
          for (const dy of [-3.4, 3.4])
            box(
              [side * 30.6, y + dy, z + dz],
              [0.24, 0.55, 0.65],
              black,
              0,
              false,
            );
        }
        // 部分内衬剥落后露出折叠隔热毯，颜色变化来自材料而不是强光。
        if ((Math.round(z / 10) + (y > 20 ? 1 : 0)) % 4 === 0) {
          box([side * 30.78, y + 0.3, z], [0.18, 5.6, 4.8], foil, 0, false);
          for (let k = -2; k <= 2; k++)
            box(
              [side * 30.62, y + 0.3, z + k * 0.85],
              [0.13, 5.5, 0.17],
              black,
              0,
              false,
            );
          box(
            [side * 30.45, y + 3.4, z],
            [0.6, 0.3, 5.2],
            frame,
            side * 0.1,
            false,
          );
        }
      }
      box([side * 30.75, 7.9, z], [0.35, 1.15, 8.2], blue, 0, false);
    }
  }
  // 地板网格与顶板采用独立铺装块，厚度和颜色层次在近距离也可读。
  for (let z = -76; z <= 76; z += 8) {
    for (let x = -21; x <= 21; x += 7) {
      box([x, 0.72, z], [6.75, 0.16, 7.65], hull, 0, false);
      box([x, 0.82, z - 3.55], [5.8, 0.06, 0.16], frame, 0, false);
      for (const dx of [-2.85, 2.85])
        box([x + dx, 0.84, z], [0.16, 0.06, 5.8], black, 0, false);
      box([x, 40.2, z], [6.7, 0.45, 7.4], black, 0, false);
      box([x, 39.88, z], [6.25, 0.25, 6.9], hull, 0, false);
      for (const dz of [-2.8, 2.8])
        box([x, 39.68, z + dz], [5.6, 0.16, 0.32], frame, 0, false);
    }
  }
  // 压力门前的磨损识别条和六舱编号，保持无电的残骸语义。
  const centers = [-66, -37.2, -10.8, 14.4, 39.6, 66];
  for (let room = 0; room < centers.length; room++) {
    const z = centers[room];
    for (const side of [-1, 1]) {
      box(
        [side * 19, 0.88, z],
        [0.35, 0.07, 19],
        room % 2 ? orange : blue,
        0,
        false,
      );
      for (let n = 0; n <= room; n++)
        box(
          [side * 19, 0.94, z - 5 + n * 1.3],
          [1.8, 0.04, 0.45],
          hull,
          0,
          false,
        );
    }
    box([0, 39.55, z], [13, 0.25, 4.6], black, 0, false);
    for (let n = 0; n <= room; n++)
      box([-room * 0.7 + n * 1.4, 39.35, z], [0.8, 0.12, 2.5], hull, 0, false);
  }
  flush("wreck_layered_pressure_lining");
}
