import { message } from "./i18n.js";

/** 撤离与封洞的即时目标优先于普通成长、领主或观察提示。 */
export function prioritizeTitanEscapeHint(
  state,
  ordinaryHint,
  hazardAdvice = null,
) {
  if (state?.entombed) return "熔岩与落石淹没洞穴 · 未能及时逃离";
  if (state?.relicHeld && !state.secured)
    return state.escaped
      ? message`已逃出 · 洞口封闭中 ${Math.ceil(state.sealingRemaining)}秒`
      : message`撤离 ${Math.ceil(state.escapeRemaining)}秒 · ${hazardAdvice || "巨兽正在苏醒，向洞口冲刺"}`;
  return ordinaryHint;
}
