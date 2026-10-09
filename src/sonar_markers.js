import { t, tr } from "./i18n.js";
import { buildSonarMarkerLayout } from "./sonar_marker_layout.js";
import "./sonar_markers.css";

/**
 * 创建前方扇区的回声说明，由游戏主循环驱动；全向探测仍由独立雷达显示。
 * @param {HTMLElement} container 挂载标记的 HUD 容器。
 * @returns {object} 更新、重置、释放方法，以及前方过滤后的标记数量和快照。
 */
export function createSonarMarkers(container) {
  const layer = document.createElement("div");
  layer.className = "sonar-world-markers";
  layer.hidden = true;
  layer.setAttribute("aria-hidden", "true");
  const anchorLayer = document.createElement("div");
  anchorLayer.className = "sonar-world-anchors";
  const labelLayer = document.createElement("div");
  labelLayer.className = "sonar-world-labels";
  layer.append(anchorLayer, labelLayer);
  container.append(layer);
  const nodes = new Map(),
    labels = new Map();
  let snapshot = emptySnapshot();
  let lastUpdate = -Infinity,
    lastViewport = "",
    disposed = false;

  function reset() {
    layer.hidden = true;
    layer.dataset.total = "0";
    layer.dataset.totalDetected = "0";
    layer.dataset.frontVisible = "0";
    layer.dataset.markedCount = "0";
    layer.dataset.groups = "0";
    nodes.clear();
    labels.clear();
    anchorLayer.replaceChildren();
    labelLayer.replaceChildren();
    snapshot = emptySnapshot();
    lastUpdate = -Infinity;
  }

  return {
    update(context) {
      if (disposed) return snapshot;
      if (!context.active) {
        if (!layer.hidden) reset();
        return snapshot;
      }
      const now = context.now ?? performance.now() / 1000;
      const viewportKey = tr`${context.viewport.width}:${context.viewport.height}`;
      // 20Hz切换当前朝向的说明，不创建独立动画循环。
      if (
        now >= lastUpdate &&
        now - lastUpdate < 0.05 &&
        viewportKey === lastViewport
      )
        return snapshot;
      lastUpdate = now;
      lastViewport = viewportKey;
      snapshot = buildSonarMarkerLayout(context);
      layer.hidden = false;
      layer.dataset.total = String(snapshot.contacts.length);
      layer.dataset.totalDetected = String(snapshot.totalDetected);
      layer.dataset.frontVisible = String(snapshot.frontVisible);
      layer.dataset.markedCount = String(snapshot.markedCount);
      layer.dataset.groups = String(snapshot.shownGroups);
      const activeIds = new Set();
      for (const contact of snapshot.contacts) {
        activeIds.add(contact.id);
        let node = nodes.get(contact.id);
        if (!node) {
          node = document.createElement("i");
          anchorLayer.append(node);
          nodes.set(contact.id, node);
        }
        node.className = tr`sonar-world-anchor ${contactClass(contact)}`;
        node.dataset.contactId = contact.id;
        node.dataset.labelId = contact.labelId;
        node.dataset.length = String(contact.length);
        node.dataset.eligible = String(contact.eligible);
        node.dataset.behind = "false";
        node.dataset.onscreen = "true";
        node.title = t(
          tr`${contact.label} · ${contact.length}米 · ${contact.status}`,
        );
        node.style.left = tr`${contact.anchor.x}px`;
        node.style.top = tr`${contact.anchor.y}px`;
      }
      for (const [id, node] of nodes)
        if (!activeIds.has(id)) {
          node.remove();
          nodes.delete(id);
        }
      const activeGroups = new Set();
      for (const label of snapshot.labels) {
        activeGroups.add(label.id);
        let text = labels.get(label.id);
        if (!text) {
          text = document.createElement("span");
          text.append(document.createElement("span"));
          labelLayer.append(text);
          labels.set(label.id, text);
        }
        text.className = tr`sonar-world-label ${contactClass(label)}`;
        text.firstElementChild.textContent = t(label.text);
        text.style.left = tr`${label.x}px`;
        text.style.top = tr`${label.y}px`;
        text.style.maxWidth = tr`${label.width}px`;
        text.dataset.contactIds = label.contacts
          .map((contact) => contact.id)
          .join(",");
        text.dataset.behind = "false";
        text.title = t(
          label.contacts
            .map(
              (contact) =>
                tr`${contact.label} · ${contact.length}米 · ${contact.status}`,
            )
            .join("\n"),
        );
      }
      for (const [id, text] of labels)
        if (!activeGroups.has(id)) {
          text.remove();
          labels.delete(id);
        }
      return snapshot;
    },
    reset,
    dispose() {
      reset();
      layer.remove();
      disposed = true;
    },
    get snapshot() {
      return snapshot;
    },
  };
}

function emptySnapshot() {
  return {
    contacts: [],
    labels: [],
    totalDetected: 0,
    frontVisible: 0,
    markedCount: 0,
    shownGroups: 0,
  };
}
function contactClass(contact) {
  return contact.boss
    ? "echo-boss"
    : contact.rare
      ? "echo-rare"
      : contact.dangerous
        ? contact.eligible
          ? "echo-warning"
          : "echo-danger"
        : contact.eligible
          ? "echo-prey"
          : "echo-neutral";
}
