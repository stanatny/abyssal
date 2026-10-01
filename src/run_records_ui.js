import { t, tr, setMarkup, onLanguageChange } from "./i18n.js";
import { REGIONS, CHARACTERS } from "./expedition_config.js";
import { createRunRecordStore, formatRunTime } from "./run_records.js";
import "./run_records.css";

/** 通关结果录名与海域排行榜，原生dialog负责焦点、触屏和Escape，胜利只登记一次。 */
export function createRunRecordsUI(getRegion) {
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    /* 受限浏览器使用内存榜。 */
  }
  const store = createRunRecordStore(
    storage,
    REGIONS.map((r) => r.id),
    CHARACTERS.map((c) => c.id),
  );
  const dialog = document.createElement("dialog");
  dialog.id = "run-board";
  dialog.className = "run-board";
  dialog.setAttribute("aria-labelledby", "run-board-title");
  document.body.append(dialog);
  const result = document.getElementById("run-record"),
    trigger = document.getElementById("open-records");
  let regionId = getRegion(),
    runId,
    pending,
    saved = false;
  function resetRound() {
    runId =
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    pending = null;
    saved = false;
    result.hidden = true;
  }
  function refreshBest() {
    const best = store.list(getRegion())[0];
    document.getElementById("region-best").textContent = best
      ? tr`最快 ${formatRunTime(best.timeMs)}`
      : t("暂无通关记录");
  }
  function renderBoard() {
    const region = REGIONS.find((r) => r.id === regionId);
    setMarkup(
      dialog,
      tr`<div class="run-board-heading"><div><p>LOCAL EXPEDITIONS</p><h2 id="run-board-title">通关时间榜</h2><small>每个海域保留最快十次，仅保存在当前浏览器。</small></div><button type="button" class="run-board-close" aria-label="关闭排行榜">×</button></div><div class="run-board-content"><nav class="run-board-regions" aria-label="选择排行榜海域"></nav><p class="run-board-goal"></p><div class="run-table-wrap"><table><caption></caption><thead><tr><th>名次</th><th>探索者 / 化身</th><th>通关时间</th></tr></thead><tbody></tbody></table><p class="run-board-empty"></p></div><p class="run-board-note">按实际游玩时间计时，暂停、加载和通关后游览不计入。</p><p class="run-storage-note" role="status"></p></div>`,
      false,
    );
    const nav = dialog.querySelector("nav");
    nav.replaceChildren();
    for (const entry of REGIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = t(entry.name);
      button.dataset.runRegion = entry.id;
      button.setAttribute("aria-pressed", String(regionId === entry.id));
      nav.append(button);
    }
    dialog.querySelector(".run-board-goal").textContent = t(
      region.objective.summary,
    );
    dialog.querySelector("caption").textContent = t(region.name);
    const rows = store.list(regionId),
      body = dialog.querySelector("tbody");
    body.replaceChildren();
    rows.forEach((row, index) => {
      const line = document.createElement("tr"),
        rank = document.createElement("td"),
        who = document.createElement("td"),
        time = document.createElement("td");
      rank.textContent = String(index + 1).padStart(2, "0");
      const name = document.createElement("strong"),
        character = document.createElement("small");
      name.textContent = row.name || t("匿名探索者");
      character.textContent = t(
        CHARACTERS.find((c) => c.id === row.character)?.name || row.character,
      );
      who.append(name, character);
      time.textContent = formatRunTime(row.timeMs);
      line.append(rank, who, time);
      body.append(line);
    });
    dialog.querySelector(".run-board-empty").textContent = rows.length
      ? ""
      : t("这片海域还没有通关记录。完成远征，留下你的名字。");
    dialog.querySelector(".run-storage-note").textContent = store.persistent
      ? ""
      : t("浏览器存储不可用，本次记录仅在当前页面保留。");
  }
  function showResult(player, region) {
    if (!player.won) {
      result.hidden = true;
      return;
    }
    if (!pending)
      pending = store.record({
        id: runId,
        region: region.id,
        character: player.characterId,
        seconds: player.elapsed,
        won: player.won,
      });
    result.hidden = false;
    const rank = pending
      ? store.list(region.id).findIndex((row) => row.id === runId) + 1
      : 0;
    setMarkup(
      result,
      tr`<div class="run-result-heading"><b>通关用时</b><strong>${formatRunTime(Math.round(player.elapsed * 1000))}</strong></div><p class="run-character"></p><p class="run-result-status" role="status"></p><form class="run-name-form"><label for="run-name">排行榜名称</label><div><input id="run-name" name="run-name" type="text" maxlength="48" autocomplete="nickname" placeholder="输入名称（最多24字）"><button type="submit">保存名称</button></div></form><button type="button" class="run-result-board">查看本海域排行榜 →</button>`,
    );
    result.querySelector(".run-character").textContent =
      tr`通关角色 · ${CHARACTERS.find((c) => c.id === player.characterId)?.name || player.characterId}`;
    result.querySelector(".run-result-status").textContent = rank
      ? saved
        ? t("名称已保存。")
        : tr`已记录第 ${rank} 名 · 可添加名称`
      : t("本次未进入前十，再次出发挑战更快时间。");
    result.querySelector("form").hidden = !rank;
    result.querySelector("input").value = pending?.name || "";
    if (!store.persistent)
      result.querySelector(".run-result-status").textContent = t(
        "浏览器存储不可用，本次记录仅在当前页面保留。",
      );
    refreshBest();
  }
  result.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pending) return;
    if (store.rename(runId, result.querySelector("input").value)) {
      saved = true;
      pending = store.list(pending.region).find((row) => row.id === runId);
      result.querySelector("input").value = pending.name;
      result.querySelector(".run-result-status").textContent = t(
        store.persistent
          ? "名称已保存。"
          : "浏览器存储不可用，本次记录仅在当前页面保留。",
      );
    }
  });
  function open(region, from) {
    regionId = region;
    renderBoard();
    dialog.showModal();
    dialog.returnFocus = from;
    dialog
      .querySelector(`[data-run-region="${region}"]`)
      .focus({ preventScroll: true });
  }
  trigger.addEventListener("click", () => open(getRegion(), trigger));
  result.addEventListener("click", (event) => {
    if (event.target.closest(".run-result-board"))
      open(pending?.region || getRegion(), event.target);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target.closest(".run-board-close")) dialog.close();
    const button = event.target.closest("[data-run-region]");
    if (button) {
      regionId = button.dataset.runRegion;
      renderBoard();
      dialog
        .querySelector(`[data-run-region="${regionId}"]`)
        .focus({ preventScroll: true });
    }
  });
  dialog.addEventListener("close", () =>
    dialog.returnFocus?.focus({ preventScroll: true }),
  );
  onLanguageChange(() => {
    refreshBest();
    if (dialog.open) renderBoard();
  });
  resetRound();
  refreshBest();
  return {
    resetRound,
    refreshBest,
    showResult,
    get isOpen() {
      return dialog.open;
    },
  };
}
