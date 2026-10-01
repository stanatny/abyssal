/** 表层鸟类与实际生成、营养和图鉴共享同一资料；游戏体长不冒充翼展。 */
export const SURFACE_BIRDS = Object.freeze([
  Object.freeze({
    kind: "seagull",
    name: "海鸥",
    latin: "SURFACE GULL",
    length: 1.6,
    speed: 7.2,
    nutrition: 28,
    growth: 0.28,
    color: "#dbe2df",
    ability: "沿海盘旋",
    text: "白腹灰背、分节羽翼与指状飞羽构成轮廓。沿着船队和岸边持续前飞，滑翔之间夹有拍翼；本作使用艺术放大尺度。",
    size: "1.6 m（游戏尺度）",
    regions: ["hawaii", "atlantis", "bermuda", "mariana"],
  }),
  Object.freeze({
    kind: "pelican",
    name: "褐鹈鹕",
    latin: "PELECANUS OCCIDENTALIS",
    length: 1.4,
    speed: 5.8,
    nutrition: 32,
    growth: 0.28,
    color: "#b7a58c",
    ability: "贴海滑翔",
    text: "长喙与喉囊、弯曲颈部、宽大深色翅膀和指状翼端区别于海鸥。低空前飞，周期性拍翼；本作夜海与风暴活动是玩法适配。",
    size: "1.4 m（体长，翼展另计）",
    regions: ["atlantis", "bermuda"],
  }),
  Object.freeze({
    kind: "tropicbird",
    name: "白尾热带鸟",
    latin: "PHAETHON LEPTURUS",
    length: 1.1,
    speed: 7.2,
    nutrition: 18,
    growth: 0.2,
    color: "#eee7cc",
    ability: "长尾巡航",
    text: "白色流线躯干、黑色翼斑与两根修长中央尾羽形成独特剪影，橙黄色喙指向前方。参考夏威夷热带海鸟，海沟科考区活动为艺术适配。",
    size: "1.1 m（含尾羽）",
    regions: ["hawaii", "mariana"],
  }),
]);
export function regionalBirds(id) {
  return SURFACE_BIRDS.filter((s) => s.regions.includes(id));
}

/** 连续椭圆巡航与真实切向航向；半径、前速与模型动作分离，避免侧飞悬停。 */
export function sampleBirdFlight(bird, time, world, result) {
  const radius = bird.ship ? 27 : 22 + (bird.phase % 7),
    ratio = 0.72;
  const speed = bird.species.speed,
    omega = speed / radius;
  const angle = time * omega + bird.phase,
    cy = bird.anchor.y;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const cx = clamp(
      bird.anchor.x,
      world.minX + radius + 4,
      world.maxX - radius - 4,
    ),
    cz = clamp(bird.anchor.z, world.minZ + radius + 4, world.maxZ - radius - 4);
  result.point.set(
    cx + Math.sin(angle) * radius,
    cy + Math.sin(time * 0.65 + bird.phase) * 0.8,
    cz + Math.cos(angle) * radius * ratio,
  );
  result.velocity.set(
    Math.cos(angle) * radius * omega,
    Math.cos(time * 0.65 + bird.phase) * 0.52,
    -Math.sin(angle) * radius * ratio * omega,
  );
  result.yaw = Math.atan2(-result.velocity.x, -result.velocity.z);
  result.pitch = Math.atan2(
    result.velocity.y,
    Math.hypot(result.velocity.x, result.velocity.z),
  );
  result.bank = 0.15 + Math.sin(time * 0.4 + bird.phase) * 0.035;
  return result;
}
