/** 取宝震颤只随活跃游戏时间推进，不改变角色控制。 */
export function createTitanPickupTremor() {
  let age = Infinity;
  let started = false;
  return {
    trigger() {
      if (started) return false;
      started = true;
      age = 0;
      return true;
    },
    reset() {
      age = Infinity;
      started = false;
    },
    step(dt, { reducedMotion = false } = {}) {
      age += Math.max(0, Number.isFinite(dt) ? dt : 0);
      if (reducedMotion || age >= 7) return { x: 0, y: 0, z: 0 };
      const onset = Math.min(1, age / 0.12);
      const first = Math.exp(-age / 1.6);
      const aftershock = 0.19 * Math.exp(-(((age - 3.8) / 0.55) ** 2));
      const strength = onset * (first + aftershock);
      return {
        x: 0.42 * strength * Math.sin(age * 31),
        y: 0.3 * strength * Math.sin(age * 39 + 0.6),
        z: 0.14 * strength * Math.sin(age * 25 + 1.3),
      };
    },
  };
}
