import { CHARACTERS, REGIONS, getExpedition } from "./expedition_config.js";
import "./menu_selection.css";

/** 挂载出发前的海域、角色与标记设置，返回读取已验证选择的函数。 */
export function createExpeditionSetup(
  container,
  { markers, onMarkersChange, onCharacterChange },
) {
  container.className = "expedition-setup";
  container.innerHTML = `<div class="expedition-selects"><label>选择海域<select id="region-select" aria-describedby="region-description">${REGIONS.map((entry) => `<option value="${entry.id}" ${entry.available ? "" : "disabled"}>${entry.name}${entry.available ? " · 已开放" : " · 尚未开放"}</option>`).join("")}</select></label><label>选择角色<select id="character-select">${CHARACTERS.map((entry) => `<option value="${entry.id}">${entry.name}</option>`).join("")}</select></label></div><p id="region-description">${REGIONS[0].description}</p><div class="expedition-options"><label class="marker-option"><input id="menu-markers" class="marker-setting" type="checkbox" ${markers ? "checked" : ""}>常规生物标记（声呐独立显示前方目标）</label><span>单局上限 30 分钟 · 暂停不计时</span></div><div id="character-description" aria-live="polite"></div><small>J / 手机技能键释放主动技能 · 被动技能自动生效 · 接触自动捕食</small>`;
  container
    .querySelector("#menu-markers")
    .addEventListener("change", (event) =>
      onMarkersChange(event.target.checked),
    );
  container
    .querySelector("#region-select")
    .addEventListener("change", (event) => {
      const entry = REGIONS.find((region) => region.id === event.target.value);
      container.querySelector("#region-description").textContent =
        entry?.description || "此海域尚未开放。";
    });
  function updateCharacter() {
    const id = container.querySelector("#character-select").value;
    const entry = CHARACTERS.find((character) => character.id === id);
    container.querySelector("#character-description").innerHTML =
      `<p><b>主动 · ${entry.active.name}</b><br>${entry.active.description}</p><p><b>被动 · ${entry.passive.name}</b><br>${entry.passive.description}</p>`;
    onCharacterChange?.(entry);
  }
  container
    .querySelector("#character-select")
    .addEventListener("change", updateCharacter);
  updateCharacter();
  return {
    getSelection: () =>
      getExpedition(
        container.querySelector("#region-select").value,
        container.querySelector("#character-select").value,
      ),
  };
}
