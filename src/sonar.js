import {
  createSonarState,
  activateSonar,
  getSonarStatus,
  detectSonarContacts,
} from "./sonar_rules.js";
import "./sonar.css";

/**
 * 维护声呐计时及完整探测结果；主循环将结果交给世界标记、小地图与声波特效。
 * @param {HTMLElement} container 单行探测状态容器。
 * @returns {object} 激活、重置、更新方法与最近的完整探测快照。
 */
export function createSonar(container) {
  let state = createSonarState();
  let sampledAt = -Infinity;
  let snapshot = { ...getSonarStatus(state, 0), total: 0, contacts: [] };
  container.classList.add("sonar-panel");
  container.hidden = true;
  container.innerHTML =
    '<strong>回声定位</strong><span class="sonar-count"></span><span class="sonar-time"></span>';
  const count = container.querySelector(".sonar-count");
  const time = container.querySelector(".sonar-time");
  return {
    activate(now) {
      const activated = activateSonar(state, now);
      if (activated) sampledAt = -Infinity;
      return activated;
    },
    reset() {
      state = createSonarState();
      sampledAt = -Infinity;
      snapshot = { ...getSonarStatus(state, 0), total: 0, contacts: [] };
      container.hidden = true;
      container.dataset.active = "false";
      container.dataset.total = "0";
      container.dataset.frontTotal = "0";
      container.dataset.groups = "0";
    },
    update(context) {
      const status = getSonarStatus(state, context.now);
      if (!status.active) {
        container.hidden = true;
        container.dataset.active = "false";
        container.dataset.total = "0";
        container.dataset.frontTotal = "0";
        container.dataset.groups = "0";
        snapshot = { ...status, total: 0, contacts: [] };
        return snapshot;
      }
      if (context.now - sampledAt >= 0.1) {
        sampledAt = context.now;
        const contacts = detectSonarContacts(context);
        snapshot = { ...status, total: contacts.length, contacts };
      } else snapshot = { ...snapshot, ...status };
      container.hidden = false;
      container.dataset.active = "true";
      container.dataset.total = String(snapshot.total);
      time.textContent = `${Math.ceil(status.remaining)}s`;
      return snapshot;
    },
    setPresentation({ frontVisible = 0, shownGroups = 0 } = {}) {
      container.dataset.frontTotal = String(frontVisible);
      container.dataset.groups = String(shownGroups);
      count.textContent = shownGroups ? `前方 ${shownGroups}组` : "转向探测";
      container.title = `周围探测到${snapshot.total}个目标，前方${frontVisible}个；画面显示最多4组，转向可查看其他生物。雷达保留周围回声。`;
    },
    get snapshot() {
      return snapshot;
    },
    get state() {
      return { ...state };
    },
  };
}
