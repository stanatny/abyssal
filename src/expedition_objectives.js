import { penglaiText as pt } from "./penglai_species.js";
/** 各海域的终局状态与目标；不把普通食物或领主战利品当成特殊宝物。 */
import { message } from "./i18n.js";
import { ATLANTIS_KEY_SITES } from "./atlantis_key_sites.js";
export { ATLANTIS_KEY_SITES };

export const ATLANTIS_RELIC = Object.freeze({
  x: 0,
  y: -699,
  z: -922,
  radius: 5,
});

export const REGION_OBJECTIVES = Object.freeze({
  odyssey: Object.freeze({
    kind: "four_winds",
    minimumLength: 30,
    summary:
      "成长至30米，先击败各门守卫，再解开四座风路机关，沿归航洋流穿过风神像基座的归航拱门。",
    completed: "四风已平息，风神像完整出水，归航者穿过基座的归航拱门。",
    difficulty: "神话海路征服",
    food: "浅湾贝园 → 海妖与海兽 → 四守卫外围补给",
  }),
  penglai: Object.freeze({
    kind: "all_lords",
    minimumLength: 25,
    summary: pt(
      "击败青龙、白虎、朱雀与玄武，解除护阵后击败御剑真君。",
      "Defeat Azure Dragon, White Tiger, Vermilion Bird and Black Tortoise, then break the ward and defeat the Sword Sage.",
    ),
    completed: pt(
      "四象护阵已解，御剑真君已败，蓬莱远征完成。",
      "The Four-Symbol ward is broken and the Sword Sage defeated. Penglai is complete.",
    ),
    difficulty: pt("云海神话征服", "Mythic cloud conquest"),
    food: pt(
      "莲池游灵 → 山间神兽 → 云海巨兽",
      "Lotus spirits → Mountain creatures → Cloud giants",
    ),
  }),
  amazon: Object.freeze({
    kind: "all_lords",
    minimumLength: 30,
    summary: "成长至30米，击败全部三位河道主宰。",
    completed: "三位河道领主已被征服，亚马逊远征完成。",
    difficulty: "河道探索与三主宰",
    food: "育幼湾鱼群 → 沉根猎手 → 深潭巨兽",
  }),
  europa: Object.freeze({
    kind: "all_lords",
    minimumLength: 30,
    summary: "成长至30米，击败全部三位冰下深渊领主。",
    completed: "冰下远征完成，三位外星领主均已被征服。",
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
      "寻找海螺钥匙，解除本局遗迹机关，击败真正守宝者；成长至30米，开启地宫宝箱。",
    completed: "圣珠已吞食，亚特兰蒂斯的秘密已解开。",
    difficulty: "遗迹寻宝",
    food: "月下鱼群 → 城区猎手 → 地宫巨兽",
  }),
  bermuda: Object.freeze({
    kind: "lords_and_titan_relic",
    minimumLength: 25,
    summary:
      "击败四位深渊领主，解开沉眠巢穴封印，夺取晶核，并在惊动巨兽后60秒内逃出洞穴。",
    completed: "四位领主已征服，晶核已安全带出，沉眠巢穴已封闭。",
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

  const draw = () => {
    const value = random();
    return Number.isFinite(value) ? Math.max(0, Math.min(0.999999, value)) : 0;
  };
  const guardianDraw = region.id === "atlantis" ? draw() : 0;
  const keyDraw = region.id === "atlantis" ? draw() : 0;
  const mechanismKind =
    region.id === "atlantis"
      ? ["water", "light", "mural"][Math.floor(draw() * 3)]
      : "water";
  const keyPool = ATLANTIS_KEY_SITES.filter(
    (site) =>
      !(
        mechanismKind === "mural"
          ? ["harbor_sanctuary", "harbor_sunken_halls", "poseidon_temple_vault"]
          : ["agora_bridges", "agora_sunken_archive"]
      ).includes(site.buildingId),
  );
  const mechanismRoute = region.id === "atlantis" ? Math.floor(draw() * 3) : 0;
  return {
    mechanismKind,
    mechanismRoute,
    mechanismSeed:
      region.id === "atlantis" ? Math.floor(draw() * 4294967295) : 1,
    mechanismSolved: false,
    regionId: region.id,
    localIds: ids.length ? new Set(ids) : null,
    defeated: new Set(),
    guardianId:
      region.id === "atlantis"
        ? ids[Math.min(ids.length - 1, Math.floor(guardianDraw * ids.length))]
        : null,
    keySiteId:
      region.id === "atlantis"
        ? keyPool[
            Math.min(keyPool.length - 1, Math.floor(keyDraw * keyPool.length))
          ].id
        : null,
    keyCollected: false,
    clueRead: false,
    guardianDefeated: false,
    relicUnlocked: false,
    relicCollected: false,
    titanRelicCollected: false,
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
    mechanismSolved = false,
    titanRelicCollected = false,
    windTrial = null,
  } = {},
) {
  for (const b of bosses)
    if (
      b.enabled &&
      b.state.defeated &&
      (!objective.localIds || objective.localIds.has(b.id))
    )
      objective.defeated.add(b.id);
  const hadTitanRelic = objective.titanRelicCollected;
  const wasUnlocked = objective.relicUnlocked;
  const wasCollected = objective.relicCollected;
  const hadKey = objective.keyCollected;
  const hadClue = objective.clueRead;
  const hadMechanism = objective.mechanismSolved;
  const hadGuardian = objective.guardianDefeated;
  const rule = REGION_OBJECTIVES[objective.regionId];
  const alive = !player.dead && !player.timedOut;
  if (objective.regionId === "atlantis" && alive) {
    if (mechanismSolved) objective.mechanismSolved = true;
    if (keyContact) objective.keyCollected = true;
    if (clueContact) objective.clueRead = true;
  }
  objective.guardianDefeated =
    objective.regionId === "atlantis" &&
    objective.defeated.has(objective.guardianId);
  objective.relicUnlocked =
    objective.guardianDefeated &&
    objective.keyCollected &&
    objective.mechanismSolved;
  if (
    alive &&
    objective.relicUnlocked &&
    player.length >= rule.minimumLength &&
    relicContact
  )
    objective.relicCollected = true;
  if (objective.regionId === "bermuda" && alive && titanRelicCollected)
    objective.titanRelicCollected = true;
  if (objective.regionId === "odyssey" && alive) {
    objective.windGates = windTrial?.stabilized ?? 0;
    objective.homewardAvailable = windTrial?.homewardAvailable === true;
    objective.homewardArrived = windTrial?.arrived === true;
    objective.homewardReady = windTrial?.homewardReady === true;
  }
  const finished =
    rule.kind === "four_winds"
      ? objective.defeated.size >= objective.required &&
        objective.windGates === 4 &&
        objective.homewardAvailable &&
        objective.homewardArrived
      : rule.kind === "lords_and_titan_relic"
        ? objective.defeated.size >= objective.required &&
          objective.titanRelicCollected
        : rule.kind === "hidden_relic"
          ? objective.relicCollected
          : rule.kind === "all_lords"
            ? objective.defeated.size >= objective.required
            : rule.kind === "trench_descent"
              ? trenchArrived && objective.defeated.size >= objective.required
              : objective.defeated.size >= 1;
  player.expeditionComplete = finished;
  player.won = alive && player.length >= rule.minimumLength && finished;
  return {
    titanRelicFound: objective.titanRelicCollected && !hadTitanRelic,
    mechanismCompleted: objective.mechanismSolved && !hadMechanism,
    guardianFound: objective.guardianDefeated && !hadGuardian && alive,
    keyFound: objective.keyCollected && !hadKey,
    clueFound: objective.clueRead && !hadClue,
    unlocked: objective.relicUnlocked && !wasUnlocked,
    collected: objective.relicCollected && !wasCollected,
    won: player.won,
  };
}

/** 大体型终局提示按地图独立显示，前期成长提示仍由共享HUD处理。 */
export function expeditionObjectiveHint(objective, player) {
  if (objective.regionId === "penglai")
    return objective.defeated.size < 4
      ? message`四象守卫 ${objective.defeated.size}/4 · 25米后挑战`
      : "四象护阵已解 · 御剑真君开始全域追击";
  if (objective.regionId === "atlantis")
    return !objective.keyCollected
      ? objective.clueRead
        ? message`钥匙：${ATLANTIS_KEY_SITES.find((s) => s.id === objective.keySiteId).name} · 机关：${objective.mechanismKind === "mural" ? "月湾圣所壁画与五道符印" : objective.mechanismKind === "light" ? "城区外围镜塔" : "市集柱廊北段下层"}`
        : "寻找海螺铭文与钥匙 · 探索城区公共建筑"
      : !objective.mechanismSolved
        ? objective.mechanismKind === "mural"
          ? "海螺钥匙已得 · 记住月湾圣所壁画，依次通过五道符印"
          : objective.mechanismKind === "light"
            ? "海螺钥匙已得 · 沿城区外围镜塔，将光引向波塞冬神像"
            : "海螺钥匙已得 · 前往市集柱廊北段下层，引水开闸"
        : player.length < 25 && !objective.guardianDefeated
          ? "海螺钥匙已得 · 成长至25米后寻找守宝者"
          : objective.relicUnlocked
            ? player.length < 30
              ? "圣珠已苏醒 · 成长至30米，再前往波塞冬地宫"
              : "圣珠已苏醒 · 进入波塞冬地宫吞食宝物"
            : message`海螺钥匙已得 · 寻找守宝克拉肯 ${objective.defeated.size}/3`;
  if (objective.regionId === "odyssey")
    return objective.homewardAvailable
      ? objective.homewardReady
        ? "四风已定 · 进入风神像基座的归航拱门"
        : "归航水路已现 · 前往风神像，等待基座拱门开启"
      : message`风门 ${objective.windGates ?? 0}/4 · 守卫 ${objective.defeated.size}/${objective.required} · 成长至30米`;
  if (objective.regionId === "europa")
    return message`冰下深渊领主 ${objective.defeated.size}/${objective.required} · 成长至30米`;
  if (objective.regionId === "amazon")
    return message`河道主宰 ${objective.defeated.size}/${objective.required} · 成长至30米`;
  if (objective.regionId === "bermuda")
    return objective.titanRelicCollected
      ? message`领主 ${objective.defeated.size}/4 · 晶核已安全带出`
      : message`领主 ${objective.defeated.size}/4 · 深海沉眠巢穴寻宝`;
  return objective.defeated.size
    ? "深渊印记已得 · 成长至 30 米"
    : "25 米后挑战主宰 · 接触咬击";
}
