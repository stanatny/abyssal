import { ODYSSEY_LORE } from "./odyssey_lore.js";
/** 图鉴背景故事；出处与美术改编记录保留在内部来源文档。 */
export const CREATURE_LORE = [
  [
    "sword_sage",
    "少年时，真君曾凭一柄利剑云游四方，连败名门高手，误以为天下已无敌手。直到魔族突袭师门，满门覆灭，他赶回时只见残破山门与熄灭的剑炉。昔日的锋芒救不了故人，他从此敛去轻狂，独入绝谷，以十数年的苦修重新问剑。\n\n他将悲愤化为持久的修行，终于由剑招入剑意，由剑意至以气御剑的化境。重返三界时，他斩破魔族旧阵，为师门雪恨，也成为足以纵横三界的大宗师。大仇得报之后，他却明白：若一生只追逐胜负，再强的剑也守不住内心的空缺。于是放下争名，渡海来到蓬莱。\n\n真君在中央仙山创立“承霄剑宗”，以“以气御剑”为门训，收青龙、白虎、玄武、朱雀为四方守护。他脚下的巨剑也名“承霄”，既载他巡行云海，也提醒他力量应有所承担。闯关者解除四象护阵后，真君会以“万剑归宗”与“踏剑惊鸿”试其胆识与应变；剑势有起落，来者有进退。如今他所求的不再是天下无敌，而是有人能够接过守护仙境的责任。",
    "As a young swordsman, the sage traveled with one blade, defeated renowned masters and mistook his victories for invincibility. Then a demon host destroyed his school. He returned to a ruined gate and cold sword furnaces, too late to save his teachers and companions. He abandoned his youthful pride and entered a secluded valley for years of disciplined practice.\n\nGrief became resolve. He passed from technique to intent, and finally to commanding swords through qi alone. Returning to the Three Realms, he broke the demons' old formations and avenged his school, becoming a grandmaster whose skill was acknowledged across the realms. Yet revenge revealed an emptiness that no further victory could fill. He relinquished fame and crossed the sea to Penglai.\n\nOn its central sacred mountain he founded the Skybearer Sword Sect, with 'Command the Sword with Qi' as its teaching, and accepted the Azure Dragon, White Tiger, Black Tortoise and Vermilion Bird as its four guardians. His greatsword, also named Skybearer, carries him through the clouds and reminds him that power carries responsibility. Once the Four-Symbol ward falls, Myriad Blades Converge and Skyborne Sword Rush test a challenger's courage and judgment, leaving opportunities to evade and answer. He now seeks a successor worthy of protecting the sanctuary, rather than another claim to invincibility.",
  ],
  [
    "azure_dragon",
    "在蓬莱，东峰的古松被长年流云磨成了弯曲的轮廓，青龙便沿这些山脊盘旋。它的角须掠过松梢，长躯一节节隐入云雾；山路上偶尔落下的青色鳞光，被旅人称为春雷的余痕。\n\n青龙执掌四象护阵的东方，讲求进退平衡。“沧溟龙息”汇聚云水，既有威势，也有明确的起势与收势。它不会为一时追逐离开守山之责，莽撞的来者会受惩戒，懂得观察剑隙般破绽的来者则能通过试炼。",
    "In Penglai, the Azure Dragon coils along eastern ridges where old pines bend beneath passing clouds. Horns and whiskers brush the treetops as its long body disappears into mist. Travelers call the green glints left above the path the afterimage of spring thunder.\n\nIt holds the eastern part of the Four-Symbol ward and values balance between advance and retreat. Dragon Breath of the Azure Sea gathers cloud-water with a deliberate preparation and recovery. The dragon will not abandon its mountain duty for a chase; reckless visitors are punished, while those who read its openings may pass the trial.",
  ],
  [
    "white_tiger",
    "西山的石阶常有新鲜爪痕，风过桃林时，树梢先静下来，白虎才从岩影中现身。传说中，它曾守过通往人间的旧隘口，后来受真君之托，成为蓬莱西方的护阵者。厚重肩胸与宽大虎掌，是它迅速发力的根基。\n\n“白虎掠风”讲求一瞬爆发：低身蓄势、踏地跃扑、落地收爪。它并非漫无目的的杀戮者，只守自己的山脊。面对它时，直线后退往往不如及时侧让，待虎势落尽再回身。",
    "Fresh claw marks score the western stone steps. When wind passes through the peach groves, the treetops seem to fall still before the White Tiger emerges from rock shadows. In legend, it once guarded an old pass to the mortal world before accepting the sage's western watch. Heavy shoulders and broad paws ground its explosive movement.\n\nWhite Tiger Windstep is a committed burst: crouch, spring, land and recover. It guards its ridge rather than hunting without purpose. A timely sideways escape is wiser than retreating straight backward; turn to answer only after its momentum is spent.",
  ],
  [
    "vermilion_bird",
    "南方高空的赤色流霞，并不全是夕阳。朱雀巡行时，赤金冠羽与长尾在云边留下一道明亮轮廓。相传，它以南方天火护住仙岛的暖流，却从不将桃林烧成焦土。\n\n护阵受到挑战时，它会展开颈羽，施展“朱羽焚天”，三道焰息依次扫过来者的路线。声势虽盛，起势仍有预兆；它倾尽攻击之后，天空也会留出短暂的宁静。",
    "Not every red streak in Penglai's southern sky is sunset. The Vermilion Bird's golden crest and streaming tail trace a bright silhouette beside the clouds. In legend, it tends the island's warm southern currents without reducing the peach forest to ash.\n\nWhen its ward is challenged, it spreads its neck feathers and unleashes Vermilion Skyfire, sending three flame volleys across an intruder's course. The attack is powerful but visibly prepared; once its fury is spent, the sky offers a brief moment of calm.",
  ],
  [
    "black_tortoise",
    "北池的石碑有些早已沉没，玄武背上的甲纹却仍如古城般整齐。龟身承重，蛇身巡望，一静一动，共守北方。传说中，它记得莲池还未开花时的山势，因此也被称为仙岛的长年见证者。\n\n“玄甲镇渊”升起时，厚甲与水纹连成护阵，强攻难以得手。阵势退去后，侧翼才露出空隙。与它交手考验的是耐心与进退，而不是一味地追求速度。",
    "Many inscriptions have sunk beneath the northern lotus pool, yet the Black Tortoise's shell plates remain ordered like an ancient city. The tortoise bears the weight while the serpent keeps watch: stillness and movement share the northern duty. In legend, it remembers the mountains before the first lotus bloomed.\n\nAbyss-Sealing Shell Ward joins armor and rippling water into a defense that cannot be rushed. Its flank opens only as the ward subsides. This trial rewards patience and timing rather than speed alone.",
  ],
  [
    "jade_minnow",
    "莲池的浅水像一面碎玉镜，玉鳞游灵便藏在这些倒影之间。它们沿莲茎穿行，轻尾在水面留下细小波纹，是刚到蓬莱的旅人最先遇见的生灵。莲池旁的老修士把它们当作水脉安定的征兆。",
    "The lotus shallows resemble a mirror of broken jade, and Jade Minnows gather among its reflections. They thread between stems, leaving fine ripples with their light tails, often becoming a visitor's first encounter in Penglai. In legend, elder monks regard them as a sign of settled currents.",
  ],
  [
    "lotus_sprite",
    "当莲叶遮住晨光，贝灵的珠核仍在水下轻轻明灭。它们随水纹张合花瓣般的壳，触丝贴着莲根探路，像一盏被池水温柔托住的小灯。传说中，漂散的花愿落入水中，才有了这些守候花季的生灵。",
    "When lotus leaves block the morning light, the sprite's pearl still glimmers beneath them. Its petal-like shells open with the ripples, while fine feelers follow the roots like a small lantern cradled by the water. They are said to be born from wishes carried into the pool by fallen blossoms.",
  ],
  [
    "cloud_crane",
    "云鹤沿山间气流排成疏朗队列，前鸟转向，后鸟依次跟随，白翼掠过桃林上空。相传，观中弟子曾循鹤影找到被云遮住的山路；于是鹤群的去向成为旅人辨认山势的一种线索。",
    "Cloud Cranes follow mountain air in open formations, each bird turning after the one ahead as white wings cross the peach groves. In island legend, monastery pupils once followed their shadows to a cloud-hidden path. Their flight gives travelers a sense of the landscape.",
  ],
  [
    "dragon_carp",
    "龙门下的水声终日不息，龙鲤的金鳞常在急流间闪过。多数金鲤仍沿云间航带寻食，少数在石门前盘旋蓄势：长须绷向前方，尾鳍一振，便沿着门柱间的空隙向上跃起。\n\n越过龙门之后，鱼身在金色微光里舒展为赤金云龙，生出四足与短角，扇尾还留着金鲤的模样。它获得了巡猎云间的力量，却远没有青龙的护阵威势。变化不是另一尾鱼凭空降临；化龙者仍是那尾蓄势的金鲤。它巡游一阵，再收敛龙形，重新修行。",
    "Water never falls silent beneath the Dragon Gate. Most gold carp feed along their cloud lanes, while a few gather before the stone arch. Their barbels point forward, their tails strike, and they rise through the gap between its pillars.\n\nBeyond the gate, a golden shimmer reveals a red-gold cloud dragon with four feet, short horns and a fan tail still recalling the carp. It can hunt in the clouds, but lacks the Azure Dragon's guardian power. No extra fish appears: the creature remains the same carp. After a patrol it returns to its earlier form and begins the ascent anew.",
  ],
  [
    "spirit_carp",
    "灵鲤不追求龙门的声名，更喜欢沿北池石岸安静巡游。月色落进水中时，它们的尾鳍仿佛把碎光重新缝合。传说中，它们守候的是莲池本身：山上云势再剧烈，水下仍有一条熟悉的归路。",
    "Spirit Carp seek no fame at the Dragon Gate, preferring quiet circuits beside the northern pool's stone banks. Their tails seem to stitch scattered moonlight together beneath the surface. In legend, they keep faith with the pool itself: however restless the mountains become, a familiar route remains below the water.",
  ],
  [
    "wenyao",
    "文鳐循贴近水面的风带滑行，白首与赤喙先从薄雾中显露，细长鱼身随后展开羽翼。蓬莱旅人常将远处掠水的翼影误认作仙鹤，待它收翼转弯，才看见鱼尾划出的水纹。",
    "Wenyao glides along wind bands close to the water, its pale head and red beak appearing before the slender fish body unfolds its feathered wings. Travelers mistake a distant silhouette for a crane until its turn reveals a fish tail tracing the ripples.",
  ],
  [
    "luoyu",
    "宽身蠃鱼更像云边的一面活帆，翼面托住沉实的鱼身，行进姿态与细长文鳐不同。它们常沿山谷边缘换向，成群时也保留转身的空隙。它们随云海涨落而行，像知晓天风何时转向。",
    "Broad-bodied Luoyu resemble living sails at the cloud edge, their wings supporting a heavier silhouette than Wenyao. They turn along valley margins while leaving room for their neighbors. They follow the cloud sea's ebb and flow, as though they know when the wind will turn.",
  ],
  [
    "chiru",
    "赤鱬在莲池暗影中游动，赤色体纹与近似人面的轮廓使它带着难以解释的神秘感。旅人偶尔在波纹间看见一张转瞬消失的面孔，却分不清是游灵还是水中倒影。",
    "Chiru moves through shaded lotus waters, its red markings and face-like outline lending it an unsettling mystery. A traveler may glimpse a face between ripples and wonder whether it was a spirit or a reflection.",
  ],
  [
    "xuangui",
    "旋龟喜欢靠近浸水的石台，鸟首抬起巡视，细长蛇尾则顺着水流摆动。它的异形轮廓让人想起水边古老的传说，却没有玄武那般镇守一方的威势。它是水边的隐居者：来者未近，便悄然换了一片石影。",
    "Xuangui favors submerged stone shelves, surveying with its bird-like head while a serpent tail follows the current. Its unusual outline recalls waterside legends without the Black Tortoise's guardian authority. It is a waterside recluse, quietly trading one stone shadow for another before visitors approach.",
  ],
  [
    "lushu",
    "鹿蜀走过桃林边的山道，白首与虎纹在树影下格外鲜明。传说中，雨后最先踏上湿石阶的往往是它们，蹄声沿山谷传开，旅人才知道旧路仍可通行。晨雾散开后，红尾便沿着山径消失在下一片桃林。",
    "Lushu follow mountain paths beside the peach groves, their white heads and tiger markings standing out in the shade. In legend, they are often first onto the wet steps after rain, their hoofbeats assuring travelers that an old route remains open. After the morning mist clears, their red tails disappear along the path into another peach grove.",
  ],
  [
    "bifang",
    "毕方在云边巡飞，单足收在身下，长喙与火色羽纹勾勒清晰的侧影。它守望干燥山林：远处有异样热气时，鸟影便先越过山头。山中旅人将这道火色鸟影视为山火将至的预兆。",
    "Bifang patrols cloud margins with its single leg tucked beneath it, a long bill and fiery markings defining its profile. It watches dry forests, crossing a ridge before unusual heat becomes visible. Mountain travelers read its fiery silhouette as a warning of coming forest fires.",
  ],
  [
    "nine_tail_fox",
    "九尾狐出没于桃林与山岩交界，九尾散开时像层层柔云，收拢时又隐入树影。旅人追逐一道银白尾影，常会在转过石壁后发现它早已换了方向。蓬莱故事写它敏捷而狡黠，却不把所有古代狐传说简化成同一种善恶性格。",
    "Nine-tailed Foxes favor the boundary between peach groves and mountain rocks. Open tails resemble layered clouds; folded tails vanish into shade. A traveler chasing a white streak around a stone wall may discover it has already changed course. It knows paths hidden beneath the cloud shadow and rarely lets a pursuer see all nine tails at once.",
  ],
  [
    "hujiao",
    "虎蛟沿深一些的莲池水道游弋，鱼身先破开水纹，蛇尾随后卷过岩根。名字中的“虎”不意味着虎形四肢，它的危险来自水下长躯与有力尾部。它守着水道中的暗隙，让安静的池水也保留一份危险。",
    "Hujiao patrols deeper lotus channels, its fish body parting the ripples before a serpent tail passes the rock roots. Its name does not imply tiger legs; the aquatic silhouette and strong tail carry its menace. The island's story places it among the channel hunters, preserving unease beneath otherwise peaceful water.",
  ],
  [
    "gudiao",
    "蛊雕从峭壁上方展翼，额角与锐爪投下比普通飞鸟更沉重的影子。它不与低空翼鱼挤在一条航带，而沿高处山隙寻找机会。它常在山隙的背风处收翼等待，直到谷中传来陌生的振翅声。",
    "Gudiao opens its wings above the cliffs, its horn and claws casting a heavier shadow than an ordinary bird. It follows higher mountain gaps instead of crowding the low wingfish lanes. It folds its wings in the lee of a mountain gap, waiting for unfamiliar wingbeats from below.",
  ],
  [
    "zheng",
    "狰在山脊间低身行进，多尾随着转向分开，角与肩背先越过草石。它的轮廓远看像伏行的豹，近处才显出异兽的复杂形态。它守着自己的山间猎路，并不替代白虎的四象身份。",
    "Zheng moves low along ridges, its multiple tails separating through turns as horn and shoulders emerge above grass and stone. From afar it may resemble a stalking leopard; nearby its stranger silhouette becomes clear. Its mountain hunting paths do not give it the White Tiger's Four-Symbol role.",
  ],
  [
    "bashe",
    "巴蛇像一条流动的山影，长躯随连续波动穿过谷口，而不是僵直地横在空中。仙岛故事说，云海忽然遮住旧路时，旅人应先看清那是雾还是蛇身。它夸张的体量承接神话想象，沿身传播的动作则让幻想形态仍有活物感。",
    "Bashe resembles a moving mountain shadow, its long body carrying continuous waves through a valley rather than hanging rigidly in the air. The island's story advises travelers to distinguish mist from a serpent when an old route suddenly disappears. Its immense scale belongs to myth, while traveling motion gives the imagined form a living presence.",
  ],
  [
    "kui",
    "夔在高处石台停留，粗壮躯干与单足构成与四足走兽不同的重心。它起落时带着雷鸣般的气势，远处薄云也仿佛随之震动。它的雷鸣震彻山谷。",
    "Kui occupies high stone shelves, its heavy body and single leg creating a balance unlike a four-footed beast. Its rising and settling suggest thunder, as though nearby clouds trembled with it. Its thunder rolls through the valley.",
  ],
  [
    "kun",
    "北冥巨鱼的传说在蓬莱有了可见的身影：宽阔头部先从云层里显露，长须贴着风向舒展，横向月牙尾推动沉重躯干，翼鳍像两片活着的云帆。它的尺度足以压过普通飞鱼，却仍给仙山之间留下回旋的天空。\n\n当气流积蓄，鲲会向高处抬升，收住鱼尾、展开层叠巨翼，化为钩喙利爪的大鹏。这是同一个生命的两副面貌。鹏掠过山脊后又会回归鲲形，庞大的翼影又收回云间游鱼的轮廓。",
    "The northern giant takes visible form in Penglai. A broad head emerges from the clouds, whiskers follow the wind, and horizontal crescent flukes drive a heavy body between vast living fins. It dwarfs ordinary flying fish while leaving room to turn between the sacred peaks.\n\nWhen the currents gather, Kun rises and unfolds layered wings into a hooked-beaked, taloned Peng. These are two forms of one life. After crossing the ridges, Peng returns to Kun. The vast wings fold back into a wandering fish, and the cloud sea rises anew with every ascent.",
  ],
  [
    "gate_dragon",
    "龙门云龙不是四象护阵的一员。它的赤金鳞片间仍能见到鲤鱼的影子，短角未长成青龙的王冠，扇尾也还没有忘记水流的方向。\n\n在蓬莱，跃门只是修行的起点。新生的云龙绕过桃林上空试探风势，会向较小的来者发起巡猎，却不会撼动神兽的守山之责。力量渐息时，它收回四足，重新成为金鲤，等待下一次跃升。",
    "The Dragon-Gate Cloud Dragon belongs to no sector of the Four-Symbol ward. Its red-gold scales still recall the carp, its short horns have yet to become a guardian's crown, and its fan tail remembers the current.\n\nIn Penglai, crossing the gate begins an apprenticeship rather than completing it. The young dragon tests the winds above the peach groves and hunts smaller visitors without challenging the sacred guardians. When its borrowed vigor fades, it folds back into a gold carp and awaits another ascent.",
  ],
  [
    "peng",
    "鲲举身破云，鹏展翼御风。厚实肩胸托起重叠羽翼，钩喙指向远处山脊，利爪收在腹下，鱼形的迟缓被有力的振翼取代。\n\n传说中，修行者仰望鹏影，才理解云海也是一条有涨落的道路。它借山风越过仙峰，随后又将巨翼收回鲲的轮廓。山与海相望，鱼与鸟只是它行经天地的两副面貌。",
    "Kun rises through clouds; Peng spreads its wings to the wind. Powerful shoulders support layered wings, a hooked beak points toward distant ridges, and talons fold beneath its belly. Strong wingbeats replace the giant fish's slower drift.\n\nIn legend, pupils looking up at Peng realize that the cloud sea is a road with its own tides. It rides mountain winds across the peaks before folding its wings back into Kun's silhouette. Fish and bird are two faces of one life crossing between mountain and sea.",
  ],
  [
    "golden_manta",
    "在外礁，这只蝠鲼被称为浪光的拾取者：它离开浅滩，沿不起眼的礁台折返，翼上的金纹只在转身时显露。明亮标识不等于顺手可得，它会在来者靠近时改变路线。找到它以后，仍需要观察、冲刺和一次准确的截击。",
    "Outer-reef tale calls this manta a gatherer of wave-light. Away from the nursery, it doubles back along unassuming shelves, showing gold veins as it turns. A visible shimmer does not make it an easy catch: it changes course when approached. Discovery must still be followed by observation, sprinting and a well-timed interception.",
  ],
  [
    "pearl_nautilus",
    "传说中，古城石刻失去的一枚珠纹并未沉入泥沙，而是跟随这只鹦鹉螺游进了外城柱廊。它的螺壳在阴影中收住光，转向时才露出细细金边。遗迹有许多看似相同的石台，它的巡游路线却不为每次远征重复，寻访者需要耐心。",
    "Tale imagines a pearl motif lost from a city carving traveling into the outer colonnades with this nautilus. Its shell holds the light in shadow and reveals a thin golden edge when it turns. Many ledges look alike, but each expedition may begin its search elsewhere; the visitor needs patience as well as speed.",
  ],
  [
    "crimson_sail",
    "风暴海的水手把它叫作不肯沉没的红帆：船旗早已腐朽，鱼背上的绯色高帆仍穿过残骸。它沿远处水道折返，金光在阴暗浪影中短暂闪动。追逐时，宽阔的帆形轮廓比颜色更容易辨认，提前看清转弯比一味尾随更有用。",
    "Storm-sea sailors in the tale call it the red sail that refuses to sink. Old flags have decayed, yet its crimson dorsal sail still passes among wreckage. It doubles back through remote channels, gold briefly glinting in dark water. During pursuit, the tall silhouette can be clearer than its color; anticipating a turn is wiser than following blindly.",
  ],
  [
    "glass_prawn",
    "在海沟深处，这只虾像岩壁裂隙漏出的一点蓝灯。分节腹部收展时，长触角先绕开石缘，金色微光随后划出短弧。它藏身于首层深沟的偏僻岩影，不是抵达底层才会出现的奖品；发现之后，也不会停在原地等待捕捉。",
    "In the trench, this prawn resembles a blue lantern escaping a crack in the wall. Its antennae clear the stone edge before the segmented abdomen flexes, carrying a brief golden arc behind it. It occupies secluded shadows in the first deep layer rather than waiting as a bottom-level prize, and it will not remain still once discovered.",
  ],
  [
    "jade_arowana",
    "雨林旅人将它视为沉根之间的绿光：长身贴着幽暗回水湾掠过，上翘的口与须端先探出阴影。它并不固定守在某一棵树根下，附近的河道与根影都可能是寻访线索。追逐它时需要给转身留出空间，冲刺也要配合方向。",
    "Rainforest tale sees it as a green flash among submerged roots. A long body crosses the backwater, with an upturned mouth and barbels appearing first from shade. No single root is its permanent hiding place; nearby channels provide possible search clues. A chase needs room for turns, and sprinting must be paired with steering.",
  ],
  [
    "crystal_seraph",
    "在冰下海洋中，六重翼膜像缓慢开合的晶花，感官囊在盐脉暗处折出微光。它并不向往地球的阳光，而沿冰下洞隙辨认自己的路径。",
    "In the ice ocean, six membranes open like a crystal flower while the sensory sac refracts faint light beside brine seams. It knows no terrestrial sunlight and follows its own paths through ice-dark hollows. Its passing leaves a dim arc in the brine, a fleeting gift to a patient explorer.",
  ],
  [
    "gilded_cloud_carp",
    "传说中，桃花谢入云海时，流金云鲤会沿山肩追寻散落的花影。它的云翼托着轻巧鱼身，须端与金鳞在薄雾里一闪即逝。云海很宽，它不会待在出生莲池旁；愿意绕山寻访的旅人还要追上它的折返，才能得到仙岛的一份馈赠。",
    "Gilded Cloud Carp follow fallen peach-blossom shadows along mountain shoulders. Cloud-like fins carry a light fish body, and barbels and gold scales briefly emerge from mist. It does not wait beside the starting pool. A traveler who explores the mountains must still catch its evasive turns to receive the island's gift.",
  ],
  [
    "kraken",
    "在深海，克拉肯把断柱与沉船当作领地的边界。远处首先出现的往往不是头部，而是绕过岩影的一条巨腕；吸盘一节节收紧，整片水流随之改变。古城的守护者将它称为沉默的门卫，因为它记得那些早已无人经过的城门。",
    "In the deep sea, Kraken marks its territory with broken columns and sunken hulls. A vast arm passing behind a rock may appear before the head, its tightening suckers disturbing the water. City keepers call it the silent gatekeeper: it remembers entrances that no visitor has crossed for ages.",
  ],
  [
    "hydra",
    "三首海德拉并非三个意识完全相同的头：一首巡视前路，一首警戒侧翼，另一首低垂在水影之间。它们的视线偶尔交错，才显出巨兽全身正在转向。水手故事把这场相遇称为三重审视——逃离一双眼睛，并不意味着避开了其余两双。",
    "Three Hydra heads keep different watches: one surveys the route ahead, another the flank, while the last lowers toward the dark water. Their glances briefly converge before the great body turns. Sailors call the encounter the triple scrutiny: escaping one pair of eyes does not escape the other two.",
  ],
  [
    "leviathan",
    "传说中，利维坦的鳞甲像深沟两岸相互咬合的岩层，脊冠从黑暗中升起时，旁边的大鱼也显得渺小。它长年沿最深的裂谷巡行，厚重长躯一转，尾后的泥沙便遮住来路。有人把深处沉闷的回响误认作岩石移动，直到看见那道活着的背脊。",
    "In legend, Leviathan's interlocking scales resemble the walls of a deep fissure. When its spinal crown rises from darkness, nearby large fish seem small. It patrols the deepest rifts, turning a heavy body that leaves silt behind its tail. Travelers mistake the low echo for moving rock until they see a living ridge.",
  ],
  [
    "mayan",
    "传说中，格兰玛雅不是某个失落文明的神，而是海沟自己留下的噩梦。厚重头冠下六枚蓝眼依次亮起，环褶长躯拖过岩床，水层像被看不见的弦拨动。它很少显露全身；探险者往往先遇见一双眼，再发现身旁另外两双也已睁开。",
    "In legend, Gran Maja is no lost civilization's deity, but a nightmare left by the trench itself. Six blue eyes awaken beneath a heavy crown as its ring-folded body crosses the stone, disturbing the water like an unseen string. An explorer may notice one pair of eyes before realizing that two more pairs are already watching.",
  ],
  [
    "yacumama",
    "河母巨蛇沿根穴与深潭游弋，远看像一段被洪水带来的沉木。长躯开始起伏时，枝影、水纹与鳞光才分出彼此。雨林旅人相传，它守着河道最古老的回水处；那里并非空无一物，而是有一条巨蛇把自身藏进了地貌。",
    "River mother moves through root vaults and deep pools, resembling flood-carried timber from afar. Only when its long body undulates do branch shadows, ripples and scales separate. Rainforest travelers place it in the oldest backwater: an apparently empty place occupied by a serpent hiding within the landscape.",
  ],
  [
    "rootjaw",
    "根颚君王背上的骨棘像河床里露出的残根，宽阔前躯则把旧木阴影连成一片。传说中，它并不追逐每一条过路鱼，而等待闯入者误把它当作可以穿过的河底。裂颚张开的一刻，沉木般的轮廓才显露为活物。",
    "Rootjaw's dorsal spines resemble roots protruding from the riverbed, while its broad forebody merges with old timber shadows. In legend, it waits for a visitor to mistake its outline for a passable piece of river bottom. Only when the split jaws open does the timber-like shape reveal a living creature.",
  ],
  [
    "flood_arapaima",
    "洪潭是一处被季节水流隔开的旧河湾，巨骨舌鱼的近亲在其中长成沉重体态。旧鳞被水光磨亮，粗尾缓缓划开浑浊水层。探险者见到它时，仿佛看见一条仍记得洪水来路的老河。",
    "The flood pool is an old river bend isolated by seasonal currents, where an arapaima relative grew massive. Waterlight polishes its old scales as a heavy tail parts the murk. An explorer seems to meet a living remnant of the flood that shaped the river.",
  ],
  [
    "rootback_colossus",
    "根背巨鳄从深谷旧泥层里苏醒，粗重背甲带着被沉根挤压过的轮廓。它的身形像一片缓慢移动的河岸，但长桨尾摆动时，笨重的错觉便会消失。",
    "Rootback Colossus awakens from old valley sediment, its heavy armor shaped like stone pressed by sunken roots. Its body resembles a moving bank until the paddle tail sweeps and dispels the impression of clumsiness.",
  ],
  [
    "zombie_shark",
    "传说中，这条鲨鱼曾在无名沉船的阴影里消失，归来时伤口仍未愈合，骨架与肌肉却重新开始运动。它召出的仆从像一段从本体分离的旧梦，围着主人寻找食物。每次献祭都在消耗它尚存的生命，力量与残缺始终伴在一起。",
    "The tale tells of a shark that vanished beside an unnamed wreck and returned with unhealed wounds, bones and muscles moving once more. Its summoned servant resembles a fragment of an old dream, circling its master in search of food. Each sacrifice spends part of its remaining life; its strength can never be separated from its ruin.",
  ],
  [
    "mechanical_shark",
    "工程师原本想制造一台能在危险海域救援的潜行机，后来为它装上装甲、推进器和鱼雷舱。机体保留了鲨鱼的流线与铰接鳍尾，冷色传感器穿过浑浊水体。它没有无限的能源：每次开火都要动用自身储备，钢铁外壳之下仍有需要守住的生存底线。",
    "In legend, engineers first built this craft for rescue in hostile waters, then added armor, thrusters and a torpedo bay. Its hull retains a shark's streamlining and articulated fins, with cool sensors watching through the murk. Its energy is finite: every launch spends its own reserves, and even a steel body must preserve the resources that keep it alive.",
  ],
  [
    "glass_seed",
    "在冰下海洋中，玻种游体像被盐水托住的活晶种。六枚晶壳一张一合，把柔软的核心藏在折射光之间。科考记录给它的第一个称呼只是“会转身的碎晶”，直到观察者发现同一枚光点正在选择自己的方向。",
    "In the ice ocean, Glass Seed resembles a living crystal suspended in brine. Six opening valves hide a soft core among refracted light. Expedition notes first call it 'a shard that turns' until an observer realizes the same glimmer is choosing its own direction.",
  ],
  [
    "ribbon_spore",
    "科考日志将绶带孢游描述为盐流上的一截软绸：囊体先转向，薄膜与长丝随后弯过去。它并非无生命地随波飘走，前端轻轻调整，整个带状轮廓便绕开岩缘。冰下寂静让这样微小的动作也变得引人注目。",
    "Expedition notes describe Ribbon Spore as silk laid across a brine current: its capsule turns first, followed by membrane and filaments. It is not a lifeless strip drifting away; a slight adjustment at the front carries the whole ribbon around a stone edge. In the ice-dark quiet, even a small movement draws attention.",
  ],
  [
    "tripod_bloom",
    "三瓣浮蕾在冰下水层缓缓开合，肉瓣展开后，中央核心像被三片柔盾围住。它的对称形态让科考者想起一朵花，却又在转向时显露游体的姿态。没有阳光的冰下海洋里，花的比喻只是人类理解陌生生命的第一步。",
    "Tripod Bloom opens slowly in the ice-dark water, three fleshy shields surrounding its central core. Its symmetry reminds explorers of a flower until a turn reveals a swimming organism. In this ocean without sunlight, floral language is merely a human first attempt to understand unfamiliar life.",
  ],
  [
    "sail_crawler",
    "帆脊巡游者带着一副厚甲，却不把自己锁在海床上。高帆与六枚桨肢交替调整姿态，像一艘有生命的冰下小艇。科考者曾把它和底部步行者混为一类，直到它越过岩拱，露出完全不同的游泳轮廓。",
    "Sail Crawler carries armor without confining itself to the bottom. A high sail and six paddle limbs adjust its posture like a living ice-ocean skiff. Explorers initially group it with bottom walkers until it passes over an arch, revealing a different swimming silhouette.",
  ],
  [
    "lantern_pod",
    "灯荚游体像一盏被骨架保护的小灯，五道肋骨留下能看见内囊的缝隙。微光随姿态变化，而裙状附肢轻轻拨水。科考日志里最安静的一页，便是它沿冰影转过半圈，只留下光与水纹的描写。",
    "Lantern Pod resembles a small lamp protected by a framework, five ribs leaving glimpses of the inner sac. Its faint light changes with posture as skirt-like appendages stir the water. One quiet page of expedition notes records only a half-turn beneath the ice: light, ripples and silence.",
  ],
  [
    "veil_glider",
    "帷翼滑翔者贴着冰拱下缘掠过，宽翼将身体托成一片缓慢起伏的暗幕。尾丝仍留在旧水流里时，前端已进入下一道岩影。科考日志把这种从容姿态称为“在黑暗中滑行的帷幔”，但感官窝与运动的外套提醒人们，它是活着的游体。",
    "Veil Glider crosses beneath ice arches, broad wings carrying it like a gently rising dark curtain. Its tail filaments remain in the previous current as its front enters the next rock shadow. Expedition notes call it 'a veil sliding through darkness,' while sensory sockets and a moving mantle reveal a living swimmer.",
  ],
  [
    "forkjaw_stalker",
    "裂颚潜猎者在盐脉转角只露出头盾，两枚弯钳贴近口前，厚实肌肉藏在甲缘之后。陌生轮廓看上去像一件闭合的工具，直到钳颚分开才显出猎手的气势。",
    "Forkjaw Stalker may show only its head shield at a brine bend, curved pincers held close before the mouth and thick muscle concealed behind armor. Its silhouette resembles a closed tool until the jaws spread and reveal a hunter.",
  ],
  [
    "crown_filterer",
    "冠环滤食者围着自己的中心展开腕冠，水流从长腕之间经过，放射口器随之缓慢开合。它看似繁复的花环，却有一副保持整体的核心躯干。科考者把腕冠的张合画进手册，才逐渐看清这套陌生身体的前后与内外。",
    "Crown Filterer opens an arm crown around its center, its radial mouth moving as water passes between the arms. What first resembles an elaborate wreath is held together by a central body. Explorers sketch successive crown poses before learning to read its unfamiliar front, back, inside and outside.",
  ],
  [
    "prism_hunter",
    "棱冠猎手在暗水中呈现刀锋般的硬轮廓，三面头甲与刃翼收束到身体两侧。它转向时，感官槽依次露出，反光像在棱面间迁移。科考日志中，观察者最初以为是一块随水流翻转的矿片，下一刻才看见其有目的的运动。",
    "Prism Hunter presents a blade-like outline in the dark water, its three-sided head armor and sharp wings tucked beside the body. Turning exposes successive sensory grooves, moving reflections from facet to facet. An observer first mistakes it for a rotating mineral shard, then notices its purposeful motion.",
  ],
  [
    "bell_carrier",
    "浮钟巨载把附属囊体带过冰海，钟罩与拖曳的囊群组成比单一躯干更庞大的轮廓。它一收一展，周围暗水像被推开又合拢。科考者称它为移动的冰下温室，以这样的比喻描述其缓慢而复杂的生命形态。",
    "Bell Carrier carries satellite sacs through the ice ocean, a bell and trailing cluster forming a larger silhouette than one body alone. Its opening and contraction seem to part and close the dark water. Explorers call it a moving ice-ocean greenhouse, a metaphor for a slow and complex life form.",
  ],
  [
    "siphon_colossus",
    "虹吸巨腹沿暖流缓缓移动，粗腹被层层环褶围住，外置管口像陌生的呼吸装置。它每次调整姿态，都让这些管口与腹体形成新的侧影。科考日志不敢把它直接归为鱼类，只留下“随水流展开的巨型管状生命”这一暂定描述。",
    "Siphon Colossus moves along warm currents, annular folds enclosing its abdomen and external tubes resembling unfamiliar breathing equipment. Each posture changes the relationship between tubes and body. Expedition notes hesitate to call it a fish, recording only a provisional 'giant tubular life form unfolding with the current.'",
  ],
  [
    "spiral_grazer",
    "螺冠巨游在晶床边留下缓慢移动的盘卷轮廓，侧膜舒展时，厚壳下面的软足才显露出来。壳口的感觉须先试探水流，身体再跟着转过去。科考日志把它描述为背负回旋宫殿的游体，名字只是人类对陌生形态的比喻。",
    "Spiral Grazer carries a slowly turning coil beside crystal beds. Lateral membranes reveal a soft foot beneath the heavy shell, while aperture feelers sample the current before the body follows. Explorers describe a swimmer bearing a spiral palace; the name is a human metaphor for an unfamiliar shape.",
  ],
  [
    "rift_reaver",
    "裂谷掠夺者在热泉裂隙里只显出一段段骨甲，长尾随后把这些碎影连成整体。前端钩颚与沿身传播的侧波，让它不像一条僵直的巨鱼。科考日志记载，探测灯沿岩壁扫过时，观察者才意识到那排回钩正在随一副身体移动。",
    "Rift Reaver first appears as fragments of armor in vent fractures before a long tail joins the shadows into one body. Hooked jaws and traveling side waves distinguish it from a rigid giant fish. In expedition notes, a lamp crossing the wall reveals that a line of recurved hooks is moving with a living creature.",
  ],
  [
    "void_siphon",
    "虚渊吞吸者在深窟里把四瓣颚贴近深陷口腔，外层环甲藏入岩影。它展开时像洞口又开了一道洞口，粗腹则在后方缓缓转动。科考者给它取名时，用的是初见那副轮廓的恐惧，而不是对真实外星动物作出的科学分类。",
    "Void Siphon folds four jaws around a recessed maw in deep hollows, its annular armor merging with rock shadows. When it opens, another cave mouth seems to appear inside the first, while the abdomen turns behind it. Its name records an explorer's first fear, not a scientific classification of a real alien animal.",
  ],
  [
    "brine_rosette",
    "盐泉旋花贴着海床展开六瓣甲盖，中央软组织在窄缝间显露。它看似扎根的晶花，却会随姿态变换调整瓣片。科考者在同一片盐床上驻留良久，才察觉那些“花瓣”并没有保持石头的静止。",
    "Brine Rosette spreads six carapace valves close to the floor, soft tissue visible through narrow gaps. It resembles a rooted crystal flower until its plates subtly adjust. An explorer watches the same salt bed long enough to realize that these 'petals' do not share the stillness of stone.",
  ],
  [
    "hinge_walker",
    "铰甲步行者沿盐床交替抬起六条粗肢，关节让沉重的甲体仍能越过小小起伏。头甲低垂，感官窝朝着行进方向，步态与水层中的帆脊巡游者明显不同。科考者因此第一次把冰下的“游体”和“步行者”分写在两页记录上。",
    "Hinge Walker alternates six sturdy limbs across salt beds, joints carrying a heavy armored body over small rises. Its head shield and sensory sockets face the route ahead, unlike the swimming Sail Crawler. Expedition notes consequently give the ice-ocean swimmers and walkers separate pages.",
  ],
  [
    "abyss_weaver",
    "在冰海中，织母的长腕围出一处较温暖的水层，三叶外套保护着脉动的核心。远处的光先沿分叉腕尖闪过，随后才显出庞大的整体。科考者把它比作在黑暗中织潮的母体：那不是丝线，而是陌生生命与冰海水流之间的联系。",
    "In the ice ocean, the Weaver's long arms enclose a warmer pocket of water while a three-lobed mantle shelters its pulsing core. Distant light appears first along forked arm tips, then reveals the immense whole. Explorers imagine a mother weaving tides in the dark: not threads, but an unfamiliar bond between life and ice-ocean currents.",
  ],
  [
    "lumen_stalker",
    "科考船坠入冰海后，一些冷色光点开始沿船壳外缘缓缓移动。探测器起初把它们当作散落的仪器，直到八条长腕同时围过残骸，光点也随同一副躯体转向。巡狩者并不理解人类的船，它只是把这处新落入领地的影子纳入了自己的巡视。",
    "After the research vessel falls into the ice ocean, cool glints begin moving around its hull. Instruments first identify scattered equipment, until eight long arms pass around the wreck and all the glints turn with one body. The stalker knows nothing of human vessels; it has merely included this new shadow in its territorial watch.",
  ],
];
CREATURE_LORE.push(
  ...ODYSSEY_LORE,
  [
    "scylla",
    "每到暗潮转向，她都会伸出长颈掠过礁顶。六颗头互相窥探，似乎记得每一艘从此经过的船；只在吐息后的短暂静默中，躯干侧面才让旅人看清。",
    "When the dark tide turns, she stretches her necks above the reefs. Six heads watch one another as though remembering every passing ship; only the silence after their breaths reveals the body's flank.",
  ],
  [
    "charybdis",
    "深潭边的断链记录着曾经挣扎的船。如今归航路标已沉进水底，巨口缓缓收拢裙鳍，守着那条没有歌声的海路。",
    "Broken chains beside the basin recall ships that struggled there. Homeward markers have sunk to the floor, and the maw gathers its skirt fins over a sea road without song.",
  ],
  [
    "karkinos",
    "礁棚的铜红甲壳并非沉船。卡尔基诺斯记住了每一条被巨浪打断的航线，步足在砂地留下八道交错的印记。长年失落的锚链成了它钳缘的刻痕；它举起双钳时，归航者会看见礁道仍有可以穿过的空隙。",
    "The bronze-red shell on the shelf is no wreck. Karkinos remembers every sea road broken by storm waves, leaving eight interwoven tracks in the sand. Lost anchor chains have scored its claw edges; when it raises both pincers, voyagers can still find gaps through the reef road.",
  ],
  [
    "golden_argonaut",
    "渔歌把它的金帆比作迷路者最后的星光。真正遇见它时，珍兽却从不等待旅人：一个轻巧转折，薄壳与金腕便融进下一片蓝色礁影。",
    "Fishing songs liken its golden sail to a lost traveler's final star. Yet it never waits: with one agile turn, its thin shell and gold arms vanish into the next blue reef shadow.",
  ],
);
