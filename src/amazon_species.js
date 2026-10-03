import {
  amazonAnchor,
  amazonSeabedHeight,
  AMAZON_WORLD as W,
} from "./amazon_config.js";

export const AMAZON_EN = {};
const text = (zh, en) => {
  AMAZON_EN[zh] = en;
  return zh;
};
const habitat = text(
  "亚马逊幻想河道：沿雨林两侧支流、沉根弯道、林岛根窟和深潭探索；盐水主角、复苏巨兽和超深河床属于游戏改编。",
  "Fantasy Amazon: explore both rainforest channels, submerged-root bends, under-island root vaults and deep pools. Saltwater protagonists, revived giants and unusually deep riverbeds are game adaptations.",
);
const smallCounter = text(
  "沿浮叶和根系寻找鱼群；小型猎物适合幼年补给，长大后应转向深潭的大型食物。",
  "Find schools by floating leaves and roots. Small prey sustain juveniles; larger explorers need the substantial meals in deep pools.",
);
const hunterCounter = text(
  "观察体长与黄色反击标记，利用河弯和沉根躲避；正面捕食，避免向猎手露出侧背。",
  "Watch length and yellow retaliation markers. Use bends and roots for cover; attack with your mouth and protect your flanks.",
);
const real = text(
  "真实淡水动物；部分体长为便于观察的放大设定，活动水层、捕食强度和成长收益也属于游戏改编。",
  "A real freshwater animal; some lengths are enlarged for game readability. Depth bands, aggression and meal rewards are also adaptations.",
);
const prehistoric = text(
  "已灭绝的南美淡水巨兽；复原存在不确定性，复苏水层和部分尺寸是幻想改编。",
  "An extinct South American freshwater giant. Reconstructions are uncertain; revived habitats and some sizes are fantasy adaptations.",
);
const fantasy = text(
  "原创幻想河兽，并非真实亚马逊动物；巨型尺寸与危险行为服务于成长后期。",
  "An original fantasy river creature, not real Amazon wildlife. Its colossal size and aggression provide late-game challenges.",
);
const profiles = (points, size, nursery = false) =>
  points.map((p) => ({
    anchor: p,
    count: size,
    depthMin: Math.max(5, -p[1] - 10),
    depthMax: -p[1] + 12,
    fixedHabitat: true,
    nurseryResident: nursery,
    densityLimit: Math.ceil(size * 1.7),
  }));
const shallow = [
  [-34, -18, 70],
  [30, -21, 55],
  [-40, -22, 10],
  [34, -25, -45],
];
const along = (start, depth, n = 6) =>
  Array.from({ length: n }, (_, i) => {
    const p = amazonAnchor(
      i % 2 ? 1 : -1,
      start - i * 120,
      depth + i * 10,
      ((i % 3) - 1) * 13,
    );
    p[1] = Math.max(p[1], amazonSeabedHeight(p[0], p[2]) + 18);
    return p;
  });
function species(
  kind,
  name,
  english,
  latin,
  length,
  speed,
  population,
  category,
  depthMin,
  depthMax,
  color,
  description,
  englishDescription,
  extra = {},
) {
  return {
    kind,
    freshwater: true,
    worldBounds: W,
    label: text(name, english),
    latin,
    length,
    speed,
    population,
    category,
    depthMin,
    depthMax,
    color,
    tier: category === "shoal" ? 0 : 2,
    predator: category !== "shoal",
    schoolSize: 1,
    nutrition: length < 1 ? 8 : 18 + length * 3,
    growth:
      length < 1 ? 0.018 : 0.04 + length * 0.04 + (length / 6) ** 2 * 0.14,
    description: text(description, englishDescription),
    ability: text(
      category === "shoal" ? "根系间巡游" : "河道猎食",
      category === "shoal" ? "Root-channel foraging" : "River predation",
    ),
    habitatNote: habitat,
    realSize: category === "ancient" ? prehistoric : real,
    counter: category === "shoal" ? smallCounter : hunterCounter,
    ...extra,
  };
}
const s = [];
const shoal = (
  kind,
  name,
  en,
  latin,
  length,
  speed,
  color,
  desc,
  edesc,
  points,
  size = 6,
  nursery = false,
) => {
  const p = profiles(points, size, nursery);
  s.push(
    species(
      kind,
      name,
      en,
      latin,
      length,
      speed,
      size * p.length,
      "shoal",
      Math.min(...p.map((a) => a.depthMin)),
      Math.max(...p.map((a) => a.depthMax)),
      color,
      desc,
      edesc,
      {
        schoolSize: size,
        schoolProfiles: p,
        schoolAnchors: points,
        spawnAnchors: p.flatMap((group) =>
          Array.from({ length: group.count }, () => group.anchor),
        ),
        layeredSchools: true,
        nurseryResident: nursery,
      },
    ),
  );
};
shoal(
  "neon_tetra",
  "霓虹灯鱼",
  "Neon Tetra",
  "PARACHEIRODON INNESI",
  0.12,
  1.6,
  "#51c6c0",
  "纤细银腹、蓝绿色纵带与后半身红纹，小群沿浮叶边缘穿梭。",
  "Slender silver bellies, blue-green longitudinal stripes and red rear bodies form small schools around floating leaves.",
  shallow,
  7,
  true,
);
shoal(
  "amazon_discus",
  "七彩神仙鱼",
  "Amazon Discus",
  "SYMPHYSODON SPP.",
  0.35,
  1.7,
  "#cf9363",
  "高而扁的圆盘身体带深色竖条、连续上下鳍和红眼，缓慢绕根游动。",
  "A tall flattened disk, dark vertical bars, continuous dorsal and anal fins and red eyes; a slow root-dweller.",
  shallow.map((p) => [p[0] + 8, p[1] - 4, p[2] - 8]),
  7,
  true,
);
shoal(
  "silver_hatchet",
  "银斧鱼",
  "Silver Hatchetfish",
  "GASTEROPELECUS STERNICLA",
  0.2,
  2.2,
  "#b4c1ae",
  "胸腹像斧刃向下展开，背部近乎平直，成对长胸鳍与细尾柄形成独特轮廓。",
  "An axe-blade belly beneath a nearly straight back, elongated pectorals and a slender tail make a distinctive silhouette.",
  [
    [-65, -12, 85],
    [65, -13, 25],
    amazonAnchor(-1, -190, 17),
    amazonAnchor(1, -240, 18),
  ],
  7,
  false,
);
shoal(
  "armored_cory",
  "甲鲶",
  "Armored Corydoras",
  "CORYDORAS SPP.",
  0.28,
  1.5,
  "#9c9474",
  "双列骨板覆盖低矮身体，嘴边短须探寻河底，深色斑点散布肩背。",
  "Two rows of bony plates cover a low body; short barbels probe the bed beneath a spotted back.",
  shallow.map((p) => [p[0] - 9, p[1] - 8, p[2]]),
  6,
  true,
);
shoal(
  "amazon_pacu",
  "亚马逊帕库鱼",
  "Amazon Pacu",
  "COLOSSOMA MACROPOMUM",
  1.65,
  2.7,
  "#8e9677",
  "宽厚菱形身体、圆钝吻部、深灰背与淡金腹，缓慢成群游动，适合早期成长。",
  "A deep diamond-shaped body, rounded muzzle, dark back and pale gold belly; slow schools make useful early meals.",
  shallow.map((p) => [p[0] * 0.8, p[1] - 5, p[2] - 15]),
  6,
  true,
);
shoal(
  "silver_arowana",
  "银龙鱼",
  "Silver Arowana",
  "OSTEOGLOSSUM BICIRRHOSUM",
  1.2,
  3.4,
  "#a9b9a0",
  "上翘口部带双须，大鳞片覆盖狭长身体，背臀鳍延伸到尾部。",
  "An upturned mouth with paired barbels, large scales and long dorsal and anal fins extending toward the tail.",
  [...along(-185, 27).slice(0, 4), [-38, -64, -420], [45, -86, -750]],
  4,
);
shoal(
  "arapaima",
  "巨骨舌鱼",
  "Arapaima",
  "ARAPAIMA GIGAS",
  3.1,
  4.5,
  "#bf7452",
  "宽阔骨质头和上翘口连接长躯，尾端鳞片显铜红色；背臀鳍集中于后部。",
  "A broad bony head and upturned mouth lead into a long body, copper-red rear scales and posterior dorsal and anal fins.",
  [...along(-230, 40).slice(0, 4), [28, -70, -510], [-35, -108, -880]],
  4,
);
shoal(
  "redtail_catfish",
  "红尾鲶",
  "Redtail Catfish",
  "PHRACTOCEPHALUS HEMIOLIOPTERUS",
  2.2,
  3.0,
  "#bd6d4d",
  "宽扁头、六根长须、奶白侧线与鲜明红尾；贴近沉木缓慢巡游。",
  "A broad flattened head, six long barbels, creamy lateral stripe and vivid red tail; a slow submerged-log cruiser.",
  [...along(-200, 52).slice(0, 4), [46, -74, -380], [55, -118, -910]],
  4,
);
shoal(
  "amazon_river_turtle",
  "亚马逊河龟",
  "Amazon River Turtle",
  "PODOCNEMIS EXPANSA",
  1.1,
  1.5,
  "#697852",
  "椭圆隆起背甲带清晰甲片，长颈和四只蹼足交替划水，不是海龟式长鳍。",
  "An arched oval shell with distinct scutes, an extended neck and four webbed feet, rather than sea-turtle flippers.",
  [
    [-52, -25, 65],
    [44, -27, 15],
    amazonAnchor(-1, -240, 38),
    amazonAnchor(1, -350, 48),
  ],
  4,
);
const hunter = (
  kind,
  name,
  en,
  latin,
  length,
  speed,
  color,
  desc,
  edesc,
  start,
  depth,
  population = 5,
  extra = {},
) => {
  const anchors = along(start, depth, population);
  s.push(
    species(
      kind,
      name,
      en,
      latin,
      length,
      speed,
      population,
      "hunter",
      Math.max(12, depth - 12),
      depth + (population - 1) * 10 + 24,
      color,
      desc,
      edesc,
      {
        spawnAnchors: anchors,
        residentRadius: 38,
        hunterTerritory: { minX: -400, maxX: 400, minZ: -1280, maxZ: -165 },
        ...extra,
      },
    ),
  );
};
hunter(
  "red_piranha",
  "红腹食人鱼",
  "Red-bellied Piranha",
  "PYGOCENTRUS NATTERERI",
  0.55,
  6.0,
  "#b15c43",
  "银灰斑点背、铜红腹、陡额与短厚下颌；现实常食腐，本作河道攻击性是玩法改编。",
  "A speckled silver back, copper-red belly, steep forehead and short thick jaw. Real piranhas often scavenge; game aggression is an adaptation.",
  -190,
  25,
  8,
);
hunter(
  "electric_eel",
  "电鳗",
  "Electric Eel",
  "ELECTROPHORUS VOLTAI",
  2.5,
  6.2,
  "#777d4b",
  "长而光滑的圆柱躯干带连续波动臀鳍，橙褐喉腹，近距电击有黄色预警。",
  "A smooth cylindrical body with a continuous undulating anal fin and orange-brown throat; close electric strikes have a yellow warning.",
  -250,
  45,
  6,
  {
    hunterAbility: "river_shock",
    ability: text("近距放电", "Close-range discharge"),
    counter: text(
      "看到黄色电弧蓄力后离开12米范围，或用实体沉根遮挡；放电后有较长恢复和冷却。",
      "Leave the 12 m radius when yellow arcs telegraph a discharge, or shelter behind a solid root. Each discharge has a recovery window and long cooldown.",
    ),
  },
);
hunter(
  "river_stingray",
  "淡水魟",
  "Freshwater Stingray",
  "POTAMOTRYGON MOToro",
  1.6,
  5.5,
  "#967752",
  "低伏圆盘体背布满奶黄色眼状斑纹，细长鞭尾带棘，不同于海洋三角魟。",
  "A low circular disk with cream eye spots and a long spined whip tail, distinct from ocean rays.",
  -280,
  65,
  5,
);
hunter(
  "black_caiman",
  "黑凯门鳄",
  "Black Caiman",
  "MELANOSUCHUS NIGER",
  5.4,
  14,
  "#596b47",
  "宽鼻吻、隆起眼窝、深色骨甲背与扁侧尾，四肢低伏，转弯时尾身联动。",
  "A broad muzzle, raised eye sockets, dark dorsal osteoderms and laterally flattened tail; four low limbs move with the body.",
  -360,
  48,
  5,
  { hunterAbility: "shark" },
);
hunter(
  "green_anaconda",
  "绿森蚺",
  "Green Anaconda",
  "EUNECTES MURINUS",
  8.2,
  15,
  "#698249",
  "橄榄绿长躯带黑色椭圆斑，眼与鼻孔位于头顶，尾部随游泳形成连续S弯。",
  "An olive-green elongated body with black oval spots, eyes and nostrils on top, and a continuous S-shaped swimming wave.",
  -430,
  72,
  5,
);
hunter(
  "saltwater_crocodile",
  "湾鳄 · 外来幻想",
  "Saltwater Crocodile · Introduced",
  "CROCODYLUS POROSUS",
  6.4,
  16,
  "#8a7850",
  "宽大长颌、黄褐粗甲与高尾棘；湾鳄不是亚马逊原生，这里是幻想中的外来入侵者。",
  "A powerful long jaw, ochre coarse armor and raised tail ridges. Saltwater crocodiles are not native to the Amazon; this is a fictional introduced encounter.",
  -450,
  56,
  4,
  {
    hunterAbility: "shark",
    realSize: text(
      "现实分布于印度、东南亚和澳大利亚北部等地；本地图的出现明确属于幻想。",
      "Native to parts of India, Southeast Asia and northern Australia; its presence here is explicitly fictional.",
    ),
  },
);
const giant = (
  kind,
  name,
  en,
  latin,
  length,
  speed,
  color,
  desc,
  edesc,
  start,
  depth,
  population,
  extra = {},
) => {
  const anchors = along(start, depth, population);
  s.push(
    species(
      kind,
      name,
      en,
      latin,
      length,
      speed,
      population,
      "ancient",
      Math.max(35, Math.min(...anchors.map((p) => -p[1])) - 15),
      Math.max(...anchors.map((p) => -p[1])) + 45,
      color,
      desc,
      edesc,
      {
        spawnAnchors: anchors,
        residentRadius: 40,
        hunterTerritory: { minX: -400, maxX: 400, minZ: -1290, maxZ: -360 },
        extinct: true,
        ...extra,
      },
    ),
  );
};
giant(
  "titanoboa",
  "泰坦巨蟒",
  "Titanoboa",
  "TITANOBOA CERREJONENSIS",
  13,
  21,
  "#7c7751",
  "厚重长躯与低平宽头，比森蚺更有质量感；南美古雨林化石启发的复苏巨蛇。",
  "A heavy elongated body and low broad head, bulkier than the anaconda; a revived giant inspired by South American rainforest fossils.",
  -590,
  110,
  6,
);
giant(
  "purussaurus",
  "普鲁斯鳄",
  "Purussaurus",
  "PURUSSAURUS BRASILIENSIS",
  12.5,
  23,
  "#776743",
  "宽阔短吻、巨大下颌、重型背甲与粗尾，沿深潭底部巡弋。",
  "An exceptionally broad short muzzle, massive lower jaw, heavy dorsal armor and thick tail patrol the deep pools.",
  -650,
  145,
  6,
);
giant(
  "stupendemys",
  "骇龟",
  "Stupendemys",
  "STUPENDEMYS GEOGRAPHICUS",
  7,
  4,
  "#7c8060",
  "巨型侧颈龟背甲带前缘角状突起和层层生长纹；缓慢移动，供中后期补给。",
  "A giant side-necked turtle with hornlike anterior shell projections and layered growth rings; slow moving, useful in mid-game.",
  -520,
  100,
  6,
  {
    predator: false,
    realSize: text(
      "骇龟背甲化石约3米级；本作7米全长是明确的放大幻想，并非精确古生物复原。",
      "Fossil shells reached roughly 3 m; this game's 7 m total length is explicit fantasy scaling, not an exact reconstruction.",
    ),
  },
);
shoal(
  "flood_arapaima",
  "洪流巨骨鱼",
  "Flood Arapaima",
  "ORIGINAL FANTASY",
  7.8,
  6.2,
  "#ba8146",
  "铜红巨大鳞片与长扇尾，沿深潭环游；它是大型食物链中的原创巨骨鱼。",
  "Copper-red giant scales and a long fan tail circle the pools; an original giant arapaima for the large-prey food chain.",
  [
    ...along(-640, 132, 4),
    amazonAnchor(-1, -760, 200),
    amazonAnchor(1, -1040, 250),
  ],
  4,
);
s.at(-1).realSize = fantasy;
giant(
  "rootback_colossus",
  "沉根巨颚兽",
  "Rootback Colossus",
  "ORIGINAL FANTASY",
  27,
  31,
  "#5d6a43",
  "粗壮鳄形前躯、分枝骨棘和长桨尾，潜伏深潭；即使长到25米也应避开正面。",
  "A massive crocodilian forebody, branching bony ridges and paddle tail lurk in pools; even 25 m explorers should avoid its front.",
  -760,
  190,
  3,
  {
    realSize: fantasy,
    extinct: false,
    depthMax: 370,
    hunterAbility: "shark",
    spawnAnchors: [
      amazonAnchor(-1, -760, 245),
      amazonAnchor(1, -1040, 315),
      [12, -135, -1255],
    ],
  },
);
export const AMAZON_SPECIES = Object.freeze(
  s.map((entry) => Object.freeze(entry)),
);
Object.freeze(AMAZON_EN);
