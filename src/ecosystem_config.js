/**
 * 海洋生态配置；length 是模型与碰撞的游戏米数，depth 是世界坐标深度。
 * 现代物种取真实较大个体；水层按 UI 的 ×4 深度比例映射。古代复苏、
 * 捕食强度、营养与技能属于游戏设计，不作为现实行为或古生物生态结论。
 */
const POPULATIONS = {
  fish: 60,
  anchovy: 18,
  sardine: 32,
  herring: 16,
  mackerel: 12,
  flying_fish: 10,
  turtle: 5,
  sunfish: 10,
  boxfish: 8,
  parrotfish: 12,
  wrasse: 4,
  tuna: 30,
  ray: 12,
  angler: 7,
  hammerhead: 5,
  shark: 6,
  octopus: 7,
  sperm_whale: 3,
  dunkleosteus: 5,
  plesiosaur: 5,
  pliosaur: 5,
  mosasaur: 5,
  basilosaurus: 4,
  megalodon: 4,
};
const CATEGORY_ORDER = { shoal: 0, hunter: 1, ancient: 2 };
const shoal = (
  kind,
  label,
  length,
  speed,
  depthMin,
  depthMax,
  schoolSize,
  facts,
) => ({
  kind,
  label,
  length,
  speed,
  depthMin,
  depthMax,
  schoolSize,
  tier: 0,
  category: "shoal",
  predator: false,
  nutrition: length < 1 ? 8 : 18 + length * 2,
  growth: length < 1 ? 0.018 : 0.025 + length * 0.025,
  ...facts,
});
const hunter = (kind, label, length, speed, depthMin, depthMax, facts) => ({
  kind,
  label,
  length,
  speed,
  depthMin,
  depthMax,
  schoolSize: 1,
  tier: 2,
  category: "hunter",
  predator: true,
  nutrition: 30 + length * 2,
  growth: 0.2 + (length / 6) ** 2 * 0.25,
  ...facts,
});
const ancient = (kind, label, length, speed, depthMin, depthMax, facts) => ({
  ...hunter(kind, label, length, speed, depthMin, depthMax, facts),
  category: "ancient",
  tier: 2,
  extinct: true,
  habitatNote: "已灭绝；本作复苏水层为幻想设定，不代表真实古海洋深度。",
});

/** 全量普通生物配置；深渊领主另走 BOSS_SPECIES，多阶段战斗不在此表。 */
export const ECOSYSTEM_SPECIES = Object.freeze(
  [
    shoal("fish", "珊瑚鱼", 0.8, 4, 5, 34, 12, {
      latin: "REEF FISH ASSEMBLAGE",
      color: "#ffcf85",
      realSize: "多物种艺术组合 · 游戏0.8 m",
      ability: "礁间群游",
      description: "色彩鲜明的浅海小鱼，在珊瑚与礁石附近成群活动。",
      habitatNote: "艺术组合，并非单一真实物种。",
      counter: "沿着礁石边缘追逐鱼群，连续进食补充营养。",
    }),
    shoal("anchovy", "鳀鱼", 0.18, 4.8, 5, 25, 18, {
      latin: "ENGRAULIS MORDAX",
      color: "#cadde2",
      realSize: "约0.15—0.20 m",
      ability: "银带密群",
      description:
        "身体纤细、吻部尖长，体侧银带在转向时闪光。依靠密集鱼群分散捕食压力。",
      habitatNote: "参考北鳀；近岸表层群游，非夏威夷原生分布复刻。",
      counter: "一次穿过密集鱼群比追逐单尾更划算。",
    }),
    shoal("sardine", "沙丁鱼", 0.3, 5.1, 5, 30, 16, {
      latin: "SARDINOPS SAGAX",
      color: "#afdfcf",
      realSize: "较大个体约0.30 m",
      ability: "密集鱼群",
      description:
        "蓝绿色背部、银白腹部和体侧黑点构成辨识特征。大量个体在近表层同步游动。",
      habitatNote: "参考太平洋沙丁鱼；近岸及外海上层密集群游。",
      counter: "从鱼群侧面切入，短距离冲刺穿过鱼群。",
    }),
    shoal("herring", "鲱鱼", 0.26, 5.3, 7, 40, 16, {
      latin: "CLUPEA PALLASII",
      color: "#bdc9fa",
      realSize: "约0.24—0.34 m，因海区而异",
      ability: "银鳞转向",
      description:
        "较深的侧扁身体和银亮腹部与细长鳀鱼不同。鱼群转弯时，侧面会形成整片反光。",
      habitatNote: "参考太平洋鲱；温带近岸鱼群，本作海域集合为幻想改编。",
      counter: "在它们转向时截住鱼群前缘。",
    }),
    shoal("mackerel", "鲭鱼", 0.55, 7.8, 8, 45, 10, {
      latin: "SCOMBER JAPONICUS",
      color: "#70bdbb",
      realSize: "可达约0.64 m",
      ability: "高速群游",
      description:
        "纺锤形身体、背部波纹和尾柄小离鳍容易辨认。比沙丁鱼更快，群游逃离捕食者。",
      habitatNote: "太平洋鲭参考；近岸表层到较深陆架均可出现。",
      counter: "先预判方向，再以短冲刺截获。",
    }),
    shoal("flying_fish", "飞鱼", 0.4, 7, 2, 10, 8, {
      latin: "CHEILOPOGON SPP.",
      color: "#99dffa",
      realSize: "不同种约0.10—0.45 m",
      ability: "破水滑翔",
      description:
        "遇到近处威胁会加速冲出水面，张开宽大的胸鳍滑翔一段距离；飞鱼是在滑翔，不是鸟一样振翅飞行。",
      habitatNote: "暖水海洋表层；不同飞鱼种类的大小和滑翔距离有差异。",
      counter: "等待落水点，也可以提前蓄势跃出海面追逐。",
      surfaceGlider: true,
    }),
    shoal("turtle", "绿海龟", 1.2, 3.2, 3, 32, 2, {
      latin: "CHELONIA MYDAS",
      color: "#bbc889",
      realSize: "成体约0.9—1.2 m（背甲尺度）",
      ability: "鳍肢巡游",
      description:
        "椭圆龟甲由多块盾片组成，宽大前鳍缓慢划水。真实海龟需回到水面呼吸，常在浅海觅食。",
      habitatNote: "浅海海草床、珊瑚礁附近；游戏统一碰撞尺度并非严格背甲量法。",
      counter: "游速较慢，在浅海容易观察和接近。",
    }),
    shoal("boxfish", "长角箱鲀", 0.45, 2, 5, 22, 2, {
      latin: "LACTORIA CORNUTA",
      color: "#e6cb70",
      realSize: "可达约0.51 m；本作0.45 m",
      ability: "箱形缓游",
      description:
        "头部长角和方盒般的身体十分醒目。游戏中缓慢游动，适合作为刚出发时容易辨认、接近的浅海猎物。",
      habitatNote:
        "印度洋—太平洋鱼类；现实中的毒素防御尚未启用，浅滩常驻、结伴与慢速是游戏设计。",
      counter: "从侧面缓缓接近即可捕食，不必一直消耗体力冲刺。",
      nurseryResident: true,
      nutrition: 10,
      growth: 0.024,
    }),
    shoal("parrotfish", "隆头鹦嘴鱼", 1.3, 2.4, 7, 28, 4, {
      latin: "BOLBOMETOPON MURICATUM",
      color: "#bad09a",
      realSize: "大型个体约1.3 m",
      ability: "礁间觅食",
      description:
        "隆起的额头与鹦鹉喙般的大嘴构成剪影。真实个体会成群在浅海礁区觅食；游戏设为慢游猎物，便于幼年角色稳定补给。",
      habitatNote: "浅海珊瑚礁附近；本作慢速与营养收益经过游戏平衡。",
      counter: "沿着礁区找到小群，转向接近比长距离追逐更省体力。",
      nurseryResident: true,
      nutrition: 20,
      growth: 0.045,
    }),
    shoal("wrasse", "苏眉", 1.7, 2.6, 10, 32, 2, {
      latin: "CHEILINUS UNDULATUS",
      color: "#76bfb0",
      realSize: "大型个体可达约1.7 m",
      ability: "胸鳍巡游",
      description:
        "厚嘴唇、隆起额部与青绿色身体容易辨认，依靠胸鳍推进。可在潟湖和礁坡独自、结伴或小群活动；游戏中是体型稍大的入门猎物。",
      habitatNote: "潟湖与珊瑚礁坡；本作缓慢巡游是为新手捕食调整的游戏速度。",
      counter: "出生体型即可捕食，浅滩往返时留意它宽厚的轮廓。",
      nurseryResident: true,
      nutrition: 23,
      growth: 0.055,
    }),
    shoal("sunfish", "翻车鱼", 3, 2.8, 5, 75, 2, {
      latin: "MOLA MOLA",
      color: "#b8c6c9",
      realSize: "大型个体约3 m",
      ability: "立鳍慢游",
      description:
        "身体像被截短的圆盘，没有通常鱼类那样的长尾；高大的背鳍和臀鳍上下对称。游戏中是较易捕捉的中型猎物。",
      habitatNote: "表层晒背也会深潜；本作取上层觅食场景。",
      counter: "它转向慢，适合在成长前期稳定补给。",
    }),
    shoal("tuna", "蓝鳍金枪鱼", 3, 9.5, 12, 100, 6, {
      latin: "THUNNUS ORIENTALIS",
      color: "#89c8f5",
      realSize: "最大报告体长约3 m",
      ability: "敏捷群游",
      description:
        "流线型身体、黄色离鳍和月牙尾适合持续高速游动。是浅海通向中层的高营养猎物。",
      habitatNote: "太平洋蓝鳍金枪鱼；上层远洋活动，也能进入更深水层。",
      counter: "利用鱼群路径拦截，避免长距离尾追。",
    }),
    shoal("ray", "蝠鲼", 4, 5.5, 10, 120, 2, {
      latin: "MOBULA BIROSTRIS",
      color: "#9dc5e4",
      realSize: "最大约8 m翼展（不是体长）",
      ability: "宽鳍滑翔",
      description:
        "宽大胸鳍像翅膀一样缓缓扇动。真实蝠鲼是滤食者，不会主动捕食大型动物。",
      habitatNote: "热带与温带海域；游戏4 m是模型纵向尺度，翼展另计。",
      counter: "温和的大型补给来源，贴近时注意与礁石的距离。",
    }),
    hunter("angler", "深海鮟鱇", 1.2, 4.5, 125, 650, {
      tier: 1,
      latin: "CERATIOIDEI",
      color: "#c2aff8",
      realSize: "深海鮟鱇类最大约1.2 m，许多种远小于此",
      ability: "诱光伏击",
      description:
        "发光的诱饵吸引小鱼，宽嘴和尖牙用于伏击。它是深海小型猎手，真实体型远小于白鲨和鲸，不会变成十几米巨鱼。",
      habitatNote: "参考深海鮟鱇类，约300—4000 m；本作从显示500 m起出现。",
      counter: "不要被灯光误判体型；用声呐识别它，长大后可以捕食。",
    }),
    hunter("hammerhead", "锤头鲨", 4, 15, 12, 140, {
      latin: "SPHYRNA LEWINI",
      color: "#99bdca",
      realSize: "大型个体约3—4 m",
      ability: "横向巡猎",
      description:
        "宽阔的锤形头部是最明显特征。这里参考路氏双髻鲨；沿浅海与外海交界巡游，转向灵活。",
      habitatNote: "暖水近岸到外海；可深潜，本作主要分布在上层陆架。",
      counter: "通过大小标记判断能否吞食，利用地形打断追击。",
    }),
    hunter("shark", "大白鲨", 6.4, 17.2, 18, 165, {
      latin: "CARCHARODON CARCHARIAS",
      color: "#f5a896",
      realSize: "最大约6.4 m；多数成体更小",
      ability: "突袭加速",
      description:
        "锥形吻部、灰背白腹与三角背鳍构成剪影。真实大型成体会捕食海洋哺乳动物；游戏里它能短暂蓄力后加速追击。",
      habitatNote: "温带、亚热带近海与外海；不作为浅滩高密度鱼群。",
      counter: "观察冲刺预警，侧向变向并利用礁石，不要只沿直线逃跑。",
    }),
    hunter("octopus", "北太平洋巨型章鱼", 5, 6, 25, 200, {
      latin: "ENTEROCTOPUS DOFLEINI",
      color: "#d98665",
      realSize: "展开腕幅可达约5 m；不是躯干体长",
      ability: "防御墨幕",
      description:
        "圆润外套膜、八条带吸盘的粗腕，没有乌贼的尾鳍与两条长触腕。本作独自活动于礁区水层，受到靠近的捕食威胁时会预警、喷墨并短暂加速逃离。",
      habitatNote:
        "真实物种分布于北太平洋温带水域，多躲藏岩缝；本作5 m是展开腕部的游戏碰撞尺度，海域集合与游速经过改编。",
      counter:
        "喷墨是防御动作，绕过墨云后再接近；它不会获得玩家乌贼的十秒定身技能。",
    }),
    hunter("sperm_whale", "抹香鲸", 16, 18.8, 70, 520, {
      latin: "PHYSETER MACROCEPHALUS",
      color: "#aab4c3",
      realSize: "大型雄性约16 m，雌性通常更小",
      ability: "深潜压迫",
      description:
        "巨大方形头部、细窄下颌和横向尾鳍非常醒目。以深海乌贼等为食，能长时间深潜。本作把它设为现代类别中最大、最危险的对手。",
      habitatNote: "深海觅食、回水面呼吸；本作不会把追杀玩家说成现实常态。",
      counter: "幼年时保持距离，使用特殊技能和礁石脱身，成长后再接近。",
    }),
    ancient("dunkleosteus", "邓氏鱼", 6, 15, 165, 340, {
      latin: "DUNKLEOSTEUS TERRELLI",
      color: "#d8b98e",
      realSize: "估计存在争议，约3—10 m；本作6 m",
      ability: "蓄力重咬",
      description:
        "泥盆纪的装甲鱼，厚重头盾和自磨刃状颌骨代替通常的牙齿。身体比例并不完整，历史尺寸估计差异很大。",
      counter: "避开正面颌骨，观察蓄力后的恢复间隙再靠近。",
    }),
    ancient("plesiosaur", "蛇颈龙", 12, 13.5, 180, 390, {
      latin: "ELASMOSAURIDAE",
      color: "#88beb1",
      realSize: "大型薄板龙类估计约12 m",
      ability: "长颈截击",
      description:
        "这里采用大型长颈蛇颈龙类造型：小头、长颈和四枚鳍肢。它不是恐龙；本作中文统称蛇颈龙，并非只有约3.5 m的Plesiosaurus属。",
      counter: "留意长颈探向的方向，绕到宽大的躯干侧后方。",
    }),
    ancient("pliosaur", "上龙", 11, 18.2, 230, 460, {
      latin: "PLIOSAURUS",
      color: "#abb48d",
      realSize: "大型种估计约10—12 m",
      ability: "巨颌突进",
      description:
        "短颈、粗壮大头和四枚巨大鳍肢，与长颈蛇颈龙有明显不同。侏罗纪的大型海生爬行动物，用强大颌部捕猎。",
      counter: "避免与大嘴正面对冲，借助转向和地形寻找侧翼。",
    }),
    ancient("mosasaur", "沧龙", 13, 18.5, 260, 520, {
      latin: "MOSASAURUS HOFFMANNII",
      color: "#6dac99",
      realSize: "体型估计约11—18 m，仍有争议；本作13 m",
      ability: "摆尾截猎",
      description:
        "白垩纪海生蜥蜴的近亲，不是恐龙。长吻、四枚桨状鳍肢和发达尾部构成长而有力的轮廓。",
      counter: "避开嘴部与迎面突进，别在狭窄岩道里被它封住出口。",
    }),
    ancient("basilosaurus", "龙王鲸", 18, 17, 300, 580, {
      latin: "BASILOSAURUS",
      color: "#a99cad",
      realSize: "估计约15—18 m",
      ability: "长躯围猎",
      description:
        "名字虽然带“龙”，实际上是始新世早期鲸类。身体特别修长，仍保留极小的后肢；狭长头部有异型牙。",
      counter: "不要被长身体逼向岩壁；从外侧绕开，再寻找安全接近路线。",
    }),
    ancient("megalodon", "巨齿鲨", 20, 20.5, 330, 640, {
      latin: "OTODUS MEGALODON",
      color: "#adbac4",
      realSize: "大型个体估计约15—24 m；本作20 m",
      ability: "深海猛袭",
      description:
        "已经灭绝的巨大鲨鱼，完整软骨骨架未被保存，外形与最大体长仍依赖化石推断。不能把它简单当成放大的现代大白鲨。",
      counter:
        "早期应保持远距，优先寻找地形和技能脱离；体长优势建立后才值得冒险。",
    }),
  ]
    .sort(
      (a, b) =>
        CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
        a.length - b.length,
    )
    .map((entry) =>
      Object.freeze({ ...entry, population: POPULATIONS[entry.kind] }),
    ),
);
