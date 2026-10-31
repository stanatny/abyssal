import { atlantisSeabedHeight } from "./atlantis_terrain.js";
import { atlantisMaterials } from "./atlantis_art_geometry.js";
import * as THREE from "three";
import { acquireWaterwheelAsset } from "./atlantis_waterwheel_asset.js";
import {
  createWaterwheelState,
  stepWaterwheel,
  waterwheelSettled,
} from "./atlantis_waterwheel_rules.js";
import { createWaterwheelContact } from "./atlantis_waterwheel_contact.js";
import { t } from "./i18n.js";
import { addSurfaceDetail } from "./ocean_visuals.js";

/** 市集中段的独立水工台；保留中央竖井和主通道，零额外灯，沿用海域活动循环。 */
export function createAtlantisWaterwheel(parent, records) {
  const host = records.find((r) => r.id === "agora_bridges");
  if (!host) throw Error("Waterwheel requires the built Agora");
  const root = new THREE.Group();
  root.name = "atlantis_waterwheel_gate";
  root.position.set(host.x, host.lowerY - 15, host.z - 26);
  parent.add(root);
  const owned = new Set(),
    keep = (r) => (owned.add(r), r),
    colliders = [];
  const mat = (color, metalness = 0, emissive = 0) =>
    keep(
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.65,
        metalness,
        emissive,
        emissiveIntensity: 0.3,
      }),
    );
  const bronze = mat(0xa88a50, 0.55),
    stone = atlantisMaterials().stone,
    lapis = mat(0x365873, 0.2),
    light = mat(0x88efcf, 0.1, 0x56cbb2),
    dark = mat(0x163a46, 0.2);
  addSurfaceDetail(bronze, "stone", 0.055);
  const mesh = (g, m, p, name, group = root) => {
    const n = new THREE.Mesh(keep(g), m);
    n.name = name;
    n.position.fromArray(p);
    group.add(n);
    return n;
  };
  const box = (w, h, d, p, m, name, solid = false) => {
    const n = mesh(new THREE.BoxGeometry(w, h, d), m, p, name);
    if (solid)
      colliders.push({
        type: "box",
        kind: "atlantis_waterwheel",
        site: host.id,
        x: root.position.x + p[0],
        y: root.position.y + p[1],
        z: root.position.z + p[2],
        halfSize: { x: w / 2, y: h / 2, z: d / 2 },
      });
    return n;
  };
  const tube = (points, r, m, name) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "centripetal",
    );
    return {
      curve,
      mesh: mesh(
        new THREE.TubeGeometry(curve, 40, r, 8, false),
        m,
        [0, 0, 0],
        name,
      ),
    };
  };
  // 北段平台支承机关；中心竖井仍保留26米以上的开口，不改旧主通路。
  box(53, 2, 22, [0, 0, -1], stone, "waterworks_dais", true);
  box(51, 0.4, 21, [0, 1.2, -1], lapis, "lapis_floor_inlay");
  for (const x of [-25, 25]) box(1, 1.5, 22, [x, 1.7, -1], stone, "dais_edge");
  for (let x = -24; x <= 24; x += 4)
    box(2.4, 0.16, 0.5, [x, 1.5, 9], bronze, "dais_greek_key");
  for (const x of [-24, 24])
    for (const z of [-10, 8]) {
      const ground =
        atlantisSeabedHeight(root.position.x + x, root.position.z + z) -
        root.position.y;
      const h = Math.max(1, -ground);
      box(2.5, h, 2.5, [x, -h / 2, z], stone, "waterworks_support", true);
      box(4, 1, 4, [x, -h, z], stone, "waterworks_footing", true);
    }
  const valveAsset = acquireWaterwheelAsset("valve"),
    gateAsset = acquireWaterwheelAsset("gate");
  owned.add({ dispose: valveAsset.release });
  owned.add({ dispose: gateAsset.release });
  valveAsset.prepare();
  gateAsset.prepare();
  root.userData.prepareMaterials = async (options) =>
    (
      await Promise.all([
        valveAsset.prepare(options),
        gateAsset.prepare(options),
      ])
    ).every(Boolean);
  const wheels = [],
    wheelAngles = Array(6).fill(0);
  const wheel = (p, r, name) => {
    const g = new THREE.Group();
    g.position.fromArray(p);
    g.name = name;
    root.add(g);
    mesh(
      new THREE.TorusGeometry(r, 0.16, 8, 40),
      bronze,
      [0, 0, 0],
      "wheel_rim",
      g,
    );
    mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 0.45, 16),
      bronze,
      [0, 0, 0],
      "wheel_hub",
      g,
    ).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const spoke = mesh(
        new THREE.BoxGeometry(0.14, r * 1.75, 0.18),
        bronze,
        [0, 0, 0],
        "wheel_spoke",
        g,
      );
      spoke.rotation.z = (i * Math.PI) / 3;
    }
    mesh(
      new THREE.SphereGeometry(0.23, 12, 8),
      light,
      [0, r, 0],
      "wheel_pointer",
      g,
    );
    return g;
  };
  const stations = Array.from({ length: 6 }, (_, i) => ({
    x: -21 + (i % 3) * 10,
    y: i < 3 ? 5.8 : 14.8,
  }));
  box(29, 1.2, 5.5, [-11, 10.1, 2], stone, "upper_valve_beam", true);
  for (const x of [-25, 3])
    box(1.3, 9, 2, [x, 6, 0], stone, "upper_valve_support", true);
  const plaques = [];
  const plaque = (p, w, h, name) => {
    box(
      w + 0.4,
      h + 0.4,
      0.3,
      [p[0], p[1], p[2] - 0.2],
      bronze,
      name + "_frame",
    );
    const canvas =
      typeof document !== "undefined" ? document.createElement("canvas") : null;
    let texture,
      material = dark;
    if (canvas) {
      canvas.width = 512;
      canvas.height = 160;
      texture = keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      material = keep(
        new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      );
    }
    const n = mesh(new THREE.PlaneGeometry(w, h), material, p, name);
    const entry = { n, canvas, texture, text: null };
    plaques.push(entry);
    return entry;
  };
  for (const [i, { x, y }] of stations.entries()) {
    if (i < 3) box(6.8, 2.3, 5, [x, 2.5, 2], stone, "valve_plinth", true);
    else box(6.8, 1.95, 5, [x, 11.67, 2], stone, "valve_plinth", true);
    const v = valveAsset.create();
    v.scale.setScalar(0.72);
    v.position.set(x, y, 2);
    root.add(v);
    colliders.push({
      type: "box",
      kind: "atlantis_waterwheel",
      site: host.id,
      x: root.position.x + x,
      y: root.position.y + y,
      z: root.position.z + 2,
      halfSize: { x: 2.9, y: 2.16, z: 1.4 },
    });
    tube(
      [
        [x, y + 0.2, 3.4],
        [x, y + 0.2, 9],
      ],
      0.3,
      bronze,
      `valve_${i}_extension`,
    );
    wheels.push(wheel([x, y + 0.2, 9], 1.6, `valve_${i}`));
    colliders.push({
      type: "box",
      kind: "atlantis_waterwheel",
      site: host.id,
      x: root.position.x + x,
      y: root.position.y + y + 0.2,
      z: root.position.z + 9,
      halfSize: { x: 1.8, y: 1.8, z: 0.2 },
    });
    plaque([x, y + 3, 9.2], 6.4, 1.8, `valve_${i}_inscription`);
  }
  // 外露水路的窄观测槽让粒子沿真实管道移动；泄水支路通往下方排水口。
  const streams = [];
  const stream = (points, active, name) => {
    const path = tube(points, 0.52, dark, name + "_pipe");
    const inspection = tube(
      points.map(([x, y, z]) => [x, y, z + 0.46]),
      0.12,
      light,
      name + "_inspection",
    );
    const g = new THREE.InstancedMesh(
      keep(new THREE.SphereGeometry(0.23, 6, 4)),
      light,
      16,
    );
    g.name = name + "_flow";
    root.add(g);
    streams.push({ curve: path.curve, g, active, inspection: inspection.mesh });
    for (const p of [points[0], points.at(-1)]) {
      const f = mesh(
        new THREE.TorusGeometry(0.7, 0.15, 6, 16),
        bronze,
        p,
        "pipe_flange",
      );
      f.rotation.y = Math.PI / 2;
    }
  };
  // 六条独立定量支路汇入同一密闭计量罐；流动只表现水位调整，不额外累加。
  stations.forEach(({ x, y }, i) =>
    stream(
      [
        [x, y, 1],
        [x + 3.5, y, 1],
        [x + 3.5, 19, -2.5],
        [14, 19, -2.5],
        [15, 11, 0],
      ],
      (s) => s.valves[i] && !waterwheelSettled(s),
      `metered_feed_${i}`,
    ),
  );
  mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 9, 32),
    bronze,
    [15, 6, 0],
    "sealed_level_chamber",
  );
  for (const y of [2, 5, 8, 10])
    mesh(
      new THREE.TorusGeometry(2.4, 0.16, 6, 32),
      lapis,
      [15, y, 0],
      "tank_band",
    ).rotation.x = Math.PI / 2;
  // 正面窄观察窗显示真实水位，金色目标线固定，不随答案改变颜色。
  box(3.8, 7.6, 0.4, [15, 6, 2.2], bronze, "level_window_frame");
  box(3.3, 7.1, 0.12, [15, 6, 2.45], dark, "level_window_back");
  const waterLevel = box(
    2.8,
    1,
    0.07,
    [15, 2.5, 2.55],
    light,
    "visible_water_level",
  );
  for (let i = 0; i <= 10; i++)
    box(
      i % 5 === 0 ? 0.8 : 0.4,
      0.05,
      0.1,
      [16.5, 2.5 + i * 0.7, 2.65],
      bronze,
      "water_level_tick",
    );
  const targetLine = box(
    4.2,
    0.13,
    0.12,
    [15, 6, 2.75],
    bronze,
    "target_water_level",
  );
  const targetPlaque = plaque([15, 12, 3], 8.5, 2.2, "target_inscription");
  const turbine = wheel([21, 6, 1], 2.6, "driven_waterwheel");
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5,
      n = mesh(
        new THREE.BoxGeometry(1, 0.8, 0.6),
        bronze,
        [Math.sin(a) * 2.1, Math.cos(a) * 2.1, 0],
        "paddle",
        turbine,
      );
    n.rotation.z = -a;
  }
  // 水轮后轴、闭合传动链与上方卷扬轴相接；升闸时收短吊链。
  tube(
    [
      [15, 5, 0],
      [19, 5, 0],
      [21, 6, 0],
    ],
    0.42,
    bronze,
    "turbine_feed",
  );
  const shaft = (a, b, radius, name) => {
    const from = new THREE.Vector3(...a),
      to = new THREE.Vector3(...b);
    const delta = to.clone().sub(from);
    const n = mesh(
      new THREE.CylinderGeometry(radius, radius, delta.length(), 12),
      bronze,
      from.add(to).multiplyScalar(0.5).toArray(),
      name,
    );
    n.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return n;
  };
  shaft([21, 6, 1], [21, 6, -7], 0.3, "turbine_rear_axle");
  const drivePulley = wheel([21, 6, -7], 0.8, "drive_pulley");
  const winchPulley = wheel([15, 27, -7], 0.8, "winch_pulley");
  tube(
    [
      [21.8, 6, -7],
      [15.8, 27, -7],
      [15, 27.8, -7],
      [14.2, 27, -7],
      [20.2, 6, -7],
      [21, 5.2, -7],
      [21.8, 6, -7],
    ],
    0.12,
    bronze,
    "closed_drive_chain",
  );
  shaft([2, 27, -7.7], [15, 27, -7.7], 0.28, "gate_winch_axle");
  for (const x of [2, 12]) {
    mesh(
      new THREE.TorusGeometry(0.65, 0.18, 8, 20),
      bronze,
      [x, 27, -7.7],
      "lift_chain_drum",
    ).rotation.y = Math.PI / 2;
  }
  for (const x of [-1, 15]) {
    box(2, 28, 3, [x, 15, -8], stone, "gate_pier", true);
    for (const y of [2, 7, 13, 18, 24, 28])
      box(2.6, 0.6, 3.5, [x, y, -8], lapis, "gate_pier_band");
  }
  box(18, 2, 4, [7, 29, -8], stone, "gate_lintel", true);
  const gate = gateAsset.create();
  gate.position.set(7, 7, -8);
  root.add(gate);
  const gateCollider = {
    type: "box",
    kind: "atlantis_waterwheel",
    site: host.id,
    x: root.position.x + 7,
    y: root.position.y + 7,
    z: root.position.z - 8,
    halfSize: { x: 6.5, y: 5, z: 0.8 },
  };

  const seal = mesh(
    new THREE.OctahedronGeometry(1.4, 0),
    light,
    [7, 5, -10],
    "mechanism_seal",
  );
  const chains = [];
  for (const x of [2, 12])
    for (let i = 0; i < 24; i++) {
      const link = mesh(
        new THREE.TorusGeometry(0.25, 0.07, 6, 10),
        bronze,
        [x, 12.4 + i * 0.65, -7.7],
        "lift_chain",
      );
      link.rotation.y = i % 2 ? Math.PI / 2 : 0;
      chains.push(link);
    }
  // 独立总阀前伸到开阔水域，轮盘就是触点；复用铜阀资产，避免隐藏按钮。
  box(6, 3, 5, [15, 3, 8], stone, "master_valve_plinth", true);
  const master = valveAsset.create();
  master.scale.setScalar(0.8);
  master.position.set(15, 7, 8);
  root.add(master);
  colliders.push({
    type: "box",
    kind: "atlantis_waterwheel",
    site: host.id,
    x: root.position.x + 15,
    y: root.position.y + 7,
    z: root.position.z + 8,
    halfSize: { x: 3.2, y: 2.4, z: 1.52 },
  });
  tube(
    [
      [15, 7.2, 9.5],
      [15, 7.2, 12],
    ],
    0.3,
    bronze,
    "master_valve_extension",
  );
  const masterWheel = wheel([15, 7.2, 12], 2.1, "master_test_valve");
  colliders.push({
    type: "box",
    kind: "atlantis_waterwheel",
    site: host.id,
    x: root.position.x + 15,
    y: root.position.y + 7.2,
    z: root.position.z + 12,
    halfSize: { x: 2.3, y: 2.3, z: 0.2 },
  });
  const masterPlaque = plaque(
    [15, 11, 12.2],
    9,
    2.2,
    "master_test_inscription",
  );
  const controls = [
    ...stations.map(({ x, y }) => new THREE.Vector3(x, y + 0.2, 9.45)),
    new THREE.Vector3(15, 7.2, 12.45),
  ].map((p) => p.add(root.position));
  const contact = createWaterwheelContact(controls),
    nose = new THREE.Vector3(),
    previousNose = new THREE.Vector3();
  const local = new THREE.Vector3(),
    dummy = new THREE.Object3D(),
    flowAxis = new THREE.Vector3(1, 0, 0);
  let disposed = false,
    near = false,
    action = null,
    notice = "",
    state = createWaterwheelState();
  const api = {
    root,
    colliders,
    controls,
    barriers: [gateCollider],
    entry: new THREE.Vector3(host.x, host.lowerY, host.z + 69),
    get state() {
      return state;
    },
    get near() {
      return near;
    },
    get notice() {
      return notice;
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
      local.copy(position).sub(root.position);
      near =
        Math.abs(local.x) < 44 &&
        local.y > -3 &&
        local.y < 32 &&
        local.z > -14 &&
        local.z < 70;
      action = null;
      if (!forward) return;
      // 使用碰撞身体的鼻端，而非鱿鱼位于尾侧的进食点；体型不扩大隐形交互范围。
      nose.copy(position).addScaledVector(forward, length * 0.42);
      previousNose.copy(from).addScaledVector(previousForward, length * 0.42);
      action = contact.sample(previousNose, nose, {
        active: active && near && !state.solved,
        front: position,
        blocked: (point) => blocked(position, point),
      });
    },
    step(dt, options = {}) {
      const touched = action;
      action = null;
      if (touched === "test") {
        notice =
          state.cooldown > 0
            ? "cooldown"
            : !waterwheelSettled(state)
              ? "settling"
              : options.vulnerable === false
                ? "protected"
                : "";
      } else if (touched) notice = touched;
      const event = stepWaterwheel(state, dt, {
        ...options,
        action: touched,
        nearby: near,
      });
      if (event) notice = event.kind;
      return event;
    },
    update(time, position, dt = 0, reduced = false) {
      if (disposed) return;
      root.visible = root.position.distanceToSquared(position) < 230 ** 2;
      if (!root.visible) return;
      wheels.forEach((w, i) => {
        wheelAngles[i] = THREE.MathUtils.damp(
          wheelAngles[i],
          state.valves[i] ? Math.PI / 2 : 0,
          7,
          dt,
        );
        w.rotation.z = wheelAngles[i];
      });
      const capacity = state.amounts.reduce((a, b) => a + b, 0);
      const height = Math.max(0.01, state.pressure * 7);
      waterLevel.scale.y = height;
      waterLevel.position.y = 2.5 + height / 2;
      targetLine.position.y = 2.5 + (state.target / capacity) * 7;
      const names = ["I", "II", "III", "IV", "V", "VI"];
      plaques.forEach((p, i) => {
        const text =
          p === masterPlaque
            ? t("碰触试闸")
            : p === targetPlaque
              ? `= ${state.target}`
              : `${names[i]}  +${state.amounts[i]}  ${state.valves[i] ? "●" : "○"}`;
        if (p.text === text) return;
        p.text = text;
        p.n.userData.inscription = text;
        if (!p.canvas) return;
        const ctx = p.canvas.getContext("2d");
        ctx.fillStyle = "#142f39";
        ctx.fillRect(0, 0, 512, 160);
        ctx.fillStyle = "#eed5a0";
        ctx.font = "bold 68px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 256, 82);
        p.texture.needsUpdate = true;
      });
      masterWheel.rotation.z = (-state.opening * Math.PI) / 2;
      turbine.rotation.z -= dt * (state.solved ? 2.4 : 0);
      drivePulley.rotation.z = turbine.rotation.z;
      winchPulley.rotation.z = turbine.rotation.z;
      chains.forEach((link, i) => {
        link.position.y = 12.4 + state.opening * 10 + (i % 24) * 0.65;
        link.visible = link.position.y < 27;
      });
      gate.position.y = 7 + state.opening * 10;
      gateCollider.y = root.position.y + gate.position.y;
      seal.visible = state.solved;
      seal.rotation.y = time * 0.4;
      streams.forEach(({ curve, g, active, inspection }) => {
        inspection.visible = active(state);
        g.visible = active(state);
        if (!g.visible) return;
        for (let i = 0; i < 16; i++) {
          dummy.position.copy(
            curve.getPointAt(((reduced ? 0 : time * 0.35) + i / 16) % 1),
          );
          dummy.position.z += 0.62;
          dummy.scale.set(2.4, 0.42, 0.42);
          dummy.quaternion.setFromUnitVectors(
            flowAxis,
            curve.getTangentAt(((reduced ? 0 : time * 0.35) + i / 16) % 1),
          );
          dummy.updateMatrix();
          g.setMatrixAt(i, dummy.matrix);
        }
        g.instanceMatrix.needsUpdate = true;
      });
    },
    reset() {
      state = createWaterwheelState();
      wheelAngles.fill(0);
      wheels.forEach((w) => (w.rotation.z = 0));
      gate.position.y = 7;
      gateCollider.y = root.position.y + 7;
      near = false;
      action = null;
      notice = "";
      contact.reset();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.traverse((n) => {
        if (n.isInstancedMesh) n.dispose();
      });
      root.removeFromParent();
      owned.forEach((r) => r.dispose());
      owned.clear();
      colliders.length = 0;
    },
  };
  return api;
}
