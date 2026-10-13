import { t } from "./i18n.js";
import { CHARACTER_LOCK_CUE } from "./lord_character_lock.js";

export const LORD_LOCK_FEEDBACK = Object.freeze({
  exitGrace: 0.45,
  entryDuration: CHARACTER_LOCK_CUE.entryDuration,
  releaseDuration: 2.6,
});
const PURSUIT_PHASES = new Set(["hunt", "windup", "attack", "recover"]);

/** 只观察真实交战阶段；不把领地面板、未解锁守卫或返航当成追击。 */
export function createLordLockState() {
  return {
    tracked: new Set(),
    next: new Set(),
    mode: "idle",
    age: 0,
    quiet: 0,
    primary: null,
    count: 0,
  };
}

/** 所有追击者共同决定脱锁，避免最近领主换人时误报安全。 */
export function tickLordLock(state, dt, bosses, position) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  state.age += elapsed;
  state.next.clear();
  let primary = null,
    nearest = Infinity;
  for (const entry of bosses) {
    const boss = entry.state;
    if (!entry.enabled || boss.defeated || boss.locked) continue;
    const pursuing = PURSUIT_PHASES.has(boss.phase);
    // 墨汁只是临时干扰：先前的追击关系直到真实返航/休眠才解除。
    if (
      !pursuing &&
      !(boss.phase === "disoriented" && state.tracked.has(entry))
    )
      continue;
    state.next.add(entry);
    const { x, y, z } = entry.mesh.position;
    const distance =
      (x - position.x) ** 2 + (y - position.y) ** 2 + (z - position.z) ** 2;
    if (distance < nearest) {
      nearest = distance;
      primary = entry;
    }
  }
  const previous = state.tracked;
  state.tracked = state.next;
  state.next = previous;
  if (state.tracked.size) {
    if (state.mode !== "locked") state.age = 0;
    state.mode = "locked";
    state.quiet = 0;
    state.primary = primary;
    state.count = state.tracked.size;
  } else if (state.mode === "locked") {
    state.quiet += elapsed;
    if (state.quiet >= LORD_LOCK_FEEDBACK.exitGrace) {
      state.mode = "released";
      state.age = 0;
      state.primary = null;
      state.count = 0;
    }
  } else if (
    state.mode === "released" &&
    state.age >= LORD_LOCK_FEEDBACK.releaseDuration
  )
    state.mode = "idle";
  return state;
}

/** 复用的 HUD、角色 SVG 与脱锁边框跟随游戏时钟，无额外循环、计时器或世界资源。 */
export function createLordLockFeedback({
  panel,
  frame,
  title,
  detail,
  characterCue,
}) {
  let state = createLordLockState();
  let lastMode = "",
    lastTitle = "",
    lastDetail = "";
  function render(reducedMotion = false, focus = null) {
    const idle = state.mode === "idle";
    const locked = state.mode === "locked";
    const acquired = locked && state.age < LORD_LOCK_FEEDBACK.entryDuration;
    panel.hidden = idle;
    // 锁定限于角色与局部 HUD；屏幕边缘保留给领主技能和已验收的脱锁效果。
    frame.hidden = idle || locked;
    if (
      locked ||
      (state.mode === "released" &&
        state.age < CHARACTER_LOCK_CUE.releaseDuration)
    )
      characterCue?.update(
        state.age,
        typeof focus === "function" ? focus() : focus,
        reducedMotion,
        state.mode,
      );
    else characterCue?.reset();
    if (idle) return;
    if (state.mode !== lastMode) {
      panel.dataset.state = frame.dataset.state = state.mode;
      lastMode = state.mode;
    }
    panel.dataset.acquired = String(acquired);
    const heading = t(
      acquired ? "领主已锁定你" : locked ? "深渊领主锁定" : "已脱离领主锁定",
    );
    const body = locked
      ? state.count > 1
        ? t("{0} · 共{1}位领主追击", [
            state.primary.state.species.label,
            state.count,
          ])
        : t(state.primary.state.species.label)
      : t("留意残留攻击与其他猎手");
    if (heading !== lastTitle) title.textContent = lastTitle = heading;
    if (body !== lastDetail) detail.textContent = lastDetail = body;
    // 实际角色收拢由独立 SVG 驱动；HUD 仅保留状态与短促入场提示。
    const progress = Math.min(
      1,
      state.age /
        (locked
          ? LORD_LOCK_FEEDBACK.entryDuration
          : LORD_LOCK_FEEDBACK.releaseDuration),
    );
    const envelope = locked
      ? Math.max(
          0,
          Math.min(1, (LORD_LOCK_FEEDBACK.entryDuration - state.age) / 1.4),
        )
      : Math.min(1, (1 - progress) * 4);
    frame.style.opacity = String(
      locked ? 0 : envelope * (reducedMotion ? 0.35 : 0.65),
    );
    frame.style.setProperty(
      "--lock-inset",
      `${reducedMotion || locked ? 0 : progress * 14}px`,
    );
    panel.style.setProperty(
      "--lock-emphasis",
      reducedMotion || !locked ? 0 : envelope,
    );
    panel.style.setProperty(
      "--lock-sweep",
      reducedMotion ? 0 : Math.min(1, state.age / 0.8),
    );
    panel.style.opacity = String(locked ? 1 : envelope);
  }
  return {
    update(dt, bosses, position, reducedMotion, focus) {
      tickLordLock(state, dt, bosses, position);
      render(reducedMotion, focus);
    },
    reset() {
      state = createLordLockState();
      lastMode = lastTitle = lastDetail = "";
      panel.hidden = frame.hidden = true;
      panel.style.opacity = frame.style.opacity = "0";
      characterCue?.reset();
    },
  };
}
