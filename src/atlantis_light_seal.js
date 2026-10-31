import * as THREE from "three";
import {
  createLightLayout,
  createLightState,
  stepLight,
  traceLight,
} from "./atlantis_light_rules.js";
import { acquireAtlantisMonumentAsset } from "./atlantis_monument_asset.js";
import { acquireWaterwheelAsset } from "./atlantis_waterwheel_asset.js";
import { createWaterwheelContact } from "./atlantis_waterwheel_contact.js";
import { atlantisSeabedHeight } from "./atlantis_terrain.js";
import { castSegment } from "./collision.js";
import { t } from "./i18n.js";

/** 分布式反射台复用已验收的HF碑石与铜阀；光面和四档机械环是独立功能组件。 */
export function createAtlantisLightSeal(
  parent,
  { target, staticColliders, awaken },
) {
  const root = new THREE.Group();
  root.name = "atlantis_light_seal";
  const owned = new Set(),
    keep = (r) => (owned.add(r), r);
  const obelisk = acquireAtlantisMonumentAsset("obelisk"),
    valve = acquireWaterwheelAsset("valve");
  const bronze = keep(
    new THREE.MeshStandardMaterial({
      color: 0xb99b62,
      metalness: 0.65,
      roughness: 0.38,
    }),
  );
  const glass = keep(
    new THREE.MeshStandardMaterial({
      color: 0x94dfdf,
      emissive: 0x287078,
      emissiveIntensity: 0.5,
      metalness: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  const beamMat = keep(
    new THREE.MeshBasicMaterial({
      color: 0xa6fff0,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
    }),
  );
  const glowMat = keep(
    new THREE.MeshBasicMaterial({
      color: 0x72efec,
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
    }),
  );
  const cylinder = keep(new THREE.CylinderGeometry(1, 1, 1, 8)),
    circle = keep(new THREE.CircleGeometry(4.8, 64));
  const ringGeo = keep(new THREE.TorusGeometry(5.25, 0.22, 10, 72));
  const up = new THREE.Vector3(0, 1, 0),
    front = new THREE.Vector3(0, 0, 1);
  const beams = Array.from({ length: 16 }, () => {
    const g = new THREE.Group();
    for (const [mat, r] of [
      [beamMat, 0.18],
      [glowMat, 0.7],
    ]) {
      const m = new THREE.Mesh(cylinder, mat);
      m.scale.set(r, 1, r);
      g.add(m);
    }
    root.add(g);
    return g;
  });
  const stations = [],
    controls = [],
    colliders = [],
    normals = [],
    rotations = [];
  let layout,
    state,
    contact,
    near = false,
    action = null,
    disposed = false,
    lastTrace = { segments: [], reached: [], hit: false };
  const nose = new THREE.Vector3(),
    previousNose = new THREE.Vector3();
  let traceClock = 0,
    traceKey = "";
  const source = new THREE.Mesh(
    keep(new THREE.IcosahedronGeometry(2.5, 2)),
    glass,
  );
  root.add(source);
  const sourceTower = new THREE.Mesh(obelisk.geometry, obelisk.material);
  sourceTower.userData.prepareMaterials = obelisk.prepare;
  root.add(sourceTower);
  const sourceStem = new THREE.Mesh(
    keep(new THREE.CylinderGeometry(0.4, 0.8, 10, 10)),
    bronze,
  );
  root.add(sourceStem);
  const receiver = new THREE.Mesh(
    keep(new THREE.TorusGeometry(5, 0.14, 8, 72)),
    bronze,
  );
  receiver.position.copy(target);
  root.add(receiver);
  for (let i = 0; i < 5; i++) {
    const tower = new THREE.Group(),
      mirror = new THREE.Group();
    tower.name = `reflection_station_${i + 1}`;
    const stone = new THREE.Mesh(obelisk.geometry, obelisk.material);
    stone.userData.prepareMaterials = obelisk.prepare;
    const size = obelisk.geometry.boundingBox.getSize(new THREE.Vector3());
    stone.scale.set(12 / size.x, 76 / size.y, 12 / size.z);
    stone.position.y = -84;
    tower.add(stone);
    const drum = valve.create();
    drum.position.set(0, -8, 0);
    tower.add(drum);
    const face = new THREE.Mesh(circle, glass),
      rim = new THREE.Mesh(ringGeo, bronze);
    mirror.add(face, rim);
    tower.add(mirror);
    const support = new THREE.Mesh(
      keep(new THREE.CylinderGeometry(0.42, 0.9, 7.4, 16)),
      bronze,
    );
    support.position.y = -3.7;
    support.name = "mirror_swivel_stem";
    tower.add(support);
    const pivot = new THREE.Mesh(
      keep(new THREE.SphereGeometry(0.65, 16, 12)),
      bronze,
    );
    tower.add(pivot);
    // 刻度属于底座，不随反射盘倾斜；头部接触前伸的铜阀即可换档。
    const wheel = new THREE.Mesh(
      keep(new THREE.TorusGeometry(2, 0.28, 8, 40)),
      bronze,
    );
    wheel.position.set(0, -7, 6);
    wheel.name = "mirror_control_wheel";
    tower.add(wheel);
    // 铜轮前伸便于头部触碰，实体轴贯穿轮毂并插入原HF机箱；不能只画浮空圆环。
    function fitting(name, geometry, position) {
      const part = new THREE.Mesh(keep(geometry), bronze);
      part.name = name;
      part.position.fromArray(position);
      tower.add(part);
      return part;
    }
    function axle(name, radius, length, z) {
      const part = fitting(
        name,
        new THREE.CylinderGeometry(radius, radius, length, 20),
        [0, -7, z],
      );
      part.rotation.x = Math.PI / 2;
      return part;
    }
    axle("control_drive_shaft", 0.46, 6.1, 3.05);
    axle("gearbox_bearing", 0.95, 1.6, 2.0);
    axle("wheel_hub", 0.74, 0.7, 6.0);
    axle("bearing_retaining_ring", 1.1, 0.18, 2.8);
    fitting(
      "stone_crown_socket",
      new THREE.CylinderGeometry(1.4, 1.1, 1.4, 8),
      [0, -11, 0],
    );
    // 刻度牌由固定轴承座托住，不随手轮旋转，也不能漂在铜轮上方。
    for (const x of [-2.4, 2.4]) {
      const a = new THREE.Vector3(x, -9, 0.8),
        b = new THREE.Vector3(x, -4.2, 6.1),
        delta = b.clone().sub(a);
      const brace = fitting(
        "plaque_support_brace",
        new THREE.CylinderGeometry(0.22, 0.32, delta.length(), 12),
        a.clone().add(b).multiplyScalar(0.5).toArray(),
      );
      brace.quaternion.setFromUnitVectors(up, delta.normalize());
      const bolt = fitting(
        "plaque_mount_bolt",
        new THREE.CylinderGeometry(0.22, 0.22, 0.5, 6),
        [x, -3.8, 6.35],
      );
      bolt.rotation.x = Math.PI / 2;
    }
    const spokes = keep(new THREE.BoxGeometry(0.28, 3.7, 0.3));
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(spokes, bronze);
      s.rotation.z = (k * Math.PI) / 4;
      wheel.add(s);
    }
    root.add(tower);
    let plaque = null,
      canvas = null,
      texture = null;
    if (typeof document !== "undefined") {
      canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      texture = keep(new THREE.CanvasTexture(canvas));
      texture.colorSpace = THREE.SRGBColorSpace;
      const mat = keep(
        new THREE.MeshBasicMaterial({ map: texture, transparent: false }),
      );
      plaque = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 2.25)), mat);
      plaque.position.set(0, -3, 6.4);
      tower.add(plaque);
    }
    stations.push({
      tower,
      mirror,
      wheel,
      stone,
      canvas,
      texture,
      plaque,
      text: "",
    });
    controls.push(new THREE.Vector3());
    normals.push(front.clone());
    rotations.push(new THREE.Quaternion());
  }
  const label = documentOrNull();
  if (label) {
    label.id = "light-seal-ui";
    label.className = "light-seal-ui";
    label.hidden = true;
    document.body.append(label);
  }
  function obstruction(a, b) {
    const hit = castSegment(a, b, [...staticColliders, ...colliders], 0);
    let endpoint = hit ? a.clone().lerp(b, hit.time) : null;
    const d = a.distanceTo(b),
      steps = Math.ceil(d / 2);
    for (let i = 1; i <= steps; i++) {
      const p = a.clone().lerp(b, i / steps);
      if (p.y < atlantisSeabedHeight(p.x, p.z) + 0.3) {
        if (!endpoint || a.distanceToSquared(p) < a.distanceToSquared(endpoint))
          endpoint = p;
        break;
      }
    }
    return endpoint;
  }
  const api = {
    root,
    colliders,
    barriers: colliders,
    controls,
    stations,
    get state() {
      return state;
    },
    get near() {
      return near;
    },
    get layout() {
      return layout;
    },
    get trace() {
      return lastTrace;
    },
    get entry() {
      return layout.source;
    },
    reset(route = 0) {
      state = createLightState();
      traceClock = 0;
      traceKey = "";
      layout = createLightLayout(route, target.toArray());
      source.position.copy(layout.source);
      sourceStem.position.copy(layout.source).add(new THREE.Vector3(0, -7, 0));
      const height = 84 + (route === 2 ? 30 : 0),
        size = obelisk.geometry.boundingBox.getSize(new THREE.Vector3());
      sourceTower.position
        .copy(layout.source)
        .add(new THREE.Vector3(0, -height, 0));
      sourceTower.scale.set(12 / size.x, (height - 12) / size.y, 12 / size.z);
      colliders.length = 0;
      colliders.push({
        type: "box",
        kind: "light_source_tower",
        x: layout.source.x,
        y: layout.source.y - (height + 12) / 2,
        z: layout.source.z,
        halfSize: { x: 6, y: (height - 12) / 2, z: 6 },
      });
      stations.forEach(({ tower, mirror, wheel, stone }, i) => {
        const p = layout.mirrors[i].point;
        tower.position.copy(p);
        const height = 84 + (route === 2 ? 30 : 0);
        const size = obelisk.geometry.boundingBox.getSize(new THREE.Vector3());
        stone.position.y = -height;
        stone.scale.y = (height - 8) / size.y;
        controls[i].copy(p).add(new THREE.Vector3(0, -7, 6.35));
        rotations[i].setFromUnitVectors(
          front,
          layout.mirrors[i].normals[state.detents[i]],
        );
        mirror.quaternion.copy(rotations[i]);
        normals[i].copy(front).applyQuaternion(mirror.quaternion);
        wheel.rotation.z = (state.detents[i] * Math.PI) / 2;
        colliders.push({
          type: "box",
          kind: "reflection_tower",
          site: layout.mirrors[i].id,
          x: p.x,
          y: p.y - (height + 8) / 2,
          z: p.z,
          halfSize: { x: 6, y: (height - 8) / 2, z: 6 },
        });
        colliders.push({
          type: "box",
          kind: "reflection_control",
          x: p.x,
          y: p.y - 7,
          z: p.z + 6,
          halfSize: { x: 2.2, y: 2.2, z: 0.2 },
        });
      });
      contact = createWaterwheelContact(controls);
      near = false;
      action = null;
      lastTrace = traceLight(layout, normals, obstruction);
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
      near = stations.some(
        ({ tower }) => tower.position.distanceToSquared(position) < 55 ** 2,
      );
      if (near) state.discovered = true;
      action = null;
      if (!forward) return;
      nose.copy(position).addScaledVector(forward, length * 0.42);
      previousNose.copy(from).addScaledVector(previousForward, length * 0.42);
      const touched = contact.sample(previousNose, nose, {
        active: active && !state.solved,
        front: position,
        blocked: (p) => blocked(position, p),
      });
      if (touched) action = Number(touched.slice(5));
    },
    step(dt, { active = true } = {}) {
      if (!active) return null;
      const touched = action;
      action = null;
      const settled = stations.every(
        ({ mirror }, i) => mirror.quaternion.angleTo(rotations[i]) < 0.005,
      );
      const event = stepLight(state, dt, {
        active,
        action: touched,
        hit: lastTrace.hit,
        settled,
      });
      if (event?.kind === "turned")
        rotations[event.index].setFromUnitVectors(
          front,
          layout.mirrors[event.index].normals[state.detents[event.index]],
        );
      if (event?.kind === "solved") awaken();
      return event;
    },
    update(time, position, dt = 0, reduced = false) {
      if (disposed) return;
      stations.forEach((station, i) => {
        const { mirror, wheel, canvas, texture } = station;
        const text = `${["I", "II", "III", "IV", "V"][i]}    ${[0, 1, 2, 3].map((v) => (v === state.detents[i] ? "●" : "○")).join("  ")}`;
        if (canvas && station.text !== text) {
          station.text = text;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#18383f";
          ctx.fillRect(0, 0, 512, 128);
          ctx.fillStyle = "#ebd7a3";
          ctx.font = "bold 50px system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(text, 256, 64);
          texture.needsUpdate = true;
        }

        mirror.quaternion.rotateTowards(rotations[i], dt * 1.8);
        normals[i].copy(front).applyQuaternion(mirror.quaternion);
        wheel.rotation.z = THREE.MathUtils.damp(
          wheel.rotation.z,
          (state.detents[i] * Math.PI) / 2,
          6,
          dt,
        );
      });
      traceClock += dt;
      if (!state.solved && traceClock >= 0.06) {
        traceClock = 0;
        const key = normals
          .map((n) =>
            n
              .toArray()
              .map((v) => v.toFixed(5))
              .join(","),
          )
          .join(";");
        if (key !== traceKey) {
          traceKey = key;
          lastTrace = traceLight(layout, normals, obstruction);
        }
      }
      beams.forEach((g, i) => {
        const s = lastTrace.segments[i];
        g.visible = !!s;
        if (!s) return;
        const delta = s.to.clone().sub(s.from);
        g.position.copy(s.from).add(s.to).multiplyScalar(0.5);
        g.quaternion.setFromUnitVectors(up, delta.clone().normalize());
        g.scale.y = delta.length();
      });
      receiver.material = state.solved ? glass : bronze;
      if (label) {
        label.hidden = !near || dt <= 0;
        label.textContent = t(
          state.solved
            ? "光照封印已解除 · 神像苏醒"
            : "光照封印：头部碰触铜轮，四档循环。离开再碰换一档。沿光束寻找下一座镜塔，让光照到波塞冬胸前的圆环。无需试闸，不扣血。",
        );
      }
      void time;
      void position;
      void reduced;
    },
    hide() {
      if (label) label.hidden = true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      owned.forEach((r) => r.dispose());
      obelisk.release();
      valve.release();
      label?.remove();
    },
  };
  api.reset();
  parent.add(root);
  return api;
}
function documentOrNull() {
  return typeof document === "undefined"
    ? null
    : document.createElement("aside");
}
