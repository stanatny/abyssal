/** 各海域的终局状态与目标；不把普通食物或领主战利品当成特殊宝物。 */
import { message } from "./i18n.js";

export const ATLANTIS_RELIC = Object.freeze({
  x: 0,
  y: -699,
  z: -922,
  radius: 5,
});

export const ATLANTIS_KEY_SITES = Object.freeze([
  Object.freeze({ id: "harbor_sanctuary", name: "月湾圣所" }),
  Object.freeze({ id: "agora_bridges", name: "市集柱廊" }),
  Object.freeze({ id: "memorial_terrace", name: "纪念圣厅" }),
]);

export const REGION_OBJECTIVES = Object.freeze({
  europa: Object.freeze({
    kind: "growth_and_lord",
    minimumLength: 30,
    summary: "成长至30米，击败任一冰下深渊领主。",
    completed: "冰下远征完成，已征服一位外星领主。",
    difficulty: "幻想奖励远征",
    food: "冰下鱼群 → 悬生巨游 → 冰下深渊领主",
  }),
  hawaii: Object.freeze({
    kind: "growth_and_lord",
    minimumLength: 30,
    summary: "成长至30米，击败任意一位深渊领主。",
    completed: "已成长至30米，并获得深渊印记。",
    difficulty: "入门探索",
    food: "浅滩鱼群 → 外礁猎手 → 火山巨兽",
  }),
  atlantis: Object.freeze({
    kind: "hidden_relic",
    minimumLength: 30,
    summary:
      "寻找海螺钥匙，击败真正守宝者；成长至30米，打开地宫宝箱并吞食圣珠。",
    completed: "圣珠已吞食，亚特兰蒂斯的秘密已解开。",
    difficulty: "遗迹寻宝",
    food: "月下鱼群 → 城区猎手 → 地宫巨兽",
  }),
  bermuda: Object.freeze({
    kind: "all_lords",
    minimumLength: 25,
    summary: "击败本海域全部四位深渊领主。",
    completed: "四位深渊领主全部被征服。",
    difficulty: "高危征服",
    food: "安全鱼群 → 沉船猎手 → 风暴巨兽",
  }),
  mariana: Object.freeze({
    kind: "trench_descent",
    minimumLength: 30,
    summary: "15米起步，成长至30米，突破四道守关并抵达海沟底部。",
    completed: "四道封印已突破，抵达海沟最深处。",
    difficulty: "层级远征",
    food: "上层大鱼 → 守关水层 → 超深渊补给",
  }),
});

/** 新局抽取一个不公开的守宝者；地图首页预览不能算作新局或公开答案。 */
export function createExpeditionObjective(region, random = Math.random) {
  const ids = region.bossInstances?.map((b) => b.id) || [];
  return {
    regionId: region.id,
    localIds: ids.length ? new Set(ids) : null,
    defeated: new Set(),
    guardianId:
      region.id === "atlantis"
        ? ids[
            Math.min(
              ids.length - 1,
              Math.floor(Math.max(0, random()) * ids.length),
            )
          ]
        : null,
    keySiteId:
      region.id === "atlantis"
        ? ATLANTIS_KEY_SITES[Math.min(2, Math.floor(Math.max(0, random()) * 3))]
            .id
        : null,
    keyCollected: false,
    clueRead: false,
    guardianDefeated: false,
    relicUnlocked: false,
    relicCollected: false,
    required: ids.length || 1,
  };
}

/**
 * 记录当前局的真实领主状态并结算终局，只有有效圣珠接触才可完成寻宝。
 * @param {object} objective 当前局目标状态。
 * @param {object} player 玩家状态；死亡或超时不能获胜。
 * @param {object[]} bosses 实际领主实例，包含enabled/id/state。
 * @param {object} options 钥匙、铭文、圣珠接触资格与海沟底层到达状态。
 * @returns {object} 本帧钥匙、铭文、解封、圣珠收集与胜利状态变化。
 */
export function advanceExpeditionObjective(
  objective,
  player,
  bosses,
  {
    relicContact = false,
    keyContact = false,
    clueContact = false,
    trenchArrived = false,
  } = {},
) {
  for (const b of bosses)
    if (
      b.enabled &&
      b.state.defeated &&
      (!objective.localIds || objective.localIds.has(b.id))
    )
      objective.defeated.add(b.id);
  const wasUnlocked = objective.relicUnlocked;
  const wasCollected = objective.relicCollected;
  const hadKey = objective.keyCollected;
  const hadClue = objective.clueRead;
  const rule = REGION_OBJECTIVES[objective.regionId];
  const alive = !player.dead && !player.timedOut;
  if (objective.regionId === "atlantis" && alive) {
    if (keyContact) objective.keyCollected = true;
    if (clueContact) objective.clueRead = true;
  }
  objective.guardianDefeated =
    objective.regionId === "atlantis" &&
    objective.defeated.has(objective.guardianId);
  objective.relicUnlocked =
    objective.guardianDefeated && objective.keyCollected;
  if (
    alive &&
    objective.relicUnlocked &&
    player.length >= rule.minimumLength &&
    relicContact
  )
    objective.relicCollected = true;
  const finished =
    rule.kind === "hidden_relic"
      ? objective.relicCollected
      : rule.kind === "all_lords"
        ? objective.defeated.size >= objective.required
        : rule.kind === "trench_descent"
          ? trenchArrived && objective.defeated.size >= objective.required
          : objective.defeated.size >= 1;
  player.expeditionComplete = finished;
  player.won = alive && player.length >= rule.minimumLength && finished;
  return {
    keyFound: objective.keyCollected && !hadKey,
    clueFound: objective.clueRead && !hadClue,
    unlocked: objective.relicUnlocked && !wasUnlocked,
    collected: objective.relicCollected && !wasCollected,
    won: player.won,
  };
}

/** 大体型终局提示按地图独立显示，前期成长提示仍由共享HUD处理。 */
export function expeditionObjectiveHint(objective, player) {
  if (objective.regionId === "atlantis")
    return !objective.keyCollected
      ? objective.clueRead
        ? message`铭文线索 · 钥匙藏在${ATLANTIS_KEY_SITES.find((s) => s.id === objective.keySiteId).name}`
        : "寻找海螺铭文与钥匙 · 探索城区公共建筑"
      : player.length < 25 && !objective.guardianDefeated
        ? "海螺钥匙已得 · 成长至25米后寻找守宝者"
        : objective.relicUnlocked
          ? player.length < 30
            ? "圣珠已苏醒 · 成长至30米，再前往波塞冬地宫"
            : "圣珠已苏醒 · 进入波塞冬地宫吞食宝物"
          : message`海螺钥匙已得 · 寻找守宝克拉肯 ${objective.defeated.size}/3`;
  if (objective.regionId === "bermuda")
    return message`征服四位深渊领主 · ${objective.defeated.size}/4`;
  return objective.defeated.size
    ? "深渊印记已得 · 成长至 30 米"
    : "25 米后挑战主宰 · 接触咬击";
}
