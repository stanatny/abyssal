/** 四处局部雷区复用既有接触水雷；宽阔中央与侧方水路保留绕行空间。 */
export const NAVAL_MINEFIELD_POPULATION = 48;
export const NAVAL_MINES_PER_FIELD = 12;

const fields = {
  hawaii: [
    { id: "outer_west", center: [-130, -165, -370] },
    { id: "slope_east", center: [80, -290, -550] },
    { id: "deep_west", center: [-160, -420, -730] },
    { id: "abyss_east", center: [130, -555, -910] },
  ],
  atlantis: [
    { id: "harbor_west", center: [-160, -160, -370] },
    { id: "city_east", center: [130, -295, -550] },
    { id: "deep_west", center: [-80, -390, -730] },
    { id: "temple_approach_east", center: [160, -550, -910] },
  ],
  bermuda: [
    { id: "shelf_east", center: [130, -145, -370] },
    { id: "wreck_west", center: [-160, -360, -550] },
    { id: "deep_east", center: [160, -360, -680] },
    { id: "wreck_tail_west", center: [-160, -415, -1000] },
  ],
};
for (const sites of Object.values(fields)) {
  for (const site of sites) {
    Object.freeze(site.center);
    Object.freeze(site);
  }
  Object.freeze(sites);
}
Object.freeze(fields);
const empty = Object.freeze([]);

/** 只有既有水雷海图拥有雷区；未知或显式无雷海域不回退到其他地图。 */
export function getNavalMinefields(regionId) {
  return Object.hasOwn(fields, regionId) ? fields[regionId] : empty;
}

// 不规则体积采样避免排成水平网格；不同雷区镜像排布，重开仍保持原席位。
const offsets = Object.freeze(
  [
    [-18, -17, -12],
    [-3, -21, 4],
    [15, -14, 16],
    [-13, -1, 17],
    [2, 0, -17],
    [18, 4, 0],
    [-18, 15, 1],
    [-3, 20, -14],
    [13, 21, 15],
    [0, 9, 10],
    [12, -10, -8],
    [-10, 8, -7],
  ].map((offset) => Object.freeze(offset)),
);

/** 上下、左右和前后都错开的固定席位；每片占据真实三维体积。 */
export function navalMinefieldSlot(regionId, index) {
  const sites = getNavalMinefields(regionId);
  if (!Number.isInteger(index) || index < 0) return null;
  const fieldIndex = Math.floor(index / NAVAL_MINES_PER_FIELD),
    field = sites[fieldIndex];
  if (!field) return null;
  const [x, y, z] = offsets[index % NAVAL_MINES_PER_FIELD];
  return {
    fieldId: field.id,
    x: field.center[0] + x * (fieldIndex % 2 ? -1 : 1),
    y: field.center[1] + y,
    z: field.center[2] + z * (fieldIndex >= 2 ? -1 : 1),
  };
}
