import assert from "node:assert/strict";
import { tickBoss } from "../../src/boss_rules.js";

// 仅推进规则时钟至下一次技能完成；不伪造伤害窗口，也不模拟玩家生存。
export function finishNextBossAttack(boss) {
  const count = boss.attackCount;
  const context = { inTerritory: true, distance: 0, lineOfSight: true };
  // 个别历史资格夹具直接赋 phase，尚未进入状态机，因此没有有限阶段时长。
  if (!Number.isFinite(boss.phaseDuration) && boss.phase !== "dormant") {
    boss.phase = "hunt";
    boss.phaseDuration = boss.species.huntDuration ?? 1;
    boss.timer = 0;
  }
  tickBoss(boss, 0, context);
  for (let i = 0; i < 8; i++) {
    if (boss.phase === "recover" && boss.attackCount > count) return;
    tickBoss(boss, Math.max(0, boss.phaseDuration - boss.timer), context);
  }
  assert.fail("Boss did not complete its next warned attack");
}
