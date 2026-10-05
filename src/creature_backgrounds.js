import { ODYSSEY_SPECIES, ODYSSEY_EN } from "./odyssey_species.js";
import { ODYSSEY_LORD_DESCRIPTIONS } from "./odyssey_lords.js";
import { CREATURE_LORE } from "./creature_lore.js";
/** 自然百科、化石复原与传说分开记录；本作战斗参数不当作真实生物知识。 */
export const BACKGROUND_EN = {
  自然百科: "Natural history",
  化石复原: "Fossil reconstruction",
  神话传说: "Myth and legend",
  背景故事: "Background story",
};
const records = new Map();
function add(kind, type, zh, en) {
  BACKGROUND_EN[zh] = en;
  records.set(
    kind,
    Object.freeze({
      background: zh,
      backgroundType: type,
    }),
  );
}
// 每行对应实际生物工厂的kind，避免多个名称共用一段空泛简介。
const natural = [
  [
    "anchovy",
    "鳀鱼是体侧带银色纵带的小型群游鱼。它们构成海洋食物网中连接浮游生物与大型捕食者的一环。",
    "Anchovies are small schooling fishes with a silvery flank stripe, linking plankton to larger predators in marine food webs.",
  ],
  [
    "herring",
    "鲱鱼以银亮、侧扁的身体群游于海洋水层。密集鱼群也是许多海鸟、鱼类和海洋哺乳动物的食物。",
    "Herring school through marine waters with silvery, laterally compressed bodies, providing food for seabirds, fishes and marine mammals.",
  ],
  [
    "sardine",
    "沙丁鱼的蓝绿背部和银白腹部构成反荫体色。它们以群体生活，是许多沿海食物网的重要成员。",
    "Sardines have blue-green backs and silver undersides. Their schooling lifestyle makes them important members of coastal food webs.",
  ],
  [
    "flying_fish",
    "飞鱼有展开成翼状的胸鳍。它们先在水中获得速度，再跃出海面滑翔，并非像鸟那样靠扇翅飞行。",
    "Flying fishes spread enlarged pectoral fins to glide after accelerating underwater; they do not flap their fins like birds.",
  ],
  [
    "boxfish",
    "箱鲀的骨质甲片形成箱状躯干，与普通流线型鱼不同。细小的鳍负责调整姿态，尾部提供推进。",
    "Boxfishes carry a box-shaped bony carapace; small fins control their attitude while the tail provides propulsion.",
  ],
  [
    "mackerel",
    "鲭鱼属于擅长持续游动的海洋鱼。流线形躯干、窄尾柄和分叉尾鳍适于在开阔水域群游。",
    "Mackerels are marine swimmers with streamlined bodies, narrow tail stalks and forked tails suited to schooling in open water.",
  ],
  [
    "fish",
    "本作这一档案代表珊瑚礁中的小型杂鱼，并非某一个真实物种。礁区为它们提供藏身和觅食的空间。",
    "This entry represents a mixed group of small reef fishes rather than one real species. Reefs provide feeding places and shelter.",
  ],
  [
    "turtle",
    "海龟是呼吸空气的爬行动物，不能像鱼一样通过鳃呼吸。扁平的前肢帮助它们在水中推进。",
    "Sea turtles are air-breathing reptiles rather than gill-breathing fishes. Flattened forelimbs propel them through water.",
  ],
  [
    "parrotfish",
    "隆头鹦嘴鱼有粗壮的鱼身，成年个体前额高隆，喙状牙齿构成鲜明特征。它是热带珊瑚礁中的大型鹦嘴鱼。",
    "Bumphead parrotfish are large tropical reef fishes with robust bodies, a pronounced adult forehead and beak-like teeth.",
  ],
  [
    "wrasse",
    "苏眉属于隆头鱼科，成年个体有明显的隆起额头、厚唇和粗壮的身体。它与鹦嘴鱼的陡额喙口不同，是热带礁区中辨识度很高的大型鱼。",
    "Humphead wrasse are large tropical reef fishes with a rounded adult forehead, thick lips and a robust body, distinct from the steep brow and beak of bumphead parrotfish.",
  ],
  [
    "sunfish",
    "翻车鱼的成体没有普通鱼那样明显的尾鳍，高大的背鳍与臀鳍形成独特轮廓。幼鱼的形态与成体差别很大。",
    "Adult ocean sunfishes lack a conventional tail and have tall dorsal and anal fins. Their larvae look very different.",
  ],
  [
    "tuna",
    "金枪鱼属于鲭科，具有适于高速游泳的流线形体态。不同物种、年龄与海区的体型差异很大。",
    "Tunas belong to the mackerel family and have streamlined bodies for fast swimming. Size varies greatly by species, age and region.",
  ],
  [
    "ray",
    "蝠鲼以宽阔胸鳍游动，头鳍能将水和食物导入口中。真实蝠鲼主要滤食浮游生物，并非本作那样的凶猛猎手。",
    "Mantas swim with broad pectoral fins and funnel food with cephalic fins. They primarily filter plankton, unlike aggressive game predators.",
  ],
  [
    "angler",
    "深海鮟鱇的发光钓饵由背鳍鳍条演化而来，用来吸引猎物。鮟鱇类并非全部生活在深海。",
    "Deep-sea anglers lure prey with a glowing structure derived from a dorsal-fin ray. Not all anglerfishes inhabit deep water.",
  ],
  [
    "hammerhead",
    "双髻鲨的锤形头称为头翼，双眼位于两端。它是现实中的鲨鱼，不是远古灭绝种。",
    "Hammerheads carry eyes at the ends of a broad cephalofoil. These are living sharks rather than extinct prehistoric animals.",
  ],
  [
    "octopus",
    "章鱼是八腕头足动物，不是鱼。腕足连于头部，肌肉性身体能穿过狭小缝隙；喷墨是常见的防御方式。",
    "Octopuses are eight-armed cephalopods rather than fishes. Their flexible bodies enter crevices, and ink can help defend against predators.",
  ],
  [
    "shark",
    "大白鲨具有粗壮的流线形身体与三角齿。它们是真实海洋捕食者，本作幼年主角与它们的成长关系属于玩法设定。",
    "White sharks have robust streamlined bodies and triangular teeth. The game's growing-player relationship with them is a gameplay abstraction.",
  ],
  [
    "sperm_whale",
    "抹香鲸是呼吸空气的齿鲸，潜入深水寻找乌贼及其他猎物。巨大头部与较小背鳍构成辨识特征。",
    "Sperm whales are air-breathing toothed whales that dive for squid and other prey. Their large heads and small dorsal fins are distinctive.",
  ],
  [
    "spadefish",
    "大西洋白鲳有侧扁的身体、深色竖纹与高背鳍。它是现实中的礁区鱼，并不是亚特兰蒂斯专有的古城物种。",
    "Atlantic spadefishes have compressed bodies, dark vertical bars and tall dorsal fins. They are real reef fishes, not an Atlantis-exclusive species.",
  ],
  [
    "seahorse",
    "海马属于海龙科，具有直立姿态、管状吻和可卷曲的尾。它们的外形与普通水平游动的鱼明显不同。",
    "Seahorses are syngnathid fishes with upright posture, tubular snouts and curled tails, unlike typical horizontally swimming fishes.",
  ],
  [
    "cuttlefish",
    "乌贼属于头足动物，外套两侧的鳍帮助精细游动。它们的腕围绕口部，能喷墨并改变皮肤图案。",
    "Cuttlefishes are cephalopods with mantle fins for precise swimming, arms around the mouth, ink defenses and changing skin patterns.",
  ],
  [
    "blue_shark",
    "蓝鲨有细长的身体、长胸鳍和蓝色背部。本作把它放进古城海域，并不表示真实蓝鲨依赖遗迹栖息。",
    "Blue sharks have slender bodies, long pectoral fins and blue backs. Their association with sunken ruins here is fictional.",
  ],
  [
    "swordfish",
    "剑鱼的上颌延长成扁平剑状，是远洋捕食鱼。本作的冲锋能力是对这一外形和运动特征的玩法改编。",
    "Swordfishes are pelagic predators with an elongated, flattened upper jaw. Their game charge adapts this shape and swimming behavior.",
  ],
  [
    "queen_angelfish",
    "女王神仙鱼是体色鲜明的热带礁鱼，侧扁的身形适于礁区生活。风暴中的特殊分布属于本作场景设计。",
    "Queen angelfishes are brightly colored, deep-bodied tropical reef fishes. Their storm-sea distribution here is a game design.",
  ],
  [
    "triggerfish",
    "扳机鱼有结实的身体和能竖起的背鳍棘。不同种类的花纹与食物不同，本作沿用其硬朗的礁鱼轮廓。",
    "Triggerfishes have robust bodies and erectable dorsal spines. Patterns and diets vary; this model emphasizes their sturdy reef-fish silhouette.",
  ],
  [
    "needlefish",
    "针鱼的上下颌都细长，常在近表层活动。它们是真实鱼类，不能把细长吻部误认为只有上颌延长的剑鱼。",
    "Needlefishes have elongated upper and lower jaws and often occupy surface waters, unlike swordfishes with only an extended upper jaw.",
  ],
  [
    "barracuda",
    "大梭鱼具有长身、尖齿和突出的下颌。其外形与开阔水域中的突然袭击相适应。",
    "Great barracudas have long bodies, sharp teeth and projecting lower jaws, adapted to sudden attacks in open water.",
  ],
  [
    "tiger_shark",
    "虎鲨幼体的体侧条纹像虎斑，随成长会变淡。它与白虎神兽无关，是现实中的现代鲨鱼。",
    "Young tiger sharks carry tiger-like flank bars that fade with age. They are living sharks, unrelated to the mythic White Tiger.",
  ],
  [
    "moorish_idol",
    "角镰鱼拥有鲜明的黑、白、黄体色和延长的背鳍丝。现实中它是热带礁鱼，而非深沟巨型动物。",
    "Moorish idols have black, white and yellow markings and an elongated dorsal filament. They are tropical reef fishes, not trench giants.",
  ],
  [
    "lanternfish",
    "灯笼鱼以身上的发光器官而得名，是深海中层的重要小型鱼类。本作放大的体长与战斗能力并非真实尺度。",
    "Lanternfishes bear light organs and are important small midwater fishes. Their enlarged game size and combat abilities are not real measurements.",
  ],
  [
    "barreleye",
    "管眼鱼的眼睛位于透明头罩内，前方看似眼孔的位置其实是嗅觉器官。这个模型参考管眼鱼类的特殊感官结构。",
    "Barreleye eyes sit inside a transparent head; apparent eye holes at the front are olfactory organs. The model adapts this unusual anatomy.",
  ],
  [
    "dragonfish",
    "深海龙鱼是拥有发光器官的一类鱼，部分种类带有发光触须。它们与神话中的龙或海德拉并无亲缘关系。",
    "Deep-sea dragonfishes bear light organs, and some have luminous barbels. They are unrelated to mythic dragons or Hydra.",
  ],
  [
    "snailfish",
    "狮子鱼科鱼类拥有柔软的身体；中文俗名容易与有毒棘的蓑鲉混淆，本档案指深沟中的柔软鱼类。",
    "Snailfishes have soft bodies; this trench entry is not a spiny, venomous lionfish despite ambiguity in common names.",
  ],
  [
    "goblin_shark",
    "剑吻鲨有长而扁的吻部和可前伸的颌部，是现实中的深水鲨鱼。这里的巨大尺寸属于游戏改编。",
    "Goblin sharks are deep-water sharks with long flattened snouts and protrusible jaws. Their giant size here is a gameplay adaptation.",
  ],
  [
    "moon_jelly",
    "海月水母是刺胞动物，伞状身体通过收缩推进。它不是鱼，也不是可以靠尾鳍快速追逐的猎手。",
    "Moon jellies are cnidarians propelled by contractions of their bell. They are neither fishes nor tail-driven pursuit predators.",
  ],
  [
    "spiny_lobster",
    "刺龙虾是有坚硬外骨骼的甲壳动物，长触角是显著特征。它们依靠分节附肢活动，与柔软的章鱼不同。",
    "Spiny lobsters are crustaceans with hard exoskeletons, long antennae and jointed limbs, unlike soft-bodied octopuses.",
  ],
  [
    "neon_tetra",
    "霓虹脂鲤是亚马逊地区的小型淡水群游鱼，蓝色反光带和红色尾部是辨识特征。",
    "Neon tetras are small Amazonian freshwater schooling fishes identified by a reflective blue stripe and red rear-body markings.",
  ],
  [
    "amazon_discus",
    "七彩神仙鱼有近圆形、侧扁的躯干。它们是淡水鱼，与海洋中的神仙鱼属于不同类群。",
    "Discus have nearly circular, laterally compressed bodies. These freshwater fishes belong to a different group from marine angelfishes.",
  ],
  [
    "silver_hatchet",
    "银斧鱼的胸腹轮廓像斧刃，区别于普通纺锤形的小鱼。本作采用淡水斧鱼类的表层生活形态。",
    "Silver hatchetfishes have a hatchet-shaped chest and belly. This entry represents freshwater surface-dwelling hatchetfishes rather than typical spindle-shaped fishes.",
  ],
  [
    "armored_cory",
    "鼠鱼是带骨板的小型鲶鱼，口部附近的须帮助感知周围。本作将它作为河底小型生物的一员。",
    "Corydoras are small armored catfishes with sensory barbels around the mouth. They represent small bottom-dwelling life in this river.",
  ],
  [
    "amazon_pacu",
    "淡水鲳类具有高而侧扁的身体，与食人鱼有亲缘关系。相近外形不意味着相同食性或攻击行为。",
    "Pacus have deep, compressed bodies and are related to piranhas. Similar appearance does not imply identical diets or aggressive behavior.",
  ],
  [
    "silver_arowana",
    "银龙鱼有长身、大鳞片和上翘口，是南美淡水鱼。它不属于传说中的中国龙。",
    "Silver arowanas are South American freshwater fishes with long bodies, large scales and upturned mouths; they are not mythic dragons.",
  ],
  [
    "arapaima",
    "巨骨舌鱼生活在南美淡水中，能够呼吸空气。厚实鳞片提供保护，巨大身形并不代表它能在海水中生活。",
    "Arapaimas are air-breathing South American freshwater fishes with protective scales. Their large size does not make them marine animals.",
  ],
  [
    "redtail_catfish",
    "红尾鲶有宽头、长须和显眼的红色尾鳍。本作保留其底层感知与粗壮的鲶鱼身形。",
    "Redtail catfishes have broad heads, long barbels and distinctive red tail fins. The model retains their robust bottom-dwelling silhouette.",
  ],
  [
    "amazon_river_turtle",
    "亚马逊河龟是呼吸空气的淡水爬行动物，以四肢划水。它们与开阔海洋中用前肢推进的海龟不同。",
    "Amazon river turtles are air-breathing freshwater reptiles that paddle with their limbs, distinct from ocean-going sea turtles.",
  ],
  [
    "red_piranha",
    "红腹食人鱼有红色腹部和剪切式牙齿。真实食人鱼的行为远比影视中的持续疯狂攻击更复杂。",
    "Red-bellied piranhas have red undersides and cutting teeth. Their real behavior is more complex than constant frenzied attacks in films.",
  ],
  [
    "electric_eel",
    "电鳗是南美淡水的电鱼，并非真正的鳗鱼。电器官可用于感知与攻击，本作电场技能是夸张改编。",
    "Electric eels are South American freshwater electric fishes, not true eels. Electrical sensing and attack inspire the exaggerated game field.",
  ],
  [
    "river_stingray",
    "淡水魟的扁平胸鳍形成圆盘，尾部带刺。它们在河底活动，是软骨鱼，并非乌龟或蛇。",
    "Freshwater stingrays are cartilaginous fishes with flattened pectoral discs and spined tails, living around river bottoms.",
  ],
  [
    "black_caiman",
    "黑凯门鳄是南美鳄类，眼与鼻孔位于头部上方。水中主要依靠尾部摆动推进，快游时四肢靠拢身体。",
    "Black caimans are South American crocodilians with high-set eyes and nostrils. Tail undulation propels swimming; limbs fold during fast travel.",
  ],
  [
    "green_anaconda",
    "绿森蚺是善游泳的南美蟒蛇，眼与鼻孔靠近头顶。长身在水中传播横向波动，不能像鱼一样靠尾鳍划水。",
    "Green anacondas are aquatic South American boas with high-set eyes and nostrils; their long bodies propagate lateral waves in water.",
  ],
  [
    "saltwater_crocodile",
    "湾鳄生活于印度洋—太平洋地区，并非亚马逊原生动物。本作以幻想引入，游动仍参考真实鳄类的尾部推进。",
    "Saltwater crocodiles are Indo-Pacific animals, not Amazon natives. Their fictional introduction retains crocodilian tail-driven swimming.",
  ],
  [
    "orca",
    "虎鲸是海豚科的齿鲸，家族群体利用声音沟通、导航和觅食。不同种群有不同的食物偏好，30米成长属于本作幻想。",
    "Orcas are toothed dolphins whose family groups use sound for communication, navigation and feeding. Diet varies by population; 30 m growth is fictional.",
  ],
  [
    "squid",
    "大王乌贼是头足动物，拥有八条腕和两条长触须。快速喷射时外套方向前进、腕须拖在后方；本作喷墨冲刺是玩法改编。",
    "Giant squid are cephalopods with eight arms and two long tentacles. Mantle-first jetting trails the arms behind; the escape skill is adapted.",
  ],
  [
    "seagull",
    "海鸥是一类海岸鸟，利用翼拍和滑翔飞行。这里的海鸥档案代表通用海岸鸥类，不指定一个真实物种。",
    "Gulls fly with wingbeats and gliding. This entry represents coastal gulls generally rather than one specific real species.",
  ],
  [
    "pelican",
    "鹈鹕有长喙和可扩张的喉囊，可以兜住捕获的鱼并排出多余的水。喉囊是捕食工具，并不是储存食物的胃。",
    "Pelicans have long bills and expandable throat pouches that hold caught fish while excess water drains away. The pouch is a feeding tool, not a stomach.",
  ],
  [
    "tropicbird",
    "热带鸟拥有细长尾羽和适于远洋飞行的翼。本作使用其剪影，在海面上循连续航线飞行。",
    "Tropicbirds have elongated tail feathers and wings suited to oceanic flight. The game uses their silhouette on continuous flight paths.",
  ],
  [
    "swimmer",
    "本作游泳者全部为成年人。前伸、划水与回臂构成连续动作，人类必须浮出水面呼吸，不能像鱼长期潜游。",
    "All game swimmers are adults. Reach, pull and recovery form a continuous stroke; humans must surface to breathe.",
  ],
  [
    "diver",
    "潜水员是装备面镜、气瓶与脚蹼的成年人。脚蹼推进与稳定躯干区别于表面游泳者的划臂。",
    "Divers are adults equipped with masks, tanks and fins. Fin propulsion and a stable torso distinguish them from surface swimmers.",
  ],
];
for (const [kind, zh, en] of natural) add(kind, "自然百科", zh, en);
const fossils = [
  [
    "archelon",
    "帝海龟是已灭绝的大型海龟，鳍状肢说明它适于水中生活。软组织、体色与动作需依据近亲推测。",
    "Archelon was an extinct giant sea turtle with paddle-like limbs. Soft tissues, coloration and motion require inference from relatives.",
  ],
  [
    "dunkleosteus",
    "邓氏鱼是泥盆纪盾皮鱼，头胸部有骨甲。其切割结构是骨板而非普通牙齿，躯干复原存在不确定性。",
    "Dunkleosteus was an armored Devonian placoderm. Its cutting surfaces were bony plates rather than ordinary teeth; trunk reconstruction remains uncertain.",
  ],
  [
    "pliosaur",
    "上龙类是短颈、大头的灭绝海生爬行动物，与长颈蛇颈龙构成不同剪影。本作体色属于复原想象。",
    "Pliosaurs were extinct marine reptiles with short necks and large heads, distinct from long-necked plesiosaurs. Game coloration is speculative.",
  ],
  [
    "plesiosaur",
    "蛇颈龙类以四个鳍状肢在水中活动，长颈型的头部较小。它们不是恐龙，具体动作仍有研究争议。",
    "Plesiosaurs swam with four flippers; long-necked forms had small heads. They were not dinosaurs, and exact locomotion remains debated.",
  ],
  [
    "mosasaur",
    "沧龙是白垩纪的海生有鳞类爬行动物，具有鳍状肢和长尾。海中捕食形象依据化石，颜色为艺术复原。",
    "Mosasaurs were Cretaceous marine squamate reptiles with flippers and long tails. Fossils inform their predatory form; coloration is artistic.",
  ],
  [
    "basilosaurus",
    "龙王鲸尽管名字含有蜥蜴含义，实际上是始新世鲸类。其长身与退化后肢反映鲸类演化的历史。",
    "Despite its reptilian-sounding name, Basilosaurus was an Eocene whale. Its elongated body and reduced hind limbs reflect whale evolution.",
  ],
  [
    "megalodon",
    "巨齿鲨是已灭绝的巨型鲨鱼，巨大的化石牙齿是重要证据。完整体态、体长与生活方式仍在持续研究。",
    "Megalodon was an extinct giant shark known especially from large fossil teeth. Complete body form, size and lifestyle remain under study.",
  ],
  [
    "ichthyotitan",
    "巨鱼龙的研究依赖不完整的化石材料。本作以巨型鱼龙轮廓想象复原，不能当作其完整解剖的科学定论。",
    "Ichthyotitan is known from incomplete fossils. This giant ichthyosaur silhouette is a speculative reconstruction, not a complete anatomical consensus.",
  ],
  [
    "helicoprion",
    "旋齿鲨的螺旋齿列曾让研究者困惑。它是灭绝软骨鱼，齿列放置与头部复原依赖化石研究。",
    "Helicoprion was an extinct cartilaginous fish with a puzzling spiral tooth whorl. Fossils inform its placement and head reconstruction.",
  ],
  [
    "ichthyosaur",
    "鱼龙是海生爬行动物，流线形身体类似鱼或海豚，但与它们没有近亲关系。本作是类群化复原。",
    "Ichthyosaurs were marine reptiles whose streamlined bodies resembled fishes or dolphins without close kinship. This is a group-level reconstruction.",
  ],
  [
    "cameroceras",
    "房角石类是具有长直壳的灭绝头足动物。腕足和体色缺乏完整证据，本作长壳形象包含推测。",
    "Cameroceras-like animals were extinct cephalopods with long straight shells. Arms and coloration are poorly preserved and partly speculative here.",
  ],
  [
    "livyatan",
    "利维坦鲸是已灭绝的捕食性抹香鲸近亲，有大型牙齿。它与同名神话海怪是两个不同档案。",
    "Livyatan was an extinct predatory relative of sperm whales with large teeth, distinct from the mythic sea monster sharing its name.",
  ],
  [
    "shonisaurus",
    "秀尼鱼龙是三叠纪的大型鱼龙，具有四个鳍状肢。深沟中的活动范围和体色是本作幻想。",
    "Shonisaurus was a large Triassic ichthyosaur with four flippers. Its trench habitat and coloration here are fictional.",
  ],
  [
    "titanoboa",
    "泰坦巨蟒的化石发现于南美古新世环境，体现恐龙灭绝后热带雨林中的巨型蛇类。复原体色无法从化石直接确定。",
    "Titanoboa fossils come from Paleocene South America, revealing giant snakes in post-dinosaur tropical forests. Fossils do not directly establish coloration.",
  ],
  [
    "purussaurus",
    "普鲁斯鳄是南美中新世的大型凯门鳄近亲。颅骨支持其巨型体态，但本作动作和体色属于复原。",
    "Purussaurus was a giant Miocene South American caiman relative. Skulls inform its size; game motion and coloration are reconstructed.",
  ],
  [
    "stupendemys",
    "骇龟是南美已灭绝的巨型淡水龟，巨大龟甲是重要证据。本作恢复活体形态并想象其体色。",
    "Stupendemys was an extinct giant South American freshwater turtle known from enormous shells. Living appearance and coloration are reconstructed here.",
  ],
];
for (const [kind, zh, en] of fossils) add(kind, "化石复原", zh, en);
const original = [
  [
    "flood_arapaima",
    "洪潭巨骨舌鱼栖息于隔绝的深潭。沉根与洪水带来的食物塑造了它的粗壮身躯，并非已发现的新物种。",
    "Flood Arapaima is a deep-pool giant. Root tangles and flood-borne food shape its heavy body.",
  ],
  [
    "rootback_colossus",
    "根背巨鳄是河谷中复苏的巨兽，背甲似被沉木压出的山脊。它把根穴当作隐蔽猎场。",
    "Rootback Colossus is a revived river giant with log-like dorsal armor, using root vaults as hidden hunting grounds.",
  ],
  [
    "zombie_shark",
    "亡灵鲨鱼从沉船阴影中归来，破损皮肤之下仍有运动的骨骼与肌肉。它以献祭换取仆从，力量并非无代价。",
    "Zombie Shark is an undead hunter with moving bones and muscles beneath torn skin. Its summoned servant requires a costly sacrifice.",
  ],
  [
    "mechanical_shark",
    "机械鲨鱼是为危险海域打造的装甲潜行体。推进器与鱼雷舱服务于它的猎杀使命，但发射会消耗自身资源。",
    "Mechanical Shark is an armored explorer for dangerous waters. Thrusters and torpedoes serve its mission, but firing consumes its own resources.",
  ],
  [
    "glass_seed",
    "冰下盐水中，玻种游体将柔软器官包在六枚晶壳之间。晶壳的细小开合帮助它感受盐流中的变化。",
    "Glass Seed shelters soft organs between six crystalline valves in icy brine. Subtle movements of the valves let it sense changes in the brine.",
  ],
  [
    "ribbon_spore",
    "绶带孢游用薄膜沿盐流漂游，前端囊体储存养分，长丝感受细微水流。转向时囊体先动，绶带般的薄膜随水流弯折。",
    "Ribbon Spore rides brine currents with membranes, stores nutrients in its anterior capsule and senses currents with filaments; the capsule leads each turn as its ribbon-like membranes bend with the current.",
  ],
  [
    "tripod_bloom",
    "三瓣浮蕾以三重对称的肉瓣包围核心，花一样的轮廓不代表它是植物。它在冰海中缓慢展开滤食面。",
    "Tripod Bloom encloses a core with three symmetric fleshy lobes. Its flower-like form does not make this filterer a plant.",
  ],
  [
    "sail_crawler",
    "帆脊巡游者背上的厚帆协助转向，六肢带有游泳桨。它是硬甲游体，与在底部行走的铰甲步行者不同。",
    "Sail Crawler steers with a thick dorsal sail and six paddling limbs. This armored swimmer differs from the bottom-walking Hinge Walker.",
  ],
  [
    "lantern_pod",
    "灯荚游体用五道肋骨保护发光囊，裙状附肢调整水流。微弱的器官光在冰影里轻轻明灭。",
    "Lantern Pod protects a luminous sac within five ribs and steers with skirt-like appendages. Its faint organ light flickers beneath the ice.",
  ],
  [
    "veil_glider",
    "帷翼滑翔者将外套延伸成宽翼，沿冰拱下的流线滑行。前段感官窝与尾丝形成独特的扁翼剪影。",
    "Veil Glider extends its mantle into broad wings beneath ice arches. Sensory sockets and trailing filaments distinguish this flattened form.",
  ],
  [
    "forkjaw_stalker",
    "裂颚潜猎者的两枚弯钳由厚实的头胸肌肉控制。它在盐脉拐角守候，受惊时先展开颚再冲出。",
    "Forkjaw Stalker controls curved pincers with a muscular cephalothorax. This fictional hunter waits at brine bends and spreads its jaws before charging.",
  ],
  [
    "crown_filterer",
    "冠环滤食者的长腕围成漏斗，收集冰下水流中的悬浮物。放射状口器与腕冠围绕核心躯干排列，构成它独特的冰下剪影。",
    "Crown Filterer gathers imagined suspended food with long funnel-forming arms. Its radial mouth and arm crown surround a central body, creating a distinctive ice-ocean silhouette.",
  ],
  [
    "prism_hunter",
    "棱冠猎手的三面甲壳收束成尖头，三组感官槽感受猎物。它以硬甲刃翼短促冲锋，轮廓不像软体游体。",
    "Prism Hunter tapers a three-sided carapace toward its head, sensing prey through three grooves. Its armored blade-wings power fictional short charges.",
  ],
  [
    "bell_carrier",
    "浮钟巨载的钟罩下拖着附属囊体，像一座缓慢移动的冰海温室。钟罩的脉动将整群囊体缓缓推向前方。",
    "Bell Carrier trails satellite sacs beneath a bell like a moving ice-ocean greenhouse. The pulsing bell carries the whole sac colony forward.",
  ],
  [
    "siphon_colossus",
    "虹吸巨腹的外置管口调节进出水流，环褶包围粗大的腹体。水流经过管口时，层褶会轻微舒展。",
    "Siphon Colossus regulates fictional currents with external tubes and a ring-folded abdomen, a giant tubular filterer.",
  ],
  [
    "spiral_grazer",
    "螺冠巨游背负盘卷的厚壳，用下方软足与侧膜滑游。感觉须先探水流，软足再带着沉重的螺壳缓缓转向。",
    "Spiral Grazer carries a thick coiled shell and swims with a soft foot and lateral membranes. Its feelers test the current before the foot turns the heavy coil.",
  ],
  [
    "rift_reaver",
    "裂谷掠夺者长尾上覆盖回钩骨甲，在热泉岩裂之间潜行。口前钩颚与后段侧波共同构成蛇形猎手的压迫感。",
    "Rift Reaver prowls imagined vent fractures with recurved armor, hooked jaws and a laterally waving tail, a fictional serpent-like hunter.",
  ],
  [
    "void_siphon",
    "虚渊吞吸者的四瓣颚围住深陷口腔，粗腹外有环状护甲。环褶与颚瓣在转向时形成沉重的深窟轮廓。",
    "Void Siphon's four jaws surround a recessed maw beneath annular armor. Turning brings its folds and jaw plates into a heavy, hollow-dwelling silhouette.",
  ],
  [
    "brine_rosette",
    "盐泉旋花的六瓣甲盖像伏地莲座，中央软组织感受盐流。瓣片会随水流开合，姿态虽似花朵，却仍能沿海床缓慢移动。",
    "Brine Rosette senses imagined currents beneath six low carapace valves. Its valves open with the current; the flower-like body can still move slowly across the bottom.",
  ],
  [
    "hinge_walker",
    "铰甲步行者以六条带关节的粗肢沿盐床移动，头甲保护感觉器。它没有帆脊巡游者的高帆，适于底部探索。",
    "Hinge Walker traverses imagined salt beds on six jointed limbs with protected head sensors. It lacks Sail Crawler's tall swimming sail.",
  ],
  [
    "abyss_weaver",
    "星渊织母在冰海最深窟结出看不见的潮流网，长腕为后代围护温暖水层。潮流穿过分叉腕尖，将食物送入它守护的暗窟。",
    "Abyss Weaver surrounds warm nursery currents with long arms and invisible tidal webs. Currents pass between its forked arm tips, carrying food into the hollow it guards.",
  ],
  [
    "lumen_stalker",
    "辉渊巡狩者巡守坠落科考船与热泉之间，长腕能围拢大型船体，发光腔在黑暗中勾勒其庞大的轮廓。它的巡游让残骸四周的暗水始终不得安宁。",
    "Lumen Stalker patrols between a fallen research vessel and the vents. Long arms can enclose a large hull, while luminous chambers outline its immense body. Its patrol keeps the water around the wreck restless.",
  ],
  [
    "mayan",
    "格兰玛雅是灰银色的长躯领主，六枚蓝眼在厚重头冠中巡视。它的名称与形象并不是玛雅文明真实神话的考证。",
    "Gran Maja is a silver-bodied lord with six blue eyes beneath a heavy crown. It is not an authenticated Maya myth.",
  ],
  [
    "rootjaw",
    "根颚君王将沉木化作伏击的掩体，厚甲如河床化石，裂颚掀起浑浊水浪。它潜伏在河道最深的根影之中。",
    "Rootjaw turns fallen timber into ambush cover; fossil-like armor and split jaws disturb the river. It waits in the deepest river-root shadows.",
  ],
  [
    "jade_minnow",
    "玉鳞游灵穿行于莲池浅水，细长尖吻与轻巧叉尾划过莲茎，鳞片像被晨露洗过的青玉。",
    "Jade Minnow slips between lotus stems with a slender pointed snout, a light forked tail and dew-like jade scales.",
  ],
  [
    "lotus_sprite",
    "莲心贝灵栖息于莲叶阴影，借水纹与花香寻路。灯状触须贴着莲根展开，像一串水下的微光。",
    "Lotus Sprite follows ripples beneath lotus leaves. Its lantern-like feelers spread against the roots like a chain of underwater glimmers.",
  ],
  [
    "cloud_crane",
    "云鹤的形象借鉴现实仙鹤与东方仙境意象，沿云海排队飞行。本作的巨大体型和御云能力属于幻想。",
    "Cloud Crane combines crane anatomy with eastern immortal imagery and formation flight. Its giant size and cloud-riding ability are fictional.",
  ],
  [
    "dragon_carp",
    "龙鲤借鉴鲤鱼跃龙门的传说，以长须和金鳞连接鱼与龙的意象。故事流传于民间，并非直接出自《山海经》。",
    "Dragon Carp links fish and dragon through golden scales and barbels, inspired by the Dragon Gate folktale rather than directly by the Classic.",
  ],
  [
    "spirit_carp",
    "瑞鲤守候莲池水脉，尾鳍在水面留下一线月光。它与龙鲤的传说渊源不同。",
    "Auspicious Carp guards the lotus-pool currents, tracing moonlight with its tail; its lore differs from Dragon Carp's folktale.",
  ],
  [
    "sword_sage",
    "御剑真君修行于四象守护的道观，踏一柄巨剑巡行云海，以剑阵检验闯入者。承霄剑宗弟子以他为师，四方山脉也由他的守护者巡望。",
    "The Sword Sage rides a great sword around a monastery guarded by the Four Symbols and tests intruders with sword arrays. Skybearer Sword Sect pupils follow his teachings while his guardians watch the four surrounding peaks.",
  ],
];
for (const [kind, zh, en] of original) add(kind, "背景故事", zh, en);
const legends = [
  [
    "kraken",
    "克拉肯是北欧传说中潜伏深海的巨型头足海怪。它的长腕能从船底探出，吸盘逐个贴住船板；海面看似平静时，漩涡下往往已经张开了巨大的腕冠。",
    "Kraken is the colossal tentacled sea monster of northern European legend. Its long arms reach beneath ships, attaching suckers to their planks; a calm surface can conceal an immense crown of arms beneath a whirlpool.",
  ],
  [
    "hydra",
    "海德拉承载希腊多首水蛇的传说。三颗蛇首各自警戒，长颈在水中交错盘绕；即使一颗头盯住来客，另外两颗仍会巡视领地两侧的暗流。",
    "Hydra carries the legend of the Greek many-headed water serpent. Its three heads watch independently as long necks coil through the water; while one studies an intruder, the others survey the currents on either side.",
  ],
  [
    "leviathan",
    "利维坦是古老文献中令人敬畏的深海巨兽。重叠鳞甲包裹修长身躯，脊冠划开暗流；它经过时，海床上的细沙会像受到无形潮汐牵引般缓缓升起。",
    "Leviathan is the fearsome deep-sea giant of ancient writings. Overlapping scales enclose its long body while a ridged crest parts dark currents; sand rises slowly from the seabed wherever it passes.",
  ],
  [
    "yacumama",
    "河母巨蛇源于亚马逊的Yacumama水蛇传说。它的长躯与沉根连成隐蔽轮廓；水下传来的缓慢波动，往往是它现身的前兆。",
    "Yacumama belongs to Amazonian giant water-serpent folklore. Its long silhouette merges with submerged roots, and a slow disturbance in the water often precedes its arrival.",
  ],
  [
    "wenyao",
    "文鳐鱼承载《山海经》中有翼鱼的意象。细长的身躯展开宽翼，在云水之间借风滑行，翼缘的明纹随着转弯逐次显露。",
    "Wenyao carries the winged-fish image of the Classic of Mountains and Seas. Its slender body spreads broad wings to glide between cloud and water, revealing bright markings along the wing edges through each turn.",
  ],
  [
    "luoyu",
    "蠃鱼来自《山海经》的鱼身鸟翼意象。宽厚的鱼身与成对翼面托住长尾，滑翔时双翼向后掠开，落回水中后又顺着身侧收拢。",
    "Luoyu belongs to the Classic of Mountains and Seas and its fish-body, bird-wing imagery. A broad body and paired wings support a long tail; its wings sweep back in flight and fold along its sides on returning to water.",
  ],
  [
    "chiru",
    "赤鱬是《山海经》中带有人面意象的鱼。扁深的赤色身躯缓缓穿过莲根，圆尾轻摆，脸部的轮廓偶尔在浅水反光中显露。",
    "Chiru is the human-faced fish of the Classic of Mountains and Seas. Its deep red body passes through lotus roots with a softly moving round tail, the contours of its face occasionally appearing in reflected light.",
  ],
  [
    "xuangui",
    "旋龟是《山海经》中的异龟，鸟首与蛇尾使它不同于普通乌龟。它沿浅池石缝寻食，缩入甲壳时长尾仍会缓慢摆动，与镇守北方的玄武各有自己的形貌。",
    "Xuangui is an unusual turtle from the Classic of Mountains and Seas, with a bird-like head and serpent tail. It searches the cracks of shallow pools; even when it retreats into its shell, its long tail keeps moving, distinct from the northern guardian Black Tortoise.",
  ],
  [
    "lushu",
    "鹿蜀是《山海经》中白首、虎纹而似马的走兽。它低头穿过桃林，粗壮四肢踏稳山地，长尾在转身时扫过枝叶。",
    "Lushu is the horse-like beast with a white head and tiger markings in the Classic of Mountains and Seas. It moves head-low through peach woods, planting strong limbs on mountain ground as its long tail brushes foliage through turns.",
  ],
  [
    "bifang",
    "毕方是古籍中以单足形象闻名的神鸟。长喙与火色羽毛勾出锐利轮廓，飞过山林时翼下映出暖色，停落枝头后便收起双翼警戒四周。",
    "Bifang is the legendary bird known for its single leg. A long bill and fiery plumage define its sharp silhouette; warm colors show beneath its wings over the woodland, before it folds them and surveys its surroundings from a branch.",
  ],
  [
    "nine_tail_fox",
    "九尾狐与青丘等古代传说相连，九条长尾形成鲜明轮廓。它在山间低伏潜行，转身时尾巴依次展开，掩去足迹后又没入桃林。",
    "Nine-tailed Fox belongs to ancient Qingqiu-associated lore. Its nine long tails form a distinctive silhouette as it stalks low through the mountains, spreading them in sequence through turns before disappearing into peach woods.",
  ],
  [
    "hujiao",
    "虎蛟是《山海经》中鱼身蛇尾的水中异兽。粗壮前身与绵长尾部在暗水中交替显露，鳍肢沿水流收放，转弯时尾端绕出悠长的弧线。",
    "Hujiao is the fish-bodied, serpent-tailed water beast of the Classic of Mountains and Seas. Its powerful forebody and long tail emerge in turn through dark water, with fins following the current and the tail tracing a broad curve through bends.",
  ],
  [
    "gudiao",
    "蛊雕是《山海经》中有角的凶兽。鹰状前身与锐爪形成压迫轮廓，它常在高处盘旋，贴近山崖时将双翼收窄，角尖先从薄雾中显露。",
    "Gudiao is the horned fierce beast of the Classic of Mountains and Seas. A raptor-like forebody and sharp claws form an imposing silhouette; it circles high and narrows its wings near cliffs, its horn emerging first through mist.",
  ],
  [
    "zheng",
    "狰是《山海经》中豹形、多尾而带角的异兽。粗壮肩背伏在岩影中，回身时多尾依次分开；它的头角与紧贴地面的步态，让远处的旅人也能认出它。",
    "Zheng is the horned, multi-tailed leopard-like beast of the Classic of Mountains and Seas. Its powerful shoulders crouch in rocky shadows, its tails separating through a turn; its horn and low stance make it recognizable even at a distance.",
  ],
  [
    "bashe",
    "巴蛇承载古籍中能吞食巨兽的长蛇意象。绵长身躯沿水岸盘绕，侧向波动从颈后一路传向尾尖；它藏身时，远处露出的蛇身常被误认成一段沉根。",
    "Bashe carries the ancient image of a serpent able to swallow giant beasts. Its long body coils along the water, lateral waves traveling from neck to tail; exposed sections can be mistaken for submerged roots.",
  ],
  [
    "kui",
    "夔是古代传说中的单足巨兽。厚重躯干与独特承重姿态区别于四足牛，落地时扬起薄雾，低沉鸣声像雷鸣般越过仙岛山谷。",
    "Kui is the one-legged giant of ancient legend. Its massive body and distinctive support posture set it apart from a four-legged ox; mist lifts at its landing while a low, thunder-like call carries across the island valleys.",
  ],
  [
    "kun",
    "鲲是《庄子·逍遥游》中来自北冥的巨鱼，化而为鸟则名为鹏。宽阔头部、云纹背脊与横向月牙尾承托庞大身躯，游过云海时像一座缓缓移动的山。",
    "Kun is the immense northern fish of Zhuangzi's Free and Easy Wandering, becoming Peng when it changes into a bird. A broad head, cloud-marked back and horizontal crescent tail support its vast body as it travels through the cloud sea like a moving mountain.",
  ],
  [
    "peng",
    "鹏是《庄子·逍遥游》中由鲲变化而成的巨鸟。钩喙、厚重胸羽与层叠长翼形成鲜明轮廓，展翼时遮过云光，收翼时在仙山之间划出悠长弧线。",
    "Peng is the immense bird that Kun becomes in Zhuangzi's Free and Easy Wandering. Its hooked bill, heavy chest feathers and layered wings form a distinctive silhouette, shading cloudlight when spread and tracing long arcs between the peaks when folded.",
  ],
  [
    "gate_dragon",
    "龙门云龙承接鲤鱼跃龙门的民间传说。它保留鲤鱼扇尾，力量与青龙神兽有明确区别。",
    "Dragon-Gate Cloud Dragon recalls the carp's Dragon Gate folktale. Its carp-like tail and lesser power distinguish it from the Azure Dragon guardian.",
  ],
  [
    "azure_dragon",
    "青龙是四象中镇守东方的神兽。蜿蜒长躯、角须与鬃冠显出王者威仪，它沿东侧仙山巡行，盘绕的身影时隐时现于松云之间。",
    "Azure Dragon is the eastern guardian among the Four Symbols. Its winding body, antlers, whiskers and mane express regal authority as it patrols the eastern peaks, coiling in and out of clouds above the pines.",
  ],
  [
    "white_tiger",
    "白虎是四象中镇守西方的神兽。粗壮肩胸、黑白虎纹与低伏姿态充满力量，奔行时后肢接连蹬地，扑击前的短暂静止更显凌厉。",
    "White Tiger is the western guardian among the Four Symbols. Powerful shoulders, black-and-white stripes and a low stance convey its strength; hind legs drive its run, and the brief stillness before a pounce sharpens its menace.",
  ],
  [
    "vermilion_bird",
    "朱雀是四象中镇守南方的神鸟。高冠、层叠鬃羽与长尾在天空中展开烈火般的轮廓，振翼时暖光掠过山头，收拢双翼后又像一束疾驰的流火。",
    "Vermilion Bird is the southern guardian among the Four Symbols. A high crest, layered neck feathers and long tail form a fiery silhouette; warm light crosses the peaks with each wingbeat before folded wings turn it into a racing flame.",
  ],
  [
    "black_tortoise",
    "玄武是北方的龟蛇合体神兽。厚重甲壳与缠绕长蛇构成坚固轮廓，它缓缓巡过北池石岸，蛇首巡视四周，甲纹在水光下若隐若现。",
    "Black Tortoise is the northern turtle-and-serpent guardian. A heavy shell and coiling snake form its fortified silhouette as it moves along the northern pool; the serpent surveys the surroundings while patterns on the armor appear through reflected light.",
  ],
];
for (const [kind, zh, en] of legends) add(kind, "神话传说", zh, en);
const rares = [
  [
    "golden_manta",
    "金翎蝠鲼的宽翼和头鳍穿过外礁碎光，金色鳍脉随着转弯逐渐明亮。它绕开繁闹浅滩，只在隐蔽石脊与清澈水层之间留下短暂的金影。",
    "Gilded Manta passes through the broken light of outer reefs with broad wings and cephalic fins, its golden fin veins brightening through each turn. It avoids the busy shallows, leaving fleeting gold shapes between secluded ridges and clear water.",
  ],
  [
    "pearl_nautilus",
    "珠纹鹦鹉螺的螺旋壳、壳口头部与纤细腕束，像古城中游动的活印记。它穿过隐蔽石台，壳面珠纹在转身的一瞬与远处贝光相映。",
    "Pearl Nautilus resembles a living emblem of the ancient city, with a spiral shell, aperture-bound head and fine arms. It crosses secluded ledges, its pearl markings briefly meeting the light of distant shells through each turn.",
  ],
  [
    "crimson_sail",
    "绯帆长吻鱼以高背帆与细长吻部穿过风暴残骸。帆上的纹路像旧船的红色航旗，在阴暗海水里短暂闪过。",
    "Crimson Sailfin crosses storm wreckage with a tall sail and slender bill. Its markings resemble an old red ensign briefly crossing the dark water.",
  ],
  [
    "glass_prawn",
    "蓝灯玻璃虾的分节腹、长触角和尾扇藏在深沟岩影里。它先探出触角，继而用腹部轻轻一弹，从石缝间带出一道淡蓝与金色交织的微光。",
    "Blue-lantern Prawn hides its segmented abdomen, long antennae and tail fan in trench shadows. Its antennae emerge first, followed by a flick of its abdomen that carries a faint blue-and-gold glimmer out of the stone crack.",
  ],
  [
    "jade_arowana",
    "翡翠银龙鱼有细长身躯与上翘口，玉色鳞光沿雨林根影闪过。它绕过沉枝时尾鳍轻摆，转眼便将明亮轮廓藏入较暗的水流。",
    "Jade Arowana has a long body and upturned mouth, flashing jade scales through rainforest root shadows. Its tail moves softly around submerged branches before the bright silhouette slips into a darker current.",
  ],
  [
    "crystal_seraph",
    "六翼晶冠体以六重翼膜围护纺锤形感官囊，像盐脉中移动的晶花。它依次展开翼膜穿过冰下岩拱，晶冠的淡光随身躯旋转而缓缓流动。",
    "Six-wing Crystal Seraph encloses a spindle-like sensory sac within six membranes, resembling a crystal flower moving through brine veins. Its membranes unfold in sequence beneath icy arches as faint light moves across its turning crown.",
  ],
  [
    "gilded_cloud_carp",
    "流金云鲤将长须与云翼融为一体，只在桃林上方短暂显露金鳞。它随风折返，尾后的微光转瞬便消失在云里。",
    "Gilded Cloud Carp combines carp barbels and cloud wings, briefly showing gold scales above peach groves. It turns with the wind, its tail glow vanishing into the clouds.",
  ],
];
for (const [kind, zh, en] of rares) add(kind, "背景故事", zh, en);
for (const species of ODYSSEY_SPECIES)
  add(
    species.kind,
    "神话传说",
    species.description,
    ODYSSEY_EN[species.description],
  );
for (const [kind, description] of Object.entries(ODYSSEY_LORD_DESCRIPTIONS))
  add(kind, "神话传说", description.text, ODYSSEY_EN[description.text]);
add(
  "golden_argonaut",
  "背景故事",
  "金帆船蛸以薄如纸的螺壳托着身躯，扩大的背腕像一张金帆。它沿古航路独行，转身时先收起帆缘，再把两束灵动的触腕送进水流。",
  "Golden Argonaut carries a paper-thin coiled shell below enlarged dorsal arms like a golden sail. It follows old sea roads alone, furling its sail edges before sending two lively arm bundles into the current.",
);
for (const [kind, zh, en] of CREATURE_LORE) {
  const previous = records.get(kind);
  add(
    kind,
    previous.backgroundType,
    `${previous.background}\n\n${zh}`,
    `${BACKGROUND_EN[previous.background]}\n\n${en}`,
  );
}
export function getCreatureBackground(kind) {
  return records.get(kind);
}
export const BACKGROUND_KINDS = Object.freeze([...records.keys()]);
