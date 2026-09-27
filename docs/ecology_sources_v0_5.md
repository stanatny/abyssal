# v0.5 生态尺度与资料来源

核对日期：2026-09-27，已同步 v0.5.1 野生章鱼替换。使用博物馆、海洋研究机构、NOAA 与原始论文资料。下面的“本作体长”是模型与捕食比较的游戏参数，不能替代真实生物量或危险程度。角色从 6 米成长至 30 米、现代与远古生物同处夏威夷幻想海域、技能以及奖励均是游戏设计。

## 尺度与水层

- `src/ecosystem_config.js` 是普通生物的唯一配置表。`depthMin/depthMax` 使用世界坐标米，界面水深显示为其 4 倍；图鉴明确标注“本作水层”。
- 真实最大体长不等于常见体长。大王乌贼全长包含很长的触腕，蝠鲼通常报告翼展，绿海龟常报告背甲长；这几种测量方式不可直接用来比较体量。
- “海洋霸主”是本作现代猎手的游戏分类，内部按体长由小到大排列。深海鮟鱇依然是小型伏击者；抹香鲸是本表最大现代对手，其攻击玩家的行为属于玩法设定。
- 本期将全部种类合并到一个幻想海域，不声称沙丁鱼、北鳀、太平洋鲱等都自然分布于夏威夷。
- 远古生物化石存在不完整和尺度推算误差。它们在本作深处出现，是幻想“复苏水层”，不是有化石证据的古代栖息深度。

| 种类             | 本作体长 | 本作显示水层 | 真实资料与采用原则                                                         |
| ---------------- | -------: | -----------: | -------------------------------------------------------------------------- |
| 珊瑚鱼           |    0.8 m |     20–136 m | 多种礁鱼的艺术组合，不对应单一物种                                         |
| 鳀鱼             |   0.18 m |     20–100 m | 北鳀小型、细长、表层群游                                                   |
| 沙丁鱼           |   0.30 m |     20–120 m | 太平洋沙丁鱼可超过 12 英寸，常在近表层组成密群                             |
| 鲱鱼             |   0.26 m |     28–160 m | 太平洋鲱约 24–34 cm，海区间存在差异                                        |
| 鲭鱼             |   0.55 m |     32–180 m | 太平洋鲭可达约 25 英寸；背部波纹、尾柄离鳍、群游                           |
| 飞鱼             |   0.40 m |       8–40 m | 不同飞鱼种类大小不同；扩大的胸鳍用于离水滑翔                               |
| 绿海龟           |   1.20 m |     12–128 m | NOAA 成体约 3–4 英尺，常用背甲尺度；浅海觅食并需浮出呼吸                   |
| 翻车鱼           |   3.00 m |     20–300 m | Mola mola 大型个体约 3 m，侧扁、截尾、高背鳍与臀鳍                         |
| 蓝鳍金枪鱼       |   3.00 m |     48–400 m | 太平洋蓝鳍最大报告长度约 3 m                                               |
| 蝠鲼             |   4.00 m |     40–480 m | 该参数是本作纵向模型尺度；真实巨型蝠鲼常以最大约 8 m 翼展描述              |
| 深海鮟鱇         |   1.20 m |   500–2600 m | MBARI 给出深海鮟鱇类最大约 1.2 m、水深 300–4000 m；许多种远小于此          |
| 锤头鲨           |   4.00 m |     48–560 m | 参考路氏双髻鲨的大型个体；温暖近岸与外海，也可深潜                         |
| 大白鲨           |   6.40 m |     72–660 m | NOAA 成体最大约 21 英尺；常见成体更小                                      |
| 北太平洋巨型章鱼 |   5.00 m |    100–800 m | 展开腕幅参考约16英尺，非躯干体长；游戏纵向/碰撞尺度统一为5 m               |
| 抹香鲸           |  16.00 m |   280–2080 m | NOAA 大型雄性约 52 英尺，深潜捕食乌贼；雌性通常更小                        |
| 邓氏鱼           |   6.00 m |   660–1360 m | 体型重建存在明显争议，博物馆综述给出历史估计约 3–10 m；不再沿用本作旧 21 m |
| 上龙             |  11.00 m |   920–1840 m | 大型 Pliosaurus 估计约 10–12 m；短颈大头四鳍肢                             |
| 蛇颈龙           |  12.00 m |   720–1560 m | 使用大型薄板龙类代表，不把 12 m 错写成只有约 3.5 m 的 Plesiosaurus 属      |
| 沧龙             |  13.00 m |  1040–2080 m | Mosasaurus hoffmannii 估计约 11–18 m，研究间仍有争议                       |
| 龙王鲸           |  18.00 m |  1200–2320 m | Basilosaurus 估计约 15–18 m；极长身体、小后肢，属于鲸类                    |
| 巨齿鲨           |  20.00 m |  1320–2560 m | 体型依赖化石推算；近年最大估计上探约 24 m，本作使用 20 m                   |

## 可核对来源

### 小型鱼群

- [NOAA：Pacific Sardine](https://www.fisheries.noaa.gov/species/pacific-sardine)：体长、蓝绿背部/体侧黑点、近表层密群。
- [NOAA：Northern Anchovy](https://www.fisheries.noaa.gov/species/northern-anchovy)：小型近岸群游鱼的尺度与习性。
- [NOAA：Pacific Herring](https://www.fisheries.noaa.gov/species/pacific-herring)：近岸群游、海区间长度差异及银白反荫体色。
- [NOAA：Pacific Mackerel](https://www.fisheries.noaa.gov/species/pacific-mackerel)：最大约 25 英寸、波纹背部、离鳍与群游习性。
- [Australian Museum：Flyingfish, Cheilopogon sp.](https://australian.museum/learn/animals/fishes/a-flyingfish-cheilopogon-sp/)：飞鱼大小与延长胸鳍的辨识依据。游戏中的受惊触发、滑翔持续时间与重新入水路径为设计参数。

### 现代大型生物

- [NOAA：Green Turtle](https://www.fisheries.noaa.gov/species/green-turtle)：成体尺度、甲盾、浅海觅食和水面呼吸。
- [Australian Museum：Ocean Sunfish](https://australian.museum/learn/animals/fishes/ocean-sunfish-mola-mola/) 与 [Museums Victoria / Fishes of Australia：Mola mola](https://fishesofaustralia.net.au/home/species/785)：圆盘外形、截尾和大型个体尺度。
- [NOAA：Pacific Bluefin Tuna](https://www.fisheries.noaa.gov/species/pacific-bluefin-tuna)：最大报告体长约 3 m。
- [NOAA：Giant Manta Ray](https://www.fisheries.noaa.gov/species/giant-manta-ray)：翼展量法、滤食及分布。
- [MBARI：Deep-sea Anglerfish](https://www.mbari.org/animal/deep-sea-anglerfish/)：300–4000 m 水深、最大 1.2 m、诱光伏击；不能用浅海躄鱼的习性解释本模型。
- [Florida Museum：Scalloped Hammerhead](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/scalloped-hammerhead/)：锤形头、大小、分布与捕食习性。最大值因样本与地区有差异，本作取 4 m 的大型代表，不当作平均值。
- [NOAA：White Shark](https://www.fisheries.noaa.gov/species/white-shark)：最大约 21 英尺、反荫体色及温带/亚热带分布。
- 大王乌贼现仅为可选角色，不再野外生成；6—30米成长是玩法设定，真实生物参考 [Smithsonian：The Giant Squid](https://naturalhistory.si.edu/explore/giant-squid)：记录个体约 13 m 全长及深海生活。
- [NOAA：Sperm Whale](https://www.fisheries.noaa.gov/species/sperm-whale)：雄性约 52 英尺、性别差异、深潜与乌贼食性。

### 远古生物

- [Cleveland Museum of Natural History：Meet Dunk](https://www.cmnh.org/learn/science-blog/2025/02/07/meet-dunk-ohios-ancient-apex-predator)：头甲、刃状颌骨、泥盆纪年代及尺寸争议。
- [MNHN：Plésiosaures et pliosaures](https://www.mnhn.fr/fr/plesiosaures-et-pliosaures)：大型薄板龙类可到约 12 m，上龙类短颈大头；不是恐龙。
- [PLOS ONE：A Giant Pliosaurid Skull](https://doi.org/10.1371/journal.pone.0065989)：成年大型上龙类约 10–12 m 的化石估计范围。
- [Natural History Museum：What is a mosasaur?](https://www.nhm.ac.uk/discover/what-is-a-mosasaur.html)：沧龙的蜥蜴亲缘、11–18 m 的不同长度估计。
- [University of Michigan Museum of Paleontology：Basilosaurus isis](https://lsa.umich.edu/paleontology/resources/beyond-exhibits/basilosaurus-isis.html)：15–18 m 的长身体古鲸及身体特征。
- [Natural History Museum：Megalodon](https://www.nhm.ac.uk/discover/megalodon--the-truth-about-the-largest-shark-that-ever-lived.html/) 与 [更新说明](https://www.nhm.ac.uk/discover/news/2022/march/megalodon-sharks-grew-biggest-colder-waters.html)：巨齿鲨已灭绝，最大尺度依赖不完整化石和重建方法，近年估计上调。

## 模型与玩法边界

14 种新增程序化模型分别有结构差异：沙丁鱼黑点、鳀鱼银带/长颌、鲱鱼腹棱、鲭鱼背纹/离鳍、飞鱼宽胸鳍、海龟盾甲/四鳍肢、翻车鱼高立鳍/截尾、锤头鲨横向头部、抹香鲸方头/细颌/横尾、沧龙长吻/四桨鳍/尾鳍、长颈蛇颈龙、粗头短颈上龙、巨齿鲨宽体巨颌、龙王鲸修长分节躯干/微小后肢。

这些是服务于游戏辨识的艺术模型，不是经过古生物学形态测量校准的科学复原。模型全长归一、朝向 -Z；材质/几何按物种复用，实例只保留动作层级。飞鱼 `userData.setGliding(true/false)` 切换展翼状态。鱼群密度、运动速度、营养和生存危险度另行平衡。

## v0.5.1 新增章鱼来源

[Alaska Department of Fish and Game：Giant Pacific Octopus](https://www.adfg.alaska.gov/index.cfm?adfg=giantpacificoctopus.main) 说明其球状外套膜、八腕、约16英尺腕幅、遇威胁喷出防御墨汁、独居岩缝及北太平洋温带分布。本作颜色、八腕及墨幕以此为参照；5米模型纵向尺度、显示100—800米水层、追逐速度和冷却属于游戏适配，不等同真实躯干长度或只在该深度出现。
