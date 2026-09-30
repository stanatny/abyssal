import { t, tr, setMarkup } from "./i18n.js";
import "./region_loading.css";

/**
 * 切换海域时先展示加载层，再允许同步建模；保存并恢复焦点与已有inert状态。
 * @returns {object} begin(name)、paint()、fail()、end()，由调用方管理场景事务。
 */
export function createRegionLoading() {
  const panel = document.createElement("section");
  panel.id = "region-loading";
  panel.hidden = true;
  panel.tabIndex = -1;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "region-loading-title");
  document.body.append(panel);
  let locked = [];
  let previousFocus;
  panel.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Tab") {
      event.preventDefault();
      (panel.querySelector("button") || panel).focus();
    }
  });
  return {
    begin(name) {
      previousFocus = document.activeElement;
      locked = [...document.body.children]
        .filter((node) => node !== panel && node instanceof HTMLElement)
        .map((node) => [node, node.inert]);
      for (const [node] of locked) node.inert = true;
      setMarkup(
        panel,
        tr`<div class="region-loading-card"><span class="region-loading-sea" aria-hidden="true">≈</span><span class="region-loading-orbit" aria-hidden="true"></span><p class="region-loading-eyebrow">下一段旅程</p><h2 id="region-loading-title">${name}</h2><p role="status" aria-live="polite">正在准备海域…</p><span class="region-loading-track" aria-hidden="true"><i></i></span></div>`,
      );
      panel.hidden = false;
      panel.setAttribute("aria-busy", "true");
      document.body.dataset.regionLoading = "true";
      panel.focus({ preventScroll: true });
    },
    stage(label, percent) {
      panel.querySelector('[role="status"]').textContent = t(label);
      panel.style.setProperty("--region-progress", `${percent}%`);
    },
    // 两次RAF确保浏览器至少有一次绘制机会，不能在加载层出现前开始同步建模。
    paint() {
      return new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
    },
    async fail() {
      panel.removeAttribute("aria-busy");
      panel.querySelector('[role="status"]').textContent = t(
        "海域准备失败，已保留原海域。请稍后重试。",
      );
      panel.querySelector(".region-loading-track").hidden = true;
      const button = document.createElement("button");
      button.textContent = t("返回主界面");
      panel.querySelector(".region-loading-card").append(button);
      button.focus();
      await new Promise((resolve) =>
        button.addEventListener("click", resolve, { once: true }),
      );
    },
    end() {
      panel.style.removeProperty("--region-progress");
      panel.hidden = true;
      panel.removeAttribute("aria-busy");
      delete document.body.dataset.regionLoading;
      for (const [node, wasInert] of locked) node.inert = wasInert;
      locked = [];
      previousFocus?.focus({ preventScroll: true });
    },
  };
}
