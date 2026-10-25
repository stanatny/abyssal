import * as THREE from "three";
import { createElectricArcs } from "./electric_arcs.js";

/** 只消费真实技能阶段；图鉴/闲游不自行放电，取消蓄电不会播放命中余光。 */
export function createEelChargeEffect(root) {
  const arcs = createElectricArcs(root, 48, "eel_charge");
  const warm = new THREE.Color(0xffdf8f),
    white = new THREE.Color(0xe8faff);
  let released = false,
    previousPhase = "idle",
    previousFrame = -1;
  function setPhase(phase, timer = 0, duration = 1, reducedMotion = false) {
    if (phase !== previousPhase) {
      if (phase === "active") released = true;
      else if (phase !== "recover") released = false;
      previousPhase = phase;
      previousFrame = -1;
    }
    const fading = phase === "recover" && released && timer < 0.35;
    arcs.group.visible = phase === "windup" || phase === "active" || fading;
    if (!arcs.group.visible) return;
    const progress =
      phase === "windup"
        ? THREE.MathUtils.clamp(timer / Math.max(0.01, duration), 0, 1)
        : 1;
    const fade = fading ? 1 - timer / 0.35 : 1;
    arcs.core.material.color.lerpColors(warm, white, progress);
    arcs.core.material.opacity = (0.25 + progress * 0.7) * fade;
    arcs.halo.material.opacity = (0.12 + progress * 0.18) * fade;
    const frame = reducedMotion ? 0 : Math.floor(timer * 12);
    if (frame === previousFrame) return;
    previousFrame = frame;
    arcs.begin();
    for (let path = 0; path < 4; path++) {
      let px, py, pz;
      for (let j = 0; j <= 12; j++) {
        const t = j / 12,
          z = -0.36 + t * 0.78,
          angle =
            (path * Math.PI * 2) / 4 +
            t * 1.3 +
            Math.sin(j * 7.3 + frame * 2.1 + path) * 0.42,
          jitter = Math.sin(j * 3 + frame) * 0.006,
          x = Math.cos(angle) * (0.068 * (1 - t * 0.72) + 0.006 + jitter),
          y =
            0.012 + Math.sin(angle) * (0.065 * (1 - t * 0.6) + 0.008 + jitter);
        if (j) arcs.segment(px, py, pz, x, y, z, 0.0025 + progress * 0.0017);
        px = x;
        py = y;
        pz = z;
      }
    }
    arcs.finish();
  }
  return { ...arcs, setPhase };
}
