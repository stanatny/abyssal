import { PENGLAI_WORLD as W, penglaiHeightAt } from "./penglai_config.js";

export const PENGLAI_EN = {};
export const penglaiText = (zh, en) => {
  PENGLAI_EN[zh] = en;
  return zh;
};
const t = penglaiText;
const fantasy = t(
  "蓬莱神话生灵，穿行于莲池、仙山与云海之间。",
  "Mythic life of Penglai, moving between lotus pools, sacred mountains and the cloud sea.",
);
const counter = t(
  "在莲池与云间寻找适合自己体长的食物；注意黄色反击和红色危险标记，保护侧背。",
  "Find appropriately sized meals in lotus waters and clouds. Watch yellow retaliation and red danger markers; protect your flanks.",
);
const air = (x, y, z) => [x, Math.max(y, penglaiHeightAt(x, z) + 24), z];
const land = (x, z, length) => [
  x,
  penglaiHeightAt(x, z) + length * 0.28 + 2,
  z,
];
const nursery = [
  [-24, -20, 60],
  [24, -22, 35],
  [-32, -22, -30],
  [32, -20, -90],
];
const sky = [
  air(-110, 35, -185),
  air(110, 65, -235),
  air(-160, 85, -390),
  air(145, 115, -490),
  air(-130, 175, -760),
  air(140, 230, -920),
];
const pond = [
  [-50, -18, -120],
  [80, -18, -190],
  [-95, -12, -270],
  [-50, -20, -1030],
  [60, -20, -1060],
  [0, -20, -1110],
];
const rows = [
  [
    "jade_minnow",
    "玉鳞游灵",
    "Jade Minnow",
    0.6,
    2.1,
    "#80bfa1",
    "鱼",
    "针梭般的纤细鱼身、尖吻与短叉尾，在莲茎间成群穿行。",
    "A slender needle-like body, pointed snout and short forked tail thread among lotus stems.",
    nursery,
    8,
  ],
  [
    "lotus_sprite",
    "莲心贝灵",
    "Lotus Sprite",
    1.1,
    1.9,
    "#e5abb8",
    "贝",
    "莲瓣状双壳围绕珠核舒展，水底触丝随波摆动。",
    "Petal-shaped shells unfold around a pearl core; slender feelers trail in the water.",
    nursery,
    6,
  ],
  [
    "wenyao",
    "文鳐鱼",
    "Wenyao Wingfish",
    1.8,
    3.6,
    "#79a9be",
    "翼鱼",
    "白首赤喙与深色纹理，展开两侧鸟翼穿行低空。",
    "A pale head, red beak and dark markings accompany broad feathered wings.",
    sky.slice(0, 4),
    7,
  ],
  [
    "luoyu",
    "蠃鱼",
    "Luo Skyfish",
    2.5,
    3.1,
    "#dfbd64",
    "翼鱼",
    "细长鱼躯、后掠尖鸟翼与双束长尾，和白首赤喙、宽翼鲤形的文鳐区分。",
    "A slender fish body, swept pointed bird wings and twin ribbon tails distinguish it from the pale-headed, red-beaked, broad-winged Wenyao.",
    sky,
    5,
  ],
  [
    "chiru",
    "赤鱬",
    "Chiru",
    3.3,
    3.2,
    "#bd6350",
    "鱼",
    "赤铜鳞片与类人的额鼻轮廓，保持真实的鱼身和分叉尾。",
    "Copper scales and a face-like brow sit above a complete fish body and forked tail.",
    pond,
    4,
  ],
  [
    "xuangui",
    "旋龟",
    "Xuangui",
    4.5,
    3.0,
    "#669986",
    "龟",
    "雕纹甲壳、鸟喙和长蛇尾，沿浅水石床缓缓巡游。",
    "An engraved shell, hooked bird beak and long serpent tail patrol shallow stone beds.",
    pond,
    3,
  ],
  [
    "spirit_carp",
    "瑞鲤",
    "Auspicious Carp",
    6,
    4.2,
    "#e29652",
    "鱼",
    "修长赤金锦鲤身、口边长须与飘带般的长尾，循龙门水流游动，也在北方莲池外缘成群穿行。",
    "A long red-gold koi body, mouth barbels and veiled tail follow the Dragon Gate currents and school along the northern lotus pool rim.",
    sky.slice(0, 4),
    4,
  ],
  [
    "lushu",
    "鹿蜀",
    "Lushu",
    7.8,
    4.8,
    "#b68858",
    "兽",
    "白首、虎纹马身、红色长尾；四足在山间石径行走。",
    "A white-headed, tiger-striped horse with a red tail walks the mountain paths.",
    [land(-210, -315, 7.8), land(230, -380, 7.8)],
    4,
  ],
  [
    "cloud_crane",
    "云鹤",
    "Cloud Crane",
    8.5,
    17,
    "#e7ddc0",
    "鸟",
    "伸展长颈、黑白翼羽与红冠，以留有翼展间距的雁行队列掠过桃林。",
    "An extended neck, black-and-white flight feathers and red crown fly in spaced V formations above peach groves.",
    sky,
    3,
  ],
  [
    "dragon_carp",
    "龙门金鲤",
    "Dragon-Gate Carp",
    10,
    5.0,
    "#b78c42",
    "鱼",
    "金铜鳞、厚实鱼身与长须；部分金鲤会在龙门前蓄势跃升，化为四足赤金云龙，巡游后收回鲤形。",
    "Bronze-gold scales, a deep fish body and long barbels. Some carp gather before the Dragon Gate, leap into four-footed red-gold cloud dragons, then return to carp form.",
    sky,
    3,
  ],
  [
    "bifang",
    "毕方",
    "Bifang",
    11,
    20,
    "#498e9d",
    "鸟",
    "单足、青羽赤纹与白喙，长翼在云海中有力振动。",
    "One leg, blue feathers with red markings and a pale beak accompany strong wingbeats.",
    sky.slice(2),
    3,
  ],
  [
    "nine_tail_fox",
    "九尾狐",
    "Nine-Tailed Fox",
    13,
    6.6,
    "#ede0c2",
    "兽",
    "尖耳窄吻和九束蓬松长尾，沿桃花山脊低伏巡猎。",
    "Pointed ears, a narrow muzzle and nine distinct flowing tails prowl peach-lined ridges.",
    [land(-270, -555, 13), land(280, -585, 13)],
    3,
    true,
  ],
  [
    "hujiao",
    "虎蛟",
    "Hujiao",
    16,
    7.2,
    "#577d68",
    "龙",
    "深体鱼身、放射状鳍与连续长蛇尾，贴水游猎。",
    "A deep fish body, rayed fins and continuous serpent tail form a water-skimming mythic hunter.",
    [...pond.slice(2), [-64, -20, -1090]],
    3,
    true,
  ],
  [
    "gudiao",
    "蛊雕",
    "Gudiao",
    19,
    24,
    "#67526b",
    "鸟",
    "锐利角冠、钩喙、分层飞羽与巨爪，盘旋后俯冲。",
    "A horned crown, hooked beak, layered feathers and great talons patrol the sky.",
    sky.slice(2),
    3,
    true,
  ],
  [
    "zheng",
    "狰",
    "Zheng",
    23,
    8.3,
    "#ba7551",
    "兽",
    "独角、豹形肌肉与五条长尾，贴近山石突然跃击。",
    "A horn, powerful leopard anatomy and five long tails precede a warned mountain leap.",
    [land(-382, -668, 23), land(370, -698, 23)],
    3,
    true,
  ],
  [
    "bashe",
    "巴蛇",
    "Bashe",
    29,
    8.4,
    "#5c8268",
    "龙",
    "长躯有连续鳞脊和宽阔蛇头，绕山体盘曲游动。",
    "A long scaled body and broad serpent skull coil around the mountain flanks.",
    [air(-190, 220, -900), air(220, 270, -1150)],
    3,
    true,
  ],
  [
    "kui",
    "夔",
    "Kui",
    34,
    8.2,
    "#4e7076",
    "兽",
    "厚重牛形躯干与一条柱状足，雷纹甲皮在起跳前发亮。",
    "A heavy bovine body and one pillar-like leg display thunder markings before leaping.",
    [land(-385, -1085, 34), land(425, -1095, 34)],
    2,
    true,
  ],
  [
    "kun",
    "鲲",
    "Kun",
    40,
    8.8,
    "#4e929d",
    "鲸",
    "宽阔巨首、云脊、展开的翼鳍与横向月牙尾，缓缓穿行高空；抬升展翼后会化为钩喙、利爪与巨翼的大鹏。",
    "A broad giant head, cloud ridge, spreading fins and horizontal crescent flukes drift through high clouds. After rising it unfolds into a hooked-beaked, taloned Peng with vast wings.",
    [air(-160, 360, -950), air(220, 420, -1210)],
    2,
    true,
  ],
];
const formationBird = (kind) =>
  ["cloud_crane", "bifang", "gudiao"].includes(kind);
export const PENGLAI_SPECIES = Object.freeze(
  rows.map(
    ([
      kind,
      zh,
      en,
      length,
      speed,
      color,
      form,
      desc,
      edesc,
      points,
      count,
      predator = false,
    ]) => {
      const flying =
        ["翼鱼", "鸟", "鲸"].includes(form) ||
        ["spirit_carp", "dragon_carp", "bashe"].includes(kind);
      const groundbound = form === "兽";
      // 不同空中物种分开航带；成队飞行保留原有种类、数量与食物收益。
      if (flying)
        points = points.map((p, index) => {
          const rank = rows.findIndex((r) => r[0] === kind),
            x = p[0] + ((rank % 3) - 1) * 44,
            z = p[2] + ((rank % 4) - 1.5) * 22;
          // 全队绕行半径内也要高过山脊，不能只在中心点留净空。
          let high = penglaiHeightAt(x, z);
          for (let a = 0; a < 16; a++)
            high = Math.max(
              high,
              penglaiHeightAt(
                x +
                  Math.sin((a * Math.PI) / 8) *
                    (formationBird(kind) ? 155 : 95),
                z +
                  Math.cos((a * Math.PI) / 8) *
                    (formationBird(kind) ? 155 : 95),
              ),
            );
          return air(x, Math.max(p[1] + rank * 9, high + 55), z);
        });
      const formation = ["cloud_crane", "bifang", "gudiao"].includes(kind)
        ? "vee"
        : groundbound
          ? "line"
          : flying
            ? "staggered"
            : null;
      const profiles = points.map((p) => ({
        anchor: p,
        count,
        depthMin: -p[1] - (flying ? 35 : 8),
        depthMax: -p[1] + (flying ? 35 : 8),
        fixedHabitat: true,
        nurseryResident: points === nursery,
        densityLimit: Math.ceil(count * 1.7),
      }));
      if (kind === "spirit_carp") {
        for (const anchor of [
          [-74, -17, -1060],
          [65, -18, -1075],
          [0, -20, -1132],
        ])
          profiles.push({
            anchor,
            count: 4,
            depthMin: 8,
            depthMax: 30,
            fixedHabitat: true,
            densityLimit: 6,
          });
      }
      return Object.freeze({
        kind,
        label: t(zh, en),
        latin: en.toUpperCase() + " / MYTHIC INTERPRETATION",
        mythic: true,
        form,
        worldBounds: W,
        category: "mythic",
        length,
        speed,
        color,
        population: profiles.reduce((sum, p) => sum + p.count, 0),
        schoolSize: count,
        independentMovement: groundbound || predator,
        ...(formation ? { formation } : {}),
        ...(flying
          ? {
              flightRadius: formationBird(kind)
                ? 90 + length * 0.6
                : 50 + length * 0.7,
              flightClearance: 0.85,
              formationSpacing: 2.15,
            }
          : {}),
        tier: predator ? 2 : 0,
        predator,
        flying,
        groundbound,
        ...(groundbound
          ? { minimumGroundHeight: W.surfaceY + 1, scatterPopulation: true }
          : {}),
        depthMin: Math.min(...profiles.map((p) => p.depthMin)),
        depthMax: Math.max(...profiles.map((p) => p.depthMax)),
        nutrition: 12 + length * 3,
        growth: 0.035 + length * 0.045 + (length / 6) ** 2 * 0.14,
        description: t(desc, edesc),
        ability: t(
          kind === "kun"
            ? "扶摇化鹏"
            : kind === "dragon_carp"
              ? "跃龙门 · 化龙巡猎"
              : groundbound
                ? "山径游走与跃击"
                : flying
                  ? "云间巡游"
                  : "浅水巡游",
          kind === "kun"
            ? "Soaring transformation"
            : kind === "dragon_carp"
              ? "Dragon Gate ascent · transformed hunt"
              : groundbound
                ? "Mountain patrol and leaps"
                : flying
                  ? "Cloud flight"
                  : "Shallow-water patrol",
        ),
        realSize: fantasy,
        counter,
        habitatNote: t(
          "蓬莱独立神话生态：莲池、桃林山径与云海空域。水层与飞行高度随各自栖地分布。",
          "An isolated mythic ecosystem: lotus waters, peach-lined mountain paths and cloud skies, with habitat-specific depths and altitudes.",
        ),
        habitatLabel: t(
          flying
            ? "云海与山间空域"
            : groundbound
              ? "山间地表与桃花林"
              : "莲池与浅水石床",
          flying
            ? "Clouds and mountain airspace"
            : groundbound
              ? "Mountain ground and peach groves"
              : "Lotus pools and shallow stone beds",
        ),
        ...(groundbound || predator
          ? {
              // 大型空中猎手各自巡游；不能把多只个体的家重复落在同一个中心。
              spawnAnchors:
                flying && predator
                  ? points.flatMap((point) =>
                      Array.from({ length: count }, (_, i) => [
                        point[0] + (i - (count - 1) / 2) * length * 2.4,
                        point[1],
                        point[2],
                      ]),
                    )
                  : points,
              residentRadius: groundbound
                ? Math.max(38, length * 2.1)
                : flying
                  ? Math.max(80, length * 3)
                  : 45,
              hunterTerritory: {
                minX: -560,
                maxX: 560,
                minZ: -1350,
                maxZ: -145,
              },
            }
          : {
              schoolProfiles: profiles,
              schoolAnchors: profiles.map((p) => p.anchor),
              layeredSchools: true,
              nurseryResident: points === nursery,
            }),
      });
    },
  ),
);
