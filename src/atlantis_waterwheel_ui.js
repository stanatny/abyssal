import { t } from "./i18n.js";
import "./atlantis_waterwheel.css";

/** 只读提示，不截获触摸、键盘或转向；全部操作都来自场景轮盘的接触。 */
export function createWaterwheelUI() {
  const root = document.createElement("section");
  root.id = "waterwheel-ui";
  root.hidden = true;
  const title = document.createElement("strong"),
    goal = document.createElement("p"),
    status = document.createElement("p"),
    valves = document.createElement("div");
  valves.className = "waterwheel-valves";
  status.setAttribute("role", "status");
  const labels = Array.from({ length: 6 }, () => {
    const label = document.createElement("span");
    valves.append(label);
    return label;
  });
  root.append(title, goal, valves, status);
  document.body.append(root);
  return {
    update(art, playing, eligible) {
      root.hidden =
        !playing || !eligible || !art?.state.discovered || !art.near;
      if (root.hidden) return;
      const s = art.state;
      title.textContent = t("六阀水位锁 · 目标 {0} 刻", [s.target]);
      goal.textContent = t(
        "用头部碰触铜轮开关，离开后再碰可反向。自行计算，最后碰触右侧总阀试闸。",
      );
      labels.forEach((label, i) => {
        label.textContent = `${["I", "II", "III", "IV", "V", "VI"][i]} +${s.amounts[i]} · ${t(s.valves[i] ? "已开" : "已关")}`;
        label.dataset.open = String(s.valves[i]);
      });
      status.textContent = t(
        s.solved
          ? "闸门已开启 · 波塞冬神像正在苏醒"
          : art.notice === "settling"
            ? "水位调整中：离开总阀，稳定后再碰。"
            : art.notice === "protected"
              ? "受伤保护中：离开总阀，保护结束后再碰。"
              : art.notice === "cooldown"
                ? "总阀恢复中：离开总阀，稍后再碰。"
                : s.result === "low"
                  ? "水位偏低：已扣30生命，全部分阀关闭并排水。题目不变。"
                  : s.result === "high"
                    ? "水位偏高：已扣30生命，全部分阀关闭并排水。题目不变。"
                    : "调节免费；试闸错误扣30生命并全部复位。贴住不会连续触发。",
      );
    },
    hide() {
      root.hidden = true;
    },
    dispose() {
      root.remove();
    },
  };
}
