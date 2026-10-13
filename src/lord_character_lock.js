import { Vector3 } from "three";

export const CHARACTER_LOCK_CUE = Object.freeze({
  shrinkDuration: 1.6,
  entryDuration: 2.6,
  pulsePeriod: 1.4,
  releaseDuration: 0.9,
});

/** 复用投影缓存，始终瞄准真实角色根节点的身体中心，而非屏幕中心或敌人。 */
export function createCharacterLockProjector() {
  const center = new Vector3(),
    edge = new Vector3();
  const result = { x: 0, y: 0, radius: 0, width: 0, height: 0 };
  return (position, length, camera, width, height) => {
    if (!(width > 0 && height > 0 && Number.isFinite(length) && length > 0))
      return null;
    center.copy(position).project(camera);
    if (
      ![center.x, center.y, center.z].every(Number.isFinite) ||
      Math.abs(center.x) > 1 ||
      Math.abs(center.y) > 1 ||
      Math.abs(center.z) > 1
    )
      return null;
    edge
      .setFromMatrixColumn(camera.matrixWorld, 0)
      .multiplyScalar(length * 0.18)
      .add(position)
      .project(camera);
    result.x = (center.x * 0.5 + 0.5) * width;
    result.y = (-center.y * 0.5 + 0.5) * height;
    result.radius = Math.abs(edge.x - center.x) * width * 0.5 + 10;
    result.width = width;
    result.height = height;
    return result;
  };
}

/** 收拢后持续柔和红色脉冲，真实脱锁才扩散消散；低动态模式不闪烁、不移动。 */
export function characterLockShape(
  age,
  focus,
  reducedMotion = false,
  mode = "locked",
  releaseFrom = null,
) {
  if (
    !focus ||
    !Number.isFinite(age) ||
    age < 0 ||
    !["locked", "released"].includes(mode) ||
    (mode === "released" && age >= CHARACTER_LOCK_CUE.releaseDuration)
  )
    return null;
  if (
    ![focus.x, focus.y, focus.radius, focus.width, focus.height].every(
      Number.isFinite,
    ) ||
    focus.width <= 0 ||
    focus.height <= 0
  )
    return null;
  const shortSide = Math.min(focus.width, focus.height);
  const end = Math.min(120, shortSide * 0.2, Math.max(24, focus.radius));
  const start = Math.min(shortSide * 0.42, end * 2.4);
  if (mode === "released") {
    const progress = age / CHARACTER_LOCK_CUE.releaseDuration;
    const radius = releaseFrom?.radius ?? end;
    return {
      x: focus.x,
      y: focus.y,
      radius: radius * (reducedMotion ? 1 : 1 + progress * 0.8),
      opacity: (releaseFrom?.opacity ?? 0.8) * (1 - progress) ** 2,
      phase: "released",
    };
  }
  const progress = Math.min(1, age / CHARACTER_LOCK_CUE.shrinkDuration);
  const eased = progress * progress * (3 - 2 * progress);
  const warning = age >= CHARACTER_LOCK_CUE.shrinkDuration;
  return {
    x: focus.x,
    y: focus.y,
    radius: reducedMotion ? end : start + (end - start) * eased,
    opacity: reducedMotion
      ? 0.75
      : warning
        ? 0.75 +
          0.2 *
            Math.cos(
              ((age - CHARACTER_LOCK_CUE.shrinkDuration) * Math.PI * 2) /
                CHARACTER_LOCK_CUE.pulsePeriod,
            )
        : 0.95,
    phase: warning ? "warning" : "acquiring",
  };
}

/** 单个 SVG 由已有主循环驱动；遮罩避开 HUD/按钮，位置绝不为避让而偏离角色。 */
export function createCharacterLockCue({
  layer,
  svg,
  shape,
  mask,
  cuts,
  avoid,
}) {
  const rectangles = Array.from(avoid, (node) => {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("fill", "black");
    cuts.append(rect);
    return { node, rect };
  });
  let lastMaskAt = -Infinity,
    viewport = "",
    lastAge = Infinity,
    capturedRadius = 0,
    lastMode = "",
    lastCue = null,
    releaseFrom = null;
  const motionFocus = { x: 0, y: 0, radius: 0, width: 0, height: 0 };
  function reset() {
    if (!layer.hidden) layer.hidden = true;
    lastAge = Infinity;
    lastMaskAt = -Infinity;
    lastMode = "";
    lastCue = releaseFrom = null;
  }
  return {
    reset,
    update(age, focus, reducedMotion, mode = "locked") {
      if (!focus) return reset();
      const key = `${focus.width}:${focus.height}`;
      const newEvent = age < lastAge || mode !== lastMode;
      // 镜头拉近不能把正在收拢的框重新撑大；事件内固定像素终点，中心仍逐帧跟随身体。
      if (mode === "locked" && (newEvent || key !== viewport))
        capturedRadius = focus.radius;
      if (mode === "released" && newEvent)
        releaseFrom = lastCue
          ? { radius: lastCue.radius, opacity: lastCue.opacity }
          : null;
      motionFocus.x = focus.x;
      motionFocus.y = focus.y;
      motionFocus.radius = capturedRadius;
      motionFocus.width = focus.width;
      motionFocus.height = focus.height;
      const cue = characterLockShape(
        age,
        motionFocus,
        reducedMotion,
        mode,
        releaseFrom,
      );
      if (!cue) return reset();
      if (newEvent || key !== viewport || age - lastMaskAt >= 0.1) {
        if (key !== viewport) {
          svg.setAttribute("viewBox", `0 0 ${focus.width} ${focus.height}`);
          mask.setAttribute("width", focus.width);
          mask.setAttribute("height", focus.height);
          viewport = key;
        }
        for (const { node, rect } of rectangles) {
          const bounds = node.getBoundingClientRect();
          rect.setAttribute("x", bounds.left - 4);
          rect.setAttribute("y", bounds.top - 4);
          rect.setAttribute("width", bounds.width > 0 ? bounds.width + 8 : 0);
          rect.setAttribute(
            "height",
            bounds.height > 0 ? bounds.height + 8 : 0,
          );
        }
        lastMaskAt = age;
      }
      lastAge = age;
      lastMode = mode;
      lastCue = cue;
      layer.hidden = false;
      if (layer.dataset.phase !== cue.phase) layer.dataset.phase = cue.phase;
      layer.style.opacity = String(cue.opacity);
      shape.setAttribute(
        "transform",
        `translate(${cue.x} ${cue.y}) scale(${cue.radius / 100})`,
      );
    },
  };
}
