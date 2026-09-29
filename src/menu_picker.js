import { t, tr, setMarkup } from "./i18n.js";
import "./menu_picker.css";

/** 共用一个原生模态层展示海域和角色；选中值只保存在入口按钮上。
 * @returns {{open: Function, refresh: Function}} 打开指定配置的选择面板，或按当前语言刷新。
 */
export function createMenuPicker() {
  const dialog = document.createElement("dialog");
  dialog.id = "expedition-picker";
  dialog.className = "expedition-picker";
  dialog.setAttribute("aria-labelledby", "picker-title");
  dialog.setAttribute("aria-describedby", "picker-hint");
  document.body.append(dialog);
  let current;
  let keyboard = false;
  let backdropPress = false;

  function refresh() {
    if (!current) return;
    const focused = dialog.querySelector(":focus")?.dataset.choiceValue;
    const { trigger, title, entries, character } = current;
    setMarkup(
      dialog,
      tr`<div class="picker-header"><div><p class="picker-eyebrow">远征准备</p><h2 id="picker-title">${title}</h2><p id="picker-hint">${character ? "选择后预览角色与能力。" : "选择你想探索的海域。"}</p></div><button type="button" class="picker-close" aria-label="关闭选择面板"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="picker-options">${entries
        .map(
          (entry, index) =>
            tr`<button type="button" class="picker-option" data-choice-value="${entry.id}" aria-pressed="${trigger.value === entry.id}" ${entry.available ? "" : "disabled"}><span class="picker-number" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="picker-info"><span class="picker-name">${entry.name}</span>${entry.description ? tr`<span class="picker-description">${entry.description}</span>` : ""}${character ? tr`<span class="picker-traits"><span><small>主动</small>${entry.active.name}</span><span><small>被动</small>${entry.passive.name}</span></span>` : ""}</span><span class="picker-status">${!entry.available ? t("尚未开放") : trigger.value === entry.id ? tr`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span>已选择</span>` : tr`<span>选择</span><span aria-hidden="true">→</span>`}</span></button>`,
        )
        .join("")}</div>`,
    );
    if (dialog.open) focusChoice(focused || trigger.value);
  }
  function focusChoice(id) {
    const choice = [...dialog.querySelectorAll("[data-choice-value]")].find(
      (button) => button.dataset.choiceValue === id && !button.disabled,
    );
    (choice || dialog.querySelector(".picker-close")).focus({
      preventScroll: true,
    });
  }
  function close() {
    if (!dialog.open) return;
    // 点击收起后不残留键盘焦点框；Tab再访问或直接按键时恢复焦点提示。
    current.trigger.toggleAttribute("data-pointer-restored", !keyboard);
    current.trigger.setAttribute("aria-expanded", "false");
    dialog.close();
    current.trigger.focus({ preventScroll: true });
  }
  dialog.addEventListener("pointerdown", (event) => {
    keyboard = false;
    backdropPress = event.target === dialog && outside(event);
  });
  function outside(event) {
    const box = dialog.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }
  dialog.addEventListener("click", (event) => {
    if (event.target.closest(".picker-close")) return close();
    const option = event.target.closest("[data-choice-value]");
    if (option && !option.disabled) {
      const entry = current.entries.find(
        (entry) => entry.id === option.dataset.choiceValue && entry.available,
      );
      if (!entry) return;
      if (entry.id !== current.trigger.value) {
        current.trigger.value = entry.id;
        close();
        current.onSelect(entry);
      } else close();
    } else if (backdropPress && event.target === dialog && outside(event)) {
      close();
    }
  });
  dialog.addEventListener("keydown", (event) => {
    // 模态层自行处理按键，避免Escape/P/Space冒泡触发游戏快捷键。
    event.stopPropagation();
    keyboard = true;
    const buttons = [...dialog.querySelectorAll("button:not(:disabled)")];
    const choices = buttons.filter((button) => button.dataset.choiceValue);
    const active = document.activeElement;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (
      [
        "ArrowDown",
        "ArrowRight",
        "ArrowUp",
        "ArrowLeft",
        "Home",
        "End",
      ].includes(event.key)
    ) {
      event.preventDefault();
      const delta = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
      const index = choices.indexOf(active);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? choices.length - 1
            : (index + delta + choices.length) % choices.length;
      choices[next]?.focus();
    } else if (event.key === "Tab") {
      if (event.shiftKey && active === buttons[0]) {
        event.preventDefault();
        buttons.at(-1).focus();
      } else if (!event.shiftKey && active === buttons.at(-1)) {
        event.preventDefault();
        buttons[0].focus();
      }
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    keyboard = true;
    close();
  });
  return {
    open(config, event) {
      current = config;
      keyboard = event.detail === 0;
      backdropPress = false;
      current.trigger.removeAttribute("data-pointer-restored");
      current.trigger.setAttribute("aria-expanded", "true");
      refresh();
      dialog.showModal();
      focusChoice(current.trigger.value);
    },
    refresh,
  };
}
