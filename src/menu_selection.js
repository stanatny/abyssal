import { t, tr, setMarkup, translateDOM, onLanguageChange } from "./i18n.js";
import { CHARACTERS, REGIONS, getExpedition } from "./expedition_config.js";
import "./menu_selection.css";
import { createMenuPicker } from "./menu_picker.js";

/** 挂载出发前的海域、角色与操作设置，返回读取已验证选择的函数。 */
export function createExpeditionSetup(
  container,
  {
    markers,
    invertVertical = false,
    onMarkersChange,
    onInvertVerticalChange,
    onCharacterChange,
    onRegionChange,
  },
) {
  container.className = "expedition-setup";
  setMarkup(
    container,
    tr`<div class="launch-heading"><span>你的下一次远征</span><small>01 / DEPARTURE</small></div><div class="expedition-selects"><button type="button" id="region-select" value="hawaii" class="expedition-choice" aria-haspopup="dialog" aria-expanded="false" aria-controls="expedition-picker" aria-labelledby="region-choice-label region-choice-value" aria-describedby="region-choice-hint"><span class="choice-heading"><span class="choice-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 9c0 5-6 10-6 10S6 14 6 9a6 6 0 1 1 12 0Z"/><circle cx="12" cy="9" r="2"/><path d="m5 17-2 4h18l-2-4"/></svg></span><span id="region-choice-label">目的地</span><span class="choice-cta" aria-hidden="true">点击更换<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></span><span class="choice-input"><span class="choice-value" id="region-choice-value">${REGIONS[0].name}</span></span><span class="choice-hint" id="region-choice-hint">浏览并选择海域</span></button><button type="button" id="character-select" value="orca" class="expedition-choice" aria-haspopup="dialog" aria-expanded="false" aria-controls="expedition-picker" aria-labelledby="character-choice-label character-choice-value" aria-describedby="character-choice-hint"><span class="choice-heading"><span class="choice-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12c4-7 11-7 17 0-6 7-13 7-17 0Zm0 0-3-4v8l3-4Zm8-5 3-4 2 5m-5 9 3 4 2-5"/><circle cx="17" cy="11" r=".8"/></svg></span><span id="character-choice-label">化身</span><span class="choice-cta" aria-hidden="true">点击更换<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></span></span><span class="choice-input"><span class="choice-value" id="character-choice-value">${CHARACTERS[0].name}</span></span><span class="choice-hint" id="character-choice-hint">切换后预览角色</span></button></div><div class="region-brief" aria-live="polite"><div class="region-brief-heading"><span id="region-difficulty"></span><span id="region-species-count"></span></div><details class="region-overview"><summary>海域概览与食物层级</summary><p id="region-description"></p><p id="region-food"></p></details><p class="region-goal"><b>远征目标</b><span id="region-goal"></span></p></div><div id="character-description" aria-live="polite"></div><details class="expedition-settings"><summary>远征设置与说明<span>30 分钟上限</span></summary><div class="expedition-options"><p class="survival-tip">幼年先在安全浅滩吃鱼群；幼年深潜会急剧消耗饱食。长大后更能适应深海，但小鱼补给会衰减，要寻找大型猎物，吃饱再挑战领主。</p><label class="marker-option"><input id="menu-markers" class="marker-setting" type="checkbox" ${markers ? "checked" : ""}>显示常规生物标记</label><label class="marker-option"><input id="menu-invert-y" type="checkbox" aria-describedby="invert-y-description" ${invertVertical ? "checked" : ""}>反转上下方向</label><small id="invert-y-description">开启后：W / 摇杆向上为下潜，S / 摇杆向下为上浮。</small><small>声呐独立显示前方目标；暂停不计入时长。<br>J / 手机技能键释放主动技能，接触自动捕食。</small></div></details>`,
  );
  container
    .querySelector("#menu-markers")
    .addEventListener("change", (event) =>
      onMarkersChange(event.target.checked),
    );
  container
    .querySelector("#menu-invert-y")
    .addEventListener("change", (event) =>
      onInvertVerticalChange?.(event.target.checked),
    );
  const picker = createMenuPicker();
  const regionButton = container.querySelector("#region-select");
  const characterButton = container.querySelector("#character-select");
  function updateRegion(notifyChange = true) {
    const entry = REGIONS.find((region) => region.id === regionButton.value);
    container.querySelector("#region-choice-value").textContent = t(entry.name);
    container.querySelector("#region-description").textContent = t(
      entry.description || "",
    );
    container.querySelector("#region-difficulty").textContent = t(
      entry.objective.difficulty,
    );
    container.querySelector("#region-species-count").textContent =
      tr`${entry.speciesKinds.length} 种生物`;
    container.querySelector("#region-food").textContent = t(
      entry.objective.food,
    );
    container.querySelector("#region-goal").textContent = t(
      entry.objective.summary,
    );
    container.querySelector(".survival-tip").textContent = t(
      entry.departureHint ||
        "幼年先在安全浅滩吃鱼群；幼年深潜会急剧消耗饱食。长大后更能适应深海，但小鱼补给会衰减，要寻找大型猎物，吃饱再挑战领主。",
    );
    const note = document.querySelector(".specimen p"),
      depth = document.querySelector(".menu-stats > div:nth-child(3) b");
    if (note) note.textContent = t(entry.objective.summary);
    if (depth)
      depth.textContent = entry.world
        ? String(entry.world.maxDepth * entry.world.displayDepthScale)
        : "2500+";
    if (notifyChange) onRegionChange?.(entry);
  }
  for (const [trigger, entries, title, character, onSelect] of [
    [regionButton, REGIONS, "选择海域", false, updateRegion],
    [characterButton, CHARACTERS, "选择角色", true, () => updateCharacter()],
  ]) {
    trigger.addEventListener("blur", () =>
      trigger.removeAttribute("data-pointer-restored"),
    );
    trigger.addEventListener("keydown", () =>
      trigger.removeAttribute("data-pointer-restored"),
    );
    trigger.addEventListener("click", (event) =>
      picker.open({ trigger, entries, title, character, onSelect }, event),
    );
  }
  function updateCharacter(notifyChange = true) {
    const expanded = container.querySelector(".ability-details")?.open;
    const id = container.querySelector("#character-select").value;
    const entry = CHARACTERS.find((character) => character.id === id);
    container.querySelector("#character-choice-value").textContent = t(
      entry.name,
    );
    setMarkup(
      container.querySelector("#character-description"),
      tr`<div class="character-traits"><span><small>主动</small><b>${entry.active.name}</b></span><span><small>被动</small><b>${entry.passive.name}</b></span></div><details class="ability-details"><summary>了解角色能力 <span>↗</span></summary><div><p><b>${entry.active.name}</b>${entry.active.description} ${tr`冷却${entry.active.cooldown}秒`}</p><p><b>${entry.passive.name}</b>${entry.passive.description}</p></div></details>`,
    );
    container.querySelector(".ability-details").open = Boolean(expanded);
    if (notifyChange) onCharacterChange?.(entry);
  }
  container.querySelector(".region-overview").open =
    window.matchMedia("(min-width: 701px)").matches;
  updateRegion(false);
  updateCharacter();
  onLanguageChange(() => {
    translateDOM(container);
    updateRegion(false);
    updateCharacter(false);
    picker.refresh();
  });
  return {
    setRegion(id) {
      regionButton.value = id;
      updateRegion(false);
    },
    getSelection: () =>
      getExpedition(
        container.querySelector("#region-select").value,
        container.querySelector("#character-select").value,
      ),
  };
}
