/** 尸鲨角色、图鉴、召唤状态和实际事件共用的英文文案。 */
export const ZOMBIE_SHARK_EN = Object.freeze({
  "尸爆被 {0} 挡下 · 等待新的反击窗口":
    "{0} blocked the corpse blast · Wait for a fresh opening",
  丧尸鲨鱼: "Zombie Shark",
  "献祭召唤 · 环游猎仆": "Blood sacrifice · Hunting companion",
  "尸鲨分裂 · 最长存活60秒，无冷却": "Undead Fission · Up to 60s, no cooldown",
  尸鲨分裂: "Undead Fission",
  亡者共食: "Shared Feast",
  "生命、体力、饱食各至少50点时，可消耗三项各50点召唤一只较小尸鲨，无体长门槛，最多同时一只，最长存活60秒，无额外冷却。仆从从本尊体内逐步长出，挣脱侧腹后开始捕食。召唤后前2秒防误触，期间点击不会排队触发尸爆。之后再次使用，会优先追击32米内符合挑战条件的领主，否则追击最近的普通目标并尸爆，无额外消耗；附近没有目标时保留仆从继续捕食。追击也不会延长寿命，60秒一到就在当前位置尸爆；爆炸后可重新召唤。恰好50生命时献祭会致死。":
    "Sacrifice 50 health, 50 stamina and 50 hunger to summon one smaller shark for 60s, with no length requirement. All three must be at least 50. Only one companion may live at a time, for up to 60s, with no extra cooldown. The companion gradually emerges from inside your body and begins hunting after breaking free of your flank. Detonation is protected for the first 2s after summoning; early presses are ignored, never queued. After that, use the skill again to pursue an eligible lord within 32 m first, or otherwise the nearest ordinary target, and detonate at no extra cost. If there is no nearby target, it stays alive and keeps hunting. Pursuit never extends its lifetime: at 60s it explodes at its current position. You may summon again after the explosion. Paying exactly 50 health is lethal.",
  "仆从环游身旁，普通猎物捕食上限为主角体长减5米，但至少可捕食3米（含）以内的猎物；珍兽只需比主角小。捕食收益归主角，另按有效营养恢复体力。60秒后尸体炸裂为血雾、碎肉和骨片，造成14米范围伤害，不追踪、不穿墙。小于本尊的鱼等同本尊捕食；同体型或更大的普通生物需两次爆炸命中，击杀不发吞食收益。尸爆可在25米后命中领主破绽，每轮仅一次；不攻击载具。":
    "Your companion hunts ordinary prey up to your length minus 5 m, with a minimum ceiling of 3 m (inclusive); regional rares only need to be smaller than you. Meals credit you and also restore stamina from effective nutrition. After 60s its corpse bursts into blood mist, torn flesh and bone fragments, dealing damage within 14 m without tracking or crossing cover. Fish smaller than you count as your own meals. Equal or larger ordinary creatures need two blast hits and grant no meal on a corpse-blast kill. At 25 m, the blast can hit a lord’s unused opening once per opening. Vehicles are unaffected.",
  "亡灵鲨鱼：头颌、侧腹、背脊和尾柄有不规则撕裂与裸露骨架，伤口内层肌肉也有深裂口与断裂纤维，深处保留暗红组织，破颌内有口腔组织；断鳍与伤口带有血迹，低压眉骨与尖牙呈现凶狠神态。":
    "An undead shark with torn skin and exposed bones across its skull, flanks, spine and tail. The recessed muscle has deep tears and broken fibers backed by dark-red tissue. Tissue lines its broken jaw; bloodstains, a lowered brow and jagged teeth complete its predatory appearance.",
  "先备好食物和退路再献祭。开局即可分裂，普通猎物捕食上限至少3米，珍兽仍需比本尊小。召唤2秒后才能下令尸爆，优先追击附近符合挑战条件的领主；尸爆吞食仍需比本尊小。爆炸在仆从最后位置发生，不穿墙；领主仍需25米和未用过的破绽，御剑真君只在收势可受伤。":
    "Secure food and an escape route before sacrificing. Fission is available from the start. The ordinary-prey ceiling is at least 3 m; rares must still be smaller than you. After 2s, command a detonation that prioritizes a nearby eligible lord. Corpse-blast meals still require smaller prey. The blast happens at its last position without crossing cover; lords still require 25 m and an unused opening. The Sword Sage is vulnerable only during recovery.",
  "召唤需要生命、体力、饱食各至少50点":
    "Summoning requires at least 50 health, stamina and hunger each",
  "血肉正在分裂 · 生命、体力、饱食各 -50":
    "Flesh splitting · -50 health, stamina and hunger",
  "仆从捕食 {0} · 收益归主角": "Companion ate {0} · Meal credited to you",
  "尸爆 · 吞噬{0}，击杀{1}，另命中{2}":
    "Corpse blast · {0} meals, {1} kills, {2} other hits",
  "尸爆命中 {0} · {1}/{2}": "Corpse blast hit {0} · {1}/{2}",
  "附近没有可追击目标 · 仆从继续捕食":
    "No nearby target · Companion keeps hunting",
  "仆从寿命已尽 · 就地尸爆": "Companion expired · Detonated in place",
  "寿命已尽 · 就地尸爆 · 吞噬{0}，击杀{1}，另命中{2}":
    "Expired in place · {0} meals, {1} kills, {2} other hits",
  尸爆: "Detonate",
  "追击尸爆 {0}s": "Detonating {0}s",
  "仆从追击尸爆 · 不再消耗属性":
    "Companion pursuing to detonate · No extra cost",
  "再次使用：优先追击附近可挑战领主尸爆，不再消耗属性":
    "Use again: prioritize a nearby eligible lord and detonate at no extra cost",
  无冷却: "No cooldown",
  "J · {0} · 无冷却": "J · {0} · No cooldown",
  分裂: "Fission",
  分裂中: "Splitting",
  "尸爆准备 {0}s": "Detonate ready in {0}s",
  "准备 {0}s": "Ready in {0}s",
  "分裂后短暂保护 · 稍后再次点击尸爆":
    "Fission protection · Press again shortly to detonate",
  仆从: "Companion",
  需三项各50: "Need 50 each",
  致命献祭: "Lethal sacrifice",
});
