import * as THREE from "three";
import { MINION_RULES } from "./zombie_shark_rules.js";
import { createFluidTexture } from "./effect_textures.js";

/** 真实侧腹血肉剥离、凝成仆从及尸爆：双槽复用，不新增灯光、伤害或时钟。 */
export function createMinionTransitionEffect(
  parent,
  { reducedMotion = () => false } = {},
) {
  const group = new THREE.Group();
  group.name = "minion_transitions";
  parent.add(group);
  const arcGeometry = new THREE.TorusGeometry(1, 0.012, 3, 36, Math.PI * 1.55);
  const ribGeometry = new THREE.TorusGeometry(1, 0.018, 3, 24, Math.PI * 1.3);
  const fleshGeometry = new THREE.SphereGeometry(1, 8, 6);
  const p = fleshGeometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const rough = 1 + Math.sin(x * 13 + y * 7 + z * 11) * 0.18;
    p.setXYZ(i, x * rough, y * rough, z * rough);
  }
  fleshGeometry.computeVertexNormals();
  const cordGeometry = new THREE.CylinderGeometry(0.007, 0.012, 1, 6, 1);
  const jawGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.05, -0.46),
      new THREE.Vector3(0.04, -0.065, -0.4),
      new THREE.Vector3(0.075, -0.055, -0.31),
      new THREE.Vector3(0.065, -0.01, -0.25),
    ]),
    16,
    0.005,
    4,
    false,
  );
  const texture = createFluidTexture("mist");
  const material = (color, flesh = false) =>
    flesh
      ? new THREE.MeshStandardMaterial({
          color,
          roughness: 0.63,
          emissive: 0x370b13,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        })
      : new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
          blending: THREE.AdditiveBlending,
        });
  const mesh = (root, geometry, color, flesh = false) => {
    const part = new THREE.Mesh(geometry, material(color, flesh));
    root.add(part);
    return part;
  };
  const slots = Array.from({ length: 2 }, (_, index) => {
    const root = new THREE.Group();
    root.name = `minion_transition_${index}`;
    root.visible = false;
    group.add(root);
    const arcs = Array.from({ length: 3 }, () =>
      mesh(root, arcGeometry, 0xd45362),
    );
    const ribs = Array.from({ length: 6 }, () =>
      mesh(root, ribGeometry, 0xb99b83, true),
    );
    const cords = Array.from({ length: 2 }, () =>
      mesh(root, new THREE.CylinderGeometry(1, 1, 1, 6, 8), 0x8b2034, true),
    );
    for (const cord of cords)
      cord.userData.template = cord.geometry.attributes.position.array.slice();
    const flesh = Array.from({ length: 6 }, (_, i) =>
      mesh(root, fleshGeometry, i % 3 === 0 ? 0xd0b89f : 0x962e3b, true),
    );
    const spine = mesh(root, cordGeometry, 0xb8a18c, true);
    const jaws = Array.from({ length: 2 }, () =>
      mesh(root, jawGeometry, 0xbfa58e, true),
    );
    const mist = Array.from({ length: 4 }, () => {
      const part = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: texture,
          color: 0x852033,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.NormalBlending,
        }),
      );
      root.add(part);
      return part;
    });
    return {
      root,
      arcs,
      ribs,
      cords,
      flesh,
      spine,
      jaws,
      mist,
      age: 0,
      duration: 0,
      source: null,
      owner: null,
      origin: new THREE.Vector3(),
      quiet: false,
      mode: "appear",
    };
  });
  const pose = new THREE.Matrix4(),
    inverse = new THREE.Matrix4(),
    world = new THREE.Vector3(),
    end = new THREE.Vector3(),
    delta = new THREE.Vector3(),
    axis = new THREE.Vector3(0, 1, 0),
    normal = new THREE.Vector3(0, 0, 1),
    unit = new THREE.Vector3(),
    tangent = new THREE.Vector3(),
    across = new THREE.Vector3(),
    up = new THREE.Vector3();
  let cursor = 0,
    disposed = false;
  function locate(slot, source) {
    source.updateWorldMatrix(true, false);
    group.updateWorldMatrix(true, false);
    pose.copy(group.matrixWorld).invert().multiply(source.matrixWorld);
    pose.decompose(slot.root.position, slot.root.quaternion, slot.root.scale);
    // 肉束按最终体积绘制，实际仆从自身缩放；不提前画出完整骨架替代真实分裂。
    if (slot.mode === "appear" && source.userData.fissionVisualLength) {
      slot.root.scale.multiplyScalar(
        source.userData.fissionVisualLength / source.scale.x,
      );
    }
  }
  function locateOrigin(slot) {
    slot.root.updateWorldMatrix(true, false);
    if (!slot.owner?.visible) return;
    slot.source.getWorldPosition(end);
    slot.owner.userData.getFissionSource?.(world, end) ||
      slot.owner.getWorldPosition(world);
    inverse.copy(slot.root.matrixWorld).invert();
    slot.origin.copy(world).applyMatrix4(inverse);
  }
  function paint(slot) {
    const { age, duration, quiet, mode, origin } = slot;
    const depart = mode === "depart",
      u = age / duration;
    const fade = THREE.MathUtils.clamp((duration - age) / 0.5, 0, 1);
    const alpha = Math.min(1, (age + 0.025) / (depart ? 0.065 : 0.14)) * fade;
    const travel = quiet ? 1 : THREE.MathUtils.smoothstep(age, 0.08, 1.05);
    const burst = quiet ? 0 : 1 - Math.exp(-age * 3.2);
    const tension = depart ? 0 : 1 - THREE.MathUtils.smoothstep(age, 0.9, 1.35);
    slot.arcs.forEach((part, i) => {
      if (depart) {
        part.position.set(0, 0.005, -0.03 + i * 0.04);
        part.scale.setScalar(0.11 + burst * (0.24 + i * 0.05));
        part.rotation.set(i * 0.7, i * 0.9, i * 2.1);
        part.material.opacity = alpha * (quiet ? 0.15 : 0.42) * (1 - u);
      } else {
        // 两条伤口边在主角侧腹张开，第三条沿剥离血肉前往真实仆从。
        part.position.copy(origin);
        if (i === 2) part.position.lerp(end.set(0, 0, -0.035), travel);
        part.scale.setScalar(
          (i === 2 ? 0.11 : 0.065) +
            (quiet ? 0 : Math.sin(Math.min(age / 0.9, 1) * Math.PI) * 0.045),
        );
        delta.set(0, 0, -0.035).sub(origin);
        part.quaternion.setFromUnitVectors(
          normal,
          unit.copy(delta).normalize(),
        );
        part.rotateZ(i * 2.3 + (quiet ? 0 : age * 0.5));
        part.material.opacity = alpha * tension * (quiet ? 0.2 : 0.7);
      }
    });
    slot.cords.forEach((part, i) => {
      if (depart) {
        part.material.opacity = 0;
        return;
      }
      end.set((i ? 1 : -1) * 0.04, 0.015, -0.04);
      delta.copy(end).sub(origin);
      // 复用动态肉束网格：宽的剥离端、弯曲纤维及拉细的断裂端，避免直线光束。
      const positions = part.geometry.attributes.position,
        template = part.userData.template;
      for (let k = 0; k < positions.count; k++) {
        const t = template[k * 3 + 1] + 0.5,
          curve = quiet ? 0 : Math.sin(t * Math.PI);
        const bow = (i ? -0.06 : 0.07) * curve;
        tangent.copy(delta);
        tangent.y += (i ? -0.06 : 0.07) * Math.PI * Math.cos(t * Math.PI);
        unit.copy(tangent).normalize();
        across.crossVectors(unit, normal);
        if (across.lengthSq() < 0.001) across.crossVectors(unit, axis);
        across.normalize();
        up.crossVectors(across, unit).normalize();
        const width =
          (0.028 * (1 - t) + 0.008 * t) *
          (quiet ? 1 : 1 - THREE.MathUtils.smoothstep(age, 0.6, 1.35) * 0.7);
        world.copy(origin).addScaledVector(delta, t);
        world.y += bow;
        world
          .addScaledVector(across, template[k * 3] * width)
          .addScaledVector(up, template[k * 3 + 2] * width * 0.46);
        positions.setXYZ(k, world.x, world.y, world.z);
      }
      positions.needsUpdate = true;
      part.geometry.computeVertexNormals();
      part.geometry.computeBoundingSphere();
      part.material.opacity = alpha * tension * (quiet ? 0.3 : 0.8);
    });
    slot.ribs.forEach((part, i) => {
      part.visible = depart;
      const z = -0.23 + i * 0.077,
        taper = i < 3 ? 1 : 1 - (i - 2) * 0.18;
      const angle = i * 2.4;
      const scatter = depart ? burst : 0;
      part.position.set(
        Math.cos(angle) * scatter * 0.27,
        Math.sin(angle) * scatter * 0.23,
        z + scatter * (i - 2.5) * 0.065,
      );
      part.rotation.set(
        depart ? scatter * i * 0.35 : 0,
        depart ? scatter * i * 0.2 : 0,
        0.24 + (quiet ? 0 : scatter * (i % 2 ? -0.9 : 0.9)),
      );
      part.scale.set(0.115 * taper, 0.105 * taper, 0.065);
      part.material.opacity = alpha * 0.65 * (depart ? 1 : 0);
    });
    slot.flesh.forEach((part, i) => {
      const a = i * 2.4;
      if (depart) {
        part.position.set(
          Math.cos(a) * (0.06 + burst * 0.37),
          Math.sin(a) * (0.04 + burst * 0.3),
          -0.21 + i * 0.082 + burst * (i - 2.5) * 0.08,
        );
      } else {
        const t = quiet
          ? 1
          : THREE.MathUtils.smoothstep(age, 0.06 + i * 0.065, 0.68 + i * 0.065);
        end.set(Math.cos(a) * 0.065, Math.sin(a) * 0.065, -0.22 + i * 0.075);
        part.position.copy(origin).lerp(end, t);
        if (!quiet) part.position.y += Math.sin(t * Math.PI) * 0.09;
      }
      part.scale.set(
        i % 3 === 0 ? 0.009 : 0.037,
        i % 3 === 0 ? 0.045 : 0.021,
        0.049,
      );
      part.rotation.set(a, 0.4, quiet ? a : a + age * (depart ? 3.2 : 0.9));
      part.material.opacity =
        alpha * (depart ? 0.95 : 0.85) * (depart ? 1 : tension);
    });
    slot.spine.position.set(0, 0.03 + burst * 0.1, 0);
    slot.spine.rotation.x = Math.PI / 2;
    slot.spine.scale.set(0.7, 0.72, 0.7);
    slot.spine.material.opacity = depart ? alpha * 0.6 : 0;
    slot.jaws.forEach((part, i) => {
      part.scale.set(i ? -1 : 1, 1, 1);
      part.position.set(
        (i ? -1 : 1) * burst * 0.17,
        -burst * 0.16,
        -burst * 0.07,
      );
      part.rotation.y = (i ? -1 : 1) * burst * 0.7;
      part.material.opacity = depart ? alpha * 0.75 : 0;
    });
    slot.mist.forEach((part, i) => {
      if (depart) {
        const a = i * 2.4;
        part.position.set(
          Math.cos(a) * burst * 0.19,
          Math.sin(a) * burst * 0.16,
          -0.25 + i * 0.16,
        );
      } else {
        end.set((i % 2 ? -1 : 1) * 0.035, 0, -0.22 + i * 0.15);
        const t = quiet
          ? 1
          : THREE.MathUtils.smoothstep(age, 0.05 + i * 0.09, 0.55 + i * 0.12);
        part.position.copy(origin).lerp(end, t);
      }
      const size = depart
        ? 0.2 + burst * 0.44
        : 0.15 +
          (quiet ? 0.06 : Math.sin(Math.min(age / 1.2, 1) * Math.PI) * 0.18);
      part.scale.set(size, size * 0.72, 1);
      part.material.rotation = quiet ? 0 : i * 1.7 + age * 0.25;
      part.material.opacity =
        alpha * (quiet ? 0.22 : depart ? 0.82 : 0.58) * (depart ? 1 : tension);
    });
  }
  function emit(source, mode = "appear", owner = null) {
    if (disposed || !source?.isObject3D || !["appear", "depart"].includes(mode))
      return false;
    if (mode === "appear" && !source.visible) return false;
    const slot = slots[cursor++ % slots.length];
    slot.mode = mode;
    slot.age = 0;
    slot.duration = mode === "appear" ? MINION_RULES.fissionDuration : 1.65;
    slot.quiet = !!reducedMotion();
    slot.source = mode === "appear" ? source : null;
    slot.owner = mode === "appear" && owner?.isObject3D ? owner : null;
    slot.origin.set(0, 0, 0);
    locate(slot, source);
    locateOrigin(slot);
    slot.root.visible = true;
    paint(slot);
    return true;
  }
  function update(dt) {
    if (disposed || !Number.isFinite(dt) || dt <= 0) return;
    for (const slot of slots) {
      if (!slot.root.visible) continue;
      slot.age += dt;
      if (slot.age >= slot.duration) {
        slot.root.visible = false;
        slot.source = slot.owner = null;
        continue;
      }
      if (slot.source?.visible) {
        locate(slot, slot.source);
        locateOrigin(slot);
      }
      paint(slot);
    }
  }
  function reset() {
    for (const slot of slots) {
      slot.root.visible = false;
      slot.source = slot.owner = null;
      slot.age = 0;
    }
  }
  return {
    group,
    emit,
    update,
    reset,
    snapshot: () =>
      slots.map((slot) => ({
        mode: slot.mode,
        active: slot.root.visible,
        age: slot.age,
        quiet: slot.quiet,
        position: slot.root.position.toArray(),
        scale: slot.root.scale.toArray(),
        origin: slot.origin.toArray(),
        fission: !!slot.owner,
      })),
    dispose() {
      if (disposed) return;
      disposed = true;
      reset();
      group.removeFromParent();
      group.traverse((part) => {
        if (part.material) part.material.dispose();
      });
      const geometries = new Set([
        arcGeometry,
        ribGeometry,
        fleshGeometry,
        cordGeometry,
        jawGeometry,
      ]);
      for (const slot of slots)
        for (const cord of slot.cords) geometries.add(cord.geometry);
      for (const geometry of geometries) geometry.dispose();
      texture.dispose();
      group.clear();
    },
  };
}
