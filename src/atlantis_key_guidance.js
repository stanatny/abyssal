import { ATLANTIS_KEY_SITES } from "./atlantis_key_sites.js";
import { message } from "./i18n.js";

// 只描述可辨认的建筑与公开入口，不包含室内藏点、答案或新碰撞。
const buildings = {
  harbor_sanctuary: {
    sector: "浅滩西北 · 月湾古港",
    appearance: "寻找高台上的单顶柱廊，沿浅水侧进入上层大厅。",
    entry: "上层大厅入口",
  },
  agora_bridges: {
    sector: "城区东侧 · 市集",
    appearance: "寻找两翼相连、中间有天井的柱廊，从浅水侧进入下层。",
    entry: "下层柱廊入口",
  },
  harbor_sunken_halls: {
    sector: "浅滩西北 · 月湾古港",
    appearance: "寻找月湾圣所下方的古港天井，沿敞口阶梯下潜至地下厅。",
    entry: "地下厅阶梯入口",
  },
  agora_sunken_archive: {
    sector: "城区东侧 · 市集",
    appearance: "档案库在市集柱廊下方。绕到深水侧的门洞，沿水道进入地下。",
    entry: "地下档案库水道入口",
  },
  memorial_terrace: {
    sector: "神庙西北 · 深城",
    appearance: "寻找神庙左后方、带三个屋顶的高台建筑。",
    entry: "下层大厅入口",
  },
  poseidon_temple_vault: {
    sector: "深城中央 · 波塞冬神庙",
    appearance: "寻找巨大神像所在的神庙，从神像前方的中央开口下潜进入地宫。",
    entry: "神庙中央下潜入口",
  },
};

export function atlantisKeyGuide(siteId) {
  const site = ATLANTIS_KEY_SITES.find((s) => s.id === siteId);
  if (!site) return null;
  const guide = { ...buildings[site.buildingId], name: site.name };
  if (site.buildingId === "memorial_terrace") {
    guide.entry = site.level === "upper" ? "深水侧上层入口" : "浅水侧下层入口";
    guide.appearance =
      site.level === "upper"
        ? "寻找神庙左后方的三顶高台建筑，绕到深水侧进入上层大厅。"
        : "寻找神庙左后方的三顶高台建筑，从浅水侧进入下层大厅。";
  }
  return guide;
}

export function atlantisKeyClue(siteId) {
  const guide = atlantisKeyGuide(siteId);
  return (
    guide &&
    message`钥匙线索：${guide.name} · ${guide.sector}。${guide.appearance}海图上的金色钥匙标记指向入口，进入后自行寻找。`
  );
}

/** 入口确认需要同层、近距离和通视；不会把楼顶或隔墙当成已经到达。 */
export function nearAtlantisKeyEntrance(
  position,
  entry,
  blockedBetween = () => false,
) {
  return (
    !!entry &&
    Math.abs(position.y - entry.y) <= 8 &&
    Math.hypot(position.x - entry.x, position.z - entry.z) <= 24 &&
    !blockedBetween(position, entry)
  );
}

export function createAtlantisKeyArrival() {
  let round = null,
    announced = false;
  return {
    update(objective, entry, position, { active = true, blockedBetween } = {}) {
      if (round !== objective) {
        round = objective;
        announced = false;
      }
      if (
        !active ||
        objective?.regionId !== "atlantis" ||
        !objective.clueRead ||
        objective.keyCollected ||
        announced ||
        !nearAtlantisKeyEntrance(position, entry, blockedBetween)
      )
        return null;
      announced = true;
      const guide = atlantisKeyGuide(objective.keySiteId);
      return message`已到达${guide.name} · ${guide.entry}。${guide.appearance}钥匙藏在建筑内部。`;
    },
  };
}

/** 水平和垂直距离均采用现有海图的显示米制。 */
export function atlantisKeyNavigation(entry, position, depthScale = 4) {
  const dx = entry.x - position.x,
    dz = entry.z - position.z;
  const horizontalDistance = Math.hypot(dx, dz);
  const distance = Math.round(horizontalDistance * depthScale);
  const directions = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  const direction =
    directions[(Math.round(Math.atan2(dx, -dz) / (Math.PI / 4)) + 8) % 8];
  const delta = entry.y - position.y;
  return {
    horizontal:
      horizontalDistance <= 24
        ? "入口就在附近"
        : message`${direction} · 平距 ${distance}m`,
    vertical:
      Math.abs(delta) <= 8
        ? "入口 · 同层"
        : delta > 0
          ? message`入口 ↑ ${Math.round(delta * depthScale)}m`
          : message`入口 ↓ ${Math.round(-delta * depthScale)}m`,
  };
}
