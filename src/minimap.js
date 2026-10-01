import {
  nearestWorldBoundary,
  BOUNDARY_NOTICE_DISTANCE,
} from "./world_boundary.js";
import { t, tr, setMarkup } from "./i18n.js";
import { WORLD } from "./world_config.js";
import { isNursery } from "./nursery_rules.js";
import { getMinimapState, projectMinimapPosition } from "./minimap_rules.js";
import { getSwimmingAttitude } from "./steering_rules.js";
import "./minimap.css";

let nextMapId = 0;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/**
 * 创建固定北向的海域雷达，主循环负责更新，不创建计时器或独立动画循环。
 * @param {HTMLElement} container 容器；外部HUD负责位置及宽度。
 * @returns {object} update、reset、dispose接口和最近一次方位快照。
 */
export function createMinimap(container) {
  const mapId = tr`minimap-depth-${nextMapId++}`;
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
    t("海域雷达，北向固定，下方为浅海，菱形为出生点"),
  );
  setMarkup(
    container,
    tr`<svg class="minimap-chart" viewBox="0 0 100 100" aria-hidden="true">
    <defs><linearGradient id="${mapId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e172c"/><stop offset="0.66" stop-color="#123e50"/><stop offset="1" stop-color="#246861"/></linearGradient></defs>
    <circle class="minimap-frame" cx="50" cy="50" r="48"/>
    <rect class="minimap-basin" x="${northWest.x}" y="${northWest.y}" width="${width}" height="${height}" rx="5" fill="url(#${mapId})"/>
    <g class="minimap-contours">
      ${[-850, -500, -200, 0]
        .map((z) => {
          const p = projectMinimapPosition({ x: 0, z });
          return tr`<path d="M ${northWest.x} ${p.y - 2} Q 50 ${p.y + 5} ${southEast.x} ${p.y - 2}"/>`;
        })
        .join("")}
      <path d="M 50 ${northWest.y + 2} L 50 ${southEast.y - 2}" class="minimap-meridian"/>
    </g>
    <text class="minimap-north" x="16" y="19">N ↑</text>
    <text class="minimap-zone" x="15" y="37">深</text>
    <text class="minimap-zone" x="77" y="81">浅</text>
    <path class="minimap-home-route"/><path class="minimap-boundary"/>
    <g class="minimap-waypoints"></g><g class="minimap-contacts"></g>
    <path class="minimap-home" d="M 0 -2.7 L 2.7 0 L 0 2.7 L -2.7 0 Z"/>
    <g class="minimap-player"><circle r="4.8"/><path d="M 0 -4.5 L 3 3.5 L 0 2 L -3 3.5 Z"/></g>
    <g class="minimap-attitude">
      <path class="minimap-pitch-scale" d="M 86 33 V 65 M 83 33 H 89 M 84 41 H 88 M 82 49 H 90 M 84 57 H 88 M 83 65 H 89"/>
      <text class="minimap-pitch-axis" x="86" y="29">仰</text>
      <path class="minimap-pitch-marker" d="M -6 -2.1 L -1 0 L -6 2.1 Z"/>
    </g>
  </svg><span class="minimap-pitch-label" aria-hidden="true"></span><div class="minimap-caption"><span class="minimap-home-label"></span><span class="minimap-depth-label"></span></div>`,
  );
  const boundary = container.querySelector(".minimap-boundary");
  const route = container.querySelector(".minimap-home-route");
  const playerMarker = container.querySelector(".minimap-player");
  const homeMarker = container.querySelector(".minimap-home");
  const contactLayer = container.querySelector(".minimap-contacts");
  const homeLabel = container.querySelector(".minimap-home-label");
  const depthLabel = container.querySelector(".minimap-depth-label");
  const pitchMarker = container.querySelector(".minimap-pitch-marker");
  const pitchLabel = container.querySelector(".minimap-pitch-label");

  function reset() {
    snapshot = null;
    boundary.setAttribute("d", "");
    delete container.dataset.boundary;
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
      "pitch",
      "attitude",
    ])
      delete container.dataset[key];
    playerMarker.setAttribute("visibility", "hidden");
    homeMarker.setAttribute("visibility", "hidden");
    route.setAttribute("d", "");
    homeLabel.textContent = t("浅滩出生点 ◇");
    depthLabel.textContent = t("北向固定");
    pitchMarker.setAttribute("transform", "translate(86 49)");
    pitchLabel.textContent = t("平游 0°");
  }

  reset();
  return {
    update({
      position,
      forward,
      spawn,
      contacts = [],
      sonarActive = false,
      world = WORLD,
      waypoints = [],
    }) {
      if (disposed) return null;
      const nw = projectMinimapPosition(
          { x: world.minX, z: world.minZ },
          world,
        ),
        se = projectMinimapPosition({ x: world.maxX, z: world.maxZ }, world);
      const basin = container.querySelector(".minimap-basin");
      for (const [k, v] of Object.entries({
        x: nw.x,
        y: nw.y,
        width: se.x - nw.x,
        height: se.y - nw.y,
      }))
        basin.setAttribute(k, String(v));
      container.querySelector(".minimap-contours").style.opacity =
        waypoints.length ? "0" : "1";
      const waypointLayer = container.querySelector(".minimap-waypoints");
      while (waypointLayer.children.length < waypoints.length) {
        const dot = document.createElementNS(SVG_NAMESPACE, "circle");
        waypointLayer.append(dot);
      }
      while (waypointLayer.children.length > waypoints.length)
        waypointLayer.lastChild.remove();
      waypoints.forEach((w, i) => {
        const p = projectMinimapPosition(w, world),
          dot = waypointLayer.children[i];
        dot.setAttribute("cx", String(p.x));
        dot.setAttribute("cy", String(p.y));
        dot.setAttribute("r", "3");
        dot.setAttribute(
          "fill",
          w.final ? "#edc876" : w.open ? "#73cfb4" : "#bb98d9",
        );
        dot.setAttribute(
          "opacity",
          Math.abs(w.y - position.y) < 500 ? ".9" : ".25",
        );
      });
      const nursery = isNursery(position);
      snapshot = getMinimapState({
        position,
        forward,
        spawn,
        fallbackHeading: snapshot?.heading,
        world,
      });
      snapshot.attitude = getSwimmingAttitude(forward);
      container.dataset.pitch = String(snapshot.attitude.degrees);
      container.dataset.attitude = snapshot.attitude.direction;
      pitchMarker.setAttribute(
        "transform",
        tr`translate(86 ${49 - snapshot.attitude.fraction * 16})`,
      );
      pitchLabel.textContent = t(snapshot.attitude.label);
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
        t(
          tr`海域雷达，北向固定，${snapshot.homeLabel}，${snapshot.depthLabel}，${snapshot.attitude.label}${nursery ? "，安全浅滩" : ""}`,
        ),
      );
      playerMarker.setAttribute("visibility", "visible");
      playerMarker.setAttribute(
        "transform",
        tr`translate(${player.x} ${player.y}) rotate(${degrees(heading)})`,
      );
      homeMarker.setAttribute("visibility", "visible");
      homeMarker.setAttribute("transform", tr`translate(${home.x} ${home.y})`);
      route.setAttribute(
        "d",
        snapshot.nearby
          ? ""
          : tr`M ${player.x} ${player.y} L ${home.x} ${home.y}`,
      );
      homeLabel.textContent = t(snapshot.homeLabel);
      container.dataset.nursery = String(nursery);
      depthLabel.textContent = t(nursery ? "安全浅滩" : snapshot.depthLabel);
      const next = waypoints.find((w) => !w.open);
      if (next && !nursery)
        depthLabel.textContent = t(
          next.guardian
            ? Math.abs(next.y - position.y) <= 3
              ? "守卫 · 同层"
              : next.y > position.y
                ? tr`守卫 ↑ ${Math.round((next.y - position.y) * world.displayDepthScale)}m`
                : tr`守卫 ↓ ${Math.round((position.y - next.y) * world.displayDepthScale)}m`
            : next.key
              ? Math.abs(next.y - position.y) <= 3
                ? "钥匙建筑 · 同层"
                : next.y > position.y
                  ? tr`钥匙建筑 ↑ ${Math.round((next.y - position.y) * world.displayDepthScale)}m`
                  : tr`钥匙建筑 ↓ ${Math.round((position.y - next.y) * world.displayDepthScale)}m`
              : next.relic
                ? Math.abs(next.y - position.y) <= 3
                  ? "圣珠 · 同层"
                  : next.y > position.y
                    ? tr`圣珠 ↑ ${Math.round((next.y - position.y) * world.displayDepthScale)}m`
                    : tr`圣珠 ↓ ${Math.round((position.y - next.y) * world.displayDepthScale)}m`
                : next.final
                  ? tr`秘境 ↓ ${Math.max(0, Math.round((position.y - next.y) * world.displayDepthScale))}m`
                  : tr`关卡 ↓ ${Math.max(0, Math.round((position.y - next.y) * world.displayDepthScale))}m`,
        );
      const edge = nearestWorldBoundary(position, world);
      const nearEdge = edge.distance < BOUNDARY_NOTICE_DISTANCE;
      container.dataset.boundary = String(nearEdge);
      const paths = [
        `M ${nw.x} ${nw.y} V ${se.y}`,
        `M ${se.x} ${nw.y} V ${se.y}`,
        `M ${nw.x} ${nw.y} H ${se.x}`,
        `M ${nw.x} ${se.y} H ${se.x}`,
      ];
      boundary.setAttribute("d", nearEdge ? paths[edge.edge] : "");
      if (nearEdge) {
        depthLabel.textContent = t("边界 · 请转向");
        container.setAttribute("aria-label", t("海域边界无法通行，请转向"));
      }
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
          const point = projectMinimapPosition(contact.position, world);
          dot.setAttribute("cx", String(point.x));
          dot.setAttribute("cy", String(point.y));
          dot.setAttribute("r", contact.boss ? "2.2" : "1.5");
          dot.setAttribute(
            "class",
            tr`minimap-contact ${contact.boss ? "is-boss" : contact.dangerous ? "is-danger" : contact.eligible ? "is-prey" : "is-neutral"}`,
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
