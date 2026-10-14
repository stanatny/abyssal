import { ATLANTIS_EXCAVATION_SITES } from "./atlantis_terrain.js";

// 藏点与建筑线索分离：每局只抽一处，铭文只指向入口，不暴露房内坐标。
const sites = [
  {
    id: "sanctuary_lower_west",
    buildingId: "harbor_sanctuary",
    name: "月湾圣所",
    level: "lower",
    offset: [-22, -6, -20],
  },
  {
    id: "sanctuary_upper_rear",
    buildingId: "harbor_sanctuary",
    name: "月湾圣所",
    level: "upper",
    offset: [-18, 0, -22],
  },
  {
    id: "colonnade_west",
    buildingId: "agora_bridges",
    name: "市集柱廊",
    level: "lower",
    offset: [-24, -6, -22],
  },
  {
    id: "colonnade_east",
    buildingId: "agora_bridges",
    name: "市集柱廊",
    level: "lower",
    offset: [24, -6, 22],
  },
  {
    id: "memorial_lower_east",
    buildingId: "memorial_terrace",
    name: "纪念圣厅",
    level: "lower",
    offset: [22, -6, -20],
  },
  {
    id: "memorial_upper_rear",
    buildingId: "memorial_terrace",
    name: "纪念圣厅",
    level: "upper",
    offset: [17, 0, -25],
  },
  {
    id: "harbor_hall_west",
    buildingId: "harbor_sunken_halls",
    name: "月湾古港地下厅",
    point: [-232, -177, -257],
    roofY: -158,
  },
  {
    id: "harbor_hall_east",
    buildingId: "harbor_sunken_halls",
    name: "月湾古港地下厅",
    point: [-215, -177, -244],
    roofY: -158,
  },
  {
    id: "archive_west",
    buildingId: "agora_sunken_archive",
    name: "沉没市集档案库",
    point: [206, -349, -459],
    roofY: null,
  },
  {
    id: "archive_east",
    buildingId: "agora_sunken_archive",
    name: "沉没市集档案库",
    point: [226, -349, -435],
    roofY: null,
  },
  {
    id: "vault_west",
    buildingId: "poseidon_temple_vault",
    name: "波塞冬地宫",
    point: [-30, -688, -924],
    roofY: -664.5,
  },
  {
    id: "vault_east",
    buildingId: "poseidon_temple_vault",
    name: "波塞冬地宫",
    point: [30, -688, -924],
    roofY: -664.5,
  },
];
for (const site of sites) {
  if (site.offset) Object.freeze(site.offset);
  if (site.point) Object.freeze(site.point);
  Object.freeze(site);
}
export const ATLANTIS_KEY_SITES = Object.freeze(sites);

/** 由已建成公共廊道与挖掘元数据解析藏点及可往返的身体中心路线。 */
export function resolveAtlantisKeySites(records) {
  const point = (x, y, z) => ({ x, y, z });
  return ATLANTIS_KEY_SITES.flatMap((site) => {
    if (site.offset) {
      const building = records.find((r) => r.id === site.buildingId);
      if (!building) return [];
      const upper = site.level === "upper";
      const y = (upper ? building.upperY : building.lowerY) + site.offset[1];
      const target = point(
        building.x + site.offset[0],
        y,
        building.z + site.offset[2],
      );
      const memorial = upper && building.variant === "terrace";
      const entry = point(building.x, y, building.z + (memorial ? -69 : 69));
      const center = point(building.x, y, building.z + (memorial ? -25 : 0));
      return [
        {
          ...site,
          point: target,
          guidance: entry,
          roofY: upper
            ? building.y +
              (memorial
                ? 32.2 + 11 * (1 - Math.abs(site.offset[0]) / 38)
                : 35.2 + 13 * (1 - Math.abs(site.offset[0]) / 43)) -
              1.05
            : building.y - 4,
          route: [entry, center, target],
        },
      ];
    }
    const building = ATLANTIS_EXCAVATION_SITES.find(
      (r) => r.id === site.buildingId,
    );
    // 档案库线索指向成人可通行的南门水道，长竖井仍保留为实际场景的另一入口。
    const waypoints =
      site.buildingId === "agora_sunken_archive"
        ? [
            ...building.routes
              .find((r) => r.id === "south_gate_channel")
              .waypoints.slice(0, 6),
            point(216, -326, -458),
            point(216, -346, -458),
            point(216, -346, -447.5),
          ]
        : building.routes[0].waypoints;
    const route = waypoints.map((p) => ({ ...p }));
    const target = point(...site.point);
    return [
      { ...site, point: target, guidance: route[0], route: [...route, target] },
    ];
  });
}
