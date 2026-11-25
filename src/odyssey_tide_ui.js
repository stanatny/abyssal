import { t } from "./i18n.js";
import "./odyssey_tide_ui.css";
const NS = "http://www.w3.org/2000/svg";
const marks = ["Α", "Β", "Γ", "Δ"];
const vectors = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

/** 只读航路图；轮盘与试潮石必须在世界里用鼻端接触，不拦截游泳。 */
export function createTideUI() {
  const root = document.createElement("section");
  root.id = "odyssey-tide-ui";
  root.hidden = true;
  root.setAttribute("aria-live", "polite");
  const title = document.createElement("strong"),
    goal = document.createElement("p"),
    status = document.createElement("p"),
    legend = document.createElement("p");
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 200 150");
  svg.setAttribute("role", "img");
  const make = (tag, attrs, parent = svg) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    parent.append(n);
    return n;
  };
  const centers = [
      [52, 43],
      [148, 43],
      [52, 107],
      [148, 107],
    ],
    pipes = [];
  // 固定接管只说明相邻格的连线；不读取答案或改变试潮可用性。
  make("path", {
    d: "M78,43H122 M78,107H122 M52,69V81 M148,69V81",
    fill: "none",
    stroke: "#91b2ad",
    "stroke-width": 3,
  });
  for (let i = 0; i < 4; i++) {
    const [x, y] = centers[i];
    make("rect", {
      x: x - 26,
      y: y - 26,
      width: 52,
      height: 52,
      rx: 8,
      class: "tide-tile",
    });
    pipes.push(
      make("path", {
        fill: "none",
        stroke: "#d7bb75",
        "stroke-width": 7,
        "stroke-linecap": "round",
      }),
    );
    const label = make("text", { x: x - 19, y: y - 15, class: "tide-glyph" });
    label.textContent = marks[i];
  }
  const source = make("path", {
      stroke: "#f1c46b",
      "stroke-width": 4,
      fill: "none",
    }),
    sink = make("path", { stroke: "#b8f2df", "stroke-width": 4, fill: "none" });
  const srcLabel = make("text", { class: "tide-port" }),
    dstLabel = make("text", { class: "tide-port" });
  root.append(title, goal, svg, legend, status);
  document.body.append(root);
  return {
    update(runtime, playing, danger = false) {
      const near = runtime?.nearPuzzle;
      root.hidden = !playing || !near || danger;
      if (root.hidden) return;
      const s = near.state;
      root.dataset.locked = String(!s.defeated);
      title.textContent = t("{0} · 潮汐风路", [near.name]);
      goal.textContent = t(
        s.defeated
          ? "连通源头和归航口，水路必须经过全部四个风纹。"
          : "先击败这里的守卫，石盘封链才会解除。",
      );
      for (let i = 0; i < 4; i++) {
        const [x, y] = centers[i],
          a = vectors[s.rotations[i]],
          b = vectors[(s.rotations[i] + 1) % 4];
        pipes[i].setAttribute(
          "d",
          `M${x + a[0] * 25},${y + a[1] * 25} L${x},${y} L${x + b[0] * 25},${y + b[1] * 25}`,
        );
      }
      for (const [p, label, port, word] of [
        [source, srcLabel, s.variant.source, "源"],
        [sink, dstLabel, s.variant.sink, "航"],
      ]) {
        const [x, y] = centers[port.tile],
          v = vectors[port.port];
        p.setAttribute(
          "d",
          `M${x + v[0] * 26},${y + v[1] * 26} L${x + v[0] * 39},${y + v[1] * 39}`,
        );
        label.setAttribute("x", x + v[0] * 41);
        label.setAttribute("y", y + v[1] * 41 + 4);
        label.textContent = t(word);
      }
      svg.setAttribute(
        "aria-label",
        t("四块石盘当前水路，金色为源头，白色为归航口"),
      );
      legend.textContent = t(
        "鼻端碰轮盘转90°，离开后可再转；最后碰前方独立的试潮石。错试扣20基础生命并复位，题目不变。",
      );
      status.textContent = t(
        runtime.notice ||
          (s.solved
            ? "试潮成功 · 风神像升起一级"
            : s.testing
              ? "正在试潮 · 等待水流抵达归航口"
              : s.cooldown > 0
                ? "石盘已复位 · 试潮石恢复中"
                : "调整不判对错；接通后仍需到试潮石提交。"),
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
