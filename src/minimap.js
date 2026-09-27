import { WORLD } from "./world_config.js";
import { getMinimapState, projectMinimapPosition } from "./minimap_rules.js";
import "./minimap.css";

let nextMapId = 0;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * 创建固定北向的海域雷达，主循环负责更新，不创建计时器或独立动画循环。
 * @param {HTMLElement} container 容器；外部HUD负责位置及宽度。
 * @returns {object} update、reset、dispose接口和最近一次方位快照。
 */
export function createMinimap(container) {
  const mapId = `minimap-depth-${nextMapId++}`;
  const northWest = projectMinimapPosition({ x: WORLD.minX, z: WORLD.minZ });
  const southEast = projectMinimapPosition({ x: WORLD.maxX, z: WORLD.maxZ });
  const width = southEast.x - northWest.x;
  const height = southEast.y - northWest.y;
  let snapshot = null;
  let disposed = false;
  const dots = new Map();
  container.classList.add("minimap");
  container.setAttribute("role", "img");
  container.setAttribute(
    "aria-label",
    "海域雷达，北向固定，下方为浅海，菱形为出生点",
  );
  container.innerHTML = `<svg class="minimap-chart" viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${mapId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e172c"/><stop offset="0.66" stop-color="#123e50"/><stop offset="1" stop-color="#246861"/></linearGradient></defs>
    <circle class="minimap-frame" cx="50" cy="50" r="48"/>
    <rect class="minimap-basin" x="${northWest.x}" y="${northWest.y}" width="${width}" height="${height}" rx="5" fill="url(#${mapId})"/>
    <g class="minimap-contours">
      ${[-850, -500, -200, 0]
        .map((z) => {
          const p = projectMinimapPosition({ x: 0, z });
          return `<path d="M ${northWest.x} ${p.y - 2} Q 50 ${p.y + 5} ${southEast.x} ${p.y - 2}"/>`;
        })
        .join("")}
      <path d="M 50 ${northWest.y + 2} L 50 ${southEast.y - 2}" class="minimap-meridian"/>
    </g>
    <text class="minimap-north" x="16" y="19">N ↑</text>
    <text class="minimap-zone" x="15" y="37">深</text>
    <text class="minimap-zone" x="77" y="81">浅</text>
    <path class="minimap-home-route"/>
    <g class="minimap-contacts"></g>
    <path class="minimap-home" d="M 0 -2.7 L 2.7 0 L 0 2.7 L -2.7 0 Z"/>
    <g class="minimap-player"><circle r="4.8"/><path d="M 0 -4.5 L 3 3.5 L 0 2 L -3 3.5 Z"/></g>
  </svg><div class="minimap-caption"><span class="minimap-home-label"></span><span class="minimap-depth-label"></span></div>`;
  const route = container.querySelector(".minimap-home-route");
  const playerMarker = container.querySelector(".minimap-player");
  const homeMarker = container.querySelector(".minimap-home");
  const contactLayer = container.querySelector(".minimap-contacts");
  const homeLabel = container.querySelector(".minimap-home-label");
  const depthLabel = container.querySelector(".minimap-depth-label");

  function reset() {
    snapshot = null;
    dots.clear();
    contactLayer.replaceChildren();
    container.dataset.sonarActive = "false";
    container.dataset.contacts = "0";
    for (const key of [
      "heading",
      "homeBearing",
      "homeRelativeBearing",
      "ascent",
      "homeElevation",
    ])
      delete container.dataset[key];
    playerMarker.setAttribute("visibility", "hidden");
    homeMarker.setAttribute("visibility", "hidden");
    route.setAttribute("d", "");
    homeLabel.textContent = "浅滩出生点 ◇";
    depthLabel.textContent = "北向固定";
  }

  reset();
  return {
    update({ position, forward, spawn, contacts = [], sonarActive = false }) {
      if (disposed) return null;
      snapshot = getMinimapState({
        position,
        forward,
        spawn,
        fallbackHeading: snapshot?.heading,
      });
      const { player, home, heading, bearing, relativeBearing } = snapshot;
      container.dataset.heading = degrees(heading);
      container.dataset.homeBearing = bearing === null ? "" : degrees(bearing);
      container.dataset.homeRelativeBearing =
        relativeBearing === null ? "" : degrees(relativeBearing);
      container.dataset.ascent = String(snapshot.ascent);
      container.dataset.homeElevation = snapshot.elevation;
      container.dataset.sonarActive = String(Boolean(sonarActive));
      container.setAttribute(
        "aria-label",
        `海域雷达，北向固定，${snapshot.homeLabel}，${snapshot.depthLabel}`,
      );
      playerMarker.setAttribute("visibility", "visible");
      playerMarker.setAttribute(
        "transform",
        `translate(${player.x} ${player.y}) rotate(${degrees(heading)})`,
      );
      homeMarker.setAttribute("visibility", "visible");
      homeMarker.setAttribute("transform", `translate(${home.x} ${home.y})`);
      route.setAttribute(
        "d",
        snapshot.nearby
          ? ""
          : `M ${player.x} ${player.y} L ${home.x} ${home.y}`,
      );
      homeLabel.textContent = snapshot.homeLabel;
      depthLabel.textContent = snapshot.depthLabel;
      const activeIds = new Set();
      if (sonarActive) {
        for (const [index, contact] of contacts.entries()) {
          if (
            !Number.isFinite(contact.position?.x) ||
            !Number.isFinite(contact.position?.z)
          )
            continue;
          const id = contact.id ?? index;
          activeIds.add(id);
          let dot = dots.get(id);
          if (!dot) {
            dot = document.createElementNS(SVG_NAMESPACE, "circle");
            contactLayer.append(dot);
            dots.set(id, dot);
          }
          const point = projectMinimapPosition(contact.position);
          dot.setAttribute("cx", String(point.x));
          dot.setAttribute("cy", String(point.y));
          dot.setAttribute("r", contact.boss ? "2.2" : "1.5");
          dot.setAttribute(
            "class",
            `minimap-contact ${contact.boss ? "is-boss" : contact.dangerous ? "is-danger" : contact.eligible ? "is-prey" : "is-neutral"}`,
          );
        }
      }
      for (const [id, dot] of dots) {
        if (activeIds.has(id)) continue;
        dot.remove();
        dots.delete(id);
      }
      container.dataset.contacts = String(activeIds.size);
      return snapshot;
    },
    reset,
    dispose() {
      reset();
      disposed = true;
      container.replaceChildren();
    },
    get snapshot() {
      return snapshot;
    },
  };
}

function degrees(radians) {
  return ((radians * 180) / Math.PI).toFixed(1);
}
