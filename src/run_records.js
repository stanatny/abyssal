/** 本地通关榜：只接收完成的远征，按海域独立保留最快十次，存储失败不阻断游戏。 */
import { ROUND_DURATION } from "./simulation.js";

export const RUN_RECORD_KEY = "abyssal-runs-v1";
export const RUN_RULESET = "survival-2026-10";
export const RUN_RECORD_LIMIT = 10;
const MAX_TIME_MS = ROUND_DURATION * 1000;

/** 格式化精确至百分之一秒的通关时间，排序仍使用毫秒。 */
export function formatRunTime(milliseconds) {
  const centiseconds = Math.max(0, Math.floor(milliseconds / 10));
  return `${String(Math.floor(centiseconds / 6000)).padStart(2, "0")}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, "0")}.${String(centiseconds % 100).padStart(2, "0")}`;
}

/** 规范化玩家名称；不接受控制字符，只保留最多24个码点。渲染必须使用textContent。 */
export function normalizeRunName(value) {
  return Array.from(
    String(value ?? "")
      .normalize("NFC")
      .replace(/[\p{Cc}\p{Cf}]/gu, "")
      .trim(),
  )
    .slice(0, 24)
    .join("");
}

/** 创建带内存降级的记录库，海域白名单由实际远征配置传入。
 * @param {Storage|undefined} storage 可选浏览器存储。
 * @param {string[]} regionIds 当前支持的海域。
 * @param {string[]} characterIds 当前支持的可选角色。
 * @returns {{list:Function,record:Function,rename:Function,persistent:boolean}} 查询、完成记录和改名接口。
 */
export function createRunRecordStore(
  storage,
  regionIds,
  characterIds = ["orca", "squid"],
) {
  const allowed = new Set(regionIds),
    characters = new Set(characterIds);
  let rows = [],
    persistent = Boolean(storage);
  function valid(row) {
    return (
      row &&
      typeof row.id === "string" &&
      row.id.length > 0 &&
      row.id.length < 100 &&
      allowed.has(row.region) &&
      characters.has(row.character) &&
      row.ruleset === RUN_RULESET &&
      Number.isInteger(row.timeMs) &&
      row.timeMs > 0 &&
      row.timeMs <= MAX_TIME_MS &&
      Number.isFinite(row.at) &&
      typeof row.name === "string"
    );
  }
  function rank() {
    rows.sort(
      (a, b) => a.timeMs - b.timeMs || a.at - b.at || a.id.localeCompare(b.id),
    );
    const counts = new Map(),
      ids = new Set();
    rows = rows.filter((row) => {
      if (ids.has(row.id)) return false;
      ids.add(row.id);
      const count = (counts.get(row.region) || 0) + 1;
      counts.set(row.region, count);
      return count <= RUN_RECORD_LIMIT;
    });
  }
  try {
    const saved = JSON.parse(storage?.getItem(RUN_RECORD_KEY) || "null");
    if (saved?.version === 1 && Array.isArray(saved.rows))
      rows = saved.rows
        .slice(0, 1000)
        .filter(valid)
        .map((row) => ({ ...row, name: normalizeRunName(row.name) }));
  } catch {
    persistent = false;
  }
  rank();
  function save() {
    try {
      if (!storage) return;
      storage.setItem(RUN_RECORD_KEY, JSON.stringify({ version: 1, rows }));
      persistent = true;
    } catch {
      persistent = false;
    }
  }
  return {
    get persistent() {
      return persistent;
    },
    list(region) {
      return rows
        .filter((row) => row.region === region)
        .map((row) => ({ ...row }));
    },
    record({
      id,
      region,
      character,
      seconds,
      won,
      name = "",
      at = Date.now(),
    }) {
      const row = {
        id,
        region,
        character,
        timeMs: Math.round(seconds * 1000),
        name: normalizeRunName(name),
        at,
        ruleset: RUN_RULESET,
      };
      if (won !== true || !valid(row)) return null;
      const previous = rows.find((item) => item.id === id);
      if (previous) return { ...previous };
      rows.push(row);
      rank();
      save();
      return { ...row };
    },
    rename(id, name) {
      const row = rows.find((item) => item.id === id);
      if (!row) return false;
      row.name = normalizeRunName(name);
      save();
      return true;
    },
  };
}
