import { ODYSSEY_EXTRA_ROWS } from "./odyssey_species_extra.js";
import { ODYSSEY_WORLD as W, odysseySeabedHeight } from "./odyssey_config.js";

export const ODYSSEY_EN = {};
export function odysseyText(zh, en) {
  ODYSSEY_EN[zh] = en;
  return zh;
}
const t = odysseyText;
const habitat = t(
  "由伊萨卡浅湾沿海妖花园、断桅礁棚与深水峡口潜入深水。",
  "Descend from Ithacan shallows through Nereid Gardens, the broken-mast shelf and deep straits.",
);
const counter = t(
  "寻找与自己体长相称的猎物；黄色标记会反击，红色标记是危险猎手。沿礁岩保留返程与补给路线。",
  "Find meals suited to your length. Yellow-marked prey retaliate; red markers indicate dangerous hunters. Keep a retreat and feeding route along the reefs.",
);
const fantasy = t(
  "传说海域中的幻想生灵；体长与水层为游戏设定。",
  "A fantasy lifeform of the legendary sea; sizes and depth bands are game adaptations.",
);
const nursery = [
  [-24, -18, 65],
  [24, -20, 35],
  [-28, -20, -20],
  [25, -22, -75],
  [0, -24, -125],
];
const route = (start, count, depthOffset = 25) =>
  Array.from({ length: count }, (_, i) => {
    const x = (i % 2 ? -1 : 1) * (35 + (i % 3) * 20),
      z = start - i * 125;
    return [x, odysseySeabedHeight(x, z) + depthOffset, z];
  });
const rows = [
  [
    "ambrosia_sprat",
    "琥珀灵鱼",
    "Ambrosia Sprat",
    0.55,
    2.1,
    "#e3aa64",
    "幼湾中的金褐色小鱼，背鳍像一片细小船帆。黎明时它们沿海草汇聚，夕光洒入海面后，又把琥珀般的鳞片藏进礁缝。",
    "Amber-brown nursery fish carry small sail-shaped dorsal fins. At dawn they gather along seagrass; when evening light enters the sea, their amber scales disappear into reef cracks.",
    nursery,
    7,
    false,
  ],
  [
    "moon_scallop",
    "月纹扇贝",
    "Moon Scallop",
    0.8,
    1.7,
    "#d4c5da",
    "扇形双壳刻着弧状月纹，软膜沿壳缘轻轻开合。潮流转弱时，它们会连着几次合壳，像一串被水托起的月亮，躲进浅湾的玫瑰珊瑚。",
    "Ribbed fan-shaped shells carry curved moon markings and soft opening mantles. When currents ease, repeated shell claps carry them like a string of moons into rose-colored nursery coral.",
    nursery,
    5,
    false,
  ],
  [
    "lyre_ray",
    "琴翼鳐",
    "Lyre Ray",
    1.5,
    2.6,
    "#7bb9ce",
    "宽翼向两侧弯成古琴的轮廓，双尾丝拖在身后。它们成群掠过沙纹，翼缘依次起伏，传说海妖曾把这种节律学进自己的歌声。",
    "Broad wings curve like a lyre, with twin trailing tail ribbons. Schools skim ripple-marked sand, their wing edges rising in sequence; seafarers say the sea maidens learned their songs from this rhythm.",
    nursery.concat(route(-200, 2, 35)),
    4,
    false,
  ],
  [
    "pearl_seahorse",
    "珠冠海马",
    "Pearl-crowned Seahorse",
    2.4,
    2.1,
    "#d8b989",
    "卷尾攀住海草，管状长吻探向水流，头冠的珍珠纹在暗处显出淡淡光泽。它们不随大群游动，而各自守着一小片贝壳花园。",
    "A curled tail clasps seagrass while a tubular snout reaches into the current. Pearl markings on its crown show a restrained sheen in dim water. Each guards a small shell garden instead of joining large schools.",
    route(-180, 6, 32),
    2,
    false,
  ],
  [
    "nereid",
    "珊瑚美人鱼",
    "Coral Mermaid",
    4,
    5.5,
    "#b77faf",
    "长发与珊瑚冠随水摆动，银紫色鳞尾从腰身连贯延伸。她们在沉没的船锚间照看贝园，常循着失落的旋律游向列柱，不会离开海水飞行。",
    "Long hair and coral crowns sway above silver-violet scaled tails. These mermaids tend shell gardens among sunken anchors and follow forgotten melodies toward the colonnades, always remaining underwater.",
    route(-170, 7, 38),
    2,
    false,
  ],
  [
    "hippocampus",
    "海神马",
    "Hippocampus",
    6,
    8,
    "#5d9ca0",
    "昂首的马形前身接着长而弯曲的鳞尾，鬃鳍沿颈背展开。在海神仪仗的传说中，海神马牵引浪潮；如今小群循古代航道寻找柔软的海草。",
    "An equine forebody joins a long curved scaled tail, with mane fins along its neck. In tales of divine sea processions hippocampi draw the tides; here small groups follow old sea roads to soft seagrass.",
    route(-220, 6, 45),
    2,
    false,
  ],
  [
    "triton_guard",
    "海螺卫士",
    "Triton Guard",
    8,
    15,
    "#5f9fa5",
    "粗壮的上身披着贝甲，长尾摆动时像低沉的鼓点。海螺卫士巡守破碎的青铜门，驱赶闯入的猎食者，也会利用列柱掩护突袭。",
    "A broad torso wears shell armor above a muscular tail. Triton guards patrol broken bronze gateways, driving away intruders and using columns to conceal ambushes.",
    route(-270, 5, 55),
    2,
    true,
  ],
  [
    "siren_eel",
    "塞壬鳍妖",
    "Siren Finweaver",
    10,
    17,
    "#92759e",
    "苍白的面具状头部藏在折叠鳍幕之间，细长的鳗身弯过沉船的断桅。水下的歌声仿佛来自每一个方向，只有鳍边的起伏暴露了它的游踪。",
    "A pale masklike head hides between folded fin curtains as an elongated eel body bends around broken masts. Its imagined underwater song seems to come from every direction; rippling fin edges betray its path.",
    route(-360, 5, 55),
    2,
    true,
  ],
  [
    "naga_huntress",
    "潮冠娜迦",
    "Tide-crowned Naga",
    13,
    19,
    "#4e8f78",
    "高展的蛇冠护住人形肩臂，修长的蛇尾贴着古石盘旋。她循陌生洋流来到这片海域，在珊瑚与青铜遗物之间建立领地；折返时全身像一条绷紧的缎带。",
    "A raised serpent hood frames humanoid shoulders and arms while a long tail coils around ancient stone. Arriving along foreign currents, she claimed coral and bronze relics; her turning body flows like a taut ribbon.",
    route(-430, 4, 62),
    2,
    true,
  ],
  [
    "ketos",
    "刻托海兽",
    "Ketos",
    17,
    21,
    "#a49b71",
    "狮形巨首露出长牙，鳞片与鳍肢覆住强健的身躯。古代陶器上的海兽仿佛走进了暗水，胸前鳍肢稳定头部，长尾把猎手送进礁石间的缺口。",
    "A lionlike head bares long teeth above a strong scaled body and flipper limbs. As though an ancient painted sea monster entered the dark water, it steadies its head with foreflippers and drives through reef gaps with its tail.",
    route(-510, 4, 70),
    2,
    true,
  ],
  [
    "bronze_turtle",
    "青铜巨龟",
    "Bronze Bastion Turtle",
    18,
    7,
    "#819988",
    "层叠的甲盾带着青铜般的旧色，宽桨肢缓缓划水。它们在巨兽领地外侧啃食厚重藻被，成年探险者能在安静礁肩找到这种丰厚补给。",
    "Layered shell shields carry the patina of old bronze above broad paddles. They graze thick algae on the outskirts of the monsters' territories, offering substantial meals on quiet reef shelves.",
    [
      [35, odysseySeabedHeight(35, -405) + 45, -405],
      [100, -370, -680],
      [-115, -540, -915],
      [20, -305, -570],
      [-40, -435, -790],
    ],
    2,
    false,
  ],
  [
    "abyss_lamprey",
    "冥河环口兽",
    "Styx Ringmaw",
    22,
    23,
    "#755473",
    "环形口器密布内向齿列，细长躯干沿地层缝隙游曳。它不等待传说中的亡者，而在昏暗水层追逐活物；侧身露出的褶鳃随着水流逐次张合。",
    "Inward tooth rows line a circular mouth above a long body that follows fissures. It hunts living creatures in the dim water, its pleated flank gills opening sequentially with the current.",
    [
      [-80, -430, -740],
      [110, -470, -810],
      [-150, -590, -1010],
      [0, -345, -650],
    ],
    2,
    true,
  ],
  [
    "oracle_whale",
    "神谕巨鲸",
    "Oracle Whale",
    24,
    8,
    "#7c9aa8",
    "高拱的鲸颌与巨大的胸腹托着古老冠脊，尾叶平缓上下翻动。它独自穿过远离涡心的深水，身上的白纹好似断续星图；人们把它的来去读成归航的预兆。",
    "A vaulted whale jaw and broad chest support an ancient crest; its flukes rise and fall slowly. Solitary animals pass through deep water away from the vortex, their pale markings like broken star charts read as omens of homecoming.",
    [
      [-35, odysseySeabedHeight(-35, -450) + 58, -450],
      [95, -435, -805],
      [-140, -490, -845],
      [25, -560, -1030],
      [-20, -325, -610],
    ],
    2,
    false,
  ],
  [
    "ceto_serpent",
    "暗潮海蛇",
    "Ceto Serpent",
    31,
    29,
    "#315d68",
    "冠脊与覆鳞长身连成连续的浪形，吻端利齿从黑水中探出。它徘徊在终段的侧沟，既不臣服于六首怪物，也不敢靠近吞潮巨口，巨大的体型令成长后的主角仍需保护侧背。",
    "A crested head and long scaled trunk form a continuous wave, with teeth emerging from dark water. It prowls terminal side gullies, yielding to neither the six-headed monster nor the tide-swallowing maw, and remains a threat to large explorers' exposed flanks.",
    [
      [-155, -480, -845],
      [100, -630, -1030],
      [150, -520, -900],
    ],
    1,
    true,
  ],
];

/** 全新水下神话生态；锚点、水层和补给不借用现有地图。 */
export const ODYSSEY_SPECIES = Object.freeze(
  [...rows, ...ODYSSEY_EXTRA_ROWS].map(
    ([
      kind,
      zh,
      en,
      length,
      speed,
      color,
      desc,
      edesc,
      anchors,
      count,
      predator,
    ]) => {
      const schoolSize =
        predator ||
        length >= 18 ||
        [
          "pearl_seahorse",
          "nereid",
          "silver_pipefish",
          "amphora_hermit",
          "thalassa_manta",
        ].includes(kind)
          ? 1
          : count;
      const profiles =
        schoolSize > 1
          ? anchors.map((anchor) => ({
              anchor,
              count,
              depthMin: Math.max(5, -anchor[1] - 18),
              depthMax: -anchor[1] + 18,
              fixedHabitat: true,
              nurseryResident: anchor[2] > -150,
              densityLimit: Math.ceil(count * 1.1),
            }))
          : null;
      return Object.freeze({
        kind,
        label: t(zh, en),
        latin: en.toUpperCase(),
        category: "mythic",
        mythic: true,
        western: true,
        worldBounds: W,
        length,
        speed,
        color,
        predator,
        hunterTerritory: predator
          ? { minX: W.minX + 8, maxX: W.maxX - 8, minZ: W.minZ + 8, maxZ: -160 }
          : undefined,
        tier: predator ? 2 : 0,
        population: anchors.length * count,
        densityMultiplier: 1.1,
        schoolSize,
        independentMovement: schoolSize === 1,
        residentRadius: schoolSize === 1 ? (predator ? 45 : 30) : 0,
        spawnAnchors: anchors.flatMap((a) =>
          Array.from({ length: count }, (_, i) => {
            if (schoolSize > 1) return a;
            const radius = Math.min(26, length * 1.7);
            const x = a[0] + Math.sin(i * 2.399) * radius;
            const z = a[2] + Math.cos(i * 2.399) * radius;
            return [
              x,
              Math.max(a[1], odysseySeabedHeight(x, z) + length * 0.2 + 1),
              z,
            ];
          }),
        ),
        schoolAnchors: anchors,
        schoolProfiles: profiles || undefined,
        layeredSchools: Boolean(profiles),
        nurseryResident: anchors.every((anchor) => anchor[2] > -150),
        depthMin: Math.max(5, Math.min(...anchors.map((a) => -a[1])) - 22),
        depthMax: Math.max(...anchors.map((a) => -a[1])) + 22,
        nutrition: length < 1 ? 9 : 18 + length * 3,
        growth:
          length < 1 ? 0.018 : 0.04 + length * 0.04 + (length / 6) ** 2 * 0.14,
        description: t(desc, edesc),
        counter,
        habitatNote: habitat,
        realSize: fantasy,
        ability: t(
          predator ? "神话水猎" : "海中巡游",
          predator ? "Mythic sea predation" : "Underwater roaming",
        ),
        background: t(
          desc +
            "\n\n它的栖地连接着古代的航路，沿途的贝壳、沉锚与残柱留下了旅人和神灵的故事。",
          edesc +
            "\n\nIts habitat follows ancient sea roads, where shells, sunken anchors and fallen columns preserve the stories of travelers and sea spirits.",
        ),
        backgroundType: "神话传说",
      });
    },
  ),
);
