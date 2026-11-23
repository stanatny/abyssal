// 同一份领地坐标供遭遇、图鉴和定点外围居民读取；不改变领主技能或胜利条件。
export const BERMUDA_LORD_SITES = Object.freeze(
  [
    {
      id: "bermuda_hydra",
      kind: "hydra",
      home: [-290, -18, -450],
      maxCenterY: -17,
      radius: 86,
      landmarkId: "outer_reef_gates",
      habitat: "风暴外海表层 · 双礁门上方",
      guardHome: [-235, -33, -495],
    },
    {
      id: "bermuda_kraken",
      kind: "kraken",
      home: [-245, -390, -730],
      radius: 103,
      landmarkId: "bermuda_wreck",
      habitat: "泰坦尼克号西侧外水域",
      guardHome: [-300, -380, -775],
    },
    {
      id: "bermuda_maja",
      kind: "mayan",
      home: [300, -505, -1080],
      radius: 98,
      landmarkId: "outer_lost_flight",
      habitat: "失踪航线残骸带西侧深水",
      guardHome: [215, -470, -1125],
    },
    {
      id: "bermuda_leviathan",
      kind: "leviathan",
      home: [230, -610, -1570],
      radius: 86,
      landmarkId: "outer_cable_field",
      habitat: "断缆打捞场南侧深盆地",
      guardHome: [175, -595, -1615],
    },
  ].map((site) =>
    Object.freeze({
      ...site,
      home: Object.freeze(site.home),
      guardHome: Object.freeze(site.guardHome),
    }),
  ),
);
