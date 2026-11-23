import { OCEAN_CURRENT_RULES as R } from "./ocean_current_rules.js";
import { tr } from "./i18n.js";
export function oceanCurrentGuideEntry() {
  return {
    id: "surface_ocean_currents",
    kind: "surface_ocean_currents",
    name: "洋流航路",
    latin: "OCEAN CURRENT LANES",
    category: "hazard",
    role: "快速航路",
    symbol: "↝",
    color: "#86dddc",
    length: 0,
    size: "临时双向航路",
    regionIds: R.regions,
    habitat: "近水面航道；百慕大另有中层与深层支线",
    ability: "顺流加速 · 逆流受阻",
    text: tr`开局${R.firstAt}秒后开始形成，经过${R.forming}秒后开放${R.active}秒，再用${R.fading}秒消散；每${R.period}秒重现。航流分别通往外海或返航方向，雷达箭头标示流向。百慕大两侧的表层航路贯穿全图，并有中层与深层支线。`,
    counter:
      "水纹和微泡沿下游移动。顺流可快速穿行，逆流会被顶回；侧游或下潜离开航道后恢复普通游速。慢游只降低自身游速，不能抵消水流。洋流不额外消耗体力，不强制转向或下潜；碰撞、伤害与饥饿仍然有效。",
  };
}
