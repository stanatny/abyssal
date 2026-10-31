import * as T from "three";
import {
  createMuralLayout,
  createMuralState,
  MURAL_RULES,
  MURAL_SYMBOLS,
  muralCrossing,
  muralSymbol,
  stepMural,
} from "./atlantis_mural_rules.js";
import { createMuralGlyphs } from "./atlantis_mural_art.js";
import { createMuralMembrane } from "./atlantis_mural_membrane.js";
import { acquireAtlantisMonumentAsset } from "./atlantis_monument_asset.js";
import { acquireWaterwheelAsset } from "./atlantis_waterwheel_asset.js";
import { atlantisMaterials } from "./atlantis_art_geometry.js";
import { atlantisSeabedHeight } from "./atlantis_terrain.js";
import { addSurfaceDetail } from "./ocean_visuals.js";
import { t } from "./i18n.js";

/** 五处单通道与月湾圣所内的壁画；共用游戏时钟，不额外启动动画循环。 */
export function createAtlantisMuralPath(parent, records) {
  const root = new T.Group();
  root.name = "atlantis_mural_path";
  const owned = new Set(),
    keep = (r) => (owned.add(r), r),
    colliders = [],
    stations = [];
  const obelisk = acquireAtlantisMonumentAsset("obelisk"),
    panel = acquireWaterwheelAsset("gate");
  const stone = atlantisMaterials().stone;
  const bronze = keep(
    new T.MeshStandardMaterial({
      color: 0xb59a62,
      metalness: 0.62,
      roughness: 0.48,
    }),
  );
  addSurfaceDetail(bronze, "stone", 0.07);
  const gold = keep(
    new T.MeshStandardMaterial({
      color: 0xf0d59b,
      metalness: 0.45,
      roughness: 0.4,
      emissive: 0x705429,
      emissiveIntensity: 0.65,
    }),
  );
  const dark = keep(
    new T.MeshStandardMaterial({
      color: 0x143f4b,
      roughness: 0.75,
      metalness: 0.25,
    }),
  );
  addSurfaceDetail(dark, "stone", 0.1);
  const glow = keep(new T.MeshBasicMaterial({ color: 0x89e7e5 }));
  const glyphs = createMuralGlyphs(gold, keep);
  const membraneGeometry = keep(
    new T.PlaneGeometry(MURAL_RULES.halfWidth * 2, MURAL_RULES.halfHeight * 2),
  );
  const mesh = (g, m, p, group = root) => {
    const a = new T.Mesh(keep(g), m);
    a.position.fromArray(p);
    group.add(a);
    return a;
  };
  const box = (size, p, mat, group) =>
    mesh(new T.BoxGeometry(...size), mat, p, group);
  const labels = [];
  function plaque(width, height, p, group, text) {
    const canvas =
      typeof document === "undefined" ? null : document.createElement("canvas");
    let material = dark,
      texture;
    if (canvas) {
      canvas.width = 768;
      canvas.height = Math.round((768 * height) / width);
      texture = keep(new T.CanvasTexture(canvas));
      texture.colorSpace = T.SRGBColorSpace;
      material = keep(new T.MeshBasicMaterial({ map: texture }));
    }
    const node = mesh(new T.PlaneGeometry(width, height), material, p, group);
    labels.push({ canvas, texture, text, last: "" });
    return node;
  }
  function display(group, scale, p) {
    const g = new T.Group();
    g.position.fromArray(p);
    group.add(g);
    const bg = mesh(
      new T.CylinderGeometry(scale * 1.05, scale * 1.05, 0.45, 48),
      dark,
      [0, 0, -0.1],
      g,
    );
    bg.rotation.x = Math.PI / 2;
    const rim = mesh(
      new T.TorusGeometry(scale * 1.12, 0.16, 8, 64),
      bronze,
      [0, 0, 0],
      g,
    );
    const turn = new T.Group();
    g.add(turn);
    for (let n = 0; n < 12; n++) {
      const a = (n * Math.PI) / 6;
      const mark = box(
        [0.2, 0.55, 0.2],
        [Math.cos(a) * scale * 1.12, Math.sin(a) * scale * 1.12, 0.1],
        gold,
        turn,
      );
      mark.rotation.z = a - Math.PI / 2;
    }
    const icons = glyphs.map((glyph) => {
      const c = glyph.clone();
      c.scale.setScalar(scale * 0.78);
      c.position.z = 0.2;
      c.visible = false;
      g.add(c);
      return c;
    });
    return {
      group: g,
      icons,
      turn,
      rim,
      set(index) {
        icons.forEach((c, i) => (c.visible = i === index));
      },
    };
  }
  const host = records.find((r) => r.id === "harbor_sanctuary");
  if (!host) throw Error("Mural requires the built harbor sanctuary");
  const mural = new T.Group();
  mural.position.set(host.x + 28, host.upperY + 5, host.z);
  mural.rotation.y = -Math.PI / 2;
  root.add(mural);
  const backing = panel.create();
  backing.scale.set(2.6, 1.45, 1);
  mural.add(backing);
  const background = box([32, 13, 0.6], [0, 0, 0.9], dark, mural);
  box([33, 1, 0.9], [0, 6.9, 1], bronze, mural);
  box([33, 1, 0.9], [0, -6.9, 1], bronze, mural);
  const muralDisplays = [];
  for (let i = 0; i < 5; i++) {
    muralDisplays.push(display(mural, 2.4, [(i - 2) * 6, 0, 1.5]));
    plaque(3, 1.3, [(i - 2) * 6, 4.4, 1.6], mural, () => `${i + 1}`);
  }
  plaque(29, 1.5, [0, -4.8, 1.7], mural, () =>
    t("记住顺序 → 依次穿过五道符印"),
  );
  const muralPoint = new T.Vector3(host.x + 16, host.upperY + 5, host.z);
  for (let i = 0; i < 5; i++) {
    const group = new T.Group();
    group.name = `mural_gate_${i + 1}`;
    root.add(group);
    const columns = [];
    for (const x of [-23, 23]) {
      const c = new T.Mesh(obelisk.geometry, obelisk.material);
      c.userData.prepareMaterials = obelisk.prepare;
      c.position.x = x;
      group.add(c);
      columns.push(c);
      box([7, 2, 8], [x, -16, 0], bronze, group);
      box([7, 2, 8], [x, 17, 0], stone, group);
      for (const y of [-13, 14])
        box([5.3, 0.65, 5.3], [x, y, 0], bronze, group);
    }
    box([52, 3, 7], [0, 19, 0], stone, group);
    box([51, 0.55, 7.2], [0, 17.3, 0], bronze, group);
    for (let x = -22; x <= 22; x += 4) {
      box([2, 0.4, 0.25], [x, 19.6, 3.6], bronze, group);
      box([0.4, 1.2, 0.25], [x - 1, 19.2, 3.6], bronze, group);
    }
    const threshold = box([40, 0.2, 0.5], [0, -15, 0], glow, group);
    const lower = box([50, 2, 6], [0, -17, 0], stone, group);
    const disc = display(group, 5, [0, 25, 4]);
    // 盘轴、托架和横梁实体相连；图案固定可读，外缘刻度连续转动。
    const axle = mesh(
      new T.CylinderGeometry(0.65, 1.0, 6, 16),
      bronze,
      [0, 22, 1],
      group,
    );
    const bearing = mesh(
      new T.CylinderGeometry(0.9, 0.9, 4.2, 20),
      bronze,
      [0, 25, 2],
      group,
    );
    bearing.rotation.x = Math.PI / 2;
    plaque(9, 2.1, [-15, 19, 3.7], group, () => `${i + 1} / 5`);
    plaque(14, 2.1, [13, 19, 3.7], group, () =>
      t(
        i < state.completed
          ? MURAL_SYMBOLS[state.answer[i]]
          : i === state.completed && !state.solved
            ? MURAL_SYMBOLS[muralSymbol(state, i)]
            : "休眠",
      ),
    );
    const footer = plaque(27, 2.4, [0, -11, 3.6], group, () =>
      t(
        i < state.completed
          ? "已通过"
          : i === state.completed
            ? "入口 → 等待壁画对应符号"
            : "休眠 · 先完成上一道",
      ),
    );
    const arrow = mesh(new T.ConeGeometry(1.4, 3, 3), glow, [0, -13, 7], group);
    arrow.rotation.x = -Math.PI / 2;
    const membrane = createMuralMembrane(membraneGeometry, glyphs, keep);
    group.add(membrane.group);
    stations.push({
      group,
      columns,
      disc,
      threshold,
      lower,
      footer,
      arrow,
      membrane,
    });
  }
  const label =
    typeof document !== "undefined" ? document.createElement("div") : null;
  if (label) {
    label.className = "light-seal-ui mural-path-ui";
    label.id = "mural-path-ui";
    label.hidden = true;
    document.body.append(label);
  }
  let state,
    layout,
    route = 0,
    seed = 1,
    near = false,
    nearMural = false,
    disposed = false,
    pending = null,
    eligible = true;
  const nose = new T.Vector3(),
    previousNose = new T.Vector3();
  function solid(x, y, z, hx, hy, hz) {
    colliders.push({
      type: "box",
      kind: "mural_masonry",
      x,
      y,
      z,
      halfSize: { x: hx, y: hy, z: hz },
    });
  }
  const api = {
    root,
    colliders,
    barriers: colliders,
    stations,
    muralPoint,
    get state() {
      return state;
    },
    get layout() {
      return layout;
    },
    get near() {
      return near;
    },
    get entry() {
      return layout[Math.min(4, state.completed)].point;
    },
    get markers() {
      return [
        ...(!state.read ? [{ point: muralPoint, index: 0 }] : []),
        ...(!state.solved
          ? [{ point: api.entry, index: state.completed + 1 }]
          : []),
      ];
    },
    reset(nextRoute = 0, nextSeed = 1) {
      route = nextRoute;
      seed = nextSeed;
      state = createMuralState(seed);
      layout = createMuralLayout(route);
      pending = null;
      near = false;
      eligible = true;
      colliders.length = 0;
      // 墙上的壁画是实际薄板，读取区在其外侧，不挡住主廊道。
      solid(host.x + 28, host.upperY + 5, host.z, 1.5, 7.5, 17);
      const size = obelisk.geometry.boundingBox.getSize(new T.Vector3());
      stations.forEach(({ group, columns, membrane }, i) => {
        membrane.reset();
        const g = layout[i];
        group.position.copy(g.point);
        columns.forEach((c, j) => {
          const x = g.point.x + (j ? 23 : -23),
            bed = atlantisSeabedHeight(x, g.point.z) - 1,
            height = g.point.y + 18 - bed;
          c.position.y = bed - g.point.y;
          c.scale.set(5 / size.x, height / size.y, 5 / size.z);
          solid(x, bed + height / 2, g.point.z, 2.5, height / 2, 2.5);
        });
        solid(g.point.x, g.point.y + 19, g.point.z, 26, 1.5, 3.5);
        solid(g.point.x, g.point.y - 17, g.point.z, 25, 1, 3);
      });
      muralDisplays.forEach((d, i) => d.set(state.answer[i]));
      if (label) label.hidden = true;
    },
    sense(
      position,
      length,
      blocked,
      {
        from = position,
        forward,
        previousForward = forward,
        active = true,
      } = {},
    ) {
      nearMural =
        position.distanceToSquared(muralPoint) < 36 ** 2 &&
        !blocked(position, muralPoint);
      if (active && nearMural) {
        state.read = true;
        state.discovered = true;
      }
      near =
        nearMural ||
        layout.some((g) => g.point.distanceToSquared(position) < 65 ** 2);
      pending = null;
      if (!active || state.solved || !forward) return;
      nose.copy(position).addScaledVector(forward, length * 0.42);
      previousNose.copy(from).addScaledVector(previousForward, length * 0.42);
      if (from.distanceToSquared(position) > MURAL_RULES.maxSweep ** 2) return;
      const stage = state.completed,
        g = layout[stage];
      const crossing = muralCrossing(previousNose, nose, g, blocked);
      if (crossing && !blocked(position, crossing.hit))
        pending = { ...crossing, stage };
    },
    step(dt, { active = true, vulnerable = true } = {}) {
      eligible = vulnerable;
      const action = pending;
      pending = null;
      const event = stepMural(state, dt, {
        active,
        vulnerable,
        crossing: action,
      });
      if (event && action) {
        const g = layout[action.stage];
        const hit = new T.Vector2(
          0.5 + (action.hit.x - g.point.x) / (2 * g.halfWidth),
          0.5 + (action.hit.y - g.point.y) / (2 * g.halfHeight),
        );
        stations[action.stage].membrane.trigger(event.kind, hit);
      }
      return event;
    },
    hide() {
      if (label) label.hidden = true;
    },
    update(time, position, dt = 0, reduced = false) {
      if (disposed) return;
      stations.forEach(({ group, disc, threshold, arrow, membrane }, i) => {
        const current = !state.solved && i === state.completed,
          done = i < state.completed;
        const symbol = done
          ? state.answer[i]
          : current
            ? muralSymbol(state, i)
            : -1;
        disc.set(symbol);
        membrane.update(
          done ? 2 : current ? (state.cooldown > 0 ? 3 : 1) : 0,
          symbol,
          dt,
          reduced,
        );
        disc.turn.rotation.z = reduced ? 0 : current ? state.clock * 0.4 : 0;
        threshold.visible = current || done;
        arrow.visible = current && state.cooldown <= 0;
        disc.rim.material = done ? gold : current ? glow : bronze;
        group.visible = group.position.distanceToSquared(position) < 270 ** 2;
      });
      for (const l of labels) {
        const text = l.text();
        if (!l.canvas || text === l.last) continue;
        l.last = text;
        const ctx = l.canvas.getContext("2d"),
          w = l.canvas.width,
          h = l.canvas.height;
        ctx.fillStyle = "#12343d";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f3dfb1";
        ctx.font = `600 ${Math.floor(h * 0.57)}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, w / 2, h / 2, w - 20);
        l.texture.needsUpdate = true;
      }
      if (label) {
        label.hidden = !near || dt <= 0;
        label.textContent = t(
          nearMural
            ? "记住壁画的五个符号。按小地图顺序，从入口穿过对应符号的机关。错一次扣15基础生命，保留已通过进度，3秒后重试当前符印。"
            : state.solved
              ? "五道符印已解除 · 机关印记已获得"
              : state.cooldown > 0
                ? "当前符印恢复中 · 稍候重新从入口通过"
                : !eligible
                  ? "受伤保护中 · 符印暂不判定，请稍后重新通过"
                  : "已通过 {0}/5 · 第{1}道当前显示：{2}。等待记忆中的符号，从入口穿过。",
          [
            state.completed,
            Math.min(5, state.completed + 1),
            t(MURAL_SYMBOLS[muralSymbol(state, Math.min(4, state.completed))]),
          ],
        );
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      label?.remove();
      root.removeFromParent();
      root.clear();
      owned.forEach((r) => r.dispose());
      owned.clear();
      obelisk.release();
      panel.release();
      colliders.length = 0;
    },
  };
  root.userData.prepareMaterials = async (options) =>
    (
      await Promise.all([obelisk.prepare(options), panel.prepare(options)])
    ).every(Boolean);
  api.reset();
  parent.add(root);
  return api;
}
