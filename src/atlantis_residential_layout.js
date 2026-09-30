import { ATLANTIS_DISTRICTS, atlantisDistrict } from "./atlantis_city_plan.js";

// 家具完整可见占地包括箱盖、靠杆与陶瓶托盘旁的残片，不能只取碰撞中心。
export const RESIDENTIAL_FURNITURE_FOOTPRINTS = Object.freeze({
  bench: Object.freeze({ minX: -1.81, maxX: 1.81, minZ: -0.69, maxZ: 0.69 }),
  chest: Object.freeze({ minX: -1.37, maxX: 1.37, minZ: -0.95, maxZ: 0.95 }),
  table: Object.freeze({ minX: -1.39, maxX: 1.39, minZ: -1.39, maxZ: 1.39 }),
  amphora: Object.freeze({ minX: -1.75, maxX: 2.5, minZ: -1.55, maxZ: 2.4 }),
});

// 备用位置沿同一室内侧墙有限前移，再尝试镜像侧墙；入口和中轴不作为摆放点。
const RESIDENTIAL_FURNITURE_FALLBACK_Z = Object.freeze({
  bench: Object.freeze([-4.3, -0.7, 2.5]),
  chest: Object.freeze([-4.3, -0.7, 2.5]),
});

/**
 * 将住宅局部坐标换算为真实世界坐标。
 * @param {object} record 含 x、y、z、scale 和 rotation 的建筑记录。
 * @param {number} x 局部横向位置。
 * @param {number} y 局部高度。
 * @param {number} z 局部纵向位置。
 * @returns {object} 世界 x、y、z。
 */
export function residentialWorldPoint(record, x, y, z) {
  const c = Math.cos(record.rotation),
    s = Math.sin(record.rotation);
  return {
    x: record.x + (x * c + z * s) * record.scale,
    y: record.y + y * record.scale,
    z: record.z + (-x * s + z * c) * record.scale,
  };
}

/**
 * 为所有实际庭院和别墅生成有界陈设，中央与入口保留幼体游线。
 * @param {object[]} records 城市建筑记录，不修改原数组。
 * @param {number} seed 四种布局的确定性偏移。
 * @returns {object[]} 住宅记录、楼板高度、陈设与幼体往返路线。
 */
export function planAtlantisResidentialInteriors(records, seed = 5173) {
  const homes = records
    .filter((record) => ["courtyard", "villa"].includes(record.kind))
    .map((record) => ({ ...record }))
    .sort((a, b) => a.z - b.z || a.x - b.x || a.kind.localeCompare(b.kind));
  return homes.map((record, index) => {
    validateRecord(record);
    const district = atlantisDistrict(record.x, record.z)?.id ?? "outskirts";
    const variant = (index + Math.abs(Math.trunc(seed))) % 4;
    const floorLocal = record.kind === "courtyard" ? 1.4 : 1.7;
    const id = `residential_${record.kind}_${record.x}_${record.z}`;
    const side = variant % 2 ? 1 : -1;
    const slots = [
      { kind: "bench", localX: side * 5.4, localZ: -7.9 },
      { kind: "chest", localX: -side * 4.7, localZ: -7.5 },
    ];
    if (variant === 0)
      slots.push({ kind: "table", localX: side * 5.1, localZ: -2.3 });
    if (variant === 2) slots.push({ kind: "amphora", localX: 4.6, localZ: 2 });
    const groups = slots.map((slot) => {
      const position = residentialWorldPoint(
        record,
        slot.localX,
        floorLocal,
        slot.localZ,
      );
      return {
        id: `${id}_${slot.kind}`,
        homeId: id,
        kind: slot.kind,
        x: position.x,
        floor: position.y,
        z: position.z,
        scale: record.scale,
        yaw: record.rotation,
        count: 3,
        seed: Math.trunc(seed) + index * 17,
        localX: slot.localX,
        localZ: slot.localZ,
      };
    });
    // 较小住宅只承诺 3m 幼体进出；16–30m 成体的通道在室外街道和公共大厅。
    const swimLocal = floorLocal + 3.2 / record.scale;
    const route = [14.7, 7.5, 0, -5.6].map((z) =>
      residentialWorldPoint(record, 0, swimLocal, z),
    );
    return {
      id,
      district,
      districtOrder: ATLANTIS_DISTRICTS.findIndex((d) => d.id === district),
      variant,
      record,
      floorLocal,
      floorY: record.y + floorLocal * record.scale,
      groups,
      access: {
        maxTestedLength: 3,
        route,
        turningCenter: residentialWorldPoint(record, 0, swimLocal, 0),
      },
    };
  });
}

/**
 * 采样完整可见占地，所有点都使用与家具相同的缩放和偏航。
 * @param {object} item 陈设组。
 * @param {number} divisions 每轴等分数。
 * @returns {object[]} 世界占地采样点。
 */
export function residentialFootprintSamples(item, divisions = 6) {
  const extent = RESIDENTIAL_FURNITURE_FOOTPRINTS[item.kind];
  const c = Math.cos(item.yaw),
    s = Math.sin(item.yaw);
  const points = [];
  for (let ix = 0; ix <= divisions; ix += 1)
    for (let iz = 0; iz <= divisions; iz += 1) {
      const x = extent.minX + ((extent.maxX - extent.minX) * ix) / divisions;
      const z = extent.minZ + ((extent.maxZ - extent.minZ) * iz) / divisions;
      points.push({
        x: item.x + (x * c + z * s) * item.scale,
        y: item.floor,
        z: item.z + (-x * s + z * c) * item.scale,
      });
    }
  return points;
}

/**
 * 生成有限室内备用位置，不改动原始陈设或住宅记录。
 * @param {object} home 住宅布局及楼板高度。
 * @param {object} item 原始家具组。
 * @returns {object[]} 原位置优先的候选，全部沿真实建筑变换换算。
 */
export function residentialPlacementCandidates(home, item) {
  const candidates = [item];
  const alternatives = RESIDENTIAL_FURNITURE_FALLBACK_Z[item.kind] ?? [];
  for (const x of [item.localX, -item.localX])
    for (const z of alternatives) {
      const point = residentialWorldPoint(home.record, x, home.floorLocal, z);
      candidates.push({
        ...item,
        x: point.x,
        floor: point.y,
        z: point.z,
        localX: x,
        localZ: z,
      });
    }
  return candidates;
}

function validateRecord(record) {
  if (
    ![record.x, record.y, record.z, record.scale, record.rotation].every(
      Number.isFinite,
    ) ||
    record.scale <= 0
  )
    throw new Error(
      "Residential records require finite transforms and positive scale",
    );
}
