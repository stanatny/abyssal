import { NONFISH_SPECIES } from "../nonfish_ecology.js";
import { SURFACE_BIRDS } from "../surface_birds.js";

export const LIVING_OCEAN_EN = {
  海螺钥匙与神庙宝箱: "Conch Key & Temple Chest",
  遗迹解谜: "Ruin puzzle",
  任务宝物: "Quest treasure",
  古城公共建筑与波塞冬地宫: "Public galleries and Poseidon’s vault",
  "寻钥匙 · 解封 · 寻宝": "Find the key · break the seal · claim the treasure",
  "每局有一把海螺钥匙藏在月湾圣所、市集柱廊或纪念圣厅的下层。接近海螺铭文可获得建筑线索，雷达随后提供方向。钥匙与真正守宝克拉肯的印记可以按任意顺序获得；两者齐全才开启神庙地宫的宝箱。成长至30米后吞食圣珠即可胜利。":
    "Each round hides one conch key in the lower gallery of Moonbay Sanctuary, Agora Colonnade or Memorial Hall. Approach a conch inscription for a location clue and radar guidance. Collect the key and the true guardian Kraken’s mark in either order; together they open the chest beneath Poseidon’s temple. Reach 30 m and consume the pearl to win.",
  "钥匙不提供营养，也不会替代守宝者的印记。普通房屋的宝箱是陈设。三处公共建筑均有成年角色可游过的廊道；回到主界面开启新局后，钥匙和守宝者重新抽取。":
    "The key gives no nutrition and cannot replace the guardian’s mark. Ordinary house chests are scenery. All three public galleries have adult-size routes. Returning home and starting a new round draws a new key site and guardian.",
  "寻找海螺钥匙，击败真正守宝者；成长至30米，打开地宫宝箱并吞食圣珠。":
    "Find the conch key and defeat the secret guardian; reach 30 m, open the vault chest and consume its sacred pearl.",
  "寻找海螺铭文与钥匙 · 探索城区公共建筑":
    "Find conch inscriptions and a key · explore public galleries",
  "铭文线索 · 钥匙藏在{0}": "Inscription clue · the key is in {0}",
  "海螺钥匙已得 · 成长至25米后寻找守宝者":
    "Conch key found · grow to 25 m to challenge the guardian",
  "海螺钥匙已得 · 寻找守宝克拉肯 {0}/3":
    "Conch key found · find the guardian Kraken {0}/3",
  "海螺钥匙已找到 · 保留至神庙地宫开启宝箱":
    "Conch key found · kept for the chest in Poseidon’s vault",
  "钥匙与守宝印记齐全 · 波塞冬宝箱已开启":
    "Key and guardian’s mark secured · Poseidon’s chest opens",
  月湾圣所: "Moonbay Sanctuary",
  市集柱廊: "Agora Colonnade",
  纪念圣厅: "Memorial Hall",
  "钥匙建筑 · 同层": "Key gallery · same depth",
  "钥匙建筑 ↓ {0}m": "Key gallery ↓ {0}m",
  "钥匙建筑 ↑ {0}m": "Key gallery ↑ {0}m",
  潜艇鱼雷反击: "Submarine retaliation",
  "鱼雷正在锁定 · 准备横向闪避": "Torpedo lock-on · prepare to sidestep",
  "直航鱼雷来袭 · 转向或借实体掩护":
    "Incoming torpedo · turn or find solid cover",
  "潜艇正在锁定 · 鱼雷即将发射，准备横向闪避":
    "Submarine lock-on · torpedo imminent, prepare to sidestep",
  "鱼雷已发射 · 直线航行，横向避开白色尾迹":
    "Torpedo fired · sidestep its straight white trail",
  "潜艇鱼雷命中 · 生命 -20": "Torpedo hit · health −20",
  潜艇直航鱼雷: "Submarine Torpedo",
  潜艇反击: "Submarine retaliation",
  潜艇附近水域: "Waters near submarines",
  预警后直航: "Telegraphed straight shot",
  "潜艇会对靠近的8米以上角色锁定2.2秒，再发射直航鱼雷。命中损失20生命；同艇至少间隔14秒再次发射。鱼雷最多航行5秒，不能被吞食。":
    "Submarines lock onto nearby characters of at least 8 m for 2.2 seconds before firing straight-running torpedoes. A hit costs 20 health. Each submarine waits at least 14 seconds before firing again; shots expire after 5 seconds and cannot be eaten.",
  "观察闪烁的艇灯和预警；发射后横向闪避，或利用礁石与建筑阻挡。安全浅滩与幼体不会被锁定。":
    "Watch the blinking hull lamps and warning. Dodge sideways after launch or use reefs and buildings as cover. Nursery waters and juveniles are protected.",
  "每次撞击后需要离开艇壳再冲刺接近。潜艇会预警后发射直航鱼雷；横向闪避或借实体掩护。贴着潜艇游动不会连续造成伤害。":
    "Leave the hull between rams before sprinting back. Submarines fire telegraphed straight-running torpedoes; dodge sideways or use solid cover. Staying in contact does not repeatedly damage the hull.",
  海洋无脊椎: "Marine invertebrates",
  海月水母: "Moon Jelly",
  刺龙虾: "Spiny Lobster",
  伞体脉冲: "Bell pulsing",
  礁底步行: "Reef-floor walking",
  [NONFISH_SPECIES[0].realSize]:
    "0.4 m bell diameter in this game; oral arms are additional.",
  [NONFISH_SPECIES[0].description]:
    "A translucent shallow bell reveals four horseshoe-shaped gonads, fine marginal tentacles and four trailing oral arms. This slowly drifting cnidarian is not a fish.",
  [NONFISH_SPECIES[0].habitatNote]:
    "Based on Aurelia moon jellies; mixed regional habitats and feeding values are artistic and gameplay adaptations.",
  [NONFISH_SPECIES[0].counter]:
    "Look closely for the translucent bell. Small jellies supplement early meals; adults still need large prey.",
  [NONFISH_SPECIES[1].realSize]:
    "0.9 m including long antennae in this game; the body is considerably shorter.",
  [NONFISH_SPECIES[1].description]:
    "A spiny segmented carapace, fan tail, ten walking legs and two long antennae form its silhouette. Unlike clawed lobsters, it has no pair of giant pincers. It walks slowly along the reef floor.",
  [NONFISH_SPECIES[1].habitatNote]:
    "Anatomy follows the Caribbean spiny lobster. Shared populations on other maps are game adaptations, not a claim of real worldwide distribution.",
  [NONFISH_SPECIES[1].counter]:
    "Search the shallow reef floor and dive slightly to approach. Long appendages do not provide the nutrition of a large fish.",
  褐鹈鹕: "Brown Pelican",
  白尾热带鸟: "White-tailed Tropicbird",
  沿海盘旋: "Coastal circling",
  贴海滑翔: "Low coastal glide",
  长尾巡航: "Long-tail flight",
  [SURFACE_BIRDS[0].text]:
    "A pale belly, gray back, articulated wings and finger-like primary feathers form its outline. It flies continuously around coasts and vessels, alternating glides with wingbeats. Its size is artistically enlarged in this game.",
  [SURFACE_BIRDS[1].text]:
    "A long bill and throat pouch, curved neck, broad dark wings and fingered wingtips distinguish it from gulls. It glides low and periodically beats its wings. Night and storm activity here are game adaptations.",
  [SURFACE_BIRDS[2].text]:
    "A streamlined white body, black wing bars, orange-yellow bill and two long central tail streamers give it a distinct silhouette. Based on Hawaii's tropical seabirds; trench-survey habitats are artistically adapted.",
  "1.6 m（游戏尺度）": "1.6 m (game scale)",
  "1.4 m（体长，翼展另计）": "1.4 m (body length; wingspan separate)",
  "1.1 m（含尾羽）": "1.1 m (including tail streamers)",
  "捕食{0} · {1}": "Caught {0} · {1}",
  "亚特兰蒂斯有三只克拉肯，分别守卫西侧城区、中庭和后城；每只拥有独立领地与生命值。每局随机由其中一只守护波塞冬地宫的圣珠，身份不会预先公开。先在城区公共建筑寻找海螺钥匙。海螺铭文可提供建筑线索；钥匙与真正守宝者的印记齐全，波塞冬地宫宝箱才会开启。达到30米并吞食箱中圣珠才能胜利。所有领主本局不再复活。":
    "Three independent Krakens guard Atlantis's west district, central court and rear city. One secretly guards Poseidon’s treasure each round. Find the conch key in a public gallery; conch inscriptions offer a location clue. The key and true guardian’s mark open the vault chest. Reach 30 m and consume its pearl to win. Defeated lords never respawn during the round.",
  "亚特兰蒂斯另有鱼群栖息在古城街巷、上下柱廊、月湾古港地下厅、沉没市集内庭和波塞冬地宫。该深水分布为幻想生态；小鱼主要供较小角色补给，成年角色应寻找城区内的中大型猎物。普通住宅宝箱与陶器是探索陈设；公共建筑隐藏着海螺钥匙；需钥匙与真正守宝者的印记才能打开神庙地宫宝箱，箱中圣珠是本海域的胜利宝物。":
    "Additional Atlantis schools inhabit streets, colonnades, the harbor hall, sunken agora and Poseidon’s vault. This is fantasy ecology; small prey feed small characters, while adults need medium and large meals. Ordinary house chests and pottery are scenery. A public gallery hides the conch key. Both that key and the true guardian’s mark open the temple chest; its pearl completes the expedition.",
};
