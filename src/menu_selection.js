import { CHARACTERS, REGIONS, getExpedition } from "./expedition_config.js";
import "./menu_selection.css";

/** 挂载出发前的海域、角色与标记设置，返回读取已验证选择的函数。 */
export function createExpeditionSetup(
  container,
  { markers, onMarkersChange, onCharacterChange },
) {
  container.className = "expedition-setup";
  container.innerHTML = `<div class="launch-heading"><span>你的下一次远征</span><small>01 / DEPARTURE</small></div><div class="expedition-selects"><label><span>目的地 <small>DESTINATION</small></span><select id="region-select" aria-describedby="region-description">${REGIONS.map((entry) => `<option value="${entry.id}" ${entry.available ? "" : "disabled"}>${entry.name}${entry.available ? "" : " · 尚未开放"}</option>`).join("")}</select></label><label><span>化身 <small>CHARACTER</small></span><select id="character-select">${CHARACTERS.map((entry) => `<option value="${entry.id}">${entry.name}</option>`).join("")}</select></label></div><div id="character-description" aria-live="polite"></div><details class="expedition-settings"><summary>远征设置与说明<span>30 分钟上限</span></summary><div class="expedition-options"><p id="region-description">${REGIONS[0].description}</p><label class="marker-option"><input id="menu-markers" class="marker-setting" type="checkbox" ${markers ? "checked" : ""}>显示常规生物标记</label><small>声呐独立显示前方目标；暂停不计入时长。<br>J / 手机技能键释放主动技能，接触自动捕食。</small></div></details>`;
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
      `<div class="character-traits"><span><small>主动</small><b>${entry.active.name}</b></span><span><small>被动</small><b>${entry.passive.name}</b></span></div><details class="ability-details"><summary>了解角色能力 <span>↗</span></summary><div><p><b>${entry.active.name}</b>${entry.active.description}</p><p><b>${entry.passive.name}</b>${entry.passive.description}</p></div></details>`;
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
