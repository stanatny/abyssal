import * as THREE from "three";

/** 固定灯池保留灯位身份，等距抖动采用迟滞；换灯先熄灭再换位，避免墙面瞬闪。 */
export function createAtlantisLightPool(root, sources) {
  const slots = Array.from({ length: 5 }, () => {
    const light = new THREE.PointLight(0xffffff, 0, 100, 2);
    root.add(light);
    return { light, source: null, gain: 0 };
  });
  const previousPosition = new THREE.Vector3();
  let initialized = false;
  return {
    update(time, dt, position, highQuality) {
      const reset =
        !initialized ||
        (position && previousPosition.distanceToSquared(position) > 80 ** 2);
      const count = highQuality ? 5 : 3;
      const fixed = sources.filter((s) => s.fixed);
      const held = new Set(slots.slice(0, count).map((s) => s.source));
      const nearby = sources
        .filter((s) => !s.fixed)
        .sort((a, b) => {
          if (!position) return 0;
          return (
            a.position.distanceTo(position) -
            (held.has(a) ? 10 : 0) -
            (b.position.distanceTo(position) - (held.has(b) ? 10 : 0))
          );
        });
      const desired = [...fixed, ...nearby].slice(0, count);
      const remaining = desired.filter(
        (s) => !slots.slice(0, count).some((slot) => slot.source === s),
      );
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i],
          light = slot.light;
        if (i >= count) {
          light.visible = false;
          slot.source = null;
          slot.gain = 0;
          continue;
        }
        let target = desired.includes(slot.source)
          ? slot.source
          : remaining.shift();
        if (reset || !slot.source) {
          slot.source = target;
          slot.gain = reset ? 1 : 0;
        } else if (slot.source !== target) {
          slot.gain = Math.max(0, slot.gain - Math.max(0, dt) / 0.24);
          if (slot.gain === 0) slot.source = target;
        } else slot.gain = Math.min(1, slot.gain + Math.max(0, dt) / 0.36);
        const source = slot.source;
        light.visible = !!source;
        if (!source) continue;
        light.position.copy(source.position);
        light.color.set(source.color);
        light.distance = source.distance;
        light.intensity =
          source.intensity *
          slot.gain *
          (0.96 + Math.sin(time * 0.8 + sources.indexOf(source)) * 0.04);
      }
      if (position) previousPosition.copy(position);
      initialized = true;
    },
  };
}
